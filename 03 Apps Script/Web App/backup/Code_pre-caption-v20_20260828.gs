// ============================================================
// OWARIN INVENTORY AUTOMATION SYSTEM v19 (SP-3 Pricing Engine)
// v19 — รื้อวิธีคิดฐานราคาใหม่ตาม logic ที่เจ้าของร้านใช้จริง
//   ❌ ถอดทิ้ง: ตัวคูณราคาปก (backtest ผิดพลาด 29% — แย่ที่สุด) · การถ่วงน้ำหนักตามเวลา
//              · guard ตามวันขายล่าสุด · เกณฑ์ REVIEW จาก "ขายล่าสุดเกิน 24 เดือน"
//   ✅ ใช้แทน: ระดับราคาจริงของ สำนักพิมพ์ × เครื่อง (ผิดพลาด 25%) + ชั้นซีรีส์ (24%)
//   ✅ p80 แทน median — ข้อมูลจริงชี้ว่าไตเติลที่ขายซ้ำถูกไต่ราคาขึ้น (ขึ้น 23 : ลง 13)
//   ✅ ชีต SERIES MAP แก้เองได้ (RESIDENT EVIL → BIOHAZARD ฯลฯ)
//   ✅ ปรับข้ามสำนักพิมพ์/เครื่องด้วย "ระดับราคาจริง" (TONBO ฿370 … GTS ฿200 · GBA ฿360 … PS3 ฿160)
//   ⚠️ ตัวคูณสภาพยังเป็น "นโยบายราคา" ไม่ใช่ผลวิเคราะห์ — ข้อมูลเก่าเป็นสภาพ A 94%
// v18.7 — 🔍 หา Sold ที่น่าจะเป็น Auction (ราคาตกผิดปกติในกลุ่ม ชื่อ+สนพ.+เครื่อง)
// v18.6 (SP-2 Pricing Engine · ทุกชีตมาตรฐานเดียว)
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
  // ── ตัวคูณสภาพ (นโยบายราคา ไม่ใช่ผลวิเคราะห์ — ข้อมูลเก่าเป็นสภาพ A ถึง 94% จึงพิสูจน์ไม่ได้) ──
  COND_MULT: { S: 1.30, A: 1.00, B: 0.85, C: 0.65, D: 0.45 },
  S_MIN_PREMIUM: 50,
  // ── ไต่ราคาขึ้น: ไตเติลที่ขายซ้ำมักถูกทดลองขึ้นราคาแล้วยังขายออก ──
  //   ข้อมูลจริง: ขึ้น 23 ไตเติล · ลง 13 · เท่าเดิม 40 → ใช้ค่าค่อนไปทางสูง ไม่ใช่ค่ากลาง
  PCTL: 0.80,
  // ── ระดับราคาต่อสำนักพิมพ์/เครื่อง (แทนตัวคูณราคาปกที่ถอดทิ้งไปแล้ว) ──
  //   backtest: ตัวคูณราคาปกผิดพลาดกลาง 29% · ระดับราคา สนพ.×เครื่อง 25% · +ซีรีส์ 24%
  LEVEL_MIN_N: 5,                        // ขั้นต่ำต่อ bucket ที่จะเชื่อระดับราคา
  SERIES_MIN_N: 3,                       // ขั้นต่ำต่อซีรีส์
  LEVEL_CLAMP: [0.6, 1.8],               // กรอบปรับข้ามสำนักพิมพ์/ข้ามเครื่อง
  // ── ความเร็วขาย (ยังไม่มีข้อมูล — เริ่มเก็บ Listed/Sold Date แล้วจะทำงานเอง) ──
  VEL_BANDS: [[7, 1.20], [60, 1.00], [180, 0.95], [999999, 0.90]],
  FAST_DAYS: 7,
  FAST_STREAK_N: 2,
  // ── guard ──
  COST_FLOOR_MULT: 1.5,
  REVIEW_BASE: 400,
  STRONG_COMP_N: 3,
  RANGE_LO: 0.9, RANGE_HI: 1.2, RANGE_HI_RARE: 1.3, RANGE_HI_R2: 1.25,
  // v18.7: ชีตใช้คำว่า MAP / COLOUR — คง POSTER / FC ไว้เป็นชื่อเก่า (แถวเดิมยังคิดราคาถูกต้อง)
  FLAGS: { MAP: 1.10, POSTER: 1.10, COLOUR: 1.15, FC: 1.15, STAMP: 0.90, NAME: 0.95, TAPE: 0.90 },
  MIN_PRICE: 30, ROUND: 10,
  USE_AUCTION_FLOOR: true,
  RARITY: { R1_PCTL: 0.95, R2_PCTL: 0.85, R1_PEER: 1.8, R2_PEER: 1.4, PEER_MIN_N: 8 },
  AUCTION_SUSPECT: { RATIO: 0.6, MIN_PEERS: 2 }
};

// v19: ค่าที่ MAGAZINE ต่างจาก GGB
var SP2_MAG = {
  REVIEW_BASE: 180,
  MIN_PRICE: 20
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
  "Copy Flags":       "จุดต่างของ 'เล่มนี้' (เว้นวรรคได้หลายอัน) — MAP +10% (โปสเตอร์/แผนที่ครบ) · COLOUR +15% (สีทั้งเล่ม) · STAMP −10% (ตราปั๊มร้านเช่า) · NAME −5% (เขียนชื่อ) · TAPE −10% (ปกซ่อม/เทป)",
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
  "sub genre":            "subGenre",     // P5.7: แนวรอง คั่นด้วย , (เล่มรวมหลายเกม)
  "type":                 "type",         // P5.1: หมวด/รูปแบบเล่ม (POCKET BOOK, SPECIAL, TOP SECRET ...)
                                          // NOTE: "Series" สงวนให้ SP-2 (ชีต GAME INFO / SERIES MAP)
                                          //       ห้ามใช้เป็นคอลัมน์ในสต็อก
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
  // ── SALES sheet (P3) ── (ชื่อใหม่ตามแผน consolidation ใส่ alias ไว้ครบ)
  "order":                "order",
  "order id":             "order",
  "product":              "product",
  "item name sold":       "product",      // กันชนกับ "item name" ของสต็อก
  "order date":           "orderDate",
  "shiping cost":         "shipingCost",  // สะกดเดิมในชีต — คงไว้เพื่อความเข้ากันได้
  "shipping cost":        "shipingCost",
  "net profit":           "netProfit",
  "note":                 "note",
  // ── BOOKING sheet (P3) ──
  "booking name":         "bookingName",
  "customer name":        "bookingName",  // ชื่อใหม่ตามแผน
  "game title":           "gameTitle",
  "queue":                "queue",
  // ── CONTENTS sheet (P5) ──
  "title":                "contentTitle",
  "template name":        "contentTitle", // ชื่อใหม่ตามแผน (TEMPLATES)
  "contents":             "contents",
  "content":              "contents",
  "contents 2":           "contents2",
  "content alt":          "contents2",
  // ── GAME INFO (per game — ไม่ใช่ต่อเล่ม) ──
  "base title":           "baseTitleRef",
  "series":               "seriesName",   // ใช้เฉพาะชีต GAME INFO (ไม่ใช่คอลัมน์ในสต็อก)
  "synopsis":             "synopsis"
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
        if (autoFl) _tryWrite("onEdit Copy Flags", function () { cfCell.setValue(autoFl); });
      }
    }

    // Status → Sold → เติม Sold Date อัตโนมัติ (ไม่ทับของเดิม)
    if (editedCol === COL.status && COL.soldDate) {
      var stVal = (range.getValue() || "").toString().trim();
      if (stVal === "Sold") {
        var sdCell = sheet.getRange(currentRow, COL.soldDate);
        if (!sdCell.getValue()) _tryWrite("onEdit Sold Date", function () { sdCell.setValue(new Date()); });
      }
    }

    // v17: แก้ชื่อบนแถวที่ยังไม่มี Listed Date และไม่ใช่ Sold → ประทับวันที่ลงขาย
    if (editedCol === COL.name && COL.listedDate) {
      var ldCell = sheet.getRange(currentRow, COL.listedDate);
      if (!ldCell.getValue()) {
        var stNow = COL.status ? (sheet.getRange(currentRow, COL.status).getValue() || "").toString().trim() : "";
        if (stNow !== "Sold") _tryWrite("onEdit Listed Date", function () { ldCell.setValue(new Date()); });
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
      _tryWrite("recalc Item name", function () { sheet.getRange(row, COL.name).setValue(finalTitle); });
      allData[row - 3][COL.name - 1] = finalTitle;
    }
  }

  var pubText  = (sheet.getRange(row, COL.publisher).getValue()  || "").toString().trim();
  var condText = (sheet.getRange(row, COL.condition).getValue()  || "").toString().trim();

  if (changed.name || changed.publisher || changed.condition) {
    var newSKU = _buildSKU(finalTitle, pubText, condText, row, allData, sheetName, COL);
    if (COL.productId) _tryWrite("recalc Product ID", function () { sheet.getRange(row, COL.productId).setValue(newSKU); });
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
// ── v19: ซีรีส์/แฟรนไชส์ ──────────────────────────────────────────────
// สกัดชื่อซีรีส์จากชื่อเรื่อง: ตัดเลขภาค/เลขโรมัน/ส่วนขยายท้ายชื่อ/วงเล็บ ออก
//   "Final Fantasy Tactics Advance"  → FINAL FANTASY TACTICS
//   "Super Robot Wars Alpha 3"       → SUPER ROBOT WARS ALPHA
// ถ้ามีชีต SERIES MAP จะใช้ตารางนั้นก่อน (แก้เองได้ เช่น RESIDENT EVIL → BIOHAZARD)
var SP2_SERIES_SHEET = "SERIES MAP";
var SP2_GAMEINFO_SHEET = "GAME INFO";     // per-game: Base Title | Series | Synopsis
var _sp2SeriesMapCache = null;
var _sp2GameInfoCache = null;

// GAME INFO → { BASE TITLE (upper) : SERIES } — exact match ชนะ pattern เสมอ
function _sp2LoadGameInfo() {
  if (_sp2GameInfoCache) return _sp2GameInfoCache;
  var map = {};
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SP2_GAMEINFO_SHEET);
    if (sh && sh.getLastRow() >= 2) {
      var COL = _resolveColumns(sh);
      var cT = COL.baseTitleRef || 1;
      var cS = COL.seriesName;
      if (cS) {
        var n = sh.getLastRow() - 1;
        var t = sh.getRange(2, cT, n, 1).getValues();
        var s = sh.getRange(2, cS, n, 1).getValues();
        for (var i = 0; i < n; i++) {
          var k = (t[i][0] || "").toString().trim().toUpperCase();
          var v = (s[i][0] || "").toString().trim().toUpperCase();
          if (k && v) map[k] = v;
        }
      }
    }
  } catch (e) { /* ไม่มีชีตก็ข้ามไปใช้ SERIES MAP */ }
  _sp2GameInfoCache = map;
  return map;
}

function _sp2AutoSeries(title) {
  var t = _getBaseTitle(String(title || ""));
  t = t.split(/ [-–—×⨯｜|] /)[0];          // ตัดหลังตัวคั่น
  t = t.replace(/\s*\(.*$/, "");            // ตัดวงเล็บท้าย
  t = t.replace(/\s+(the\s+)?(i{1,3}|iv|v|vi{1,3}|ix|x{1,2}|\d+)(\s*[a-z]*)?$/i, "");
  t = t.replace(/\s+(advance|portable|international|remake|complete|special|edition|collection|set|plus|deluxe)$/i, "");
  return t.trim().toUpperCase();
}

function _sp2LoadSeriesMap() {
  if (_sp2SeriesMapCache) return _sp2SeriesMapCache;
  var out = [];
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SP2_SERIES_SHEET);
    if (sh && sh.getLastRow() >= 2) {
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < v.length; i++) {
        var m = (v[i][0] || "").toString().trim().toUpperCase();
        var g = (v[i][1] || "").toString().trim().toUpperCase();
        if (m && g) out.push({ match: m, series: g });
      }
      out.sort(function (x, y) { return y.match.length - x.match.length; });  // ยาวก่อน
    }
  } catch (e) { /* ไม่มีชีตก็ใช้ auto */ }
  _sp2SeriesMapCache = out;
  return out;
}

