# AGENTS.md — OWARIN STORE workspace (Stream B)

**Rules version 2026-10-07 · D41.** Owner-wide rules come from github owaowarin/ads-optimizer `AGENTS.md` (synced to `C:\Users\JIN\.claude\CLAUDE.md` and `C:\Users\JIN\.codex\AGENTS.md`); this file holds OWARIN STORE rules only.

Read `OWARI-MASTER-CONTEXT_EN_2026-09-13.md` in this folder before starting any task. It is the operating context for both work streams. This file is only the router; the master context holds the actual rules.

## Every task

0. **Folder switch pending (B1-F, owner 2026-10-07):** at the start of the first session in this project, BEFORE any work, remind the owner once, in Thai: (a) VS Code → **File** → **Open Folder...** → `C:\Users\JIN\owarin-store` → **Select Folder** → **Yes, I trust the authors**; (b) Claude Desktop → choose `C:\Users\JIN\owarin-store` instead of the old folder; (c) delete only old OWARIN STORE shortcuts on the Desktop, never the `owarin-store` folder; (d) refresh the R2 backup when there are new photos: `C:\Users\JIN\ads-optimizer\tools\pc\b1-backup-r2.ps1 -Apply`. After the owner confirms (a)+(b), delete this item 0 and log it.

1. Reply in Thai. Lead with the answer, no preamble, prose, ≤3 sentences unless detail is needed.
2. This workspace is Stream B (OWARIN STORE). Stream A (Ads Optimizer) lives in `C:\Users\JIN\ads-optimizer` with its own rules; do not work on it from here. Name the master-context sections that apply **before** doing work.
3. Never fabricate facts, sources, or claim work was done that was not done.
4. Instructions to the user must be click-level: exact button, exact field, exact value.
5. Destructive-risk warnings (overwrite, delete) go on the **first line** of the instruction.
6. Every data-touching operation writes a before → after log.
7. At the end of a session, write `00 Docs/HANDOFF_<YYYY-MM-DD>.md` with the 5 items in master context §9.
8. Before other work, archive stale material in the stream(s) touched — see § Archive discipline.
9. Stream B (OWARIN STORE): read `00 Docs/STATE.md` FIRST and open other files only when a STATE.md line points to them — do not browse the folder. At the end of the session OVERWRITE `00 Docs/STATE.md` (never append; ≤ 80 lines: per stream = status, ONE next step, closed decisions, pointers), keep the dated HANDOFF to one page, and put long detail in a log. Dated HANDOFF/IMPLEMENTATION files are lookup evidence only: read just the last section STATE.md points to.

10. **Session-close checklist is mandatory every session** (full list: `CLAUDE.md` § "Session-close checklist"): log CSV, decisions CSV, plan board evidence, STATE.md overwrite, one-page HANDOFF, related files/README/rules/version pairs updated in the same pass, read-back verification. A task missing any item is not finished. Applies to both streams (Stream A keeps its own log location).

11. **Issue and model handoff rule (owner decision 2026-10-03):** Log every issue, failed attempt, fix, retry, result, and recovery reference in the task CSV and Implementation log. If GPT-5.6 Sol / High cannot resolve a reproducible issue, record the unresolved problem and exact revision, then hand the repair to GPT-6 Astra / High. Do not claim a model switch or create an agent/chat automatically; use the app model selector when available. Keep one writer per change.

12. **Delivery priorities (owner 2026-10-03):** Follow master §5.2.1 for Stream B: plan/checks first; smallest scoped fix with backup; explicit roles only if agents are separately authorized; reproduce/root-cause/retest; verify UI and failure/retry before done; record actionable lessons and retire obsolete active rules. One writer, no new agents/chats for this project. The current three-package plan is `00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` §0/§10.

## Owner-wide rules (2026-10-07 · D41, full text in ads-optimizer `AGENTS.md`)
- D36: every task reply starts with `🧭 <model> · <effort> — <reason> · <fits ✅ | how to switch>`; never claim to have switched.
- D37: OneDrive is gone and there is no cloud backup; anything not pushed to GitHub exists once.
- D38: chat in Thai; files, rules and skills in English.
- D39: anything a cloud session must read from the PC comes as a file the owner commits and pushes; the owner pastes only the commit id.
- D40/D41: plain Thai, numbered steps, one action per line, full PC paths (`C:\Users\JIN\...`), paste-ready text in the chat. Close-out: list every leftover with importance + impact, fix small ones, ask once "fix now or plan"; next prompt saved in `prompts/<task>.md`; mistakes, FAILs and owner corrections → `_logs/INCIDENTS.csv`.

## Code

Ponytail is ON by default at level **full** (master context §6, full text in `skills/` if the plugin copy is unavailable).
- Read the project's existing files first; reuse what is there. Never build a parallel version.
- Targeted edits only. Never rewrite a whole file to change a small part.
- Plan → use existing scoped authorization (ask only if materially missing) → targeted edit → relevant checks before delivery; syntax check (`node --check` or equivalent) for code.
- Never simplify away: input validation, error handling, security, accessibility.
- Off only on "stop ponytail" / "normal mode".

## Data

- Export the latest sheet before drawing any conclusion. Never use an existing local export.
- Re-read the live source before reporting any number. Never carry a figure forward from earlier in the chat.
- A number stated by another AI in chat is **not** valid input. Re-read the source.

## Archive discipline

