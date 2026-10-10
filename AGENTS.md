# AGENTS.md — OWARIN STORE workspace (Stream B, L2)
**Rules version 2026-10-11 · D60.** Read `rules/CORE.md` first (generated copy of the L1 core from ads-optimizer; Claude Code imports it). This file = OWARIN STORE rules only. Path rules (Claude Code loads them itself): `.claude/rules/apps-script.md` (`03 Apps Script/**`) · `images.md` (`All Products/**`, `_r2_upload/**`) · `logs.md` (`04 Design Tools/logs/**`).
Topic lessons: `00 Docs/LESSONS.md` (by trigger, table below); pre-S55 text: `00 Docs/_archive/rules/CLAUDE_2026-10-07_pre-S55.md`, `00 Docs/_archive/rules/AGENTS_2026-10-07_pre-S55.md`. `OWARI-MASTER-CONTEXT_EN_2026-09-13.md` is background (the `_TH_` file is the owner's Thai copy; AIs never read it): read only the § a rule names (`grep -n "^#"` first), never in full; it is a 2026-09-13 copy — when a rule changes upstream, propagate it in the same pass (master §4.9). Rules: master context §5.

## Every task
1. Start: `rules/CORE.md` → this file → `00 Docs/STATE.md` (the stream you work on) → the handoff prompt. Nothing else until a line there points to it.
2. Evidence locations: `04 Design Tools/logs/` (plan/result CSVs, `image-inventory-cache.json`), `_logs/` (B1 moves, sheet-audit JSON), `decisions_*.csv`, HANDOFF. Tell the owner what it says and its date; ask only what the cloud cannot see.
3. This workspace is Stream B (OWARIN STORE). Stream A (Ads Optimizer) moved to its own repo `C:\Users\JIN\ads-optimizer` (github owaowarin/ads-optimizer, 2026-10; old OneDrive folder archived at `C:\Users\JIN\_archive\ADS OPTIMIZER`); do not work on it from here — its rules live there.
4. Delivery priorities (master §5.2.1) and the model handoff rule: `00 Docs/LESSONS.md` L1, L2. One writer; no new agents/chats unless the owner authorizes it.
5. If a Meta/R2/git tool can do it (e.g. an ad error → create a new ad/creative with the fix and delete the superseded draft), do it and report; send the owner to a UI only when no tool can, and say why.

## Paths (B1, 2026-10-07)
- Code + docs: `C:\Users\JIN\owarin-store` (github owaowarin/owarin-store, private). Tools: `C:\Users\JIN\owarin-store\04 Design Tools`. Commit on the PC with `C:\Users\JIN\ads-optimizer\tools\pc\b1-store-commit.ps1` (size + secret guards).
- Media/data: `C:\Users\JIN\OWARIN-DATA`, reached through junctions of the same names in the repo folder (`All Products`, `_r2_upload`, `GGB Online Files`, `_fb_albums`, `Supplier`, `_exports`, `Facebook - Catalouge Project`). Photo library = `C:\Users\JIN\OWARIN-DATA\All Products`. New photos inbox = `C:\Users\JIN\Downloads` (default `-SourceDir` of `new-arrivals-to-folders.ps1`).
- Secrets: `C:\Users\JIN\Documents\OWARIN-secrets` (Google key `owarin-store\credential\owarin-store-api-3588e4e975d7.json` → `--credentials`).
- Other: web repo `C:\Users\JIN\owarin-retro-guides_1` (on hold) · LAB `C:\Users\JIN\owarin-back-house-lab` (own repo).
- The old `...\OneDrive\Desktop\etc\OWARIN\...` path is DEAD: never send the owner there; when asked "where is X" give the full new path and say the old one is gone.

## Working rules
- Reports carry `Prepared: <date>` at the top (older files keep `จัดทำ:`); ages ("N days old") state the reference date.
- Every add/edit/delete/move/upload of data writes a CSV log in `04 Design Tools/logs/` (dry-run and commit runs; source → destination, before → after); a move into `_archive/` is logged to `04 Design Tools/logs/<task>_<YYYYMMDD>.csv`.
- Owner decisions → `04 Design Tools/logs/decisions_<date>.csv` (CLOSED/OPEN) + affected docs in the same pass. Read all `decisions_*.csv` before proposing options.
- Status lives in STATE, scope/QA in PLAN, operational steps in HANDBOOK, attempts/results in the task CSV + Implementation log.
- Deletion candidates → `_to_delete/<date>/` and wait for OWARI. Archive destination = `_archive/` in the stream's own folder; never archived: `.claude/`, live spec files, `AGENTS.md`, any stream's `CLAUDE.md`. Dated HANDOFF/IMPLEMENTATION files are lookup evidence: read only the last section.
- Never click **"🔄 Rebuild ALL Product IDs"** (`forceRegenerateAllSKUs`); only **"🆕 Fill missing Product IDs (safe)"** (`regenerateAllSKUs`).
- Keep exactly ONE Meta catalogue; never delete the PID CHANGES or FB CATALOGUE ARCHIVE tabs (detail: LESSONS L5).
- Plan → use existing scoped authorization (ask only if materially missing) → targeted edit → relevant checks before delivery; syntax check (`node --check` or equivalent) for code.
- Ponytail is ON by default at level **full** (master context §6, full text in `skills/` if the plugin copy is unavailable); off only on "stop ponytail" / "normal mode".

## Tier-L close list (store)
(1) log CSV; (2) decisions CSV; (3) plan board tick + evidence; (4) STATE.md overwrite (≤ 80 short lines; per stream status, ONE next step, pointers); (5) one-page HANDOFF `00 Docs/HANDOFF_<date>.md`; (6) related files in the same pass (README, rules, version pairs `Code_vNN`+`WebApp_vNN` with previous pair → `backup/` + stub, tests re-pointed); (7) rules updated in English, dated; (8) read-back verification (do not re-open live services just to close; re-read a service before a live claim); (9) live actions recorded with time, who clicked, what was observed. A tier-L task missing an item is not finished.

## Skills in this bundle
Source of truth for the account skills (`token-harness`, `shopee-report-rules`, `research-relay`): github owaowarin/ads-optimizer `skills/` (synced to local copies by `tools/pc/rules-sync.ps1`). The OWARIN diagram skin and other offline copies were in `C:\Users\JIN\Desktop\etc\OWARIN\_skills\` (pre-B1; location after B1 UNVERIFIED — check before use).

| Path under `_skills\` | Why it is here |
|---|---|
| `shopee-report-rules\SKILL.md` | Private skill, not on any public registry. This is the offline backup of the copy installed in the Claude account — reinstall from here if the account copy is lost. |
| `diagram-design-OWARIN-skin\` | The OWARIN-branded SKILL.md + `references/style-guide.md`. The public `diagram-design` repo has the **unbranded** versions — overwrite those two files with these, or diagrams will not match the brand (dark-first, washi/sumi/vermilion, Trirong + IBM Plex Sans Thai + IBM Plex Mono). Unpacked from `Claude outputs\diagram-design-owarin-v2.zip`. |
| `token-harness\`, `grill-with-docs\` | Account skills; keep an offline copy here so Codex and a fresh machine can be set up without the Claude account. |

## Lessons index — open `00 Docs/LESSONS.md` § only when the trigger matches
| Trigger | Section |
|---|---|
| Priorities / gates / propagating closed business rules | L1 |
| A model cannot solve a reproducible issue | L2 |
| Hashes with user text in Apps Script | L3 |
| Using the Apps Script editor in a browser | L4 |
| Meta feed, R2 upload, catalogue, Refresh Meta feed | L5 |
| Journal / lock / recovery hash in W1/W2 | L6 |
| Money totals, cents | L7 |
| CLIENT writes, label, HTML partials, Orders search | L8 |
| Printing / PDF / computer-use plugin | L9, L10 |
| CLIENT migration, native replay, Tables | L11, L12, L13 |
| Cart money-validation toast | L14 |
| UTF-8 evidence transfer | L15 |
| Shared partials / LabelDialog / phone touch sizes | L16 |

## Precedence
Spec files in `_specs/` > the skills > `CLAUDE.md` + this file + `00 Docs/LESSONS.md` (newest dated rule wins) > the master context (2026-09-13 copy).