// ลำดับความสำคัญ: GAME INFO (exact) → SERIES MAP (pattern) → auto-derive
function _sp2Series(title, map) {
  var up = _getBaseTitle(String(title || "")).toUpperCase();
  var gi = _sp2LoadGameInfo();
  if (gi && gi[up]) return gi[up];
  if (map) for (var i = 0; i < map.length; i++) if (up.indexOf(map[i].match) !== -1) return map[i].series;
  return _sp2AutoSeries(title);
}

// ค่ากลางของ "ระดับราคา" ที่เก็บไว้ใน idx — ใช้ปรับข้ามสำนักพิมพ์/ข้ามเครื่อง
function _sp2LevelRatio(idx, kind, mine, theirs, C) {
  if (!mine || !theirs || mine === theirs) return 1;
  var lv = (kind === "pub") ? idx.pubLevel : idx.platLevel;
  var a = lv[mine], b = lv[theirs];
  if (!a || !b || b <= 0) return 1;
  var r = a / b;
  return Math.max(C.LEVEL_CLAMP[0], Math.min(C.LEVEL_CLAMP[1], r));
}

// percentile จากอาเรย์ (ไม่ interpolate — ใช้ค่าจริงที่เคยขายได้)
function _sp2Pct(arr, p) {
  if (!arr || !arr.length) return null;
  var a = arr.slice().sort(function (x, y) { return x - y; });
  if (a.length === 1) return a[0];
  var i = Math.round(p * (a.length - 1));
  return a[Math.min(i, a.length - 1)];
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
// [SP2-INDEX] v19 — สแกนชีตครั้งเดียว เก็บทุกอย่างที่ใช้ตั้งราคา
//   comp 3 ชั้น (ไตเติล) · ซีรีส์ · ระดับราคา สนพ./เครื่อง/สนพ.×เครื่อง · พื้นราคาประมูล
//   ทุกราคาเก็บเป็น "ฐานสภาพ A" (หารตัวคูณสภาพ + Copy Flags ออกแล้ว)
// ============================================================
function _sp2BuildIndexes(data, COL, sheetName) {
  var C = _sp2Cfg(sheetName || GGB_SHEET);
  var map = _sp2LoadSeriesMap();
  var idx = { exact: {}, pub: {}, base: {}, series: {},
              cell: {}, pubLevel: {}, platLevel: {}, allLevel: 0,
              aucFloor: {}, cfg: C, sheet: sheetName || GGB_SHEET };
  var cellRaw = {}, pubRaw = {}, platRaw = {}, allRaw = [];

  for (var i = 0; i < data.length; i++) {
    var t = _val(data[i], COL, "name"); t = t ? t.toString().trim() : "";
    if (!t) continue;
    var status = (_val(data[i], COL, "status") || "").toString().trim();
    var price  = parseFloat(_val(data[i], COL, "price"));
    var baseT  = _getBaseTitle(t).toUpperCase();

    // Auction = พื้นราคา ไม่ใช่ตัวเทียบ (ราคาจบประมูลเฉลี่ย 29% ของราคาขายปกติ)
    if (status === "Auction") {
      if (C.USE_AUCTION_FLOOR && !isNaN(price) && price > 0) {
        if (!idx.aucFloor[baseT] || price > idx.aucFloor[baseT]) idx.aucFloor[baseT] = price;
      }
      continue;
    }
    if (status !== "Sold" || isNaN(price) || price <= 0) continue;

    var pub  = (_val(data[i], COL, "publisher") || "").toString().trim().toUpperCase();
    var plat = (_val(data[i], COL, "platform")  || "").toString().trim().toUpperCase();
    var cond = (_val(data[i], COL, "condition") || "").toString().trim().toUpperCase();
    var orig = _val(data[i], COL, "original");
    var fm   = _sp2FlagsMult(_val(data[i], COL, "copyFlags"), C).mult || 1;
    var aEq  = price / (C.COND_MULT[cond] || 1) / fm;      // ฐานสภาพ A

    var comp = { aEq: aEq, price: price, pub: pub, plat: plat, cond: cond,
                 sold:   _sp2Date(_val(data[i], COL, "soldDate")),
                 listed: _sp2Date(_val(data[i], COL, "listedDate")) };

    (idx.exact[baseT + "|" + pub + "|" + _normOrig(orig)] = idx.exact[baseT + "|" + pub + "|" + _normOrig(orig)] || []).push(comp);
    (idx.pub[baseT + "|" + pub] = idx.pub[baseT + "|" + pub] || []).push(comp);
    (idx.base[baseT] = idx.base[baseT] || []).push(comp);

    var sr = _sp2Series(t, map);
    if (sr) (idx.series[sr] = idx.series[sr] || []).push(comp);

    if (pub && plat) (cellRaw[pub + "|" + plat] = cellRaw[pub + "|" + plat] || []).push(aEq);
    if (pub)  (pubRaw[pub]   = pubRaw[pub]   || []).push(aEq);
    if (plat) (platRaw[plat] = platRaw[plat] || []).push(aEq);
    allRaw.push(aEq);
  }

  // ระดับราคา (median) — ใช้ทั้งเป็นฐานสำรอง และเป็นตัวปรับข้ามสำนักพิมพ์/เครื่อง
  function fill(src, dst, minN) {
    for (var k in src) if (src[k].length >= minN) dst[k] = { v: _median(src[k]), n: src[k].length };
  }
  var cellTmp = {}, pubTmp = {}, platTmp = {};
  fill(cellRaw, cellTmp, C.LEVEL_MIN_N);
  fill(pubRaw,  pubTmp,  C.LEVEL_MIN_N);
  fill(platRaw, platTmp, C.LEVEL_MIN_N);
  idx.cell = cellTmp;
  for (var k1 in pubTmp)  idx.pubLevel[k1]  = pubTmp[k1].v;
  for (var k2 in platTmp) idx.platLevel[k2] = platTmp[k2].v;
  idx.pubN = pubTmp; idx.platN = platTmp;
  idx.allLevel = allRaw.length ? _median(allRaw) : 0;
  idx.allN = allRaw.length;
  return idx;
}

// ============================================================
// [SP2-CORE] v19 — ตั้งราคาจาก "ระดับราคาจริง" ไม่ใช่ตัวคูณราคาปก
//   บันไดฐานราคา (ทุกชั้นเป็นฐานสภาพ A):
//     T1 EXACT      ไตเติล+สำนักพิมพ์+ราคาปก ตรงกัน
//     T2 TITLE-PUB  ไตเติล+สำนักพิมพ์
//     T3 TITLE      ไตเติล (ปรับข้ามสำนักพิมพ์/เครื่องด้วยระดับราคา)
//     T4 SERIES     ซีรีส์เดียวกัน (n≥3) ปรับข้ามสำนักพิมพ์/เครื่อง
//     T5 CELL       ระดับราคา สำนักพิมพ์×เครื่อง (n≥5)
//     T6 PUB/PLAT   ระดับราคา สำนักพิมพ์ หรือ เครื่อง (n≥5)
//     T7 REF        Market Ref ที่กรอกเอง
//     T8 MANUAL     ให้คนตั้ง
//   T1–T4 ใช้ p80 (ไต่ราคาขึ้น) · T5–T6 ใช้ median (เป็นระดับกลางของกลุ่ม)
//   ไม่มีการถ่วงน้ำหนักตามเวลา — เวลาที่เคยขายไม่เกี่ยวกับราคาปัจจุบันของร้านนี้
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

  var titleBase = null, tier = "", notes = [], comps = null, fastStreak = 0;

  // ── ชั้น T1–T3: ประวัติขายของไตเติลนี้ ──
  var kE = baseT + "|" + pub + "|" + _normOrig(item.original);
  var adjust = false;
  if (idx.exact[kE] && idx.exact[kE].length)                                   { comps = idx.exact[kE];            tier = "EXACT"; }
  else if (idx.pub[baseT + "|" + pub] && idx.pub[baseT + "|" + pub].length)    { comps = idx.pub[baseT + "|" + pub]; tier = "TITLE-PUB"; }
  else if (idx.base[baseT] && idx.base[baseT].length)                          { comps = idx.base[baseT];          tier = "TITLE"; adjust = true; }
  // ── ชั้น T4: ซีรีส์ ──
  else {
    var sr = _sp2Series(item.name, _sp2LoadSeriesMap());
    if (sr && idx.series[sr] && idx.series[sr].length >= C.SERIES_MIN_N) {
      comps = idx.series[sr]; tier = "SERIES " + sr.slice(0, 24); adjust = true;
    }
  }

  if (comps) {
    var vals = [];
    for (var i = 0; i < comps.length; i++) {
      var cp = comps[i];
      var a = cp.aEq;
      if (adjust) {   // ปรับให้เป็น "ถ้าเป็นสำนักพิมพ์/เครื่องของเล่มนี้"
        a *= _sp2LevelRatio(idx, "pub",  pub,  cp.pub,  C);
        a *= _sp2LevelRatio(idx, "plat", plat, cp.plat, C);
      }
      var days = _sp2Days(cp.listed, cp.sold);
      if (days !== null) {
        a *= _sp2Band(days, C.VEL_BANDS);
        if (i === fastStreak && days <= C.FAST_DAYS) fastStreak++;
      }
      vals.push(a);
    }
    titleBase = _sp2Pct(vals, C.PCTL);
    tier += " n=" + comps.length;
    if (adjust) notes.push("ปรับตามระดับราคา สนพ./เครื่อง");
  }

  // ── ชั้น T5–T6: ระดับราคาของกลุ่ม ──
  if (titleBase === null) {
    var cell = (pub && plat) ? idx.cell[pub + "|" + plat] : null;
    if (cell)                                       { titleBase = cell.v; tier = "CELL n=" + cell.n; }
    else if (pub && idx.pubN[pub])                  { titleBase = idx.pubN[pub].v;  tier = "PUB n=" + idx.pubN[pub].n; }
    else if (plat && idx.platN[plat])               { titleBase = idx.platN[plat].v; tier = "PLAT n=" + idx.platN[plat].n; }
  }

  // ── T7: Market Ref (ยึดเป็นพื้น) ──
  if (!isNaN(mref) && mref > 0) {
    if (titleBase === null || mref > titleBase) { titleBase = mref; tier = (tier ? tier + "+" : "") + "REF"; }
    else notes.push("ref=" + Math.round(mref));
  }

  // ── T8: MANUAL ──
  if (titleBase === null) {
    var hint = idx.allN ? " · ทั้งร้านขายได้ median ฿" + Math.round(idx.allLevel) + " (n=" + idx.allN + ")" : "";
    return { price: "", target: "", min: "", max: "", open: "", tier: "MANUAL",
             review: true, label: "MANUAL",
             rangeStr: "REVIEW · set manually" + (idx.allN ? " · ref ฿" + Math.round(idx.allLevel) : ""),
             refStr: "[REVIEW · MANUAL] ไม่มีประวัติขายทั้งไตเติล ซีรีส์ สำนักพิมพ์ และเครื่อง" + hint +
                     " — ตั้งเอง หรือกรอก Market Ref" };
  }

  // ── ประกอบเป็นราคาของเล่มนี้ ──
  var fl = _sp2FlagsMult(item.copyFlags, C);
  var target = titleBase * cMult * fl.mult;
  if (cond === "S" && target < titleBase + C.S_MIN_PREMIUM) target = titleBase + C.S_MIN_PREMIUM;
  if (fl.tags.length) notes.push("flags:" + fl.tags.join("+"));

  // ── พื้นราคา ──
  if (C.USE_AUCTION_FLOOR && idx.aucFloor[baseT] && target < idx.aucFloor[baseT]) {
    target = idx.aucFloor[baseT];
    notes.push("⚓AUC≥" + idx.aucFloor[baseT]);
  }
  var floorHit = false;
  if (!isNaN(cost) && cost > 0) {
    var cf = cost * C.COST_FLOOR_MULT;
    if (target < cf) { target = cf; floorHit = true; notes.push("⚓COST-FLOOR " + Math.round(cf)); }
  }

  // ── REVIEW ──
  var hot = fastStreak >= C.FAST_STREAK_N;
  var strong = (comps !== null && comps.length >= C.STRONG_COMP_N && tier.indexOf("EXACT") === 0);
  var weakTier = (tier.indexOf("CELL") === 0 || tier.indexOf("PUB") === 0 || tier.indexOf("PLAT") === 0);
  var review = (titleBase >= C.REVIEW_BASE && !strong) || (rarity === "R1");
  if (strong && titleBase >= C.REVIEW_BASE) notes.push("✔หลักฐานแน่น");
  if (weakTier) notes.push("ไม่มีประวัติไตเติล/ซีรีส์");

  // ── Output ──
  var tgt = _sp2Round(target, C);
  var lo  = _sp2Round(target * C.RANGE_LO, C);
  var hiMult = review ? C.RANGE_HI_RARE : (rarity === "R2" ? C.RANGE_HI_R2 : C.RANGE_HI);
  var hi  = _sp2Round(target * hiMult, C);
  if (rarity === "R2" && !review) notes.push("R2 ขยายขอบบน");
  var open = (hot || review) ? hi : tgt;
  if (hot) notes.push("🔥fast×" + fastStreak + "→เปิดขอบบน");

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
        "   ฐานราคา: ไตเติล → ซีรีส์ → สนพ.×เครื่อง · REVIEW ≥ ฿" + C.REVIEW_BASE + "\n\n" +
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
      var ok1 = _tryWrite("header " + headerText, function () { sheet.getRange(1, c2 + 1).setValue(headerText); });
      delete _colCache[sheet.getSheetId()];
      return { col: c2 + 1, added: ok1 };
    }
  }
  var newCol = sheet.getLastColumn() + 1;
  var ok2 = _tryWrite("header " + headerText, function () { sheet.getRange(1, newCol).setValue(headerText); });
  delete _colCache[sheet.getSheetId()];
  return { col: newCol, added: ok2 };
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
  [/incl\.?[^)]*map/i, "MAP"],
  [/แผนที่/,           "MAP"],
  [/โปสเตอร์|poster/i, "MAP"],
  [/สีทั้งเล่ม|สี่สีตลอดเล่ม|พิมพ์สี่สี/, "COLOUR"]
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
    var pl  = (_val(data[i], COL, "platform") || "").toString().trim().toUpperCase();
    allPrices.push(pr);
    (byTitlePub[bt + "|" + pub] = byTitlePub[bt + "|" + pub] || []).push(pr);
    (byTitle[bt] = byTitle[bt] || []).push(pr);
    if (pub && pl) (peer[pub + "|" + pl] = peer[pub + "|" + pl] || []).push(pr);
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
      var pl2 = (_val(data[j], COL, "platform") || "").toString().trim().toUpperCase();
      var pm  = (pb && pl2) ? peerMed[pb + "|" + pl2] : null;
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
// [SP2-SERIES] v19 — สร้าง/อัปเดตชีต SERIES MAP ให้แก้เองได้
//   ระบบสกัดชื่อซีรีส์จากชื่อเรื่องอัตโนมัติ แต่บางกรณีต้องบอกเอง เช่น
//     RESIDENT EVIL → BIOHAZARD · ROCKMAN → MEGA MAN · แยก SUPER ROBOT WARS ALPHA ออกจาก F
//   คอลัมน์: Match (คำที่พบในชื่อ) · Series (ชื่อกลุ่มที่จะใช้) · Note
//   Match ที่ยาวกว่าถูกใช้ก่อน → ใส่คำเฉพาะเจาะจงได้โดยไม่ชนคำกว้าง
// ============================================================
function sp2BuildSeriesMap() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var t = _sp2Sheet(null), src = t.sheet;
  var COL = _resolveColumns(src);
  var lastRow = src.getLastRow();
  if (lastRow < 3) { ui.alert("ไม่มีข้อมูลในชีต " + t.name); return; }

  // นับจำนวนการขายจริงต่อซีรีส์ (auto)
  var data = src.getRange(3, 1, lastRow - 2, src.getLastColumn()).getValues();
  var cnt = {}, sample = {};
  for (var i = 0; i < data.length; i++) {
    var nm = _val(data[i], COL, "name"); nm = nm ? nm.toString().trim() : "";
    if (!nm) continue;
    if ((_val(data[i], COL, "status") || "").toString().trim() !== "Sold") continue;
    var p = parseFloat(_val(data[i], COL, "price")); if (isNaN(p) || p <= 0) continue;
    var sr = _sp2AutoSeries(nm);
    if (!sr) continue;
    cnt[sr] = (cnt[sr] || 0) + 1;
    if (!sample[sr]) sample[sr] = nm;
  }
  var rows = Object.keys(cnt).filter(function (k) { return cnt[k] >= 2; })
    .sort(function (a, b) { return cnt[b] - cnt[a]; })
    .map(function (k) { return [k, k, cnt[k] + " เล่มที่เคยขาย · เช่น " + sample[k].slice(0, 40)]; });

  var sh = ss.getSheetByName(SP2_SERIES_SHEET);
  if (!sh) sh = ss.insertSheet(SP2_SERIES_SHEET);
  var existing = {};
  if (sh.getLastRow() >= 2) {
    var ev = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var e = 0; e < ev.length; e++) {
      var m = (ev[e][0] || "").toString().trim().toUpperCase();
      if (m) existing[m] = (ev[e][1] || "").toString().trim();
    }
  }
  var added = 0;
  for (var r = 0; r < rows.length; r++) if (existing[rows[r][0]]) rows[r][1] = existing[rows[r][0]]; else added++;

  sh.clear();
  sh.getRange(1, 1, 1, 3).setValues([["Match", "Series", "Note"]]).setFontWeight("bold");
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1).setNote("Match = คำที่พบในชื่อเรื่อง (ตัวพิมพ์ใหญ่) · Series = ชื่อกลุ่มที่จะใช้รวมราคา\n" +
    "ตัวอย่างที่ต้องเพิ่มเอง: RESIDENT EVIL → BIOHAZARD · ROCKMAN → MEGA MAN\n" +
    "คำที่ยาวกว่าถูกตรวจก่อน · แก้แล้วกด 💰 คำนวณราคา SP-2 ใหม่");
  sh.autoResizeColumns(1, 3);
  _sp2SeriesMapCache = null;
  SpreadsheetApp.flush();
  ui.alert("🗂️ สร้าง/อัปเดตชีต " + SP2_SERIES_SHEET + " แล้ว\n\n" +
    "ซีรีส์ที่มีประวัติขาย ≥2 เล่ม: " + rows.length + " รายการ (ใหม่ " + added + ")\n" +
    "ที่เคยแก้ไว้ยังอยู่ครบ\n\n" +
    "→ แก้คอลัมน์ Series เพื่อรวมกลุ่ม เช่น ใส่ BIOHAZARD ให้แถว RESIDENT EVIL\n" +
    "→ เสร็จแล้วกด 💰 คำนวณราคา SP-2 ใหม่");
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

  _tryWrite("sort setValues", function () { range.setValues(data); });
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

    var setIf = function(key, val) { if (COL[key]) _tryWrite("add " + key, function () { sheet.getRange(newRow, COL[key]).setValue(val); }); };
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

  _tryWrite("regen Product ID", function () { sheet.getRange(3, COL.productId, colOut.length, 1).setValues(colOut); });
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

  _tryWrite("fix RESTOCK names", function () { sheet.getRange(3, COL.name, updated.length, 1).setValues(updated); });
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
// ============================================================
// [P5.1] addTypeColumn — เพิ่มคอลัมน์ "Type" (หมวด/รูปแบบเล่ม) ให้ชีตที่เปิดอยู่
//   • ปลอดภัย: ถ้ามีอยู่แล้วจะไม่สร้างซ้ำ · ไม่ดันคอลัมน์อื่น (เขียนทับหัว placeholder
//     "Column NN" ที่ว่างอยู่ ถ้าไม่มีจึงต่อท้าย)
//   • header-driven: วางตำแหน่งไหนก็ได้ เว็บแอปอ่านเจอเอง
// ============================================================
// เพิ่มหัวคอลัมน์ให้ชีต โดยใช้ช่องหัว placeholder ที่ว่างก่อน (ไม่ดันคอลัมน์อื่น)
// คืน 0 ถ้ามีอยู่แล้ว · คืนเลขคอลัมน์ถ้าเพิ่งสร้าง · คืน -1 ถ้าเขียนไม่ได้
function _addHeaderIfMissing(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return 0;   // มีแล้ว
  }
  var target = 0;
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] == null ? "" : headers[i]).trim();
    if (h === "" || /^column\s*\d+$/i.test(h)) { target = i + 1; break; }
  }
  if (!target) target = lastCol + 1;
  var okw = _tryWrite(sheet.getName() + "!" + headerText, function () {
    sheet.getRange(1, target).setValue(headerText);
  });
  return okw ? target : -1;
}

