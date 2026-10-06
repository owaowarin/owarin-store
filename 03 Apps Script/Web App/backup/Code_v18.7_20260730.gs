// ============================================================
// OWARIN INVENTORY AUTOMATION SYSTEM v18.6 (SP-2 Pricing Engine · ทุกชีตมาตรฐานเดียว)
// v18.6 — รองรับชีตที่เป็น "ตาราง (Table)" ของ Google Sheets
//   Table ล็อกประเภทคอลัมน์ไว้ → Apps Script เขียนค่า/สูตร/dropdown ทับบางคอลัมน์ไม่ได้
//   ("This operation is not allowed on cells in typed columns")
//   เดิมเจอ error แล้วหยุดกลางคัน งานที่เหลือไม่ได้ทำ · ตอนนี้ทุกจุดที่เขียนลงชีตห่อ _tryWrite
//   → ข้ามเฉพาะจุดที่ทำไม่ได้ ทำต่อจนจบ แล้วสรุปท้ายว่าอะไรเขียนไม่ได้ + วิธีแก้ถาวร
//   วิธีแก้ถาวร: คลิกขวาในตาราง → Convert to range (ข้อมูล/สี/ฟิลเตอร์อยู่ครบ)
// v18.4 — Gross Profit 2 ฝั่ง (หน้าร้าน / Shopee) · auto-rarity จากราคาขายจริง · dropdown จากข้อมูล
// v18.3 (SP-2 Pricing Engine · ทุกชีตมาตรฐานเดียว)
// v18.3 — Market Place Price (ราคาลง Shopee) กลับมาเป็นคอลัมน์ที่มองเห็น วางถัดจาก Price
//   · สูตรใหม่แบบ gross-up: (Price + ค่าส่ง 50) ÷ (1 − fee 30%) ปัดขึ้น ฿10
//     เดิม ×1.2 ซึ่งถ้า fee จริง 30% จะขาดทุนทุกเล่ม (Price 500 เคยขาด ฿88)
//   · Gross Profit เลิกซ่อน — โชว์กำไรบาท + กำไรกี่ % ของต้นทุน
//   · ค่าธรรมเนียม/ค่าส่งแยกเป็น config: SHOPEE_FEE · SHOPEE_SHIP · SHOPEE_MIN
// v18.2 — sort: "I-II" แปลงเป็นเลข (Final Fantasy I-II ต่อจาก I) · X-Men ไม่โดนกระทบ
// v18.1 — sort: RESTOCK เกาะกลุ่มเล่มแม่เสมอ (เดิมภาคต่อแทรกกลาง)
// v18   — MAGAZINE ใช้ SP-2 เหมือน GAME GUIDE BOOKS (ลบสูตร publisher-aware v13 ทิ้ง)
//   · engine ตัวเดียวกันเป๊ะ ต่างแค่พารามิเตอร์ 3 ตัวตามสเกลราคาที่ต่างกัน 5 เท่า
//     GGB: ช่วงราคาปก 50/100/200/400 · REVIEW ≥ ฿400
//     MAG: ช่วงราคาปก 25/50/100/200 · REVIEW ≥ ฿150  (p90 ของราคาขายจริงแต่ละหมวด)
//   · ทุกฟังก์ชัน SP-2 รับ sheetName แล้ว (setup/layout/flags/fill/apply/audit/review)
//   · เหตุผลที่ต้องเปลี่ยน: สูตรเดิมของ MAGAZINE ไม่เคยดูราคาขายจริงเลย →
//     ขายที่ราคา suggested แค่ 18% (GGB 77%) แปลว่าต้องแก้ราคาด้วยมือแทบทุกเล่ม
//     และข้อมูลจริงชี้ว่านิตยสารปกแพงขายได้ "ต่ำกว่าราคาปก" (51–100 = 0.6× · 201+ = 0.5×)
//     ซึ่งสูตรเดิมมองไม่เห็น แต่ band-aware curve จับได้พอดี
// ------------------------------------------------------------
// v17.5 (SP-2 Pricing Engine)
// v17.5 — เกณฑ์ REVIEW: ของแพง (ฐาน ≥ ฿400) เข้า REVIEW เฉพาะเมื่อ "หลักฐานอ่อน"
//         หลักฐานแน่น = comp ชั้น EXACT ตั้งแต่ 3 ใบ → ระบบตั้งราคาเองได้ (ติดโน้ต ✔หลักฐานแน่น)
//         เดิมของแพงเข้า REVIEW ทุกกรณี ทำให้กลุ่มที่ขายซ้ำราคาเดิมหลายรอบรก REVIEW โดยไม่ได้ข้อมูลเพิ่ม
// v17.4 — [1] Copy Flags เติมอัตโนมัติทันทีที่พิมพ์ชื่อ (ทั้งในชีตและในเว็บแอป)
//         [2] Dropdown ในชีต: Status · Condition · Rarity (data validation)
//         [3] Price Range เป็นภาษาอังกฤษ: "350 · range 320–420"
//         [4] ล้าง dead code: OWARIN WEB INFO (ไม่มีชีตนี้แล้ว) · Sidebar ทั้งชุด
//             (ใช้เว็บแอปแทน) · คอลัมน์ "Copy No" ที่ไม่มีในชีต · เมนูจัดกลุ่มใหม่
// v17.3 — [1] Price Range เป็นคอลัมน์ราคาแนะนำหลักแทน Suggested Price
//             format ใหม่ "330 · ช่วง 250–330" (เลขแรก = เอาไปตั้งขายเลย · 🔥 = ขายเร็ว)
//             Suggested Price ย้ายไปกลุ่มซ่อน (ยังคำนวณอยู่ — เว็บแอป/Apply ใช้เป็นเลขระบบ)
//             สีส้ม REVIEW ย้ายไปติดที่ Price Range
//         [2] sp2MigrateFlags(): กรอก Copy Flags อัตโนมัติจากชื่อ (Incl. N Maps → POSTER ·
//             สีทั้งเล่ม → FC · โปสเตอร์ → POSTER) เติมเฉพาะช่องว่าง · ชื่อ/SKU ไม่ถูกแตะ
//         [3] Engine: comp ถูก normalize ด้วย Copy Flags ด้วย (A_equiv = ราคา ÷ สภาพ ÷ flags)
//             → กลุ่มที่ราคารวมพรีเมียมแผนที่อยู่แล้วจะไม่โดนบวก +10% ซ้ำ
// v17.2 — [1] sp2Layout(): จัดลำดับคอลัมน์ (สินค้า→ราคา→หลักฐาน→เวลา) ด้วย moveColumns
//             (สูตรย้ายตามถูกต้อง) · ซ่อนคอลัมน์สูตร/ระบบ + คอลัมน์ว่าง ·
//             ใส่ note อธิบายทุกหัวคอลัมน์ · ตรึงหัว 2 แถว + ตรึงคอลัมน์ชื่อ
//         [2] sp2PreviewApply() / sp2ApplySuggested(): เอาราคา SP-2 ไปเขียนช่อง Price
//             เฉพาะ Instock · ข้าม REVIEW/MANUAL · มีพรีวิวก่อนเขียนทุกครั้ง
// v17.1 — แก้จากผลรันจริงบนชีต: curve แยกตาม "ช่วงราคาปก" (cover band)
//   ข้อมูลจริงชี้ว่าตัวคูณลดตามราคาปก (≤50 = 6.0x · 51–100 = 3.1x · 101–200 = 1.9x · 401+ = 0.7x)
//   เดิมเฉลี่ยรวมทุกช่วง → ปกแพงได้ราคาเว่อร์ (ปก ฿1,300 → ฿3,470)
//   ใหม่: bucket = pub×plat×band → pub×band → plat×band → band · ไม่มีข้อมูลในช่วงนั้น = ไม่เดา
//   แต่เข้า REVIEW พร้อม "ราคาอ้างอิงของช่วงปกนั้น" ให้คนเคาะ
// v17 (SP-2 — ตาม suggested-price-redesign_SP2.md + SP2-implementation-checklist.md):
//   [1] แทนที่ pricing core ทั้งหมด: _buildSoldIndex/_calcGGBSoldPrice/CONDADJ →
//       _sp2BuildIndexes + _sp2CalcGGB (pipeline 6 ขั้น: comp ladder T1–T6 ·
//       A-normalization · velocity · recency · guards · range output)
//   [2] sp2Setup(): เพิ่มคอลัมน์ Listed Date / Copy Flags / Rarity / Market Ref /
//       Ref Note / Price Range / Max G Ref อัตโนมัติ (ใช้ slot "Column N" ว่างก่อน)
//   [3] onEdit: Listed Date อัตโนมัติเมื่อเพิ่มชื่อแถวใหม่ · input cols เพิ่ม flags/rarity/ref
//   [4] sp2AuditUnderpriced(): หา Instock ที่ราคาต่ำกว่า target >20% (P1.5)
//   [5] sp2ReviewQueue(): คิวของหายากรอเคาะ (REVIEW)
//   [6] MAGAZINE: สูตร publisher-aware v13 เดิมเป๊ะ · SKU/RESTOCK/derived เดิมทุกตัว
//   Velocity self-activating: comp ไม่มี Listed Date → VelAdj ×1.0 อัตโนมัติ
// ------------------------------------------------------------
// v16: sheetName-aware + LockService + _recalcRow + Sold Date auto
// v15: fixDerivedFormulas() — สูตรต่อแถว Market Place / Gross Profit / Price Content Lists
// v14.x: natural sort · autoformat filename-safe
// ============================================================

// ───────────────────────── CONFIG ─────────────────────────
var GGB_SHEET = "GAME GUIDE BOOKS";
var MAG_SHEET = "MAGAZINE";

// ปิด/เปิดการคำนวณราคาอัตโนมัติตอนแก้เซลล์
var AUTO_PRICE_ON_EDIT = true;

// ───────────────── P3 SETTINGS ─────────────────
var SHIP_BASE = 50, SHIP_STEP = 10, SHIP_CAP = 100;

// ───────── v18.3: ราคาขายบน Marketplace (Shopee) ─────────
// ตั้งราคาแบบ "gross-up" เพื่อไม่ขาดทุน: หลังโดนหักค่าธรรมเนียมแล้วต้องเหลือ Price + ค่าส่ง พอดี
//   ราคาตั้งขาย = (Price + ค่าส่ง) ÷ (1 − fee)   [ไม่ใช่ ×1.3 ซึ่งจะเหลือไม่ถึง]
//   เช็ค: Price 300 → (300+50)/0.7 = 500 · Shopee หัก 30% = 150 → เหลือ 350 = 300 + ค่าส่ง 50 ✔
var SHOPEE_FEE  = 0.30;   // ค่าธรรมเนียม platform (สัดส่วนของ "ราคาที่ตั้งขาย")
var SHOPEE_SHIP = 50;     // ค่าส่งที่รวมอยู่ในราคาขาย marketplace
var SHOPEE_MIN  = 60;     // ราคาตั้งขายขั้นต่ำ
var ORDER_PREFIX = "OWA";
var SALES_SHEET  = "";

var BANK_INFO = {
  no:      "2143623532",
  bank:    "KBANK กสิกรไทย",
  account: "Tananont A."
};

// ───────────────── SP-2 PRICING PARAMETERS (ล็อกตาม design §8) ─────────────────
var SP2 = {
  // ตัวคูณสภาพ (ฐาน = A)
  COND_MULT: { S: 1.30, A: 1.00, B: 0.85, C: 0.65, D: 0.45 },
  S_MIN_PREMIUM: 50,                     // S ต้อง ≥ ฐานA + ฿50
  // VelAdj: [วันสูงสุดของช่วง, ตัวคูณ] — ขายเร็ว = ราคานั้นต่ำกว่าตลาด
  VEL_BANDS: [[7, 1.20], [60, 1.00], [180, 0.95], [999999, 0.90]],
  FAST_DAYS: 7,
  FAST_STREAK_N: 2,                      // ขายเร็วติดกันกี่ครั้ง → เปิดขอบบน (ratchet)
  // Recency weight: [อายุเดือนสูงสุด, น้ำหนัก] · ไม่รู้วันขาย = 0.5
  REC_BANDS: [[12, 1.0], [24, 0.5], [999999, 0.25]],
  REC_UNKNOWN: 0.5,
  COST_FLOOR_MULT: 1.5,
  REVIEW_BASE: 400,                      // ฐานA ≥ นี้ → REVIEW (มนุษย์เคาะ)
  // v17.5: ของแพงที่ "หลักฐานแน่น" ไม่ต้องเข้า REVIEW — เข้าเมื่อหลักฐานอ่อนเท่านั้น
  //   หลักฐานแน่น = comp ชั้น EXACT (ตรงชื่อ+สำนักพิมพ์+ราคาปก) ตั้งแต่ 3 ใบขึ้นไป
  //   เหตุผล: ขายไตเติลเดิมซ้ำ ๆ ที่ราคาเดียวกันหลายรอบ = ตลาดยืนยันแล้ว คนดูซ้ำไม่ได้ข้อมูลเพิ่ม
  STRONG_COMP_N: 3,
  REVIEW_STALE_MONTHS: 24,               // ขายล่าสุดเก่ากว่านี้ → REVIEW
  RANGE_LO: 0.9, RANGE_HI: 1.2, RANGE_HI_RARE: 1.3,
  CURVE_MIN_N: 8,                        // ขั้นต่ำต่อ bucket ของ curve
  // v17.1: ตัวคูณราคาปกไม่คงที่ — ข้อมูลจริงชี้ว่ายิ่งปกแพง ตัวคูณยิ่งต่ำ
  //   ปก≤50 = 6.0x · 51–100 = 3.1x · 101–200 = 1.9x · 401+ = 0.7x
  //   ดังนั้น curve ต้องแยกตาม "ช่วงราคาปก" และ **ห้าม extrapolate ข้ามช่วง**
  //   (ไม่งั้นปกแพงจะได้ราคาเว่อร์ เช่น ปก ฿1,300 × 2.7 = ฿3,470)
  COVER_BANDS: [50, 100, 200, 400],      // ขอบบนของแต่ละ band · เกิน 400 = band สุดท้าย
  BANDREF_MIN_N: 2,                      // ขั้นต่ำที่จะโชว์ราคาอ้างอิงของ band ให้มนุษย์ดู
  PUBFACTOR_CLAMP: [0.5, 2.0],           // กรอบปรับข้ามสำนักพิมพ์ (T3)
  FLAGS: { POSTER: 1.10, FC: 1.15, STAMP: 0.90, NAME: 0.95, TAPE: 0.90 },
  MIN_PRICE: 30, ROUND: 10,
  USE_AUCTION_FLOOR: true,               // ราคาจบ Auction = พื้น (ไม่ใช่ comp)
  RANGE_HI_R2: 1.25,                     // v18.4: R2 ขยายขอบบนเล็กน้อย (ไม่ดันราคากลาง)
  // ── v18.4: เกณฑ์ auto-rarity ──
  //   วัดจาก 2 อย่างที่ไม่โดนต้นทุนกวน: (1) ราคาขายจริงเทียบทั้งชีต (percentile)
  //   (2) ราคาขายเทียบ "เพื่อนร่วมกลุ่ม" = สำนักพิมพ์เดียวกัน × ช่วงราคาปกเดียวกัน
  //   ⚠️ ไม่ใช้ Gross Profit % เพราะข้อมูลจริงชี้ว่ามันวัด "ซื้อมาถูกแค่ไหน" ไม่ใช่ความหายาก
  //      (corr กับต้นทุน −0.56 · กับราคาขาย +0.09)
  RARITY: { R1_PCTL: 0.95, R2_PCTL: 0.85, R1_PEER: 1.8, R2_PEER: 1.4, PEER_MIN_N: 8 },
  // ── v18.7: จับ "Sold ที่น่าจะเป็น Auction แต่ลืมแก้สถานะ" ──
  //   เทียบเฉพาะเล่มที่ ชื่อฐาน + สำนักพิมพ์ + เครื่อง ตรงกันเท่านั้น (คนละเครื่อง = คนละตลาด)
  //   เทียบที่ "ฐานสภาพ A" (หารตัวคูณสภาพ + Copy Flags ออกก่อน) → เล่มสภาพแย่กว่าราคาต่ำกว่าถือเป็นเรื่องปกติ
  //   ต่ำกว่าเล่มสูงสุดในกลุ่มเกินเกณฑ์ = ราคาตกแบบไม่มีเหตุผล → น่าจะเป็นการประมูล
  AUCTION_SUSPECT: { RATIO: 0.6, MIN_PEERS: 2 }
};

// v18: ค่าที่ MAGAZINE ต่างจาก GGB (นอกนั้นใช้ของ SP2 ทั้งหมด)
//   ราคาขายจริง MAGAZINE: med ฿50 · p90 ฿150 · max ฿400  (GGB: med ฿260 · p90 ฿400)
var SP2_MAG = {
  COVER_BANDS: [25, 50, 100, 200],
  // ฿180 = เหนือ p95 ของราคาที่ระบบแนะนำ (p50 ฿100 · p75/p90 ฿150 · p95 ฿170 · max ฿1,220)
  //   ห้ามใช้ ฿150 เพราะเป็นก้อนกระจุกพอดี → จะดูด 26% ของสต๊อกเข้า REVIEW โดยไม่จำเป็น
  //   (GGB ใช้ ฿400 ≈ p93 ให้ REVIEW 7% — ตั้ง ฿180 เพื่อให้โปรไฟล์ใกล้กัน)
  REVIEW_BASE: 180,
  MIN_PRICE: 20                          // ของถูกกว่า พื้นราคาต่ำกว่าได้
};

