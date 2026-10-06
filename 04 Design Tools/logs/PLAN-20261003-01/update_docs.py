"""Bounded Session35 documentation update; no app, Sheet or deployment writes."""
from pathlib import Path
import csv, difflib, hashlib, io, json
from datetime import datetime

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
STAMP = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')
CHANGE = 'PLAN-20261003-01'
REQUEST = 'PLAN-REMAINING-EFFICIENCY-001'
PLAN = '00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
BOOK = '00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md'
IMPL = '00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md'
HISTORY = '00 Docs/HANDOFF_2026-09-28.md'
STATE = '00 Docs/STATE.md'
HANDOFF = '00 Docs/HANDOFF_2026-10-03.md'
MASTER = 'OWARI-MASTER-CONTEXT_EN_2026-09-13.md'
README = '03 Apps Script/Web App/README.md'
DECISIONS = '04 Design Tools/logs/decisions_20261003.csv'
OLD_DESIGN = '00 Docs/ORDERS-CRM-LABEL-DESIGN.md'
NAMES = [PLAN, BOOK, IMPL, HISTORY, STATE, HANDOFF, MASTER, README, DECISIONS, OLD_DESIGN, 'AGENTS.md', 'CLAUDE.md']
before = {n: (ROOT/n).read_bytes() for n in NAMES}
docs = {n: b.decode('utf-8-sig').replace('\r\n', '\n') for n,b in before.items()}

def replace(n, old, new):
    assert docs[n].count(old) == 1, (n, 'replacement must match once', old[:70])
    docs[n] = docs[n].replace(old, new)

def section(n, start, end, new):
    s = docs[n].index(start)
    e = docs[n].index(end, s)
    docs[n] = docs[n][:s] + new.strip() + '\n\n' + docs[n][e:]