// 🏷️ เพิ่มคอลัมน์ Type ให้ทั้ง GGB และ MAGAZINE ในคลิกเดียว (ไม่ต้องสลับแท็บ)
function addTypeColumn() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  _sp2ResetWriteErrors();
  var log = [];

  [GGB_SHEET, MAG_SHEET].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) { log.push("• ไม่พบชีต " + name + " — ข้าม"); return; }
    var r = _addHeaderIfMissing(sh, "Type");
    if (r === 0)       log.push("• " + name + ": มีคอลัมน์ Type อยู่แล้ว");
    else if (r > 0)    log.push("✓ " + name + ": เพิ่ม Type ที่คอลัมน์ " + r);
    else               log.push("⛔ " + name + ": เขียนไม่สำเร็จ");
  });

  _colCache = {};
  SpreadsheetApp.flush();
  ui.alert("คอลัมน์ Type",
    log.join("\n") +
    "\n\nใส่ค่าได้เลย เช่น POCKET BOOK / GAMEMAG SPECIAL / GAMEMAG TOP SECRET" +
    "\nเว็บแอปมีตัวกรอง Type และช่องกรอกให้อัตโนมัติ" + _sp2WriteErrMsg(),
    ui.ButtonSet.OK);
}

// ============================================================
// [P5.3] fillGameInfoSeries — เติมคอลัมน์ Series ใน GAME INFO
//   ใช้กฎจาก SERIES MAP ก่อน แล้ว fallback เป็น auto-derive
//   เติมเฉพาะช่องที่ว่าง — ไม่ทับค่าที่พิมพ์เองไว้
// ============================================================
function fillGameInfoSeries() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SP2_GAMEINFO_SHEET);
  if (!sh) { ui.alert("⚠️ ไม่พบชีต " + SP2_GAMEINFO_SHEET); return; }

  var COL = _resolveColumns(sh);
  var cT = COL.baseTitleRef, cS = COL.seriesName;
  if (!cT || !cS) {
    ui.alert("⚠️ ชีต " + SP2_GAMEINFO_SHEET + " ต้องมีหัวคอลัมน์ 'Base Title' และ 'Series'");
    return;
  }
  var lastRow = sh.getLastRow();
  if (lastRow < 2) { ui.alert("ไม่มีข้อมูล"); return; }

  var n = lastRow - 1;
  var titles = sh.getRange(2, cT, n, 1).getValues();
  var cur    = sh.getRange(2, cS, n, 1).getValues();
  var map = _sp2LoadSeriesMap();

  var out = [], filled = 0, kept = 0, byRule = 0, byAuto = 0;
  for (var i = 0; i < n; i++) {
    var t = (titles[i][0] || "").toString().trim();
    var have = (cur[i][0] || "").toString().trim();
    if (!t) { out.push([have]); continue; }
    if (have) { out.push([have]); kept++; continue; }     // ไม่ทับของเดิม

    var up = _getBaseTitle(t).toUpperCase();
    var hit = "";
    for (var j = 0; j < map.length; j++) {
      if (up.indexOf(map[j].match) !== -1) { hit = map[j].series; break; }
    }
    if (hit) byRule++; else { hit = _sp2AutoSeries(t); byAuto++; }
    out.push([hit]);
    filled++;
  }

  _tryWrite(SP2_GAMEINFO_SHEET + "!Series", function () {
    sh.getRange(2, cS, out.length, 1).setValues(out);
  });
  _sp2GameInfoCache = null;
  SpreadsheetApp.flush();

  ui.alert("เติม Series เรียบร้อย",
    "✓ เติมใหม่ " + filled + " แถว\n" +
    "   • จากกฎใน SERIES MAP: " + byRule + "\n" +
    "   • เดาจากชื่อเกม (auto): " + byAuto + "\n" +
    "• คงค่าเดิมที่พิมพ์เอง: " + kept + "\n\n" +
    "ตรวจสอบสัก 10–20 แถว โดยเฉพาะกลุ่ม auto แล้วแก้ตรงไหนที่ไม่ถูกได้เลย\n" +
    "เมื่อพอใจแล้วค่อยลบชีต SERIES MAP (ระบบจะใช้ GAME INFO เป็นหลักอยู่แล้ว)" +
    _sp2WriteErrMsg(),
    ui.ButtonSet.OK);
}