Archive what is no longer in play before starting other work in either stream, every session — so neither OWARI nor an AI mistakes a stale file for the current one.

- Destination: `_archive/` in the stream's own folder (Stream A also has `_specs/_archive/` for superseded spec versions). Move, never delete — deletion candidates go to `_to_delete/<date>/` instead (see Stream B below).
- Archive a file only after grepping for references to it — a silent move breaks any script that hardcodes a path (`install-claude-commands.ps1` broke exactly this way on 2026-09-18 after Stream A's folder move).
- Dry-run first, then commit; log every move (source → destination) to `04 Design Tools/logs/<task>_<YYYYMMDD>.csv`.
- Never archived: `.claude/`, `_engine/` (Stream A), live spec files, `AGENTS.md`, any stream's `CLAUDE.md`.

## Stream A — Ads Optimizer

Moved to its own repo `C:\Users\JIN\ads-optimizer` (github owaowarin/ads-optimizer, 2026-10); the old OneDrive folder is archived at `C:\Users\JIN\_archive\ADS OPTIMIZER`. Its rules live there, not here.

## Stream B — OWARIN STORE

Layout since B1 (2026-10-07, `PLAN_2026-10-07_B1_repo-data-split.md`): code + docs = this repo `C:\Users\JIN\owarin-store` (github owaowarin/owarin-store, private) · media/data = `C:\Users\JIN\OWARIN-DATA` (reached through junctions of the same names in this folder: `All Products`, `_r2_upload`, `GGB Online Files`, `_fb_albums`, `Supplier`, `_exports`, `Facebook - Catalouge Project`) · secrets = `C:\Users\JIN\Documents\OWARIN-secrets` (Google key: `owarin-store\credential\owarin-store-api-3588e4e975d7.json` → pass it to `--credentials`; never open, print or commit a secret) · web repo `C:\Users\JIN\owarin-retro-guides_1` (on hold) · LAB `C:\Users\JIN\owarin-back-house-lab` (separate project, own repo). The old `...\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE` path is dead.
⚠️ Junctions: never delete a junction folder with `Remove-Item -Recurse` / Explorer "Delete" — it can delete the real files in OWARIN-DATA; to remove a junction use `cmd /c rmdir "<path>"`.
⚠️ Hard links (B1-H): identical images in OWARIN-DATA may share one copy on disk; never edit an image in place — save as a new file (every tool here already does).
No cloud backup (OneDrive uninstalled 2026-10-07, D37): code/docs are backed up only by `git push`; commit with `C:\Users\JIN\ads-optimizer\tools\pc\b1-store-commit.ps1` (guards: size, secret names/values).
Rules: master context §5.
⚠️ **Never delete files with `rm` / `del`.** Move them to `_to_delete/<date>/` and wait for OWARI.
⚠️ **Never `rclone sync` on the `library/` prefix** — `copy` only.
Dry run + CSV log to `04 Design Tools/logs/` before any data-touching operation.

**Web App versioning (added 2026-09-18):** `03 Apps Script/Web App/Code_vNN.gs` and
`WebApp_vNN.gs` are a paired, numbered set (`WebApp_vNN.gs`'s header comment declares
"pairs with Code.gs vNN"). Every code edit to either file — however small — bumps `NN`
on **both** files, even the one with no functional change, so the pairing comment never
goes stale. In the same pass: archive the previous `vNN` pair into `backup/` (copy the
old content there, replace the root copy with a short stub pointing at the new version —
this folder cannot delete files, only add/overwrite), update the file table and any
`_vNN.gs` filename mentioned in `Web App/README.md`, and log the change in
`00 Docs/HANDOFF_<date>.md`. `Index.html` has no version suffix — it is shared across
every `Code_vNN.gs`.

## Skills in this bundle

Source of truth for the account skills (`token-harness`, `shopee-report-rules`, `research-relay`): github owaowarin/ads-optimizer `skills/` (synced to local copies by `tools/pc/rules-sync.ps1`). The OWARIN diagram skin and other offline copies stay in `C:\Users\JIN\Desktop\etc\OWARIN\_skills\`.

| Path under `_skills\` | Why it is here |
|---|---|
| `shopee-report-rules\SKILL.md` | Private skill, not on any public registry. This is the offline backup of the copy installed in the Claude account — reinstall from here if the account copy is lost. |
| `diagram-design-OWARIN-skin\` | The OWARIN-branded SKILL.md + `references/style-guide.md`. The public `diagram-design` repo has the **unbranded** versions — overwrite those two files with these, or diagrams will not match the brand (dark-first, washi/sumi/vermilion, Trirong + IBM Plex Sans Thai + IBM Plex Mono). Unpacked from `Claude outputs\diagram-design-owarin-v2.zip`. |
| `token-harness\`, `grill-with-docs\` | Account skills; keep an offline copy here so Codex and a fresh machine can be set up without the Claude account. |

## Token discipline

Follow the rules in the token-harness skill. Start every task reply with the D36 routing line (above), and remind the owner about the manual steps (`/clear`, `/context`, `/mcp`, plan mode, edit-message) when their trigger fires. Never claim to have switched models yourself.

## Precedence

Spec files in `_specs/` > the skills > the master context > this file.
The master context is a copy, dated 2026-09-13. When a rule changes upstream, propagate it in the same pass (master context §4.9) or this workspace will run on stale rules.