section(PLAN, 'วันที่ 2026-09-28', '## 1.', f'''จัดทำ: {STAMP} · Stream B §§2,5,6,9 · Session35 · Change `{CHANGE}`

**P1 Add ติดตั้งแล้ว; งานที่เหลือจัดเป็น W1 → W2 → W3** ตามผลลัพธ์ที่ใช้งานได้ ตารางนี้เป็นแผนปัจจุบัน; รายละเอียดสัญญาระบบอยู่ §§3–9/11/15 ประวัติ P0–P6 เดิมยังอยู่ใน Implementation log ไม่ใช่คิวให้เริ่มใหม่

## 0. ภาพรวมและลำดับงานที่เหลือ

| ลำดับ / สถานะ | ผลลัพธ์ที่เจ้าของได้ | ขอบเขต / ของเดิมที่ใช้ต่อ | เกณฑ์จบ / ภาระงานสัมพัทธ์ |
|---|---|---|---|
| P1 — LIVE ตาม Session34 | Add ต่อเนื่อง, default New Arrival, บันทึกไม่ครบไม่ตอบ DONE, ตรวจคำขอเดิมได้ | Code/WebApp v31 + Index + P1Journal; ADD REQUESTS เท่านั้น | R1–R4 และ local/isolated Google tests ผ่าน; first real-shop Add ยังรอสังเกต ไม่มีงานแก้เพิ่มหากไม่พบบั๊ก |
| **1 · W1 — TODO** | **Cart → Create order → Pending → Cancel/Confirm sold** และ Orders Bento ใช้งานจบสาย | stable Item UID, shared guards, ORDERS/ORDER LINES/ORDER REQUESTS, SALES เดิม; ปุ่มข้างราคา + 4 คำสั่ง, final review + Label later | QA-B/C/D/E/F/G/K/L + regression ที่กระทบ; review critical diff; สูงสุด เพราะเป็นเงิน/สต็อกและฐานของ W2 |
| **2 · W2 — TODO** | **ค้นหา/บันทึกลูกค้า → Label → Print/Reprint** จากเว็บและ Sheets | CLIENT เดิม, recipient snapshot, renderer เดียวจาก Label Tool, CAUTION asset เดิม; ต่อ final review ของ W1 | QA-H/I/K/L + sale-no-repeat; Google dialog/PDF/print check; ปานกลางถึงสูง |
| **3 · W3 — TODO** | **เปิดใช้ workflow ครบชุดพร้อม undo และคู่มือ** | exact reviewed revision + migration dry-run + isolated E2E → release ที่อนุมัติ → readback | รวม QA-A–L ตามความเกี่ยวข้อง, ไม่มี critical issue ค้าง, source/schema/undo ตรงจริง; งานโค้ดต่ำแต่มีขั้น Google/เครื่องพิมพ์ |

W1/W2 ส่งมอบเป็นชุดสาธิตได้ในโปรเจกต์ทดสอบแยก ไม่ขึ้นร้านด้วยปุ่มที่ backend ยังไม่พร้อม; W3 เป็นจุดเปิดใช้ชุดใหม่ แผนไม่ได้ลดข้อกำหนดเพื่อให้จำนวนขั้นดูน้อยลง และไม่กำหนดชั่วโมง/เปอร์เซ็นต์ที่ยังไม่มีหลักฐานรองรับ

### โครงสร้างระบบปลายทาง

```mermaid
flowchart LR
  I[Inventory: สินค้ารายชิ้น] --> C[Cart: ราคาและช่องทาง]
  C -->|SHOP Create order| P[Orders: Pending + reservation]
  P -->|Cancel ตรวจเจ้าของ| X[Cancelled + คืนสถานะเดิม]
  P --> R[Review ก่อนยืนยันขาย]
  C -->|SHOPEE Confirm sold| R
  R --> T[Shared transaction + request journal]
  T --> S[Sold + SALES + สต็อก]
  CL[CLIENT เดิม] --> R
  R --> RS[Recipient snapshot ของ order]
  RS --> L[Label renderer เดียว]
  S --> L
  L --> O[เว็บ / เมนู Sheets / Print / Reprint]
```

| ชั้นงาน | หน้าที่ / จุดแก้ที่คาด | ขอบเขตที่ทำให้เล็กและดูแลง่าย |
|---|---|---|
| หน้าจอ | `Index.html`: itemHtml, Cart, Orders grid, review, attachSuggest | ต่อ SPA เดิม ใช้ event delegation/CSS Grid ไม่เพิ่ม framework หรือหน้า back-office อีกชุด |
| API / ธุรกรรม | `WebApp_v31.gs` baseline: api, _apiInvUpdate, _apiMarkSold, _apiSalesConfirm, _nextOrderId; Code helpers/menu | Create/Cancel/Confirm ใช้ guard/lock/recovery ชุดเดียว; รวม caller ที่แก้ status ไม่ปล่อยช่อง bypass |
| ข้อมูล | Inventory = ตัวสินค้า; ORDERS = หัวรายการ; ORDER LINES = รายชิ้น/เจ้าของจอง; SALES = รายการขาย | SKU/row เปลี่ยนได้จึงไม่ใช่ identity ถาวร; ไม่ย้ายยอดขายเก่ามาสร้างประวัติ order ปลอม |
| กู้คืน / ตรวจย้อนหลัง | ADD REQUESTS สำหรับ P1; ORDER REQUESTS สำหรับธุรกรรมใหม่ | reuse รูปแบบ intent/progress/readback เฉพาะที่ใช้จริง; ใช้ journal เก็บ event ให้ครบก่อนพิจารณา AUDIT LOG แยก |
| ลูกค้า / ฉลาก | CLIENT + Client ID/revision; recipient snapshot แยกต่อ order; Label Tool เดิม | ไม่สร้าง CUSTOMERS ซ้ำ; ไม่ส่ง Facebook/internal note/ราคาให้ renderer; print ไม่ขายซ้ำ |

### คิวอื่นของร้าน — แยกจากเงื่อนไขจบ Add/Cart/Orders/Label

ข้อมูลส่วนนี้อ้าง STATE snapshot เดิม ไม่ใช่การตรวจระบบสดในรอบนี้: (1) รักษางานที่ LIVE; ถ้ามีข้อมูลเสีย/ขายซ้ำให้แก้ก่อน W1, (2) ตรวจผล Meta auto-refresh ที่ค้าง A5 และวินิจฉัย fbaPostBatch error ในงานบำรุงรักษาสั้น ไม่รื้อ pipeline, (3) Shopee relisting: ตรวจ builder/drafts และ mapping item IDs; reconciliation รายการเก่าต้องมี export ราคาสต็อก/options จากเจ้าของ, (4) OWA ads ยัง PARKED รอ budget/posts/break-even และคำสั่งเปิดงาน, (5) storefront/เครื่องมืออื่นสถานะยังไม่ตรวจจึงไม่รวมคำรับรองว่า “ทั้งร้านเสร็จ” ไม่แตะ OWARIN Back House LAB

**ถัดไปเพียงหนึ่งงาน:** W1.1 ตรวจ source/headers/callers เฉพาะธุรกรรมเทียบ v31 แล้วลง implementation ใน local/isolated project ตาม §10; ไม่ย้อนเริ่ม P0/Add ทั้งชุด ส่วน first real P1 Add ตรวจเมื่อมีรายการจริง ไม่สร้างสินค้าปลอมเพื่อปิด checklist
''')
section(PLAN, '## 1.', '### Requirement map', '''## 1. ขอบเขตและข้อสรุป

ต่อยอด OWARIN BACK-OFFICE และชีตเดิมใน `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE`; ไม่เกี่ยวกับ sibling Back House LAB รอบ Session35 ปรับแผน/กฎ/เอกสารเท่านั้น ไม่แก้ runtime หรือ deploy

- เป้าหมายจบโครงการนี้: Add → Cart → Order/จอง/ยกเลิก/ขาย → Client/Label → พิมพ์จากเว็บและ Sheets พร้อม failure/retry ที่กู้คืนได้
- Pending ต้องกันสินค้า; Cancel ปลดเฉพาะจองของ order นี้; Auction ขายแล้ว/ห้ามขายซ้ำ; ขายได้เฉพาะ Instock
- SALES Shipping Cost = **Shipping Subsidy (ส่วนที่ร้านช่วยออก)**; Customer Shipping แยกต่างหาก ไม่ใช่ carrier expense
- ใช้ CLIENT เดิม; Facebook Account ใช้ค้นหา/เก็บข้อมูลเท่านั้น; final review ก่อน Save & confirm sold และมี Label later เป็นรูปแบบตามแผนสำหรับ acceptance
- การอนุมัติ production วันที่ 2026-10-03 ครอบคลุม P1 v31 ที่ติดตั้งแล้ว; release ใหม่ต้องตรวจขอบเขตการอนุมัติจริง ไม่ถามซ้ำในส่วนที่อนุมัติครบ และไม่ถือการปรับแผนเป็นคำสั่ง deploy
''')
section(PLAN, '## 2.', '## 3.', '''## 2. Baseline และหลักฐานที่ใช้ต่อ

สถานะร้านอ้าง **Session34 วันที่ 2026-10-03 21:56 +0700** จาก `04 Design Tools/logs/P1-20261003-03/result.md`, `source-readback.json`, `UNDO.md`; รอบนี้อ่านหลักฐานและ local source ไม่ตรวจร้านสดและไม่อ้างจำนวนสินค้า/ยอดขายปัจจุบัน

- Production project `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp`; Sheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`; existing /exec Version4, owner-only; exact URL/hashes/rollback ใน result.md
- ชุดอ้างอิง local: `03 Apps Script/Web App/Code_v31.gs`, `WebApp_v31.gs`, `Index.html`, `P1Journal.gs`; v31 รักษา Meta v30. ไม่อัป whole-project bundle ทับ live FbAlbum/R2Upload ซึ่งต่างจากบาง local copies
- P1 R1–R4 frozen defect reproduction: `P1-20260930-11/review.md`; repaired local/Google evidence: `P1-20261003-02/review.md`; deployment/readiness และ backup: `P1-20261003-03/`. ใช้เป็นหลักฐานเดิม ไม่รัน reproduction ทั้งหมดซ้ำเมื่อไม่ได้แก้ Add
- CLIENT A:F เดิม = Facebook Account, Name, Phone Number, Address, Post Code, Note. SALES เดิมมี Order ID/ชื่อ/วันที่/Cost/Price/Shipping Cost/Net Profit/Note/Product ID; ต้องรักษา ARRAYFORMULA spill และ table/totals boundaries
- ORDERS/ORDER LINES/ORDER REQUESTS/Item UID/Client ID ตามแผนยังไม่ติดตั้ง; legacy Cart/Mark Sold ไม่ได้มีการคุ้มครองจาก ADD REQUESTS
- P0 source-traced ราคา Shopee ใช้ `round(enteredPrice*0.7-50)`; marketplace display formula `MAX(60,CEILING((Price+50)/0.7,10))`. เป็นสัญญาของโค้ดร้าน ไม่ใช่อัตราค่าธรรมเนียม Shopee ปัจจุบัน; ไม่เปลี่ยนสูตรในงานนี้
- Source risk ที่ W1 ต้อง reproduce/แก้: Auction/Hold bypass, duplicate cart lines, partial Sold/SALES, allocator อ่าน SALES อย่างเดียว, omitted subsidy แอบใช้ customer shipping. ฐานหลักฐาน `P1-20260930-08/integrity-review.md`; ไม่ใช่การทดลองขายจริงในร้าน
- แบบ `ORDERS-CRM-LABEL-DESIGN.md` 2026-09-11 และ phase P1–P6 ใน webapp-plan เก่าเป็นประวัติ; payments/shipments/CUSTOMERS ในนั้นไม่ใช่ขอบเขตนี้
''')
section(PLAN, '## 3.', '## 4.', '''## 3. Add item — LIVE; ตรวจซ้ำตามผลกระทบ

P1 v31 ผ่านการแก้ R1–R4 และ local/isolated runtime; production ผ่าน source/schema/readiness/modal smoke แต่ **first real production Add/DONE ยังไม่ทำ** และ real network outage/new-device auto-recovery ยังไม่พิสูจน์

- success reset ช่องสินค้า/default New Arrival/โฟกัส Name; error คง draft; callback เก่าห้ามล้างรายการใหม่; saved แล้ว refresh พังต้องบอก Saved ไม่ชวน Add ซ้ำ
- ตรวจ source/status/schema ก่อนเขียน, money/formula readback ก่อน DONE; replay คืน committed snapshot พร้อม provenance ไม่หยิบคนละชิ้นที่นำ SKU ไปใช้ใหม่
- timeout ใช้ Request ID เดิม/Check retry; ID หายให้ manual reconciliation แล้วหยุดเมื่อจับคู่ไม่ได้ ไม่สร้าง ID ใหม่เพื่อเดาว่ายังไม่บันทึก
- ห้ามเปิดงาน P1 ใหม่เพียงเพื่อทำ phase ให้ครบ; รัน QA-A เมื่อแก้ Add/Index ส่วนร่วม/helper/schema ที่เกี่ยวข้อง และใน release regression ตามความเสี่ยง ใช้ evidence เดิมของ 20-round/failure tests โดยไม่สร้างแถวร้านซ้ำ
''')
replace(PLAN, 'Subtotal, Customer Shipping, Carrier Expense, Total', 'Subtotal, Customer Shipping, Shipping Subsidy, Total')
replace(PLAN, 'P0 ต้อง trace `FbAlbum.gs`', 'W1.1 ต้อง trace `FbAlbum.gs`')
replace(PLAN, '## 10. ลำดับทำงานและโมเดล', '## 10. ลำดับทำงานและโมเดล')
section(PLAN, '## 10.', '## 11.', '''## 10. แผนลงมือแบบกระชับ — หนึ่ง writer / หนึ่งงานที่กำลังทำ

| งานย่อยตามลำดับ | ทำอะไร / ตรวจอย่างไร | ส่งมอบที่ตรวจรับได้ |
|---|---|---|
| W1.1 ฐานธุรกรรม | เทียบ live revision เฉพาะก่อนเริ่มแก้/ติดตั้ง, trace writers, reproduce risks §2; ตกลง headers/Item UID/price basis; backup + migration dry-run | exact baseline, schema delta, failing tests ของความเสี่ยง; ไม่ทำ P0 ทั้งโครงการใหม่ |
| W1.2 จองและยกเลิก | shared guards + journal + create/cancel + Orders list/get; ต่อ Cart และ Bento ที่ใช้สอง action ได้จริง | test copy: Create → Pending → Cancel; 2 sessions แย่งได้หนึ่ง, หลาย Pending อยู่ได้; manual edit conflict ไม่ถูกทับ |
| W1.3 ปิดการขาย | final review + Label later, SHOP/Shopee confirm, SALES/order ID/readback/replay; legacy paths ใช้ guard เดียว; touched edits/menu audit | test copy: Confirm/retry ได้ sale เดิม, ไม่ขาย Auction/Hold ของคนอื่น; QA-B–G/K/L ผ่าน; critical diff review แล้ว |
| W2 ลูกค้า + Label | CLIENT ID/revision/search/save; recipient snapshot; shared renderer/Sheets menu/CAUTION; ต่อ review เดิมครั้งเดียว | เลือก/เพิ่มลูกค้า, preview, print/reprint; client-save fail ไม่ขายซ้ำ; QA-H/I/K/L ผ่าน |
| W3 ปิดงาน / release | isolated E2E ทั้งสอง channel, impact regression, print/PDF/physical sample, exact release manifest + undo → approved deployment → readback/smoke | คู่มือปุ่มจริง, revision ที่ใช้จริง, migration/undo หลักฐาน; รายการจริงแรกตรวจ Request ID โดยไม่สร้างธุรกรรมปลอม |

- Mapping ประวัติ: W1 = P2 Cart + P3 transaction + P4 focused review + P5 Orders; W2 = P2 caution + P5 CRM/Label; W3 = P6. P0/P1 ปิดแล้วตามหลักฐาน ไม่ลบประวัติ phase เดิม
- ใช้ Sol / High กับ W1 และ critical client-save; งาน UI/doc ปกติตาม policy. Astra / High ตรวจ exact money/stock/security diff เมื่อ logic นิ่ง; เปลี่ยน critical diff หลัง review จึงตรวจเฉพาะส่วนนั้นใหม่ ไม่บังคับเปลี่ยนโมเดลทุกงานย่อย ไม่อ้างว่าได้สลับเอง
- เริ่ม bug ด้วย reproduction → smallest fix → test เดิม + failure/retry ที่เกี่ยวข้อง → อ่านผล; ถ้าไม่มีความเสี่ยงใหม่และ gate ผ่านให้เดินหน้าทันที ไม่เพิ่ม audit/test/doc phase เพื่อความมั่นใจซ้ำ ๆ
- ใช้ harness/Node assert/VM/Google fixture เดิม; ใช้ข้อมูลจำลองใน test project แยก. การทดสอบยังไม่ผ่านหรือสิทธิ์ไม่ครบต้องบอกสถานะ ไม่เพิ่ม dependency หรือใช้ LAB เป็นทางลัด
- แต่ละ change มี backup/diff/CSV; Implementation log สรุปและลิงก์หลักฐานหนึ่งชุด, HANDOFF สั้น, STATE สถานะ+หนึ่ง next step. ไม่คัดลอกรายงานยาวหลายไฟล์ (§15 ยังคงบังคับ)
- ทุกจุดพักส่ง scope, exact revision, tests/result, remaining issue, recovery และหนึ่ง next step. ถ้า Sol / High แก้ reproducible issue ไม่ได้ให้ log แล้วส่งต่อ Astra / High ตามกฎ; ห้ามสร้าง agent/chat หรือแก้ไฟล์หลาย writer โดยพลการ
''')
section(PLAN, '## 13.', '## 14.', '''## 13. Gates ก่อนแก้ critical code — ไม่เปิดคำตัดสินที่ปิดแล้วซ้ำ

1. **ตรวจสภาพแวดล้อม:** current source เทียบ v31, stable keys/headers/formula/table bounds และทุก writer ที่เกี่ยวข้อง; baseline drift ให้รวม diff ที่จำเป็น ไม่ทับงานใหม่ของร้าน
2. **ปิด contract ให้ชัด:** Customer Shipping แยก Shipping Subsidy; ราคา channel ต้องระบุ entered/ledger basis. Reject missing/invalid subsidy ก่อน mutation ไม่ fallback เป็นค่าส่งลูกค้า; UI ให้กรอก/ยืนยันค่าอย่างชัดเจน
3. **คำตัดสินปิดแล้ว:** Auction unavailable, Pending reserves, Cancel เฉพาะ owner, CLIENT เดิม, Facebook off-label; ไม่ถามอีก. Shopee สูตรเดิมคงไว้; ถ้าต้องเปลี่ยนความหมายส่วน 50/subsidy ให้เสนอ synthetic example และขอ owner เฉพาะนโยบายที่ยังไม่ชัด
4. **จำกัด recovery:** manual edits/sort/PID reuse ต้องตรวจ identity/revision; Sheets ไม่ atomic, ไม่คืน stock ทับ external edits; ไม่อ้าง reservation sync Shopee/Meta แบบทันที
5. **ก่อน release:** exact diff + passed applicable QA + migration/backup/undo + approval ใน scope จริง; สิ่งที่ยังไม่ได้ตรวจเช่น physical print ต้องเปิดเป็น gate ไม่เขียน PASS
''')
replace(PLAN, 'Archive preflight: พบ reference เดิมยังถูกอ้างถึงและงานนี้ยังเป็น proposal จึงไม่ย้าย source/design เก่าให้ลิงก์พัง ใช้ข้อความ supersession ในเอกสารนี้แทน; ถ้า implementation ภายหลังแทนไฟล์จริง ต้องทำ reference search + dry-run + CSV ตาม AGENTS', 'Archive preflight Session35: แผน/คู่มือ/history/baseline ยังถูกอ้างอิง จึงเก็บเส้นทางเดิมและเพิ่ม supersession note ในแบบเก่า ไม่มีการย้ายไฟล์; backup ก่อนแก้และ diff อยู่ใน PLAN-20261003-01')
replace(PLAN, 'P0 ต้องระบุจุดที่ควบคุมได้', 'W1.1 ต้องระบุจุดที่ควบคุมได้')
replace(PLAN, 'เพิ่มการทดสอบ QA-L ใน P3/P4/P6; การเปลี่ยน docs รอบนี้มีบันทึกใน implementation log และ CSV แล้ว ส่วน runtime audit ยังต้องพัฒนา', 'QA-L อยู่ใน W1/W2/W3 ตาม mutation ที่เปลี่ยน; P1 มี ADD REQUESTS แล้ว แต่ order/client/edit audit ในขอบเขตใหม่ยังต้องพัฒนา ไม่อ้างว่าครอบคลุม legacy sales')