// ============================================================
// [P5.2] migrateSheetLayout — จัดชีตตามแผน consolidation
//   ทำเฉพาะงานที่ "ย้อนกลับได้" : เปลี่ยนชื่อชีต · แก้หัวคอลัมน์ที่สะกดผิด ·
//   เพิ่มคอลัมน์ที่ขาด — ไม่ลบชีต ไม่ลบข้อมูล ไม่ย้ายข้อมูลข้ามชีต
//   รันซ้ำได้ (idempotent) — อะไรที่ทำแล้วจะข้าม
// ============================================================
var MIGRATE_RENAMES = [
  ["Monthly Sales", "SALES"],
  ["CONTENTS",      "TEMPLATES"],
  ["SYNOPSIS",      "GAME INFO"]
];
// [ชีต, หัวเดิม, หัวใหม่]
var MIGRATE_HEADERS = [
  ["SALES",     "Shiping Cost", "Shipping Cost"],
  ["SALES",     "Order",        "Order ID"],
  ["SALES",     "Product",      "Item Name"],
  ["SALES",     "Order date",   "Order Date"],
  ["TEMPLATES", "TItle",        "Template Name"],
  ["TEMPLATES", "Title",        "Template Name"],
  ["TEMPLATES", "Contents 2",   "Content Alt"],
  ["TEMPLATES", "Contents",     "Content"],
  ["GAME INFO", "เรื่องย่อ",      "Synopsis"],
  ["BOOKING",   "Booking Name", "Customer Name"]
];
// [ชีต, หัวคอลัมน์ที่ต้องมี]
var MIGRATE_ADD_COLS = [
  ["SALES",     "Product ID"],
  ["BOOKING",   "Status"],
  ["BOOKING",   "Note"],
  ["GAME INFO", "Series"]
];

function migrateSheetLayout() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var ok = ui.alert("จัดโครงสร้างชีตตามแผน",
    "จะทำ 3 อย่าง (ย้อนกลับได้ทั้งหมด):\n" +
    "1) เปลี่ยนชื่อชีต: Monthly Sales→SALES, CONTENTS→TEMPLATES, SYNOPSIS→GAME INFO\n" +
    "2) แก้หัวคอลัมน์ที่สะกดผิด/เป็นภาษาไทย ให้เป็นอังกฤษ\n" +
    "3) เพิ่มคอลัมน์ที่ขาด (Product ID, Status, Note, Series)\n\n" +
    "⚠️ ไม่ลบชีตและไม่ลบข้อมูลใด ๆ\n" +
    "⚠️ แนะนำให้ File → Make a copy สำรองไว้ก่อน\n\nดำเนินการต่อ?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  var log = [];

  // 1) rename sheets
  MIGRATE_RENAMES.forEach(function (r) {
    var from = r[0], to = r[1];
    if (ss.getSheetByName(to)) { log.push("• ชีต " + to + " มีอยู่แล้ว — ข้าม"); return; }
    var sh = ss.getSheetByName(from);
    if (!sh) { log.push("• ไม่พบชีต " + from + " — ข้าม"); return; }
    sh.setName(to);
    log.push("✓ เปลี่ยนชื่อ " + from + " → " + to);
  });

  // 2) rename headers
  MIGRATE_HEADERS.forEach(function (h) {
    var sh = ss.getSheetByName(h[0]);
    if (!sh || sh.getLastColumn() < 1) return;
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    // มีหัวใหม่อยู่แล้ว → ข้าม (กันเขียนซ้ำตอนรันรอบสอง)
    for (var k = 0; k < headers.length; k++) {
      if (_normHeader(headers[k]) === _normHeader(h[2])) return;
    }
    for (var c = 0; c < headers.length; c++) {
      if (_normHeader(headers[c]) === _normHeader(h[1])) {
        if (_tryWrite(h[0] + "!" + h[2], function () { sh.getRange(1, c + 1).setValue(h[2]); })) {
          log.push("✓ " + h[0] + ": \"" + h[1] + "\" → \"" + h[2] + "\"");
        } else {
          log.push("⛔ " + h[0] + ": เปลี่ยนหัว \"" + h[1] + "\" ไม่ได้ (คอลัมน์ถูกล็อกโดย Table)");
        }
        return;
      }
    }
  });

  // 3) add missing columns
  MIGRATE_ADD_COLS.forEach(function (a) {
    var sh = ss.getSheetByName(a[0]);
    if (!sh) { log.push("• ไม่พบชีต " + a[0] + " — ข้ามคอลัมน์ " + a[1]); return; }
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var c = 0; c < headers.length; c++) {
      if (_normHeader(headers[c]) === _normHeader(a[1])) return;   // มีแล้ว
    }
    // ใช้หัว placeholder ว่างก่อน (ไม่ดันคอลัมน์อื่น)
    var target = 0;
    for (var i = 0; i < headers.length; i++) {
      var hv = String(headers[i] == null ? "" : headers[i]).trim();
      if (hv === "" || /^column\s*\d+$/i.test(hv)) { target = i + 1; break; }
    }
    if (!target) target = lastCol + 1;
    if (_tryWrite(a[0] + "!" + a[1], function () { sh.getRange(1, target).setValue(a[1]); })) {
      log.push("✓ " + a[0] + ": เพิ่มคอลัมน์ \"" + a[1] + "\"");
    } else {
      log.push("⛔ " + a[0] + ": เพิ่มคอลัมน์ \"" + a[1] + "\" ไม่ได้ (Table ล็อกไว้)");
    }
  });

  _colCache = {};
  _sp2SeriesMapCache = null;
  _sp2GameInfoCache = null;
  SpreadsheetApp.flush();

  ui.alert("เสร็จแล้ว",
    (log.length ? log.join("\n") : "ไม่มีอะไรต้องเปลี่ยน — จัดไว้เรียบร้อยแล้ว") +
    "\n\nขั้นถัดไป (ทำเองหลังตรวจแล้ว):\n" +
    "• เติมค่า Series ใน GAME INFO แล้วค่อยลบชีต SERIES MAP\n" +
    "• ย้าย description เข้า FB CATALOGUE แล้วค่อยลบชีต DESCRIPTION\n" +
    "• ลบชีต Worksheet (เป็นข้อความสเปกของ Meta ไม่มีข้อมูล)",
    ui.ButtonSet.OK);
}

// ============================================================
// [P5.4] buildFbCatalogue — รวม DESCRIPTION เข้า FB CATALOGUE + บล็อก export ของ Meta
//   1) เปลี่ยนหัวคอลัมน์เป็นอังกฤษ
//   2) ดึง description จากชีต DESCRIPTION มาเก็บเป็น "ค่า" (ไม่ใช่สูตร) → ลบชีตต้นทางได้
//   3) เติมคอลัมน์ชื่อฟิลด์ตามสเปก Meta ให้ดาวน์โหลดเป็น CSV อัปเข้า Commerce Manager ได้เลย
//   รันซ้ำได้ · ไม่ลบชีตใด ๆ
// ============================================================
var FB_SHEET   = "FB CATALOGUE";
var DESC_SHEET = "DESCRIPTION";

// v18.8: ค่าที่ต้องใช้เติมบล็อก Meta
var R2_PUBLIC_URL = "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev";  // Cloudflare R2
var FB_LANDING_URL = "https://m.me/owarinstore/";   // หน้าปลายทางที่ Meta บังคับ (คอลัมน์ link)
var FB_PRICE_SOURCE = "shop";   // "shop" = ราคาหน้าร้าน (Price) · "marketplace" = ราคา Shopee

// หัวเดิม → หัวใหม่ (อังกฤษ)
var FB_HEADER_RENAMES = [
  ["ชื่อสินค้า (Facebook Title)",      "FB Title"],   // แบบมีวงเล็บ (ของจริงในชีต)
  ["ชื่อสินค้า Facebook Title",        "FB Title"],
  ["ของแถม",                          "Freebies"],
  ["เรื่องย่อ",                         "Synopsis"],
  ["Market Place Price",              "Marketplace Price"],
  ["price Meta format",               "Price (Meta)"],
  ["mp price Meta format",            "Marketplace Price (Meta)"],
  ["[helper] raw name",               "Helper Raw Name"],
  ["[helper] base",                   "Helper Base Title"]
];
// บล็อก export — ต้องใช้ชื่อตรงตามสเปก Meta (ตัวพิมพ์เล็ก) ห้ามเปลี่ยน
var META_FIELDS = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];

function _fbFindCol(headers, text) {
  for (var i = 0; i < headers.length; i++) {
    if (_normHeader(headers[i]) === _normHeader(text)) return i + 1;
  }
  return 0;
}

