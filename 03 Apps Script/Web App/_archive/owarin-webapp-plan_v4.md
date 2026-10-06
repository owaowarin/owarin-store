# แผนพัฒนา OWARIN STORE Web App — v4 (ฉบับปฏิบัติการ)

> **การตัดสินใจล่าสุด:** เว็บหน้าร้าน OWARIN เดิม **hold** · ตอนนี้โฟกัส **Google Sheets + Apps Script web app** เท่านั้น · src ที่ส่งมา = **คลัง pattern** สำหรับส่วนที่ Google Sheets ไม่ครอบคลุม · ปลายทาง = **เว็บใหม่ทั้งตัว** สร้างจากข้อมูลชุดนี้ในอนาคต
>
> **สถานะเอกสาร:** v4 = ฉบับเดียวที่ใช้ทำงาน · v2 (Apps Script) = ถูกรวมเข้ามาแล้ว · v3 (Supabase) = พับเก็บ — สินทรัพย์จาก v3 ไม่ทิ้ง ดู §8

---

## 0. อะไรเปลี่ยนจากเดิม

1. กลับมาใช้สถาปัตยกรรม Apps Script ตาม v2 เต็มรูป — Sheets เป็น database หลักระบบเดียว ไม่มี Supabase ในเฟสนี้
2. **v3 bundle:** ไฟล์ SQL **อย่ารัน** (ถ้ารันไปแล้ว → ไม่กระทบอะไร ดูวิธีจัดการ §8.3) · TS lib `src/lib/inventory` + golden test = เก็บเป็นสินทรัพย์สร้างเว็บใหม่ (ผ่าน smoke 34/34 แล้ว)
3. เพิ่ม §2: รายการ pattern ที่ยกจาก src มาใช้ใน web app — cart engine, order id, copy, bulk select, design tokens จริงจาก `index.css`
4. Order ID ใน SALES เปลี่ยนข้อเสนอจาก `OD-YYMMDD-NN` → **`OWA-YYYYMMDD-NN`** ตาม convention ที่ Checkout ของ src ใช้อยู่แล้ว — ข้อมูลจะต่อเนื่องถึงเว็บใหม่โดยไม่ต้องแปลง
5. ทุกการออกแบบยึดหลัก "ย้ายขึ้นเว็บใหม่ได้โดยไม่รื้อ" (§8.1)

## 1. สถาปัตยกรรม (ยืนยันตาม v2)

### 1.1 โครงไฟล์ (โปรเจกต์ Apps Script เดิม)
```
Code.gs        ← v14/v15 เดิม — แก้เฉพาะ blocker ใน §1.3
WebApp.gs      ← ใหม่: doGet(e) + api(action, payload) dispatcher + server functions
Index.html     ← ใหม่: SPA shell (hash routing: #inventory #cart #sales #booking #contents #tools)
Css.html / Js.html ← partials ผ่าน include()
Sidebar.html   ← เดิม ใช้ต่อได้ ไม่แตะ
```

### 1.2 กติกาหลัก
- Client เรียก server ผ่าน **จุดเดียว**: `google.script.run.api(action, payload)` → คืน JSON `{ok, data|error}` — วันสร้างเว็บใหม่แค่เปลี่ยน transport เป็น `fetch()` หน้าเว็บไม่ต้องแก้ logic
- โหลด **inventory index ครั้งเดียว** ตอนเปิดแอป (JSON ทั้งชีต) → search/filter/autosuggest ทำฝั่ง client ทั้งหมด (เลี่ยง latency 1–2 วิ/call) · CacheService TTL 5 นาที + bust หลัง write
- **LockService ครอบทุก write** (กัน SKU race เมื่อเปิดมือถือ+คอมพร้อมกัน)
- Deploy: Execute as Me · Access **Only myself** · ใช้ `/dev` ระหว่างพัฒนา, `/exec` ต้อง New version ทุกรอบปล่อยจริง
- Mobile-first + `addMetaTag('viewport', …)`

