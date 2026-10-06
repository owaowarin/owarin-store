# SP-2 Implementation Checklist — ต้องแก้อะไรบ้าง (ละเอียดรายไฟล์)

> คู่กับ `suggested-price-redesign_SP2.md` (design) · อ้างโค้ดจริง: Code.gs v16 + WebApp.gs (P2, plan v4.1)
> พารามิเตอร์ข้อ 8 **ล็อกแล้วตาม default ทั้ง 10 ข้อ** (ตารางท้ายเอกสาร)
>
> **สถานะ 26 ก.ค. 2026: โค้ดทั้ง 3 ไฟล์ (Code.gs v17 / WebApp.gs / Index.html) เขียนเสร็จ + ทดสอบกับข้อมูลจริง 1,295 แถวแล้ว** — ไฟล์เดิมสำรองไว้ที่ `Web App/backup/` · ผลรันจริงบน Instock 466 เล่ม: auto 88% (EXACT 131 · TITLE-PUB 14 · TITLE 40 · CURVE 225) · REVIEW 47 · MANUAL 3 · ไม่มีสภาพ 6 · **audit พบของตั้งราคาต่ำกว่า target >20% = 53 เล่ม** · เหลือแค่ขั้น deploy (§6 ข้อ 3 เป็นต้นไป)

---

## 0) เรื่องการแก้ Google Sheet โดยตรง

| ช่องทาง | ทำได้? | หมายเหตุ |
|---|---|---|
| Claude อ่านชีตจริง (live) | ✅ ทดสอบแล้ว | ผ่าน Google Drive connector — ใช้ตรวจผลหลัง deploy ได้เลย |
| Claude แก้เซลล์/โครงสร้างชีตตรง ๆ | ❌ | connector มีแต่ read/create ไม่มี edit cell |
| Claude แก้ผ่าน Chrome (คลิกในเบราว์เซอร์) | ⚠️ ได้แต่ไม่แนะนำ | ช้า เสี่ยงพลาด ไม่เหมาะกับงาน bulk |

**ทางที่ใช้:** ผมเขียนโค้ดทั้งหมดลงไฟล์ในโฟลเดอร์ `Web App/` → OWARI copy วางทับใน Apps Script (2 ไฟล์, ~2 นาที) → การแก้ *ชีต* ทั้งหมด (เพิ่มคอลัมน์ ฯลฯ) ให้ฟังก์ชัน `sp2Setup()` ทำเองอัตโนมัติ — ไม่มีการแก้ชีตด้วยมือแม้แต่ช่องเดียว และผมอ่านชีตจริงตรวจความถูกต้องให้หลังรัน

**แบ่งงานทั้งหมด:** ผมเขียน Code.gs v17 + WebApp.gs ใหม่ + แก้ Index.html · OWARI ทำแค่ 3 อย่าง: (1) วางไฟล์ทับ (2) รัน `sp2Setup()` 1 ครั้ง (3) **ส่งไฟล์ Index.html จาก Apps Script มาไว้ในโฟลเดอร์ `Web App/` ก่อน** — เป็นไฟล์เดียวที่ผมยังไม่เห็น (ในโฟลเดอร์มีแค่ Code.gs / WebApp.gs) แก้ UI ให้ไม่ได้จนกว่าจะได้ไฟล์

---

## 1) ภาพรวม: แตะ 4 ที่

1. **ชีต GGB** — เพิ่ม 6 คอลัมน์ (อัตโนมัติผ่าน `sp2Setup()`)
2. **Code.gs → v17** — เปลี่ยนไส้ pricing ทั้งหมด (จุดเดียวที่ระบบอื่นไม่กระทบ: SKU/RESTOCK/derived/MAGAZINE คงเดิม)
3. **WebApp.gs** — ขยาย API รับ field ใหม่ + แก้ flow บันทึกการขาย (จุดที่ OWARI ใช้ทุกวัน)
4. **Index.html** — ฟอร์ม/การ์ด/หน้า Review (รอไฟล์)

---

## 2) ชีต GAME GUIDE BOOKS — คอลัมน์ใหม่ (sp2Setup ทำให้)

| หัวคอลัมน์ | ใช้ทำอะไร | ค่าของแถวเก่า |
|---|---|---|
| `Listed Date` | จุดเริ่มนับ velocity | **เว้นว่าง** (ห้าม backfill มั่ว — ว่าง = VelAdj 1.0) |
| `Copy Flags` | ตัวคูณเฉพาะเล่ม (POSTER/FC/STAMP/NAME/TAPE) | ว่าง = ไม่มี flag |
| `Rarity` | R1/R2/R3 | ว่าง = R3 |
| `Market Ref` | ราคาอ้างอิงตลาดภายนอก (ตัวเลข) | ว่าง |
| `Ref Note` | ที่มาของ Market Ref | ว่าง |
| `Price Range` | ช่วงราคา + ราคาเปิด เช่น `250–330 · เปิด 330` | เติมตอนรัน SP-2 |

