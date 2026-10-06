# OWARIN STORE — Web App / Tools

โฟลเดอร์นี้เก็บ **โค้ดจริงที่ใช้งานอยู่** และคู่มือที่ยังใช้อ้างอิง
ของเก่าที่เลิกใช้แล้วอยู่ใน `_archive/`

---

## ไฟล์โค้ด (ตัวจริง — ต้องอัปขึ้น Apps Script)

**อัปเดต 2026-09-18:** `Code.gs` / `WebApp.gs` (ไม่มีต่อท้าย v20) เป็นโค้ดเก่าที่หลุดคู่กัน
(`WebApp.gs` เขียนไว้ว่า "คู่กับ Code.gs v17" แต่ `Code.gs` เองอ้างว่าเป็น v19 — ไปคนละทาง
และไม่มี `doGet()`/`api()` ของตัวเอง ใช้เป็นเว็บแอปไม่ได้) กับสอบเทียบลำดับคอลัมน์ในชีตจริงแล้ว
ไม่ตรงด้วย → **ย้ายเข้า archive แล้ว ห้ามอัปขึ้น Apps Script อีก** ไฟล์ตัวจริงคือ `Code_v31.gs` + `WebApp_v31.gs` (ติดตั้งและตรวจ source ร้าน 2026-10-03; deployment เดิม Version 4; คู่ v31/v31)
(v20–v30 ถูกแทนที่แล้วเช่นกัน — ดูกฎเวอร์ชันด้านล่าง)

| ไฟล์ | คืออะไร | อัปไปที่ไหน |
|---|---|---|
| `Code_v31.gs` | ตรรกะหลัก (v31 = v30 + durable Add journal, same-ID recovery, R1–R4 validation/readback · v30 = v29 + เล่มซ้ำที่เหมือนกัน (ชื่อ+Publisher+Original+Condition+Copy Flags) ลงฟีดแถวเดียว quantity = จำนวนเล่ม + ชื่อตัวพิมพ์ใหญ่ล้วนส่งออกเป็น Capitalised + บันทึก D6 · v29 = v28 + ชื่อสินค้าที่ส่ง Meta ไม่มี (RESTOCK-NN) อีก: ขั้น v20b เขียนชื่อที่ตัดแล้ว + ตัด RESTOCK จาก FB Title ทุกค่าตอน export · v28 = v27 + รีเฟรช Meta feed อัตโนมัติทุกคืน: `refreshMetaFeedAuto`, ด่านกันยอดตก <80%, แท็บ REFRESH LOG, อีเมลแจ้งเตือน, `installMetaRefreshTrigger` · v27 = v26 + P1: PID CHANGES ledger + follow/archive แถวกำพร้าใน FB CATALOGUE, F2: Description ว่างเติมจาก caption template, F4: image index อ่านสดจาก R2 meta/images.csv, เมนู 🚀 Refresh Meta feed + health check): ราคา SP-2, SKU, เมนู Inventory Tools, เครื่องมือ Facebook | Apps Script → `Code.gs` |
| `WebApp_v31.gs` | API ของเว็บแอป (inventory / cart / sales / booking / contents) — คอมเมนต์หัวไฟล์เขียนไว้ชัดว่า "pairs with Code.gs v31" | Apps Script → `webapp.gs` |
| `R2Upload.gs` | คำสั่ง `R2 Images`: snapshot แถว Instock ลง `R2 JOBS` และเปิดดู `IMAGE UPLOADS` — ⚠️ ห้ามประกาศ helper ชื่อซ้ำกับ Code.gs (`_resolveColumns`/`_val`/`_tryWrite`/`_sp2ResetWriteErrors`/`_withLock`) เพราะไฟล์นี้โหลดทีหลังและจะทับทั้งโปรเจกต์ (เหตุการณ์ 2026-09-23) · ตัวใน Apps Script ตอนนี้ = v3 เดิม + rename helper เป็น `_r2*_` (ยังไม่ใช่ไฟล์ v4 ในโฟลเดอร์นี้) | Apps Script → เพิ่มไฟล์ `R2Upload.gs` |
| `P1Journal.gs` | guarded ADD REQUESTS migration + read-only production readiness; no trigger installed | Apps Script → `P1Journal.gs` |
| `Index.html` | หน้าเว็บแอปทั้งหมด (SPA) — ไฟล์เดียว ใช้ร่วมกับทุกเวอร์ชันของ Code.gs ไม่มีเวอร์ชันแยก | Apps Script → `Index.html` |
| `Index.test.js` | Smoke test ของ ALL SHEETS + ค่าเริ่มต้น Add Item (`node Index.test.js`) | รันบนเครื่องเท่านั้น |
| `image-url.test.js` | Test `_r2ImageIndex()`/`_imageUrl()`/`_looksLikeSheetError()` ใน `Code_v31.gs` (`node image-url.test.js`) | รันบนเครื่องเท่านั้น |
| `fb-catalogue.test.js` | โหลด `Code_v31.gs` แล้วตามด้วย `R2Upload.gs` ในบริบทเดียว (เหมือน Apps Script) → รัน Rebuild descriptions / Build FB CATALOGUE / Build META EXPORT กับข้อมูลจำลอง · จับได้ถ้าไฟล์อื่นทับ helper ของ Code.gs (`node fb-catalogue.test.js`) | รันบนเครื่องเท่านั้น |
| `meta-pipeline.test.js` | Test v27 + v28 + v29 + v30 (รวมเล่มซ้ำ/ชื่อตัวพิมพ์ใหญ่) (รีเฟรชอัตโนมัติ: ไม่มี popup, ด่านกัน, REFRESH LOG, อีเมล, trigger): PID CHANGES ledger + chain resolution, `refreshMetaFeed()` end-to-end (rename-in-place / archive orphan / safety-stop), live-index fallback, `_recalcRow` ledger logging (`node meta-pipeline.test.js`) | รันบนเครื่องเท่านั้น |
| `prepare_r2_upload.py` | เตรียมรูปสำหรับอัป Cloudflare R2 | รันบนเครื่อง (วางที่โฟลเดอร์ OWARIN STORE) |