var _sp2CfgCache = {};
// คืน config ของชีตนั้น (GGB = SP2 ตรง ๆ · MAG = SP2 + override)
function _sp2Cfg(sheetName) {
  if (sheetName !== MAG_SHEET) return SP2;
  if (_sp2CfgCache.MAG) return _sp2CfgCache.MAG;
  var c = {};
  for (var k in SP2) c[k] = SP2[k];
  for (var k2 in SP2_MAG) c[k2] = SP2_MAG[k2];
  _sp2CfgCache.MAG = c;
  return c;
}
var SP2_COLUMNS = ["Listed Date", "Copy Flags", "Rarity", "Market Ref",
                   "Ref Note", "Price Range", "Max G Ref", "Gross Profit MP"];

// ───────────── v17.2: LAYOUT — ลำดับคอลัมน์ · คอลัมน์ที่ซ่อน · คำอธิบายหัวคอลัมน์ ─────────────
// ลำดับ: สินค้า → ราคา → หลักฐาน → เวลา (คอลัมน์ที่ไม่อยู่ในลิสต์จะถูกดันไปท้ายสุด ไม่มีอะไรหาย)
var SP2_ORDER = [
  // ── สินค้า ──
  "Item name", "Product ID", "Status", "Condition", "Copy Flags", "Rarity",
  "Publisher", "Platform", "Genre",
  // ── ราคา ── (Price Range = ราคาแนะนำ · Market Place = ราคาลง Shopee · Gross Profit = กำไร+%)
  "Original", "Cost", "Price Range", "Price", "Gross Profit",
  "Market Place Price", "Gross Profit MP",
  // ── หลักฐาน ──
  "Market Ref", "Ref Note",
  // ── เวลา ──
  "Listed Date", "Sold Date",
  // ── ซ่อน (เลขระบบ/ข้อความยาว) — วางท้ายสุดให้พ้นสายตา ──
  "Suggested Price", "Price Content Lists", "Max G Ref", "Shopee Upload"
];
// คอลัมน์ที่ซ่อน = เลขระบบ + ช่องข้อความยาว (ดูได้ในเว็บแอป · เปิดคืนได้เสมอ)
var SP2_HIDE = ["Suggested Price", "Price Content Lists", "Max G Ref", "Shopee Upload"];
// v17.4: dropdown ในชีต — [ชื่อคอลัมน์, ตัวเลือก]
var SP2_DROPDOWNS = [
  ["Status",    ["Instock", "Sold", "Auction", "Hold", "Retake"]],
  ["Condition", ["S", "A", "B", "C", "D"]],
  ["Rarity",    ["R1", "R2", "R3", "NEW"]]
];
// v18.4: คอลัมน์ที่ทำ dropdown จาก "ค่าที่มีอยู่จริงในชีต" (ไม่ทับลิสต์ที่ตั้งเอง)
var SP2_DROPDOWNS_FROM_DATA = ["Genre", "Platform", "Publisher"];
// คำอธิบายที่จะติดเป็น note บนหัวคอลัมน์ (hover ในชีตแล้วเห็นเลย)
var SP2_NOTES = {
  "Item name":        "ชื่อสินค้า · ระบบเติม RESTOCK-NN เองเมื่อมีเล่มซ้ำ · ห้ามใช้ : กับ / (ระบบแปลงให้อัตโนมัติ)",
  "Product ID":       "SKU สร้างอัตโนมัติจาก ชื่อ+สำนักพิมพ์+สภาพ+เลข RESTOCK · ห้ามพิมพ์เอง",
  "Status":           "Instock = มีของ · Sold = ขายแล้ว (ระบบลง Sold Date ให้) · Auction = ขายโล๊ะ (ไม่ถูกนับเป็น comp ราคา) · Retake / Hold",
  "Condition":        "สภาพเล่ม S/A/B/C/D · ฐานราคาคือ A · ตัวคูณ S 1.30 / A 1.00 / B 0.85 / C 0.65 / D 0.45",
  "Copy Flags":       "จุดต่างของ 'เล่มนี้' (เว้นวรรคได้หลายอัน) — POSTER +10% (โปสเตอร์/แผนที่ครบ) · FC +15% (สีทั้งเล่ม) · STAMP −10% (ตราปั๊มร้านเช่า) · NAME −5% (เขียนชื่อ) · TAPE −10% (ปกซ่อม/เทป)",
  "Rarity":           "ระดับความต้องการ · เติมอัตโนมัติได้จากเมนู 💎 Auto Rarity (คิดจากราคาขายจริงเทียบทั้งชีต + เทียบเพื่อนสำนักพิมพ์เดียวกัน) · R1 = หายาก → บังคับ REVIEW ให้คนเคาะเอง · R2 = ดีกว่าค่าเฉลี่ย → ขยายขอบบนของช่วงราคา · R3 = ทั่วไป · NEW = ยังไม่เคยขายไตเติลนี้ ยังไม่มีข้อมูลตัดสิน",
  "Publisher":        "สำนักพิมพ์ · มีผลต่อทั้ง SKU และราคา (แต่ละเจ้าขายได้ตัวคูณต่างกันมาก)",
  "Platform":         "เครื่องเกม · มีผลต่อราคา (PS1 ขายได้สูงกว่า PS2 ราว 2 เท่าที่ราคาปกเท่ากัน)",
  "Genre":            "แนวเกม · ใช้จัดหมวด ไม่มีผลต่อราคา",
  "Original":         "ราคาปกหน้าเล่ม · ใช้เป็นฐานเมื่อไม่มีประวัติการขาย (คู่กับสำนักพิมพ์+เครื่อง+ช่วงราคาปก)",
  "Cost":             "ต้นทุนที่รับมา · ใช้เป็นพื้นราคา (ห้ามแนะนำต่ำกว่าทุน×1.5)",
  "Suggested Price":  "[เลขระบบ — ซ่อนไว้] target ตัวเลขเดียวของ SP-2 · เว็บแอปใช้เป็นราคา fallback ตอนใส่ตะกร้า/Mark Sold · ดูราคาแนะนำที่คอลัมน์ Price Range แทน",
  "Price Range":      "ราคาแนะนำ SP-2 · เลขแรก = เอาไปตั้งขายได้เลย · ตามด้วยช่วงที่รับได้ · 🔥 = ไตเติลนี้ขายหลุดเร็ว ราคาถูกดันขึ้น · พื้นส้ม REVIEW = ระบบไม่ตั้งให้ เคาะเองในช่วงที่แนะนำ",
  "Price":            "ราคาขายจริง/ราคาที่ตั้งขาย · **ฐานหน้าร้านเสมอ** ถ้าขายทาง Shopee ให้บันทึกผ่านเว็บแอปแล้วเลือก channel ระบบจะแปลงฐานให้",
  "Market Ref":       "ราคาอ้างอิงจากตลาดภายนอก (Shopee sold / กลุ่ม FB / eBay) · กรอกเมื่อเป็นของแพงที่ไม่มีประวัติขายในร้าน — เป็นจุดยึดที่ไม่ใช่ข้อมูลตัวเอง",
  "Ref Note":         "ที่มาของ Market Ref เช่น 'shopee sold 6/26' · ไว้ตรวจย้อนหลังว่าเลขนั้นมาจากไหน",
  "Listed Date":      "วันที่เริ่มลงขาย · ระบบใส่อัตโนมัติเมื่อเพิ่มของใหม่ · ใช้คู่กับ Sold Date คำนวณ 'กี่วันจึงขายได้' → ถ้าหลุดเร็ว ≤7 วัน ระบบถือว่าราคานั้นต่ำกว่าตลาดและดันราคาเล่มถัดไปขึ้น · ของเก่าเว้นว่างไว้ได้ ไม่กระทบการคำนวณ",
  "Sold Date":        "วันที่ขายได้ · ระบบใส่อัตโนมัติเมื่อเปลี่ยน Status เป็น Sold · เริ่มเก็บตั้งแต่ ก.ค. 2026 เป็นต้นไป (ของเก่าเว้นว่าง = ระบบให้น้ำหนักเท่ากันหมด ไม่เพี้ยน)",
  "Market Place Price": "[สูตร ห้ามพิมพ์ทับ] ราคาที่ต้องตั้งขายบน Shopee = (Price + ค่าส่ง 50) ÷ 0.7 ปัดขึ้น ฿10 · คิดแบบ gross-up เพื่อไม่ขาดทุน: หลัง Shopee หัก fee 30% แล้วจะเหลือเข้ากระเป๋าเท่ากับ Price + ค่าส่งพอดี (ถ้าใช้ ×1.3 จะเหลือไม่ถึง)",
  "Gross Profit":     "[สูตร ห้ามพิมพ์ทับ] กำไรขายหน้าร้าน = Price − Cost · ในวงเล็บคือกำไรกี่ % ของต้นทุน",
  "Gross Profit MP":  "[สูตร ห้ามพิมพ์ทับ] กำไรขายบน Shopee = (Market Place Price × 0.7 − ค่าส่ง 50) − Cost · ปกติจะใกล้เคียงกับ Gross Profit เพราะราคาถูก gross-up ไว้แล้ว · ถ้าตัวเลขต่างกันมาก แปลว่ามีคนแก้ Market Place Price ด้วยมือ",
  "Price Content Lists": "[สูตร ห้ามพิมพ์ทับ] ข้อความ 'ชื่อเรื่อง — ราคา' สำหรับก๊อปไปโพสต์ขาย",
  "Max G Ref":        "[ระบบเขียน] เหตุผลของราคาที่แนะนำ — บอกว่าใช้ comp ชั้นไหน ฐานสภาพ A เท่าไหร่ ปรับอะไรบ้าง ไว้ตรวจย้อนหลังทุกตัวเลข",
  "Shopee Upload":    "สถานะการอัปโหลดขึ้น Shopee (กรอกมือ)"
};
var SP2_REVIEW_BG = "#FFE0B2";           // พื้นหลังช่อง Suggested เมื่อ REVIEW
var SP2_AUDIT_BG  = "#FFCDD2";           // พื้นหลังช่อง Price เมื่อ underpriced

var _isEditRunning = false;
var _colCache = {}; // cache header→index ต่อ execution

// แม่แบบ map: ชื่อหัวคอลัมน์ (normalize แล้ว) → logical key
var HEADER_MAP = {
  "item name":            "name",
  "status":               "status",
  "publisher":            "publisher",
  "platform":             "platform",
  "genre":                "genre",
  "condition":            "condition",
  "original":             "original",
  "cost":                 "cost",
  "suggested price":      "suggested",
  "price":                "price",
  "market place price":   "marketplace",
  "gross profit":         "grossProfit",
  "gross profit mp":      "grossProfitMP",
  "gross profit (mp)":    "grossProfitMP",
  "gross profit shopee":  "grossProfitMP",
  "shopee upload":        "shopeeUpload",
  "product id":           "productId",
  "price content lists":  "priceContentLists",
  "max g ref":            "maxGRef",
  "sold date":            "soldDate",
  // ── SP-2 (v17) ──
  "listed date":          "listedDate",
  "copy flags":           "copyFlags",
  "rarity":               "rarity",
  "market ref":           "marketRef",
  "ref note":             "refNote",
  "price range":          "priceRange",
  // ── SALES sheet (P3) ──
  "order":                "order",
  "product":              "product",
  "order date":           "orderDate",
  "shiping cost":         "shipingCost",
  "shipping cost":        "shipingCost",
  "net profit":           "netProfit",
  "note":                 "note",
  // ── BOOKING sheet (P3) ──
  "booking name":         "bookingName",
  "game title":           "gameTitle",
  "queue":                "queue",
  // ── CONTENTS sheet (P5) ──
  "title":                "contentTitle",
  "contents":             "contents",
  "contents 2":           "contents2"
};

// ───────────── v18.6: SAFE WRITE (รองรับชีตที่เป็น Table ของ Google Sheets) ─────────────
// Google Sheets "Table" กำหนดประเภทให้คอลัมน์ (typed column) → Apps Script เขียนทับบางอย่างไม่ได้
//   จะโยน "This operation is not allowed on cells in typed columns."
// ทุกจุดที่เขียนลงชีตจึงผ่าน _tryWrite: ทำไม่ได้ก็ข้าม เก็บชื่อไว้รายงาน แล้วทำงานต่อจนจบ
var _SP2_WRITE_ERRORS = [];
function _sp2ResetWriteErrors() { _SP2_WRITE_ERRORS = []; }
function _tryWrite(label, fn) {
  try { fn(); return true; }
  catch (e) {
    var m = String((e && e.message) || e);
    var typed = m.indexOf("typed column") !== -1;
    _SP2_WRITE_ERRORS.push(label + (typed ? " ⛔ typed column" : " — " + m.slice(0, 70)));
    return false;
  }
}
// ข้อความท้าย alert เมื่อมีการเขียนที่ถูกบล็อก
function _sp2WriteErrMsg() {
  if (!_SP2_WRITE_ERRORS.length) return "";
  var uniq = [], seen = {};
  for (var i = 0; i < _SP2_WRITE_ERRORS.length; i++) {
    var k = _SP2_WRITE_ERRORS[i];
    if (!seen[k]) { seen[k] = 1; uniq.push(k); }
  }
  return "\n\n⛔ เขียนไม่สำเร็จ " + uniq.length + " จุด:\n  " + uniq.slice(0, 10).join("\n  ") +
         (uniq.length > 10 ? "\n  … อีก " + (uniq.length - 10) : "") +
         "\n\n💡 สาเหตุ: ชีตนี้เป็น \"ตาราง (Table)\" ของ Google Sheets ซึ่งล็อกประเภทคอลัมน์ไว้\n" +
         "   วิธีแก้ถาวร (ทำครั้งเดียว): คลิกที่ไอคอนตารางข้างชื่อชีต หรือคลิกขวาในตาราง\n" +
         "   → เลือก \"Convert to range\" (แปลงกลับเป็นช่วงปกติ) แล้วรันเมนูนี้ใหม่\n" +
         "   ข้อมูล สี ฟิลเตอร์ ยังอยู่ครบ — เสียแค่ป้ายชื่อ Table เท่านั้น";
}

// ───────────────────── v16: LOCK WRAPPER ─────────────────────
function _withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ───────────────────── COLUMN RESOLVER ─────────────────────
function _normHeader(h) {
  if (h === null || h === undefined) return "";
  return h.toString().replace(/\s+/g, " ").trim().toLowerCase();
}

function _resolveColumns(sheet) {
  var sid = sheet.getSheetId();
  if (_colCache[sid]) return _colCache[sid];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) { _colCache[sid] = {}; return {}; }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var COL = {};
  for (var c = 0; c < headers.length; c++) {
    var key = HEADER_MAP[_normHeader(headers[c])];
    if (key && !COL[key]) COL[key] = c + 1;
  }
  _colCache[sid] = COL;
  return COL;
}

function _val(row, COL, key) {
  var i = COL[key];
  return (i && i <= row.length) ? row[i - 1] : null;
}

// ── ลบเฉพาะ RESTOCK ออกจากชื่อ → base title ──
function _getBaseTitle(title) {
  if (!title) return "";
  var t = title.replace(/・RESTOCK-\d+/i, "");
  t = t.replace(/\s*\(RESTOCK-\d+\)/i, "");
  return t.trim();
}

// ============================================================
// [A] onEdit — v17: + Listed Date auto + input cols ใหม่
// ============================================================
function onEdit(e) {
  if (!e || !e.source) return;
  var sheet     = e.source.getActiveSheet();
  var range     = e.range;
  var sheetName = sheet.getName();

  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) return;
  if (range.getRow() < 3) return;
  if (_isEditRunning) return;
  _isEditRunning = true;

  try {
    var COL     = _resolveColumns(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 3) { _isEditRunning = false; return; }

    var editedCol  = range.getColumn();
    var currentRow = range.getRow();

    // คอลัมน์ที่ถือเป็น "input" (แก้แล้วต้องคำนวณใหม่)
    var inputCols = [COL.name, COL.status, COL.publisher, COL.platform,
                     COL.genre, COL.condition, COL.original, COL.cost,
                     COL.copyFlags, COL.rarity, COL.marketRef];
    var isInput = inputCols.indexOf(editedCol) !== -1;
    if (!isInput) { _isEditRunning = false; return; }

    // v17.4: พิมพ์ชื่อเสร็จ → เติม Copy Flags ให้อัตโนมัติ (เฉพาะช่องที่ยังว่าง)
    if (editedCol === COL.name && COL.copyFlags) {
      var cfCell = sheet.getRange(currentRow, COL.copyFlags);
      if (!(cfCell.getValue() || "").toString().trim()) {
        var autoFl = _sp2FlagsFromName((range.getValue() || "").toString());
        if (autoFl) cfCell.setValue(autoFl);
      }
    }

    // Status → Sold → เติม Sold Date อัตโนมัติ (ไม่ทับของเดิม)
    if (editedCol === COL.status && COL.soldDate) {
      var stVal = (range.getValue() || "").toString().trim();
      if (stVal === "Sold") {
        var sdCell = sheet.getRange(currentRow, COL.soldDate);
        if (!sdCell.getValue()) sdCell.setValue(new Date());
      }
    }

    // v17: แก้ชื่อบนแถวที่ยังไม่มี Listed Date และไม่ใช่ Sold → ประทับวันที่ลงขาย
    if (editedCol === COL.name && COL.listedDate) {
      var ldCell = sheet.getRange(currentRow, COL.listedDate);
      if (!ldCell.getValue()) {
        var stNow = COL.status ? (sheet.getRange(currentRow, COL.status).getValue() || "").toString().trim() : "";
        if (stNow !== "Sold") ldCell.setValue(new Date());
      }
    }

    _recalcRow(sheet, currentRow, COL, sheetName, {
      name:      editedCol === COL.name,
      publisher: editedCol === COL.publisher,
      condition: editedCol === COL.condition
    });

    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log("onEdit error: " + err.toString());
  } finally {
    _isEditRunning = false;
  }
}

