#!/usr/bin/env python3
"""Pack a deck into ONE self-contained HTML file (styles, script, images and demo pages inlined).

Usage:
    python3 tools/build.py                       # deck/deck.json -> dist/pitch.html
    python3 tools/build.py examples/tradefons    # any folder that holds a deck.json
    python3 tools/build.py deck -o dist/my.html

The result opens with a double click, works offline, and can be sent as a file.
Runs validate.py first and stops on errors. Standard library only.
"""
import argparse
import base64
import html
import json
import mimetypes
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import validate  # noqa: E402

IMAGE_KEYS = {"logo", "src", "image"}


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if path.suffix.lower() == ".svg":
        mime = "image/svg+xml"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def inline(node, base: Path, in_demo=False):
    """Replace local file references in the deck with their contents (demo pages become srcdoc)."""
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            if k in IMAGE_KEYS and isinstance(v, str) and not v.startswith(("http://", "https://", "data:")):
                out[k] = data_uri(base / v)
            elif k == "file" and isinstance(v, str) and in_demo:
                out["srcdoc"] = (base / v).read_text(encoding="utf-8")
            else:
                out[k] = inline(v, base, in_demo or k == "demo")
        return out
    if isinstance(node, list):
        return [inline(x, base, in_demo) for x in node]
    return node


def text(v, lang):
    if isinstance(v, dict):
        return v.get(lang) or v.get("zh") or v.get("en") or ""
    return v or ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck_dir", nargs="?", default="deck")
    ap.add_argument("-o", "--out", default=None)
    a = ap.parse_args()
    deck_dir = (ROOT / a.deck_dir) if not Path(a.deck_dir).is_absolute() else Path(a.deck_dir)
    deck_path = deck_dir / "deck.json"

    errors, warnings = validate.check(deck_path)
    for w in warnings:
        print("warning:", w)
    if errors:
        for e in errors:
            print("error:", e)
        sys.exit(f"build stopped: {len(errors)} error(s) in {deck_path}")

    deck = json.loads(deck_path.read_text(encoding="utf-8"))
    packed = inline(deck, deck_dir)
    meta, brand = deck.get("meta", {}), deck.get("brand", {})
    lang = meta.get("defaultLang") or (meta.get("langs") or ["zh"])[0]
    demo_label = (deck.get("demo") or {}).get("label") or {"zh": "项目", "en": "Project"}

    shell = (ROOT / "engine" / "shell.html").read_text(encoding="utf-8")
    deck_json = json.dumps(packed, ensure_ascii=False).replace("</", "<\\/")
    page = (shell
            .replace("{{LANG}}", lang)
            .replace("{{TITLE}}", html.escape(text(meta.get("title"), lang) or brand.get("name", "Pitch")))
            .replace("{{DEMO_ZH}}", html.escape(text(demo_label, "zh")))
            .replace("{{DEMO_EN}}", html.escape(text(demo_label, "en")))
            .replace("{{CSS}}", (ROOT / "engine" / "engine.css").read_text(encoding="utf-8"))
            .replace("{{JS}}", (ROOT / "engine" / "engine.js").read_text(encoding="utf-8"))
            .replace("{{DECK}}", deck_json))

    out = Path(a.out) if a.out else ROOT / "dist" / ((meta.get("output") or "pitch") + ".html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"built {out}  ({out.stat().st_size / 1024:.0f} KB, {len(deck.get('chapters', []))} chapters)")
    print("open it with a double click, or: open", out)


if __name__ == "__main__":
    main()
