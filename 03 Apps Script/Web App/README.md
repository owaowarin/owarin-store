# OWARIN STORE — Web App / Tools

โฟลเดอร์นี้เก็บ **โค้ดจริงที่ใช้งานอยู่** และคู่มือที่ยังใช้อ้างอิง
ของเก่าที่เลิกใช้แล้วอยู่ใน `_archive/`

---

## ไฟล์โค้ด (ตัวจริง — ต้องอัปขึ้น Apps Script)

**อัปเดต 2026-09-18:** `Code.gs` / `WebApp.gs` (ไม่มีต่อท้าย v20) เป็นโค้ดเก่าที่หลุดคู่กัน
(`WebApp.gs` เขียนไว้ว่า "คู่กับ Code.gs v17" แต่ `Code.gs` เองอ้างว่าเป็น v19 — ไปคนละทาง
และไม่มี `doGet()`/`api()` ของตัวเอง ใช้เป็นเว็บแอปไม่ได้) กับสอบเทียบลำดับคอลัมน์ในชีตจริงแล้ว
ไม่ตรงด้วย → **ย้ายเข้า archive แล้ว ห้ามอัปขึ้น Apps Script อีก** ไฟล์ตัวจริงคือ `Code_v43.gs` + `WebApp_v43.gs` (ติดตั้ง/อ่านกลับร้าน Session53 วันที่2026-10-06; deployment Version6; คู่ v42/v42)
(v20–v31 ถูกแทนที่แล้วเช่นกัน — ดูกฎเวอร์ชันด้านล่าง)

| ไฟล์ | คืออะไร | อัปไปที่ไหน |
|---|---|---|
| `Code_v43.gs` | ตรรกะหลัก (v43 = UI-only DNA/UX, server unchanged; backup `backup/pre-v43-20261007/`; v42 = default0 UI + unchanged v41 server; v41 = accepted W1/W2 + fresh Code v32 FB Album changes + guarded native CLIENT metadata migration; v31 = v30 + durable Add journal, same-ID recovery, R1–R4 validation/readback · v30 = v29 + เล่มซ้ำที่เหมือนกัน (ชื่อ+Publisher+Original+Condition+Copy Flags) ลงฟีดแถวเดียว quantity = จำนวนเล่ม + ชื่อตัวพิมพ์ใหญ่ล้วนส่งออกเป็น Capitalised + บันทึก D6 · v29 = v28 + ชื่อสินค้าที่ส่ง Meta ไม่มี (RESTOCK-NN) อีก: ขั้น v20b เขียนชื่อที่ตัดแล้ว + ตัด RESTOCK จาก FB Title ทุกค่าตอน export · v28 = v27 + รีเฟรช Meta feed อัตโนมัติทุกคืน: `refreshMetaFeedAuto`, ด่านกันยอดตก <80%, แท็บ REFRESH LOG, อีเมลแจ้งเตือน, `installMetaRefreshTrigger` · v27 = v26 + P1: PID CHANGES ledger + follow/archive แถวกำพร้าใน FB CATALOGUE, F2: Description ว่างเติมจาก caption template, F4: image index อ่านสดจาก R2 meta/images.csv, เมนู 🚀 Refresh Meta feed + health check): ราคา SP-2, SKU, เมนู Inventory Tools, เครื่องมือ Facebook | Apps Script → `Code.gs` |
| `WebApp_v43.gs` | API ของเว็บแอป (inventory / cart / sales / booking / contents) — คอมเมนต์หัวไฟล์เขียนไว้ชัดว่า "pairs with Code.gs v43" | Apps Script → `webapp.gs` |
| `R2Upload.gs` | คำสั่ง `R2 Images`: snapshot แถว Instock ลง `R2 JOBS` และเปิดดู `IMAGE UPLOADS` — ⚠️ ห้ามประกาศ helper ชื่อซ้ำกับ Code.gs (`_resolveColumns`/`_val`/`_tryWrite`/`_sp2ResetWriteErrors`/`_withLock`) เพราะไฟล์นี้โหลดทีหลังและจะทับทั้งโปรเจกต์ (เหตุการณ์ 2026-09-23) · ตัวใน Apps Script ตอนนี้ = v3 เดิม + rename helper เป็น `_r2*_` (ยังไม่ใช่ไฟล์ v4 ในโฟลเดอร์นี้) | Apps Script → เพิ่มไฟล์ `R2Upload.gs` |
| `P1Journal.gs` | guarded ADD REQUESTS migration + read-only production readiness; no trigger installed | Apps Script → `P1Journal.gs` |
| `Index.html` | หน้าเว็บแอปทั้งหมด (SPA) — ไฟล์เดียว ใช้ร่วมกับทุกเวอร์ชันของ Code.gs ไม่มีเวอร์ชันแยก | Apps Script → `Index.html` |
| `W1Orders.gs` | Cart/Orders/stock guards + durable same-ID transactions | Apps Script → `W1Orders.gs` |
| `W2Clients.gs` | CLIENT identities/search/save + separate CRM retry + committed recipient | Apps Script → `W2Clients.gs` |
| `LabelRenderer.html` | Canonical allowlisted 100×150mm renderer / CAUTION | Apps Script → `LabelRenderer.html` |
| `W2LabelUI.html` / `W2Suggest.html` | Shared label controls/customer suggestions | Apps Script → matching HTML files |
| `LabelDialog.html` | Native Sheets Label Tool | Apps Script → `LabelDialog.html` |
| `ReleaseMigration.gs` | Owner/exact production schema entrypoints; original schema request DONE | Apps Script → `ReleaseMigration.gs`; do not reset/run with new IDs |
| `Index.test.js` | Smoke test ของ ALL SHEETS + ค่าเริ่มต้น Add Item (`node Index.test.js`) | รันบนเครื่องเท่านั้น |
| `image-url.test.js` | Test `_r2ImageIndex()`/`_imageUrl()`/`_looksLikeSheetError()` ใน `Code_v43.gs` (`node image-url.test.js`) | รันบนเครื่องเท่านั้น |
| `fb-catalogue.test.js` | โหลด `Code_v43.gs` แล้วตามด้วย `R2Upload.gs` ในบริบทเดียว (เหมือน Apps Script) → รัน Rebuild descriptions / Build FB CATALOGUE / Build META EXPORT กับข้อมูลจำลอง · จับได้ถ้าไฟล์อื่นทับ helper ของ Code.gs (`node fb-catalogue.test.js`) | รันบนเครื่องเท่านั้น |
| `dna-ux.test.cjs` | v43: W2LabelUI มี fallback ทุกสี, money accept/reject = v42, `confirmSold` ชี้ช่องที่ผิด, toast/nav/FAB (`node dna-ux.test.cjs`) | รันบนเครื่องเท่านั้น |
| `meta-pipeline.test.js` | Test v27 + v28 + v29 + v30 (รวมเล่มซ้ำ/ชื่อตัวพิมพ์ใหญ่) (รีเฟรชอัตโนมัติ: ไม่มี popup, ด่านกัน, REFRESH LOG, อีเมล, trigger): PID CHANGES ledger + chain resolution, `refreshMetaFeed()` end-to-end (rename-in-place / archive orphan / safety-stop), live-index fallback, `_recalcRow` ledger logging (`node meta-pipeline.test.js`) | รันบนเครื่องเท่านั้น |
| `prepare_r2_upload.py` | เตรียมรูปสำหรับอัป Cloudflare R2 | รันบนเครื่อง (วางที่โฟลเดอร์ OWARIN STORE) |

