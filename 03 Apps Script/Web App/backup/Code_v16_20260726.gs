// ============================================================
// OWA-GGB INVENTORY AUTOMATION SYSTEM v16 (Web-App Ready)
// v16 (P1 — plan v4 §1.3): แก้ blocker ก่อนเป็น web app · logic ราคา/SKU เดิมทุกตัว
//   [1] getTitleList / getPublisherList / addEntryFromSidebar / _activeInventorySheet
//       รับ sheetName ได้ (web app ไม่มี active sheet) — ไม่ส่ง = พฤติกรรมเดิม (Sidebar ใช้ต่อได้)
//   [2] _withLock(): LockService ครอบ write กัน SKU race เมื่อเปิดหลายเครื่องพร้อมกัน
//   [3] _recalcRow(): แตก pipeline (autoformat→restock→SKU→suggested→derived) ให้
//       onEdit / addEntry / updateEntry(P2) ใช้ร่วมกัน — onEdit เรียกตัวนี้แทน logic เดิม
//   [4] Sold Date: เพิ่ม "sold date" ใน HEADER_MAP · onEdit เติมวันที่อัตโนมัติเมื่อ Status→Sold
//       (ต้องเพิ่มคอลัมน์หัวว่า "Sold Date" ใน GGB/MAGAZINE เอง — header-driven วางตำแหน่งไหนก็ได้)
// ------------------------------------------------------------
// v14.2: แก้ natural sort — ".hack" เรียงใต้ H, "X-Men" เรียงใต้ X (ไม่ใช่ขึ้นต้น)
// v14.3: GGB Suggested Price ใช้ราคาขายจริง (Sold) match base+publisher+original;
//        สภาพตรง->median ราคานั้น, ไม่ตรง->+/-ส่วนต่าง (S+100/A0/B-10/C-30/D-50),
//        ไม่มี sold->เว้นว่าง, ปัด ฿10. MAGAZINE คงเดิม.
// v14.1: _autoFormat แปลง ":" → " - " และ "/" → "-" (กันอักขระต้องห้ามในชื่อไฟล์)
// v15:   fixDerivedFormulas() — สูตรต่อแถว Market Place / Gross Profit / Price Content Lists
// ============================================================

// ───────────────────────── CONFIG ─────────────────────────
var GGB_SHEET = "GAME GUIDE BOOKS";
var MAG_SHEET = "MAGAZINE";
var WEB_SHEET = "OWARIN WEB INFO";

// ปิด/เปิดการคำนวณราคาอัตโนมัติตอนแก้เซลล์
var AUTO_PRICE_ON_EDIT = true;

// ───────────────── P3 SETTINGS (แก้ตรงนี้ได้เลย · จะย้ายไป Settings UI ภายหลัง) ─────────────────
// ค่าจัดส่ง: base + step×(n−1) เพดาน cap
var SHIP_BASE = 50, SHIP_STEP = 10, SHIP_CAP = 100;
var ORDER_PREFIX = "OWA";               // Order = OWA-YYYYMMDD-NN
var SALES_SHEET  = "";                   // "" = auto-detect จากหัวคอลัมน์ (Order + Product + Net Profit)

// บัญชีรับเงิน — ใช้ในข้อความ "สรุปยอด" ({{bank_no}} / {{bank_name}} / {{account_name}})
// ⚠️ ตรวจเลขบัญชีให้ถูกต้องก่อนใช้จริง
var BANK_INFO = {
  no:      "2143623532",
  bank:    "KBANK กสิกรไทย",
  account: "Tananont A."
};

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
  "shopee upload":        "shopeeUpload",
  "product id":           "productId",
  "price content lists":  "priceContentLists",
  "max g ref":            "maxGRef",
  "copy no":              "copyNo",
  "copy no.":             "copyNo",
  "copy number":          "copyNo",
  "sold date":            "soldDate",     // v16: วันที่ขาย (เพิ่มคอลัมน์ในชีตเมื่อพร้อม)
  // ── SALES sheet (P3) ── (ชีตอื่นไม่มีหัวคอลัมน์เหล่านี้ จึงไม่ชนกัน)
  "order":                "order",
  "product":              "product",
  "order date":           "orderDate",
  "shiping cost":         "shipingCost",  // สะกดตามหัวคอลัมน์จริงในชีต
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

