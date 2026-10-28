---
inclusion: always
---

# pitch-builder

This workspace builds an interactive pitch (one local HTML file) from a PowerPoint.
Follow #[[file:skills/pitch-builder/SKILL.md]] for the whole workflow, block reference and writing rules.

- Edit only `deck/deck.json` and `deck/assets/`; never `engine/` or `tools/`.
- Confirm the chapter outline with the user before writing the deck.
- Validate with `python3 tools/validate.py`, build with `python3 tools/build.py`.