section(BOOK, '2026-09-28 ·', '## 3.', f'''จัดทำ: {STAMP} · Stream B · **P1 Add LIVE ตาม Session34; W1/W2/W3 ยังไม่ติดตั้ง**

คู่กับ [แผนหลัก](PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) ซึ่งเป็นที่เดียวของ priority/requirements/QA; ไฟล์นี้เก็บขั้นตอนใช้และกู้คืน ส่วนผลจริงอยู่ใน Implementation log และ CSV

## 1. เริ่มงานและ baseline

อ่าน STATE ก่อน → AGENTS/master §§2,5,6,9 → แผน §0/§10 และ contract/QA เฉพาะชุดงาน → source ที่จะแก้. อ่าน HANDOFF Session35/หลักฐาน Session34 เท่าที่ต้องตรวจ ห้ามกลับไปเริ่ม P0/Add ทั้งชุดเพราะ prompt เก่า

โฟลเดอร์ `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE`; ชุด local v31/v31 + Index/P1Journal. Runtime ร้าน last verified Session34 deployment4; exact hashes/IDs/backup/undo อยู่ `04 Design Tools/logs/P1-20261003-03/`. ไม่ใช้ LAB หรือ source รุ่นเก่าทับ Meta/R2/FbAlbum ที่ติดตั้ง

## 2. Runbook ที่เหลือ

| ชุด | ขั้นตอน | Exit |
|---|---|---|
| W1 Cart/Orders/จอง/ขาย | ตรวจเฉพาะ source/schema delta → reproduce risk → migration dry-run → shared guard/intent → create/cancel + Bento → confirm/retry + Cart/review | สาธิตสอง channel ใน isolated project; QA-B–G/K/L; review critical revision; ไม่ deploy backend ที่ยังไม่ครบ |
| W2 CLIENT/Label | ต่อ review เดิม → search/select/save client → snapshot → renderer เดียว → web/Sheets/CAUTION | CRM failure retry ไม่ขายซ้ำ; allowlist/overflow/PDF/print; QA-H/I/K/L |
| W3 ทดสอบรวม/เปิดใช้ | E2E SHOP Cancel/Confirm และ Shopee Label later → failure/reload → impact regression → exact manifest/undo → authorized install → source/schema readback + smoke | QA ที่เกี่ยวข้องครบ, ไม่มี blocker; physical print ต้องเจ้าของทดสอบจริง; คู่มือเป็นปุ่มที่ติดตั้งแล้ว |

แต่ละ bug ใช้ reproduce → targeted fix → repeat original steps + failure/retry → อ่านผลจริง; เก็บ Change ID/backup/diff/errors/recovery ตามแผน §15. ใช้ Sol / High ใน transaction, Astra / High focused review หรือเมื่อ Sol แก้ reproducible issue ไม่ได้; one writer ไม่สร้าง chat/agent โดยอัตโนมัติ. Model recommendation ไม่ใช่หลักฐานว่าสลับแล้ว
''')
replace(BOOK, 'node Index.test.js', 'node p1-add.test.cjs\nnode p1-ui.test.cjs\nnode Index.test.js')
replace(BOOK, 'P1/P3/P5 ต้องเพิ่มหรือขยาย behavioral tests', 'W1/W2 ต้องเพิ่มหรือขยาย behavioral tests')
replace(BOOK, 'หัวข้อนี้เป็น expected UI สำหรับ acceptance ยังไม่ใช่ปุ่มที่ติดตั้งครบในเว็บปัจจุบัน', 'Add ด้านล่างอ้าง P1 v31 ที่ติดตั้งแล้ว; SHOP/Shopee/Orders/Client/Label เป็น **target UI ของ W1/W2** จน W3 release ผ่าน จึงยังใช้เป็นคำสั่งร้านปัจจุบันไม่ได้')
replace(BOOK, '**สถานะ P1 ในชีต/เว็บทดสอบ ณ 2026-09-29 (ยังไม่ใช่คู่มือเว็บร้านจริง):**', '**P1 v31 ร้าน: ขั้นตอนเมื่อผล Save ไม่ชัดเจน (ติดตั้งตาม Session34; behavior ทดสอบใน isolated project):**')
replace(BOOK, 'การทดสอบ timeout จริงและขั้นตอน reconcile เมื่อไม่ทราบ ID ยังเป็น release gate ที่เปิดอยู่', 'real network outage ยังไม่พิสูจน์; manual fail-closed เป็นข้อจำกัดของ P1 ที่ติดตั้งแล้ว ไม่ใช่เหตุให้วนเลื่อน W1 โดยไม่มี bug ใหม่')
replace(BOOK, '**วิธีตรวจด้วยคนในชีตทดสอบ P1 เมื่อผล Add ไม่ชัดเจน:**', '**วิธีตรวจด้วยคนในชีตของ environment ที่เกิดเหตุเมื่อผล Add ไม่ชัดเจน:**')
replace(BOOK, 'ถ้า `DONE` และข้อมูลตรงกัน ให้ถือว่าบันทึกแล้วและอย่ากด Add ใหม่;', 'ถ้า `DONE` ให้ตรวจ committed result snapshot/provenance ของ request; SKU หรือเลขแถวตรงกันอย่างเดียวพิสูจน์ไม่ได้ว่าเป็นสินค้าชิ้นเดิมหลังมีการ reuse/sort. อย่ากด Add ใหม่หรือคืนข้อมูลเก่าทับสินค้าปัจจุบัน;')
replace(BOOK, '**ยังไม่ใช่ระบบกู้คืนอัตโนมัติหรือคู่มือ runtime ร้านจริง**', '**เป็น manual recovery เท่านั้น ยังไม่มี automatic lost-ID/new-device recovery และไม่อ้างว่าได้ทดสอบเหตุเดียวกันในร้านจริง**')
section(BOOK, '## 7.', '## 8.', '''## 7. Prompt งานถัดไป — W1.1 แล้วทำ W1 ให้จบใน test project

> ทำ Stream B ใน C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE อ่าน STATE, AGENTS/master §§2,5,6,9, PLAN §0/§10/§6/§11/§15 และ HANDOFF Session35. P1 v31/deployment4 ติดตั้งแล้วตาม Session34; เริ่ม W1.1 เทียบ baseline/callers/header เฉพาะธุรกรรม แล้วแก้ local candidate และทดสอบในโปรเจกต์แยกจน Cart → Pending → Cancel/Confirm sold + Orders Bento ครบ. Reproduce Auction/reservation bypass, duplicate SALES, partial writes, order ID และ shipping-default risks ก่อนแก้; ใช้ stable copy identity, shared guard, same-ID retry และ readback. Shipping Cost=shop subsidy; Auction ห้ามขายซ้ำ; CLIENT เดิม; Facebook off-label. ไม่ย้อน P0/P1 ทั้งชุด ไม่ใช้ LAB ไม่ deploy ในงาน candidate. ส่ง exact revision + tests/failure/retry + backup/diff + CSV/Implementation log/recovery ให้ focused review ก่อน W3. One writer; ถ้า Sol / High แก้ไม่ได้ log สาเหตุ/วิธีที่ลองแล้วส่งต่อ Astra / High โดยไม่สร้าง agent/chat เอง

W2 อ่านเฉพาะ contract §7–8 และ API ที่ W1 ส่งมอบ; W3 ใช้ reviewed revision + acceptance gaps จริง ไม่ review baseline เดิมซ้ำโดยไม่มี critical change
''')
replace(BOOK, 'ถ้าระบบจริงผิดพลาด ให้เริ่มจาก Order/Request ID ที่ UI แจ้ง → filter AUDIT LOG → อ่าน journal/snapshot ของคำขอนั้น', 'ถ้าระบบจริงผิดพลาด ให้เริ่มจาก Request ID → journal ที่ติดตั้งจริง (ปัจจุบัน P1 = ADD REQUESTS; ORDER REQUESTS/AUDIT LOG ใช้ได้ต่อเมื่อ W1 ติดตั้งและตรวจแล้ว) → อ่าน snapshot ของคำขอนั้น')