W1/W2 production **v42 / Version6 LIVE**: fresh saved/reloaded3changedfile LF hashes match42; Session51 prior13file readback retained, original auxiliary sources/manifest retained. Native migration recovered original request/allocated CLIENT IDs, A:F preserved, DONE replay unchanged. Six root impact regressions plus13migration/failure and14CRM/retry groups PASS; root10sources match revision. Previous full root31pair: `backup/pre-v41-20261006/`; root31 files are stubs. Private native backup + exact original exports/source/settings/undo: `../../04 Design Tools/logs/W3-PROD-20261006-01/`.

หากผล Save ไม่ชัดเจน ใช้ Request ID เดิมและ `Check / retry request`; อย่าสร้างคำขอใหม่เพื่อเดาแก้. SOLD แล้ว CLIENT saveล้มเหลวให้ retry CRMเดิมเท่านั้น; Print/Reprintใช้orderเดิมไม่ขายซ้ำ. ดู [แผน](../../00%20Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) และ [คู่มือ](../../00%20Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md). Native Table generated headers/root fix and UI evidence are in the release packet. Print/PDF/physical PASS remains owner-confirmed Session50; first real order is observation only.

> ⚠️ แก้ไฟล์พวกนี้แล้วต้อง **คัดลอกไปวางใน Apps Script + Save** ถึงจะมีผล
> ถ้าใช้ URL `/exec` ต้อง Deploy > Manage deployments > New version ด้วย
> **กฎเวอร์ชัน (ตั้งแต่ 2026-09-18):** แก้โค้ดครั้งไหนก็ตาม ต้องเพิ่มเลข v ทั้งคู่ (Code_vNN.gs +
> WebApp_vNN.gs แม้ไฟล์ใดไฟล์หนึ่งไม่มีการเปลี่ยนจริงก็ bump ไปด้วยเพื่อให้คู่คอมเมนต์ "pairs with"
> ตรงกันเสมอ) ย้ายเวอร์ชันก่อนหน้าไป `backup/` พร้อม stub ชี้ทางที่ root และอัปเดตตารางนี้ +
> HANDOFF ในการแก้ไขรอบเดียวกัน — ห้ามข้ามขั้นตอนไหน
> `Code.gs`/`WebApp.gs` (ไม่มีเลข v) และไฟล์ numbered รุ่นก่อนหน้าอย่าง v20/v21 ที่เห็นในโฟลเดอร์นี้ตอนนี้
> เป็นแค่ stub ชี้มาที่หน้านี้ — เนื้อหาเดิมเต็มๆ อยู่ใน `backup/*_superseded_2026-09-18.gs`

