// ============================================================
// OWARIN BACK-OFFICE — WebApp.gs (SP-2, คู่กับ Code.gs v17)
// แทนที่ไฟล์ WebApp.gs เดิมทั้งไฟล์
//
// SP-2 เพิ่ม: field ใหม่ (listedDate/copyFlags/rarity/marketRef/refNote/priceRange/maxGRef)
// · channel ตอนขาย (SHOPEE → แปลงราคากลับฐานหน้าร้าน ÷1.2−50)
// · tools.sp2Setup / tools.auditUnderpriced · fillSuggested ใช้ SP-2 core
// ทุก write ครอบ _withLock · programmatic write ไม่ fire onEdit → จัดการ date เอง
//
// DEPLOY: วางทับไฟล์เดิม → Save → รีเฟรช /dev ใช้ได้ทันที
//         (ปล่อยจริง: Deploy > Manage deployments > ✏️ > New version)
// ============================================================

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("OWARIN BACK-OFFICE")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1");
}

// ── จุดเข้าจุดเดียวของทุก action ──
function api(action, payload) {
  try {
    var data = _route(action, payload || {});
    return JSON.stringify({ ok: true, data: data });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String((err && err.message) || err) });
  }
}

function _route(action, p) {
  switch (action) {
    case "ping":                  return { now: new Date().toISOString() };
    case "inventory.bootstrap":   return _invBootstrap();
    case "inventory.list":        return _readInventory(_sheetFromCode(p.source));
    case "inventory.add":         return _apiInvAdd(p);
    case "inventory.update":      return _apiInvUpdate(p);
    case "inventory.markSold":    return _apiMarkSold(p);
    case "sales.confirm":         return _apiSalesConfirm(p);
    case "sales.list":            return _apiSalesList();
    case "booking.match":         return _apiBookingMatch(p.title);
    case "booking.list":          return _apiBookingList();
    case "booking.save":          return _apiBookingSave(p);
    case "booking.delete":        return _apiBookingDelete(p);
    case "contents.list":         return _apiContentsList();
    case "contents.save":         return _apiContentsSave(p);
    case "contents.delete":       return _apiContentsDelete(p);
    case "settings.get":          return _settingsObj();
    case "tools.sp2Setup":        return _toolsSp2Setup(p.source);
    case "tools.sp2Layout":       return _toolsSp2Layout(p.source);
    case "tools.migrateFlags":    return _toolsMigrateFlags(p.dryRun, p.source);
    case "tools.autoRarity":      return _toolsAutoRarity(p.dryRun, p.source);
    case "tools.suspectAuction":  return _toolsSuspectAuction(p.dryRun, p.source, p.ratio);
    case "tools.applySuggested":  return _toolsApply(p.mode, p.dryRun, p.source);
    case "tools.auditUnderpriced": return _toolsAudit(p.source);
    case "tools.fillSuggested":   return _toolsFillSuggested(p.source);
    case "tools.fixDerived":      return _toolsFixDerived();
    case "tools.validateSkus":    return _toolsValidateSkus(p.source);
    case "tools.checkPublishers": return _toolsCheckPublishers(p.source);
    case "tools.sortInventory":   return _toolsSort(p.source);
    default: throw new Error("unknown action: " + action);
  }
}

// ── helpers ──
function _sheetFromCode(source) {
  if (source === "MAG") return MAG_SHEET;
  return GGB_SHEET; // default GGB
}
function _srcCode(sheetName) { return sheetName === MAG_SHEET ? "MAG" : "GGB"; }

function _getSheetOrThrow(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("ไม่พบชีต: " + sheetName);
  return sheet;
}

// หา "แถว" จาก SKU (unique) — ปลอดภัยกว่าเลขแถวซึ่งเลื่อนได้จาก sort/ลบ
function _findRowBySku(sheet, COL, sku) {
  if (!sku) throw new Error("รายการนี้ไม่มี SKU — จัดการในชีตหรือรัน Validate ก่อน");
  if (!COL.productId) throw new Error("ไม่พบคอลัมน์ 'Product ID'");
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) throw new Error("ชีตไม่มีข้อมูล");
  var ids = sheet.getRange(3, COL.productId, lastRow - 2, 1).getValues();
  var hits = [];
  for (var i = 0; i < ids.length; i++) {
    var v = ids[i][0] ? ids[i][0].toString().trim() : "";
    if (v === sku) hits.push(i + 3);
  }
  if (!hits.length) throw new Error("ไม่พบ SKU " + sku + " ในชีต — กด REFRESH แล้วลองใหม่");
  if (hits.length > 1) throw new Error("SKU " + sku + " ซ้ำ " + hits.length + " แถว — รัน Validate Product ID ก่อน");
  return hits[0];
}