rules = '''### 5.2.1 Delivery priorities — owner update 2026-10-03 (Stream B)

1. Plan before code: state the outcome, bounded steps and checks; leave a compact resumable handoff at any pause. Existing explicit authorization is sufficient; do not add a redundant confirmation gate.
2. Make the smallest scoped fix. Reuse existing code; no unsolicited dependency, rename or refactor. Back up before overwrite/delete and retain a reviewable diff.
3. Use one writer by default. Only if separately authorized, assign agents explicit read/write/review roles and exit criteria; avoid concurrent edits and verify their conclusions. This rule is not authorization to spawn agents/chats.
4. Reproduce the user's steps, trace callers, fix the root cause, then repeat the same steps. Do not hide an error or declare success after a partial write.
5. Read test results before claiming done; exercise changed UI. Keep money/stock/security failure/retry checks. State untested parts; stop optional verification once relevant gates pass and no concrete risk remains.
6. Turn corrections into actionable when-X/do-Y rules in the existing guidance. Replace obsolete active rules while retaining historical decisions/logs; do not accumulate contradictory instructions.

Efficiency: ship complete user workflows in W1/W2/W3, review changed critical logic, and keep one canonical plan with evidence links. Reopen a completed phase only for a reproducible issue, changed dependency or missing required gate. Each issue/attempt/retry/result/recovery is logged once in its task CSV and summarized in the Implementation log. If Sol / High cannot solve a reproducible issue, hand the exact revision and evidence to Astra / High; never claim an unverified switch.

'''
replace(MASTER, '- Live code is the `_v20` pair: `Web App\\Code_v20.gs` + `Web App\\WebApp_v20.gs` — **written entirely in English** (comments, menu items, alerts).', '- Current Stream B source is routed by `00 Docs/STATE.md` and `03 Apps Script/Web App/README.md`; last verified Session34 (2026-10-03) is Code/WebApp v31 + Index/P1Journal, deployment4. Older version statements are historical. Keep code/comments/menu items in English.')
replace(MASTER, '- New code must match: **English, and an add-on script file. Never edit `Code.gs`.**', '- Prefer existing helpers and targeted changes; an add-on is appropriate only when it avoids duplication/global collisions. The old absolute "never edit Code.gs" rule is retired; authorized paired-source changes follow AGENTS versioning and backup/review requirements.')
replace(MASTER, '- Status: P1 and P2 delivered (P2 = English UI, owner removed). **P3 (Cart → Quotation → Confirm Sold) not started.**', '- Status for the current Add/Cart/Orders/Label project: P1 Add LIVE; W1 Cart/Orders/transactions, W2 CLIENT/Label, W3 acceptance/release remain. Old webapp phase numbers refer to a different roadmap; do not reuse them as current status.')
replace(MASTER, '### 5.3 Google Sheet', rules + '### 5.3 Google Sheet')
replace('AGENTS.md', '- Plan → confirm → edit → syntax check (`node --check` or equivalent) before delivery.', '- Plan → use existing scoped authorization (ask only if materially missing) → targeted edit → relevant checks before delivery; syntax check (`node --check` or equivalent) for code.')
replace('AGENTS.md', '## Code', '12. **Delivery priorities (owner 2026-10-03):** Follow master §5.2.1 for Stream B: plan/checks first; smallest scoped fix with backup; explicit roles only if agents are separately authorized; reproduce/root-cause/retest; verify UI and failure/retry before done; record actionable lessons and retire obsolete active rules. One writer, no new agents/chats for this project. The current three-package plan is `00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` §0/§10.\n\n## Code')
replace('CLAUDE.md', '## Session-close checklist', '''## Delivery priorities and lessons — owner update 2026-10-03

- Apply the six ordered priorities in master §5.2.1; AGENTS is the router. For this project keep one writer and no new agents/chats unless explicitly authorized separately.
- When the owner asks for progress, report delivered user actions, verified environment/revision and remaining outcomes; do not equate code edits or documentation volume with a completed workflow.
- When an old plan/prompt says a completed phase is unstarted, update active guidance from dated evidence; preserve historical logs and do not rerun the old phase merely to match stale wording.
- When a relevant gate has passed and the next edit adds no related risk, proceed; rerun checks only for affected behavior or a required release gate. Never omit stock/money failure/retry tests to save effort.
- When a business rule is closed (Shipping Cost=subsidy, Auction unavailable, CLIENT reuse), propagate it to schema/UI/test contracts in the same pass; do not ask the owner again.
- Keep current status in STATE, requirements/priorities/QA in PLAN, operational steps in HANDBOOK, and detailed attempts/results/recovery in the task CSV plus a linked Implementation summary. Update only affected references; no repeated full reports.

## Session-close checklist''')
replace('CLAUDE.md', '8. **Verify** by reading back: file byte size after commit, live sheet / Apps Script / Meta state re-read, never from memory of the chat.', '8. **Verify** by reading back the changed artifact. For a docs-only change check files/links/history/source hashes; do not re-open live services just to close the checklist. Before a live action or fresh live claim re-read that service; date historical evidence explicitly.')
replace(README, 'Orders/reservation/Label P2 ยังไม่ติดตั้งในรอบนี้.', 'Orders/reservation/Label ยังไม่ติดตั้ง: แผนปัจจุบันแบ่ง W1 Cart/Orders/จอง/ขาย → W2 CLIENT/Label → W3 acceptance/release; ดู [แผนและ priority](../../00%20Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) และ [คู่มือ/ข้อจำกัด](../../00%20Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md). ข้อมูลติดตั้งในย่อหน้านี้อ้าง Session34 ไม่ใช่ live read ใหม่ใน Session35.')
replace(README, '| `owarin-webapp-plan_v4.1-EN.md` | แผนหลัก P1–P6 (ฉบับที่ใช้จริง) |', '| `../../00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` | แผนปัจจุบัน Add/Cart/Orders/CLIENT/Label: W1–W3; requirements/QA/status board |\n| `owarin-webapp-plan_v4.1-EN.md` | roadmap เว็บรุ่นก่อน; หมายเลข phase ไม่ตรงกับโครงการปัจจุบัน |')
replace(OLD_DESIGN, '## Screens and workflow', '> Superseded for active Add/Cart/Orders/CLIENT/Label scope on 2026-10-03: use [current plan](PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) and its W1–W3 board. This historical proposal does not authorize CUSTOMERS, payments, shipments, or deployment.\n\n## Screens and workflow')