---

## คู่มือที่ใช้อ้างอิง

| ไฟล์ | ใช้ตอนไหน |
|---|---|
| `../../00 Docs/PLAN-R2-HYBRID_2026-09-22.md` | แผน Hybrid revision 3: local Export Instock Snapshot สำเร็จแล้ว; Apps Script queue เขียนและทดสอบแบบ offline แล้ว แต่ยังไม่ deploy; Windows pickup, New Arrival และ R2 ยังไม่เปิดใช้ |
| `cloudflare-r2-guide.md` | อัปรูปขึ้น R2 · ตั้งค่า rclone · สูตร `image_link` |
| `SP2-column-guide.md` | ความหมายของทุกคอลัมน์ในชีตสต็อก |
| `OWARIN-SYSTEM-OVERVIEW.md` | ภาพรวมระบบทั้งหมด |
| `suggested-price-redesign_SP2.md` | ที่มาของสูตรคำนวณราคา SP-2 |
| `../../00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` | แผนปัจจุบัน Add/Cart/Orders/CLIENT/Label: W1–W3; requirements/QA/status board |
| `owarin-webapp-plan_v4.1-EN.md` | roadmap เว็บรุ่นก่อน; หมายเลข phase ไม่ตรงกับโครงการปัจจุบัน |
| `sheet-consolidation-plan.md` | แผนยุบชีต 10→7 (ทำเสร็จแล้ว — เก็บไว้ดูเหตุผล) |
| `cleanup-plan.md` | แผนทำความสะอาดโค้ด/โฟลเดอร์ |

---

## ขั้นตอนใช้งานประจำ

**เพิ่มสินค้าใหม่** → กรอกในเว็บแอป (ปุ่ม `+`) หรือพิมพ์ในชีต ระบบสร้าง SKU/ราคาให้เอง

**ขายของ** → SHOP: ใส่ตะกร้า → Create order → ORDERS Pending → Confirm sold → final review/Client/Label; SHOPEE: CART → Confirm sold → final review. พิมพ์ซ้ำจาก orderเดิมโดยไม่ Confirm soldอีก

**อัปรูปใหม่ขึ้น R2**

> ขั้นตอน 1–4 ด้านล่างเป็นสาย catalog เก่า ใช้ path `GGB All/GGB - POCKET BOOK` และไม่ครอบคลุมคลังรูปปัจจุบัน; อย่าใช้เป็นคำสั่งสำหรับ Hybrid/library รอบใหม่ ให้ดู [แผน R2 Hybrid](../../00%20Docs/PLAN-R2-HYBRID_2026-09-22.md) ก่อน (สถานะ: ออกแบบแล้ว ยังไม่ใช่ระบบที่ติดตั้งเสร็จ)

1. วางรูปที่ `GGB All/GGB - POCKET BOOK/<ชื่อตามชีต>/<ชื่อตามชีต> (1).jpg`
2. export ชีต GAME GUIDE BOOKS เป็น CSV ทับ `_r2_upload/Update.csv`
3. `python prepare_r2_upload.py`
4. `rclone copy _r2_upload/catalog r2:owarin-images/catalog --progress`

**คำสั่ง Export Instock รุ่นใหม่ (ติดตั้งแล้ว; ยังไม่รัน production batch):** live Apps Script มี
`Code.gs` v22 + `R2Upload.gs` และเมนู `📦 Inventory Tools → 🖼️ R2 Images → 📁 Export Instock snapshot`.
คำสั่งนี้เขียน request ลง `R2 JOBS` เท่านั้น; Windows worker ใช้ service account ที่เก็บนอก OneDrive
และผ่าน authenticated dry-run แล้ว. ก่อนรันจริงต้องกด export หนึ่งครั้ง ตรวจ queue แล้วรัน worker `--dry-run`.

**อัปแค็ตตาล็อก Facebook** (ทำเฉพาะ POCKET BOOK)
1. เมนู 📦 Inventory Tools → **📘 จัด FB CATALOGUE**
2. → **✍️ สร้าง Description ใหม่**
3. → **📤 สร้างชีต META EXPORT**
4. อยู่ที่แท็บ META EXPORT → File → Download → CSV
5. Commerce Manager → Data Sources → Upload (เลือก **Replace**)