// ============================================================
// [A2] _recalcRow: pipeline กลางของ "1 แถว" (โครง v16 เดิม)
// ============================================================
function _recalcRow(sheet, row, COL, sheetName, changed) {
  changed = changed || {};
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return null;

  var allData  = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var rawTitle = (sheet.getRange(row, COL.name).getValue() || "").toString().trim();
  if (!rawTitle) return null;

  var finalTitle = rawTitle;

  if (changed.name) {
    var formatted     = _autoFormat(rawTitle);
    var restockResult = _detectRestock(formatted, row, allData, COL);
    finalTitle = restockResult.title;
    if (finalTitle !== rawTitle) {
      sheet.getRange(row, COL.name).setValue(finalTitle);
      allData[row - 3][COL.name - 1] = finalTitle;
    }
  }

  var pubText  = (sheet.getRange(row, COL.publisher).getValue()  || "").toString().trim();
  var condText = (sheet.getRange(row, COL.condition).getValue()  || "").toString().trim();

  if (changed.name || changed.publisher || changed.condition) {
    var newSKU = _buildSKU(finalTitle, pubText, condText, row, allData, sheetName, COL);
    if (COL.productId) sheet.getRange(row, COL.productId).setValue(newSKU);
  }

  if (AUTO_PRICE_ON_EDIT || changed.forcePrice) {
    _recalcSuggestedPrice(sheet, row, COL, sheetName, allData, finalTitle);
  }

  _setDerivedFormulasForRow(sheet, row, COL);

  return finalTitle;
}

// คำนวณราคาแถวเดียว — v17: อ่านทั้งแถว → item object → SP-2
function _recalcSuggestedPrice(sheet, row, COL, sheetName, allData, title) {
  if (!COL.suggested) return;
  var rowVals = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var item = _sp2ItemFromRow(rowVals, COL, title);

  var idx = _sp2BuildIndexes(allData, COL, sheetName);

  var result = _calcSuggestedPrice(item, sheetName, idx);
  _sp2WriteResult(sheet, row, COL, sheetName, result);
}

// ============================================================
// [SP2-HELPERS]
// ============================================================
function _normOrig(o) {
  if (o === null || o === undefined) return "";
  var s = o.toString().trim();
  if (s === "" || s === "-") return "";
  var n = parseFloat(s);
  return isNaN(n) ? s : String(n);
}

function _median(arr) {
  if (!arr || !arr.length) return 0;
  var a = arr.slice().sort(function (x, y) { return x - y; });
  var mid = Math.floor(a.length / 2);
  return (a.length % 2) ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function _sp2Round(v, C) {
  C = C || SP2;
  return Math.max(Math.round(v / C.ROUND) * C.ROUND, C.MIN_PRICE);
}
function _sp2Date(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v === null || v === undefined || v === "") return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function _sp2Days(from, to) {
  if (!from || !to) return null;
  var d = Math.floor((to.getTime() - from.getTime()) / 86400000);
  return d < 0 ? null : d;
}
function _sp2MonthsAgo(d) {
  if (!d) return null;
  return (Date.now() - d.getTime()) / (30.44 * 86400000);
}
function _sp2Band(v, bands) {
  for (var i = 0; i < bands.length; i++) if (v <= bands[i][0]) return bands[i][1];
  return bands[bands.length - 1][1];
}
// ตัวคูณ flags ต่อเล่ม: "POSTER STAMP" → 1.10×0.90
function _sp2FlagsMult(flagStr, C) {
  if (!flagStr) return { mult: 1, tags: [] };
  C = C || SP2;
  var toks = flagStr.toString().toUpperCase().split(/[\s,+·\/|]+/);
  var m = 1, tags = [];
  for (var i = 0; i < toks.length; i++) {
    var f = C.FLAGS[toks[i]];
    if (f) { m *= f; tags.push(toks[i]); }
  }
  return { mult: m, tags: tags };
}
// weighted median ของ [{v, w}]
function _sp2WMedian(pairs) {
  if (!pairs || !pairs.length) return null;
  var a = pairs.slice().sort(function (x, y) { return x.v - y.v; });
  var tot = 0;
  for (var i = 0; i < a.length; i++) tot += a[i].w;
  var acc = 0;
  for (var j = 0; j < a.length; j++) {
    acc += a[j].w;
    if (acc >= tot / 2) return a[j].v;
  }
  return a[a.length - 1].v;
}
// v17.1: ราคาปก → หมายเลข band (0..n) · ไม่มีราคาปก = null · v18: ต่อชีต
function _sp2CoverBand(o, C) {
  var n = parseFloat(o);
  if (isNaN(n) || n <= 0) return null;
  var b = (C || SP2).COVER_BANDS;
  for (var i = 0; i < b.length; i++) if (n <= b[i]) return i;
  return b.length;
}
function _sp2BandLabel(band, C) {
  if (band === null) return "-";
  var b = (C || SP2).COVER_BANDS;
  if (band === 0) return "≤" + b[0];
  if (band === b.length) return ">" + b[b.length - 1];
  return (b[band - 1] + 1) + "-" + b[band];
}

// สร้าง item object จาก row array
function _sp2ItemFromRow(rowVals, COL, titleOverride) {
  return {
    name:      titleOverride !== undefined && titleOverride !== null ? titleOverride : _val(rowVals, COL, "name"),
    publisher: _val(rowVals, COL, "publisher"),
    platform:  _val(rowVals, COL, "platform"),
    condition: _val(rowVals, COL, "condition"),
    original:  _val(rowVals, COL, "original"),
    cost:      _val(rowVals, COL, "cost"),
    copyFlags: _val(rowVals, COL, "copyFlags"),
    rarity:    _val(rowVals, COL, "rarity"),
    marketRef: _val(rowVals, COL, "marketRef")
  };
}
// เขียนผลลง 3 ช่อง + พื้นหลัง REVIEW
function _sp2WriteResult(sheet, row, COL, sheetName, r) {
  _tryWrite("Suggested Price", function () {
    var sc = sheet.getRange(row, COL.suggested);
    sc.setValue(r.price); sc.setBackground(null);
  });
  if (COL.priceRange) _tryWrite("Price Range", function () {
    var rc = sheet.getRange(row, COL.priceRange);
    rc.setValue(r.rangeStr || "");
    rc.setBackground(r.review ? SP2_REVIEW_BG : null);
  });
  if (COL.maxGRef) _tryWrite("Max G Ref", function () {
    sheet.getRange(row, COL.maxGRef).setValue(r.refStr || "");
  });
}

// ============================================================
// [SP2-INDEX] _sp2BuildIndexes — สแกนชีตครั้งเดียว ได้ครบ:
//   comp 3 ชั้น (Sold เท่านั้น) · curve table · auction floor
// ============================================================
function _sp2BuildIndexes(data, COL, sheetName) {
  var C = _sp2Cfg(sheetName || GGB_SHEET);
  var idx = { exact: {}, pub: {}, base: {}, curve: {}, curveN: {},
              aucFloor: {}, bandRef: {}, cfg: C, sheet: sheetName || GGB_SHEET };
  var mults = {}, bandPrices = {};

  for (var i = 0; i < data.length; i++) {
    var t = _val(data[i], COL, "name"); t = t ? t.toString().trim() : "";
    if (!t) continue;
    var status = (_val(data[i], COL, "status") || "").toString().trim();
    var price  = parseFloat(_val(data[i], COL, "price"));
    var baseT  = _getBaseTitle(t).toUpperCase();

    // Auction = พื้นราคา (หลักฐานว่าตลาดจ่ายอย่างน้อยเท่านี้แบบโล๊ะ) — ไม่เป็น comp
    if (status === "Auction") {
      if (C.USE_AUCTION_FLOOR && !isNaN(price) && price > 0) {
        if (!idx.aucFloor[baseT] || price > idx.aucFloor[baseT]) idx.aucFloor[baseT] = price;
      }
      continue;
    }
    if (status !== "Sold") continue;
    if (isNaN(price) || price <= 0) continue;

    var pub  = (_val(data[i], COL, "publisher") || "").toString().trim().toUpperCase();
    var plat = (_val(data[i], COL, "platform")  || "").toString().trim().toUpperCase();
    var cond = (_val(data[i], COL, "condition") || "").toString().trim().toUpperCase();
    var orig = _val(data[i], COL, "original");

    var comp = {
      cond: cond, price: price, pub: pub,
      fmult: _sp2FlagsMult(_val(data[i], COL, "copyFlags"), C).mult,  // v17.3: normalize flags ด้วย
      sold:   _sp2Date(_val(data[i], COL, "soldDate")),
      listed: _sp2Date(_val(data[i], COL, "listedDate"))
    };
    var kE = baseT + "|" + pub + "|" + _normOrig(orig);
    var kP = baseT + "|" + pub;
    (idx.exact[kE] = idx.exact[kE] || []).push(comp);
    (idx.pub[kP]   = idx.pub[kP]   || []).push(comp);
    (idx.base[baseT] = idx.base[baseT] || []).push(comp);

    // v17.1: ทุก bucket ผูกกับ cover band — ตัวคูณของปกถูกกับปกแพงใช้ร่วมกันไม่ได้
    var o = parseFloat(orig);
    var band = _sp2CoverBand(orig, C);
    if (!isNaN(o) && o > 0 && band !== null) {
      var m = price / o;
      (mults["PPB|" + pub + "|" + plat + "|" + band] = mults["PPB|" + pub + "|" + plat + "|" + band] || []).push(m);
      (mults["PB|"  + pub  + "|" + band] = mults["PB|"  + pub  + "|" + band] || []).push(m);
      (mults["LB|"  + plat + "|" + band] = mults["LB|"  + plat + "|" + band] || []).push(m);
      (mults["B|"   + band] = mults["B|" + band] || []).push(m);
      (bandPrices[band] = bandPrices[band] || []).push(price);
    }
  }

  var keys = Object.keys(mults);
  for (var k = 0; k < keys.length; k++) {
    if (mults[keys[k]].length >= C.CURVE_MIN_N) {
      idx.curve[keys[k]]  = _median(mults[keys[k]]);
      idx.curveN[keys[k]] = mults[keys[k]].length;
    }
  }
  // ราคาอ้างอิงต่อ band (ให้มนุษย์ดูตอน REVIEW เมื่อ curve ไม่มีข้อมูลพอ)
  for (var b in bandPrices) {
    var arr = bandPrices[b];
    if (arr.length >= C.BANDREF_MIN_N) {
      var s = arr.slice().sort(function (x, y) { return x - y; });
      idx.bandRef[b] = { n: s.length, med: _median(s), max: s[s.length - 1] };
    }
  }
  return idx;
}

// curve lookup (v17.1 band-aware): pub×plat×band → pub×band → plat×band → band
//   ไม่มีข้อมูลในช่วงราคาปกนั้น = คืน null (ไม่เดาข้าม band — ปล่อยให้เข้า REVIEW)
function _sp2Curve(idx, pub, plat, band) {
  if (band === null) return null;
  // ชีตที่ไม่มีคอลัมน์ Platform (เช่น MAGAZINE) → ข้าม bucket ที่ผูกกับ platform
  // ไม่งั้นป้ายจะขึ้น "PUB×PLAT" ทั้งที่จริง ๆ คือ PUB เฉย ๆ
  var cand = plat
    ? [["PPB|" + pub + "|" + plat + "|" + band, "PUB×PLAT"],
       ["PB|"  + pub  + "|" + band,             "PUB"],
       ["LB|"  + plat + "|" + band,             "PLAT"],
       ["B|"   + band,                          "ALL"]]
    : [["PB|"  + pub + "|" + band,              "PUB"],
       ["B|"   + band,                          "ALL"]];
  for (var i = 0; i < cand.length; i++) {
    if (idx.curve[cand[i][0]]) {
      return { mult: idx.curve[cand[i][0]], n: idx.curveN[cand[i][0]],
               src: cand[i][1] + " ปก" + _sp2BandLabel(band, idx.cfg) };
    }
  }
  return null;
}

// ============================================================
// [SP2-CORE] _sp2Calc — pipeline 6 ขั้น (design §4.2) · ใช้ได้ทุกชีต (config มากับ idx)
//   คืน { price(=""ถ้าREVIEW), target, min, max, open, tier, review,
//         rangeStr, refStr, label }
// ============================================================
function _sp2Calc(item, idx) {
  var blank = { price: "", target: "", min: "", max: "", open: "", tier: "",
                review: false, rangeStr: "", refStr: "", label: "" };
  if (!idx) return blank;
  var C = idx.cfg || SP2;
  var cond = (item.condition || "").toString().trim().toUpperCase();
  if (cond === "" || cond === "-") return blank;
  var cMult = C.COND_MULT[cond];
  if (cMult === undefined) return blank;

  var baseT  = _getBaseTitle((item.name || "").toString()).toUpperCase();
  var pub    = (item.publisher || "").toString().trim().toUpperCase();
  var plat   = (item.platform  || "").toString().trim().toUpperCase();
  var rarity = (item.rarity    || "").toString().trim().toUpperCase();
  var mref   = parseFloat(item.marketRef);
  var cost   = parseFloat(item.cost);
  var orig   = parseFloat(item.original);
  var band   = _sp2CoverBand(item.original, C);

  // ── STEP 1: บันได comp T1–T3 ──
  var comps = null, tier = "", pubAdj = false;
  var kE = baseT + "|" + pub + "|" + _normOrig(item.original);
  if (idx.exact[kE] && idx.exact[kE].length)                 { comps = idx.exact[kE];            tier = "EXACT"; }
  else if (idx.pub[baseT + "|" + pub] && idx.pub[baseT + "|" + pub].length) { comps = idx.pub[baseT + "|" + pub]; tier = "TITLE-PUB"; }
  else if (idx.base[baseT] && idx.base[baseT].length)        { comps = idx.base[baseT];          tier = "TITLE"; pubAdj = true; }

  var titleBase = null, latestSold = null, fastStreak = 0, notes = [];

  if (comps) {
    // ── STEP 2: ตีความแต่ละ comp → A_equiv ──
    var myCv   = _sp2Curve(idx, pub, plat, band);
    var myMult = myCv ? myCv.mult : null;
    var sorted = comps.slice().sort(function (a, b) {
      var ta = a.sold ? a.sold.getTime() : 0, tb = b.sold ? b.sold.getTime() : 0;
      return tb - ta;
    });
    var pairs = [], guard = null;
    for (var i = 0; i < sorted.length; i++) {
      var cp = sorted[i];
      // A_equiv = ราคา ÷ สภาพ ÷ flags → ทุก comp เทียบที่ "สภาพ A ไม่มี flag" เหมือนกันหมด
      var a = cp.price / (C.COND_MULT[cp.cond] || 1.0) / (cp.fmult || 1.0);
      var days = _sp2Days(cp.listed, cp.sold);
      if (days !== null) a *= _sp2Band(days, C.VEL_BANDS);
      if (pubAdj && myMult) {  // T3: ปรับข้ามสำนักพิมพ์ด้วยสัดส่วน curve (band เดียวกัน)
        var oCv = _sp2Curve(idx, cp.pub, plat, band);
        if (oCv && oCv.mult > 0) {
          var f = myMult / oCv.mult;
          f = Math.max(C.PUBFACTOR_CLAMP[0], Math.min(C.PUBFACTOR_CLAMP[1], f));
          a *= f;
        }
      }
      var mAgo = cp.sold ? _sp2MonthsAgo(cp.sold) : null;
      var w = (mAgo === null) ? C.REC_UNKNOWN : _sp2Band(mAgo, C.REC_BANDS);
      pairs.push({ v: a, w: w });
      if (i === 0 && cp.sold) { latestSold = cp.sold; guard = a; }
      if (i === fastStreak && days !== null && days <= C.FAST_DAYS) fastStreak++;
    }
    // ── STEP 3: รวม + guard ขาขึ้น ──
    titleBase = _sp2WMedian(pairs);
    if (guard !== null && guard > titleBase) { titleBase = guard; notes.push("guard≥" + Math.round(guard)); }
    tier += " n=" + comps.length;
  } else if (!isNaN(orig) && orig > 0) {
    // ── T4: curve (band-aware) ──
    var cv = _sp2Curve(idx, pub, plat, band);
    if (cv) {
      titleBase = orig * cv.mult;
      tier = "CURVE " + cv.src + (cv.n ? " n=" + cv.n : "");
    }
    // ไม่มี curve ในช่วงราคาปกนี้ → ไม่เดา (จบที่ T6 พร้อมราคาอ้างอิงของ band)
  }

  // ── T5: Market Ref (ฐานเทียบสภาพ A) ──
  if (!isNaN(mref) && mref > 0) {
    if (titleBase === null || mref > titleBase) {
      titleBase = Math.max(titleBase || 0, mref);
      tier = (tier ? tier + "+" : "") + "REF";
    } else {
      notes.push("ref=" + Math.round(mref));
    }
  }

  // ── T6: MANUAL — ไม่มีอะไรให้ยึด แสดงหลักฐานเท่าที่มีแล้วให้คนเคาะ ──
  if (titleBase === null) {
    var br = (band !== null) ? idx.bandRef[band] : null;
    var why = (band === null) ? "ไม่มี comp และไม่มีราคาปก"
      : "ไม่มี comp · ปก ฿" + orig + " (ช่วง " + _sp2BandLabel(band, C) + ") ยังไม่มีสถิติพอ (ต้อง " + C.CURVE_MIN_N + " เล่ม)";
    var refTxt = br ? " · เล่มปก" + _sp2BandLabel(band, C) + " เคยขาย med ฿" + Math.round(br.med) +
                      " สูงสุด ฿" + br.max + " (n=" + br.n + ")" : "";
    return { price: "", target: "", min: "", max: "", open: "", tier: "MANUAL",
             review: true, label: "MANUAL",
             rangeStr: "REVIEW · set manually" + (br ? " · ref ฿" + Math.round(br.med) + "–" + br.max : " · no data"),
             refStr: "[REVIEW · MANUAL] " + why + refTxt + " — ตั้งเอง หรือกรอก Market Ref" };
  }

  // ── STEP 4: กลับเป็นราคาเล่มนี้ ──
  var fl = _sp2FlagsMult(item.copyFlags, C);
  var target = titleBase * cMult * fl.mult;
  if (cond === "S" && target < titleBase + C.S_MIN_PREMIUM) target = titleBase + C.S_MIN_PREMIUM;
  if (fl.tags.length) notes.push("flags:" + fl.tags.join("+"));

  // ── STEP 5: Guards ──
  if (C.USE_AUCTION_FLOOR && idx.aucFloor[baseT] && target < idx.aucFloor[baseT]) {
    target = idx.aucFloor[baseT];
    notes.push("⚓AUC≥" + idx.aucFloor[baseT]);
  }
  var floorHit = false;
  if (!isNaN(cost) && cost > 0) {
    var cf = cost * C.COST_FLOOR_MULT;
    if (target < cf) { target = cf; floorHit = true; notes.push("⚓COST-FLOOR " + Math.round(cf)); }
  }

  // ── Ratchet + REVIEW ──
  var hot = fastStreak >= C.FAST_STREAK_N;
  var staleM = latestSold ? _sp2MonthsAgo(latestSold) : null;
  // v17.5: ของแพง + หลักฐานแน่น (EXACT ≥3 ใบ) → ปล่อยระบบตั้งได้เลย ไม่ต้องเข้า REVIEW
  var strong = (comps !== null && comps.length >= C.STRONG_COMP_N && tier.indexOf("EXACT") === 0);
  var review = (titleBase >= C.REVIEW_BASE && !strong) || (rarity === "R1") ||
               (comps !== null && staleM !== null && staleM > C.REVIEW_STALE_MONTHS);
  if (strong && titleBase >= C.REVIEW_BASE) notes.push("✔หลักฐานแน่น");

  // ── STEP 6: Output ช่วง + เหตุผล ──
  var tgt = _sp2Round(target, C);
  var lo  = _sp2Round(target * C.RANGE_LO, C);
  var hiMult = review ? C.RANGE_HI_RARE : (rarity === "R2" ? C.RANGE_HI_R2 : C.RANGE_HI);
  var hi  = _sp2Round(target * hiMult, C);
  if (rarity === "R2" && !review) notes.push("R2 ขยายขอบบน");
  var open = (hot || review) ? hi : tgt;
  if (hot) notes.push("🔥fast×" + fastStreak + "→เปิดขอบบน");

  // v17.4 (EN): เลขแรก = ราคาที่เอาไปตั้งขายเลย · 🔥 = ratchet ขายเร็วดันขึ้น
  var rangeStr = review
    ? "REVIEW · set manually · range " + lo + "–" + hi
    : open + (hot ? " 🔥" : "") + " · range " + lo + "–" + hi;
  var refStr = "[" + (review ? "REVIEW · " : "") + tier + "] ฐานA≈" + Math.round(titleBase) +
               " · " + cond + "×" + cMult +
               (notes.length ? " · " + notes.join(" · ") : "") + " → " + tgt;

  return { price: review ? "" : tgt, target: tgt, min: lo, max: hi, open: open,
           tier: tier, review: review, rangeStr: rangeStr, refStr: refStr,
           label: review ? "REVIEW" : (floorHit ? "COST-FLOOR" : tier) };
}

// ============================================================
// [PRICE] _calcSuggestedPrice — v18: ทุกชีตใช้ SP-2 engine เดียวกัน
//   ต่างกันแค่ config ที่ผูกไว้กับ idx ตอน _sp2BuildIndexes(data, COL, sheetName)
//   (สูตร publisher-aware v13 ของ MAGAZINE ถูกยกเลิกแล้ว — ดูเหตุผลหัวไฟล์)
// ============================================================
function _calcSuggestedPrice(item, sheetName, idx) {
  return _sp2Calc(item, idx);
}

// ============================================================
// [SP2-FILL] core เติมราคาทั้งชีต — ใช้ทั้งเมนูและ web app
// ============================================================
function _fillSuggestedCore(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("ไม่พบชีต: " + sheetName);
  var COL = _resolveColumns(sheet);
  if (!COL.suggested) throw new Error("ไม่พบคอลัมน์ 'Suggested Price'");

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var cnt = { rows: 0, exact: 0, titlePub: 0, title: 0, curve: 0, ref: 0,
              review: 0, manual: 0, floor: 0, sheet: sheetName };
  if (lastRow < 3) return cnt;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var idx = _sp2BuildIndexes(data, COL, sheetName);

  var outF = [], outR = [], outN = [], outBG = [];

  for (var i = 0; i < data.length; i++) {
    var title = _val(data[i], COL, "name");
    title = title ? title.toString().trim() : "";
    if (!title) { outF.push([""]); outR.push([""]); outN.push([""]); outBG.push([null]); continue; }
    cnt.rows++;

    var item = _sp2ItemFromRow(data[i], COL, title);
    var r = _calcSuggestedPrice(item, sheetName, idx);
    outF.push([r.price]);
    outR.push([r.rangeStr || ""]);
    outN.push([r.refStr || ""]);
    outBG.push([r.review ? SP2_REVIEW_BG : null]);

    if (r.tier === "MANUAL")                  cnt.manual++;
    else if (r.review)                        cnt.review++;
    else if (r.tier.indexOf("EXACT") === 0)   cnt.exact++;
    else if (r.tier.indexOf("TITLE-PUB") === 0) cnt.titlePub++;
    else if (r.tier.indexOf("TITLE") === 0)   cnt.title++;
    else if (r.tier.indexOf("CURVE") === 0)   cnt.curve++;
    else if (r.tier.indexOf("REF") !== -1)    cnt.ref++;
    if (r.label === "COST-FLOOR")             cnt.floor++;
  }

  _tryWrite("Suggested Price", function () {
    sheet.getRange(3, COL.suggested, outF.length, 1).setValues(outF);
    var clearBG = outBG.map(function () { return [null]; });
    sheet.getRange(3, COL.suggested, clearBG.length, 1).setBackgrounds(clearBG);
  });
  if (COL.priceRange) _tryWrite("Price Range", function () {
    sheet.getRange(3, COL.priceRange, outR.length, 1).setValues(outR);
    sheet.getRange(3, COL.priceRange, outBG.length, 1).setBackgrounds(outBG);
  });
  if (COL.maxGRef) _tryWrite("Max G Ref", function () {
    sheet.getRange(3, COL.maxGRef, outN.length, 1).setValues(outN);
  });
  return cnt;
}

// เมนู: คำนวณ Suggested Price (SP-2)
function fillAllSuggestedPrices() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อนคำนวณ");
    return;
  }
  _sp2ResetWriteErrors();
  var cnt = _fillSuggestedCore(sheetName);
  var C = _sp2Cfg(sheetName);
  var msg = "✅ Suggested Price (SP-2) — " + sheetName + " · " + cnt.rows + " แถว\n" +
        "   ช่วงราคาปก " + C.COVER_BANDS.join("/") + " · REVIEW ≥ ฿" + C.REVIEW_BASE + "\n\n" +
        "🎯 EXACT (base+pub+orig):   " + cnt.exact + "\n" +
        "📗 TITLE-PUB:               " + cnt.titlePub + "\n" +
        "📘 TITLE (ข้ามสำนักพิมพ์):  " + cnt.title + "\n" +
        "📈 CURVE (ตัวคูณราคาปก):   " + cnt.curve + "\n" +
        "🧭 REF (market ref):        " + cnt.ref + "\n" +
        "🔶 REVIEW (รอเคาะ):         " + cnt.review + "\n" +
        "⬜ MANUAL (ไม่มีข้อมูล):     " + cnt.manual + "\n" +
        "⚓ ชน COST-FLOOR:            " + cnt.floor + "\n\n" +
        "REVIEW/MANUAL = พื้นส้มที่ช่อง Price Range · เหตุผลใน Max G Ref" + _sp2WriteErrMsg();
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-SETUP] เพิ่มคอลัมน์ SP-2 (ใช้ slot "Column N" ที่ว่างก่อน แล้วค่อยต่อท้าย)
// ============================================================
function _sp2EnsureHeader2(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return { col: c + 1, added: false };
  }
  // หา slot "Column N" ที่ทั้งคอลัมน์ว่าง → เปลี่ยนหัวแทนการต่อท้าย
  var lastRow = sheet.getLastRow();
  for (var c2 = 0; c2 < headers.length; c2++) {
    if (!/^column\s*\d+$/i.test(String(headers[c2] || "").trim())) continue;
    var empty = true;
    if (lastRow >= 2) {
      var vals = sheet.getRange(2, c2 + 1, lastRow - 1, 1).getValues();
      for (var r = 0; r < vals.length; r++) {
        if (vals[r][0] !== "" && vals[r][0] !== null) { empty = false; break; }
      }
    }
    if (empty) {
      sheet.getRange(1, c2 + 1).setValue(headerText);
      delete _colCache[sheet.getSheetId()];
      return { col: c2 + 1, added: true };
    }
  }
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue(headerText);
  delete _colCache[sheet.getSheetId()];
  return { col: newCol, added: true };
}