section(STATE, 'จัดทำ:', '## Streams', f'''จัดทำ: {STAMP} — Stream B Session35 plan/rules update only. Production statements cite Session34; other streams retain prior snapshots. Re-read live before acting on data.
Rule: OVERWRITE at session close; ≤80 lines. Read active PLAN for scope; dated logs are lookup evidence.
''')
section(STATE, '### 1.', '### 2.', '''### 1. Add / Cart / Orders / Label (Stream B) — P1 LIVE; W1 next
- Status: Session34 verified Code/WebApp v31 + Index/P1Journal; ADD REQUESTS installed; existing /exec deployment4 at2026-10-03 21:44, owner-only. Local/isolated R1–R4 and production readiness/modal smoke passed; Session35 changes documentation only.
- Next ONE step: W1.1 compare current transaction source/schema/callers to v31, reproduce remaining sale risks, then implement W1 Cart/Orders/reserve/cancel/confirm in local + isolated test project; no P0/Add restart.
- Plan: `00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` §0/§10 = W1 transactions+Orders, W2 CLIENT/Label, W3 acceptance/release; contract/QA remains in that plan. `00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md` = operations/recovery.
- Open: first real P1 Add/DONE observed when a real item is available; retain Request ID. Real network outage unproven; lost-ID/new-device recovery manual. New Orders/reservations/client/label audit not installed; legacy sales outside P1 journal.
- Closed: Pending reserves; Cancel only own claim; Auction unavailable; Shipping Cost=shop subsidy; reuse CLIENT; Facebook off-label. P1 source/schema/deploy was explicitly approved with backup-first undo. Future release authorization checked for its actual scope.
- Rules: `AGENTS.md`, `CLAUDE.md`, master §§2,5,6,9 + §5.2.1 six priorities; one writer/no extra agents. Decisions `04 Design Tools/logs/decisions_20261003.csv`.
- Evidence: `04 Design Tools/logs/P1-20261003-03/result.md`/`UNDO.md` (exact installed hashes, deployment4/rollback3); `P1-20261003-02/review.md`; frozen baseline `P1-20260930-11/review.md`. Historical replay is not current-SKU identity.
- Session35: `04 Design Tools/logs/PLAN-20261003-01/result.md`/`changes.csv`/`before/`/`diff/`; `00 Docs/HANDOFF_2026-09-28.md` Session35; `00 Docs/HANDOFF_2026-10-03.md`; `00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md` Session35 only. Older `ORDERS-CRM-LABEL-DESIGN.md` is a superseded reference.
''')
replace(STATE, '- Device shell cannot mount the folder (Windows update 2026-09-08 issue): use device_stage_files → edit in container → copy to /mnt/user-data/outputs/ → device_commit_files (expectedMtimeMs when overwriting). Moves/deletes by OWARI in PowerShell. Install latest Windows update + restart.', '- Current Codex local host (2026-10-03): PowerShell can read/write this workspace; verify changed files after OneDrive writes. The 2026-09-08 remote mount workaround is historical, not required here.')
replace(STATE, '(Sessions through 34, history preserved)', '(Sessions through 35, history preserved)')