// ── READ ──
var _INV_KEYS = ["name","status","publisher","platform","genre","subGenre","type","condition","original","cost",
                 "suggested","price","marketplace","grossProfit","productId",
                 "priceContentLists","soldDate",
                 "listedDate","copyFlags","rarity","marketRef","refNote","priceRange","maxGRef"];

function _invBootstrap() {
  return {
    GGB: _readInventory(GGB_SHEET),
    MAG: _readInventory(MAG_SHEET),
    settings: _settingsObj(),
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    generatedAt: new Date().toISOString()
  };
}

// ── P3: settings (shipping + bank + order prefix) ──
function _settingsObj() {
  return {
    ship: { base: SHIP_BASE, step: SHIP_STEP, cap: SHIP_CAP },
    bank: { no: BANK_INFO.no, bank: BANK_INFO.bank, account: BANK_INFO.account },
    orderPrefix: ORDER_PREFIX
  };
}

function _readInventory(sheetName) {
  var sheet = _getSheetOrThrow(sheetName);
  var COL = _resolveColumns(sheet);
  if (!COL.name) throw new Error(sheetName + ": ไม่พบคอลัมน์ 'Item name'");

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var name = _val(data[i], COL, "name");
    if (!name || !name.toString().trim()) continue;
    out.push(_rowToObj(data[i], COL, i + 3, _srcCode(sheetName)));
  }
  return out;
}

function _rowToObj(rowVals, COL, rowNo, srcCode) {
  var r = { row: rowNo, source: srcCode };
  for (var k = 0; k < _INV_KEYS.length; k++) {
    var v = _val(rowVals, COL, _INV_KEYS[k]);
    if (v instanceof Date) v = v.toISOString();
    r[_INV_KEYS[k]] = (v === null || v === undefined) ? "" : v;
  }
  r.baseTitle = _getBaseTitle(String(r.name));
  return r;
}

function _readRow(sheet, row, srcCode) {
  var COL = _resolveColumns(sheet);
  var vals = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return _rowToObj(vals, COL, row, srcCode);
}

// แปลงเลขจาก client: "450" → 450 · ค่าอื่น ("", "-") ส่งตามเดิม
function _numOrRaw(v) {
  if (v === undefined || v === null) return "";
  var s = String(v).trim();
  if (s === "") return "";
  var n = parseFloat(s);
  return isNaN(n) ? s : n;
}

// ── WRITE: ADD ──
// ใช้ addInventoryRow ของ Code.gs (มี lock + SP-2 + Listed Date ครบ)
// แล้วเติม field ที่ sidebar เดิมไม่มี (platform / genre) แบบ header-driven
function _apiInvAdd(p) {
  var title = String(p.title || "").trim();
  if (!title) throw new Error("กรุณากรอกชื่อสินค้า");

  var sheetName = _sheetFromCode(p.source);
  var res = addInventoryRow({
    sheetName: sheetName,
    title:    title,
    pub:      String(p.pub || "").trim(),
    cond:     String(p.cond || "").trim(),
    original: _numOrRaw(p.original),
    cost:     _numOrRaw(p.cost),
    price:    _numOrRaw(p.price),
    status:   String(p.status || "Instock").trim() || "Instock",
    // SP-2: รับตรงใน addInventoryRow (platform มีผลต่อ curve ต้องเข้าก่อนคำนวณ)
    platform:  String(p.platform  || "").trim(),
    genre:     String(p.genre     || "").trim(),
    copyFlags: String(p.copyFlags || "").trim(),
    rarity:    String(p.rarity    || "").trim(),
    marketRef: _numOrRaw(p.marketRef),
    refNote:   String(p.refNote   || "").trim()
  });

  var sheet = _getSheetOrThrow(sheetName);
  // P5.1: Type (หมวด/รูปแบบเล่ม) — header-driven เขียนหลังสร้างแถว
  var typeVal = String(p.type || "").trim();
  if (typeVal) {
    var _tCOL = _resolveColumns(sheet);
    if (_tCOL.type) { sheet.getRange(res.row, _tCOL.type).setValue(typeVal); SpreadsheetApp.flush(); }
  }
  var item = _readRow(sheet, res.row, _srcCode(sheetName));
  // P3: จับคู่ booking queue จากชื่อ base — ไม่ให้ error ของ booking ล้ม add
  var matches = [];
  try { matches = _apiBookingMatch(item.name).matches; } catch (e) { matches = []; }
  return { result: res, item: item, bookingMatches: matches };
}

// ── WRITE: UPDATE (แก้ไขแถว) ──
// payload: { source, sku, changes: {name?, status?, publisher?, platform?, genre?,
//            condition?, original?, cost?, price?} }
// SKU อาจเปลี่ยนถ้าแก้ name/publisher/condition — client ใช้ prevSku จับคู่แทนที่ใน cache
var _EDITABLE = ["name","status","publisher","platform","genre","subGenre","type","condition","original","cost","price",
                 "copyFlags","rarity","marketRef","refNote"];
