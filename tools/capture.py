#!/usr/bin/env python3
"""Screenshot a project's website for the demo view (a dated snapshot that works offline).

Usage:
    python3 tools/capture.py https://example.com --id home --title "官网首页" --add
    python3 tools/capture.py https://example.com/app --id app --title "产品页" --mobile --add

Saves deck/assets/web-<id>.jpg (or .png) and, with --add, adds / updates the scene in
deck/deck.json → demo.scenes, with the URL (shown as an 「打开官网 ↗」 button) and today's date.

Browser, in this order:
  1. Playwright for Python (full-page screenshot):  pip install playwright && playwright install chromium
  2. Chrome / Edge / Chromium already on this computer (headless; captures the top --height pixels)
Standard library only otherwise.
"""
import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DESKTOP = (1440, 900)
MOBILE = (390, 844)

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge",
]


def proxy():
    for k in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"):
        if os.environ.get(k):
            return os.environ[k]
    return None


def with_playwright(url, out, size, height, mobile):
    from playwright.sync_api import sync_playwright  # noqa: raises ImportError when missing
    with sync_playwright() as p:
        px = proxy()
        browser = p.chromium.launch(proxy={"server": px.replace("socks5h://", "socks5://")} if px else None)
        ctx = browser.new_context(viewport={"width": size[0], "height": size[1]}, device_scale_factor=2 if mobile else 1,
                                  is_mobile=mobile, has_touch=mobile, locale="zh-CN")
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        try:
            page.wait_for_load_state("networkidle", timeout=12000)
        except Exception:
            pass
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")  # trigger lazy images
        page.wait_for_timeout(1200)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(600)
        full = page.evaluate("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)")
        h = min(full, height)
        page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": size[0], "height": h}, full_page=True,
                        type="jpeg", quality=82)
        browser.close()
    return h


def find_chrome():
    for c in CHROME_CANDIDATES:
        if os.path.isabs(c) and Path(c).exists():
            return c
        if not os.path.isabs(c) and shutil.which(c):
            return shutil.which(c)
    return None


def with_chrome(url, out, size, height, mobile):
    chrome = find_chrome()
    if not chrome:
        raise RuntimeError("no browser found")
    args = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--mute-audio",
            f"--window-size={size[0]},{height}", "--virtual-time-budget=10000", "--lang=zh-CN"]
    if mobile:
        args += ["--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"]
    if proxy():
        args.append("--proxy-server=" + proxy().replace("socks5h://", "socks5://"))
    with tempfile.TemporaryDirectory() as tmp:
        shot = Path(tmp) / "shot.png"
        args += [f"--user-data-dir={tmp}/profile", f"--screenshot={shot}", url]
        subprocess.run(args, capture_output=True, timeout=90)
        if not shot.exists():
            raise RuntimeError("the browser did not produce a screenshot")
        out = out.with_suffix(".png")
        shutil.move(str(shot), out)
    return height, out


def add_scene(scene):
    deck_path = ROOT / "deck" / "deck.json"
    deck = json.loads(deck_path.read_text(encoding="utf-8"))
    demo = deck.setdefault("demo", {"label": {"zh": "项目官网", "en": "Website"}, "scenes": []})
    scenes = demo.setdefault("scenes", [])
    for i, s in enumerate(scenes):
        if s.get("id") == scene["id"]:
            scenes[i] = {**s, **scene}
            break
    else:
        scenes.append(scene)
    deck_path.write_text(json.dumps(deck, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--id", default=None, help="scene id (default: from the URL)")
    ap.add_argument("--title", default=None, help="scene title shown in the demo list")
    ap.add_argument("--desc", default="", help="one line under the title")
    ap.add_argument("--height", type=int, default=6000, help="max screenshot height in px (default 6000)")
    ap.add_argument("--mobile", action="store_true", help="phone-sized screenshot")
    ap.add_argument("--add", action="store_true", help="add / update the scene in deck/deck.json")
    a = ap.parse_args()

    url = a.url if a.url.startswith(("http://", "https://")) else "https://" + a.url
    host = urlparse(url).netloc
    sid = a.id or (host.replace("www.", "").split(".")[0] + ("-m" if a.mobile else ""))
    assets = ROOT / "deck" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    out = assets / f"web-{sid}.jpg"
    size = MOBILE if a.mobile else DESKTOP

    try:
        h = with_playwright(url, out, size, a.height, a.mobile)
        how = "playwright"
    except ImportError:
        try:
            h, out = with_chrome(url, out, size, min(a.height, 4000), a.mobile)
            how = "chrome"
        except Exception as e:
            sys.exit(f"capture failed: {e}. Install a browser for screenshots:  pip install playwright && playwright install chromium")
    except Exception as e:
        sys.exit(f"capture failed for {url}: {e}")

    today = dt.date.today().isoformat()
    scene = {"id": sid, "title": a.title or host, "desc": a.desc or {"zh": f"截于 {today}", "en": f"captured {today}"},
             "image": f"assets/{out.name}", "url": url, "captured": today, "addr": host,
             "fit": "scroll", **({"mobile": True} if a.mobile else {})}
    print(f"saved {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB, {size[0]}×{h}px, via {how})")
    if a.add:
        add_scene(scene)
        print(f"demo scene \"{sid}\" written to deck/deck.json")
    else:
        print("scene:", json.dumps(scene, ensure_ascii=False))


if __name__ == "__main__":
    main()