summary = f'''จัดทำ: {STAMP}. Stream B §§2,5,6,9. Change `{CHANGE}`; Request `{REQUEST}`; one writer, no agents/chats.

Owner requested a detailed remaining structure and a shorter value-focused plan plus six delivery priorities. Before: stale unstarted P1/P0 prompts, v20/v27 references and Carrier Expense mapping contradicted Session34 and closed D10/D11. After: one W1→W2→W3 board with architecture, dependency/QA/done criteria and old-phase mapping; W1 joins Cart/Orders/transactions, W2 joins CLIENT/Label, W3 handles acceptance/release. Preserved all R01–R14 and QA-A–L. Current P1 is dated LIVE evidence; first real-shop Add and true outage/new-device limits remain disclosed.

Updated active PLAN/HANDBOOK/STATE/README, AGENTS/CLAUDE/master §5.2.1 and supersession note on the older design; appended this log and historical HANDOFF without changing earlier bytes; dated HANDOFF kept compact. Backup/diffs/exact before→after hashes and per-file events: `{ROOT / '04 Design Tools/logs/PLAN-20261003-01'}`. Six priorities and closed subsidy/Auction/CLIENT rules propagated; no new business policy invented. Other STATE streams preserved.

Verification: local source four-file hashes unchanged, all requirements/gates retained, stale active prompts removed, docs readback/diffs/history-prefix/links/STATE≤80 checked by verify_docs.py (result in verification.txt). No runtime tests rerun for this docs-only change; existing P1 results are historical evidence, not fresh runs. Issue: initial batched long read was truncated; bounded section reads recovered the necessary contracts. No code/runtime failure or business retry occurred. Archive reference check found active historical dependencies; no move/delete.

Recovery: restore only affected docs from before/ after checking newer edits; diff/ shows exact changes. For appended history retain newer sessions and append a correction rather than erasing history. Production unchanged; P1 rollback remains P1-20261003-03/UNDO.md. Next: W1.1 scoped baseline/risks then local+isolated W1 implementation; no P0/P1 restart, no Back House LAB work.
'''
docs[IMPL] += '\n\n### Session35 — remaining-work plan and delivery rules — PLAN-20261003-01\n\n' + summary
docs[HISTORY] += '\n\n## Session 35 — remaining structure and efficient delivery plan (2026-10-03)\n\n' + summary
docs[HANDOFF] = f'''# HANDOFF — 2026-10-03 — Stream B Session35

จัดทำ: {STAMP} · §§2,5,6,9 · Change `{CHANGE}` · Request `{REQUEST}`

1. **Done:** updated the remaining architecture/priority plan to W1 Cart+Orders+transactions → W2 CLIENT+Label → W3 acceptance/release. All R01–R14/QA-A–L retained; six owner priorities applied in master §5.2.1 and linked rules. Active PLAN/HANDBOOK/STATE/README and stale reference corrected; historical Sessions1–34 preserved.
2. **Evidence / files:** docs-only; read local v31 source and dated Session34 evidence, no new live numbers. Full paths, backup/diff and checks: `{ROOT / '04 Design Tools/logs/PLAN-20261003-01/result.md'}`. Production remains last verified v31/deployment4 per `{ROOT / '04 Design Tools/logs/P1-20261003-03/result.md'}`.
3. **Decisions:** one writer/no agents; plan/checks before code, minimal scoped fix/backup, reproduce-root-cause-retest, verify/UI/failure-retry, actionable lessons. Shipping Cost=shop subsidy; Auction unavailable; CLIENT reused; Facebook off-label. No fresh deployment authorization inferred.
4. **Not done / risks:** W1/W2/W3 runtime not implemented in this docs task; no source/Sheet/deploy/LAB changes. First real P1 Add/DONE remains to observe when a real item is available; outage unproven and lost-ID recovery manual. No code suite rerun because code unchanged.
5. **Next / recovery:** W1.1 bounded transaction baseline/callers/headers, then W1 local+isolated implementation with failure/retry evidence. Restore docs from `{ROOT / '04 Design Tools/logs/PLAN-20261003-01/before'}` only after checking newer edits; preserve appended histories. Shop undo stays `{ROOT / '04 Design Tools/logs/P1-20261003-03/UNDO.md'}`.
'''
out = io.StringIO(newline='')
w = csv.writer(out, lineterminator='\n')
w.writerow(['2026-10-03', 'Adopt six delivery priorities: plan/checks; minimal scoped changes with backup; separately authorized agent roles; reproduce/root cause/retest; verify/UI and disclose gaps; actionable lessons/retire stale active rules', 'Stream B remaining-work plan and guidance', 'Explicit owner request; efficient complete user workflows, one writer, no automatic agents', 'CLOSED', 'PLAN; HANDBOOK; AGENTS; CLAUDE; master §5.2.1; STATE; README; Session35'])
docs[DECISIONS] += out.getvalue()