var _NUMERIC  = { original: 1, cost: 1, price: 1, marketRef: 1 };

// SP-2: แปลงราคาที่กรอกกลับเป็น "ฐานหน้าร้าน" ตาม channel
// SHOPEE: base = ราคาตั้งขาย × (1−fee) − ค่าส่ง  (ผกผันสูตร Market Place Price เป๊ะ)
//   เช่น ตั้งขาย 500 → 500×0.7 = 350 − 50 = 300 = ราคาหน้าร้าน
function _priceToBase(v, channel) {
  var n = parseFloat(v);
  if (isNaN(n)) return v;
  if (String(channel || "").toUpperCase() === "SHOPEE") {
    return Math.round(n * (1 - SHOPEE_FEE) - SHOPEE_SHIP);
  }
  return n;
}

function _apiInvUpdate(p) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(p.source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    var sku = String(p.sku || "").trim();
    var row = _findRowBySku(sheet, COL, sku);

    var ch = p.changes || {};
    var prevStatus = (sheet.getRange(row, COL.status).getValue() || "").toString().trim();

    for (var i = 0; i < _EDITABLE.length; i++) {
      var key = _EDITABLE[i];
      if (ch[key] === undefined) continue;
      if (!COL[key]) continue;
      var v = ch[key];
      if (key === "condition")     v = String(v || "").toUpperCase().trim();
      else if (_NUMERIC[key])      v = _numOrRaw(v);
      else                         v = (v === null) ? "" : String(v);
      sheet.getRange(row, COL[key]).setValue(v);
    }

    // Sold Date transitions (web write ไม่ fire onEdit)
    if (ch.status !== undefined && COL.soldDate) {
      var newStatus = String(ch.status || "").trim();
      var sdCell = sheet.getRange(row, COL.soldDate);
      if (newStatus === "Sold") {
        if (!sdCell.getValue()) sdCell.setValue(new Date());
      } else if (prevStatus === "Sold") {
        sdCell.setValue(""); // ยกเลิกการขาย → ล้างวันที่
      }
    }

    // pipeline กลางของ Code.gs v16 — autoformat/restock/SKU/suggested/derived
    _recalcRow(sheet, row, COL, sheetName, {
      name:      ch.name !== undefined,
      publisher: ch.publisher !== undefined,
      condition: ch.condition !== undefined
    });

    SpreadsheetApp.flush();
    return { item: _readRow(sheet, row, _srcCode(sheetName)), prevSku: sku };
  });
}

// ── WRITE: MARK SOLD (ขายเดี่ยว ไม่ผ่าน cart) ──
// payload: { source, sku, price?, channel? } — price = ราคาขายจริงตาม channel
//   channel "SHOPEE" → แปลงกลับฐานหน้าร้านก่อนบันทึก (SP-2 §6 วินัยฐานราคา)
function _apiMarkSold(p) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(p.source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    var row = _findRowBySku(sheet, COL, String(p.sku || "").trim());

    var cur = (sheet.getRange(row, COL.status).getValue() || "").toString().trim();
    if (cur === "Sold") throw new Error("เล่มนี้ถูก Mark Sold ไปแล้ว — กด REFRESH");

    if (p.price !== undefined && p.price !== null && String(p.price).trim() !== "" && COL.price) {
      sheet.getRange(row, COL.price).setValue(_priceToBase(_numOrRaw(p.price), p.channel));
    }
    sheet.getRange(row, COL.status).setValue("Sold");
    if (COL.soldDate) {
      var sd = sheet.getRange(row, COL.soldDate);
      if (!sd.getValue()) sd.setValue(new Date());
    }
    SpreadsheetApp.flush();

    var item = _readRow(sheet, row, _srcCode(sheetName));

    // P5.2: บันทึกลง SALES ด้วย — ไม่งั้น ledger จะไม่ครบ (ขายผ่านตะกร้าอย่างเดียวที่เคยบันทึก)
    // ค่าส่ง: ส่งมาก็ใช้ ไม่ส่ง = 0 (ขายหน้าร้าน/Shopee ที่คิดค่าส่งแยกแล้ว)
    var salesInfo = null;
    try {
      salesInfo = _appendSalesRows([{ obj: item, sku: String(p.sku || "").trim(), price: item.price }],
                                   _numOrRaw(p.shipping) === "" ? 0 : _numOrRaw(p.shipping));
    } catch (e) {
      salesInfo = { error: String((e && e.message) || e) };   // ขายสำเร็จแล้ว — ไม่ throw ทับ
    }
    return { item: item, sales: salesInfo };
  });
}