P1 Add v31 พร้อมใช้: headers 17 ช่องใน ADD REQUESTS ติดตั้งแล้ว; source ทั้ง4ไฟล์อ่านกลับหลัง Save/reloadตรง SHA256; deployment Version4 URLเดิม access Only myself. ทดสอบ normal/failure/retry ในโปรเจกต์แยกและ regression PASS; ร้านผ่าน readiness + เปิด Add modal New Arrival โดยไม่เพิ่มสินค้าปลอม. `node p1-add.test.cjs` / `node p1-ui.test.cjs` โหลด source คู่ v31 ในโฟลเดอร์นี้. Backup, undo และ exact hashes: `../../04 Design Tools/logs/P1-20261003-03/`.

หาก Save ไม่แน่ชัด ให้ใช้ Request ID เดิมและ `Check / retry request`; ERROR ต้อง reconcile journal↔inventory ก่อนแก้. IDหาย/new deviceใช้ manual recovery ห้ามเพิ่มซ้ำด้วย IDใหม่. Orders/reservation/Label ยังไม่ติดตั้ง: แผนปัจจุบันแบ่ง W1 Cart/Orders/จอง/ขาย → W2 CLIENT/Label → W3 acceptance/release; ดู [แผนและ priority](../../00%20Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) และ [คู่มือ/ข้อจำกัด](../../00%20Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md). ข้อมูลติดตั้งในย่อหน้านี้อ้าง Session34 ไม่ใช่ live read ใหม่ใน Session35.

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

**ขายของ** → เว็บแอป: ใส่ตะกร้า → Confirm Sold (ได้ข้อความสรุปยอด + ลง SALES อัตโนมัติ)
หรือกด Mark Sold ทีละเล่ม (ลง SALES เหมือนกัน)

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