# Validate all transformations before the first document overwrite.
assert all('R%02d'%i in docs[PLAN] for i in range(1,15))
assert all('QA-'+c in docs[PLAN] for c in 'ABCDEFGHIJKL')
assert len(docs[STATE].splitlines()) <= 80
assert docs[STATE].split('### 2.')[1].split('## Environment')[0] == before[STATE].decode('utf-8-sig').replace('\r\n','\n').split('### 2.')[1].split('## Environment')[0]
assert not (HERE/'before').exists(), 'Already applied; do not overwrite original backup'

fields = ['timestamp','change_id','request_id','event','source','destination','before','after','result','error_retry','recovery']
rows = []
def event(kind, src, dst, old, new, result='PASS', issue='none', recovery='before/ + diff/'):
    rows.append(dict(zip(fields,[STAMP,CHANGE,REQUEST,kind,str(src),str(dst),old,new,result,issue,recovery])))

event('READ_RETRY', ROOT, ROOT, 'Long batched tool output truncated', 'Bounded reads retrieved required contracts', issue='Read-only retry; no mutation')
event('ARCHIVE_DRY_RUN', ROOT/'00 Docs', ROOT/'00 Docs', 'Historical plan/design/evidence referenced', 'Keep paths; supersession note only')
manifest = {'change_id': CHANGE, 'request_id': REQUEST, 'timestamp': STAMP, 'files': {}, 'source_unchanged': {}}
for name in ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs']:
    p=ROOT/'03 Apps Script/Web App'/name
    manifest['source_unchanged'][str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()

def persist_csv():
    with (HERE/'changes.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields); writer.writeheader(); writer.writerows(rows)

for n in NAMES:
    event('DRY_RUN', ROOT/n, ROOT/n, hashlib.sha256(before[n]).hexdigest(), 'targeted doc update; backup then write')
persist_csv()
for n in NAMES:
    p=ROOT/n; b=HERE/'before'/n; b.parent.mkdir(parents=True,exist_ok=True); b.write_bytes(before[n])
    if n in [IMPL,HISTORY,DECISIONS]:
        old_text=before[n].decode('utf-8-sig').replace('\r\n','\n')
        assert docs[n].startswith(old_text)
        payload=before[n]+docs[n][len(old_text):].replace('\n','\r\n').encode('utf-8')
    else:
        payload=docs[n].replace('\n','\r\n').encode('utf-8')
    p.write_bytes(payload)
    assert p.read_bytes()==payload
    diff=''.join(difflib.unified_diff(before[n].decode('utf-8-sig').splitlines(True),payload.decode('utf-8-sig').splitlines(True),fromfile='before/'+n,tofile=n))
    d=HERE/'diff'/(n.replace('/','__')+'.diff'); d.parent.mkdir(exist_ok=True); d.write_text(diff,encoding='utf-8')
    manifest['files'][n]={'before_sha256': hashlib.sha256(before[n]).hexdigest(),'after_sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload),'backup':str(b.relative_to(HERE)),'diff':str(d.relative_to(HERE))}
    event('COMMIT', p,p,manifest['files'][n]['before_sha256'],manifest['files'][n]['after_sha256'])
    persist_csv()

(HERE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'result.md').write_text(f'''# Session35 — remaining-work overview and plan update

จัดทำ: {STAMP} · Change `{CHANGE}` · Request `{REQUEST}`

Updated **12 related documents**. Execution board is W1 Cart/Orders/transactions → W2 CLIENT/Label → W3 acceptance/release; detailed contracts remain in PLAN. All 14 requirements and 12 QA gates retained. Closed shipping/Auction rules and current v31/P1 status propagated; runtime audit beyond Add remains future work. Six owner priorities are canonical in master §5.2.1, routed through AGENTS/CLAUDE. No source/business data/deployment/LAB change.

Before→after file list, absolute root and exact hashes: `manifest.json`, `changes.csv`; original bytes in `before/`, unified changes in `diff/`. Root: `{ROOT}`. Read-only long-output truncation was resolved by bounded reads; no failed edit, business retry or model switch. Prior P1 production state is dated Session34 evidence, not a fresh live check. Existing references retained; no archive move.

Verification command (from project root): `python "04 Design Tools/logs/PLAN-20261003-01/verify_docs.py"`; read `verification.txt` for actual result. No runtime suite required/reported as rerun for unchanged application files. The update script is a one-use documentation operation, not a runtime dependency.

Undo: compare the current file with its `after_sha256` before restoring only the intended document from `before/<relative path>`; preserve any newer edit. For appended history/decision files add a correction rather than discarding later events. This operation does not need production rollback; if separately required use P1-20261003-03/UNDO.md.

Next: W1.1 source/schema/caller delta and risk reproductions, then the bounded W1 candidate in the isolated project. P1 real Add observation happens when an actual item is available; no synthetic shop transaction.
''',encoding='utf-8')
event('EVIDENCE_CREATED', HERE, HERE, 'No Session35 package', 'update_docs.py; result.md; manifest.json; before/; diff/; changes.csv', recovery='Retain package; no runtime effect')
persist_csv()
print(json.dumps({'updated':len(NAMES),'state_lines':len(docs[STATE].splitlines()),'plan_lines_before':len(before[PLAN].splitlines()),'plan_lines_after':len(docs[PLAN].splitlines()),'handbook_lines_before':len(before[BOOK].splitlines()),'handbook_lines_after':len(docs[BOOK].splitlines())}))