// v18: helper — คืนชีตที่รองรับ SP-2 (GGB/MAG) · ไม่ส่ง = ใช้ชีตที่เปิดอยู่
function _sp2Sheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName;
  if (!name) {
    name = ss.getActiveSheet().getName();
    if (name !== GGB_SHEET && name !== MAG_SHEET) name = GGB_SHEET;
  }
  if (name !== GGB_SHEET && name !== MAG_SHEET) throw new Error("SP-2 รองรับเฉพาะ " + GGB_SHEET + " / " + MAG_SHEET);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("ไม่พบชีต " + name);
  return { sheet: sheet, name: name };
}
// เช็คว่าชีตที่เปิดอยู่ใช้ SP-2 ได้ไหม (สำหรับเมนู)
function _sp2ActiveOrWarn() {
  var name = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
  if (name !== GGB_SHEET && name !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า " + GGB_SHEET + " หรือ " + MAG_SHEET + " ก่อน");
    return null;
  }
  return name;
}

function _sp2SetupCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var added = [], existed = [], failed = [];
  for (var i = 0; i < SP2_COLUMNS.length; i++) {
    try {
      var res = _sp2EnsureHeader2(sheet, SP2_COLUMNS[i]);
      if (res.added) added.push(SP2_COLUMNS[i] + " → คอลัมน์ " + _colLetter(res.col));
      else existed.push(SP2_COLUMNS[i]);
    } catch (e) {
      // ชีตที่เป็น Table อาจไม่ยอมให้เพิ่มคอลัมน์ด้วยสคริปต์ → บอกให้เพิ่มหัวเอง
      failed.push(SP2_COLUMNS[i] + " (" + String((e && e.message) || e).slice(0, 50) + ")");
    }
  }
  delete _colCache[sheet.getSheetId()];
  SpreadsheetApp.flush();
  return { added: added, existed: existed, failed: failed, sheet: t.name };
}

function sp2Setup() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2SetupCore(name); });
  var msg = "🧱 SP-2 Setup (" + r.sheet + ")\n\n";
  if (r.added.length)   msg += "➕ เพิ่มใหม่:\n" + r.added.join("\n") + "\n\n";
  if (r.existed.length) msg += "✓ มีอยู่แล้ว: " + r.existed.join(", ");
  if (!r.added.length && !r.failed.length) msg += "\n(ไม่มีอะไรต้องเพิ่ม — รันซ้ำได้เสมอ)";
  if (r.failed && r.failed.length) {
    msg += "\n\n⚠️ เพิ่มไม่ได้ " + r.failed.length + " คอลัมน์:\n  " + r.failed.join("\n  ") +
           "\n\nชีตนี้น่าจะเป็น Table ของ Google Sheets — เพิ่มหัวคอลัมน์เองในชีตได้เลย\n" +
           "(ชื่อต้องตรงเป๊ะ · วางตำแหน่งไหนก็ได้ ระบบหาเจอจากชื่อหัว)";
  }
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-LAYOUT] v17.2 — จัดเรียงคอลัมน์ + ซ่อนคอลัมน์สูตร + ใส่คำอธิบายบนหัวคอลัมน์
//   ใช้ moveColumns() → สูตรและ reference ย้ายตามอย่างถูกต้อง (ไม่ใช่ copy ค่า)
//   คอลัมน์ที่ไม่อยู่ใน SP2_ORDER จะถูกดันไปท้ายสุดตามลำดับเดิม — ไม่มีข้อมูลหาย
// ============================================================
function _sp2HeaderPos(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var pos = {};   // ชื่อหัว (normalize) → index 1-based (ตัวแรกที่เจอ)
  for (var c = 0; c < headers.length; c++) {
    var h = _normHeader(headers[c]);
    if (h && !pos[h]) pos[h] = c + 1;
  }
  return pos;
}

function _sp2LayoutCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  // v18.5: ชีตที่เปิดใช้ Table/typed column ของ Google Sheets จะไม่ยอมให้แก้บางอย่าง
  //   (เช่น setDataValidation บนคอลัมน์ที่มี "ประเภท" อยู่แล้ว → Exception)
  //   จึงห่อทุกขั้นด้วย try/catch: ข้ามเฉพาะขั้นที่ทำไม่ได้ ที่เหลือทำต่อจนจบ
  var skipped = [];
  function guard(label, fn) {
    try { return fn(); }
    catch (e) {
      var m = String((e && e.message) || e);
      skipped.push(label + (m.indexOf("typed columns") !== -1 ? " (คอลัมน์มีประเภทอยู่แล้ว)" : ": " + m.slice(0, 60)));
      return null;
    }
  }

  // 1) เรียงลำดับ: ไล่จากซ้ายไปขวา ดึงคอลัมน์เป้าหมายมาเข้าที่ทีละตัว
  var moved = [], missing = [];
  var target = 1;
  for (var i = 0; i < SP2_ORDER.length; i++) {
    var want = _normHeader(SP2_ORDER[i]);
    var pos  = _sp2HeaderPos(sheet);       // อ่านใหม่ทุกรอบ (ตำแหน่งเลื่อนหลังย้าย)
    var cur  = pos[want];
    if (!cur) { missing.push(SP2_ORDER[i]); continue; }
    if (cur !== target) {
      // ย้ายมาทางซ้ายเสมอ (ตำแหน่งซ้ายของ target ถูกล็อกไว้แล้ว) → destination = target
      (function (c, tg, nm) {
        guard("ย้าย " + nm, function () { sheet.moveColumns(sheet.getRange(1, c, 1, 1), tg); });
      })(cur, target, SP2_ORDER[i]);
      moved.push(SP2_ORDER[i] + " (" + _colLetter(cur) + "→" + _colLetter(target) + ")");
    }
    target++;
  }
  delete _colCache[sheet.getSheetId()];

  // 2) ซ่อน/แสดง
  var pos2 = _sp2HeaderPos(sheet);
  var lastCol = sheet.getLastColumn();
  guard("แสดงคอลัมน์ทั้งหมด (reset)", function () {
    for (var c = 1; c <= lastCol; c++) sheet.showColumns(c);
  });
  var hidden = [];
  for (var h = 0; h < SP2_HIDE.length; h++) {
    var hc = pos2[_normHeader(SP2_HIDE[h])];
    if (!hc) continue;
    if (guard("ซ่อน " + SP2_HIDE[h], (function (c3) {
      return function () { sheet.hideColumns(c3); return true; };
    })(hc))) hidden.push(SP2_HIDE[h]);
  }
  // คอลัมน์ "Column NN" ที่ว่างเปล่า → ซ่อนด้วย (ลดความรก)
  var heads = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var emptyHidden = 0;
  for (var e = 0; e < heads.length; e++) {
    if (/^column\s*\d+$/i.test(String(heads[e] || "").trim())) {
      if (guard("ซ่อนคอลัมน์ว่าง " + _colLetter(e + 1), (function (cc) {
        return function () { sheet.hideColumns(cc); return true; };
      })(e + 1))) emptyHidden++;
    }
  }

  // 3) คำอธิบายบนหัวคอลัมน์ (note — hover เห็น) + freeze + จัดหน้า
  var noted = 0;
  for (var key in SP2_NOTES) {
    var nc = pos2[_normHeader(key)];
    if (!nc) continue;
    if (guard("คำอธิบาย " + key, (function (c2, k2) {
      return function () { sheet.getRange(1, c2).setNote(SP2_NOTES[k2]); return true; };
    })(nc, key))) noted++;
  }
  guard("ตรึงแถวหัว", function () { sheet.setFrozenRows(2); });
  var nameCol = pos2[_normHeader("Item name")];
  if (nameCol) guard("ตรึงคอลัมน์ชื่อ", function () { sheet.setFrozenColumns(nameCol); });

  // 4) dropdown (data validation) — เลือกจากรายการ ไม่ต้องพิมพ์ ไม่พิมพ์ผิด
  //   คอลัมน์ที่ Google Sheets กำหนด "ประเภท" ไว้แล้ว (Table typed column) จะใส่ไม่ได้ → ข้าม
  var lastRow2 = Math.max(sheet.getMaxRows(), 3);
  var nRows = lastRow2 - 2;
  var dd = [];
  function putDD(colName, items, help) {
    var dc = pos2[_normHeader(colName)];
    if (!dc || !items.length) return;
    var okDD = guard("dropdown " + colName, function () {
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(items, true)
        .setAllowInvalid(true)    // ยอมให้ค่าเดิมที่ไม่ตรงลิสต์อยู่ได้ (ไม่พังข้อมูลเก่า)
        .setHelpText(help || (colName + ": " + items.slice(0, 12).join(" / ")))
        .build();
      sheet.getRange(3, dc, nRows, 1).setDataValidation(rule);
      return true;
    });
    if (okDD) dd.push(colName + " (" + items.length + ")");
  }
  for (var d = 0; d < SP2_DROPDOWNS.length; d++) putDD(SP2_DROPDOWNS[d][0], SP2_DROPDOWNS[d][1]);

  // v18.4: Genre / Platform / Publisher → สร้างลิสต์จาก "ค่าที่มีอยู่จริงในชีต"
  //   (ถ้าเคยตั้ง dropdown เองไว้ ค่าที่ตั้งไว้ยังอยู่ในคอลัมน์ → ถูกดึงมารวมอัตโนมัติ ไม่หาย)
  var lastData = sheet.getLastRow();
  if (lastData >= 3) {
    for (var g = 0; g < SP2_DROPDOWNS_FROM_DATA.length; g++) {
      var gname = SP2_DROPDOWNS_FROM_DATA[g];
      var gc = pos2[_normHeader(gname)];
      if (!gc) continue;
      var vals = guard("อ่านค่า " + gname, function () {
        return sheet.getRange(3, gc, lastData - 2, 1).getValues();
      });
      if (!vals) continue;
      var seen = {}, list = [];
      for (var v = 0; v < vals.length; v++) {
        var s = (vals[v][0] === null || vals[v][0] === undefined) ? "" : vals[v][0].toString().trim();
        if (s && !seen[s]) { seen[s] = 1; list.push(s); }
      }
      list.sort();
      putDD(gname, list, gname + " — ลิสต์สร้างจากค่าที่มีในชีต (" + list.length + " แบบ) · พิมพ์ค่าใหม่ได้ แล้วรันจัดหน้าชีตอีกครั้งเพื่อเพิ่มเข้าลิสต์");
    }
  }

  return { moved: moved, hidden: hidden, emptyHidden: emptyHidden,
           noted: noted, dropdowns: dd, missing: missing, skipped: skipped, sheet: t.name };
}

