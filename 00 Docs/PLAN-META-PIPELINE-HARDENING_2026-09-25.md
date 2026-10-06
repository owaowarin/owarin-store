# PLAN — Meta feed pipeline hardening (Code v27 + upload-missing-r2 v2)

จัดทำ: 2026-09-25 (Friday) · Author: claude-opus-5-5 (design + candidate code + tests) · Executor: **Sonnet · medium**
Builds on: `HANDOFF_2026-09-25.md`, `PLAN-FB-CATALOG_2026-09-23.md` (S0–S5 done). Everything needed is in
`00 Docs/_staging/meta-v27/` — the executor does NOT design or write code, only deploys, verifies and documents.

## 0. Status board — the ONLY place to tick progress

| Step | What | Who | Status | Evidence |
|---|---|---|---|---|
| S0 | Pre-flight: owner D8 answer, tests pass on staged files | Sonnet | **DONE** | `decisions_20260925.csv` D8=A CLOSED; `metafix_s0_preflight_20260925.csv` |
| S1 | Deploy Code v27 to live Apps Script (hash-guarded) | Sonnet via Chrome | **DONE** | `metafix_s1_deploy_20260925.csv` (live sha 48919f58...af3e verified) |
| S2 | Authorize UrlFetch scope + first 🚀 Refresh Meta feed | Owner clicks, Sonnet reads popup | **DONE** | `metafix_s2_refresh_20260925.csv` |
| S3 | Install upload-missing-r2 v2 + owner dry-run / -Commit | Sonnet files, owner PowerShell | **DONE** | `metafix_s3_ps_20260925.csv` |
| S4 | Docs: CLAUDE.md, README, version stubs, HANDOFF, this board | Sonnet | **DONE 2026-10-02** | verified 2026-10-02: Code_v27.gs present, Code_v26.gs = superseded stub + backup/Code_v26_superseded_2026-09-25.gs, README lists v27 + tests, CLAUDE.md v27 chain, PLAN-FB-CATALOG line 26 marks it superseded; live pulls 2026-09-25→10-01 all succeeded (1,342/1,342, 0 invalid). Left for owner: delete `00 Docs/_staging/meta-v27/` (copy already in `_archive/staging-meta-v27_2026-09-25/`) |

Model: Sonnet · medium for every step. Stop and hand back to Opus only if an ABORT/hash mismatch appears that the step does not explain.

## 1. Why the pipeline kept breaking (verified 2026-09-25 in live Code v26 + sheet)

| # | Root cause | Evidence | Fixed by |
|---|---|---|---|
| R1 | **Product ID silently changes.** `_recalcRow` (onEdit + web app) rebuilds the PID when Item name / Publisher / Condition is edited; a row with no RESTOCK sibling even gets a new number (059 → 001). PID is the key for R2 `library/<PID>/`, FB CATALOGUE rows and Meta retailer_id. | 8 missed books today = old PIDs `OWA-GGBD059AR03` etc. still in FB CATALOGUE (the 23 "not in inventory" rows) | P1 ledger + follow/archive (Code) + R2 copy from ledger (PS) |
| R2 | New products always get a **blank Description** — `buildFbCatalogue` only copies from a DESCRIPTION tab that no longer exists | popup never shows "read descriptions from DESCRIPTION" | F2 template fallback |
| R3 | `R2 IMAGES!E:G` is **IMPORTDATA (Google-cached)** → a freshly published index is invisible until `?v=N` is bumped by hand | today: `?v=6 → ?v=7` needed | F4 read `meta/images.csv` live via UrlFetchApp (sheet = fallback) |
| R4 | R2 side = **4 manual commands**; "publish meta/images.csv" was skipped once | HANDOFF_2026-09-25 | F3 `-Commit` does upload → index → backup → publish → read-back |
| R5 | **Failures were silent**: popups gave counts, not which Instock book is missing and what to do | 40/31/23 "Incomplete" confusion | Health check in META EXPORT popup |