// ───────────────────── v16: LOCK WRAPPER ─────────────────────
// ครอบทุกงานเขียนที่อ่าน-แล้ว-เขียน (SKU/restock ไล่เลข) — กันสองเครื่อง submit พร้อมกัน
function _withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // รอสูงสุด 30 วิ
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

// คืน object: { name:1, status:2, publisher:3, ... } (1-based)
function _resolveColumns(sheet) {
  var sid = sheet.getSheetId();
  if (_colCache[sid]) return _colCache[sid];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) { _colCache[sid] = {}; return {}; }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var COL = {};
  for (var c = 0; c < headers.length; c++) {
    var key = HEADER_MAP[_normHeader(headers[c])];
    if (key && !COL[key]) COL[key] = c + 1; // เก็บอันแรกที่เจอ
  }
  _colCache[sid] = COL;
  return COL;
}

// ดึงค่าจาก row array (0-based) ด้วย logical key
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
// [A] onEdit — v16: เหลือหน้าที่ resolve เหตุการณ์ แล้วส่งต่อ _recalcRow
// ============================================================
function onEdit(e) {
  if (!e || !e.source) return;
  var sheet     = e.source.getActiveSheet();
  var range     = e.range;
  var sheetName = sheet.getName();

  // หน้า OWARIN WEB INFO — auto format คอลัมน์ A (คงเดิม)
  if (sheetName === WEB_SHEET) {
    if (range.getColumn() !== 1) return;
    var rawWebValue = range.getValue().toString();
    if (!rawWebValue) return;
    var webFormatted = _autoFormat(rawWebValue).replace(/: /g, "- ");
    if (webFormatted !== rawWebValue) range.setValue(webFormatted);
    return;
  }

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
                     COL.genre, COL.condition, COL.original, COL.cost, COL.copyNo];
    var isInput = inputCols.indexOf(editedCol) !== -1;
    if (!isInput) { _isEditRunning = false; return; }

    // v16: Status → Sold → เติม Sold Date อัตโนมัติ (ถ้ามีคอลัมน์และยังว่าง — ไม่ทับของเดิม)
    if (editedCol === COL.status && COL.soldDate) {
      var stVal = (range.getValue() || "").toString().trim();
      if (stVal === "Sold") {
        var sdCell = sheet.getRange(currentRow, COL.soldDate);
        if (!sdCell.getValue()) sdCell.setValue(new Date());
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
// [A2] v16 — _recalcRow: pipeline กลางของ "1 แถว"
//   autoformat+restock (เมื่อชื่อเปลี่ยน) → SKU (เมื่อ name/pub/cond เปลี่ยน)
//   → Suggested Price (ตาม AUTO_PRICE_ON_EDIT หรือ force) → derived formulas
//   ใช้โดย: onEdit (ตอนนี้) · updateEntry ของ web app (P2)
//   คืนค่า finalTitle หรือ null ถ้าแถวไม่มีชื่อ
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

  // ถ้าแก้ชื่อ → autoformat + detect restock
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

  // สร้าง SKU เมื่อ name / publisher / condition เปลี่ยน
  if (changed.name || changed.publisher || changed.condition) {
    var newSKU = _buildSKU(finalTitle, pubText, condText, row, allData, sheetName, COL);
    if (COL.productId) sheet.getRange(row, COL.productId).setValue(newSKU);
  }

  // คำนวณ Suggested Price
  if (AUTO_PRICE_ON_EDIT || changed.forcePrice) {
    _recalcSuggestedPrice(sheet, row, COL, sheetName, allData, finalTitle);
  }

  // v16: เติมสูตร derived ของแถวนี้ให้ครบเสมอ (เขียนสูตรเดิมซ้ำได้ ไม่มีผลข้างเคียง)
  _setDerivedFormulasForRow(sheet, row, COL);

  return finalTitle;
}

// คำนวณราคาแถวเดียว — ใช้ Sold index จากทั้งชีต
function _recalcSuggestedPrice(sheet, row, COL, sheetName, allData, title) {
  if (!COL.suggested) return;
  var orig = sheet.getRange(row, COL.original).getValue();
  var cost = sheet.getRange(row, COL.cost).getValue();
  var cond = sheet.getRange(row, COL.condition).getValue();
  var pub  = sheet.getRange(row, COL.publisher).getValue();

  var soldIndex = null;
  if (sheetName !== MAG_SHEET) soldIndex = _buildSoldIndex(allData, COL);

  var result = _calcSuggestedPrice(orig, cost, cond, sheetName, pub, title, soldIndex);
  sheet.getRange(row, COL.suggested).setValue(result.price);
  if (sheetName !== MAG_SHEET && COL.maxGRef) {
    sheet.getRange(row, COL.maxGRef).setValue(result.refStr || "");
  }
}

// ============================================================
// [PRICE-CONFIG] v14.3 — ค่าปรับสภาพ (ใช้เป็น "ส่วนต่าง" เมื่อสภาพไม่ตรง)
// ============================================================
var CONDADJ = { "S": 100, "A": 0, "B": -10, "C": -30, "D": -50 };

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

// ============================================================
// [PRICE-CORE] _buildSoldIndex — index ของแถว Sold เท่านั้น (ไม่นับ Auction)
//   key = "BASE|PUB|ORIG"  →  [ {cond, price(=Price col)}, ... ]
// ============================================================
function _buildSoldIndex(data, COL) {
  var idx = {};
  for (var m = 0; m < data.length; m++) {
    var t = _val(data[m], COL, "name"); t = t ? t.toString().trim() : "";
    if (!t) continue;
    var status = _val(data[m], COL, "status"); status = status ? status.toString().trim() : "";
    if (status !== "Sold") continue;
    var price = parseFloat(_val(data[m], COL, "price"));
    if (isNaN(price) || price <= 0) continue;
    var pub  = (_val(data[m], COL, "publisher") || "").toString().trim().toUpperCase();
    var cond = (_val(data[m], COL, "condition") || "").toString().trim().toUpperCase();
    var orig = _normOrig(_val(data[m], COL, "original"));
    var key  = _getBaseTitle(t).toUpperCase() + "|" + pub + "|" + orig;
    if (!idx[key]) idx[key] = [];
    idx[key].push({ cond: cond, price: price });
  }
  return idx;
}

// ============================================================
// [PRICE] _calcGGBSoldPrice — กฎ v14.3 (GGB)
// ============================================================
function _calcGGBSoldPrice(name, publisher, original, condition, soldIndex) {
  var cond = (condition || "").toString().trim().toUpperCase();
  if (cond === "" || cond === "-") return { price: "", label: "", refStr: "" };
  if (!soldIndex) return { price: "", label: "NO-SOLD", refStr: "" };

  var key = _getBaseTitle((name || "").toString()).toUpperCase()
          + "|" + (publisher || "").toString().trim().toUpperCase()
          + "|" + _normOrig(original);
  var m = soldIndex[key];
  if (!m || !m.length) return { price: "", label: "NO-SOLD", refStr: "" };

  var same = [];
  for (var i = 0; i < m.length; i++) if (m[i].cond === cond) same.push(m[i].price);

  var price, label, ref;
  if (same.length) {
    price = _median(same);
    label = "SOLD-SAME";
    ref   = "median(" + same.join(",") + ") @" + cond;
  } else {
    var tadj = (CONDADJ[cond] !== undefined) ? CONDADJ[cond] : 0;
    var conv = [];
    for (var j = 0; j < m.length; j++) {
      var sadj = (CONDADJ[m[j].cond] !== undefined) ? CONDADJ[m[j].cond] : 0;
      conv.push(m[j].price - sadj + tadj);
    }
    price = _median(conv);
    label = "SOLD-ADJ";
    ref   = "adj->" + cond + " from " + m.length + " sold";
  }

  price = Math.round(price / 10) * 10;   // ปัดเศษ ฿10
  return { price: price, label: label, refStr: ref };
}

// ============================================================
// [PRICE] _calcSuggestedPrice
//   GGB → _calcGGBSoldPrice (v14.3 sold-match)
//   MAGAZINE → publisher-aware (คงเดิม v13)
// ============================================================
function _calcSuggestedPrice(original, cost, condition, sheetName, publisher, name, soldIndex) {
  var origRaw = (original !== null && original !== undefined) ? original.toString().trim() : "";
  var condRaw = (condition !== null && condition !== undefined) ? condition.toString().toUpperCase().trim() : "";
  var costRaw = (cost !== null && cost !== undefined) ? cost.toString().trim() : "";

  if (condRaw === "-" || condRaw === "") return { price: "", tier: 0, label: "", refStr: "" };

  // ── GAME GUIDE BOOKS: กฎ sold-match ──
  if (sheetName !== MAG_SHEET) {
    var r = _calcGGBSoldPrice(name, publisher, original, condition, soldIndex);
    return { price: r.price, tier: 0, label: r.label, refStr: r.refStr || "" };
  }

  // ── MAGAZINE: publisher-aware (คงเดิม v13) ──
  if (origRaw === "-" || origRaw === "") return { price: "", tier: 0, label: "", refStr: "" };
  var orig = (parseFloat(origRaw) || 0);
  var cst  = (costRaw === "-" || costRaw === "") ? 0 : (parseFloat(costRaw) || 0);
  var adj_map = { "S": 50, "A": 0, "B": -20, "C": -40 };
  var adj = adj_map[condRaw];
  if (adj === undefined) return { price: "", tier: 0, label: "", refStr: "" };

  var pubCode = _getPubCode((publisher || "").toString());
  var base, costFloor, result;

  if (pubCode === "AM") {
    base      = orig <= 30 ? 60 : orig <= 50 ? 55 : 60;
    costFloor = cst > 0 ? cst * 1.1 : 0;
    result    = Math.max(base, costFloor) + adj;
    return { price: Math.round(Math.max(result, 30) / 10) * 10, tier: 0, label: "", refStr: "" };
  }
  if (pubCode === "VK") {
    if      (orig <= 22) base = 80;
    else if (orig <= 30) base = 80;
    else if (orig <= 40) base = 50;
    else if (orig <= 55) base = 120;
    else if (orig <= 70) base = 100;
    else                 base = orig * 1.2;
    costFloor = cst > 0 ? (orig <= 30 ? cst * 1.0 : cst * 1.5) : 0;
    result    = Math.max(base, costFloor) + adj;
    return { price: Math.round(Math.max(result, 30) / 10) * 10, tier: 0, label: "", refStr: "" };
  }

  if      (orig <= 25)  base = 80;
  else if (orig <= 65)  base = 80  + ((orig - 25)  / 40)  * 20;
  else if (orig <= 150) base = 100 + ((orig - 65)  / 85)  * 50;
  else                  base = 150 + ((orig - 150) * 0.8);

  costFloor = cst > 0 ? cst * 1.5 + 10 : 0;
  result    = Math.max(base, costFloor) + adj;
  return { price: Math.round(Math.max(result, 30) / 10) * 10, tier: 0, label: "", refStr: "" };
}

// ============================================================
// [PRICE-FILL] fillAllSuggestedPrices — header-driven
// ============================================================
function fillAllSuggestedPrices() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า GAME GUIDE BOOKS หรือ MAGAZINE ก่อนคำนวณ");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.suggested) { SpreadsheetApp.getUi().alert("⚠️ ไม่พบคอลัมน์ 'Suggested Price'"); return; }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

  var soldIndex = null;
  if (sheetName !== MAG_SHEET) soldIndex = _buildSoldIndex(data, COL);

  var outputF = [], outputN = [];
  var cnt = { same: 0, adj: 0, blank: 0, mag: 0 };

  for (var i = 0; i < data.length; i++) {
    var title = _val(data[i], COL, "name");
    title = title ? title.toString().trim() : "";
    if (!title) { outputF.push([""]); outputN.push([""]); continue; }

    var result = _calcSuggestedPrice(
      _val(data[i], COL, "original"), _val(data[i], COL, "cost"),
      _val(data[i], COL, "condition"), sheetName, _val(data[i], COL, "publisher"),
      title, soldIndex
    );
    outputF.push([result.price]);
    outputN.push([result.refStr || ""]);

    if (sheetName === MAG_SHEET) cnt.mag++;
    else if (result.label === "SOLD-SAME") cnt.same++;
    else if (result.label === "SOLD-ADJ")  cnt.adj++;
    else cnt.blank++;
  }

  sheet.getRange(3, COL.suggested, outputF.length, 1).setValues(outputF);
  if (sheetName !== MAG_SHEET && COL.maxGRef) {
    sheet.getRange(3, COL.maxGRef, outputN.length, 1).setValues(outputN);
  }

  var msg;
  if (sheetName === MAG_SHEET) {
    msg = "✅ คำนวณ Suggested Price หมวด MAGAZINE เสร็จ (" + cnt.mag + " แถว · สูตร Publisher-aware เดิม)";
  } else {
    msg = "✅ คำนวณ Suggested Price (v14.3 Sold-match) เสร็จ!\n\n" +
          "🎯 ใช้ราคา sold สภาพตรงกัน:        " + cnt.same  + " เล่ม\n" +
          "🔧 ปรับจากสภาพอื่น (+/− ส่วนต่าง):  " + cnt.adj   + " เล่ม\n" +
          "⬜ เว้นว่าง (ไม่มี sold ตรงเงื่อนไข): " + cnt.blank + " เล่ม\n\n" +
          "เงื่อนไข: match base name(ตัด RESTOCK)+publisher+original · Sold เท่านั้น(ไม่นับ Auction) · ราคา=median ของ Price · ปัด ฿10";
  }
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [B] _detectRestock — header-driven
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
// [C] _buildSKU — header-driven
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
// [D] _composeSKU + Publisher Code Map
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

  // เช็คก่อน ANIMATE เพื่อกัน false match
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
// [E] getCatLetter
// ============================================================
function getCatLetter(baseTitle) {
  var m = baseTitle.match(/[A-Za-z0-9\u0E00-\u0E7F]/);
  if (!m) return "O";
  var c = m[0];
  if (/^[\u0E00-\u0E7F]/.test(c)) return "T";
  if (/^[A-Za-z]/.test(c))        return c.toUpperCase();
  if (/^[0-9]/.test(c))           return "N";
  return "O";
}

// ============================================================
// [F] _autoFormat (v14.1: filename-safe sanitize)
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
// [SORT] natural sort (v14.2)
// ============================================================
function _sortKey(s) {
  s = (s === null || s === undefined) ? "" : s.toString().toLowerCase();
  var stripped = s.replace(/^[^a-z0-9\u0e00-\u0e7f]+/, "");
  if (stripped) s = stripped;
  var roman = { "viii":"008","vii":"007","vi":"006","iv":"004","iii":"003","ii":"002",
                "ix":"009","xiv":"014","xiii":"013","xii":"012","xi":"011","xv":"015",
                "x":"010","v":"005","i":"001" };
  return s.replace(/(^|\s)(viii|vii|vi|iv|iii|ii|ix|xiv|xiii|xii|xi|xv|x|v|i)(?=\s|$)/g,
    function(m, pre, rn) { return pre + roman[rn]; });
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
// [I] sortInventory — header-driven + natural sort
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
    return _natCmp(va, vb);
  });

  range.setValues(data);

  // setValues ทับ derived เป็นค่า static → เติมสูตรกลับ (header-driven)
  _fixDerivedFormulasForSheet(sheet, COL);
}