// ── เขียนแถวลง SALES (ใช้ร่วมกันทั้ง markSold และ cart checkout) ──
// entries: [{ obj (row object), sku, price }] · ค่าส่งลงเต็มที่แถวแรก 0 ที่เหลือ
function _appendSalesRows(entries, shipping) {
  var salesSheet = _getSalesSheet();
  var sCOL = _resolveColumns(salesSheet);
  var orderId = _nextOrderId(salesSheet, sCOL);
  var today = new Date();
  var startRow = Math.max(salesSheet.getLastRow() + 1, 3);

  for (var k = 0; k < entries.length; k++) {
    var e = entries[k];
    var rowNo = startRow + k;
    var price = _numOrRaw(e.price);
    if (price === "") price = (e.obj.price !== "" ? e.obj.price : e.obj.suggested);

    _setSalesCells(salesSheet, sCOL, rowNo, {
      order:       orderId,
      product:     e.obj.baseTitle,
      orderDate:   today,
      cost:        (e.obj.cost !== "" && e.obj.cost !== null) ? e.obj.cost : "",
      price:       price,
      shipingCost: (k === 0 ? shipping : 0),
      productId:   e.sku,          // คอลัมน์ใหม่ตามแผน (ถ้ายังไม่มีจะข้ามเอง)
      note:        e.sku           // เผื่อชีตเก่าที่เก็บ SKU ไว้ใน Note
    });

    if (sCOL.netProfit && sCOL.price && sCOL.cost && sCOL.shipingCost) {
      salesSheet.getRange(rowNo, sCOL.netProfit).setFormula(
        "=" + _colLetter(sCOL.price) + rowNo +
        "-" + _colLetter(sCOL.cost) + rowNo +
        "-" + _colLetter(sCOL.shipingCost) + rowNo
      );
    }
  }
  SpreadsheetApp.flush();
  return { orderId: orderId, count: entries.length, shipping: shipping };
}

// ============================================================
// TOOLS — ฉบับ web-safe (SpreadsheetApp.getUi() ใช้ใน web app ไม่ได้)
// ใช้ helper คำนวณชุดเดียวกับเมนูชีตทุกตัว (_buildSoldIndex/_calcSuggestedPrice/
// _fixDerivedFormulasForSheet/_getPubCode/_natCmp) — ผลลัพธ์เท่ากันเป๊ะ
// ============================================================

// 💰 คำนวณ Suggested Price ทั้งชีต — SP-2 core เดียวกับเมนูชีตเป๊ะ
function _toolsFillSuggested(source) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(source);
    var cnt = _fillSuggestedCore(sheetName);
    SpreadsheetApp.flush();
    return cnt;
  });
}

// 🧱 SP-2 Setup คอลัมน์ (= sp2Setup) — v18: ต่อชีต
function _toolsSp2Setup(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return _sp2SetupCore(sn); });
}

// 🎨 จัดหน้าชีต — เรียง/ซ่อน/dropdown/คำอธิบาย (= sp2Layout)
function _toolsSp2Layout(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return _sp2LayoutCore(sn); });
}

// 🏷️ เติม Copy Flags จากชื่อ (= sp2MigrateFlags)
function _toolsMigrateFlags(dryRun, source) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2MigrateFlagsCore(true, sn);
  return _withLock(function () { return _sp2MigrateFlagsCore(false, sn); });
}

// 💎 เติม Rarity อัตโนมัติ (= sp2AutoRarity)
function _toolsAutoRarity(dryRun, source) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2AutoRarityCore(sn, true);
  return _withLock(function () { return _sp2AutoRarityCore(sn, false); });
}

// 🔍 หา Sold ที่น่าจะเป็น Auction (= sp2FlagSuspectAuction)
function _toolsSuspectAuction(dryRun, source, ratio) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2SuspectAuctionCore(sn, true, ratio);
  return _withLock(function () { return _sp2SuspectAuctionCore(sn, false, ratio); });
}

// ✍️ เอาราคา SP-2 ไปใส่ช่อง Price · mode "UP" (default) | "ALL" · dryRun = พรีวิว
function _toolsApply(mode, dryRun, source) {
  var m = (String(mode || "UP").toUpperCase() === "ALL") ? "ALL" : "UP";
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2ApplyCore(true, m, sn);
  return _withLock(function () { return _sp2ApplyCore(false, m, sn); });
}

// 🚨 Audit Instock ราคาต่ำกว่า target >20% (= sp2AuditUnderpriced)
function _toolsAudit(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return { rows: _sp2AuditCore(sn), sheet: sn }; });
}

// 🧮 เติมสูตร derived ทั้ง GGB + MAGAZINE (= fixDerivedFormulas)
function _toolsFixDerived() {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var report = [];
    [GGB_SHEET, MAG_SHEET].forEach(function (name) {
      var sh = ss.getSheetByName(name);
      if (!sh) { report.push({ sheet: name, error: "ไม่พบชีต" }); return; }
      var COL = _resolveColumns(sh);
      if (!COL.price || !COL.name) { report.push({ sheet: name, error: "ไม่พบ Price/Item name" }); return; }
      var last = _fixDerivedFormulasForSheet(sh, COL);
      report.push({ sheet: name, lastRow: last });
    });
    SpreadsheetApp.flush();
    return { report: report };
  });
}