## 2. Target workflow after v27 (owner card — ใช้แทนขั้นตอนเดิมทั้งหมด)

**ของเข้าใหม่ / แก้ข้อมูลสินค้า**
1. กรอก/แก้แถวใน GAME GUIDE BOOKS หรือ MAGAZINE ตามปกติ — ถ้า Product ID เปลี่ยน มุมขวาล่างจะขึ้น toast "Product ID changed (logged in PID CHANGES)" ไม่ต้องทำอะไรเพิ่ม
2. จัดรูปด้วย `new-arrivals-to-folders.ps1` (เหมือนเดิม)
3. PowerShell ที่ `04 Design Tools`: `.\upload-missing-r2.ps1` (ดูแผน) → `.\upload-missing-r2.ps1 -Commit` — จบฝั่ง R2 ในคำสั่งเดียว บรรทัดสุดท้ายต้องเป็น `read-back identical: True`
4. Google Sheet: **📦 Inventory Tools → 🚀 Refresh Meta feed** — popup บรรทัดแรกต้องเป็น `✅ Every Instock product is in the feed (N)`; ถ้าเป็น `⚠️ … NOT in the feed` popup จะบอกเล่มไหน + ต้องทำอะไร
5. Meta ดึงเองตอน 06:00

**ขายแล้ว**: เปลี่ยน Status เป็น Sold → 🚀 Refresh Meta feed (หรือรอรอบถัดไป) — Meta ลบออกเองใน 06:00

Error-proofing built in: toast on every PID change · ledger tab `PID CHANGES` · orphan rows copied to `FB CATALOGUE ARCHIVE` before removal · safety stop if >5% (min 50) rows look orphaned · R2 index read back and hash-compared · single popup that names every Instock gap with its fix.

## 3. Owner decision D8 (S0 — ask once, record CLOSED) — **CLOSED 2026-09-25 14:48: D8=A**

When a PID changes, Meta treats it as a new product (ad history of that item resets).
- **A (default, what v27 implements):** PID may change as today; the change is logged and the photo folder + FB CATALOGUE row follow it automatically.
- **B:** lock PIDs once listed. Not implemented — needs a separate design (onEdit behaviour change). If owner picks B: still deploy v27 (the ledger is needed either way), record D8=B OPEN, hand back to Opus.

## 4. What v27 changes (for reviewers — executor does not need to read the code)

Code (`Code_v27.gs` = live v26 + 16 anchored replacements in `apply_v27.js`; `node --check` OK; `meta-pipeline.test.js` 5 scenarios + `fb-catalogue.test.js` pass; mutation checks kill P1/F2/F4/safety-stop):
- `_recalcRow`: after writing a new PID, `_logPidChange()` appends `Timestamp | Sheet | Row | Old | New | Item name` to tab **PID CHANGES** (auto-created) + toast. Identical PID → no row.
- `buildFbCatalogue(opts)`: new step 2a — rows whose PID is not in inventory: if the ledger maps it to a current PID not yet on the sheet → rename in place (FB Title / Freebies / Synopsis kept); else copy the row to **FB CATALOGUE ARCHIVE** (+ time + reason) and delete it. Safety stop above max(50, 5%). Blank Description → `_buildCaption(inv,{price:false})`. `{silent:true}` skips both dialogs.
- `_r2ImageIndex()`: reads `R2_PUBLIC_URL/meta/images.csv?t=<now>` first; falls back to the R2 IMAGES sheet; source shown in the popup.
- `exportMetaCsv()`: headline health check (every in-scope Instock PID either exported or listed with a fix hint) + FB CATALOGUE build log in the same popup. Export rows/columns unchanged; tab gid 355347627 untouched (contents rebuilt in place as before).
- Menu: **🚀 Refresh Meta feed (catalogue + export + health check)** = silent build + export (one popup). Old menu items stay.
- New Google scope: `script.external_request` (UrlFetchApp) → one authorization prompt (S2).

