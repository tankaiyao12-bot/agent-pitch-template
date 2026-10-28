#!/usr/bin/env python3
"""Check a deck.json before building.

Usage: python3 tools/validate.py [deck_dir]        (default: deck)
Exit code 1 when there are errors. Warnings do not stop the build.
Standard library only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# block type -> required fields
BLOCKS = {
    "title": ["h"], "text": ["text"], "tiles": ["items"], "bars": ["items"], "columns": ["items"],
    "donut": ["items"], "rings": ["rings"], "kline": ["rows"], "line": ["series"], "flow": ["steps"],
    "cards": ["items"], "scenes": ["items"], "roadmap": ["phases"], "table": ["columns", "rows"],
    "image": ["src"], "quote": ["text"], "compare": [], "grid": ["blocks"], "panel": ["blocks"],
    "source": ["text"], "html": ["html"],
}
NUMERIC = {"tiles", "bars", "columns", "donut", "kline", "line", "table"}
STATUSES = {"live", "main", "prev", "todo", "plan"}


def langs_of(v):
    return set(v.keys()) if isinstance(v, dict) else None


def check(deck_path: Path):
    errors, warnings = [], []
    base = deck_path.parent
    try:
        deck = json.loads(deck_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [f"{deck_path} not found"], []
    except json.JSONDecodeError as e:
        return [f"{deck_path}: invalid JSON at line {e.lineno} col {e.colno}: {e.msg}"], []

    meta = deck.get("meta") or {}
    want = meta.get("langs") or ["zh"]

    def txt(v, where, required=True, strict=True):
        if v is None or v == "":
            if required:
                errors.append(f"{where}: missing text")
            return
        if isinstance(v, (str, int, float)):
            if len(want) > 1 and strict:
                warnings.append(f"{where}: plain string, but meta.langs = {want}; give {{{', '.join(want)}}}")
            return
        if isinstance(v, dict):
            miss = [l for l in want if not v.get(l)]
            if miss:
                warnings.append(f"{where}: missing language {miss}")
            return
        errors.append(f"{where}: text must be a string or {{\"zh\":…, \"en\":…}}")

    def asset(p, where):
        if isinstance(p, str) and not p.startswith(("http://", "https://", "data:")) and not (base / p).exists():
            errors.append(f"{where}: file not found: {p}")

    brand = deck.get("brand") or {}
    if not brand.get("name"):
        errors.append("brand.name: missing")
    for k in ("accent", "accentDark"):
        if brand.get(k) and not re.fullmatch(r"#[0-9a-fA-F]{6}", brand[k]):
            errors.append(f"brand.{k}: use a #rrggbb color")
    if brand.get("logo"):
        asset(brand["logo"], "brand.logo")
    txt(meta.get("title"), "meta.title", required=False)

    chapters = deck.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        errors.append("chapters: need a non-empty list")
        return errors, warnings
    if not 3 <= len(chapters) <= 15:
        warnings.append(f"chapters: {len(chapters)} chapters; 6–12 plays best")
    ids = set()
    demo_ids = {s.get("id") for s in ((deck.get("demo") or {}).get("scenes") or [])}

    def block(b, where, chapter_has_source):
        if not isinstance(b, dict) or "type" not in b:
            errors.append(f"{where}: each block needs a \"type\"")
            return
        ty = b["type"]
        if ty not in BLOCKS:
            errors.append(f"{where}: unknown block type \"{ty}\" (known: {', '.join(sorted(BLOCKS))})")
            return
        for f in BLOCKS[ty]:
            if f not in b:
                errors.append(f"{where} ({ty}): missing \"{f}\"")
        if ty == "title":
            txt(b.get("h"), f"{where}.h")
        if ty == "image":
            asset(b.get("src"), f"{where}.src")
        if ty in ("tiles", "bars", "donut") and isinstance(b.get("items"), list):
            for k, x in enumerate(b["items"]):
                txt(x.get("label"), f"{where}.items[{k}].label", strict=False)
                if ty in ("bars", "donut") and not isinstance(x.get("value"), (int, float)):
                    errors.append(f"{where}.items[{k}].value: must be a number")
        if ty == "columns" and isinstance(b.get("items"), list):
            for k, x in enumerate(b["items"]):
                if not (isinstance(x, list) and len(x) == 2 and isinstance(x[1], (int, float))):
                    errors.append(f"{where}.items[{k}]: use [\"label\", number]")
        if ty == "kline" and isinstance(b.get("rows"), list):
            for k, r in enumerate(b["rows"]):
                if not (isinstance(r, list) and len(r) == 6 and all(isinstance(v, (int, float)) for v in r[1:])):
                    errors.append(f"{where}.rows[{k}]: use [\"date\", open, high, low, close, volume]")
        if ty in ("scenes", "roadmap"):
            for k, x in enumerate(b.get("items") or b.get("phases") or []):
                if x.get("status") and x["status"] not in STATUSES:
                    errors.append(f"{where}[{k}].status: one of {sorted(STATUSES)}")
        if ty in ("grid", "panel"):
            for k, c in enumerate(b.get("blocks") or []):
                block(c, f"{where}.blocks[{k}]", chapter_has_source)
        if ty in NUMERIC and not chapter_has_source:
            warnings.append(f"{where} ({ty}): numbers without a \"source\" block in this chapter")

    def has_source(blocks):
        for b in blocks or []:
            if isinstance(b, dict) and (b.get("type") == "source" or has_source(b.get("blocks"))):
                return True
        return False

    for i, c in enumerate(chapters):
        w = f"chapters[{i}]" + (f" ({c.get('id')})" if isinstance(c, dict) and c.get("id") else "")
        if not isinstance(c, dict):
            errors.append(f"{w}: must be an object")
            continue
        if not c.get("id"):
            errors.append(f"{w}: missing id")
        elif c["id"] in ids:
            errors.append(f"{w}: duplicate id")
        ids.add(c.get("id"))
        txt(c.get("toc"), f"{w}.toc")
        say = c.get("say")
        if not isinstance(say, list) or not say:
            errors.append(f"{w}.say: need 1–4 lines")
        else:
            if len(say) > 4:
                warnings.append(f"{w}.say: {len(say)} lines; keep it to 2–3")
            for k, s in enumerate(say):
                txt(s, f"{w}.say[{k}]")
        for k, a in enumerate(c.get("ask") or []):
            txt(a, f"{w}.ask[{k}]")
            if a.get("reply"):
                txt(a["reply"], f"{w}.ask[{k}].reply")
            if a.get("jump") and a.get("scene") and a["scene"] not in demo_ids:
                errors.append(f"{w}.ask[{k}].scene: no demo scene with id \"{a['scene']}\"")
        blocks = c.get("blocks")
        if not isinstance(blocks, list) or not blocks:
            errors.append(f"{w}.blocks: each chapter needs a page (at least one block)")
        else:
            src = has_source(blocks)
            for k, b in enumerate(blocks):
                block(b, f"{w}.blocks[{k}]", src)
    for i, c in enumerate(chapters):
        for k, a in enumerate((c or {}).get("ask") or []):
            if a.get("goto") and a["goto"] not in ids:
                errors.append(f"chapters[{i}].ask[{k}].goto: no chapter with id \"{a['goto']}\"")

    demo = deck.get("demo")
    if demo:
        for k, s in enumerate(demo.get("scenes") or []):
            if not s.get("id"):
                errors.append(f"demo.scenes[{k}]: missing id")
            if not (s.get("image") or s.get("file") or s.get("url")):
                errors.append(f"demo.scenes[{k}]: give one of image / file / url")
            asset(s.get("image"), f"demo.scenes[{k}].image")
            asset(s.get("file"), f"demo.scenes[{k}].file")
    return errors, warnings


def main():
    d = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("deck")
    d = d if d.is_absolute() else ROOT / d
    errors, warnings = check(d / "deck.json")
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("error:", e)
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