// ✅ ตรวจสอบ Product ID (= validateAllSKUs — ระบายสีแบบ batch เร็วกว่าเดิม ผลเท่ากัน)
function _toolsValidateSkus(source) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    if (!COL.name || !COL.productId) throw new Error("ไม่พบคอลัมน์ Item name / Product ID");

    var lastRow = sheet.getLastRow();
    if (lastRow < 3) return { ok: 0, missing: [], duplicate: [], badFormat: [] };

    var n = lastRow - 2;
    var colA = sheet.getRange(3, COL.name, n, 1).getValues();
    var colM = sheet.getRange(3, COL.productId, n, 1).getValues();

    var skuCount = {};
    for (var i = 0; i < n; i++) {
      var s = colM[i][0] ? colM[i][0].toString().trim() : "";
      if (s) skuCount[s] = (skuCount[s] || 0) + 1;
    }

    var report = { missing: [], duplicate: [], badFormat: [], ok: 0 };
    var prefixRegex = sheetName === MAG_SHEET ? /^OWA-MAG/ : /^OWA-GGB/;
    var colors = [];

    for (var j = 0; j < n; j++) {
      var title = colA[j][0] ? colA[j][0].toString().trim() : "";
      var sku   = colM[j][0] ? colM[j][0].toString().trim() : "";

      if (!title)                      { colors.push([null]); continue; }
      if (!sku)                        { colors.push(["#FFCCCC"]); report.missing.push("แถว " + (j + 3) + ": " + title); }
      else if (!prefixRegex.test(sku)) { colors.push(["#FFF3CD"]); report.badFormat.push("แถว " + (j + 3) + ": " + sku); }
      else if (skuCount[sku] > 1)      { colors.push(["#FFD580"]); report.duplicate.push("แถว " + (j + 3) + ": " + sku); }
      else                             { colors.push([null]); report.ok++; }
    }

    sheet.getRange(3, COL.productId, n, 1).setBackgrounds(colors);
    SpreadsheetApp.flush();
    return report;
  });
}

// 🔍 Publisher ที่ยังไม่มี Code (= checkUnmappedPublishers)
function _toolsCheckPublishers(source) {
  var sheetName = _sheetFromCode(source);
  var sheet = _getSheetOrThrow(sheetName);
  var COL = _resolveColumns(sheet);
  if (!COL.publisher) throw new Error("ไม่พบคอลัมน์ 'Publisher'");

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return { unmapped: [] };

  var colB = sheet.getRange(3, COL.publisher, lastRow - 2, 1).getValues();
  var unmapped = {};
  for (var i = 0; i < colB.length; i++) {
    var pub = colB[i][0] ? colB[i][0].toString().trim() : "";
    if (!pub) continue;
    if (_getPubCode(pub) === "") unmapped[pub] = (unmapped[pub] || 0) + 1;
  }
  var out = Object.keys(unmapped)
    .sort(function (a, b) { return unmapped[b] - unmapped[a]; })
    .map(function (k) { return { publisher: k, count: unmapped[k] }; });
  return { unmapped: out };
}

// 🔤 เรียง A-Z natural sort (= sortInventory) — reorder ทั้งชีต → client ต้อง reload
function _toolsSort(source) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    if (!COL.name) throw new Error("ไม่พบคอลัมน์ 'Item name'");

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 3) return { rows: 0 };

    var range = sheet.getRange(3, 1, lastRow - 2, lastCol);
    var data = range.getValues();
    var nameIdx = COL.name - 1;

    data.sort(function (a, b) {
      var va = a[nameIdx] ? a[nameIdx].toString() : "";
      var vb = b[nameIdx] ? b[nameIdx].toString() : "";
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return _natCmp(va, vb);
    });

    range.setValues(data);
    _fixDerivedFormulasForSheet(sheet, COL); // setValues ทับสูตร → เติมกลับ
    if (sheetName === GGB_SHEET) _sp2RepaintFromRange(sheet, COL); // สี REVIEW ไม่เลื่อนตาม sort → ทาใหม่
    SpreadsheetApp.flush();
    return { rows: data.length };
  });
}

// ============================================================
// P3 — CART → SALES + BOOKING MATCH
// ============================================================

function _colLetter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function _calcShipping(n) {
  if (n <= 0) return 0;
  return Math.min(SHIP_BASE + SHIP_STEP * (n - 1), SHIP_CAP);
}