---

## กฎที่ต้องจำ

- **ขอบเขต Facebook Catalogue = POCKET BOOK + Instock เท่านั้น** นิตยสารทำแยกทีหลัง
  คุมที่ `_metaInScope()` ใน `Code_v22.gs` จุดเดียว — อย่าเขียนตัวกรองแยก
- **Status มี 5 ค่า:** `Instock` `Sold` `Auction` `Hold` `New Arrival` (แก้ 2026-09-18 —
  เดิม dropdown มี `Retake` ซึ่งไม่มีข้อมูลจริงใช้เลย เปลี่ยนเป็น `New Arrival` ตามที่ใช้งานจริง
  ตรวจกับชีตสดแล้วว่าไม่มีแถวไหนเป็น `Retake`) — เพิ่ม option ใหม่ครบใน `Code_v22.gs`
  (SP2_DROPDOWNS) และ `Index.html` (filter chips + status select + badge CSS) แล้ว
- **ชื่อสินค้า:** `:` ถูกแปลงเป็น full-width `：` อัตโนมัติตอนบันทึก (ไม่มีเว้นวรรครอบตัว) —
  กัน error เวลาต้องใช้ชื่อไฟล์บน Windows ที่ห้ามมี `:`
- **ห้าม sort ชีต FB CATALOGUE** โดยเลือกไม่ครบทุกคอลัมน์ (เคยทำข้อมูลเลื่อนทั้งชีตมาแล้ว)
- **`Series` สงวนให้ SP-2** (ชีต GAME INFO) · **`Type` สงวนให้หมวด/รูปแบบเล่ม**
- **Copy Flags** ใช้ `MAP` และ `COLOUR` (ไม่ใช่ POSTER / FC แบบเก่า)
- ก่อนรันสคริปต์ที่ใช้ CSV ให้ **export ชีตใหม่เสมอ** — CSV เก่าเคยทำให้มองไม่เห็นของที่เพิ่งเข้าสต็อก

---

## `backup/` — โค้ดเวอร์ชันเก่า

เก็บไว้เผื่อย้อนกลับ ไม่ต้องอัปขึ้น Apps Script

## `_archive/` — ของที่เลิกใช้แล้ว

แผนเวอร์ชันเก่า · แนวทาง Supabase (เปลี่ยนไปใช้ Cloudflare R2 แทน) · ไฟล์ zip เก่า


## Session36 — W1 candidate is separate from production v31

Candidate paired Code_v32.gs/WebApp_v32.gs + Index.html/W1Orders.gs: `../../04 Design Tools/logs/W1-20261003-01/candidate/`. Exact revision `W1-20261003-01/v32@3B0D1F63B06C4196578FFEA9714BEC50EC6AD060B3BAC95D8190582175B2BB08`; previous candidate v31 backups/stubs kept inside that package. This README's root v31 table remains the installed-shop source; do not copy candidate files to shop. Local tests/synthetic browser pass; separate test source saved/read back, but Google fixture/schema/UI/retry/LockService acceptance is blocked by Authorization. W1 is not DONE; full CLIENT/Label W2 later. See result.md, UNDO.md, issues.md and REVIEW-ASTRA-HIGH.md in that package;14 groups +1,032 simulated write positions and six impact regressions passed.


## Session37 — historical W1 candidate and isolated Google test

W1-20261004-01/v32@AECC03651A1CD7EC62650EF1611582E4B77580EB8629F68B4A6ABE17D18AC2D3; current package `04 Design Tools/logs/W1-20261004-01/`. Core Google acceptance PASS; focused review pending; authoritative shop source remains v31/deployment4 (dated Session34). W1 is usable only in isolated /dev HEAD https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev; numbered /exec deployment was not updated. No Back House LAB/W2 work.

ORDERS → Cancel → Cancel order modal → Back leaves it unchanged, Confirm cancel releases only that order. Clear cart now clears only the current client cart directly; it does not cancel any Pending order or delete inventory/SALES. Confirm sold → Final review → Back no write / Confirm sold · Label later commits once. Label completion remains W2/MISSING.

Test fixture and recovery already ran; do not press Prepare fixture once / Run recovery once again or use editor Run blindly. Editor consent popup could not be exposed by automation; guarded helpers succeeded through the normal test web app using existing authorization, without granting wider scopes. Pending request → Check / retry request with the exact ID; external conflict → export/reconcile exact cells first. Current test state and recovery IDs are in google-final.xlsx, google-assertions.json and UNDO.md; backups/diffs/logs retained.


