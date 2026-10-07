# OWARIN STORE — rules for Claude

**Rules version 2026-10-07 · D41 · S55.** Restructured in Session55 (decision S55-RULES-1): this file = how to work; topic lessons = `00 Docs/LESSONS.md` (read by trigger only); full pre-S55 text = `00 Docs/_archive/rules/CLAUDE_2026-10-07_pre-S55.md`. Owner-wide rules: `AGENTS.md` § Owner-wide rules.

## 1. Session protocol — BEFORE the first reply (S55)
1. **Find the file.** If the owner names a file not in the working tree: `git fetch origin`, search every remote branch (`git ls-tree -r --name-only origin/<branch>`), check out the branch that has it. Never reply "not found" before this.
2. **Read only:** this file → `00 Docs/STATE.md` (the stream you work on) → the handoff prompt. Nothing else until a line there points to it.
3. **Evidence before questions.** Before asking the owner about files, folders, photos, sheet or app state, search repo evidence: `04 Design Tools/logs/` (plan/result CSVs, `image-inventory-cache.json`), `_logs/` (B1 moves, sheet-audit JSON), `decisions_*.csv`, HANDOFF. Tell the owner what it says and its date; ask only what the cloud cannot see. A CLOSED decision is never re-asked.
4. **Owner step = one command that produces evidence** (read-only / dry-run, full line in the chat). At most ONE question or ONE action per message.
5. **Owner says "not found / unclear" or is frustrated:** stop, re-read the evidence, answer only that point with one concrete step, log the miss in `_logs/INCIDENTS.csv` in the same turn.
6. **Handoff out:** write `prompts/<task>.md` from `prompts/_TEMPLATE_handoff.md`, commit + push, give the owner one paste line that names the branch.

## 2. Token budget (owner: effective, value-for-money tokens)
- Start-of-session reading ≤ this file + one STATE stream + one handoff. Never read `OWARI-MASTER-CONTEXT_*` or a LESSONS/PLAN/HANDOFF file in full: `grep -n "^#"` then read one section.
- Look at name + size + date before opening; files > 50 KB → grep only. Never print large files/tables into the chat.
- Do not re-run passed checks unless the change touches them (money/stock failure + retry tests are never skipped).
- Prefer one validated step over several speculative ones; no new prompt/doc files the task does not need.

## 3. Paths (B1, 2026-10-07)
- Code + docs: `C:\Users\JIN\owarin-store` (github owaowarin/owarin-store, private). Tools: `C:\Users\JIN\owarin-store\04 Design Tools`.
- Media/data: `C:\Users\JIN\OWARIN-DATA`, reached through junctions of the same names in the repo folder (`All Products`, `_r2_upload`, `GGB Online Files`, `_fb_albums`, `Supplier`, `_exports`, `Facebook - Catalouge Project`). Photo library = `C:\Users\JIN\OWARIN-DATA\All Products`. New photos inbox = `C:\Users\JIN\Downloads` (default `-SourceDir` of `new-arrivals-to-folders.ps1`).
- Secrets: `C:\Users\JIN\Documents\OWARIN-secrets` (Google key `owarin-store\credential\owarin-store-api-3588e4e975d7.json` → `--credentials`); never open, print or commit a secret.
- Other: web repo `C:\Users\JIN\owarin-retro-guides_1` (on hold) · LAB `C:\Users\JIN\owarin-back-house-lab` (own repo).
- The old `...\OneDrive\Desktop\etc\OWARIN\...` path is DEAD: never send the owner there; when asked "where is X" give the full new path and say the old one is gone.
- ⚠️ Never delete a junction with `Remove-Item -Recurse` / Explorer Delete (deletes the real files); use `cmd /c rmdir "<path>"`.
- ⚠️ Identical images may be hard links: never edit an image in place, save as a new file.
- No cloud backup (D37): only `git push` backs up code/docs; commit on the PC with `C:\Users\JIN\ads-optimizer\tools\pc\b1-store-commit.ps1`.

