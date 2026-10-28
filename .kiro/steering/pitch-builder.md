---
inclusion: always
---

# pitch-builder

This workspace builds an interactive pitch (ONE local HTML file) from a PowerPoint.
MUST follow #[[file:skills/pitch-builder/SKILL.md]] step by step: workflow, slot table, outline read-back, block reference and hard rules. (`skills/pitch-builder/SKILL.zh.md` is the Chinese companion; the English file is authoritative.)

- MUST edit only `deck/deck.json` and `deck/assets/`; NEVER `engine/`, `tools/`, `skills/` or `examples/`.
- MUST wait for the user to confirm the chapter outline before writing the deck.
- NEVER invent numbers; IF a source is missing THEN ask.
- Reply in the user's language.
- Done only when `python3 tools/validate.py` has 0 errors and `python3 tools/build.py` succeeds.