function sp2Layout() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2LayoutCore(name); });
  var msg = "🎨 จัดหน้าชีต " + r.sheet + " เรียบร้อย\n\n" +
    "↔️ ย้ายคอลัมน์: " + r.moved.length + " ครั้ง\n" +
    "🔒 ซ่อนคอลัมน์สูตร/ระบบ: " + (r.hidden.length ? r.hidden.join(", ") : "-") + "\n" +
    "🫥 ซ่อนคอลัมน์ว่าง (Column NN): " + r.emptyHidden + "\n" +
    "💬 ใส่คำอธิบายบนหัวคอลัมน์: " + r.noted + " ช่อง (เอาเมาส์ชี้หัวคอลัมน์เพื่ออ่าน)\n" +
    "🔽 ทำ dropdown: " + (r.dropdowns.length ? r.dropdowns.join(", ") : "-") + "\n" +
    "📌 ตรึงแถวหัว 2 แถว + ตรึงคอลัมน์ชื่อสินค้า\n" +
    (r.missing.length ? "\n⚠️ ไม่พบคอลัมน์: " + r.missing.join(", ") + " (รัน SP-2 Setup ก่อน)" : "");
  if (r.skipped && r.skipped.length) {
    msg += "\n\n⏭️ ข้าม " + r.skipped.length + " รายการ (ทำต่อจนจบแล้ว ไม่ต้องรันซ้ำ):\n  " +
           r.skipped.slice(0, 8).join("\n  ") +
           (r.skipped.length > 8 ? "\n  … อีก " + (r.skipped.length - 8) : "") +
           "\n\nℹ️ \"คอลัมน์มีประเภทอยู่แล้ว\" = ชีตนี้ใช้ Table ของ Google Sheets ซึ่งคุม dropdown เอง\n" +
           "   ไม่ใช่ปัญหา — dropdown ที่คุณตั้งไว้ยังทำงานปกติและดีกว่าที่สคริปต์ใส่ให้\n" +
           "   ถ้าอยากให้สคริปต์คุมแทน: คลิกขวาที่ตาราง › Convert to range แล้วรันใหม่";
  }
  msg += _sp2WriteErrMsg() + "\n\nเปิดคอลัมน์ที่ซ่อนคืน: คลิกลูกศร ▸ ระหว่างหัวคอลัมน์ หรือ Format › Hide/Unhide";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-APPLY] v17.2 — เอาราคา SP-2 ไปใช้จริงในช่อง Price
//   ขอบเขต: Instock ทั้งหมด · ยกเว้น REVIEW/MANUAL (ของหายาก ให้คนเคาะเอง)
//   mode "UP"  = ขึ้นราคา + เติมช่องว่าง เท่านั้น (ค่าเริ่มต้น — ไม่ลดราคาที่ตั้งไว้แล้ว)
//   mode "ALL" = ทับทุกกรณี รวมลดราคาลงมาหา target
//   เหตุผลที่ default เป็น UP: ราคาที่สูงกว่า SP-2 มักถูกตั้งด้วยมือเพราะรู้ว่าเล่มนั้นดี
//   ซึ่งเป็นข้อมูลที่ระบบยังไม่รู้ · ลดทีหลังทำได้เสมอ แต่ขายถูกไปแล้วเอาคืนไม่ได้
//   dryRun = true → ดูรายการก่อน ไม่เขียนอะไร
// ============================================================
function _sp2ApplyCore(dryRun, mode, sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  if (!COL.price || !COL.suggested) throw new Error("ไม่พบคอลัมน์ Price / Suggested Price");

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var out = { up: [], down: [], fill: [], same: 0, skipReview: 0, changed: 0, sheet: t.name };
  if (lastRow < 3) return out;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var idx  = _sp2BuildIndexes(data, COL, t.name);
  var priceCol = sheet.getRange(3, COL.price, data.length, 1);
  var cur = priceCol.getValues();

  for (var i = 0; i < data.length; i++) {
    var title = _val(data[i], COL, "name");
    title = title ? title.toString().trim() : "";
    if (!title) continue;
    if ((_val(data[i], COL, "status") || "").toString().trim() !== "Instock") continue;

    var r = _sp2Calc(_sp2ItemFromRow(data[i], COL, title), idx);
    if (r.review || r.price === "" || !(parseFloat(r.price) > 0)) { out.skipReview++; continue; }

    var newP = parseFloat(r.price);
    var oldP = parseFloat(cur[i][0]);
    var rec = { row: i + 3, title: title, from: isNaN(oldP) ? "" : oldP, to: newP };

    if (isNaN(oldP) || oldP <= 0)      { out.fill.push(rec); }
    else if (newP > oldP)              { out.up.push(rec); }
    else if (newP < oldP) {
      out.down.push(rec);
      if (mode !== "ALL") continue;    // โหมด UP: บันทึกไว้ให้ดู แต่ไม่เขียนทับ
    }
    else                               { out.same++; continue; }

    cur[i][0] = newP;
    out.changed++;
  }

  if (!dryRun && out.changed) {
    _tryWrite("Price", function () { priceCol.setValues(cur); SpreadsheetApp.flush(); });
  }
  return out;
}

function _sp2ApplyMsg(r, dryRun, mode) {
  function lines(arr, n) {
    return arr.slice(0, n).map(function (x) {
      return "  แถว " + x.row + " " + x.title.slice(0, 38) +
             ": " + (x.from === "" ? "(ว่าง)" : "฿" + x.from) + " → ฿" + x.to;
    }).join("\n") + (arr.length > n ? "\n  … อีก " + (arr.length - n) + " เล่ม" : "");
  }
  var sumUp = 0, sumDown = 0;
  r.up.forEach(function (x) { sumUp += x.to - x.from; });
  r.down.forEach(function (x) { sumDown += x.from - x.to; });
  var isAll = (mode === "ALL");

  var m = (dryRun ? "👀 พรีวิว (ยังไม่เขียนอะไรลงชีต)" : "✅ เขียนราคา SP-2 ลงช่อง Price แล้ว") +
    " — " + (r.sheet || "") +
    "\nโหมด: " + (isAll ? "ทับทุกกรณี (รวมลดราคา)" : "ขึ้นราคา + เติมช่องว่างเท่านั้น") + "\n\n" +
    "⬆️ ขึ้นราคา: " + r.up.length + " เล่ม (+฿" + sumUp.toLocaleString() + ")\n" +
    "➕ เติมช่องที่ว่าง: " + r.fill.length + " เล่ม\n" +
    "= เท่าเดิม: " + r.same + " เล่ม\n" +
    (isAll
      ? "⬇️ ลดราคา: " + r.down.length + " เล่ม (−฿" + sumDown.toLocaleString() + ")\n"
      : "⏸️ ราคาปัจจุบันสูงกว่า SP-2: " + r.down.length + " เล่ม (−฿" + sumDown.toLocaleString() +
        " ถ้าลด) — **ไม่แตะ** ดูรายการข้างล่างแล้วตัดสินเอง\n") +
    "🔶 ข้าม REVIEW/ของหายาก: " + r.skipReview + " เล่ม (ต้องเคาะเอง)\n" +
    "รวมที่" + (dryRun ? "จะ" : "") + "เปลี่ยน: " + r.changed + " เล่ม\n";
  if (r.up.length)   m += "\n⬆️ ขึ้นราคามากสุด:\n" + lines(r.up.slice().sort(function (a, b) { return (b.to - b.from) - (a.to - a.from); }), 10) + "\n";
  if (r.down.length) m += "\n" + (isAll ? "⬇️ ลดราคา:" : "⏸️ สูงกว่า SP-2 (ไม่ถูกแตะ — เช็กว่าตั้งแพงเพราะรู้ว่าเล่มดี หรือแค่ตั้งเกิน):") +
                          "\n" + lines(r.down.slice().sort(function (a, b) { return (b.from - b.to) - (a.from - a.to); }), 8) + "\n";
  return m;
}

function sp2PreviewApply() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  SpreadsheetApp.getUi().alert(_sp2ApplyMsg(_sp2ApplyCore(true, "UP", name), true, "UP"));
}

function _sp2ApplyRun(mode) {
  var ui = SpreadsheetApp.getUi();
  var name = _sp2ActiveOrWarn(); if (!name) return;
  var pre = _sp2ApplyCore(true, mode, name);
  if (!pre.changed) { ui.alert("✅ ราคาในช่อง Price ตรงกับ SP-2 อยู่แล้ว (โหมดนี้ไม่มีอะไรต้องเปลี่ยน)"); return; }
  var ok = ui.alert("⚠️ เขียนราคา SP-2 ลงช่อง Price — " + name,
    "โหมด: " + (mode === "ALL" ? "ทับทุกกรณี (รวมลดราคา)" : "ขึ้นราคา + เติมช่องว่างเท่านั้น") + "\n\n" +
    "จะเปลี่ยน " + pre.changed + " เล่ม — ขึ้น " + pre.up.length +
    " · เติมว่าง " + pre.fill.length +
    (mode === "ALL" ? " · ลด " + pre.down.length : "") + "\n" +
    "ข้าม REVIEW/ของหายาก " + pre.skipReview + " เล่ม\n\nยืนยันหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2ApplyCore(false, mode, name); });
  ui.alert(_sp2ApplyMsg(r, false, mode) + _sp2WriteErrMsg());
}
function sp2ApplySuggested()    { _sp2ApplyRun("UP"); }   // ค่าเริ่มต้น — ปลอดภัย
function sp2ApplySuggestedAll() { _sp2ApplyRun("ALL"); }  // ทับทุกกรณี

// ============================================================
// [SP2-MIGRATE] v17.3 — กรอก Copy Flags อัตโนมัติจากชื่อสินค้า
//   Incl. N Map(s) / แผนที่ / โปสเตอร์ → POSTER · สีทั้งเล่ม → FC
//   เติมเฉพาะช่อง Copy Flags ที่ว่าง · ชื่อ/SKU ไม่ถูกแตะ (ชื่อ variant คือตัวแยกกลุ่ม comp
//   และตัวกำหนดเลข RESTOCK — ห้ามลบออกจากชื่อ) · รันซ้ำได้ ไม่เขียนทับของที่กรอกมือ
// ============================================================
var SP2_NAME_FLAG_RULES = [
  [/incl\.?[^)]*map/i, "POSTER"],
  [/แผนที่/,           "POSTER"],
  [/โปสเตอร์|poster/i, "POSTER"],
  [/สีทั้งเล่ม/,        "FC"]
];

function _sp2FlagsFromName(name) {
  var out = [];
  for (var i = 0; i < SP2_NAME_FLAG_RULES.length; i++) {
    var fl = SP2_NAME_FLAG_RULES[i][1];
    if (SP2_NAME_FLAG_RULES[i][0].test(name) && out.indexOf(fl) === -1) out.push(fl);
  }
  return out.join(" ");
}

function _sp2MigrateFlagsCore(dryRun, sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  if (!COL.copyFlags) throw new Error("ไม่พบคอลัมน์ 'Copy Flags' — รัน SP-2 Setup ก่อน");

  var lastRow = sheet.getLastRow();
  var out = { filled: [], skippedHasValue: 0, byFlag: {}, sheet: t.name };
  if (lastRow < 3) return out;

  var names = sheet.getRange(3, COL.name, lastRow - 2, 1).getValues();
  var flagsRange = sheet.getRange(3, COL.copyFlags, lastRow - 2, 1);
  var flags = flagsRange.getValues();

  for (var i = 0; i < names.length; i++) {
    var nm = names[i][0] ? names[i][0].toString().trim() : "";
    if (!nm) continue;
    var det = _sp2FlagsFromName(nm);
    if (!det) continue;
    var curv = (flags[i][0] || "").toString().trim();
    if (curv) { out.skippedHasValue++; continue; }   // มีค่าอยู่แล้ว (กรอกมือ) — ไม่แตะ
    flags[i][0] = det;
    out.filled.push({ row: i + 3, title: nm.slice(0, 50), flags: det });
    out.byFlag[det] = (out.byFlag[det] || 0) + 1;
  }

  if (!dryRun && out.filled.length) {
    _tryWrite("Copy Flags", function () { flagsRange.setValues(flags); SpreadsheetApp.flush(); });
  }
  return out;
}