// ============================================================
// [G] Sidebar — Smart Entry (v16: รองรับ sheetName จาก web app)
// ============================================================
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("📦 Owarin Smart Entry").setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getTitleList(sheetName) {
  var sheet = _activeInventorySheet(sheetName);
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3 || !COL.name) return [];

  var colA = sheet.getRange(3, COL.name, lastRow - 2, 1).getValues();
  var seen = {}, list = [];
  for (var i = 0; i < colA.length; i++) {
    var t = colA[i][0] ? colA[i][0].toString().trim() : "";
    if (!t) continue;
    var base = _getBaseTitle(t);
    if (base && !seen[base.toUpperCase()]) { seen[base.toUpperCase()] = true; list.push(base); }
  }
  return list.sort(function(a, b) { return _natCmp(a, b); });
}

function getPublisherList(sheetName) {
  var sheet = _activeInventorySheet(sheetName);
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3 || !COL.publisher) return [];

  var colB = sheet.getRange(3, COL.publisher, lastRow - 2, 1).getValues();
  var seen = {}, list = [];
  for (var i = 0; i < colB.length; i++) {
    var p = colB[i][0] ? colB[i][0].toString().trim() : "";
    if (p && !seen[p]) { seen[p] = true; list.push(p); }
  }
  return list.sort();
}