- ใช้ `_ensureHeader()` ที่มีอยู่แล้วใน WebApp.gs (P5) — idempotent รันซ้ำได้ ไม่พังของเดิม
- **ข้อค้นพบ:** ชีตจริงไม่มีคอลัมน์ `Max G Ref` → ref string ที่ v14.3 พยายามเขียน **หายเงียบมาตลอด** (โค้ดเช็ค `COL.maxGRef` แล้วข้าม) — sp2Setup จะเพิ่ม `Max G Ref` ให้ด้วย เหตุผลของทุกราคาจะโผล่ครั้งแรก
- MAGAZINE: ไม่แตะ

---

## 3) Code.gs → v17 (รายฟังก์ชัน)

**CONFIG ใหม่ (บนสุด):** `SP2` object รวมพารามิเตอร์ล็อกแล้วทั้ง 10 ข้อ — แก้ที่เดียว

**HEADER_MAP:** เพิ่ม `"listed date"`, `"copy flags"`, `"rarity"`, `"market ref"`, `"ref note"`, `"price range"` (ของเดิมครบแล้ว)

| ฟังก์ชัน | ทำอะไร |
|---|---|
| 🆕 `sp2Setup()` | เพิ่ม 7 หัวคอลัมน์ (6 ใหม่ + Max G Ref) บน GGB + รายงานผล — รันครั้งเดียว |
| ♻️ `_buildSoldIndex` → 🆕 `_sp2BuildIndexes(data, COL)` | สร้างครั้งเดียวใช้ทั้งชีต: comp index 3 ชั้น (exact / base+pub / base) เก็บ `{cond, price, soldDate, listedDate}` · curve table (publisher×platform ≥8 → publisher → platform → global 2.7×) · auction floor (max ราคาจบต่อ title — เป็นพื้น ไม่ใช่ comp) · fast-streak ต่อ title (นับ ratchet) — **Sold เท่านั้น Auction ไม่เข้า comp เหมือนเดิม** |
| ♻️ `_calcGGBSoldPrice` → 🆕 `_sp2PriceGGB(item, idx)` | pipeline 6 ขั้นตาม design §4.2: comps→A-equiv (÷CondMult ×VelAdj)→weighted median (recency)→guard ล่าสุด→×CondMult×Flags→max(MarketRef)→cost floor→rare check → คืน `{price, min, max, open, tier, review, refStr}` |
| ✏️ `_calcSuggestedPrice` | **เปลี่ยน signature เป็น object เดียว** `(itemObj, sheetName, idx)` — GGB เรียก `_sp2PriceGGB`, MAGAZINE สูตรเดิมเป๊ะ · จุดเรียกที่ต้องตามแก้มี 4 ที่: `_recalcSuggestedPrice` / `addEntryFromSidebar` / `fillAllSuggestedPrices` / `_toolsFillSuggested` (WebApp.gs) |
| ✏️ `_recalcSuggestedPrice` | อ่าน field เพิ่ม (flags/rarity/marketRef/listedDate) · เขียน 3 ช่อง: `Suggested` = target (REVIEW → เว้นว่าง + พื้นหลังส้ม), `Price Range`, `Max G Ref` = tier+เหตุผล |
| ✏️ `onEdit` | inputCols += copyFlags/rarity/marketRef (แก้แล้วคำนวณใหม่) · **Listed Date auto:** แก้ชื่อบนแถวที่ listedDate ว่างและยังไม่ Sold/Auction → ประทับวันที่ (แถวคีย์มือในชีตก็ได้ velocity) · Sold Date เดิมคงอยู่ |
| ✏️ `addEntryFromSidebar` | ประทับ `Listed Date = now` ทุกครั้ง · รับ `flags/rarity/marketRef` จาก payload (optional) · เขียน Range/Ref ด้วย |
| ✏️ `fillAllSuggestedPrices` | ใช้ indexes ใหม่ · สรุปนับต่อ tier: EXACT / TITLE-PUB / TITLE / CURVE / REF / REVIEW / MANUAL |
| 🆕 `sp2AuditUnderpriced()` | **P1.5 เก็บเกี่ยวทันที:** Instock ที่ Price ปัจจุบัน < target×0.8 → รายงาน "ของกำลังจะขายถูก" + ระบายสีช่อง Price |
| 🆕 `sp2ReviewQueue()` | รายการ REVIEW ค้างเคาะ (คาด ~16–20 เล่ม) |
| ✏️ `onOpen` | เพิ่มเมนู: SP-2 Setup · Audit ราคาต่ำ · Review Queue |

