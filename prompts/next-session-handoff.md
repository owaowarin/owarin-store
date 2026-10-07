# Next session — full context handoff (written 2026-10-07 by Sonnet; start with Sonnet medium)
Read `CLAUDE.md` (incl. § Owner-instruction checklist — obey it), `00 Docs/STATE.md`, `00 Docs/HANDOFF_2026-10-07.md` (last 3 sections), `00 Docs/AUDIT-SHEET-STRUCTURE_2026-10-07.md` §7–8. Owner style: Thai, short numbered click-level steps, ONE action per line, full commands (always `cd <path>` first), name files by full PC path, paste-ready code goes IN THE CHAT (tool output is collapsed for the owner), never ask for screenshots of long text. Check every instruction against the real screen/file before saying it. Owner is frustrated by vague steps — be literal.

## State (2026-10-07)
- v43 LIVE = Version 7 (PASS owner-confirmed). v44 candidate built + tested in repo, NOT deployed: packet `04 Design Tools/logs/V44-ADD-PERF-20261007-01/`, prompt `prompts/v44-review-and-deploy.md` (Opus review first, then owner paste Code.gs ← Code_v44.gs, webapp.gs ← WebApp_v44.gs → Deploy → expect Version 8).
- Add speed baseline (before Step A, owner-measured in Executions): `api` Add = 3.588 s.
- Sheet audit done (`_logs/sheet-audit_2026-10-07_0651.json`). AUDIT §8 Step A approved (SHEET-A-1): owner has done the Refresh Meta feed check; UNKNOWN which of Step A items 3–7 are done → ASK the owner first, one line.
- Refresh Meta feed result: 1,129 ready (unchanged), 4 Instock products have NO photo on R2: OWA-GGBB026INBR01 Breath of Fire V：Dragon Quarter (RESTOCK-01); OWA-GGBY025YKAN00 and OWA-GGBY025YKAR01 Yu-Gi-Oh! GX：Tag Force Evolution (+RESTOCK-01); OWA-MAGH075AMAR01 HOBBY SEXY 1999 - 01 (RESTOCK-01).

## Owner's open question (answer first, literally)
"Where is the photo folder?" Real answers from code/docs (verify with owner's screen, do not guess): new photos land in `C:\Users\JIN\Downloads` (loose files), `04 Design Tools\new-arrivals-to-folders.ps1` (dry-run first) moves them into `C:\Users\JIN\owarin-store\All Products\All - GGB\<category folder>\` (junction → `C:\Users\JIN\OWARIN-DATA\All Products`); folder/file names must equal sheet `Item name` letter for letter (full-width ： kept). Magazines use the magazine folders per `00 Docs/IMAGE-LIBRARY-RULES.md`. Then `.\upload-missing-r2.ps1` (dry-run) → `-Commit` → last line `read-back identical: True` → Refresh Meta feed again → expect 1133 ready.

## Owner's pending list (owner pasted it 2026-10-07 as "what is still open" — work these first, one step at a time)
1. Step A item 8 (test): web app REFRESH loads normally; Inventory Tools → 🚀 Refresh Meta feed → popup first line `✅ Every Instock product is in the feed (N)`. Already observed once: 1,129 ready (= before), only ⚠️ = 4 products without R2 photo (not caused by Step A).
2. Step A item 9: Add one real item, read Executions → Function `api` → Duration; compare with baseline 3.588 s.
3. Step A item 10: owner says "ขั้น A เสร็จ" + Duration before/after. Items 3–7 status unknown → verify by asking the owner to look at the tab bar (are `FB: ALBUM CAPTION BACKUP 2026-10-04`, `FB ALBUM CAPTION BACKUP 2026-10-04`, `TYPE LIST` gone? is `R2 IMAGES`!A2 empty? named range `A633BZ1` gone?).
4. Do NOT delete `R2 JOBS` / `IMAGE UPLOADS` until v44 is live.
5. 4 products without R2 photo (Breath of Fire V：Dragon Quarter (RESTOCK-01); Yu-Gi-Oh! GX：Tag Force Evolution + (RESTOCK-01); HOBBY SEXY 1999 - 01 (RESTOCK-01)): check photo folders (names = Item name exactly) → if missing run `new-arrivals-to-folders.ps1` dry-run first → `cd "C:\Users\JIN\owarin-store\04 Design Tools"` → `.\upload-missing-r2.ps1` (plan must list the 4) → `.\upload-missing-r2.ps1 -Commit` → last line `read-back identical: True` → Refresh Meta feed → expect `✅ … (1133)`.

## Next, in order
1. Ask owner: Step A items done? + Add Duration after (compare 3.588 s). Give remaining Step A steps one at a time if needed. Do NOT delete R2 JOBS / IMAGE UPLOADS yet.
2. Help owner get the 4 photos uploaded (above).
3. Switch to Opus · high for `prompts/v44-review-and-deploy.md`, then deploy Version 8, then Step B/C per AUDIT §8 (delete R2 JOBS, IMAGE UPLOADS, FB CATALOGUE legacy columns, empty columns) with backup file first.
4. FB Album autopost is PARKED (decision FBA-PARK-1) — do not touch.
Log every mistake/correction in `_logs/INCIDENTS.csv`; owner decisions in `decisions_2026-10-07.csv`.