## Session39 — historical local/test v33 evidence

W1-20261004-03/v33@1F361D653366B59CD938F2BBB18AEFECEE38B3226280F1FE01D74410A3567B20; current source is only in `04 Design Tools/logs/W1-20261004-03/candidate/`, paired Code_v33.gs/WebApp_v33.gs + W1Orders.gs + unchanged business Index. Root v31 remains production source. Test /dev HEAD has saved v33; numbered /exec unchanged. Local/test W1 acceptance complete, Astra specific sign-off packet prepared; formal review gate open. W2/production not installed. Details/result/recovery at `04 Design Tools/logs/W1-20261004-03/result.md` / UNDO.md / REVIEW-ASTRA-HIGH.md.

Use the existing Cart → Create → Orders/Pending → Cancel or Confirm sold → Final review → Label later flow. Clear cart affects only client cart. If timeout keep exact Request ID/payload and use Check / retry request; max100 can need continuation. Do not create new ID or rerun one-shot fixtures. GZIP-prefixed ORDER REQUESTS Snapshot/Result must be read through the decoder; older plain JSON still works. Oversized payload rejects before intent.

Touched sort/PID/restock/SP2 maintenance writes now have durable MAINTENANCE intent. Failure blocks sibling writes; export and restore evidenced before values/formulas (sort: inspect derived columns/row2 too), then owner-only api requests.reconcile with original Request ID. It verifies restoration and appends outcome, never automatically restores data. Owner direct-edit audit detects managed multi-range/missing UID when trigger is delivered; queue/runtime/lock delivery remains a limit. Preserve Unknown values and version-history evidence.


## Session40 — historical W1 review: changes required

Runtime remains W1-20261004-03/v33@1F361D653366B59CD938F2BBB18AEFECEE38B3226280F1FE01D74410A3567B20; source at `04 Design Tools/logs/W1-20261004-03/candidate/`. Requested focused review completed; release sign-off withheld for R5 per-cell journal/flush performance and R6 lost-original-payload recovery. New evidence is local only; Google /dev and production were not read or changed this session. Next: Sol / High implements the bounded batch in `04 Design Tools/logs/W1-20261004-04/SOL-HANDOFF.md`; see REVIEW.md and review-results.json.

Recovery correction: keep the exact browser Request ID AND payload. The v33 server journal stores normalized snapshots and a hash, not the complete original payload; it cannot reliably reconstruct the original after browser intent is lost. An unfinished request in that condition requires manual reconciliation; do not invent a payload, alter a journal hash, or issue a new ID. DONE results remain canonical. This supersedes the exact-payload-reconstruction sentence in frozen Session39 UNDO.md. New server-intent recovery is planned, not implemented. W1 remains test-only and incomplete; W2/production remain pending.


## Session41 — historical checkpoint, W1 final gates were open

Session41 checkpoint (2026-10-04T15:43:18.210Z): R5/R6 implemented in local/test v36; F04 ID-only recovery passed actual UI. F05 duplicate isolated QA execution left49 logical journal blanks; explicit repair stopped before writes on hash guard. Fresh native proof equals export exactly,0 differing cells; server hash diagnostic saved/read back, UI result pending after browser kernel stopped. W1 NOT COMPLETE. Exact W1-20261004-05/v36@D25BAE5207BDBC45BB946FF6F19FE0B5B7A6004E74EEBD422417DFD9DFF00A67; ONE next step: read existing native diagnostic result using CONTINUE.md, then verified gap reconciliation + final two-session UI/export gates. Production/LAB/W2 unchanged; no repeated broad audit or fixtures.

v36 owner-only Recover request loads exact stored intent then sends ID-only requests.resume; normal browser requests retain original payload and sessionStorage recovery mode. Clear cart affects only browser cart; Pending/Cancel/Final review/Label later contracts unchanged. Current test journal fails closed until explicitly reconciled; do not try business writes during CORRUPT_JOURNAL. Full recovery/next actions in CONTINUE.md; helpers are isolated-test only and never production.

## Session42 — local/test candidate v37 (not production)

The active **candidate** pair is `04 Design Tools/logs/W1-20261004-05/candidate/Code_v37.gs` + `WebApp_v37.gs`, with shared candidate `Index.html` and `W1Orders.gs`; v36 full source is under `candidate/backup/v36/` and its root files are stubs. This candidate is saved/read back only in the exact isolated Google test project. It adds UTF-8 `u8:` request hashes and keeps old hashes replayable. F05 repair, two-tab UI, lost-response recovery, Final review and final export checks passed; see `result.md`/`UNDO.md`. The file table above still names **production v31** correctly; do not upload v37 to the shop or deploy it from this README. Focused Astra/High sign-off remains open.


