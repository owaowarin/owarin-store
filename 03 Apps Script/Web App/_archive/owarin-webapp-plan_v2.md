# แผนพัฒนา OWARIN STORE Web App — v2 (Full Back-Office + Cart)

> ปรับจาก v1 หลังตรวจ **ชีตจริง** (18 Jul 2026) — scope ขยายจาก "3 โมดูล" เป็น **full control ทุกชีตจาก web app เดียว** พร้อมระบบ **Add to Cart → Quotation/Invoice → Sold** เป็นแกนกลาง

---

## 0. สรุปสิ่งที่เปลี่ยนจาก v1

1. **Cart คือหัวใจ ไม่ใช่แค่ quotation** — cart หนึ่งใบจบได้ 3 ทาง: Copy Quotation / Copy Invoice / Confirm Sold (เขียน SALES + เปลี่ยน Status + Sold Date อัตโนมัติ) → SALES เลิก manual ตั้งแต่วันแรกที่ cart ใช้งานได้
2. **BOOKING ออกแบบใหม่ทั้งข้อ 9** — ชีตจริงคือ *คิวรอของ (waitlist)*: `Booking Name | Game Title | Queue` ไม่ใช่ pre-order มัดจำแบบที่ v1 เดา → โมดูลใหม่ = queue matching ตอนของเข้า
3. **CONTENTS ไม่ต้องออกแบบ schema ใหม่** — มี template จริงครบแล้ว 6 ชุด (Invoice / Quotation / NEW ARRIVAL / Instock Notification / Biding / KK) แค่แปลงเป็น placeholder
4. **กฎค่าส่งเป็นสูตรได้** — จาก template จริง: เริ่ม 50, +10/เล่มถัดไป, เพดาน 100 → cart คำนวณอัตโนมัติ (override ได้)
5. **พบจุดตายของโค้ดเดิมเมื่อรันเป็น web app** — active-sheet dependency + SKU race condition (ดู §4) ต้องแก้ก่อนทุกอย่าง
6. ตัดสินใจเรื่องค้างจาก v1 §7: **Sold Date เพิ่มเลยใน Phase 2** ไม่รอ
7. เพิ่มมิติ **Owner (ของฝากขาย เช่น KK)** ที่ v1 ไม่ได้พูดถึง — มีผลต่อการขาย/แบ่งยอด
8. วางชั้น API ให้ **ย้ายขึ้นเว็บจริง (Supabase — stack เดียวกับ storefront เดิม)** ได้โดยไม่รื้อหน้า

---

## 1. เป้าหมาย v2

- Web app แยก URL (Apps Script `doGet`) ใช้งานได้ **ทุกอย่างของร้านโดยไม่ต้องเปิด Google Sheet**: เพิ่ม/แก้/เปลี่ยนสถานะสินค้า, ทำ quotation/invoice, บันทึกยอดขาย, ดู dashboard, จัดการคิวจอง, จัดการ template
- **Mobile-first** — งานขายเกิดบน FB มือถือเป็นหลัก
- Sheets ยังเป็น database of record; ฝั่งหน้าเว็บคุยผ่าน **API contract เดียว** เพื่อให้อนาคต swap backend เป็น Supabase ได้

## 2. ข้อมูลจริงจากชีต (ตรวจแล้ว) — ต่างจากที่ v1 สมมติ

| Sheet | Header จริง | ประเด็น |
|---|---|---|
| SALES | `Order \| Product \| Order date \| Cost \| Price \| Shiping Cost \| Net Profit \| Note` | มีข้อมูลจริงแค่ 1 แถว (ชื่อเล่มอยู่ช่อง Order, Product ว่าง) · **Net Profit = Price − Cost − Shipping** (ยืนยันจากแถวจริง 200−13−46=141) · header สะกด "Shiping" → map รับทั้งสองแบบ |
| GAME GUIDE BOOKS | ตาม HEADER_MAP เดิมครบ + มีคอลัมน์ **Owner** ใช้จริง (ค่า "KK") + คอลัมน์เปล่า Column 14–30 ท้ายตาราง | Status จริงที่ใช้: Instock / Auction / Sold · header-driven รอดอยู่แล้ว |
| MAGAZINE | เหมือน GGB แต่ไม่มี Platform / Genre / Owner | ตรงตามที่โค้ดรองรับ |
| BOOKING | `Booking Name \| Game Title \| Queue` (Q1/Q2/Q3) | **waitlist ไม่ใช่ pre-order** · มี SKU หลงคอลัมน์ท้าย 2 แถว (ข้อมูลขยะ ลบได้) |
| CONTENTS | `Title \| Contents \| Contents 2` | template จริง 6 ชุด: Invoice, Quotation, NEW ARRIVAL, Instock Notification, Biding, KK — โครงข้อความนิ่งแล้ว |