// หา sheet จากหัวคอลัมน์ที่ต้องมี (ข้าม GGB/MAG/WEB) — header-driven ตามปรัชญาเดิม
function _sheetByHeaders(required) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === GGB_SHEET || name === MAG_SHEET) continue;
    var COL = _resolveColumns(sheets[i]);
    var ok = true;
    for (var j = 0; j < required.length; j++) { if (!COL[required[j]]) { ok = false; break; } }
    if (ok) return sheets[i];
  }
  return null;
}
function _getSalesSheet() {
  if (SALES_SHEET) {
    var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SALES_SHEET);
    if (s) return s;
  }
  var sh = _sheetByHeaders(["order", "product", "netProfit"]);
  if (!sh) throw new Error("ไม่พบชีต SALES (ต้องมีหัวคอลัมน์ Order / Product / Net Profit)");
  return sh;
}

// Order = OWA-YYYYMMDD-NN (NN = running number ต่อวัน)
function _nextOrderId(sheet, COL) {
  var ymd = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var prefix = ORDER_PREFIX + "-" + ymd + "-";
  var max = 0;
  var lastRow = sheet.getLastRow();
  if (lastRow >= 3 && COL.order) {
    var vals = sheet.getRange(3, COL.order, lastRow - 2, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i][0] ? vals[i][0].toString().trim() : "";
      if (v.indexOf(prefix) === 0) {
        var nn = parseInt(v.slice(prefix.length), 10);
        if (!isNaN(nn) && nn > max) max = nn;
      }
    }
  }
  var next = max + 1;
  return prefix + (next < 10 ? "0" + next : "" + next);
}

// หมายเหตุ: คีย์ productId ใช้ hdr "Product ID" ตัวเดียวกับสต็อก (resolve แยกต่อชีตอยู่แล้ว)
function _setSalesCells(sheet, COL, rowNo, obj) {
  Object.keys(obj).forEach(function (key) {
    if (COL[key]) sheet.getRange(rowNo, COL[key]).setValue(obj[key]);
  });
}

// ── CONFIRM SOLD: เขียน SALES + Status=Sold + Sold Date (ครอบ lock, เช็ค Status ปัจจุบันก่อน) ──
// payload: { items:[{source, sku, price}], shipping?, channel? }
//   channel "SHOPEE" → ราคาทุกเล่มแปลงกลับฐานหน้าร้าน · Note = SKU · channel
function _apiSalesConfirm(p) {
  return _withLock(function () {
    var items = p.items || [];
    if (!items.length) throw new Error("ตะกร้าว่าง");

    var shipping = _numOrRaw(p.shipping);
    if (shipping === "") shipping = _calcShipping(items.length);

    // resolve แถว inventory + เช็คว่าเล่มไหนถูกขายไปแล้ว (reject ทั้งตะกร้าถ้าเจอ)
    var resolved = [], conflicts = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var invSheet = _getSheetOrThrow(_sheetFromCode(it.source));
      var invCOL = _resolveColumns(invSheet);
      var row = _findRowBySku(invSheet, invCOL, String(it.sku || "").trim());
      var obj = _readRow(invSheet, row, it.source);
      var cur = String(obj.status || "").trim();
      if (cur === "Sold") conflicts.push(it.sku + " (" + obj.baseTitle + ")");
      resolved.push({ it: it, sheet: invSheet, COL: invCOL, row: row, obj: obj });
    }
    if (conflicts.length) {
      throw new Error("มีเล่มที่ถูกขายไปแล้วในตะกร้า: " + conflicts.join(", ") + " — เอาออกก่อนแล้วลองใหม่");
    }

    var salesSheet = _getSalesSheet();
    var sCOL = _resolveColumns(salesSheet);
    var orderId = _nextOrderId(salesSheet, sCOL);
    var today = new Date();
    var startRow = Math.max(salesSheet.getLastRow() + 1, 3);

    var channel = String(p.channel || "").toUpperCase();
    for (var k = 0; k < resolved.length; k++) {
      var r = resolved[k];
      var price = _numOrRaw(r.it.price);
      if (price === "") price = (r.obj.price !== "" ? r.obj.price : r.obj.suggested);
      else price = _priceToBase(price, channel);   // SP-2: ฐานหน้าร้านเสมอ
      var cost = (r.obj.cost !== "" && r.obj.cost !== null) ? r.obj.cost : "";
      var rowNo = startRow + k;

      _setSalesCells(salesSheet, sCOL, rowNo, {
        order:       orderId,
        product:     r.obj.baseTitle,     // base title ไม่มี RESTOCK (ตาม §6)
        orderDate:   today,
        cost:        cost,
        price:       price,
        shipingCost: (k === 0 ? shipping : 0),  // ค่าส่งเต็มที่แถวแรก, 0 ที่เหลือ
        productId:   r.it.sku,                  // คอลัมน์ใหม่ตามแผน (ไม่มีคอลัมน์ = ข้ามเอง)
        note:        r.it.sku + (channel && channel !== "SHOP" ? " · " + channel : "")
      });

      // Net Profit = Price − Cost − Shiping Cost (สูตร ให้ตรงกับชีตเดิม)
      if (sCOL.netProfit && sCOL.price && sCOL.cost && sCOL.shipingCost) {
        salesSheet.getRange(rowNo, sCOL.netProfit).setFormula(
          "=" + _colLetter(sCOL.price) + rowNo +
          "-" + _colLetter(sCOL.cost) + rowNo +
          "-" + _colLetter(sCOL.shipingCost) + rowNo
        );
      }

      // mark inventory row → Sold (+ price ตามที่ขายจริง แปลงฐานตาม channel)
      if (r.it.price !== undefined && String(r.it.price).trim() !== "" && r.COL.price) {
        r.sheet.getRange(r.row, r.COL.price).setValue(_priceToBase(_numOrRaw(r.it.price), channel));
      }
      r.sheet.getRange(r.row, r.COL.status).setValue("Sold");
      if (r.COL.soldDate) {
        var sd = r.sheet.getRange(r.row, r.COL.soldDate);
        if (!sd.getValue()) sd.setValue(today);
      }
    }

    SpreadsheetApp.flush();
    var updated = resolved.map(function (r) { return _readRow(r.sheet, r.row, r.it.source); });
    return { orderId: orderId, count: resolved.length, shipping: shipping, items: updated };
  });
}

