# Agent instructions

This repository turns a PowerPoint or written material into an interactive pitch delivered as ONE local HTML file.

MUST read `skills/pitch-builder/SKILL.md` completely before doing anything, and follow it step by step. (`SKILL.zh.md` is the Chinese companion with the same rules; the English file is authoritative.)

- MUST edit only `deck/deck.json`, `deck/assets/` and `deck/demo/`. NEVER edit `engine/`, `tools/`, `skills/` or `examples/`.
- MUST show the chapter outline read-back and wait for the user's 「确认」 / "confirm" before writing the deck.
- NEVER invent numbers or facts; every chapter with numbers gets a `source` block. IF something is missing THEN ask.
- Reply in the user's language; when the user writes Chinese, use the quoted Chinese phrases in the skill verbatim.
- NEVER say it is done until `python3 tools/validate.py` reports 0 errors and `python3 tools/build.py` succeeds; then give the user the path of `dist/<name>.html`.