function sp2MigrateFlags() {
  var ui = SpreadsheetApp.getUi();
  var name = _sp2ActiveOrWarn(); if (!name) return;
  var pre = _sp2MigrateFlagsCore(true, name);
  if (!pre.filled.length) {
    ui.alert("✅ ไม่มีอะไรต้องเติม (เจอในชื่อแต่มีค่าแล้ว: " + pre.skippedHasValue + " เล่ม)");
    return;
  }
  var ok = ui.alert("🏷️ เติม Copy Flags จากชื่อสินค้า",
    "จะเติม " + pre.filled.length + " เล่ม (" +
    Object.keys(pre.byFlag).map(function (k) { return k + " " + pre.byFlag[k]; }).join(" · ") + ")\n" +
    "ข้ามที่กรอกไว้แล้ว " + pre.skippedHasValue + " เล่ม · ชื่อ/SKU ไม่ถูกแตะ\n\n" +
    "⚠️ เสร็จแล้วให้กด 'คำนวณ Suggested Price (SP-2)' ใหม่ 1 ครั้ง\n\nยืนยันหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2MigrateFlagsCore(false, name); });
  var msg = "✅ เติม Copy Flags แล้ว " + r.filled.length + " เล่ม (" + r.sheet + ")\n\n" +
    r.filled.slice(0, 15).map(function (x) {
      return "แถว " + x.row + " [" + x.flags + "] " + x.title;
    }).join("\n");
  if (r.filled.length > 15) msg += "\n… อีก " + (r.filled.length - 15) + " เล่ม";
  msg += "\n\n→ อย่าลืมกด 💰 คำนวณ Suggested Price (SP-2) ใหม่" + _sp2WriteErrMsg();
  ui.alert(msg);
}

// ============================================================
// [SP2-RARITY] v18.4 — เติม Rarity อัตโนมัติจากราคาขายจริง
//   ตัวชี้ 2 ตัว (ทั้งคู่ไม่โดนต้นทุนกวน):
//     A) ราคาขาย median ของไตเติลนั้น เทียบ percentile ของทั้งชีต
//     B) ราคาขาย median เทียบ "เพื่อนร่วมกลุ่ม" = สำนักพิมพ์เดียวกัน × ช่วงราคาปกเดียวกัน (n≥8)
//   เข้าเกณฑ์ข้อใดข้อหนึ่ง → ยกระดับ (สำนักพิมพ์จึงมีผลจริงตามที่ต้องการ)
//   ไตเติลที่ยังไม่เคยขาย → "NEW" (ยังไม่มีข้อมูลตัดสิน ไม่ใช่ "ไม่หายาก")
//   คีย์ = ชื่อฐาน + สำนักพิมพ์ · ถ้าไม่เจอค่อยถอยไปใช้ชื่อฐานอย่างเดียว
// ============================================================
function _sp2Pctl(sortedArr, p) {
  if (!sortedArr.length) return null;
  var i = Math.floor(p * sortedArr.length);
  return sortedArr[Math.min(i, sortedArr.length - 1)];
}

function _sp2AutoRarityCore(sheetName, dryRun) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet, C = _sp2Cfg(t.name);
  var COL = _resolveColumns(sheet);
  if (!COL.rarity) throw new Error("ไม่พบคอลัมน์ 'Rarity' — รัน SP-2 Setup ก่อน");

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var out = { counts: {}, changed: [], rows: 0, sheet: t.name, thresholds: {} };
  if (lastRow < 3) return out;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var R = C.RARITY;

  // ── รวบรวมราคาขายจริง ──
  var allPrices = [], byTitlePub = {}, byTitle = {}, peer = {};
  for (var i = 0; i < data.length; i++) {
    var nm = _val(data[i], COL, "name"); nm = nm ? nm.toString().trim() : "";
    if (!nm) continue;
    if ((_val(data[i], COL, "status") || "").toString().trim() !== "Sold") continue;
    var pr = parseFloat(_val(data[i], COL, "price"));
    if (isNaN(pr) || pr <= 0) continue;
    var bt  = _getBaseTitle(nm).toUpperCase();
    var pub = (_val(data[i], COL, "publisher") || "").toString().trim().toUpperCase();
    var bd  = _sp2CoverBand(_val(data[i], COL, "original"), C);
    allPrices.push(pr);
    (byTitlePub[bt + "|" + pub] = byTitlePub[bt + "|" + pub] || []).push(pr);
    (byTitle[bt] = byTitle[bt] || []).push(pr);
    if (bd !== null) (peer[pub + "|" + bd] = peer[pub + "|" + bd] || []).push(pr);
  }
  allPrices.sort(function (a, b) { return a - b; });
  var t1 = _sp2Pctl(allPrices, R.R1_PCTL), t2 = _sp2Pctl(allPrices, R.R2_PCTL);
  out.thresholds = { r1: t1, r2: t2, soldN: allPrices.length };
  if (t1 === null) throw new Error("ยังไม่มีข้อมูลการขายในชีตนี้ — เติม Rarity อัตโนมัติไม่ได้");

  var peerMed = {};
  for (var k in peer) if (peer[k].length >= R.PEER_MIN_N) peerMed[k] = _median(peer[k]);

  // ── ตัดสินทีละแถว ──
  var rarRange = sheet.getRange(3, COL.rarity, data.length, 1);
  var cur = rarRange.getValues();
  for (var j = 0; j < data.length; j++) {
    var name = _val(data[j], COL, "name"); name = name ? name.toString().trim() : "";
    if (!name) continue;
    out.rows++;
    var b2  = _getBaseTitle(name).toUpperCase();
    var pb  = (_val(data[j], COL, "publisher") || "").toString().trim().toUpperCase();
    var arr = byTitlePub[b2 + "|" + pb] || byTitle[b2] || null;
    var tier;
    if (!arr) {
      tier = "NEW";
    } else {
      var med = _median(arr);
      var bd2 = _sp2CoverBand(_val(data[j], COL, "original"), C);
      var pm  = (bd2 !== null) ? peerMed[pb + "|" + bd2] : null;
      var ratio = (pm && pm > 0) ? med / pm : null;
      if (med >= t1 || (ratio !== null && ratio >= R.R1_PEER))      tier = "R1";
      else if (med >= t2 || (ratio !== null && ratio >= R2Peer(R))) tier = "R2";
      else                                                          tier = "R3";
    }
    out.counts[tier] = (out.counts[tier] || 0) + 1;
    var was = (cur[j][0] || "").toString().trim();
    if (was !== tier) {
      if (out.changed.length < 400) out.changed.push({ row: j + 3, title: name.slice(0, 44), from: was || "(ว่าง)", to: tier });
      cur[j][0] = tier;
    }
  }
  if (!dryRun) _tryWrite("Rarity", function () { rarRange.setValues(cur); SpreadsheetApp.flush(); });
  return out;
}
function R2Peer(R) { return R.R2_PEER; }

function sp2AutoRarity() {
  var ui = SpreadsheetApp.getUi();
  var name = _sp2ActiveOrWarn(); if (!name) return;
  var pre = _sp2AutoRarityCore(name, true);
  var c = pre.counts;
  var ok = ui.alert("💎 เติม Rarity อัตโนมัติ — " + name,
    "จากราคาขายจริง " + pre.thresholds.soldN + " รายการ\n" +
    "เกณฑ์: R1 ≥ ฿" + pre.thresholds.r1 + " หรือ ≥1.8× เพื่อนร่วมสำนักพิมพ์ · " +
    "R2 ≥ ฿" + pre.thresholds.r2 + " หรือ ≥1.4×\n\n" +
    "ผลที่จะได้: " + ["R1", "R2", "R3", "NEW"].map(function (k) { return k + " " + (c[k] || 0); }).join(" · ") + "\n" +
    "เปลี่ยนค่า " + pre.changed.length + " แถว\n\n" +
    "⚠️ ช่อง Rarity เป็นค่าที่ระบบคำนวณให้ — การรันนี้จะเขียนทับที่กรอกเองไว้ทั้งหมด\n\nยืนยันหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2AutoRarityCore(name, false); });
  var msg = "✅ เติม Rarity เรียบร้อย (" + r.sheet + ")\n\n" +
    ["R1", "R2", "R3", "NEW"].map(function (k) { return k + ": " + (r.counts[k] || 0); }).join(" · ") + "\n\n" +
    "ตัวอย่างที่เปลี่ยน:\n" +
    r.changed.slice(0, 12).map(function (x) { return "  แถว " + x.row + " " + x.from + "→" + x.to + "  " + x.title; }).join("\n") +
    (r.changed.length > 12 ? "\n  … อีก " + (r.changed.length - 12) + " แถว" : "") +
    "\n\n→ กด 💰 คำนวณราคา SP-2 ใหม่ (R1 จะเข้า REVIEW · R2 ขยายขอบบนของช่วงราคา)" + _sp2WriteErrMsg();
  ui.alert(msg);
}

// ============================================================
// [SP2-AUCTION] v18.7 — หา Sold ที่น่าจะเป็น Auction แต่ลืมแก้สถานะ
//   เหตุผล: ราคาประมูลจบต่ำกว่าราคาขายปกติมาก (ข้อมูลจริง = 29% ของราคา Sold)
//   ถ้าปล่อยไว้เป็น Sold มันจะถูกนับเป็น comp แล้วลากราคาแนะนำของไตเติลนั้นลงทั้งกลุ่ม
//   ทดสอบแล้ว: ตัด 13 แถวนี้ออก → ค่ากลางของ 12 ไตเติลที่กระทบขยับขึ้น +26%
// ============================================================
function _sp2SuspectAuctionCore(sheetName, dryRun, ratioOverride) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet, C = _sp2Cfg(t.name);
  var COL = _resolveColumns(sheet);
  if (!COL.status || !COL.price) throw new Error("ไม่พบคอลัมน์ Status / Price");
  var conf = C.AUCTION_SUSPECT;
  var ratio = (ratioOverride > 0) ? ratioOverride : conf.RATIO;

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var out = { found: [], groups: 0, ratio: ratio, sheet: t.name, changed: 0 };
  if (lastRow < 3) return out;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

  // จัดกลุ่ม: ชื่อฐาน + สำนักพิมพ์ + เครื่อง
  var grp = {};
  for (var i = 0; i < data.length; i++) {
    var nm = _val(data[i], COL, "name"); nm = nm ? nm.toString().trim() : "";
    if (!nm) continue;
    if ((_val(data[i], COL, "status") || "").toString().trim() !== "Sold") continue;
    var p = parseFloat(_val(data[i], COL, "price"));
    if (isNaN(p) || p <= 0) continue;
    var cond = (_val(data[i], COL, "condition") || "").toString().trim().toUpperCase();
    var cm = C.COND_MULT[cond] || 1;
    var fm = _sp2FlagsMult(_val(data[i], COL, "copyFlags"), C).mult || 1;
    var key = [_getBaseTitle(nm).toUpperCase(),
               (_val(data[i], COL, "publisher") || "").toString().trim().toUpperCase(),
               (_val(data[i], COL, "platform")  || "").toString().trim().toUpperCase()].join("|");
    (grp[key] = grp[key] || []).push({
      row: i + 3, idx: i, title: nm, sku: (_val(data[i], COL, "productId") || "").toString(),
      price: p, cond: cond, aEquiv: p / cm / fm
    });
  }

  // หาแถวที่ต่ำผิดปกติเทียบเล่มสูงสุดในกลุ่มเดียวกัน
  for (var k in grp) {
    var v = grp[k];
    if (v.length < conf.MIN_PEERS) continue;
    out.groups++;
    var mx = 0;
    for (var a = 0; a < v.length; a++) if (v[a].aEquiv > mx) mx = v[a].aEquiv;
    for (var b = 0; b < v.length; b++) {
      if (v[b].aEquiv < mx * ratio) {
        out.found.push({ row: v[b].row, idx: v[b].idx, title: v[b].title, sku: v[b].sku,
                         price: v[b].price, cond: v[b].cond,
                         topA: Math.round(mx), pct: Math.round(100 * v[b].aEquiv / mx),
                         peers: v.length });
      }
    }
  }
  out.found.sort(function (x, y) { return x.pct - y.pct; });

  if (!dryRun && out.found.length) {
    var stRange = sheet.getRange(3, COL.status, data.length, 1);
    var st = stRange.getValues();
    var sd = COL.soldDate ? sheet.getRange(3, COL.soldDate, data.length, 1).getValues() : null;
    for (var f = 0; f < out.found.length; f++) {
      st[out.found[f].idx][0] = "Auction";
      if (sd) sd[out.found[f].idx][0] = "";   // ประมูลไม่ใช่การขายปกติ → ล้างวันขาย
      out.changed++;
    }
    _tryWrite("Status → Auction", function () { stRange.setValues(st); });
    if (sd) _tryWrite("ล้าง Sold Date", function () {
      sheet.getRange(3, COL.soldDate, data.length, 1).setValues(sd);
    });
    SpreadsheetApp.flush();
  }
  return out;
}

function sp2FlagSuspectAuction() {
  var ui = SpreadsheetApp.getUi();
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var pre = _sp2SuspectAuctionCore(name, true);
  if (!pre.found.length) {
    ui.alert("✅ ไม่พบ Sold ที่ราคาต่ำผิดปกติ (" + name + ")\n" +
             "เทียบใน " + pre.groups + " กลุ่ม (ชื่อ+สำนักพิมพ์+เครื่อง ตรงกัน)");
    return;
  }
  var lines = pre.found.slice(0, 20).map(function (x) {
    return "  แถว " + x.row + " · ฿" + x.price + " [" + (x.cond || "-") + "] = " + x.pct +
           "% ของเล่มสูงสุด(฿" + x.topA + ")\n     " + x.title.slice(0, 52);
  }).join("\n");
  var ok = ui.alert("🔍 Sold ที่น่าจะเป็น Auction — " + name,
    "เกณฑ์: ราคา (ปรับสภาพแล้ว) ต่ำกว่า " + Math.round(pre.ratio * 100) +
    "% ของเล่มที่ขายแพงสุดในกลุ่มเดียวกัน\n" +
    "กลุ่ม = ชื่อฐาน + สำนักพิมพ์ + เครื่อง ตรงกันทั้งหมด (เทียบ " + pre.groups + " กลุ่ม)\n\n" +
    "พบ " + pre.found.length + " แถว:\n" + lines +
    (pre.found.length > 20 ? "\n  … อีก " + (pre.found.length - 20) + " แถว" : "") +
    "\n\nจะเปลี่ยน Status เป็น \"Auction\" และล้าง Sold Date\n" +
    "(Auction ไม่ถูกนับเป็นตัวเทียบราคา แต่ยังใช้เป็นพื้นราคาได้)\n\nยืนยันหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var r = _withLock(function () { return _sp2SuspectAuctionCore(name, false); });
  ui.alert("✅ เปลี่ยนเป็น Auction แล้ว " + r.changed + " แถว (" + r.sheet + ")\n\n" +
           "→ กด 💰 คำนวณราคา SP-2 ใหม่ เพื่อให้ราคาสะท้อนข้อมูลที่สะอาดขึ้น" + _sp2WriteErrMsg());
}

// ============================================================
// [SP2-AUDIT] Instock ที่ราคาปัจจุบันต่ำกว่า target เกิน 20% (P1.5)
// ============================================================
function _sp2AuditCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  if (!COL.price) throw new Error("ไม่พบคอลัมน์ 'Price'");

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var idx = _sp2BuildIndexes(data, COL, t.name);
  var out = [], bg = [];

  for (var i = 0; i < data.length; i++) {
    bg.push([null]);
    var title = _val(data[i], COL, "name");
    title = title ? title.toString().trim() : "";
    if (!title) continue;
    var status = (_val(data[i], COL, "status") || "").toString().trim();
    if (status !== "Instock") continue;
    var price = parseFloat(_val(data[i], COL, "price"));
    if (isNaN(price) || price <= 0) continue;

    var r = _sp2Calc(_sp2ItemFromRow(data[i], COL, title), idx);
    var tgt = parseFloat(r.target);
    if (isNaN(tgt) || tgt <= 0) continue;

    if (price < tgt * 0.8) {
      bg[i] = [SP2_AUDIT_BG];
      out.push({ row: i + 3, title: title,
                 cond: (_val(data[i], COL, "condition") || "").toString().trim(),
                 price: price, target: tgt, range: r.rangeStr || "", tier: r.tier });
    }
  }
  _tryWrite("ระบายสี Price (audit)", function () {
    sheet.getRange(3, COL.price, bg.length, 1).setBackgrounds(bg);
  });
  return out;
}

function sp2AuditUnderpriced() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var rows = _withLock(function () { return _sp2AuditCore(name); });
  var msg = "🚨 Audit ราคาต่ำกว่าตลาด — " + name + " (Instock · ต่ำกว่า target >20%)\n\n" +
            "พบ " + rows.length + " เล่ม (ระบายแดงที่ช่อง Price แล้ว)\n\n";
  msg += rows.slice(0, 15).map(function (r) {
    return "แถว " + r.row + ": " + r.title + " [" + r.cond + "] ฿" + r.price + " → target ฿" + r.target;
  }).join("\n");
  if (rows.length > 15) msg += "\n… และอีก " + (rows.length - 15) + " เล่ม";
  if (!rows.length) msg = "✅ ไม่พบ Instock ที่ราคาต่ำกว่า target เกิน 20%";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-REVIEW] คิวของหายากรอเคาะราคา
// ============================================================
function _sp2ReviewCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var idx = _sp2BuildIndexes(data, COL, t.name);
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var title = _val(data[i], COL, "name");
    title = title ? title.toString().trim() : "";
    if (!title) continue;
    var status = (_val(data[i], COL, "status") || "").toString().trim();
    if (status !== "Instock") continue;
    var r = _sp2Calc(_sp2ItemFromRow(data[i], COL, title), idx);
    if (r.review) {
      out.push({ row: i + 3, title: title,
                 cond: (_val(data[i], COL, "condition") || "").toString().trim(),
                 target: r.target, range: r.rangeStr, refStr: r.refStr, tier: r.tier });
    }
  }
  return out;
}

function sp2ReviewQueue() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  var rows = _sp2ReviewCore(name);
  var msg = "🔶 Review Queue " + name + " (Instock รอเคาะราคา) — " + rows.length + " เล่ม\n\n";
  msg += rows.slice(0, 15).map(function (r) {
    return "แถว " + r.row + ": " + r.title + " [" + r.cond + "] " + r.range;
  }).join("\n");
  if (rows.length > 15) msg += "\n… และอีก " + (rows.length - 15) + " เล่ม";
  if (!rows.length) msg = "✅ ไม่มีของค้างใน Review Queue";
  SpreadsheetApp.getUi().alert(msg);
}

// ทาสี REVIEW ใหม่จากค่า Price Range (ใช้หลัง sort — สีไม่เลื่อนตามแถว)
function _sp2RepaintFromRange(sheet, COL) {
  if (!COL.priceRange) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  var vals = sheet.getRange(3, COL.priceRange, lastRow - 2, 1).getValues();
  var bg = [];
  for (var i = 0; i < vals.length; i++) {
    var s = (vals[i][0] || "").toString();
    bg.push([s.indexOf("REVIEW") === 0 ? SP2_REVIEW_BG : null]);
  }
  _tryWrite("สี REVIEW (Price Range)", function () {
    sheet.getRange(3, COL.priceRange, bg.length, 1).setBackgrounds(bg);
  });
}