function buildFbCatalogue() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = ss.getSheetByName(FB_SHEET);
  if (!fb) { ui.alert("⚠️ ไม่พบชีต " + FB_SHEET); return; }

  var ok = ui.alert("จัด FB CATALOGUE ให้พร้อมอัป Meta",
    "จะทำ 3 อย่าง (ไม่ลบชีตใด ๆ):\n" +
    "1) เปลี่ยนหัวคอลัมน์เป็นอังกฤษ\n" +
    "2) ดึง Description จากชีต DESCRIPTION มาเก็บไว้ในชีตนี้ (เป็นค่า ไม่ใช่สูตร)\n" +
    "3) เพิ่มคอลัมน์ตามสเปก Meta: " + META_FIELDS.join(", ") + "\n\nดำเนินการต่อ?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  var log = [];

  // ── 1) rename headers ──
  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];
  FB_HEADER_RENAMES.forEach(function (r) {
    if (_fbFindCol(headers, r[1])) return;              // มีหัวใหม่แล้ว
    var c = _fbFindCol(headers, r[0]);
    if (!c) return;
    if (_tryWrite(FB_SHEET + "!" + r[1], function () { fb.getRange(1, c).setValue(r[1]); })) {
      headers[c - 1] = r[1];
      log.push("✓ หัวคอลัมน์: \"" + r[0] + "\" → \"" + r[1] + "\"");
    }
  });

  // ── 2) เพิ่มคอลัมน์ที่ต้องมี ──
  ["Description"].concat(META_FIELDS).forEach(function (h) {
    var r = _addHeaderIfMissing(fb, h);
    if (r > 0) log.push("✓ เพิ่มคอลัมน์ \"" + h + "\"");
  });
  _colCache = {};
  headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];

  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("จัดหัวคอลัมน์แล้ว แต่ยังไม่มีข้อมูลให้เติม"); return; }
  var n = lastRow - 1;

  // ── index: description จากชีต DESCRIPTION (คีย์ Product ID) ──
  var descIdx = {};
  var de = ss.getSheetByName(DESC_SHEET);
  if (de && de.getLastRow() >= 2) {
    var dh = de.getRange(1, 1, 1, Math.max(de.getLastColumn(), 1)).getValues()[0];
    var dPid = _fbFindCol(dh, "Product ID");
    var dTxt = 0;
    for (var i = 0; i < dh.length; i++) {
      var hv = String(dh[i] == null ? "" : dh[i]);
      if (/description/i.test(hv)) { dTxt = i + 1; break; }
    }
    if (dPid && dTxt) {
      var dn = de.getLastRow() - 1;
      var dk = de.getRange(2, dPid, dn, 1).getValues();
      var dv = de.getRange(2, dTxt, dn, 1).getValues();
      for (var j = 0; j < dn; j++) {
        var k = (dk[j][0] || "").toString().trim();
        var v = (dv[j][0] || "").toString();
        if (k && v) descIdx[k] = v;
      }
      log.push("• อ่าน description จากชีต " + DESC_SHEET + ": " + Object.keys(descIdx).length + " รายการ");
    }
  }

  var invIdx = _metaInvIndex();   // index กลาง (ใช้ร่วมกันทุกเครื่องมือ)

  // ── อ่านค่าที่ต้องใช้จาก FB ──
  function colVals(name) {
    var c = _fbFindCol(headers, name);
    return c ? fb.getRange(2, c, n, 1).getValues() : null;
  }
  var vPid   = colVals("Product ID");
  var vTitle = colVals("FB Title");
  var vSyn   = colVals("Synopsis");
  var vPrice = colVals("price (Meta format)") || colVals("Price (Meta)");
  var vDescC = _fbFindCol(headers, "Description");
  var vDescV = vDescC ? fb.getRange(2, vDescC, n, 1).getValues() : null;

  if (!vPid) { ui.alert("⚠️ ไม่พบคอลัมน์ Product ID ใน " + FB_SHEET); return; }

  // ── 3) เติม Description (เฉพาะช่องว่าง) ──
  var descFilled = 0;
  if (vDescV) {
    for (var i = 0; i < n; i++) {
      if (String(vDescV[i][0] || "").trim()) continue;
      var pid = (vPid[i][0] || "").toString().trim();
      if (pid && descIdx[pid]) { vDescV[i][0] = descIdx[pid]; descFilled++; }
    }
    _tryWrite(FB_SHEET + "!Description", function () {
      fb.getRange(2, vDescC, n, 1).setValues(vDescV);
    });
    log.push("✓ เติม Description: " + descFilled + " แถว");
  }

  // ── 4) เติมบล็อก Meta ──
  var out = {};
  META_FIELDS.forEach(function (f) { out[f] = []; });
  var noInv = 0, outOfScope = 0;
  for (var i = 0; i < n; i++) {
    var pid  = (vPid[i][0] || "").toString().trim();
    var inv  = invIdx[pid];
    if (pid && !inv) noInv++;

    // นอกขอบเขต POCKET BOOK → เว้นว่างทุกฟิลด์ Meta (จะได้ไม่หลุดเข้า export)
    if (inv && !_metaInScope(inv, false).ok) {
      outOfScope++;
      META_FIELDS.forEach(function (f) { out[f].push([""]); });
      continue;
    }
    var desc = vDescV ? String(vDescV[i][0] || "") : "";
    if (!desc && vSyn) desc = String(vSyn[i][0] || "");

    // ราคา: ดึงจากชีตสต็อกด้วย Product ID เสมอ (ไม่อ่านคอลัมน์ในชีตนี้)
    //   เพราะคอลัมน์ในชีตนี้อาจเลื่อนแถวจากการ sort — การผูกกับ Product ID ปลอดภัยกว่า
    var priceStr = "";
    if (inv) {
      var raw = (FB_PRICE_SOURCE === "marketplace") ? inv.mktPrice : inv.price;
      raw = String(raw || "").replace(/[^\d.]/g, "");
      // Meta ต้องการ "ตัวเลข + รหัสสกุลเงิน 3 ตัว" และใช้จุดเป็นทศนิยม เช่น 320.00 THB
      if (raw) priceStr = parseFloat(raw).toFixed(2) + " THB";
    }

    out.id.push([pid]);
    out.title.push([vTitle ? String(vTitle[i][0] || "") : ""]);
    out.description.push([desc]);
    out.availability.push([inv ? (inv.status === "Sold" ? "out of stock" : "in stock") : ""]);
    // หนังสือมือสองทั้งหมด → Meta รับค่า new / refurbished / used เท่านั้น
    out.condition.push([inv && inv.condition ? "used" : ""]);
    out.price.push([priceStr]);
    out.link.push([FB_LANDING_URL]);
    out.image_link.push([pid ? (R2_PUBLIC_URL + "/catalog/" + pid + ".jpg") : ""]);
    out.brand.push([inv ? inv.publisher : ""]);
  }

  META_FIELDS.forEach(function (f) {
    var c = _fbFindCol(headers, f);
    if (!c) return;
    _tryWrite(FB_SHEET + "!" + f, function () { fb.getRange(2, c, n, 1).setValues(out[f]); });
  });
  log.push("✓ เติมบล็อก Meta: " + (n - outOfScope) + " แถว (POCKET BOOK)");
  log.push("• ข้ามนิตยสาร/นอกขอบเขต: " + outOfScope + " แถว");
  if (noInv) log.push("⚠️ มี " + noInv + " แถวที่หา Product ID ในสต็อกไม่เจอ");

  SpreadsheetApp.flush();
  ui.alert("FB CATALOGUE พร้อมแล้ว",
    log.join("\n") +
    "\n\nเติมครบทุกฟิลด์ที่ Meta บังคับแล้ว:" +
    "\n• price → จาก" + (FB_PRICE_SOURCE === "marketplace" ? "ราคา Shopee" : "ราคาหน้าร้าน") + " (รูปแบบ 000 THB)" +
    "\n• link → " + FB_LANDING_URL +
    "\n• image_link → " + R2_PUBLIC_URL + "/catalog/<Product ID>.jpg" +
    "\n\nวิธี export: File → Download → CSV แล้วอัปใน Commerce Manager" +
    _sp2WriteErrMsg(),
    ui.ButtonSet.OK);
}

// ============================================================
// [P5.5] ตรวจ/ซ่อม Platform + Genre ให้ตรงกับ dropdown
//   auditDropdowns()      — หาค่าที่ใช้อยู่แต่ไม่มีใน dropdown แล้วเพิ่มเข้า dropdown ให้
//   fixGamemagSpecial()   — กรอก Platform/Genre ให้กลุ่ม GAMEMAG SPECIAL / สูตรเกม
// ============================================================
var DD_COLUMNS = ["platform", "genre"];      // logical key ใน HEADER_MAP

// อ่านรายการค่าใน dropdown ของคอลัมน์ (ดูจากเซลล์แรกที่มี rule)
function _ddGetList(sheet, col) {
  var lastRow = Math.min(sheet.getLastRow(), 200);
  for (var r = 3; r <= lastRow; r++) {
    var rule = sheet.getRange(r, col).getDataValidation();
    if (!rule) continue;
    try {
      var vals = rule.getCriteriaValues();
      if (vals && vals.length && Object.prototype.toString.call(vals[0]) === "[object Array]") {
        return { list: vals[0].slice(), row: r, allowInvalid: rule.getAllowInvalid() };
      }
      // เป็น range อ้างอิง → อ่านค่าจาก range นั้น
      if (vals && vals.length && vals[0] && vals[0].getValues) {
        var got = vals[0].getValues().map(function (x) { return String(x[0] || "").trim(); })
                         .filter(function (x) { return x; });
        return { list: got, row: r, range: vals[0], allowInvalid: rule.getAllowInvalid() };
      }
    } catch (e) { /* ข้าม */ }
  }
  return null;
}