// ── SALES LIST (P4): อ่านทุกแถวใน SALES → dashboard สรุปรายเดือนฝั่ง client ──
function _apiSalesList() {
  var sheet = _getSalesSheet();
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return { rows: [] };

  var tz = Session.getScriptTimeZone();
  var data = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).getValues();
  function num(v) { var n = parseFloat(v); return isNaN(n) ? "" : n; }
  function str(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }

  var out = [];
  for (var i = 0; i < data.length; i++) {
    var order = str(_val(data[i], COL, "order"));
    var product = str(_val(data[i], COL, "product"));
    if (!order && !product) continue;  // ข้ามแถวว่าง
    var od = _val(data[i], COL, "orderDate");
    var odStr = (od instanceof Date) ? Utilities.formatDate(od, tz, "yyyy-MM-dd") : str(od);
    out.push({
      order:       order,
      product:     product,
      orderDate:   odStr,
      cost:        num(_val(data[i], COL, "cost")),
      price:       num(_val(data[i], COL, "price")),
      shipingCost: num(_val(data[i], COL, "shipingCost")),
      netProfit:   num(_val(data[i], COL, "netProfit")),
      note:        str(_val(data[i], COL, "note")),
      row:         i + 3
    });
  }
  return { rows: out };
}

// ── BOOKING MATCH: หาคนที่จองชื่อเกมนี้ไว้ในคิว ──
// payload title (ชื่อเต็มหรือ base ก็ได้) → { matches:[{name, queue}] }
function _apiBookingMatch(title) {
  var base = _getBaseTitle(String(title || "")).toLowerCase().trim();
  if (!base) return { matches: [] };
  var sh = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!sh) return { matches: [] };
  var COL = _resolveColumns(sh);
  var lastRow = sh.getLastRow();
  if (lastRow < 2 || !COL.gameTitle) return { matches: [] };

  var n = lastRow - 1; // เริ่มอ่านแถว 2 (ใต้ header)
  var titles = sh.getRange(2, COL.gameTitle, n, 1).getValues();
  var names  = COL.bookingName ? sh.getRange(2, COL.bookingName, n, 1).getValues() : null;
  var queues = COL.queue ? sh.getRange(2, COL.queue, n, 1).getValues() : null;

  var out = [];
  for (var i = 0; i < n; i++) {
    var gt = titles[i][0] ? _getBaseTitle(titles[i][0].toString()).toLowerCase().trim() : "";
    if (!gt) continue;
    // match: เท่ากัน หรือ อีกฝั่งครอบอีกฝั่ง (ยาวพอ กันชนคำสั้น)
    var hit = (gt === base) ||
              (base.length >= 4 && gt.indexOf(base) !== -1) ||
              (gt.length >= 4 && base.indexOf(gt) !== -1);
    if (hit) {
      out.push({
        name:  names  ? String(names[i][0]  || "") : "",
        queue: queues ? String(queues[i][0] || "") : ""
      });
    }
  }
  return { matches: out };
}

// ============================================================
// P5 — BOOKING queue CRUD + CONTENTS templates CRUD
// ============================================================

// ทำให้แน่ใจว่ามีหัวคอลัมน์ (คืน index 1-based) — เพิ่มท้ายถ้ายังไม่มี (header-driven)
function _ensureHeader(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return c + 1;
  }
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue(headerText);
  delete _colCache[sheet.getSheetId()]; // bust cache → ให้ _resolveColumns เห็นคอลัมน์ใหม่
  return newCol;
}

