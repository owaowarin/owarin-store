# Next step — sheet compact audit Phase 2→3 (prepared 2026-10-07 by Opus; analyse with Opus)
Read `00 Docs/STATE.md`, then `00 Docs/AUDIT-SHEET-STRUCTURE_2026-10-07.md` (whole).
Input: the owner committed `_logs/sheet-audit_<date>.json` (commit id in chat). Read it (counts only; no cell values).
Do: verify F1–F9 with the JSON (data rows vs capacity, formula load per tab, cross-tab refs, dropdown sources, duplicate hashes, triggers, recalculation). Read all `decisions_*.csv` first.
Write Phase 3 plan in the same audit file (§4): target tab list, per-tab action, order, dry-run + log CSV per step, UNDO. No live change before the owner approves the plan. Then fold `prompts/add-save-performance.md` (v44) into the order: v43 deploy → v44 perf → sheet compaction.
Also: apply §5 tool decisions the owner approved (code release with menu + web TOOLS + dead functions removed, tests, pair bump). FB Album stays PARKED (decision FBA-PARK-1).