// v16: รับ sheetName (web app) — ไม่ส่ง = ใช้ active sheet เดิม (Sidebar)
function _activeInventorySheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (sheetName === GGB_SHEET || sheetName === MAG_SHEET) {
    return ss.getSheetByName(sheetName);
  }
  var sheet = ss.getActiveSheet();
  if (sheet.getName() !== GGB_SHEET && sheet.getName() !== MAG_SHEET) sheet = ss.getSheetByName(GGB_SHEET);
  return sheet;
}

// ============================================================
// [SIDEBAR-ADD] addEntryFromSidebar — v16: sheetName + LockService
//   data.sheetName (optional): "GAME GUIDE BOOKS" | "MAGAZINE" — จาก web app
// ============================================================
function addEntryFromSidebar(data) {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet, sheetName;

    if (data && (data.sheetName === GGB_SHEET || data.sheetName === MAG_SHEET)) {
      sheetName = data.sheetName;
      sheet = ss.getSheetByName(sheetName);
    } else {
      sheet = ss.getActiveSheet();
      sheetName = sheet.getName();
      if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
        sheet = ss.getSheetByName(GGB_SHEET);
        sheetName = GGB_SHEET;
      }
    }

    var COL     = _resolveColumns(sheet);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var newRow  = lastRow + 1;
    if (newRow < 3) newRow = 3;

    var title    = _autoFormat(data.title.trim());
    var pub      = data.pub.trim();
    var cond     = data.cond.trim().toUpperCase();
    var original = data.original || "";
    var cost     = data.cost     || "";
    var price    = data.price    || "";
    var status   = data.status   || "Instock";

    var allData = (lastRow >= 3) ? sheet.getRange(3, 1, lastRow - 2, lastCol).getValues() : [];

    var restockResult = _detectRestock(title, newRow, allData, COL);
    var finalTitle    = restockResult.title;
    var sku           = _buildSKU(finalTitle, pub, cond, newRow, allData, sheetName, COL);

    var soldIndex = null;
    if (sheetName !== MAG_SHEET) soldIndex = _buildSoldIndex(allData, COL);
    var result    = _calcSuggestedPrice(original, cost, cond, sheetName, pub, finalTitle, soldIndex);
    var suggested = result.price;

    var setIf = function(key, val) { if (COL[key]) sheet.getRange(newRow, COL[key]).setValue(val); };
    setIf("name", finalTitle);
    setIf("publisher", pub);
    setIf("condition", cond);
    setIf("original", original);
    setIf("cost", cost);
    setIf("suggested", suggested);
    setIf("price", price);
    setIf("status", status);
    setIf("productId", sku);
    if (sheetName !== MAG_SHEET && COL.maxGRef && result.refStr) setIf("maxGRef", result.refStr);

    // v16: เผื่อกรอกเข้ามาเป็น Sold ตั้งแต่แรก
    if (status === "Sold" && COL.soldDate) setIf("soldDate", new Date());

    // เติมสูตร Market Place / Gross Profit / Price Content Lists ให้แถวใหม่
    _setDerivedFormulasForRow(sheet, newRow, COL);

    SpreadsheetApp.flush();

    return { success: true, row: newRow, title: finalTitle, sku: sku,
             suggested: suggested, tier: result.tier, label: result.label,
             isRestock: restockResult.isRestock, sheetName: sheetName };
  });
}