## 3. สถาปัตยกรรม

### 3.1 โครงไฟล์ (โปรเจกต์ Apps Script เดิม — ไม่ทับ Code.gs)
```
Code.gs        ← v14/v15 เดิม (แก้เฉพาะจุดใน §4)
WebApp.gs      ← doGet(e) + api(action, payload) dispatcher + ฟังก์ชัน server ใหม่ทั้งหมด
Index.html     ← SPA shell (hash routing: #inventory #cart #sales #booking #contents #tools)
Css.html / Js.html ← partials ผ่าน include() (หรือรวมไฟล์เดียวก็ได้ ถ้าอยากคง single-file)
Sidebar.html   ← เดิม ใช้ต่อได้ ไม่แตะ
```

### 3.2 API contract (จุดที่ทำให้ย้าย backend ได้ในอนาคต)
- ฝั่ง client เรียก **จุดเดียว**: `google.script.run.api(action, payload)` → return JSON `{ ok, data | error }`
- ห้ามหน้าเว็บเรียกฟังก์ชันชีตตรง ๆ → วันที่ย้ายไป Supabase แค่เปลี่ยน `api()` เป็น `fetch()` หน้าเว็บไม่ต้องแก้
- Action ชุดแรก: `inventory.list / inventory.add / inventory.update / inventory.markSold / sales.append / sales.monthly / booking.list / booking.match / booking.update / contents.list / contents.save / cart.checkout / tools.*`

### 3.3 Data layer
- Generalize `_resolveColumns(sheet, map)` — เพิ่ม `SALES_MAP`, `BOOKING_MAP`, `CONTENTS_MAP` แยกจาก `HEADER_MAP` (inventory)
- **LockService** ครอบทุก write (ดู §4.2)
- **CacheService**: inventory index (JSON ทั้งชีต, TTL 5 นาที) + bust ทุกครั้งหลัง write — หน้าเว็บโหลด index ครั้งเดียวแล้ว search/filter ฝั่ง client (เลี่ยง latency 1–2 วิ/call ของ `google.script.run`)

### 3.4 Deploy & security
- Deploy: Execute as **Me** · Access **Only myself** (คุมร้านคนเดียว — ถ้าให้ทีมใช้ค่อยเพิ่มอีเมลรายคน ไม่ใช้ anyone-with-link เพราะ = full control ร้านหลุดทั้งใบ)
- `/dev` URL ไว้ทดสอบ (เห็นโค้ดล่าสุดเสมอ), `/exec` ต้อง **New version** ทุกครั้งที่ปล่อยจริง — จุดพลาดคลาสสิก
- Cart เก็บ `localStorage` ฝั่ง client (refresh ไม่หาย) — เว็บ deploy เอง ใช้ได้ปกติ

## 4. จุดที่ต้องแก้ในโค้ด v14/v15 ก่อนเป็น web app (blocker)

1. **Active-sheet dependency** — `getTitleList()`, `getPublisherList()`, `addEntryFromSidebar()`, `_activeInventorySheet()` พึ่ง `getActiveSheet()` ซึ่ง **ไม่มีความหมายใน web app context** (ไม่มีชีตที่ "เปิดอยู่") → ทุกตัวต้องรับ `sheetName` เป็น parameter และ resolve ด้วย `getSheetByName()` (คง fallback เดิมให้ Sidebar ใช้ต่อได้)
2. **SKU race condition** — `_buildSKU` อ่าน max แล้วค่อยเขียน: เปิดเว็บบนมือถือ + คอมพร้อมกันแล้ว submit ใกล้กัน = เลขซ้ำ → ครอบ write ทั้งหมดด้วย `LockService.getScriptLock()` (ความเสี่ยงนี้แทบไม่มีตอนเป็น sidebar เครื่องเดียว แต่ web app ทำให้เกิดได้จริง)
3. **แตก `_recalcRow(sheet, row, changedKeys)`** — รวม pipeline autoformat → restock detect → SKU → suggested → derived formulas ให้ `onEdit` / `addEntry` / `updateEntry` (โมดูลแก้ไขใหม่) ใช้ตัวเดียวกัน — ตอนนี้ logic กระจายอยู่ใน onEdit กับ sidebar
4. **Sold Date** — เพิ่มคอลัมน์ใน GGB+MAGAZINE (header-driven ปลอดภัย), เพิ่ม `"sold date"` ใน HEADER_MAP, auto-fill 2 ทาง: จาก web (`markSold`) และจาก `onEdit` เมื่อพิมพ์ Status→Sold ในชีตตรง
5. Cache bust หลัง write + `SpreadsheetApp.flush()` ก่อนคืนค่า