PowerShell (`upload-missing-r2.ps1` v2, UTF-8 BOM, parse OK in pwsh 7.4): reads PID CHANGES via gviz; Instock PID with no R2 folder whose old PID has one → `rclone copy library/<old> library/<new> --ignore-existing` (server-side, add-only, logged as `R2COPY`); `-Commit` then runs `build-r2-images-index.ps1 -Commit`, backs up `meta/images.csv` to `_r2_upload/_r2_backup/<ts>/`, publishes, downloads it back and compares SHA-256. Also publishes when there is nothing to upload (keeps the index honest). Never sync/delete/purge.

## 5. Steps

### S0 — Pre-flight (Sonnet · low, ~5 tool calls)
1. Ask owner D8 (A/B) in one line if not already answered; append to `04 Design Tools/logs/decisions_<today>.csv`: `date,decision,scope,rationale,status,files_updated`.
2. Stage `00 Docs/_staging/meta-v27/*` + `03 Apps Script/Web App/R2Upload.gs` into the container; in one dir run `node meta-pipeline.test.js && node fb-catalogue.test.js` → both "all assertions passed". Also `sha256sum Code_v27.gs` must be `ef8c6d347e7ec4235aeffdb6eed2925c4bfa7f1e36726e60d61f2466f58a6832`. Any failure → stop, report.

### S1 — Deploy Code v27 (Sonnet via Claude in Chrome · medium)
Warning first line for owner: **this replaces the live Code.gs; rollback = Code_v26.gs (below).**
1. Open `https://script.google.com/home/projects/1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp/edit` (bound script "webapp"; Code.gs is `monaco.editor.getModels()[0]`). Dismiss the account popup (OK).
2. `javascript_tool` with the full text of `apply_v27.js`. Expected result: `APPLIED v27 (sha 48919f58…af3e) - now press Ctrl+S`. `ALREADY v27` = fine, skip to 4. Any `ABORT` = stop, report the message, do nothing else.
3. Click inside the editor, press `ctrl+s`, wait 5 s.
4. Reload the editor URL, wait 4 s, re-check: `sha256(monaco.editor.getModels()[0].getValue())` = `48919f5834ce102faa65a282400ebe565f46660bed908733d9376df62688af3e`.
5. Web app: if the owner's web app deployment is pinned to a version, the PID hook only reaches web-app edits after a redeploy — owner, click-level: Apps Script → **Deploy** → **Manage deployments** → pencil ✏️ on the active deployment → **Version: New version** → **Deploy**. (Sheet menus and onEdit use the saved code immediately.)
Log `metafix_s1_deploy_<ts>.csv` (columns: `TimeBangkok,Step,Operation,Source,Destination,Before,After,Mutation,Status`): before sha 0fa783f7…3a57 → after 48919f58…af3e.
Rollback: open the editor, `monaco.editor.getModels()[0]` ← contents of `03 Apps Script/Web App/Code_v26.gs` (CRLF), Ctrl+S; confirm sha 0fa783f7…3a57.