// ============================================================
// [B] _detectRestock — เดิม
// ============================================================
function _detectRestock(titleValue, currentRow, allData, COL) {
  var reRSTag     = /RESTOCK-(\d+)/i;
  var baseToCheck = _getBaseTitle(titleValue).toLowerCase();
  var maxRestock  = -1;
  var hasExistingTag = false;

  var currentMatch  = titleValue.match(reRSTag);
  var currentTagNum = currentMatch ? parseInt(currentMatch[1], 10) : null;

  for (var i = 0; i < allData.length; i++) {
    if (i + 3 === currentRow) continue;
    var existing = _val(allData[i], COL, "name");
    existing = existing ? existing.toString().trim() : "";
    if (!existing) continue;

    if (_getBaseTitle(existing).toLowerCase() !== baseToCheck) continue;

    var rm = existing.match(reRSTag);
    if (rm) {
      var num = parseInt(rm[1], 10);
      if (num > maxRestock) maxRestock = num;
      if (currentTagNum === num) hasExistingTag = true;
    } else if (maxRestock < 0) {
      maxRestock = 0;
    }
  }

  if (maxRestock < 0) return { title: titleValue, isRestock: false };
  if (currentTagNum !== null && !hasExistingTag) return { title: titleValue, isRestock: true };

  var next    = maxRestock + 1;
  var nextStr = next < 10 ? "0" + next : "" + next;
  var newTitle;
  if (reRSTag.test(titleValue)) {
    newTitle = titleValue.replace(/RESTOCK-\d+/i, "RESTOCK-" + nextStr);
  } else {
    var lastBracket = titleValue.lastIndexOf(")");
    if (lastBracket !== -1 && lastBracket === titleValue.length - 1) {
      newTitle = titleValue.slice(0, lastBracket) + "・RESTOCK-" + nextStr + ")";
    } else {
      newTitle = titleValue + " (RESTOCK-" + nextStr + ")";
    }
  }
  return { title: newTitle, isRestock: true };
}

// ============================================================
// [C] _buildSKU — เดิม
// ============================================================
function _buildSKU(titleValue, pubText, condText, currentRow, allData, sheetName, COL) {
  var baseTitle  = _getBaseTitle(titleValue).toUpperCase();
  var catLetter  = getCatLetter(baseTitle);
  var prefix     = sheetName === MAG_SHEET ? "OWA-MAG" : "OWA-GGB";
  var idRegex    = new RegExp(prefix + catLetter + "(\\d{3})");
  var gameNumStr = "";
  var maxNum     = 0;

  for (var i = 0; i < allData.length; i++) {
    if (i + 3 === currentRow) continue;
    var rowTitle = _val(allData[i], COL, "name");
    rowTitle = rowTitle ? rowTitle.toString().trim() : "";
    var rowId = _val(allData[i], COL, "productId");
    rowId = rowId ? rowId.toString().trim() : "";
    if (!rowTitle || !rowId) continue;

    var rowBase = _getBaseTitle(rowTitle).toUpperCase();
    var nm = rowId.match(idRegex);
    if (!nm) continue;

    var num = parseInt(nm[1], 10);
    if (num > maxNum) maxNum = num;
    if (gameNumStr === "" && rowBase === baseTitle) gameNumStr = nm[1];
  }

  if (!gameNumStr) { maxNum++; gameNumStr = ("000" + maxNum).slice(-3); }
  return _composeSKU(catLetter, gameNumStr, pubText, condText, titleValue, prefix);
}

// ============================================================
// [D] _composeSKU + Publisher Code Map — เดิม
// ============================================================
function _composeSKU(catLetter, gameNumStr, pubText, condText, fullTitle, prefix) {
  var pubCode   = _getPubCode(pubText);
  var condCode  = _getCondCode(condText);
  var stockCode = "N00";

  var rm = fullTitle.match(/RESTOCK-(\d+)/i);
  if (rm) { var rn = rm[1]; stockCode = "R" + (rn.length === 1 ? "0" + rn : rn); }

  var specCode = fullTitle.indexOf("สีทั้งเล่ม") !== -1 ? "FC" : "";
  return prefix + catLetter + gameNumStr + pubCode + condCode + stockCode + specCode;
}

function _getPubCode(pubText) {
  var p = pubText.toString().toUpperCase().trim();

  if (p.indexOf("HERO ANIMATION") !== -1)                            return "HA";

  if (p.indexOf("ANIMATE") !== -1 || p === "AM")                    return "AM";
  if (p.indexOf("VIBULKIJ") !== -1 || p === "VK")                   return "VK";
  if (p.indexOf("YK GROUP-2") !== -1 || p === "YK2")                return "YK2";
  if (p.indexOf("YK GROUP")   !== -1 || p === "YK")                 return "YK";
  if (p.indexOf("VIDEO GAMES MAGAZINE") !== -1)                     return "VGM";
  if (p.indexOf("VIDEO GAMES") !== -1 || p === "VG")                return "VG";
  if (p.indexOf("GAMGEMAG TOP SECRET") !== -1)                       return "GTS";
  if (p.indexOf("GAMGEMAG")        !== -1)                           return "GTS";
  if (p.indexOf("GAMEMAG SPECIAL") !== -1)                           return "GMS";
  if (p.indexOf("GAMEMAG")     !== -1 || p === "GM")                return "GM";
  if (p.indexOf("MAGIC GUIDE") !== -1 || p === "MG")                return "MG";
  if (p.indexOf("CYBERTEAM")   !== -1 || p === "CT")                return "CT";
  if (p.indexOf("TONBO")       !== -1 || p === "TB")                return "TB";
  if (p.indexOf("UKI")         !== -1 || p === "UK")                return "UK";
  if (p.indexOf("INSIDE")          !== -1)                           return "IN";
  if (p.indexOf("BRIGHT")          !== -1)                           return "BR";
  if (p.indexOf("FORWARD")         !== -1)                           return "FW";
  if (p.indexOf("ZINE")            !== -1)                           return "ZN";
  if (p.indexOf("CLEAR GAME")      !== -1)                           return "CG";
  if (p.indexOf("FUN INFINITE")    !== -1)                           return "FI";
  if (p === "SB" || p.indexOf("SB") !== -1)                          return "SB";
  if (p.indexOf("GAMEBOY PROJECT") !== -1)                           return "GBP";
  if (p.indexOf("JOKER GAMES")     !== -1)                           return "JG";
  if (p.indexOf("GAMEBEST")        !== -1)                           return "GB";
  if (p.indexOf("FUTURE GAMER")    !== -1)                           return "FG";
  if (p.indexOf("A GAME")          !== -1)                           return "AG";
  if (p.indexOf("ALPHA")           !== -1)                           return "AL";
  if (p.indexOf("BOMB")            !== -1)                           return "BM";
  if (p.indexOf("DS PLAYER")       !== -1)                           return "DSP";
  if (p.indexOf("DUMBO")           !== -1)                           return "DB";
  if (p.indexOf("EXPERT GAMER")    !== -1)                           return "EG";
  if (p.indexOf("FAMILY COMPUTER") !== -1)                           return "FC";
  if (p.indexOf("FG TEAM")         !== -1)                           return "FGT";
  if (p.indexOf("GAME PLAYER")     !== -1)                           return "GP";
  if (p.indexOf("GAME STAR")       !== -1)                           return "GS";
  if (p.indexOf("GAMEGUIDE")       !== -1)                           return "GG";
  if (p.indexOf("IX NEXT")         !== -1)                           return "IXN";
  if (p.indexOf("JZ COMPANY")      !== -1)                           return "JZ";
  if (p.indexOf("MEGA SPECIAL")    !== -1)                           return "MS";
  if (p.indexOf("MILLENNIUM")      !== -1)                           return "ML";
  if (p.indexOf("NU TRON")         !== -1)                           return "NT";
  if (p.indexOf("PA.GROUP")        !== -1)                           return "PAG";
  if (p.indexOf("PC-CD ROM")       !== -1)                           return "PCR";
  if (p.indexOf("PLAY LITE")       !== -1)                           return "PL";
  if (p.indexOf("PLAYSTATION")     !== -1)                           return "PS";
  if (p.indexOf("PS PASS")         !== -1)                           return "PSP";
  if (p.indexOf("PERFECT GUIDE")   !== -1)                           return "PGK";
  if (p.indexOf("SPEED")           !== -1)                           return "SP";
  if (p.indexOf("TAGTEAM")         !== -1)                           return "TGT";
  if (p.indexOf("V.T.GROUP")       !== -1)                           return "VTG";
  if (p.indexOf("VALENTINE")       !== -1)                           return "VLT";
  if (p.indexOf("YEN PRINT")       !== -1)                           return "YP";

  if (p.indexOf("DEX EXPRESS")     !== -1)                           return "DEX";
  if (p.indexOf("GAME EXPRESS")    !== -1)                           return "GEX";
  if (p.indexOf("TANABAN")         !== -1)                           return "TBP";
  if (p.indexOf("LUCKPIM")         !== -1)                           return "LP";
  if (p.indexOf("KADOKAWA")        !== -1)                           return "KDK";
  if (p.indexOf("GOLDEN GROUP")    !== -1)                           return "GLD";
  if (p.indexOf("EASY GAMER")      !== -1)                           return "EAG";
  if (p.indexOf("ENIX")            !== -1)                           return "EN";
  if (p.indexOf("ELISE")           !== -1)                           return "ELS";
  if (p.indexOf("YOEI")            !== -1)                           return "YE";
  if (p.indexOf("KOE")             !== -1)                           return "KOE";
  if (p === "APT" || p.indexOf("APT") !== -1)                        return "APT";

  return "";
}

function _getCondCode(condText) {
  var c = condText.toString().toUpperCase().trim();
  return (c === "S" || c === "A" || c === "B" || c === "C" || c === "D") ? c : "";
}

// ============================================================
// [E] getCatLetter — เดิม
// ============================================================
function getCatLetter(baseTitle) {
  var m = baseTitle.match(/[A-Za-z0-9฀-๿]/);
  if (!m) return "O";
  var c = m[0];
  if (/^[฀-๿]/.test(c)) return "T";
  if (/^[A-Za-z]/.test(c))        return c.toUpperCase();
  if (/^[0-9]/.test(c))           return "N";
  return "O";
}

// ============================================================
// [F] _autoFormat — เดิม
// ============================================================
function _autoFormat(text) {
  text = text.replace(/\/\//g, "｜");
  text = text.replace(/\//g, "-");
  text = text.replace(/\s*:\s*/g, " - ");
  var result = "", depth = 0, i = 0;
  while (i < text.length) {
    var ch = text[i];
    if      (ch === "(")             { depth++; result += ch; i++; }
    else if (ch === ")")             { depth--; result += ch; i++; }
    else if (text.substr(i, 3) === " | ") { result += depth === 0 ? " × " : "・"; i += 3; }
    else { result += ch; i++; }
  }
  return result;
}

// ============================================================
// [SORT] natural sort — เดิม
// ============================================================
var _SP2_ROMAN = { "viii":"008","vii":"007","vi":"006","iv":"004","iii":"003","ii":"002",
                   "ix":"009","xiv":"014","xiii":"013","xii":"012","xi":"011","xv":"015",
                   "x":"010","v":"005","i":"001" };
var _SP2_RN = "viii|vii|vi|iv|iii|ii|ix|xiv|xiii|xii|xi|xv|x|v|i";
// v18.2: "I-II" (ช่วงเล่มรวม) ต้องแปลงเป็นเลขด้วย ไม่งั้นตกไปท้ายกลุ่ม
//   แปลงเฉพาะเมื่อ "โรมัน-โรมัน" ทั้งสองฝั่ง → "X-Men" ไม่โดน (Men ไม่ใช่เลขโรมัน)
var _SP2_RE_RANGE  = new RegExp("(^|\\s)(" + _SP2_RN + ")-(" + _SP2_RN + ")(?=\\s|$)", "g");
var _SP2_RE_SINGLE = new RegExp("(^|\\s)(" + _SP2_RN + ")(?=\\s|$)", "g");

function _sortKey(s) {
  s = (s === null || s === undefined) ? "" : s.toString().toLowerCase();
  var stripped = s.replace(/^[^a-z0-9฀-๿]+/, "");
  if (stripped) s = stripped;
  s = s.replace(_SP2_RE_RANGE, function (m, pre, a, b) {
    return pre + _SP2_ROMAN[a] + "-" + _SP2_ROMAN[b];
  });
  return s.replace(_SP2_RE_SINGLE, function (m, pre, rn) { return pre + _SP2_ROMAN[rn]; });
}

// v18.1: เลข RESTOCK จากชื่อ (ไม่มี = 0 คือเล่มแรก)
function _restockNum(t) {
  var m = String(t || "").match(/RESTOCK-(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

// v18.1: เทียบชื่อสำหรับ "เรียงในชีต" — ตัด RESTOCK ออกก่อนเทียบ แล้วค่อยเรียงตามเลข RESTOCK
//   เดิมเทียบชื่อเต็ม ทำให้ "Fatal Frame (RESTOCK-01)" ตกไปอยู่หลัง "Fatal Frame III"
//   เพราะเทียบอักขระ: ช่องว่าง(32) มาก่อน "("(40) → ภาคต่อแทรกกลางกลุ่ม RESTOCK
function _titleCmp(a, b) {
  var c = _natCmp(_getBaseTitle(String(a || "")), _getBaseTitle(String(b || "")));
  if (c !== 0) return c;
  return _restockNum(a) - _restockNum(b);
}

function _natCmp(a, b) {
  var ax = _sortKey(a).match(/(\d+|\D+)/g) || [];
  var bx = _sortKey(b).match(/(\d+|\D+)/g) || [];
  var n = Math.max(ax.length, bx.length);
  for (var i = 0; i < n; i++) {
    var an = ax[i], bn = bx[i];
    if (an === undefined) return -1;
    if (bn === undefined) return 1;
    var aNum = /^\d+$/.test(an), bNum = /^\d+$/.test(bn);
    if (aNum && bNum) {
      var d = parseInt(an, 10) - parseInt(bn, 10);
      if (d !== 0) return d < 0 ? -1 : 1;
    } else {
      if (an < bn) return -1;
      if (an > bn) return 1;
    }
  }
  return 0;
}

// ============================================================
// [I] sortInventory — v17: + repaint REVIEW หลัง sort
// ============================================================
function sortInventory() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) return;

  var COL = _resolveColumns(sheet);
  if (!COL.name) { SpreadsheetApp.getUi().alert("⚠️ ไม่พบคอลัมน์ 'Item name'"); return; }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return;

  var range   = sheet.getRange(3, 1, lastRow - 2, lastCol);
  var data    = range.getValues();
  var nameIdx = COL.name - 1;

  data.sort(function(a, b) {
    var va = a[nameIdx] ? a[nameIdx].toString() : "";
    var vb = b[nameIdx] ? b[nameIdx].toString() : "";
    if (!va && !vb) return 0;
    if (!va) return 1;
    if (!vb) return -1;
    return _titleCmp(va, vb);   // v18.1: RESTOCK เกาะกลุ่มกับเล่มแม่เสมอ
  });

  range.setValues(data);
  _fixDerivedFormulasForSheet(sheet, COL);
  _sp2RepaintFromRange(sheet, COL);
}

// ============================================================
// [ADD] addInventoryRow — เพิ่มแถวใหม่ (เรียกจากเว็บแอป)
//   SP-2 + Listed Date + field ใหม่ (platform/genre/copyFlags/rarity/marketRef/refNote)
//   copyFlags: ไม่ส่งมา → เติมอัตโนมัติจากชื่อ (v17.4)
// ============================================================
function addInventoryRow(data) {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (data && data.sheetName === MAG_SHEET) ? MAG_SHEET : GGB_SHEET;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("ไม่พบชีต: " + sheetName);

    var COL     = _resolveColumns(sheet);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var newRow  = lastRow + 1;
    if (newRow < 3) newRow = 3;

    var title     = _autoFormat(data.title.trim());
    var pub       = (data.pub || "").trim();
    var cond      = (data.cond || "").trim().toUpperCase();
    var original  = data.original || "";
    var cost      = data.cost     || "";
    var price     = data.price    || "";
    var status    = data.status   || "Instock";
    var platform  = (data.platform  || "").toString().trim();
    var genre     = (data.genre     || "").toString().trim();
    var copyFlags = (data.copyFlags || "").toString().trim();
    var rarity    = (data.rarity    || "").toString().trim();
    if (!copyFlags) copyFlags = _sp2FlagsFromName(title);   // v17.4: auto จากชื่อ
    var marketRef = data.marketRef  || "";
    var refNote   = (data.refNote   || "").toString().trim();

    var allData = (lastRow >= 3) ? sheet.getRange(3, 1, lastRow - 2, lastCol).getValues() : [];

    var restockResult = _detectRestock(title, newRow, allData, COL);
    var finalTitle    = restockResult.title;
    var sku           = _buildSKU(finalTitle, pub, cond, newRow, allData, sheetName, COL);

    var idx = _sp2BuildIndexes(allData, COL, sheetName);
    var item = { name: finalTitle, publisher: pub, platform: platform, condition: cond,
                 original: original, cost: cost, copyFlags: copyFlags,
                 rarity: rarity, marketRef: marketRef };
    var result = _sp2Calc(item, idx);

    var setIf = function(key, val) { if (COL[key]) sheet.getRange(newRow, COL[key]).setValue(val); };
    setIf("name", finalTitle);
    setIf("publisher", pub);
    setIf("platform", platform);
    setIf("genre", genre);
    setIf("condition", cond);
    setIf("original", original);
    setIf("cost", cost);
    setIf("suggested", result.price);
    setIf("price", price);
    setIf("status", status);
    setIf("productId", sku);
    setIf("copyFlags", copyFlags);
    setIf("rarity", rarity);
    setIf("marketRef", marketRef);
    setIf("refNote", refNote);

    if (COL.priceRange) {
      setIf("priceRange", result.rangeStr || "");
      sheet.getRange(newRow, COL.priceRange).setBackground(result.review ? SP2_REVIEW_BG : null);
    }
    if (COL.maxGRef) setIf("maxGRef", result.refStr || "");

    // Listed Date: ประทับเมื่อเป็นของลงขายใหม่ (Sold ย้อนหลัง = ไม่รู้วันลง → เว้น)
    if (status !== "Sold" && COL.listedDate) setIf("listedDate", new Date());
    if (status === "Sold" && COL.soldDate) setIf("soldDate", new Date());

    _setDerivedFormulasForRow(sheet, newRow, COL);

    SpreadsheetApp.flush();

    return { success: true, row: newRow, title: finalTitle, sku: sku,
             suggested: result.price, target: result.target, open: result.open,
             priceRange: result.rangeStr, refStr: result.refStr,
             tier: result.tier, label: result.label, review: result.review,
             isRestock: restockResult.isRestock, sheetName: sheetName };
  });
}


// ============================================================
// [J] regenerateAllSKUs — เดิม
// ============================================================
function regenerateAllSKUs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อน");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.productId) { SpreadsheetApp.getUi().alert("⚠️ ไม่พบคอลัมน์ 'Product ID'"); return; }

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("⚠️ คำเตือน: รัน SKU ใหม่ทั้งหมด (หมวด " + sheetName + ")",
    "ระบบจะสร้าง Product ID ใหม่ทั้งหมดในหน้านี้ (เลขเกมจะถูกไล่ใหม่) คุณแน่ใจหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var colOut = [];
  var titleToNum = {}, catMax = {};
  var prefix = sheetName === MAG_SHEET ? "OWA-MAG" : "OWA-GGB";

  for (var i = 0; i < data.length; i++) {
    var title = _val(data[i], COL, "name");      title = title ? title.toString().trim() : "";
    var pub   = _val(data[i], COL, "publisher"); pub   = pub   ? pub.toString().trim()   : "";
    var cond  = _val(data[i], COL, "condition"); cond  = cond  ? cond.toString().trim()  : "";

    if (!title) { colOut.push([""]); continue; }

    var baseTitle = _getBaseTitle(title).toUpperCase();
    var catLetter = getCatLetter(baseTitle);
    var gameNumStr;
    if (titleToNum[baseTitle]) {
      gameNumStr = titleToNum[baseTitle];
    } else {
      if (!catMax[catLetter]) catMax[catLetter] = 0;
      catMax[catLetter]++;
      gameNumStr = ("000" + catMax[catLetter]).slice(-3);
      titleToNum[baseTitle] = gameNumStr;
    }
    colOut.push([_composeSKU(catLetter, gameNumStr, pub, cond, title, prefix)]);
  }

  sheet.getRange(3, COL.productId, colOut.length, 1).setValues(colOut);
  ui.alert("✅ สร้าง Product ID ใหม่ทั้งหมดเรียบร้อยแล้ว!");
}

// ============================================================
// [K] validateAllSKUs — เดิม
// ============================================================
function validateAllSKUs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อน");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.name || !COL.productId) { SpreadsheetApp.getUi().alert("⚠️ ไม่พบคอลัมน์ Item name / Product ID"); return; }

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  var colA = sheet.getRange(3, COL.name, lastRow - 2, 1).getValues();
  var colM = sheet.getRange(3, COL.productId, lastRow - 2, 1).getValues();

  var skuCount = {};
  for (var i = 0; i < colM.length; i++) {
    var s = colM[i][0] ? colM[i][0].toString().trim() : "";
    if (s) skuCount[s] = (skuCount[s] || 0) + 1;
  }

  var report = { missing: [], duplicate: [], badFormat: [], ok: 0 };
  var prefixRegex = sheetName === MAG_SHEET ? /^OWA-MAG/ : /^OWA-GGB/;

  for (var j = 0; j < colA.length; j++) {
    var title = colA[j][0] ? colA[j][0].toString().trim() : "";
    var sku   = colM[j][0] ? colM[j][0].toString().trim() : "";
    var cell  = sheet.getRange(j + 3, COL.productId);

    if (!title) { cell.setBackground(null); continue; }

    if (!sku) {
      cell.setBackground("#FFCCCC");
      report.missing.push("แถว " + (j + 3) + ": " + title);
    } else if (!prefixRegex.test(sku)) {
      cell.setBackground("#FFF3CD");
      report.badFormat.push("แถว " + (j + 3) + ": " + sku);
    } else if (skuCount[sku] > 1) {
      cell.setBackground("#FFD580");
      report.duplicate.push("แถว " + (j + 3) + ": " + sku);
    } else {
      cell.setBackground(null);
      report.ok++;
    }
  }

  var msg = "📋 ผล Validate Product ID หมวด " + sheetName + "\n\n✅ ถูกต้อง: " + report.ok + " แถว\n";
  if (report.missing.length)   msg += "\n❌ ไม่มี SKU (" + report.missing.length + ") — แดง:\n" + report.missing.slice(0,10).join("\n");
  if (report.duplicate.length) msg += "\n\n🔁 SKU ซ้ำ (" + report.duplicate.length + ") — ส้ม:\n" + report.duplicate.slice(0,10).join("\n");
  if (report.badFormat.length) msg += "\n\n⚠️ รูปแบบผิด (" + report.badFormat.length + ") — เหลือง:\n" + report.badFormat.slice(0,10).join("\n");
  if (!report.missing.length && !report.duplicate.length && !report.badFormat.length) msg += "\n🎉 Product ID ทั้งหมดถูกต้อง!";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [L] checkUnmappedPublishers — เดิม
// ============================================================
function checkUnmappedPublishers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อน");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.publisher) { SpreadsheetApp.getUi().alert("⚠️ ไม่พบคอลัมน์ 'Publisher'"); return; }

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  var colB = sheet.getRange(3, COL.publisher, lastRow - 2, 1).getValues();
  var unmapped = {};
  for (var i = 0; i < colB.length; i++) {
    var pub = colB[i][0] ? colB[i][0].toString().trim() : "";
    if (!pub) continue;
    if (_getPubCode(pub) === "") unmapped[pub] = (unmapped[pub] || 0) + 1;
  }

  var keys = Object.keys(unmapped);
  if (!keys.length) { SpreadsheetApp.getUi().alert("✅ ทุก Publisher มี Code แล้ว!"); return; }
  keys.sort(function(a, b) { return unmapped[b] - unmapped[a]; });
  var msg = "⚠️ Publisher ที่ยังไม่มี Code (" + keys.length + " รายการ):\n\n";
  keys.forEach(function(k) { msg += k + " (" + unmapped[k] + " items)\n"; });
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [M] setupInstallableTrigger — เดิม
// ============================================================
function setupInstallableTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "onEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEdit").forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert("✅ ติดตั้ง Installable Trigger เรียบร้อย!\nไม่ต้องรัน function นี้อีก");
}