## Session43 — historical v38 local/test acceptance (review superseded by Session44 below)

Session43 local/test acceptance 2026-10-05T07:04:48.666Z: W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42. R7 cent totals and bounded typed profit readback PASS21 targeted groups (batch/legacy, canonical old floating totals, after-effect SALES/order failures, fixed-ID retry,1cent/typed rejection). Full six-file isolated source LF readback PASS, manifest unchanged. Actual UI orders OWA-20261005-02/03 are SOLD, subtotals390.10/.30, totals440.10/60.30, subsidies10.02 each; three native profits280.03000000000003/−9.969999999999999/.15000000000000002 retain exact original formulas. Four original-ID replays PASS with no new effects. Final XLSX1345964bytes and PNG99396bytes; verifier preserves all old cells/events and Pending08, adds2orders/3lines/3SALES/58events. Native correction: the XLSX export rounds cached numeric results; actual Apps Script getValues returns280.03000000000003 (same as V8) for390.10−100.05−10.02. The initial adapter repro is a cent-readback compatibility counterexample, NOT proof of a native v37 transaction failure. Native subtotal roundtrip of the old unrounded candidate was not tested. v38 is scoped cent-total/readback hardening; the original native-failure claim is withdrawn. Current-writer focused changed-diff review found no further blocker; exact active variant/effort is unavailable, so formal requested Astra/High sign-off remains OPEN. Production v31, numbered deployments, LAB and W2 unchanged.

Active candidate: `04 Design Tools/logs/W1-20261005-01/candidate/Code_v38.gs` + `WebApp_v38.gs`, shared `W1Orders.gs`/`Index.html`; previous full pair in `candidate/backup/v37/`, v37 stubs point to v38. Test source saved/readback only in exact isolated project; production file table remains v31. ONE next step: new REVIEW-ASTRA-HIGH.md, no fixtures or sale to rerun.


## Session44 - W1 CLOSED local/test; final focused review PASS

Session44 (2026-10-05 +07): final focused review PASS; W1 CLOSED for local candidate / isolated test. Exact W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42. No reproducible blocker in money, stock, owner access, append-only journal or original-ID recovery. Fresh read-only verification passed four candidate hashes, six test-source readbacks, manifest, paired version-only diff, unchanged Index, syntax and recorded acceptance evidence. Source/runtime/data unchanged; prior Google evidence is dated 2026-10-05, not a new live claim. Review: `04 Design Tools/logs/W1-20261005-02/REVIEW.md`; checks: `04 Design Tools/logs/W1-20261005-02/verification.json`. No W1 work remains; await separate owner instruction for W2. W3 release remains separate.

Candidate pair remains package01 Code_v38.gs / WebApp_v38.gs with W1Orders.gs and Index.html; production file table remains v31. Recovery: package01 UNDO.md. No source change or new rule was required. Earlier OPEN-review notes are historical.

## Session45 — active candidate v39; W2 print gate OPEN

จัดทำ: 2026-10-06T00:30:33+07:00. Candidate folder `04 Design Tools/logs/W2-20261005-01/candidate/`; exact `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`. Production file table at the top remains v31; no /exec deployment or shop/LAB source was changed. Frozen W1 package/review remains acceptance history. The v38 candidate full source is backed up here and old v38 pair stubs point to v39.

| Candidate files (nine total) | Purpose |
|---|---|
| Code_v39.gs + WebApp_v39.gs | Paired candidate backend/API/menu; prior v38 under candidate/backup/v38 |
| W1Orders.gs + W2Clients.gs | Existing order journal/guard plus CLIENT/snapshot/recovery |
| Index.html | Existing back-office with Customer & Label/Orders controls |
| LabelRenderer.html | Canonical renderer, synchronized into existing standalone Label Tool |
| W2LabelUI.html + W2Suggest.html | Shared buyer/recipient form and stable-ID autocomplete |
| LabelDialog.html | Existing Sheets menu selected-order/multiple-order dialog |

Twelve complete isolated saved sources match staged bytes; W1Qa and appsscript manifest unchanged. `W2Qa.gs` and QA additions in test-runtime/Index are isolated-only helpers, excluded from the nine-file candidate and any release. No real CLIENT migration. Local/retry/native preview/original-ID replay PASS; PDF/physical Print/Reprint remains OPEN. Source/evidence/result/recovery/one next step are in the package's result.md, UNDO.md and CONTINUE.md; never install QA helpers or use earlier source attempts as a release. The existing standalone `04 Design Tools/OWARIN — LABEL TOOL.html` now shares the canonical renderer; its original backup is retained.

## Session46 — W2 print environment checkpoint