// ============================================================
// [H] processAll (OWARIN WEB INFO — คงเดิม)
// ============================================================
function processAll() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  if (sheet.getName() !== WEB_SHEET) {
    SpreadsheetApp.getUi().alert("⚠️ กรุณาเปิดหน้า OWARIN WEB INFO ก่อนกด processAll");
    return;
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    var raw = colA[i][0] ? colA[i][0].toString() : "";
    if (!raw) continue;
    colA[i][0] = _autoFormat(raw).replace(/: /g, "- ");
  }
  sheet.getRange(3, 1, colA.length, 1).setValues(colA);
  SpreadsheetApp.getUi().alert("✅ Format คอลัมน์ A เสร็จแล้ว!");
}

// ============================================================
// [J] regenerateAllSKUs — header-driven
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
// [K] validateAllSKUs — header-driven + dup flag
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
// [L] checkUnmappedPublishers — header-driven
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
// [M] setupInstallableTrigger
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
// [O] fixAllRestockTags — header-driven
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
// [P] v15 — DERIVED FORMULAS (Market Place / Gross Profit / Price Content Lists)
// ============================================================

// number -> column letter (1->A, 27->AA)
function _colLetter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

function _mktFormula(P) {
  return '=IF(OR(' + P + '="",NOT(ISNUMBER(' + P + '))),"",IF(ROUND((' + P + '+50)*1.2,0)<60,60,ROUND((' + P + '+50)*1.2,0)))';
}
function _gpFormula(P, C) {
  return '=IF(OR(' + P + '="",NOT(ISNUMBER(' + P + ')),' + C + '="",NOT(ISNUMBER(' + C + '))),"",' +
         'IF(' + C + '=0,' + P + '-' + C + ',' +
         'TEXT(' + P + '-' + C + ',"#,##0;(#,##0)")&" ("&TEXT((' + P + '-' + C + ')/' + C + ',"0%")&")"))';
}
function _pclFormula(A, P) {
  return '=IF(OR(' + A + '="",NOT(ISNUMBER(' + P + '))),"",' +
         'TRIM(REGEXREPLACE(' + A + ',"(?i)・RESTOCK-\\d+|\\s*\\(RESTOCK-\\d+\\)",""))&" — "&TEXT(' + P + ',"0"))';
}