### S2 — Authorize + first Refresh (owner clicks · Sonnet verifies)
1. Owner, click-level: Google Sheet → reload the tab → **📦 Inventory Tools** → **🚀 Refresh Meta feed (catalogue + export + health check)** → dialog **Authorization required** → **Continue** → choose `anannsonghirunn.a@gmail.com` → if "Google hasn't verified this app": **Advanced** → **Go to webapp (unsafe)** → **Allow**. Then run **🚀 Refresh Meta feed** again (the first click only authorizes).
2. Expected single popup (read it with `javascript_tool`: innerText of `[role="dialog"]`):
   - line 1 `✅ Every Instock product is in the feed (1342)` (number = live Instock count; if Instock changed today it differs — cross-check with the popup's Ready count, never with this file)
   - `FB CATALOGUE:` block contains `moved 23 row(s) whose Product ID left the inventory to FB CATALOGUE ARCHIVE` (first run only) and `• image index: R2 meta/images.csv (live)`
   - `Incomplete data: 0` · `Not in inventory (FB CATALOGUE rows to clean up): 0`
3. If line 1 is ⚠️: do what each listed hint says (usually S3 first), then re-run. If `⛔ … above the safety limit`: stop — inventory sheets are unreadable or renamed; do not retry, report.
4. Check tab **FB CATALOGUE ARCHIVE** has 24 rows (header + 23) and they match `04 Design Tools/logs/fbcat_not_in_inventory_20260925.csv` (PID column). Log `metafix_s2_refresh_<ts>.csv`.

### S3 — upload-missing-r2 v2 (Sonnet files · owner runs PowerShell)
1. Archive the v1 script per AGENTS.md: copy `04 Design Tools/upload-missing-r2.ps1` → `_archive/upload-missing-r2.v1_20260925.ps1` (project-root `_archive/`) (verify size 8354), then commit the staged v2 over `04 Design Tools/upload-missing-r2.ps1` (verify size 14010, first bytes EF BB BF).
2. Owner, in PowerShell at `04 Design Tools`: `.\upload-missing-r2.ps1` → expect `Instock without R2 folder: 0` and `Nothing to upload.` (no publish in dry-run).
3. Owner: `.\upload-missing-r2.ps1 -Commit` → expect build-index output then `Index published: <n> PIDs | read-back identical: True | backup: …\_r2_backup\<ts>\images.csv`.
4. Log `metafix_s3_ps_<ts>.csv` (script before → after size/sha; publish result).

### S4 — Docs (Sonnet · low; targeted edits only, read-back after each write)
1. `03 Apps Script/Web App/`: add `Code_v27.gs` (staged); copy `Code_v26.gs` → `backup/Code_v26_superseded_<date>.gs` then replace `Code_v26.gs` with the SUPERSEDED stub (same wording as the v25 stub, pointing at v27); add `meta-pipeline.test.js`; replace `fb-catalogue.test.js` with the staged one; `image-url.test.js`: `Code_v26.gs` → `Code_v27.gs` (3 places); `README.md`: v26 → v27 in the file table + add a `meta-pipeline.test.js` row.
2. `CLAUDE.md` → replace the whole section "## Meta feed / R2 image publish chain (added 2026-09-25)" with the 4-line owner workflow of §2 (English) + "PID changes are logged in PID CHANGES; never delete that tab."
3. `PLAN-FB-CATALOG_2026-09-23.md`: one line under the 2026-09-25 update → "superseded by PLAN-META-PIPELINE-HARDENING_2026-09-25.md".
4. This board: set rows DONE with evidence. Append a 5-item block to `00 Docs/HANDOFF_<today>.md`. Copy `00 Docs/_staging/meta-v27/` to `_archive/staging-meta-v27_<date>/` (project root) only after S1–S4 are DONE (copy + verify, then ask owner to delete the staging folder — the device shell cannot delete).

## 6. Guardrails
- Live data only; never reuse a number from this file as current (1342/23/2056 were true on 2026-09-25 14:30).
- Never touch the META EXPORT tab structure (gid 355347627); never delete PID CHANGES / FB CATALOGUE ARCHIVE; no `rclone sync|delete|purge`.
- Do not run 🔄 Rebuild ALL Product IDs (CLAUDE.md).
- Token discipline: read this file + the file each step names; do not open `Code_v27.gs` (hashes prove it); screenshots at `scale: 0.5`; read popups via `javascript_tool` innerText, not screenshots.

## 7. Start prompt for Sonnet (paste as-is)

> Read `00 Docs/PLAN-META-PIPELINE-HARDENING_2026-09-25.md` only. Execute the first TODO row of its Status board exactly as written, using the staged files in `00 Docs/_staging/meta-v27/`. Do not write or redesign code. After each step: update the board, write the log CSV, append the HANDOFF block. On any ABORT/hash mismatch or unexpected popup text: stop and report, do not improvise.