จัดทำ: 2026-10-06T00:53:52.2194733+07:00. Runtime W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51 unchanged; no source/data/service mutation. Native Windows inventory available, but Chrome capture stopped on uncertain URL; explicit new isolated Chrome tab attempt returned Browser is not available: chrome. No PDF/physical output verified. W2 gate OPEN; one next step and diagnostic CSV in 04 Design Tools/logs/W2-20261006-01/CONTINUE.md / implementation.md. Owner requested self-testing; missing browser/printer access is not an approval or model issue. Prior Session45 acceptance evidence remains dated and preserved.

## Session47 — owner defers untested PDF / physical print

จัดทำ: 2026-10-06T01:02:10+07:00. Owner chose to skip the PDF/physical Print-Reprint test for now and explicitly record it as **DEFERRED — ยังไม่ได้ทดสอบ (not PASS)**. Existing W2 implementation/retry/preview evidence remains valid at `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`; this does not finish print acceptance or authorize production. Independent local/test release preparation, migration dry-run and E2E may proceed. Actual paper size/page breaks, Thai font/clipping, driver/scaling and physical output remain unverified. Detail/next bounded task: `04 Design Tools/logs/W2-DEFER-20261006-01/READINESS.md`. No source/data/service/deployment/LAB change; no new model or test execution claimed.

## Session48 — local migration / non-print readiness

จัดทำ: 2026-10-06T01:43:47+07:00. Local synthetic legacy CLIENT migration and combined SHOP/SHOPEE backend flow PASS13groups at unchanged `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`. A:F values/formulas, blank rows, equal-name distinct IDs, numeric legacy values, stable original IDs/revisions, owner/test-ID/schema guards and failure/retry preserved; migrated-client selection/default order-only and recipient snapshots never add a second sale. Syntax PASS. Fresh isolated Google regression: seven DONE original confirm/CLIENT/label replays PASS with identical native proof and complete before/after XLSX values/formulas. Nine candidate hashes/twelve recorded source readbacks unchanged; no fresh source upload/readback claimed. Test installation/recovery packet: `04 Design Tools/logs/W3-20261006-01/TEST-RUNBOOK.md`; results/verification/CSV in that package.

Fresh export reconciles a prior-session `labels.save` request `w1-1791222331322-mxgbvwmbbv` (2026-10-06 00:45:53–59 +07): order05 revision3→4, +5 append-only events, identical recipient/client/other order fields and all seven other sheets. Current W2 proof SALES2/CLIENT2/journal1300 rows; prior Session46/47 statements of no service mutation were incomplete historical reports, not the current baseline. No sale/stock/client change or repair was needed; actor provenance is not inferred. Complete evidence `fresh-export-delta.json` and `verification.json`.

PDF/physical Print-Reprint remains **DEFERRED — ยังไม่ได้ทดสอบ (not PASS)**. Native six-column migration and a fresh complete two-channel Google UI flow remain untested; local VM and DONE replay do not close them. Production/numbered deployments/real CLIENT migration/P0/P1/LAB excluded. Next ONE: Fresh isolated two-channel UI E2E using newly scoped synthetic fixtures and original-ID recovery; export first, never rerun old Prepare/Repair. Native six-column migration fixture remains a separate untested gate.

## Session49 — fresh two-channel UI and native migration PASS

จัดทำ: 2026-10-06T02:21:33+07:00 · `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51` unchanged · one writer · exact isolated Google test only.

Fresh UI E2E PASS: SHOP Inventory→Cart→Pending→Confirm sold with existing CLIENT explicit selection/default order-only and different recipient; SHOPEE Inventory→Cart→Confirm sold/Label later→Complete label with new CLIENT and different recipient. Both Saved/100×150mm Preview/CAUTION observed. Orders `OWA-20261006-01` and `OWA-20261006-02`: SALES +2 only (SHOP390.10/subsidy10/profit280.10; SHOPEE entered500→ledger300/profit200), CLIENT +1 only with literal formula-like private fields/leading zeros; old prefixes preserved. Inventory changed only MAG W2V39-2 and W1V33CHECK-0 permitted stock/price/date/UID cells. Five original UI requests are DONE and replayed without any workbook values/formulas change.

Native six-column migration PASS on new `W3 LEGACY CLIENT` / `W3 MIGRATION REQUESTS` tabs, reusing actual v39 helper through an execution-local QA adapter that preserves actual Sheet ID/owner/lock; existing original CLIENT8cols and original schema journal untouched. A:F values/formulas/numeric legacy values/leading zeros and blank row preserved; equal-name rows get distinct IDs. Injected after-effect failure→NEEDS_REVIEW attempt1; same allocated IDs/revision retry→DONE attempt2; DONE replay changes no sheet values/formulas. Original nine tabs unchanged throughout migration. QA source/adapter check PASS8; fresh saved13-file readback verifies original12files unchanged plus exact QA-only W3Qa.gs; candidate9hashes unchanged. Main journal now 1364 data rows, +59 UI events/+5 fixture initialization events; separate migration journal 9 events.

