# AUDIT — OWARIN STORE sheet structure (compact for the back-office)

จัดทำ: 2026-10-07 · Opus · status: **Phase 1 DONE (code + schema), Phase 2 WAITING owner audit JSON** · nothing in the live Sheet changed
Scope: shop Sheet `16TV5aA0…wt98S0` + its bound project. "backhouse" read as the shop back-office web app; Back House LAB stays a separate project (decision B1-5 CLOSED; LAB must not copy shop code/schema/IDs).
Evidence: `04 Design Tools/logs/W3-PROD-20261006-01/shop-schema-before.json` (22 tabs, 2026-10-06 before W1/W2 tables; prod now ~25 with ORDERS/ORDER LINES/journals), code `03 Apps Script/Web App/*_v43.gs`, `FbAlbum_v4.gs`. "rows" in that export = sheet capacity, not data rows → Phase 2 measures real data rows.

## 1. Findings (Phase 1)

| # | Finding | Evidence | Proposed action | Risk |
|---|---|---|---|---|
| F1 | `Sheet23` has the same headers and 1,080 rows as `FB ALBUM CAPTION BACKUP 2026-10`; no code reads either | schema json; grep 0 hits | If audit hash equal → delete `Sheet23`; move the BACKUP tab out to a dated backup file | low |
| F2 | `TYPE LIST` (Type → Album name) duplicates `FB ALBUMS` (album_key (Type) → Album name); no code reads TYPE LIST | grep 0 hits | Audit: is it a dropdown source? If yes re-point validation to FB ALBUMS; then retire | low–med |
| F3 | `IMAGE UPLOADS` holds only its header; `R2 JOBS` 1,334 snapshot rows — R2 side now runs via `upload-missing-r2.ps1` + `R2 IMAGES` | R2Upload.gs, CLAUDE.md chain | Confirm menu `R2 Images` is unused → freeze + archive both | med (owner confirms) |
| F4 | `R2 IMAGES` header row is ONE cell containing tab characters (pasted TSV) | header `Product ID\tImage 1\t…` | Fix header to real columns after checking `_r2ImageIndex` reads by position | low |
| F5 | Code still targets tabs that no longer exist: `SERIES MAP` (a menu even `insertSheet`s it again), `DESCRIPTION` (fallback read) | Code_v43 l.519/1517/2677/3028 | Remove dead menu/fallback in a code release | low (code) |
| F6 | `FB CATALOGUE` (18 cols) keeps a full Meta block (`id…brand`) + legacy `price (Meta format)`/`mp price (Meta format)` while `META EXPORT` is the real feed | CLAUDE.md feed rules (4); Code l.2752–3058 | Phase 2: count formulas; drop legacy + duplicate Meta block from FB CATALOGUE only after export tests prove META EXPORT is unchanged | med (feed) |
| F7 | Empty placeholder columns inflate every full-width read: GGB `Column 25–30` (6), MAGAZINE `Column 24–30` (7), SALES 17, GAME INFO 23, TEMPLATES 9 (+`Column 3`) | schema json | Remove trailing empty columns (inventory only after a test that HEADER_MAP/columns are unchanged) | med |
| F8 | Capacity rows: CLIENT, GAME INFO, TYPE LIST at 1,000; TEMPLATES 315 for ~7 templates; BOOKING 308 | schema json | Trim blank rows except CLIENT/ORDERS native tables (append capacity is part of W2 guards — never trim those) | low / **no** for W2 tables |
| F9 | FB album autopost: `FB ALBUM CAPTION` 1,388 + `FB ALBUM LOG` + `FB ALBUMS`; STATE notes trigger `fbaPostBatch` error rate 100% | STATE stream 2 | Decide: keep autopost (fix) or retire (archive 3 tabs + remove trigger) | owner decision |
| F10 | Add Save slowness is mainly code (BOOKING tab scan, full journal read, 3 flush/recalc waits), not tab count | `prompts/add-save-performance.md` | Do v44 perf after Phase 2 shows the formula load | — |

## 2. Keep (fixed by rules — never merge/delete)
GAME GUIDE BOOKS, MAGAZINE (separate SKU sequences) · SALES (event ledger) · ORDERS / ORDER LINES / CLIENT + W1/W2 journals (guarded native tables) · ADD REQUESTS · REFRESH LOG · PID CHANGES · FB CATALOGUE ARCHIVE · META EXPORT (gid 355347627) · GAME INFO · BOOKING · TEMPLATES · R2 IMAGES (feed image source).