**พฤติกรรม velocity/ratchet:** ฝังใน `_sp2PriceGGB` เลย — comp ไหนไม่มี listedDate → VelAdj 1.0 อัตโนมัติ ดังนั้น **P2 ไม่ต้องกดเปิด** ระบบแรงขึ้นเองเมื่อข้อมูลวันที่สะสม (self-activating)

---

## 4) WebApp.gs (รายจุด)

| จุด | แก้อะไร |
|---|---|
| `_INV_KEYS` | += `listedDate, copyFlags, rarity, marketRef, priceRange, maxGRef` → client เห็นครบ |
| `_EDITABLE` / `_NUMERIC` | += `copyFlags, rarity, marketRef` (numeric: marketRef) → แก้จากหน้าเว็บได้ |
| `_apiInvAdd` | forward field ใหม่เข้า `addEntryFromSidebar` |
| `_apiInvUpdate` | ยกเลิก Sold → ล้าง Sold Date (มีแล้ว ✓) · **เคาะ: กลับมา Instock ไม่ reset Listed Date** (นับอายุรวม — ตรงความจริงกว่า) |
| `_apiMarkSold` + `_apiSalesConfirm` | **จุดสำคัญสุดของ flow ขาย:** payload เพิ่ม `channel` (SHOP/SHOPEE/FB) — ถ้า SHOPEE ราคาที่กรอกคือหน้าร้าน Shopee → แปลงกลับฐานหน้าร้านก่อนเขียน Price: `base = ราคา÷1.2 − 50` (ผกผันของสูตร Market Place เป๊ะ) · Note ใน SALES = `SKU · channel` · Sold Date เดิม ✓ (Listed Date มีอยู่แล้วในแถว → days-to-sell ครบวงจรอัตโนมัติ) |
| `_toolsFillSuggested` | เรียก `_sp2BuildIndexes` + signature ใหม่ · คืน count ต่อ tier ให้ UI |
| `_route` | actions ใหม่: `tools.sp2Setup` · `tools.auditUnderpriced` · `inventory.reviewQueue` |

---

## 5) Index.html (รอไฟล์ — รายการที่จะแก้)

1. **ฟอร์ม Add:** chips เลือก Copy Flags · dropdown Rarity (default R3) · ช่อง Market Ref + Ref Note (ยุบอยู่ใต้ "ของหายาก?")
2. **การ์ด/ตารางสินค้า:** Suggested แสดงเป็น `target · ช่วง min–max · เปิด open` + ป้าย tier (EXACT/CURVE/…) + badge 🔶 REVIEW
3. **Mark Sold / ตะกร้า:** ปุ่มเลือก channel (หน้าร้าน/Shopee/FB) — เลือก Shopee แล้วโชว์ราคาแปลงฐานให้เห็นก่อนยืนยัน + แสดง "อยู่บนเชลฟ์ X วัน"
4. **แท็บใหม่ "REVIEW":** คิวของหายากรอเคาะราคา + ปุ่มรัน Audit ราคาต่ำ
5. ปุ่ม tools ใหม่ในหน้า Tools

> ผลต่อการทำงานประจำวัน: **การกรอกขายเพิ่มขึ้นแค่ 1 จังหวะ = แตะเลือก channel** ที่เหลือ (Listed/Sold Date, แปลงราคา, days-to-sell, ratchet) อัตโนมัติทั้งหมด · การลงของใหม่เพิ่ม ~5 วินาที เฉพาะเล่มที่มี flag/หายาก

---

## 6) ลำดับปฏิบัติ (ตามนี้เป๊ะ)

- [x] **1. OWARI:** copy ไฟล์ `Index.html` จาก Apps Script → วางในโฟลเดอร์ `Web App/` ✓
- [x] **2. Claude:** เขียน `Code.gs` (v17) + `WebApp.gs` + `Index.html` ฉบับแก้ ลงโฟลเดอร์ ✓ (syntax check + รัน engine กับข้อมูลจริงผ่านแล้ว)
- [x] **3. OWARI:** วางทับ 3 ไฟล์ + รัน `sp2Setup()` + Suggested Price (SP-2) ✓ (26 ก.ค.)
- [x] **4. Claude:** ตรวจชีตจริง ✓ — คอลัมน์ครบ 7 คอลัมน์ · Price Range/Max G Ref ติดทุกแถว · MAGAZINE ไม่ถูกแตะ · **เจอบั๊ก curve ปกแพง → แก้เป็น v17.1 (band-aware)**
- [ ] **5. OWARI (รอบ 2):** วางทับ `Code.gs` (v17.1) → Save → กด "Suggested Price (SP-2)" อีกครั้ง
  - ผลที่ควรได้: EXACT 131 · TITLE-PUB 14 · TITLE 39 · CURVE 235 · REVIEW 35 · MANUAL 6 · ไม่มีสภาพ 6 → **auto 419/466 (90%)**
  - target สูงสุดเหลือ ฿670 (เดิมมี ฿3,470 ซึ่งไม่สมเหตุสมผล)