## 4. Owner-instruction checklist (Session54 retro, `00 Docs/RETRO_2026-10-07_claude-mistakes.md`)
1. One action per line, short numbered steps; exact button, menu path, column or on-screen text — never "the top row" without saying of what.
2. Every command is a full line starting with `cd "<full path>"` when a folder matters; never a folder path alone. Check the owner's git branch before any `git pull`.
3. Paste-ready code goes in the message text, never only in tool output; never write "above".
4. When a step is unclear or not found, answer ONLY that step first, in more detail.
5. When the chat is long (~60 messages) or mistakes repeat, offer a new session with a handoff file and one paste line.

## 5. Working rules
- Dates: never from model memory; take them from the machine (`Get-Date -Format 'yyyy-MM-dd (dddd)'` on the PC, `date +%F` in the cloud). ISO dates, C.E. only (no B.E.). Reports carry `จัดทำ: <date>` at the top; ages ("N days old") state the reference date.
- Targeted edits only; never rewrite a whole file to change one spot. Read the real file before concluding; never guess from a file name. Read back every write.
- Destructive warning (delete/overwrite) on the first line of the instruction.
- Every add/edit/delete/move/upload of data writes a CSV log in `04 Design Tools/logs/` (dry-run and commit runs; source → destination, before → after). No log = not done.
- Owner decisions → `04 Design Tools/logs/decisions_<date>.csv` (CLOSED/OPEN) + affected docs in the same pass. Read all `decisions_*.csv` before proposing options.
- One writer per change; no new agents/chats unless the owner authorizes it. Mistakes, FAILs and owner corrections → `_logs/INCIDENTS.csv`.
- Repeatable checks are script files in `04 Design Tools/` called with arguments, never long inline `python3 -c` / `powershell -Command`.
- Status lives in STATE, scope/QA in PLAN, operational steps in HANDBOOK, attempts/results in the task CSV + Implementation log. Progress reports = delivered owner-visible outcomes, not volume of edits.

## 6. Hard safety (sheet / images)
- Never click **"🔄 Rebuild ALL Product IDs"** (`forceRegenerateAllSKUs`); only **"🆕 Fill missing Product IDs (safe)"** (`regenerateAllSKUs`).
- Change a Product ID by typing over column B; never edit Publisher/Item name/Condition to make onEdit recompute it (rows without a RESTOCK sibling get a new 3-digit number from `_buildSKU`).
- Image library rules: `00 Docs/IMAGE-LIBRARY-RULES.md` — read before touching image files. File/folder names equal the sheet `Item name` letter for letter; never convert full-width `：／×⨯・｜` to ASCII. Sort photos only with `04 Design Tools/new-arrivals-to-folders.ps1`, dry-run first, never overwrite.
- Keep exactly ONE Meta catalogue; never delete the PID CHANGES or FB CATALOGUE ARCHIVE tabs (detail: LESSONS L5).

## 7. Session close — scaled to the task (S55)
- **S — answer only, no file change:** nothing to write.
- **M — docs / rules / prompts / logs only:** log CSV row (if data or rules changed) + one HANDOFF line + INCIDENTS rows for misses + commit and push. STATE only if a stream's next step changed.
- **L — code release, sheet/data change, live action (Apps Script, Sheet, Meta, R2):** full list — (1) log CSV; (2) decisions CSV; (3) plan board tick + evidence; (4) STATE.md overwrite (≤ 80 short lines; per stream status, ONE next step, pointers); (5) one-page HANDOFF `00 Docs/HANDOFF_<date>.md`; (6) related files in the same pass (README, rules, version pairs `Code_vNN`+`WebApp_vNN` with previous pair → `backup/` + stub, tests re-pointed); (7) rules updated in English, dated; (8) read-back verification (do not re-open live services just to close; re-read a service before a live claim); (9) live actions recorded with time, who clicked, what was observed.
- Archive superseded material by move into `_archive/`, never delete. Dated HANDOFF/IMPLEMENTATION files are lookup evidence: read only the last section.

## 8. Lessons index — open `00 Docs/LESSONS.md` § only when the trigger matches
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