## 3. Phase 2 — measure (owner runs read-only `04 Design Tools/sheet-audit/SheetAudit.gs`)
Gives per tab: real data rows, trailing blanks, formula cells + R1C1 patterns, heavy/volatile functions (IMPORTRANGE, QUERY, ARRAYFORMULA, VLOOKUP, NOW/TODAY…), cross-tab references (dependency map), dropdown sources, conditional formats, value hashes (duplicate proof), triggers, recalculation setting. No cell values. Mock test `SheetAudit.test.cjs` PASS.

## 4. Phase 3 — plan (after JSON)
One plan file with: target tab list, per-tab action, order (backup → archive copies → code release if needed → delete), dry-run log per step, UNDO. Expected outcome stated honestly: fewer tabs and lighter recalculation; Add speed comes from v44 code changes.

## 5. Apps Script tools (menu 📦 Inventory Tools + web TOOLS tab) — APPROVED 2026-10-07 (TOOLS-MENU-1), not yet coded
Owner 2026-10-07: "tools" = Apps Script menu/functions. Removal = drop the menu item + web TOOLS button (+ dead function) in one code release; nothing in the Sheet changes.

| Tool (function) | Evidence | Proposal |
|---|---|---|
| 🔄 Rebuild ALL Product IDs (`forceRegenerateAllSKUs`) | CLAUDE.md: never click, breaks R2 image links | **Remove** |
| 🗂️ Build / update SERIES MAP (`sp2BuildSeriesMap`) | tab retired; Series lives in GAME INFO; the item `insertSheet`s the old tab | **Remove** |
| R2 Images ▸ Export Instock snapshot / View image job results (`r2ExportInstockSnapshot`, `r2ShowUploadResults`) + tabs R2 JOBS, IMAGE UPLOADS + `r2-queue-worker.py` | old queue-worker design; IMAGE UPLOADS never got a result row; live chain = `upload-missing-r2.ps1` | **Remove** (tabs → backup file) |
| 📘 Build FB CATALOGUE / ✍️ Rebuild descriptions / 📤 Build META EXPORT | all run inside 🚀 Refresh Meta feed | **Move** to ⚙️ Setup & repair |
| 🧱 SP-2 column setup / 🎨 Lay out sheet | "run once" items | **Move** to ⚙️ Setup & repair |
| 🏷️ Fill Copy Flags from title (`sp2MigrateFlags`) | v17.4 migration; Add derives flags automatically | **Move** to Setup & repair (owner confirms) |
| 🖼️ Build ALBUM CAPTION / 🏷️ SOLD OUT caption / 📷 FB Album Auto-Post menu | FB album autopost; trigger `fbaPostBatch` error 100% | **PARKED** (owner 2026-10-07: record, resume later) |
| 🚀 Refresh Meta feed · Validate / Fill missing Product IDs (safe) · Find publishers · Sort A-Z · Fill formulas · SP-2 calculate/preview/apply · Audit under-market · Review queue · Labels · Install trigger · Apply SP-2 every row · Renumber RESTOCK | in daily chain or guarded repair | **Keep** |

## 6. How R2 photo upload works now (from code, 2026-10-07)
1. Sort photos with `new-arrivals-to-folders.ps1` (folders named exactly like Item name).
2. `upload-missing-r2.ps1` (dry-run) reads the LIVE Sheet, lists R2 `owarin-images/library/`, and plans only Instock PIDs that have NO folder on R2; a PID changed in PID CHANGES is copied R2-side from the old PID.
3. `-Commit` uploads with `rclone copy --ignore-existing` (never overwrites/deletes), rebuilds `meta/images.csv` (pid,n,ext index) via `build-r2-images-index.ps1`, backs it up, publishes, reads it back (`read-back identical: True`).
4. Apps Script `_r2ImageIndex()` reads that `meta/images.csv` live for image links in FB CATALOGUE / META EXPORT; tab `R2 IMAGES` is only the fallback when the live read fails.
The Sheet menu R2 Images and tabs R2 JOBS / IMAGE UPLOADS are not part of this chain.