- [ ] **5.1 แก้ SKU ซ้ำ 2 ตัว** (บั๊กเก่า ไม่เกี่ยวกับ SP-2): `OWA-GGBB012YKAR02` (Biohazard 2 Incl. 2 Maps RESTOCK-01/02) และ `OWA-GGBF011YKAR01` — วิธีแก้: เปิด Edit เล่มนั้นในเว็บแล้ว Save (SKU สร้างใหม่อัตโนมัติ) หรือรัน "ตรวจสอบ Product ID" เพื่อดูตำแหน่ง
- [ ] **6. รัน Audit (🚨)** → รายการ 53 เล่มที่ตั้งราคาต่ำกว่า target >20% เช่น Biohazard Series สีทั้งเล่ม ฿510→฿840 · Dragon Quest IX ฿330→฿540 → ไล่ปรับ (นี่คือกำไรก้อนแรกของระบบ)
- [ ] **7. เคลียร์ Review Queue** รอบแรก (~47 เล่ม จากการรันจริง — ส่วนใหญ่กลุ่ม Biohazard/ของแพง) — เล่มไหนรู้ว่าหายากใส่ R1 + Market Ref ไปเลย
- [ ] **8. Deploy › Manage deployments › New version** → ใช้งานจริง
- [ ] **9. (เดือนถัดไป)** ดูรายงาน: % ขายหลุด ≤7 วันควรเริ่มลด · เล่ม RESTOCK ของ title ขายเร็วต้องเห็นราคาขยับขึ้นเอง

**สิ่งที่ต้องทำต่อเนื่อง (วินัย 2 ข้อเท่านั้น):** ราคาขายจริงบันทึกฐานหน้าร้านเสมอ (ระบบแปลง Shopee ให้ ถ้าเลือก channel ถูก) · อย่า backfill Listed Date ย้อนหลัง

---

## 7) พารามิเตอร์ข้อ 8 — ล็อกแล้ว (ตาม default ทุกข้อ)

| # | ค่า | ล็อก |
|---|---|---|
| 1 | CondMult | S 1.30 (ขั้นต่ำ +฿50) / A 1.00 / B 0.85 / C 0.65 / D 0.45 |
| 2 | Fast sale | ≤7 วัน → VelAdj ×1.20 (8–60 ×1.00 · 61–180 ×0.95 · >180 ×0.90 · ไม่มีวันที่ ×1.00) |
| 3 | Ratchet | fast 2 ครั้งติด → open +20% · cap ครั้งละ +20% · ถอยเมื่อค้าง >60 วัน |
| 4 | Recency | ≤12 เดือน 1.0 · 13–24 เดือน 0.5 · >24 เดือน 0.25 |
| 5 | Cost floor | ×1.5 → ต่ำกว่า = ป้าย COST-FLOOR ให้คนเคาะ |
| 6 | Rare REVIEW | TitleBase ≥ ฿400 หรือ R1 หรือขายล่าสุด >24 เดือน |
| 7 | Range | 0.9–1.2× (rare ขอบบน 1.3×) · เปิดขอบบนเมื่อ hot/rare |
| 8 | Curve | bucket ขั้นต่ำ n=8 · fallback pub → platform → global 2.7× |
| 9 | Auction | ไม่เป็น comp · ใช้เป็นหลักฐานพื้นเท่านั้น (เปิด) |
| 10 | Flags | POSTER +10% · FC สีทั้งเล่ม +15% · STAMP ตราปั๊มเช่า −10% · NAME เขียนชื่อ −5% · TAPE ปกซ่อม −10% |

การตัดสินใจย่อยที่เคาะให้แล้ว: REVIEW = Suggested เว้นว่าง+พื้นส้ม (ตัวเลขเต็มอยู่ใน Range/Ref) · relist ไม่ reset Listed Date · Shopee inverse = ÷1.2−50 · MAGAZINE ไม่แตะทั้ง version นี้

> **พร้อมเริ่มข้อ 1 ทันที** — ส่ง Index.html มา แล้วผมเขียนโค้ดทั้งชุดให้เลย