## 5. โมดูล (full control map)

### A — Inventory (GGB / MAGAZINE)
- ตารางรวม + search-as-you-type + filter: Status / Publisher / Platform / Condition / **Owner**
- เพิ่มสินค้า (logic `addEntryFromSidebar` เดิม + autosuggest ชื่อ/publisher จาก index ฝั่ง client — เร็วกว่าเรียก server ทุก keystroke)
- **แก้ไขแถว** (Module 1.5 เดิม — ยังคง priority งานหน้าร้าน): แก้ชื่อ/สภาพ/ราคา/สถานะ → `_recalcRow` จัดการ SKU/suggested/derived ให้ครบ
- Quick action ต่อแถว: `🛒 Add to cart` (Instock; Auction กดได้แต่ขึ้นเตือน) / `✓ Mark Sold` (กรณีขายเดี่ยวไม่ผ่าน cart)
- Multi-select → **สร้างโพสต์ NEW ARRIVAL** จาก template (ของแถมที่ได้ฟรีจากโครงเดียวกับ quotation)
- ปุ่ม Tools ยกจากเมนู onOpen: validate SKU / regenerate / natural sort / fill derived / publisher check

### B — Cart & Quotation (ฟีเจอร์ใหม่หลักตามที่ขอ)
- Cart drawer ลอยทุกหน้า: รายการ (ชื่อ base + condition + SKU), **แก้ราคาต่อชิ้นได้** (ดีลต่อรอง), ลบ/ล้าง
- **ค่าส่งอัตโนมัติ** ✅ ยืนยันแล้ว: `50 + 10×(n−1)` เพดาน 100 — แก้มือได้ (เคสกล่องใหญ่ เช่น 80.- แบบใน template จริง)
- Subtotal / Shipping / **Total** live
- 3 ปุ่มจบงาน (ชื่อเรียกตามที่ใช้จริง — ยืนยันแล้ว):
  1. **📋 แจ้งราคา** — "ขออนุญาตแจ้งราคานะคะ": รายการ `ชื่อ — ราคา` + บล็อกเงื่อนไขค่าส่ง 📦 + 🚫 ไม่เก็บปลายทาง + ลายเซ็น (สเปกเต็ม §E)
  2. **📋 Quotation (สรุปยอด)** — "ขออนุญาตสรุปยอดค่าหนังสือนะคะ": รายการ + เลขบัญชี/ธนาคาร + `ยอด {{total}} (รวมค่าจัดส่งไปรษณีย์ไทย {{shipping}}.- แล้ว)` (สเปกเต็ม §E)
  3. **✅ Confirm Sold** — ทำ 3 อย่างใน transaction เดียว: (a) เขียน SALES ต่อเล่ม (b) Status→Sold + Sold Date ใน GGB/MAG (c) bust cache — **server ตรวจ Status ล่าสุดก่อนเขียน กันขายซ้ำ** ถ้ามีเล่มไหน Sold ไปแล้วให้ reject ทั้ง cart พร้อมบอกเล่มที่ชน
- กติกาเขียน SALES (รอ confirm §8): `Order` = รหัสออเดอร์กลุ่ม (เช่น `OD-260718-01`), `Product` = ชื่อเล่ม, `Note` = SKU, ค่าส่งลงเต็มที่แถวแรกของออเดอร์ (แถวอื่น 0) → ยอดรวม/กำไรรวมต่อออเดอร์ตรง และตรงกับพฤติกรรมแถวจริงที่มีอยู่