function auditDropdowns() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var name = sheet.getName();
  if (name !== GGB_SHEET && name !== MAG_SHEET) {
    ui.alert("⚠️ กรุณาเปิดหน้า " + GGB_SHEET + " หรือ " + MAG_SHEET + " ก่อน");
    return;
  }
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) { ui.alert("ไม่มีข้อมูล"); return; }

  var report = [], toAdd = {};
  DD_COLUMNS.forEach(function (key) {
    var c = COL[key];
    if (!c) { report.push("• ไม่มีคอลัมน์ " + key + " ในชีตนี้"); return; }
    var dd = _ddGetList(sheet, c);
    var used = {}, order = [];
    var vals = sheet.getRange(3, c, lastRow - 2, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0] || "").trim();
      if (v && !used[v]) { used[v] = 1; order.push(v); }
    }
    if (!dd) {
      report.push("• " + key.toUpperCase() + ": ไม่มี dropdown (ใช้ค่าอิสระ " + order.length + " แบบ)");
      return;
    }
    var inList = {};
    dd.list.forEach(function (x) { inList[String(x).trim()] = 1; });
    var missing = order.filter(function (v) { return !inList[v]; });
    report.push("• " + key.toUpperCase() + ": dropdown มี " + dd.list.length +
                " ค่า · ใช้จริง " + order.length + " ค่า · ไม่อยู่ใน dropdown " + missing.length);
    missing.slice(0, 12).forEach(function (m) { report.push("      – " + m); });
    if (missing.length) toAdd[key] = { col: c, dd: dd, missing: missing };
  });

  var keys = Object.keys(toAdd);
  if (!keys.length) {
    ui.alert("ตรวจ dropdown", report.join("\n") + "\n\n✅ ทุกค่าที่ใช้อยู่มีใน dropdown ครบแล้ว", ui.ButtonSet.OK);
    return;
  }
  var ok = ui.alert("ตรวจ dropdown",
    report.join("\n") + "\n\nต้องการเพิ่มค่าที่ขาดเข้า dropdown เลยไหม?", ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  keys.forEach(function (key) {
    var t = toAdd[key];
    var newList = t.dd.list.map(function (x) { return String(x).trim(); }).concat(t.missing);
    // ถ้า dropdown อ้างอิงจาก range → เขียนค่าใหม่ต่อท้าย range นั้น
    if (t.dd.range) {
      var rg = t.dd.range, sh2 = rg.getSheet();
      var startRow = rg.getRow(), col2 = rg.getColumn();
      _tryWrite("dropdown-range " + key, function () {
        for (var i = 0; i < t.missing.length; i++) {
          sh2.getRange(startRow + t.dd.list.length + i, col2).setValue(t.missing[i]);
        }
      });
    } else {
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(newList, true)
        .setAllowInvalid(t.dd.allowInvalid)
        .build();
      _tryWrite("dropdown " + key, function () {
        sheet.getRange(3, t.col, lastRow - 2, 1).setDataValidation(rule);
      });
    }
  });
  SpreadsheetApp.flush();
  ui.alert("เพิ่มค่าเข้า dropdown แล้ว\n\n" +
    keys.map(function (k) { return "• " + k + ": +" + toAdd[k].missing.length + " ค่า"; }).join("\n") +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// ── กรอก Platform/Genre ให้กลุ่มนิตยสารรวมสูตร ──
var GMS_PATTERN  = /(GAMEMAG\s+(BIG\s+)?SPECIAL|ฉบับสูตรเกม|GAMEMAG\s+สูตรเกม)/i;
var GMS_PLATFORM = "Multi-Platform";
var GMS_GENRE    = "Cheats & Codes";

function fixGamemagSpecial() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GGB_SHEET);
  if (!sheet) { ui.alert("⚠️ ไม่พบชีต " + GGB_SHEET); return; }
  var COL = _resolveColumns(sheet);
  if (!COL.name || !COL.platform || !COL.genre) {
    ui.alert("⚠️ ต้องมีคอลัมน์ Item name / Platform / Genre");
    return;
  }
  var lastRow = sheet.getLastRow();
  var n = lastRow - 2;
  var names = sheet.getRange(3, COL.name, n, 1).getValues();
  var plats = sheet.getRange(3, COL.platform, n, 1).getValues();
  var gens  = sheet.getRange(3, COL.genre, n, 1).getValues();

  var hit = 0, chgP = 0, chgG = 0, fromWalk = 0;
  for (var i = 0; i < n; i++) {
    var nm = String(names[i][0] || "");
    if (!nm || !GMS_PATTERN.test(nm)) continue;
    hit++;
    if (String(plats[i][0] || "").trim() !== GMS_PLATFORM) { plats[i][0] = GMS_PLATFORM; chgP++; }
    var g = String(gens[i][0] || "").trim();
    if (g !== GMS_GENRE) {
      if (g === "Multi-Game Walkthrough") fromWalk++;
      gens[i][0] = GMS_GENRE; chgG++;
    }
  }
  if (!hit) { ui.alert("ไม่พบรายการกลุ่ม GAMEMAG SPECIAL / สูตรเกม"); return; }

  var msg = "พบ " + hit + " แถวในกลุ่ม GAMEMAG SPECIAL / สูตรเกม\n\n" +
            "• Platform → \"" + GMS_PLATFORM + "\" : เปลี่ยน " + chgP + " แถว\n" +
            "• Genre → \"" + GMS_GENRE + "\" : เปลี่ยน " + chgG + " แถว\n";
  if (fromWalk) msg += "   (ในนั้นเป็น \"Multi-Game Walkthrough\" เดิม " + fromWalk + " แถว)\n";
  msg += "\nดำเนินการต่อ?";
  if (ui.alert("กรอก Platform / Genre", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(GGB_SHEET + "!Platform", function () {
    sheet.getRange(3, COL.platform, n, 1).setValues(plats);
  });
  _tryWrite(GGB_SHEET + "!Genre", function () {
    sheet.getRange(3, COL.genre, n, 1).setValues(gens);
  });
  SpreadsheetApp.flush();
  ui.alert("เรียบร้อย",
    "Platform เปลี่ยน " + chgP + " แถว · Genre เปลี่ยน " + chgG + " แถว\n\n" +
    "ถ้าค่าเพิ่งใส่ยังไม่มีใน dropdown ให้รัน \"ตรวจ dropdown\" อีกครั้งเพื่อเพิ่มเข้าไป" +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// ============================================================
// [P5.6] fixGenreValues — กรอก Genre/Platform ที่ตรวจสอบจากปกจริงแล้ว
//   • เกมออนไลน์ PC (รวม MMO เดิม) → "Game Online"
//   • Tonbo Magazine รวมบทสรุป    → "Cheats & Codes"
//   • เล่มที่เคยเป็น Unknown        → ค่าจริงจากการเปิดปกดู
//   แก้เฉพาะแถวที่ระบุชื่อไว้ · ไม่แตะแถวอื่น · รันซ้ำได้
// ============================================================
// [ชื่อสินค้า (ตรงตัว หรือ prefix), Genre ใหม่, Platform ใหม่ ("" = ไม่แตะ)]
var GENRE_FIXES = [
  // ── เกมออนไลน์ PC (ยืนยันจากปก RO School = คู่มือ Ragnarok Online) ──
  ["Love Beat",                     "Game Online", ""],
  ["M Fighter",                     "Game Online", ""],
  ["M Star",                        "Game Online", ""],
  ["Magic World",                   "Game Online", ""],
  ["RO School",                     "Game Online", ""],
  ["Divine Soul",                   "Game Online", ""],
  ["Dragonica",                     "Game Online", ""],
  ["Eden Online",                   "Game Online", ""],
  ["Ragnarok Online",               "Game Online", ""],
  ["Yulgang",                       "Game Online", ""],
  // ── นิตยสารรวมสูตร ──
  ["Tonbo Magazine รวมบทสรุป",       "Cheats & Codes", "Multi-Platform"],
  // ── เล่มที่เปิดปกตรวจแล้ว (ใส่ทั้งชื่อเก่า/ใหม่ เผื่อยังไม่ได้เปลี่ยนชื่อ) ──
  ["ONI Zero",                      "RPG",     "PlayStation"],
  ["Tiny Bullet",                   "RPG",     "PlayStation"],   // ครอบคลุม "Tiny Bullets" ด้วย
  ["Nightshade",                    "Action",  "PlayStation 2"],
  ["Night Shard",                   "Action",  "PlayStation 2"]
];

function fixGenreValues() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GGB_SHEET);
  if (!sheet) { ui.alert("⚠️ ไม่พบชีต " + GGB_SHEET); return; }
  var COL = _resolveColumns(sheet);
  if (!COL.name || !COL.genre || !COL.platform) {
    ui.alert("⚠️ ต้องมีคอลัมน์ Item name / Genre / Platform"); return;
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) { ui.alert("ไม่มีข้อมูล"); return; }
  var n = lastRow - 2;
  var names = sheet.getRange(3, COL.name, n, 1).getValues();
  var gens  = sheet.getRange(3, COL.genre, n, 1).getValues();
  var plats = sheet.getRange(3, COL.platform, n, 1).getValues();

  var chgG = 0, chgP = 0, detail = [];
  for (var i = 0; i < n; i++) {
    var nm = String(names[i][0] || "").trim();
    if (!nm) continue;
    for (var f = 0; f < GENRE_FIXES.length; f++) {
      var key = GENRE_FIXES[f][0], ng = GENRE_FIXES[f][1], np = GENRE_FIXES[f][2];
      if (nm.toLowerCase().indexOf(key.toLowerCase()) !== 0) continue;   // ตรงตั้งแต่ต้นชื่อ
      var og = String(gens[i][0] || "").trim();
      if (ng && og !== ng) { gens[i][0] = ng; chgG++; detail.push(nm.slice(0, 40) + " : " + (og || "ว่าง") + " → " + ng); }
      if (np && String(plats[i][0] || "").trim() !== np) { plats[i][0] = np; chgP++; }
      break;
    }
  }
  if (!chgG && !chgP) { ui.alert("✅ ทุกแถวถูกต้องอยู่แล้ว — ไม่ต้องแก้อะไร"); return; }

  var msg = "จะแก้ Genre " + chgG + " แถว · Platform " + chgP + " แถว\n\nตัวอย่าง:\n" +
            detail.slice(0, 14).join("\n") +
            (detail.length > 14 ? "\n… อีก " + (detail.length - 14) + " แถว" : "") +
            "\n\nดำเนินการต่อ?";
  if (ui.alert("กรอก Genre / Platform", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(GGB_SHEET + "!Genre", function () { sheet.getRange(3, COL.genre, n, 1).setValues(gens); });
  _tryWrite(GGB_SHEET + "!Platform", function () { sheet.getRange(3, COL.platform, n, 1).setValues(plats); });
  SpreadsheetApp.flush();
  ui.alert("เรียบร้อย",
    "Genre แก้ " + chgG + " แถว · Platform แก้ " + chgP + " แถว\n\n" +
    "\"Game Online\" เป็นค่าใหม่ — รัน \"🎨 จัดหน้าชีต\" หรือ \"🔽 ตรวจ dropdown\" " +
    "เพื่อให้มันเข้าไปอยู่ใน dropdown ด้วย" + _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// ============================================================
// [P5.7] normalizeGenres — ยุบ Genre 55 ค่า → 24 ค่า + แยก Sub Genre
//   หลักคิด (แบบร้านหนังสือญี่ปุ่น): Genre = แนวหลักค่าเดียว (ดรอปดาวน์สะอาด/กรองได้)
//                                    Sub Genre = แนวรอง คั่นด้วย , (ค้นเจอครบ)
//   ⚠️ เล่มที่มี × ในชื่อ = "บทสรุปหลายเกม" ไม่ใช่ Cheats & Codes
//      → ใส่ Genre ตามเกมนำ · Sub Genre ตามเกมที่เหลือ (ดู COMBO_FIXES)
// ============================================================
var SUBGENRE_HEADER = "Sub Genre";

// [ค่าเดิม, Genre ใหม่, Sub Genre]  ("" ใน Genre = ปล่อยว่างให้กรอกเอง)
var GENRE_MAP = [
  ["Horror / Survival Horror",            "Survival Horror",   ""],
  ["Action / Adventure",                  "Action-Adventure",  ""],
  ["Action / Adventure (Open World)",     "Action-Adventure",  "Sandbox / Open World"],
  ["Action / Sport",                      "Sports",            ""],
  ["Action Platformer / 3D Platformer",   "Action Platformer", ""],
  ["RPG / Turn-based",                    "RPG",               ""],
  ["MMO",                                 "Game Online",       ""],
  ["Action / Hack and Slash",             "Action",            "Hack and Slash"],
  ["Action Adventure / Hack and Slash",   "Action-Adventure",  "Hack and Slash"],
  ["Action RPG / Hack and Slash",         "Action RPG",        "Hack and Slash"],
  ["Action / Shooter (FPS/TPS)",          "Action",            "Shooter (FPS/TPS)"],
  ["Action / Beat 'em up",                "Action",            "Beat 'em up"],
  ["Action Platformer / Metroidvania",    "Action Platformer", "Metroidvania"],
  ["Action Platformer / Action Adventure","Action Platformer", "Action-Adventure"],
  ["Action Adventure / Action RPG",       "Action-Adventure",  "Action RPG"],
  ["Action Adventure / Survival Horror",  "Action-Adventure",  "Survival Horror"],
  ["Action / Survival Horror",            "Survival Horror",   "Action"],
  ["Survival Horror / Action",            "Survival Horror",   "Action"],
  ["Survival Horror / Stealth",           "Survival Horror",   "Stealth Action"],
  ["Survival Horror / Action RPG",        "Survival Horror",   "Action RPG"],
  ["RPG / Survival Horror",               "RPG",               "Survival Horror"],
  ["Tactical RPG / Strategy",             "Tactical RPG",      "Strategy / Tactics"],
  ["RPG / Tactical RPG",                  "Tactical RPG",      "RPG"],
  ["RPG, Strategy / Tactics",             "RPG",               "Strategy / Tactics"],
  ["RPG / Dungeon Crawler",               "RPG",               "Dungeon Crawler"],
  ["RPG / Dating Sim",                    "RPG",               "Dating Sim"],
  ["RPG / Card Battle",                   "RPG",               "Card Battle"],
  ["Strategy / Card Battle",              "Strategy / Tactics","Card Battle"],
  ["Adventure / Simulation",              "Adventure",         "Simulation"],
  ["Adventure / RPG",                     "Adventure",         "RPG"]
];

// เล่มบทสรุปหลายเกม (มี × / ⨯ ในชื่อ) — Genre = เกมนำ · Sub Genre = เกมที่เหลือ
// [ชื่อขึ้นต้น, Genre, Sub Genre, Platform ("" = ไม่แตะ)]  — ทั้งหมดยืนยันจากปกจริง
var COMBO_FIXES = [
  ["Echo Night 2",              "Adventure",         "Action RPG",                     ""],
  ["Rockman X6 ×",              "Platformer",        "Shooter (FPS/TPS)",              ""],
  ["Rockman X6 ⨯",              "Platformer",        "Shooter (FPS/TPS)",              ""],
  ["Lunar - Silver Star Story ×","RPG",              "Action RPG",                     ""],
  ["Torneko",                   "RPG",               "Strategy / Tactics",             ""],
  ["GAMEMAG TOP SECRET - Metroid Fusion", "Action Platformer", "RPG",                  ""],
  ["Rockman Zero 2",            "Action",            "Action RPG, Strategy / Tactics", ""],
  // ปกระบุ "RPG แห่งความเชื่อมั่น" ให้ Tales of Xillia เป็นเกมนำ · แถม Grand Knights History (PSP)
  // + Deus Ex Human Revolution · หัวปกลิสต์เครื่อง PS3/360/Wii/PSP/DS/3DS — ไม่มี PC
  ["Game Guide vol 1",          "RPG",               "Tactical RPG, Action RPG",
   "PlayStation 3, PlayStation Portable"]
];

function normalizeGenres() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GGB_SHEET);
  if (!sheet) { ui.alert("⚠️ ไม่พบชีต " + GGB_SHEET); return; }

  var subCol = _addHeaderIfMissing(sheet, SUBGENRE_HEADER);
  if (subCol === -1) { ui.alert("⚠️ สร้างคอลัมน์ " + SUBGENRE_HEADER + " ไม่สำเร็จ"); return; }
  _colCache = {};
  var COL = _resolveColumns(sheet);
  var cSub = COL.subGenre || subCol;
  if (!COL.name || !COL.genre) { ui.alert("⚠️ ต้องมีคอลัมน์ Item name / Genre"); return; }

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) { ui.alert("ไม่มีข้อมูล"); return; }
  var n = lastRow - 2;
  var names = sheet.getRange(3, COL.name, n, 1).getValues();
  var gens  = sheet.getRange(3, COL.genre, n, 1).getValues();
  var subs  = sheet.getRange(3, cSub, n, 1).getValues();
  var plats = COL.platform ? sheet.getRange(3, COL.platform, n, 1).getValues() : null;

  var mapG = {};
  GENRE_MAP.forEach(function (m) { mapG[m[0]] = [m[1], m[2]]; });

  var chgG = 0, chgS = 0, chgP = 0, combo = 0, blanks = [];
  for (var i = 0; i < n; i++) {
    var nm = String(names[i][0] || "").trim();
    if (!nm) continue;
    var og = String(gens[i][0] || "").trim();
    var ng = null, ns = null;

    // 1) เล่มรวมหลายเกม (× / ⨯) — ชนะกฎอื่น
    for (var c = 0; c < COMBO_FIXES.length; c++) {
      if (nm.toLowerCase().indexOf(COMBO_FIXES[c][0].toLowerCase()) === 0) {
        ng = COMBO_FIXES[c][1]; ns = COMBO_FIXES[c][2]; combo++;
        var np = COMBO_FIXES[c][3];
        if (np && plats && String(plats[i][0] || "").trim() !== np) { plats[i][0] = np; chgP++; }
        break;
      }
    }
    // 2) ยุบชื่อแนวตามตาราง
    if (ng === null && mapG[og]) { ng = mapG[og][0]; ns = mapG[og][1]; }

    if (ng === null) continue;
    if (!ng) { blanks.push(nm); continue; }          // ต้องกรอกเอง (Unknown / Multi-Game Walkthrough)
    if (og !== ng) { gens[i][0] = ng; chgG++; }
    if (ns && String(subs[i][0] || "").trim() !== ns) { subs[i][0] = ns; chgS++; }
  }

  var msg = "• Genre เปลี่ยน " + chgG + " แถว (เหลือ 24 ค่าหลัก)\n" +
            "• Sub Genre เติม " + chgS + " แถว\n" +
            "• เล่มบทสรุปหลายเกม (×) จัดตามเกมนำ " + combo + " แถว\n" +
            (chgP ? "• Platform แก้ " + chgP + " แถว\n" : "");
  if (blanks.length) msg += "• ต้องกรอกเอง (Unknown / Multi-Game Walkthrough): " + blanks.length + " แถว\n";
  msg += "\nดำเนินการต่อ?";
  if (ui.alert("จัดระเบียบ Genre", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(GGB_SHEET + "!Genre", function () { sheet.getRange(3, COL.genre, n, 1).setValues(gens); });
  _tryWrite(GGB_SHEET + "!Sub Genre", function () { sheet.getRange(3, cSub, n, 1).setValues(subs); });
  if (chgP && plats) {
    _tryWrite(GGB_SHEET + "!Platform", function () { sheet.getRange(3, COL.platform, n, 1).setValues(plats); });
  }
  SpreadsheetApp.flush();

  ui.alert("เรียบร้อย",
    "Genre " + chgG + " แถว · Sub Genre " + chgS + " แถว\n\n" +
    (blanks.length ? "ยังต้องกรอกเอง " + blanks.length + " แถว (เดิมเป็น Unknown / Multi-Game Walkthrough)\n\n" : "") +
    "ต่อไป: รัน \"🎨 จัดหน้าชีต\" เพื่อสร้าง dropdown ใหม่จากค่าที่สะอาดแล้ว" +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// ============================================================
// [P5.8] exportMetaCsv — สร้างชีต "META EXPORT" ที่พร้อมโหลดเป็น CSV อัป Commerce Manager
//   • หัวคอลัมน์ = ชื่อฟิลด์ของ Meta เป๊ะ (id, title, description, ...)
//   • เอาเฉพาะแถวที่ข้อมูลครบ — แถวที่ขาดจะถูกกันออกพร้อมรายงานว่าขาดอะไร
//   • template ของ Meta มี 31 คอลัมน์ แต่ "บังคับ" แค่ 9 คอลัมน์แรกเท่านั้น
// ============================================================
var META_EXPORT_SHEET = "META EXPORT";
var META_REQUIRED = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];
// ฟิลด์ที่ Meta ถือว่า Optional แต่ถ้าไม่ใส่ สินค้าจะขึ้นว่า "Not visible in Shops"
// หนังสือมือสอง = มีเล่มเดียวต่อ SKU → ใส่ 1 ทุกแถว
var META_EXTRA = { "quantity_to_sell_on_facebook": "1" };

// ══════════════════════════════════════════════════════════
//  ขอบเขตงาน Facebook Catalogue — จุดเดียวที่คุมทุกเครื่องมือ
//  ตอนนี้ทำเฉพาะ POCKET BOOK เท่านั้น
//  นิตยสาร (GAMEMAG SPECIAL / TOP SECRET / MEGA MONTH / Tonbo ฯลฯ)
//  จะทำแยกแค็ตตาล็อกต่างหากภายหลัง — ห้ามปนกัน
//  ⚠️ ทุกฟังก์ชัน (📘 buildFbCatalogue · ✍️ rebuildDescriptions · 📤 exportMetaCsv)
//     ต้องเรียก _metaInScope() ตัวนี้เท่านั้น อย่าเขียนตัวกรองแยก
// ══════════════════════════════════════════════════════════
var META_ONLY_STATUS = ["Instock"];          // ใส่ [] = ไม่กรองสถานะ
var META_EXCLUDE_NAME = /GAMEMAG|MEGA MONTH|MEGA |Tonbo|COMPGAMER|GAMECOM|ฉบับสูตรเกม|Game Guide vol|Special Technic|HOBBY|Hobby Japan|A・Club|Gundam Weapons|TV Mag/i;
var META_ONLY_TYPE = "";                     // ถ้าเติมคอลัมน์ Type แล้ว ใส่ "POCKET BOOK" จะแม่นกว่า regex

// คืน { ok:true } ถ้าอยู่ในขอบเขต · ไม่งั้นคืนเหตุผล
//   it = { name, status, type, sheet }
function _metaInScope(it, checkStatus) {
  if (!it) return { ok: false, why: "noInv" };
  if (it.sheet === MAG_SHEET) return { ok: false, why: "outScope" };
  if (META_ONLY_TYPE && it.type && it.type !== META_ONLY_TYPE) return { ok: false, why: "outScope" };
  if (!META_ONLY_TYPE && META_EXCLUDE_NAME.test(it.name || "")) return { ok: false, why: "outScope" };
  if (checkStatus && META_ONLY_STATUS.length && META_ONLY_STATUS.indexOf(it.status) === -1) {
    return { ok: false, why: "wrongStatus" };
  }
  return { ok: true };
}

// index สต็อกมาตรฐาน — ใช้ร่วมกันทุกเครื่องมือ Facebook
function _metaInvIndex() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), inv = {};
  [GGB_SHEET, MAG_SHEET].forEach(function (sn) {
    var sh = ss.getSheetByName(sn);
    if (!sh || sh.getLastRow() < 3) return;
    var C = _resolveColumns(sh);
    if (!C.productId) return;
    var rn = sh.getLastRow() - 2;
    var vals = sh.getRange(3, 1, rn, sh.getLastColumn()).getValues();
    for (var i = 0; i < rn; i++) {
      var pid = (_val(vals[i], C, "productId") || "").toString().trim();
      if (!pid || inv[pid]) continue;
      inv[pid] = {
        name:      (_val(vals[i], C, "name")      || "").toString().trim(),
        status:    (_val(vals[i], C, "status")    || "").toString().trim(),
        type:      (_val(vals[i], C, "type")      || "").toString().trim(),
        condition: (_val(vals[i], C, "condition") || "").toString().trim().toUpperCase(),
        publisher: (_val(vals[i], C, "publisher") || "").toString().trim(),
        platform:  (_val(vals[i], C, "platform")  || "").toString().trim(),
        genre:     (_val(vals[i], C, "genre")     || "").toString().trim(),
        price:     (_val(vals[i], C, "price")       || "").toString().trim(),
        mktPrice:  (_val(vals[i], C, "marketplace") || "").toString().trim(),
        sheet:     sn
      };
    }
  });
  return inv;
}

function exportMetaCsv() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = ss.getSheetByName(FB_SHEET);
  if (!fb) { ui.alert("⚠️ ไม่พบชีต " + FB_SHEET); return; }

  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("ไม่มีข้อมูลใน " + FB_SHEET); return; }
  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];

  // หาคอลัมน์ของแต่ละฟิลด์
  var colOf = {}, missingCols = [];
  META_REQUIRED.forEach(function (f) {
    var c = _fbFindCol(headers, f);
    if (c) colOf[f] = c; else missingCols.push(f);
  });
  if (missingCols.length) {
    ui.alert("⚠️ ไม่พบคอลัมน์ใน " + FB_SHEET + ": " + missingCols.join(", ") +
             "\n\nรัน \"📘 จัด FB CATALOGUE\" ก่อน");
    return;
  }

  var n = lastRow - 1;
  var data = {};
  META_REQUIRED.forEach(function (f) {
    data[f] = fb.getRange(2, colOf[f], n, 1).getValues();
  });

  var inv = _metaInvIndex();      // index กลาง (ใช้ร่วมกันทุกเครื่องมือ)

  var extraKeys = Object.keys(META_EXTRA);
  var out = [META_REQUIRED.concat(extraKeys)];   // แถวหัว = ชื่อฟิลด์ Meta
  var skipped = [], reasons = {};
  var outScope = 0, wrongStatus = 0;
  for (var i = 0; i < n; i++) {
    // ── กรองขอบเขตก่อน ──
    var thisPid = String(data.id[i][0] == null ? "" : data.id[i][0]).trim();
    var it = inv[thisPid];
    if (thisPid && it) {
      var sc = _metaInScope(it, true);          // ตัวกรองกลางตัวเดียวกับ 📘 และ ✍️
      if (!sc.ok) {
        if (sc.why === "wrongStatus") wrongStatus++; else outScope++;
        continue;
      }
    }

    var row = [], miss = [];
    for (var k = 0; k < META_REQUIRED.length; k++) {
      var f = META_REQUIRED[k];
      var v = String(data[f][i][0] == null ? "" : data[f][i][0]).trim();
      if (!v) miss.push(f);
      row.push(v);
    }
    if (!row[0]) continue;                 // ไม่มี id = แถวว่าง ข้ามเงียบ ๆ
    if (miss.length) {
      skipped.push(row[0] + " (ขาด " + miss.join(", ") + ")");
      miss.forEach(function (f) { reasons[f] = (reasons[f] || 0) + 1; });
      continue;
    }
    extraKeys.forEach(function (k) { row.push(META_EXTRA[k]); });
    out.push(row);
  }

  // เขียนลงชีตใหม่
  var ex = ss.getSheetByName(META_EXPORT_SHEET);
  if (!ex) ex = ss.insertSheet(META_EXPORT_SHEET);
  else ex.clear();
  var nCols = out[0].length;                 // = required + extra (กันหลุดเวลาเพิ่มฟิลด์)
  ex.getRange(1, 1, out.length, nCols).setValues(out);
  ex.setFrozenRows(1);
  ex.getRange(1, 1, 1, nCols).setFontWeight("bold");
  SpreadsheetApp.flush();
  ss.setActiveSheet(ex);

  var msg = "✅ สร้างชีต \"" + META_EXPORT_SHEET + "\" แล้ว\n" +
            "ขอบเขต: POCKET BOOK · สถานะ " + (META_ONLY_STATUS.join("/") || "ทั้งหมด") + "\n\n" +
            "• สินค้าพร้อมอัป: " + (out.length - 1) + " รายการ\n" +
            "• ไม่เข้าขอบเขต (นิตยสาร/หมวดอื่น): " + outScope + " รายการ\n" +
            "• สถานะไม่ตรง (ขายแล้ว/Auction/Hold/Retake): " + wrongStatus + " รายการ\n" +
            "• ข้อมูลไม่ครบ: " + skipped.length + " รายการ\n";
  if (skipped.length) {
    msg += "\nขาดฟิลด์อะไรบ้าง:\n";
    Object.keys(reasons).forEach(function (f) { msg += "   • " + f + " : " + reasons[f] + " แถว\n"; });
    msg += "\nตัวอย่าง:\n   " + skipped.slice(0, 5).join("\n   ") +
           (skipped.length > 5 ? "\n   … อีก " + (skipped.length - 5) : "") + "\n";
  }
  msg += "\n── วิธี export ──\n" +
         "1) อยู่ที่ชีต " + META_EXPORT_SHEET + " (เปิดให้แล้ว)\n" +
         "2) File → Download → Comma-separated values (.csv)\n" +
         "3) อัปไฟล์นั้นใน Commerce Manager → Catalog → Data Sources → Upload\n\n" +
         "หมายเหตุ: template ของ Meta มี 31 คอลัมน์ แต่บังคับแค่ 9 คอลัมน์นี้\n" +
         "ที่เหลือเป็น Optional ไม่ต้องกรอกก็อัปได้";
  ui.alert("META EXPORT", msg, ui.ButtonSet.OK);
}

// ============================================================
// [P5.9] repairDescriptions — ซ่อม Description ที่วางเลื่อนแถว
//   อาการ: description ของเกม A ไปอยู่แถวเกม B (เพราะเคย copy-paste ทั้งบล็อก
//          โดยไม่ได้จับคู่ Product ID)
//   วิธีซ่อม: ทุก description ขึ้นต้นด้วย "<ชื่อเกม> คู่มือเฉลยเกม ..."
//          → ดึงชื่อออกมาทำ index แล้วเอาไปวางในแถวที่ชื่อตรงกันจริง
//   ไม่ลบข้อความใด ๆ · แถวที่หาคู่ไม่เจอจะถูกเว้นไว้และรายงานให้ดู
// ============================================================
function _descExtractName(text) {
  var s = String(text || "").trim();
  if (!s) return "";
  // ตัดที่คำที่ตามหลังชื่อเสมอ
  var cuts = ["คู่มือเฉลยเกม", "คู่มือเกม", "จากสำนักพิมพ์", "นิตยสาร"];
  for (var i = 0; i < cuts.length; i++) {
    var p = s.indexOf(cuts[i]);
    if (p > 0) return s.slice(0, p).trim();
  }
  return s.slice(0, 60).trim();
}

function repairDescriptions() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = ss.getSheetByName(FB_SHEET);
  if (!fb) { ui.alert("⚠️ ไม่พบชีต " + FB_SHEET); return; }

  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("ไม่มีข้อมูล"); return; }
  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];

  var cDesc = _fbFindCol(headers, "Description");
  var cBase = _fbFindCol(headers, "Helper Base Title");
  var cTtl  = _fbFindCol(headers, "FB Title") || _fbFindCol(headers, "ชื่อสินค้า (Facebook Title)");
  var cPid  = _fbFindCol(headers, "Product ID");
  if (!cDesc || !cPid || (!cBase && !cTtl)) {
    ui.alert("⚠️ ต้องมีคอลัมน์ Description / Product ID / Helper Base Title (หรือ FB Title)");
    return;
  }

  var n = lastRow - 1;
  var desc = fb.getRange(2, cDesc, n, 1).getValues();
  var base = cBase ? fb.getRange(2, cBase, n, 1).getValues() : null;
  var ttl  = cTtl  ? fb.getRange(2, cTtl,  n, 1).getValues() : null;
  var pids = fb.getRange(2, cPid, n, 1).getValues();

  function key(s) { return _normHeader(_getBaseTitle(String(s || ""))); }

  // 1) index: ชื่อที่อยู่ต้น description → ข้อความเต็ม
  var byName = {}, dupes = 0;
  for (var i = 0; i < n; i++) {
    var d = String(desc[i][0] || "").trim();
    if (!d) continue;
    var nm = key(_descExtractName(d));
    if (!nm) continue;
    if (byName[nm] && byName[nm] !== d) dupes++;
    if (!byName[nm]) byName[nm] = d;
  }

  // 2) วางกลับให้ตรงแถว
  var out = [], fixed = 0, kept = 0, notFound = [];
  for (var j = 0; j < n; j++) {
    var cur = String(desc[j][0] || "").trim();
    var myName = key((base && base[j][0]) ? base[j][0] : (ttl ? ttl[j][0] : ""));
    if (!myName) { out.push([cur]); continue; }
    var right = byName[myName];
    if (!right) {
      out.push([cur]);
      if (String(pids[j][0] || "").trim()) notFound.push(String(pids[j][0]).trim() + " — " + myName.slice(0, 40));
      continue;
    }
    if (right !== cur) { out.push([right]); fixed++; }
    else { out.push([cur]); kept++; }
  }

  var msg = "พบ description ที่ระบุชื่อได้ " + Object.keys(byName).length + " ชื่อ\n\n" +
            "• จะย้ายให้ตรงแถว: " + fixed + " แถว\n" +
            "• ตรงอยู่แล้ว: " + kept + " แถว\n" +
            "• หา description ของตัวเองไม่เจอ: " + notFound.length + " แถว\n" +
            (dupes ? "• ชื่อซ้ำแต่ข้อความต่างกัน: " + dupes + " (ใช้อันแรก)\n" : "") +
            "\nดำเนินการต่อ?";
  if (ui.alert("ซ่อม Description", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(FB_SHEET + "!Description", function () {
    fb.getRange(2, cDesc, n, 1).setValues(out);
  });
  SpreadsheetApp.flush();

  var done = "✅ ย้าย description ให้ตรงแถวแล้ว " + fixed + " แถว\n";
  if (notFound.length) {
    done += "\n⚠️ ยังไม่มี description " + notFound.length + " แถว เช่น:\n   " +
            notFound.slice(0, 10).join("\n   ") +
            (notFound.length > 10 ? "\n   … อีก " + (notFound.length - 10) : "");
  }
  done += "\n\nตรวจสัก 5-10 แถวว่าชื่อกับเนื้อหาตรงกันแล้ว\nจากนั้นรัน 📤 สร้างชีต META EXPORT ใหม่";
  ui.alert("เรียบร้อย", done + _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// ============================================================
// [P5.10] rebuildDescriptions — สร้าง Description ใหม่ทั้งหมดจากข้อมูลจริง
//   ปัญหาเดิม: คอลัมน์ Description ถูก paste เลื่อนแถว และ 355 แถวไม่มีของตัวเองเลย
//   วิธีแก้ที่ถูกต้อง: ไม่ย้ายของเดิม แต่ "ประกอบขึ้นใหม่" จากข้อมูลที่ผูกกับ Product ID
//
//   โครงสร้าง 4 ย่อหน้า:
//     1) <ชื่อ> คู่มือเฉลยเกม (Guide Book) สำหรับ <Platform> แนว <Genre> จัดทำโดยสำนักพิมพ์ <Publisher>
//     2) เรื่องย่อ (จากชีต GAME INFO — ผูกกับ Base Title)
//     3) ข้อความมาตรฐานว่ามีอะไรอยู่ในเล่ม
//     4) สภาพหนังสือตามเกรด
// ============================================================
// ย่อหน้าสุดท้าย: เอาสั้น ๆ แค่ "CONDITION — <เกรด>"
var DESC_COND_PREFIX = "CONDITION — ";

// ชื่อในสต็อกมีวงเล็บบอกของแถมต่อท้าย เช่น "Bully (Incl. Map)" แต่ GAME INFO เก็บชื่อเปล่า
// → ลองหลายรูปแบบ: ชื่อเต็ม → ตัด (Incl. ...) → ตัดวงเล็บท้ายสุด
function _synKeys(base) {
  var out = [], seen = {};
  function add(s) { s = String(s || "").trim(); if (s && !seen[s]) { seen[s] = 1; out.push(s); } }
  add(base);
  var a = base.replace(/\s*[\(（]\s*Incl\.[^)）]*[\)）]/gi, "").trim();
  add(a);
  add(a.replace(/\s*[\(（][^)）]*[\)）]\s*$/, "").trim());
  return out;
}

function rebuildDescriptions() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = ss.getSheetByName(FB_SHEET);
  if (!fb) { ui.alert("⚠️ ไม่พบชีต " + FB_SHEET); return; }
  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("ไม่มีข้อมูล"); return; }

  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];
  var cPid  = _fbFindCol(headers, "Product ID");
  var cDesc = _fbFindCol(headers, "Description");
  var cSyn  = _fbFindCol(headers, "Synopsis");
  if (!cPid || !cDesc) { ui.alert("⚠️ ต้องมีคอลัมน์ Product ID และ Description"); return; }

  var n = lastRow - 1;
  var pids = fb.getRange(2, cPid, n, 1).getValues();

  var inv = _metaInvIndex();     // index กลาง (ใช้ร่วมกันทุกเครื่องมือ)

  // ── index เรื่องย่อ: Base Title → Synopsis (จากชีต GAME INFO) ──
  var syn = {};
  var gi = ss.getSheetByName(SP2_GAMEINFO_SHEET);
  if (gi && gi.getLastRow() >= 2) {
    var GC = _resolveColumns(gi);
    var cT = GC.baseTitleRef || 1, cS = GC.synopsis;
    if (cS) {
      var gn = gi.getLastRow() - 1;
      var gt = gi.getRange(2, cT, gn, 1).getValues();
      var gs = gi.getRange(2, cS, gn, 1).getValues();
      for (var k = 0; k < gn; k++) {
        var kk = _normHeader(_getBaseTitle((gt[k][0] || "").toString()));
        var vv = (gs[k][0] || "").toString().trim();
        if (kk && vv && !syn[kk]) syn[kk] = vv;
      }
    }
  }

  // ── ประกอบข้อความ ──
  var out = [], built = 0, noInv = [], noSyn = 0, skipScope = 0;
  for (var r = 0; r < n; r++) {
    var pid2 = String(pids[r][0] || "").trim();
    var it = inv[pid2];
    if (!pid2 || !it) { out.push([""]); if (pid2) noInv.push(pid2); continue; }

    // อยู่นอกขอบเขต POCKET BOOK → ไม่แตะ ปล่อยค่าเดิมไว้
    var sc = _metaInScope(it, false);
    if (!sc.ok) { out.push([String(fb.getRange(r + 2, cDesc).getValue() || "")]); skipScope++; continue; }

    var base = _getBaseTitle(it.name);
    // ไม่ใส่บรรทัดหัว (ชื่อ/เครื่อง/แนว/สำนักพิมพ์) แล้ว — ซ้ำกับฟิลด์ title และ brand ที่ Meta มีอยู่แล้ว
    var p2 = "";
    var cands = _synKeys(base);
    for (var ci = 0; ci < cands.length && !p2; ci++) p2 = syn[_normHeader(cands[ci])] || "";
    if (!p2 && cSyn) p2 = String(fb.getRange(r + 2, cSyn).getValue() || "").trim();
    if (!p2) noSyn++;

    var p3 = it.condition ? (DESC_COND_PREFIX + it.condition) : "";

    var parts = [];
    if (p2) parts.push(p2);
    if (p3) parts.push(p3);
    out.push([parts.join("\n\n")]);
    built++;
  }

  var msg = "ขอบเขต: POCKET BOOK เท่านั้น (นิตยสารไม่แตะ)\n\n" +
            "• สร้างใหม่: " + built + " แถว\n" +
            "• ข้าม (นิตยสาร/นอกขอบเขต): " + skipScope + " แถว\n" +
            "• ไม่มีข้อมูลในสต็อก (เว้นว่าง): " + noInv.length + " แถว\n" +
            "• ไม่มีเรื่องย่อ: " + noSyn + " แถว\n\n" +
            "ดำเนินการต่อ?";
  if (ui.alert("สร้าง Description ใหม่", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(FB_SHEET + "!Description", function () {
    fb.getRange(2, cDesc, n, 1).setValues(out);
  });
  SpreadsheetApp.flush();

  ui.alert("เรียบร้อย",
    "สร้าง Description ใหม่ " + built + " แถว (POCKET BOOK)\n" +
    "ข้ามนิตยสาร " + skipScope + " แถว — ไม่ถูกแก้ไข\n" +
    (noInv.length ? "เว้นว่าง " + noInv.length + " แถว (หา Product ID ในสต็อกไม่เจอ)\n" : "") +
    "\nตรวจสัก 5 แถวว่าชื่อกับเนื้อหาตรงกัน แล้วรัน 📤 สร้างชีต META EXPORT ใหม่" +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

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
    .addItem("🗂️ สร้าง/อัปเดตตารางซีรีส์ (SERIES MAP)", "sp2BuildSeriesMap")
    .addItem("🏷️ เพิ่มคอลัมน์ Type (หมวด/รูปแบบเล่ม)", "addTypeColumn")
    .addItem("🧭 จัดโครงสร้างชีตตามแผน (rename + หัวคอลัมน์)", "migrateSheetLayout")
    .addItem("🔗 เติม Series ใน GAME INFO", "fillGameInfoSeries")
    .addItem("🔽 ตรวจ dropdown Platform/Genre (+เพิ่มค่าที่ขาด)", "auditDropdowns")
    .addItem("📚 กรอก Platform/Genre กลุ่ม GAMEMAG SPECIAL", "fixGamemagSpecial")
    .addItem("🎮 กรอก Genre ที่ตรวจจากปกแล้ว (+Game Online)", "fixGenreValues")
    .addItem("🧹 จัดระเบียบ Genre 55→24 + แยก Sub Genre", "normalizeGenres")
    .addItem("📘 จัด FB CATALOGUE (รวม DESCRIPTION + ฟิลด์ Meta)", "buildFbCatalogue")
    .addItem("✍️ สร้าง Description ใหม่จากข้อมูลจริง (แนะนำ)", "rebuildDescriptions")
    .addItem("📤 สร้างชีต META EXPORT (พร้อมโหลด CSV อัป Meta)", "exportMetaCsv")
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