function _bookingSheetOrThrow() {
  var s = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!s) throw new Error("ไม่พบชีต BOOKING (ต้องมีหัวคอลัมน์ Booking Name / Game Title)");
  return s;
}
function _contentsSheetOrThrow() {
  var s = _sheetByHeaders(["contentTitle", "contents"]);
  if (!s) throw new Error("ไม่พบชีต CONTENTS (ต้องมีหัวคอลัมน์ Title / Contents)");
  return s;
}

// ── BOOKING ──
function _apiBookingList() {
  var sheet = _bookingSheetOrThrow();
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], hasStatus: !!COL.status };
  var n = lastRow - 1;
  function colv(key) { return COL[key] ? sheet.getRange(2, COL[key], n, 1).getValues() : null; }
  var names = colv("bookingName"), titles = colv("gameTitle"),
      queues = colv("queue"), stats = colv("status");
  var out = [];
  for (var i = 0; i < n; i++) {
    var nm = names ? String(names[i][0] || "").trim() : "";
    var gt = titles ? String(titles[i][0] || "").trim() : "";
    if (!nm && !gt) continue;
    out.push({
      row: i + 2, name: nm, gameTitle: gt,
      queue: queues ? String(queues[i][0] || "").trim() : "",
      status: stats ? String(stats[i][0] || "").trim() : ""
    });
  }
  return { rows: out, hasStatus: !!COL.status };
}

// add (ไม่ส่ง row) หรือ update (ส่ง row) — เขียนเฉพาะ field ที่ส่งมา
function _apiBookingSave(p) {
  return _withLock(function () {
    var sheet = _bookingSheetOrThrow();
    var statusCol = _ensureHeader(sheet, "Status");   // สร้างคอลัมน์ Status ถ้ายังไม่มี
    var COL = _resolveColumns(sheet);
    var row = p.row ? parseInt(p.row, 10) : 0;
    if (!row) row = Math.max(sheet.getLastRow() + 1, 2);

    if (p.name !== undefined && COL.bookingName) sheet.getRange(row, COL.bookingName).setValue(String(p.name).trim());
    if (p.gameTitle !== undefined && COL.gameTitle) sheet.getRange(row, COL.gameTitle).setValue(String(p.gameTitle).trim());
    if (p.queue !== undefined && COL.queue) sheet.getRange(row, COL.queue).setValue(String(p.queue).trim());
    if (p.status !== undefined) sheet.getRange(row, statusCol).setValue(String(p.status).trim());

    SpreadsheetApp.flush();
    return { row: row };
  });
}

function _apiBookingDelete(p) {
  return _withLock(function () {
    var sheet = _bookingSheetOrThrow();
    var row = parseInt(p.row, 10);
    if (!row || row < 2) throw new Error("แถวไม่ถูกต้อง");
    sheet.deleteRow(row);
    SpreadsheetApp.flush();
    return { deleted: row };
  });
}

// ── CONTENTS ──
function _apiContentsList() {
  var sheet = _contentsSheetOrThrow();
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [] };
  var n = lastRow - 1;
  var titles = sheet.getRange(2, COL.contentTitle, n, 1).getValues();
  var c1 = COL.contents ? sheet.getRange(2, COL.contents, n, 1).getValues() : null;
  var c2 = COL.contents2 ? sheet.getRange(2, COL.contents2, n, 1).getValues() : null;
  var out = [];
  for (var i = 0; i < n; i++) {
    var t = String(titles[i][0] || "").trim();
    if (!t) continue;
    out.push({
      row: i + 2, title: t,
      content: c1 ? String(c1[i][0] || "") : "",
      content2: c2 ? String(c2[i][0] || "") : ""
    });
  }
  return { rows: out };
}

function _apiContentsSave(p) {
  return _withLock(function () {
    var sheet = _contentsSheetOrThrow();
    var COL = _resolveColumns(sheet);
    var row = p.row ? parseInt(p.row, 10) : 0;
    if (!row) row = Math.max(sheet.getLastRow() + 1, 2);
    if (p.title !== undefined && COL.contentTitle) sheet.getRange(row, COL.contentTitle).setValue(String(p.title));
    if (p.content !== undefined && COL.contents) sheet.getRange(row, COL.contents).setValue(String(p.content));
    if (p.content2 !== undefined && COL.contents2) sheet.getRange(row, COL.contents2).setValue(String(p.content2));
    SpreadsheetApp.flush();
    return { row: row };
  });
}

function _apiContentsDelete(p) {
  return _withLock(function () {
    var sheet = _contentsSheetOrThrow();
    var row = parseInt(p.row, 10);
    if (!row || row < 2) throw new Error("แถวไม่ถูกต้อง");
    sheet.deleteRow(row);
    SpreadsheetApp.flush();
    return { deleted: row };
  });
}