### C — SALES Dashboard
- Group by เดือน (Order date): Cost / Price / Shipping / Net Profit + จำนวนออเดอร์/เล่ม — ตาราง + กราฟแท่ง
- แถวจาก cart เข้าอัตโนมัติ + เพิ่ม/แก้ manual ได้ (ขายช่องทางอื่น)

### D — BOOKING (คิวรอของ — redesign)
- หัวใจ: **ตอน add สินค้าใหม่/restock → auto-match `Game Title` กับชื่อที่เพิ่ม** → แจ้ง "มีคิวรอ N คน: Q1 ชื่อ…, Q2 ชื่อ…" + ปุ่ม gen ข้อความจาก template "Instock Notification" ต่อคนได้ทันที
- จัดการคิว: เพิ่ม/ลบ/เลื่อนคิว/ค้นหา
- เพิ่มคอลัมน์ (header-driven ไม่กระทบเดิม): `Status` (Waiting/Notified/Purchased/Cancelled), `Date Added`, `Note` — จบดีลแล้วเปลี่ยนเป็น Purchased ผูกกับ cart ได้ในเฟสถัดไป
- เก็บกวาด: ลบ SKU หลงคอลัมน์ท้าย 2 แถว

### E — CONTENTS (คลัง template)
- CRUD + ค้นหา + copy ตรง ๆ
- **แปลง template เป็น placeholder ครั้งเดียว (ตอนเริ่ม P3)** — โครงข้อความ/อีโมจิ/ลายเซ็น (ㅅ´ ˘ `) คงเดิมทุกตัวอักษร · ตัวแปร: `{{items}}` `{{shipping}}` `{{total}}` `{{bank_no}}` `{{bank_name}}` `{{account_name}}` `{{date}}`

**สเปก 2 template หลัก (ยืนยันแล้ว):**

① **แจ้งราคา** — แจ้งหนังสือเข้า + ราคา (ชีตปัจจุบันใช้ Title ว่า "Quotation"):
```
ขออนุญาตแจ้งราคานะคะ
.
{{items}}
:
📦 ค่าส่งเริ่มต้น : 50.- 「เล่มต่อไปเพิ่มเล่มละ 10 บาท | สูงสุดไม่เกิน 100 บาท」
🚫 ไม่มีบริการเก็บเงินปลายทางนะคะ
—————
ขอบคุณค่าาาา (ㅅ´ ˘ `)
```

② **Quotation (สรุปยอด)** — ตอนลูกค้าตกลงซื้อ (ชีตปัจจุบันใช้ Title ว่า "Invoice"):
```
ขออนุญาตสรุปยอดค่าหนังสือนะคะ
.
{{items}}
:
{{bank_no}}
{{bank_name}} | {{account_name}}
ยอด {{total}} (รวมค่าจัดส่งไปรษณีย์ไทย {{shipping}}.- แล้ว)  —  บาทค่ะ
```

- `{{items}}` = บรรทัดละ `ชื่อเต็มตามชีต — Price` (คง RESTOCK tag เพื่อระบุเล่ม — ตามตัวอย่างจริงใน template เดิม) · ตัวเลขคั่นหลักพันด้วย comma (เช่น 2,010)
- `{{total}}` = subtotal + shipping ตามกฎ 50+10 cap 100 · เลขบัญชีดึงจาก CONTENTS/Settings ไม่ hardcode ในโค้ด
- ตอน P3 เปลี่ยนชื่อ Title ในชีตให้ตรงคำเรียกจริง: `Invoice` → `Quotation`, `Quotation` → `แจ้งราคา` (กันสับสนระยะยาว)
- Quotation composer (โมดูล B) ดึงจากที่นี่ — แก้ template ในชีต = ข้อความใหม่ทันทีไม่ต้องแก้โค้ด

### F — Tools / Settings
- ค่าคงที่แก้ได้: กติกาค่าส่ง (base/step/cap), ข้อมูลบัญชีโอน, prefix รหัสออเดอร์
- ปุ่ม bulk ทั้งหมดจาก §A + ลิงก์เปิดชีตตรง

## 6. Data flow หลัก

```
Inventory (Instock) ──add──▶ 🛒 Cart ──┬─▶ แจ้งราคา (copy → FB)
                                       ├─▶ Quotation/สรุปยอด (copy → FB, มียอด+บัญชี)
                                       └─▶ Confirm Sold
                                             ├─ SALES: แถวต่อเล่ม (Order id กลุ่มเดียว)
                                             ├─ GGB/MAG: Status=Sold + Sold Date
                                             └─ BOOKING: (เฟสถัดไป) ปิดคิวถ้าขายให้คนในคิว
เพิ่มสินค้า/Restock ──match──▶ BOOKING queue ──▶ Instock Notification (copy → FB)
```

ผลพลอยได้: Sold Date สะสมในระบบเอง → เปิดทางอัปเกรด Suggested Price แบบ "ใช้เฉพาะ sold ล่าสุด" (v1 §4 ข้อ 6) โดยไม่ต้องแก้สูตรตอนนี้

## 7. ลำดับพัฒนา

| Phase | เนื้อหา | เกณฑ์เสร็จ |
|---|---|---|
| **P1** | แก้ blocker §4 (sheetName param + Lock + `_recalcRow`) → `doGet` + SPA shell + `api()` + Inventory list/search/filter | เปิดเว็บบนมือถือ ค้นสินค้าเจอ < 1 วิหลังโหลด index |
| **P2** | Add + Edit row + Mark Sold เดี่ยว + คอลัมน์ Sold Date | งานหน้าร้านรายวันไม่ต้องเปิดชีตอีก |
| **P3** | **Cart** → Quotation / Invoice / Confirm Sold→SALES + booking match ตอน add | ปิดการขาย 1 ออเดอร์หลายเล่มจบใน web app; SALES ขึ้นเอง |
| **P4** | SALES dashboard รายเดือน | เห็นสรุปเดือน + กราฟจากข้อมูลที่ P3 พ่นเข้า |
| **P5** | BOOKING เต็มรูป + CONTENTS CRUD | จัดการคิว/template ครบจากเว็บ |
| **P6** | (อนาคต) sync/migrate → Supabase ด้วย API contract เดิม | หน้าเว็บเดิมคุย backend ใหม่ได้ |

ก่อนเริ่ม P3 ต้องปิด §8 ข้อ 1–2 ก่อน (กติกา SALES + placeholder)

## 8. ประเด็นรอ confirm (อัปเดตจาก v1 §7)

1. **SALES:** `Order` = รหัสกลุ่ม (`OD-YYMMDD-NN`), `Product` = ชื่อเล่ม, `Note` = SKU, ค่าส่งเต็มที่แถวแรก — โอเคตามนี้ไหม? (หรืออยากเพิ่มคอลัมน์ SKU แยก)
2. ~~รูปแบบ placeholder / template~~ → **ตัดสินใจแล้ว:** กฎค่าส่ง + template "แจ้งราคา" และ "Quotation (สรุปยอด)" ยืนยันครบ (สเปกเต็มใน §E) — template ที่เหลือ (NEW ARRIVAL / Instock Notification / Biding) ใช้ convention เดียวกัน ไม่ต้อง confirm เพิ่ม
3. **Owner=KK (ฝากขาย):** ตอน Confirm Sold ต้องบันทึกส่วนแบ่ง/ยอดคืนเจ้าของไหม หรือแค่ badge+filter พอ
4. โพสต์ **Biding (ประมูล)** จะเอาเข้า web app เฟสไหน — ตอนนี้ยังไม่ scope (Auction status มีแล้ว แค่ยังไม่มี flow)
5. ~~Sold Date~~ → ตัดสินใจแล้ว: ทำใน P2
6. ~~Suggested Price recency~~ → ตัดสินใจแล้ว: รอข้อมูล Sold Date สะสมก่อน ไม่แก้สูตรตอนนี้

## 9. ความเสี่ยง / ข้อจำกัดที่รู้ล่วงหน้า

- `google.script.run` latency ~1–2 วิ/call → ออกแบบให้โหลด index ครั้งเดียว, ทุก interaction เป็น client-side, write เท่านั้นที่แตะ server
- Execution limit 6 นาที/ครั้ง — ไม่มีงานไหนใกล้เพดาน
- แก้โค้ดแล้ว `/exec` ไม่เปลี่ยน จนกว่าจะ deploy New version (ใช้ `/dev` ระหว่างพัฒนา)
- URL `/exec` = กุญแจร้าน — access ตั้ง Only myself เท่านั้น
- ข้อมูลอ่อนไหว (เลขบัญชี) เก็บใน CONTENTS/Settings ตามเดิม ไม่ hardcode ในโค้ด
