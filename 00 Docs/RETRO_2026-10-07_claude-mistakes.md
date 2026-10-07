# RETRO — Claude's mistakes, Session54 (2026-10-07)

จัดทำ: 2026-10-07 · by Sonnet at owner's request. Evidence = this session's transcript; no token count is available to Claude.

| # | Mistake | Cost to owner | Root cause | Proposed rule (CONFIRMED by owner 2026-10-07; added to CLAUDE.md) |
|---|---|---|---|---|
| 1 | Owner steps without full command (`cd`), `git pull` on a feature branch | PowerShell error, lost round | no pre-send check of owner-facing steps | every owner command is a full line, `cd` first |
| 2 | "Code is above" while tool output was collapsed | 2 wasted rounds, anger | assumed the owner sees tool output | paste-ready code goes in assistant text |
| 3 | Ambiguous steps ("api row", "first line") | confusion | wrote from memory, not from the real screen | name the exact button/column/text; one action per line |
| 4 | Skipped the owner's actual question (Duration not found) | wasted round | answered a different question | answer only the step the owner is stuck on first |
| 5 | v43 release bugs passed Sonnet tests (outline, toast hidden, nav fade) | extra Opus round | tests checked class presence, not computed style / callers | CLAUDE.md rule 2026-10-07 already added; keep |
| 6 | Asked about HTML tools; owner meant Apps Script tools | wasted question | assumed instead of reading the request | ask only after reading the request literally |
| 7 | Long answers, big outputs printed, many extra prompt/doc files | tokens burned, chat too long | no output budget | no big prints; summaries/grep; propose a new session when chat is long |