### 1.3 Blockers ใน Code.gs ที่ต้องแก้ก่อน (P1 งานแรก)
1. **Active-sheet dependency** — `getTitleList()` `getPublisherList()` `addEntryFromSidebar()` `_activeInventorySheet()` พึ่ง `getActiveSheet()` ซึ่งไม่มีความหมายใน web app → เพิ่ม param `sheetName` ทุกตัว (คง fallback เดิมให้ Sidebar ใช้ต่อ)
2. **LockService** — ครอบ `addEntryFromSidebar` และ write functions ใหม่ทั้งหมด
3. **แตก `_recalcRow(sheet, row, changedKeys)`** — รวม pipeline autoformat → restock → SKU → suggested → derived ให้ onEdit / add / update (โมดูลแก้ไข) ใช้ร่วมกัน
4. **Sold Date** — เพิ่มคอลัมน์ GGB+MAGAZINE, เพิ่ม `"sold date"` ใน HEADER_MAP, fill 2 ทาง: จาก web (`markSold`) และจาก onEdit เมื่อพิมพ์ Status→Sold ในชีตตรง
5. Cache bust + `SpreadsheetApp.flush()` ก่อน return

## 2. Pattern ที่ยกจาก src → web app (คำตอบว่า "src ปิดช่องว่างอะไรให้ชีตบ้าง")

| ช่องว่างของ Sheets | ต้นแบบใน src | วิธีใช้ใน Apps Script web app |
|---|---|---|
| Cart engine | `useCartStore` + `appConfig.calcShipping` | JS ฝั่ง client: state + `localStorage` key `owarin-qcart` (refresh ไม่หาย) + สูตรค่าส่งก้อนเดียวกัน `50+10×(n−1) cap 100` override ได้ |
| Order ID | `Checkout`: `OWA-YYYYMMDD-NN` | ใช้ format เดียวกันในคอลัมน์ Order ของ SALES |
| Copy ข้อความ | `ThankYou` / `copyAddress` (OrdersTab) | ปุ่ม copy แจ้งราคา/Quotation: `navigator.clipboard` + fallback `execCommand` (iOS Safari ใน iframe) |
| Bulk select | `ProductsTab` (checkbox + shift-range) | หน้า Inventory: multi-select → สร้างโพสต์ NEW ARRIVAL |
| ยกเลิกออเดอร์แล้วคืนสต็อก | `OrdersTab.deleteOrder` → คืน statusTag | ยกเลิก FB sale → คืน Status=Instock + ลบแถว SALES ของออเดอร์นั้น |
| สถานะออเดอร์ | `Pending / Paid / Shipped` | ใช้ชุดคำเดียวกันใน SALES (คอลัมน์ Note หรือสถานะ) — เว็บใหม่ import ตรง |
| คำอธิบายสภาพ | `GradingModal` + `settings.conditionGrades` | tooltip S/A/B/C/D ในฟอร์มเพิ่ม/แก้สินค้า |
| Design system | `index.css` (ดู §2.1) | Css.html ใช้ token ชุดเดียวกัน → web app หน้าตาแบรนด์เดียวกับเว็บใหม่ในอนาคต |

### 2.1 Design tokens จริงจาก `index.css` (ใส่ใน Css.html)
```css
:root {
  --bg: hsl(0 0% 5%);        --fg: hsl(0 0% 95%);
  --card: hsl(0 0% 8%);      --muted: hsl(0 0% 14%);  --muted-fg: hsl(0 0% 55%);
  --border: hsl(0 0% 18%);   --input: hsl(0 0% 15%);
  --gold: hsl(43 76% 52%);   --gold-muted: hsl(43 40% 35%);  --gold-bright: hsl(43 85% 60%);
  --destructive: hsl(0 62% 50%);
  --radius: 0;               /* zero border-radius ทั้งระบบ */
}
/* ฟอนต์: Outfit (UI, weight 300) + Cormorant Garamond (serif accent)
   scrollbar 2px thumb hsl(0 0% 20%) hover ทอง · hairline borders */
```

## 3. โมดูล A–F (ยืนยันตาม v2 §5 — สรุปย่อ)