Evidence: `04 Design Tools/logs/W3-20261006-02/` result/verification/source-verification/native JSON/five fresh XLSX/UI PNG/changes.csv; Session48 and earlier evidence retained. PDF/physical Print-Reprint remains **DEFERRED — ยังไม่ได้ทดสอบ, NOT PASS**. Production/numbered deploy/real CLIENT migration/P0/P1/LAB excluded. Next ONE: Local/test gates are complete except owner-deferred PDF/physical Print-Reprint. Preserve the deferral; do not begin production/real CLIENT migration. When print work is resumed, use the existing saved orders and verify print/reprint without SALES/stock/client writes.

## Session50 — owner confirms Print/Reprint PASS; local/test CLOSED

จัดทำ: 2026-10-06T02:36:16+07:00 · Stream B §§2/5/9 · one writer · `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`.

Owner replied **“ผ่านหมดแล้ว”** to the Print/PDF/physical Print-Reprint checklist, including correct saved recipient/leading zeros, private fields/prices excluded, 100×150mm/page/content/CAUTION layout, identical reprint and no new SALES/stock/client change. Record **PASS — owner-confirmed**, replacing the active print deferral and closing W2/W3 acceptance in the authorized local/test scope. This is a human-reported outcome, not a new agent-observed native print/PDF run. No PDF/photo/printer settings or exact execution time were supplied; no artifact inspection, fresh Google read/export or current data counts are claimed.

Earlier Session45/46 print-control limitation and Session47–49 DEFERRED evidence remain dated history. Session49 actual UI/native migration/retry/export/source readback evidence remains unchanged. Nine local candidate hashes freshly match the exact revision; no runtime pair/source/manifest/deployment/Google data/permission changes, and no new agents/chats. Production/real CLIENT migration/numbered deployment/P0/P1/LAB remains excluded. Evidence: `04 Design Tools/logs/W2-PRINT-20261006-01/owner-confirmation.json`, result/implementation/CONTINUE/changes.csv. Next ONE: No remaining work in the authorized local/test scope. Production release and real CLIENT migration are separate and await explicit scoped authorization; do not deploy automatically.


## Session51 — current production v41 / Version5

Exact `W3-PROD-20261006-01/v41@B4B1FBF8F3A1986E3FD1B3EC8C756E6FDE2709908134F07A5BA80D2798315B90`; paired root/local sources match saved native release. All prior Session36–50 claims above are dated history. Native backup owner-only; original URL/access/auxiliaries retained. Source/migration/replay/impact/UI PASS and private undo in `../../04 Design Tools/logs/W3-PROD-20261006-01/`. Next ONE: สังเกตออเดอร์จริงแรกตามการใช้งานของเจ้าของ; ไม่สร้างธุรกรรมจำลองในร้านจริงและไม่เริ่ม P0/P1 ใหม่.

## Session52 — required Cart subsidy

Create order requires an explicit `Shipping Subsidy — shop contribution`: enter `0` when the shop contributes nothing, otherwise the actual contribution. Blank is rejected before `orders.create`; Customer Shipping remains separate. No source/deploy/data change. Evidence `../../04 Design Tools/logs/W1-CART-20261006-01/result.md`.

## Session53 — current production v42 / Version6

Shipping Subsidy defaults0 in Cart and single sold form; Clear/success/new sold form reset0 and edited values survive rerender/channel change. Strict blank/invalid rejection and pending/retry payload preserved. Three native saved-source hashes and root10revision hashes PASS; seven helpers retained. Previous full41pair `backup/pre-v42-20261006/`;41root stubs point42. Six root regressions + targeted UI/W2 checks PASS; native UI proof/default/custom/clear and backup/undo in `../../04 Design Tools/logs/W1-SUBSIDY0-20261006-01/`. Historical41release/table-migration evidence remains dated; no schema/data transaction performed.

## Session54 — v43 DNA/UX (repo candidate; live = v42 / Version6 until owner deploys Version 7)

UI only, server unchanged. W2LabelUI colours use `var(--token,#fallback)` (LabelDialog has no tokens); phone nav fade + active tab scrolled into view, header no-wrap, touch targets ≥36 px (inputs 40), FAB hides while scrolling, toast hides on tab change/modal open; money errors name and outline the bad field (`markBad`). Accept/reject set identical to v42 (`dna-ux.test.cjs`). Packet `04 Design Tools/logs/WEBAPP-DNA-UX-20261007-01/`; backup `backup/pre-v43-20261007/`; paste order in `00 Docs/PLAN_2026-10-07_webapp-dna-ux.md` §8.
