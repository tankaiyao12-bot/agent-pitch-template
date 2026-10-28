# Agent instructions

This repo turns a PowerPoint or written material into an interactive pitch delivered as ONE local HTML file.

Read and follow `skills/pitch-builder/SKILL.md` before doing anything. It is the full workflow: extract the PPT, confirm the chapter outline with the user, write `deck/deck.json`, validate, build `dist/*.html`.

- Edit only `deck/deck.json` and `deck/assets/`. Do not change `engine/` or `tools/`.
- Stop and ask the user to confirm the chapter outline before writing the deck.
- Never invent numbers; every chapter with numbers gets a `source` block.
- Finish with `python3 tools/validate.py` (no errors) and `python3 tools/build.py`, then tell the user the output path.