**A — Inventory (GGB/MAGAZINE):** list + search-as-you-type + filter (Status/Publisher/Platform/Condition/**Owner**) · เพิ่มสินค้า (logic `addEntryFromSidebar` เดิม + autosuggest จาก index ฝั่ง client) · **แก้ไขแถว** ผ่าน `_recalcRow` · ต่อแถว: `🛒 ใส่ cart` (Instock; Auction เตือน) / `✓ Mark Sold` · bulk → NEW ARRIVAL · ปุ่ม tools จากเมนู onOpen ทั้งชุด

**B — Cart & Quotation:** cart drawer ทุกหน้า · แก้ราคาต่อชิ้น · ค่าส่งอัตโนมัติ+override · 3 ปุ่ม: **📋 แจ้งราคา** / **📋 Quotation (สรุปยอด)** / **✅ Confirm Sold** → เขียน SALES ต่อเล่ม + Status=Sold + Sold Date — server **ตรวจ Status ล่าสุดใน Lock ก่อนเขียน** ถ้ามีเล่มชนให้ reject ทั้ง cart พร้อมบอกเล่ม

**C — SALES Dashboard:** group รายเดือนจาก Order date: Cost/Price/Shipping/Net Profit + จำนวนออเดอร์/เล่ม · ตาราง+กราฟ · แถวจาก cart เข้าอัตโนมัติ + manual add/edit ได้

**D — BOOKING (คิวรอของ):** เพิ่มสินค้า/restock → match `Game Title` กับชื่อ → แจ้ง "มีคิวรอ N คน" + gen ข้อความ Instock Notification ต่อคน · จัดการคิว/เลื่อน/สถานะ (Waiting/Notified/Purchased/Cancelled — เพิ่มคอลัมน์ Status, Date Added, Note แบบ header-driven) · ลบ SKU ขยะท้ายชีต

**E — CONTENTS:** CRUD + copy + placeholder `{{items}} {{shipping}} {{total}} {{bank_no}} {{bank_name}} {{account_name}} {{date}}` · แปลง template 6 ชุดครั้งเดียวตอน P3 · rename: `Invoice`→`Quotation`, `Quotation`→`แจ้งราคา`

**F — Tools/Settings:** ค่าคงที่ (กติกาค่าส่ง base/step/cap, บัญชีโอน, prefix order id) + ปุ่ม bulk ทั้งหมด + ลิงก์เปิดชีต

### Template 2 ชุดหลัก (confirm แล้ว — ตามตัวอักษร)

**① แจ้งราคา** (แจ้งหนังสือเข้า + ราคา):
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

**② Quotation (สรุปยอด)** (ลูกค้าตกลงซื้อ):
```
ขออนุญาตสรุปยอดค่าหนังสือนะคะ
.
{{items}}
:
{{bank_no}}
{{bank_name}} | {{account_name}}
ยอด {{total}} (รวมค่าจัดส่งไปรษณีย์ไทย {{shipping}}.- แล้ว)  —  บาทค่ะ
```
`{{items}}` = บรรทัดละ `ชื่อเต็ม (รวม RESTOCK tag) — ราคา` · เลขคั่นหลักพัน comma · `{{total}}` = subtotal + shipping

## 4. Data flow หลัก

```
Inventory (Instock) ──add──▶ 🛒 Cart ──┬─▶ แจ้งราคา (copy → FB)
                                       ├─▶ Quotation/สรุปยอด (copy → FB, มียอด+บัญชี)
                                       └─▶ Confirm Sold
                                             ├─ SALES: แถวต่อเล่ม (Order = OWA-YYYYMMDD-NN กลุ่มเดียว)
                                             ├─ GGB/MAG: Status=Sold + Sold Date
                                             └─ BOOKING: ปิดคิวถ้าขายให้คนในคิว (เฟสถัดไป)
เพิ่มสินค้า/Restock ──match──▶ BOOKING queue ──▶ Instock Notification (copy → FB)
```

## 5. ลำดับพัฒนา

| Phase | งาน | Gate |
|---|---|---|
| **P1** | แก้ blockers §1.3 ใน Code.gs + `WebApp.gs` (doGet, api) + `Index.html` shell + Inventory read/search/filter | เปิดบนมือถือ ค้นสินค้าเจอทันทีหลังโหลด index · Sidebar เดิมยังใช้ได้ |
| **P2** | Add + Edit row + Mark Sold เดี่ยว + คอลัมน์ Sold Date | งานหน้าร้านรายวันจบบนเว็บ ไม่ต้องเปิดชีต |
| **P3** | Cart → แจ้งราคา / Quotation / Confirm Sold → SALES + booking match ตอน add | ปิดขาย 1 ออเดอร์หลายเล่มจบใน web app; SALES ขึ้นเอง |
| **P4** | SALES dashboard รายเดือน | เห็นสรุปเดือน+กราฟจากข้อมูลที่ P3 เขียนเข้า |
| **P5** | BOOKING เต็มรูป + CONTENTS CRUD | จัดการคิว/template ครบจากเว็บ |
| **P6** | (อนาคต) สร้างเว็บใหม่ — ดู §8 | — |

ก่อนเริ่ม P3 ต้องปิด §7 ข้อ 1

## 6. กติกาที่ confirm แล้ว (single source)

- ค่าส่ง: `50 + 10×(n−1)` เพดาน 100 — override ได้
- Template แจ้งราคา / Quotation ตาม §3 ทุกตัวอักษร · bank อยู่ใน Settings/CONTENTS ไม่ hardcode
- Sold Date: ทำใน P2 (ตัดสินใจแล้ว)
- Suggested Price recency: ยังไม่แก้สูตร รอ Sold Date สะสม
- CONTENTS rename ตอน P3: `Invoice`→`Quotation`, `Quotation`→`แจ้งราคา`
- Cart เพิ่มได้เฉพาะ Instock (Auction เตือน)

## 7. รอ confirm

1. **SALES convention (บล็อก P3):** `Order` = `OWA-YYYYMMDD-NN` (ตาม src — อัปเดตจากข้อเสนอเดิม), `Product` = ชื่อเล่มเต็ม (รวม RESTOCK tag), `Note` = SKU, ค่าส่งลงเต็มที่แถวแรกของออเดอร์ (แถวอื่น 0) → Net Profit = Price − Cost − Shiping Cost ต่อแถวตามสูตรเดิมของชีต — **ตอบ "ตามนี้" หรือแก้ตรงไหนบอกได้เลย**
2. Owner=KK payout — เฟสแรก badge+filter พอ (ไม่บล็อก)
3. Biding (ประมูล) — ยังไม่ scope (ไม่บล็อก)

## 8. เส้นทางสู่เว็บใหม่ (ปลายทาง) + จัดการของจาก v3

### 8.1 หลัก "ย้ายได้โดยไม่รื้อ"
- `api(action, payload)` JSON contract = สัญญากลาง — เว็บใหม่เปลี่ยนแค่ transport
- ชื่อ field ใช้ logical keys ชุดเดียวกับ HEADER_MAP · สถานะเป็นชุดคำมาตรฐาน (Instock/Auction/Sold · Pending/Paid/Shipped · Waiting/Notified/Purchased/Cancelled)
- Order ID / SKU convention เดียวตลอดสาย → วัน import เข้าเว็บใหม่ไม่ต้องแปลงข้อมูล

### 8.2 สินทรัพย์ที่พร้อมแล้วสำหรับเว็บใหม่ (จากงาน v3 — เก็บเข้ากรุ ไม่ทิ้ง)
- `src/lib/inventory/` — logic v14/v15 เป็น TypeScript ครบ ผ่าน strict + smoke 34/34
- `scripts/golden-test.ts` — เครื่องตรวจความถูกต้อง logic กับข้อมูลจริง
- Design tokens §2.1 — วันสร้างเว็บใหม่: export ชีต + lib นี้ + frontend ใหม่ = ไม่ต้อง reverse-engineer สูตรอีกรอบ

### 8.3 ไฟล์ SQL v3 (`20260718_backoffice_p0.sql`)
- **ยังไม่รัน** → ไม่ต้องทำอะไร ข้ามไป
- **ถ้ารันไปแล้ว** → ไม่กระทบเว็บเดิม/ชีตเลย (ตารางใหม่ว่างเปล่า + 2 คอลัมน์ default ใน orders) จะปล่อยทิ้งไว้ก็ได้ หรือถอนออกให้สะอาด:
```sql
drop function if exists confirm_fb_sale(text,jsonb,numeric,numeric,numeric,jsonb);
drop table if exists product_ops;
drop table if exists bookings;
drop table if exists templates;
alter table orders drop column if exists channel;
alter table orders drop column if exists shipping_cost;
```

## 9. ความเสี่ยง / ข้อจำกัด

- `google.script.run` latency ~1–2 วิ/call → ทุก interaction เป็น client-side, server แตะเฉพาะ write
- แก้โค้ดแล้ว `/exec` ไม่อัปเดตจนกด New version — ใช้ `/dev` ระหว่างพัฒนา
- URL `/exec` = กุญแจร้าน — Access ตั้ง Only myself เท่านั้น
- ชีตใหญ่ขึ้นเรื่อย ๆ index โหลดครั้งเดียวยังไหวถึงหลักหลายพันแถว (JSON < 1–2 MB) — เกินนั้นค่อยแบ่งหน้า
