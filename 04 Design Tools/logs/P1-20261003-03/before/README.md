# OWARIN STORE — Web App / Tools

โฟลเดอร์นี้เก็บ **โค้ดจริงที่ใช้งานอยู่** และคู่มือที่ยังใช้อ้างอิง
ของเก่าที่เลิกใช้แล้วอยู่ใน `_archive/`

---

## ไฟล์โค้ด (ตัวจริง — ต้องอัปขึ้น Apps Script)

**อัปเดต 2026-09-18:** `Code.gs` / `WebApp.gs` (ไม่มีต่อท้าย v20) เป็นโค้ดเก่าที่หลุดคู่กัน
(`WebApp.gs` เขียนไว้ว่า "คู่กับ Code.gs v17" แต่ `Code.gs` เองอ้างว่าเป็น v19 — ไปคนละทาง
และไม่มี `doGet()`/`api()` ของตัวเอง ใช้เป็นเว็บแอปไม่ได้) กับสอบเทียบลำดับคอลัมน์ในชีตจริงแล้ว
ไม่ตรงด้วย → **ย้ายเข้า archive แล้ว ห้ามอัปขึ้น Apps Script อีก** ไฟล์ตัวจริงคือ `Code_v30.gs` + `WebApp_v28.gs` (ณ 2026-10-02; v30 พร้อม deploy รอ owner วางใน Apps Script — จนกว่าจะวาง ตัวที่รันอยู่คือ v29 ใน `backup/`)
(v20–v29 ถูกแทนที่แล้วเช่นกัน — ดูกฎเวอร์ชันด้านล่าง)

| ไฟล์ | คืออะไร | อัปไปที่ไหน |
|---|---|---|
| `Code_v30.gs` | ตรรกะหลัก (v30 = v29 + เล่มซ้ำที่เหมือนกัน (ชื่อ+Publisher+Original+Condition+Copy Flags) ลงฟีดแถวเดียว quantity = จำนวนเล่ม + ชื่อตัวพิมพ์ใหญ่ล้วนส่งออกเป็น Capitalised + บันทึก D6 · v29 = v28 + ชื่อสินค้าที่ส่ง Meta ไม่มี (RESTOCK-NN) อีก: ขั้น v20b เขียนชื่อที่ตัดแล้ว + ตัด RESTOCK จาก FB Title ทุกค่าตอน export · v28 = v27 + รีเฟรช Meta feed อัตโนมัติทุกคืน: `refreshMetaFeedAuto`, ด่านกันยอดตก <80%, แท็บ REFRESH LOG, อีเมลแจ้งเตือน, `installMetaRefreshTrigger` · v27 = v26 + P1: PID CHANGES ledger + follow/archive แถวกำพร้าใน FB CATALOGUE, F2: Description ว่างเติมจาก caption template, F4: image index อ่านสดจาก R2 meta/images.csv, เมนู 🚀 Refresh Meta feed + health check): ราคา SP-2, SKU, เมนู Inventory Tools, เครื่องมือ Facebook | Apps Script → `Code.gs` |
| `WebApp_v28.gs` | API ของเว็บแอป (inventory / cart / sales / booking / contents) — คอมเมนต์หัวไฟล์เขียนไว้ชัดว่า "pairs with Code.gs v30" | Apps Script → `webapp.gs` |
| `R2Upload.gs` | คำสั่ง `R2 Images`: snapshot แถว Instock ลง `R2 JOBS` และเปิดดู `IMAGE UPLOADS` — ⚠️ ห้ามประกาศ helper ชื่อซ้ำกับ Code.gs (`_resolveColumns`/`_val`/`_tryWrite`/`_sp2ResetWriteErrors`/`_withLock`) เพราะไฟล์นี้โหลดทีหลังและจะทับทั้งโปรเจกต์ (เหตุการณ์ 2026-09-23) · ตัวใน Apps Script ตอนนี้ = v3 เดิม + rename helper เป็น `_r2*_` (ยังไม่ใช่ไฟล์ v4 ในโฟลเดอร์นี้) | Apps Script → เพิ่มไฟล์ `R2Upload.gs` |
| `Index.html` | หน้าเว็บแอปทั้งหมด (SPA) — ไฟล์เดียว ใช้ร่วมกับทุกเวอร์ชันของ Code.gs ไม่มีเวอร์ชันแยก | Apps Script → `Index.html` |
| `Index.test.js` | Smoke test ของ ALL SHEETS + ค่าเริ่มต้น Add Item (`node Index.test.js`) | รันบนเครื่องเท่านั้น |
| `image-url.test.js` | Test `_r2ImageIndex()`/`_imageUrl()`/`_looksLikeSheetError()` ใน `Code_v30.gs` (`node image-url.test.js`) | รันบนเครื่องเท่านั้น |
| `fb-catalogue.test.js` | โหลด `Code_v30.gs` แล้วตามด้วย `R2Upload.gs` ในบริบทเดียว (เหมือน Apps Script) → รัน Rebuild descriptions / Build FB CATALOGUE / Build META EXPORT กับข้อมูลจำลอง · จับได้ถ้าไฟล์อื่นทับ helper ของ Code.gs (`node fb-catalogue.test.js`) | รันบนเครื่องเท่านั้น |
| `meta-pipeline.test.js` | Test v27 + v28 + v29 + v30 (รวมเล่มซ้ำ/ชื่อตัวพิมพ์ใหญ่) (รีเฟรชอัตโนมัติ: ไม่มี popup, ด่านกัน, REFRESH LOG, อีเมล, trigger): PID CHANGES ledger + chain resolution, `refreshMetaFeed()` end-to-end (rename-in-place / archive orphan / safety-stop), live-index fallback, `_recalcRow` ledger logging (`node meta-pipeline.test.js`) | รันบนเครื่องเท่านั้น |
| `prepare_r2_upload.py` | เตรียมรูปสำหรับอัป Cloudflare R2 | รันบนเครื่อง (วางที่โฟลเดอร์ OWARIN STORE) |

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
| `owarin-webapp-plan_v4.1-EN.md` | แผนหลัก P1–P6 (ฉบับที่ใช้จริง) |
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