// ============================================================
// [O] fixAllRestockTags — เดิม
// ============================================================
function fixAllRestockTags() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อน");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.name) return;

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("🛠️ ยืนยันการจัดระเบียบ RESTOCK หมวด " + sheetName,
    "ระบบจะล้างเลข Restock เดิม แล้วไล่ใหม่ (01, 02, 03...) คุณแน่ใจหรือไม่?",
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  var colA = sheet.getRange(3, COL.name, lastRow - 2, 1).getValues();
  var updated = [], titleCount = {};
  for (var i = 0; i < colA.length; i++) {
    var rawTitle = colA[i][0] ? colA[i][0].toString().trim() : "";
    if (!rawTitle) { updated.push([""]); continue; }

    var baseTitle = _getBaseTitle(rawTitle);
    var baseKey = baseTitle.toLowerCase();
    if (titleCount[baseKey] === undefined) titleCount[baseKey] = 0; else titleCount[baseKey]++;

    var count = titleCount[baseKey];
    var newTitle = baseTitle;
    if (count > 0) {
      var nextStr = count < 10 ? "0" + count : "" + count;
      var lastBracket = baseTitle.lastIndexOf(")");
      if (lastBracket !== -1 && lastBracket === baseTitle.length - 1) {
        newTitle = baseTitle.slice(0, lastBracket) + "・RESTOCK-" + nextStr + ")";
      } else {
        newTitle = baseTitle + " (RESTOCK-" + nextStr + ")";
      }
    }
    updated.push([newTitle]);
  }

  sheet.getRange(3, COL.name, updated.length, 1).setValues(updated);
  ui.alert("✅ จัดระเบียบ RESTOCK เรียบร้อย!\n\n⚠️ ชื่อเปลี่ยน → กรุณากด '🔄 สร้าง SKU ใหม่ทั้งหมด' ด้วย");
}

// ============================================================
// [P] v15 — DERIVED FORMULAS — เดิม
// ============================================================
function _colLetter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

// v18.3: gross-up ให้ได้ Price + ค่าส่ง สุทธิหลังหัก fee · ปัดขึ้นทีละ ฿10 (ปัดขึ้นเพื่อไม่ขาดทุน)
function _mktFormula(P) {
  var div = (1 - SHOPEE_FEE);
  return '=IF(OR(' + P + '="",NOT(ISNUMBER(' + P + '))),"",' +
         'MAX(' + SHOPEE_MIN + ',CEILING((' + P + '+' + SHOPEE_SHIP + ')/' + div + ',10)))';
}
function _gpFormula(P, C) {
  return '=IF(OR(' + P + '="",NOT(ISNUMBER(' + P + ')),' + C + '="",NOT(ISNUMBER(' + C + '))),"",' +
         'IF(' + C + '=0,' + P + '-' + C + ',' +
         'TEXT(' + P + '-' + C + ',"#,##0;(#,##0)")&" ("&TEXT((' + P + '-' + C + ')/' + C + ',"0%")&")"))';
}
// v18.4: กำไรฝั่ง Marketplace = (ราคาตั้งขาย × (1−fee) − ค่าส่ง) − Cost
function _gpMpFormula(MP, C) {
  var net = "(" + MP + "*" + (1 - SHOPEE_FEE) + "-" + SHOPEE_SHIP + ")";
  return '=IF(OR(' + MP + '="",NOT(ISNUMBER(' + MP + ')),' + C + '="",NOT(ISNUMBER(' + C + '))),"",' +
         'IF(' + C + '=0,ROUND(' + net + '-' + C + ',0),' +
         'TEXT(ROUND(' + net + '-' + C + ',0),"#,##0;(#,##0)")&" ("&TEXT((' + net + '-' + C + ')/' + C + ',"0%")&")"))';
}
function _pclFormula(A, P) {
  return '=IF(OR(' + A + '="",NOT(ISNUMBER(' + P + '))),"",' +
         'TRIM(REGEXREPLACE(' + A + ',"(?i)・RESTOCK-\\d+|\\s*\\(RESTOCK-\\d+\\)",""))&" — "&TEXT(' + P + ',"0"))';
}

function _setDerivedFormulasForRow(sheet, row, COL) {
  if (!COL.price) return;
  var P = _colLetter(COL.price) + row;
  var C = COL.cost ? _colLetter(COL.cost) + row : "";
  var A = COL.name ? _colLetter(COL.name) + row : "";
  if (COL.marketplace) _tryWrite("สูตร Market Place Price", function () {
    sheet.getRange(row, COL.marketplace).setFormula(_mktFormula(P)); });
  if (COL.grossProfit && C) _tryWrite("สูตร Gross Profit", function () {
    sheet.getRange(row, COL.grossProfit).setFormula(_gpFormula(P, C)); });
  if (COL.grossProfitMP && C && COL.marketplace) _tryWrite("สูตร Gross Profit MP", function () {
    sheet.getRange(row, COL.grossProfitMP).setFormula(_gpMpFormula(_colLetter(COL.marketplace) + row, C)); });
  if (COL.priceContentLists && A) _tryWrite("สูตร Price Content Lists", function () {
    sheet.getRange(row, COL.priceContentLists).setFormula(_pclFormula(A, P)); });
}

function _fixDerivedFormulasForSheet(sheet, COL) {
  if (!COL || !COL.price || !COL.name) return 0;

  var top = sheet.getLastRow();
  if (top < 2) return 0;
  var names = sheet.getRange(1, COL.name, top, 1).getValues();
  var last = 1;
  for (var r = 2; r <= top; r++) if (String(names[r - 1][0]).trim() !== "") last = r;
  if (last < 2) return 0;

  var n  = last - 1;
  var Pl = _colLetter(COL.price);
  var Cl = COL.cost ? _colLetter(COL.cost) : "";
  var Al = _colLetter(COL.name);

  var Ml = COL.marketplace ? _colLetter(COL.marketplace) : "";
  var fM = [], fG = [], fP = [], fGM = [];
  for (var rr = 2; rr <= last; rr++) {
    var P = Pl + rr, C = Cl + rr, A = Al + rr;
    fM.push([_mktFormula(P)]);
    if (Cl) fG.push([_gpFormula(P, C)]);
    if (Cl && Ml) fGM.push([_gpMpFormula(Ml + rr, C)]);
    fP.push([_pclFormula(A, P)]);
  }
  if (COL.marketplace) _tryWrite("สูตร Market Place Price", function () {
    sheet.getRange(2, COL.marketplace, n, 1).setFormulas(fM); });
  if (COL.grossProfit && Cl) _tryWrite("สูตร Gross Profit", function () {
    sheet.getRange(2, COL.grossProfit, n, 1).setFormulas(fG); });
  if (COL.grossProfitMP && Cl && Ml) _tryWrite("สูตร Gross Profit MP", function () {
    sheet.getRange(2, COL.grossProfitMP, n, 1).setFormulas(fGM); });
  if (COL.priceContentLists) _tryWrite("สูตร Price Content Lists", function () {
    sheet.getRange(2, COL.priceContentLists, n, 1).setFormulas(fP); });
  return last;
}

function fixDerivedFormulas() {
  _sp2ResetWriteErrors();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];
  [GGB_SHEET, MAG_SHEET].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var COL = _resolveColumns(sh);
    if (!COL.price || !COL.name) { report.push("• " + name + ": ไม่พบ Price/Item name"); return; }
    var last = _fixDerivedFormulasForSheet(sh, COL);
    report.push("• " + name + (last ? ": แถว 2–" + last : ": ไม่มีข้อมูล"));
  });
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert("✅ เติมสูตรเรียบร้อย (ไม่มี #REF!)\n\n" + report.join("\n") + _sp2WriteErrMsg() +
    "\n\nMarket Place / Gross Profit / Price Content Lists\nไม่แตะ Suggested / Price / Cost · เพิ่มเล่มแล้วกดซ้ำได้");
}

// ============================================================
// [N] onOpen — v17 เมนู
// ============================================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📦 Inventory Tools")
    // ── ตั้งค่าชีต (รันครั้งเดียว "ต่อชีต" — GGB และ MAGAZINE ต้องรันแยกกัน) ──
    .addItem("🧱 SP-2 Setup คอลัมน์ (ชีตที่เปิดอยู่)", "sp2Setup")
    .addItem("🎨 จัดหน้าชีต — เรียง/ซ่อน/dropdown", "sp2Layout")
    .addSeparator()
    // ── ใช้ประจำ ──
    .addItem("💰 คำนวณราคา SP-2 (ทั้งชีต)", "fillAllSuggestedPrices")
    .addItem("👀 พรีวิว: เอาราคา SP-2 ไปใส่ Price", "sp2PreviewApply")
    .addItem("✍️ ใช้ราคา SP-2 (ขึ้น + เติมช่องว่าง)", "sp2ApplySuggested")
    .addItem("🚨 Audit ราคาต่ำกว่าตลาด", "sp2AuditUnderpriced")
    .addItem("🔶 Review Queue ของหายาก", "sp2ReviewQueue")
    .addSeparator()
    // ── ดูแลข้อมูล ──
    .addItem("🏷️ เติม Copy Flags จากชื่อ", "sp2MigrateFlags")
    .addItem("💎 เติม Rarity อัตโนมัติ (จากราคาขายจริง)", "sp2AutoRarity")
    .addItem("🔍 หา Sold ที่น่าจะเป็น Auction (ราคาตกผิดปกติ)", "sp2FlagSuspectAuction")
    .addItem("✅ ตรวจสอบ Product ID", "validateAllSKUs")
    .addItem("🔍 ตรวจ Publisher ไม่มี Code", "checkUnmappedPublishers")
    .addItem("🔤 เรียงลำดับ A-Z (natural sort)", "sortInventory")
    .addItem("🧮 เติมสูตร Market·Profit·Content", "fixDerivedFormulas")
    .addSeparator()
    // ── ตั้งค่า/ซ่อม (นาน ๆ ใช้ที) ──
    .addSubMenu(ui.createMenu("⚙️ ตั้งค่า & ซ่อมข้อมูล")
      .addItem("⚙️ ติดตั้ง Trigger (รัน 1 ครั้ง)", "setupInstallableTrigger")
      .addSeparator()
      .addItem("✍️ ใช้ราคา SP-2 แบบทับทุกกรณี (รวมลดราคา)", "sp2ApplySuggestedAll")
      .addItem("🛠️ จัดระเบียบเลข RESTOCK ⚠️", "fixAllRestockTags")
      .addItem("🔄 สร้าง SKU ใหม่ทั้งหมด ⚠️", "regenerateAllSKUs"))
    .addToUi();
}