// เติมสูตร derived ให้ "แถวเดียว"
function _setDerivedFormulasForRow(sheet, row, COL) {
  if (!COL.price) return;
  var P = _colLetter(COL.price) + row;
  var C = COL.cost ? _colLetter(COL.cost) + row : "";
  var A = COL.name ? _colLetter(COL.name) + row : "";
  if (COL.marketplace)              sheet.getRange(row, COL.marketplace).setFormula(_mktFormula(P));
  if (COL.grossProfit && C)         sheet.getRange(row, COL.grossProfit).setFormula(_gpFormula(P, C));
  if (COL.priceContentLists && A)   sheet.getRange(row, COL.priceContentLists).setFormula(_pclFormula(A, P));
}

// เติมสูตร derived ทั้งหน้า (1 ชีต)
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

  var fM = [], fG = [], fP = [];
  for (var rr = 2; rr <= last; rr++) {
    var P = Pl + rr, C = Cl + rr, A = Al + rr;
    fM.push([_mktFormula(P)]);
    if (Cl) fG.push([_gpFormula(P, C)]);
    fP.push([_pclFormula(A, P)]);
  }
  if (COL.marketplace)        sheet.getRange(2, COL.marketplace, n, 1).setFormulas(fM);
  if (COL.grossProfit && Cl)  sheet.getRange(2, COL.grossProfit, n, 1).setFormulas(fG);
  if (COL.priceContentLists)  sheet.getRange(2, COL.priceContentLists, n, 1).setFormulas(fP);
  return last;
}

