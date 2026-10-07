# ads-optimizer rules sync to S55 — handoff (written 2026-10-07 by Opus, Session55)
- **Branch:** run in a session on repo `owaowarin/ads-optimizer` (default branch); source of the new rules = `owaowarin/owarin-store` branch `claude/peaceful-brown-1o4cc8`.
- **Model to start:** Opus · high (rule edits) — switch point: none.
- **Read first:** owarin-store `CLAUDE.md` (whole file, 8.4 KB, the new rulebook) and `00 Docs/HANDOFF_2026-10-07.md` § Session55 lines; in ads-optimizer: `AGENTS.md` § owner-wide rules (D36–D41), `skills/token-harness/SKILL.md`, `tools/pc/rules-sync.ps1` (headings first, then only the needed sections).

## Known facts (do NOT ask the owner again)
| Fact | Source file | Date of evidence |
|---|---|---|
| Owner ordered: one rule set, English, identical wherever Claude works | owner chat Session55 | 2026-10-07 |
| owarin-store rules restructured (S55-RULES-1): session protocol, token budget, tiered close S/M/L, language rule, lessons by trigger | owarin-store `CLAUDE.md`, `04 Design Tools/logs/decisions_2026-10-07.csv` | 2026-10-07 |
| The cloud session in owarin-store could not attach ads-optimizer (permission denied by auto mode) | Session55 | 2026-10-07 |
| `rules-sync.ps1` copies ads-optimizer `AGENTS.md` to `C:\Users\JIN\.claude\CLAUDE.md` and `C:\Users\JIN\.codex\AGENTS.md` | owarin-store `AGENTS.md` header | 2026-10-07 |

## Changes to make (ads-optimizer)
1. `AGENTS.md` owner-wide rules: add **D42 (2026-10-07, S55)** in English, generic for every project:
   - Session protocol: find a named file on every remote branch before saying "not found"; read only rules + STATE stream + handoff at start; evidence in the repo before asking the owner; one read-only/dry-run command per owner step, max one question per message; on "not found/unclear" stop, re-read evidence, answer only that point, log to `_logs/INCIDENTS.csv`.
   - Token budget: no full read of master-context-size files; headings first, one section; no re-running passed checks unless affected (money/stock failure tests never skipped).
   - Session close tiers S (answer only) / M (docs-rules-logs: log row + one HANDOFF line + INCIDENTS + push) / L (code, data, live: the full project checklist).
   - Language: every AI-read file in English; chat in Thai; owner-facing manuals may be Thai; owner quotes verbatim.
   - Handoffs use a template with: branch, known-facts table (source + date), unknowns with the owner command that reveals them, exactly one first owner action, do-not list, paths.
   - Bump the label to `2026-10-07 · D42`.
2. `skills/token-harness/SKILL.md`: add the same reading budget, the tiered close and the handoff template fields; bump its version label to D42. Do not change the 🧭 routing line format (D36).
3. Check every other English rule file in ads-optimizer for contradictions (e.g. "mandatory full checklist every session", "read master context before any task") and align them to D42; list each change in `_logs/` with before → after.
4. Commit + push; give the owner ONE line to run on the PC: `cd "C:\Users\JIN\ads-optimizer"; git pull; .\tools\pc\rules-sync.ps1` (check the real script parameters first; dry-run if it has one).
5. Then in owarin-store (same branch as above): change `Rules version 2026-10-07 · D41 · S55` → `· D42` in `CLAUDE.md` and `AGENTS.md`, D-list in `AGENTS.md` § Owner-wide rules gets D42; log it; push.

## Do not
- Change Stream A report rules (`shopee-report-rules`) beyond contradictions with D42.
- Delete any rule text: superseded text goes to an `_archive/` copy first.

## Paths (post-B1)
- ads-optimizer `C:\Users\JIN\ads-optimizer` · owarin-store `C:\Users\JIN\owarin-store` · global Claude rules `C:\Users\JIN\.claude\CLAUDE.md` (generated, do not hand-edit).