// เมนู: เติมสูตร derived ทั้ง GGB + MAGAZINE
function fixDerivedFormulas() {
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
  SpreadsheetApp.getUi().alert("✅ เติมสูตรเรียบร้อย (ไม่มี #REF!)\n\n" + report.join("\n") +
    "\n\nMarket Place / Gross Profit / Price Content Lists\nไม่แตะ Suggested / Price / Cost · เพิ่มเล่มแล้วกดซ้ำได้");
}

// ============================================================
// [N] onOpen — เมนู
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📦 Inventory Tools")
    .addItem("➕ เพิ่มรายการ (Smart Entry Sidebar)", "showSidebar")
    .addSeparator()
    .addItem("▶ Process All (OWARIN WEB INFO)", "processAll")
    .addSeparator()
    .addItem("🛠️ จัดระเบียบเลข RESTOCK (เฉพาะหน้าที่เปิดอยู่)", "fixAllRestockTags")
    .addItem("🔄 สร้าง SKU ใหม่ทั้งหมด (เฉพาะหน้าที่เปิดอยู่)", "regenerateAllSKUs")
    .addItem("✅ ตรวจสอบ Product ID (เฉพาะหน้าที่เปิดอยู่)", "validateAllSKUs")
    .addItem("🔍 ตรวจ Publisher ไม่มี Code", "checkUnmappedPublishers")
    .addSeparator()
    .addItem("💰 คำนวณ Suggested Price (v14.3 — ราคาจาก Sold)", "fillAllSuggestedPrices")
    .addItem("🧮 เติมสูตร Market·Profit·Content (v15)", "fixDerivedFormulas")
    .addSeparator()
    .addItem("🔤 เรียงลำดับ A-Z (natural sort)", "sortInventory")
    .addSeparator()
    .addItem("⚙️ ติดตั้ง Trigger (รัน 1 ครั้ง)", "setupInstallableTrigger")
    .addToUi();
}
