// ============================================================
// OWARIN BACK-OFFICE — WebApp.gs v34 (SP-2, pairs with Code.gs v34)
// v31 (2026-10-03): validated Add payload and read-only same-ID recovery; pairs with Code.gs v32.
// v28: no functional change -- bumped only to stay paired with Code.gs v30 (identical copies listed once; all-caps titles).
// v27: no functional change -- bumped only to stay paired with Code.gs v29 (Meta title without RESTOCK).
// v26: no functional change -- bumped only to stay paired with Code.gs v28 (nightly Refresh Meta feed).
// v25: no functional change -- bumped only to stay paired with Code.gs v25.
// v24: no functional change -- bumped only to stay paired with Code.gs v24.
// Replaces the whole previous WebApp.gs.
//
// SP-2 adds: new fields (listedDate/copyFlags/rarity/marketRef/refNote/priceRange/maxGRef)
// · a sale channel (SHOPEE -> price converted back to the shop-front base, /1.2 - 50)
// · tools.sp2Setup / tools.auditUnderpriced · fillSuggested uses the SP-2 core
// Every write is wrapped in _withLock. Programmatic writes do not fire onEdit, so dates are handled here.
//
// v22 (2026-09-22): no functional change in this file — bumped to stay paired with
// Code.gs v22, which adds the R2 Images menu. See Code_v22.gs for the actual diff.
//
// DEPLOY: paste over the old file -> Save -> refresh /dev and it is live
//         (production: Deploy > Manage deployments > ✏️ > New version)
// ============================================================

function doGet(e) {
  _w1Access_();
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("OWARIN BACK-OFFICE")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1");
}

// ── The single entry point for every action ──
function api(action, payload) {
  try {
    _w1Access_();
    var data = _route(action, payload || {});
    return JSON.stringify({ ok: true, data: data });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String((err && err.message) || err) });
  }
}

function _route(action, p) {
  switch (action) {
    case "orders.create": return _w1Mutate_("create",p);
    case "orders.cancel": return _w1Mutate_("cancel",p);
    case "orders.confirm": return _w1Mutate_("confirm",p);
    case "orders.list": return _w1List_(p.status);
    case "orders.get": return _w1Get_(p.orderId);
    case "requests.get": return _w1Status_(p.requestId);
    case "requests.reconcile": return _w1ReconcileMaintenance_(p.requestId);
    case "ping":                  return { now: new Date().toISOString() };
    case "inventory.bootstrap":   return _invBootstrap();
    case "inventory.list":        return _readInventory(_sheetFromCode(p.source));
    case "inventory.add":         return _apiInvAdd(p);
    case "inventory.addStatus":   return _apiInvAddStatus(p);
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
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

// Find a row by SKU (unique) — safer than a row number, which shifts on sort/delete
function _findRowBySku(sheet, COL, sku) {
  if (!sku) throw new Error("This item has no SKU — fix it in the sheet or run Validate first");
  if (!COL.productId) throw new Error("Column Product ID not found");
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) throw new Error("The sheet has no data");
  var ids = sheet.getRange(3, COL.productId, lastRow - 2, 1).getValues();
  var hits = [];
  for (var i = 0; i < ids.length; i++) {
    var v = ids[i][0] ? ids[i][0].toString().trim() : "";
    if (v === sku) hits.push(i + 3);
  }
  if (!hits.length) throw new Error("SKU " + sku + " not found in the sheet — press REFRESH and try again");
  if (hits.length > 1) throw new Error("SKU " + sku + " appears on " + hits.length + " rows — run Validate Product ID first");
  return hits[0];
}

// ── READ ──
var _INV_KEYS = ["itemUid","name","status","publisher","platform","genre","subGenre","type","condition","original","cost",
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
  if (!COL.name) throw new Error(sheetName + ": column Item name not found");

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

// Convert a number sent by the client: "450" -> 450 · anything else ("", "-") passes through
function _numOrRaw(v) {
  if (v === undefined || v === null) return "";
  var s = String(v).trim();
  if (s === "") return "";
  var n = parseFloat(s);
  return isNaN(n) ? s : n;
}

function _addNumber(v, field) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) return '';
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) &&
      !/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) throw new Error(field + ' must be a number');
  var n = Number(s.replace(/,/g, ''));
  if (!isFinite(n)) throw new Error(field + ' must be a finite number');
  return n;
}

// ── WRITE: ADD ──
// Uses addInventoryRow from Code.gs (lock + SP-2 + Listed Date all included)
// then fills the fields the old sidebar did not have (platform / genre), header-driven
function _apiInvAddData(p) {
  var title = String(p.title || "").trim();
  if (!title) throw new Error("Please enter a product title");
  if (p.source !== 'GGB' && p.source !== 'MAG') throw new Error('Invalid Add source');
  var sheetName = _sheetFromCode(p.source);
  return {
    requestId: String(p.requestId || '').trim(),
    sheetName: sheetName,
    title:    title,
    pub:      String(p.pub || "").trim(),
    cond:     String(p.cond || "").trim(),
    original: _addNumber(p.original, 'Original'),
    cost:     _addNumber(p.cost, 'Cost'),
    price:    _addNumber(p.price, 'Price'),
    status:   _addStatus(p.status),
    // SP-2: handled inside addInventoryRow (platform affects the curve, so it must be set first)
    platform:  String(p.platform  || "").trim(),
    genre:     String(p.genre     || "").trim(),
    subGenre:  String(p.subGenre  || "").trim(),
    type:      String(p.type      || "").trim(),
    copyFlags: String(p.copyFlags || "").trim(),
    rarity:    String(p.rarity    || "").trim(),
    marketRef: _addNumber(p.marketRef, 'Market Ref'),
    refNote:   String(p.refNote   || "").trim()
  };
}

function _apiInvAdd(p) {
  var data = _apiInvAddData(p);
  return _apiInvAddResult(addInventoryRow(data), data.sheetName);
}

function _apiInvAddResult(res, sheetName) {
  if (!res.itemSnapshot || res.itemSnapshot.productId !== res.sku ||
      res.itemSnapshot.name !== res.title || res.sheetName !== sheetName)
    throw new Error('Add DONE result requires recovery; item snapshot missing or inconsistent');
  var item = res.itemSnapshot;
  // P3: match the booking queue on base title — a booking error must not fail the add
  var matches = [];
  try { matches = _apiBookingMatch(item.name).matches; } catch (e) { matches = []; }
  return { result: res, item: item, bookingMatches: matches, historical: res.replayed === true };
}

function _apiInvAddStatus(p) {
  var data = _apiInvAddData(p);
  var id = data.requestId;
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(id)) throw new Error('Valid Add Request ID required');
  var hash = _addRequestHash(data);
  var status = _withLock(function () {
    var journal = _addRequestSheet(SpreadsheetApp.getActiveSpreadsheet());
    var last = journal.getLastRow();
    if (last < 2) return { state: 'NOT_FOUND' };
    var events = journal.getRange(2, 1, last - 1, 17).getValues();
    var prior = null;
    for (var i = 0; i < events.length; i++) if (String(events[i][2]) === id) prior = events[i];
    if (!prior) return { state: 'NOT_FOUND' };
    if (prior[9] !== hash) throw new Error('Add Request ID was already used with different item data');
    if (prior[4] !== 'DONE') return { state: String(prior[4] || 'UNKNOWN'), row: prior[10],
                                   sku: String(prior[11] || ''), error: String(prior[14] || '') };
    var result;
    try { result = JSON.parse(prior[15]); } catch (e) {}
    if (!result || result.success !== true || result.sku !== prior[11] ||
        Number(result.row) !== Number(prior[10]) || result.sheetName !== prior[8])
      throw new Error('Add DONE result requires recovery; Request ID ' + id);
    return { state: 'DONE', result: result };
  });
  if (status.state === 'DONE') {
    var recovered = _apiInvAddResult(status.result, data.sheetName);
    recovered.historical = true;
    return { state: 'DONE', data: recovered };
  }
  return status;
}

// ── WRITE: UPDATE (edit a row) ──
// payload: { source, sku, changes: {name?, status?, publisher?, platform?, genre?,
//            condition?, original?, cost?, price?} }
// The SKU can change when name/publisher/condition are edited; the client matches on prevSku
var _EDITABLE = ["name","status","publisher","platform","genre","subGenre","type","condition","original","cost","price",
                 "copyFlags","rarity","marketRef","refNote"];
var _NUMERIC  = { original: 1, cost: 1, price: 1, marketRef: 1 };

// SP-2: convert the entered price back to the shop-front base for the given channel
// SHOPEE: base = listing price x (1 - fee) - shipping  (the exact inverse of Market Place Price)
//   e.g. listed at 500 -> 500 x 0.7 = 350 - 50 = 300 = shop-front price
function _priceToBase(v, channel) {
  var n = parseFloat(v);
  if (isNaN(n)) return v;
  if (String(channel || "").toUpperCase() === "SHOPEE") {
    return Math.round(n * (1 - SHOPEE_FEE) - SHOPEE_SHIP);
  }
  return n;
}

function _apiInvUpdate(p) { return _w1Edit_(p); }
function _apiInvUpdateCore_(p) {
    var sheetName = _sheetFromCode(p.source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    var sku = String(p.sku || "").trim();
    var row = _findRowBySku(sheet, COL, sku);

    var ch = p.changes || {};
    _w1EditGuard_(sheet,row,ch,p.requestId);
    _sp2ResetWriteErrors();
    var prevStatus = (sheet.getRange(row, COL.status).getValue() || "").toString().trim();

    for (var i = 0; i < _EDITABLE.length; i++) {
      var key = _EDITABLE[i];
      if (ch[key] === undefined) continue;
      if (!COL[key]) continue;
      var v = ch[key];
      if (key === "condition")     v = String(v || "").toUpperCase().trim();
      else if (_NUMERIC[key])      v = _numOrRaw(v);
      else                         v = (v === null) ? "" : String(v);
      _w1Write_("edit "+key,function(){sheet.getRange(row,COL[key]).setValue(v);});
    }

    // Sold Date transitions (a web write does not fire onEdit)
    if (ch.status !== undefined && COL.soldDate) {
      var newStatus = String(ch.status || "").trim();
      var sdCell = sheet.getRange(row, COL.soldDate);
      if (newStatus === "Sold") {
        if (!sdCell.getValue()) sdCell.setValue(new Date());
      } else if (prevStatus === "Sold") {
        sdCell.setValue(""); // sale cancelled -> clear the date
      }
    }

    // The shared Code.gs pipeline — autoformat / restock / SKU / suggested / derived
    _recalcRow(sheet, row, COL, sheetName, {
      name:      ch.name !== undefined,
      publisher: ch.publisher !== undefined,
      condition: ch.condition !== undefined
    });

    SpreadsheetApp.flush();
    if (_SP2_WRITE_ERRORS.length) throw new Error(_sp2WriteErrMsg());
    return { item: _readRow(sheet, row, _srcCode(sheetName)), prevSku: sku };
}


// ── WRITE: MARK SOLD (single sale, not through the cart) ──
// payload: { source, sku, price?, channel? } — price = the actual price for that channel
//   channel "SHOPEE" -> converted back to the shop-front base before saving (SP-2 §6)
function _apiMarkSold(p) {
  return _w1Mutate_("confirm",{requestId:p.requestId,channel:p.channel,items:[{source:p.source,sku:p.sku,itemUid:p.itemUid,price:p.price}],customerShipping:p.customerShipping,shippingSubsidy:p.shippingSubsidy,labelLater:p.labelLater,single:true});
}

// ── Write rows into SALES (shared by markSold and cart checkout) ──
// entries: [{ obj (row object), sku, price }] · full shipping on the first row, 0 on the rest
function _appendSalesRows() { throw new Error("LEGACY_SALE_WRITER_RETIRED use orders.confirm"); }

function _toolsFillSuggested(source) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(source);
    var cnt = _fillSuggestedCore(sheetName);
    SpreadsheetApp.flush();
    return cnt;
  });
}

// SP-2 column setup (= sp2Setup) — v18: per sheet
function _toolsSp2Setup(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return _sp2SetupCore(sn); });
}

// Lay out the sheet — order / hide / dropdowns / notes (= sp2Layout)
function _toolsSp2Layout(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return _sp2LayoutCore(sn); });
}

// Fill Copy Flags from the title (= sp2MigrateFlags)
function _toolsMigrateFlags(dryRun, source) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2MigrateFlagsCore(true, sn);
  return _withLock(function () { return _sp2MigrateFlagsCore(false, sn); });
}

// Fill Rarity automatically (= sp2AutoRarity)
function _toolsAutoRarity(dryRun, source) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2AutoRarityCore(sn, true);
  return _withLock(function () { return _sp2AutoRarityCore(sn, false); });
}

// Find Sold rows that look like auctions (= sp2FlagSuspectAuction)
function _toolsSuspectAuction(dryRun, source, ratio) {
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2SuspectAuctionCore(sn, true, ratio);
  return _withLock(function () { return _sp2SuspectAuctionCore(sn, false, ratio); });
}

// Write SP-2 prices into Price · mode "UP" (default) | "ALL" · dryRun = preview
function _toolsApply(mode, dryRun, source) {
  var m = (String(mode || "UP").toUpperCase() === "ALL") ? "ALL" : "UP";
  var sn = _sheetFromCode(source);
  if (dryRun) return _sp2ApplyCore(true, m, sn);
  return _withLock(function () { return _sp2ApplyCore(false, m, sn); });
}

// Audit Instock rows priced more than 20% below target (= sp2AuditUnderpriced)
function _toolsAudit(source) {
  var sn = _sheetFromCode(source);
  return _withLock(function () { return { rows: _sp2AuditCore(sn), sheet: sn }; });
}

// Fill derived formulas on GGB + MAGAZINE (= fixDerivedFormulas)
function _toolsFixDerived() {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var report = [];
    [GGB_SHEET, MAG_SHEET].forEach(function (name) {
      var sh = ss.getSheetByName(name);
      if (!sh) { report.push({ sheet: name, error: "sheet not found" }); return; }
      var COL = _resolveColumns(sh);
      if (!COL.price || !COL.name) { report.push({ sheet: name, error: "Price / Item name not found" }); return; }
      var last = _fixDerivedFormulasForSheet(sh, COL);
      report.push({ sheet: name, lastRow: last });
    });
    SpreadsheetApp.flush();
    return { report: report };
  });
}

// Validate Product IDs (= validateAllSKUs — batch colouring, faster, same result)
function _toolsValidateSkus(source) {
  return _withLock(function () {
    var sheetName = _sheetFromCode(source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    if (!COL.name || !COL.productId) throw new Error("Columns Item name / Product ID not found");

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
      if (!sku)                        { colors.push(["#FFCCCC"]); report.missing.push("row " + (j + 3) + ": " + title); }
      else if (!prefixRegex.test(sku)) { colors.push(["#FFF3CD"]); report.badFormat.push("row " + (j + 3) + ": " + sku); }
      else if (skuCount[sku] > 1)      { colors.push(["#FFD580"]); report.duplicate.push("row " + (j + 3) + ": " + sku); }
      else                             { colors.push([null]); report.ok++; }
    }

    sheet.getRange(3, COL.productId, n, 1).setBackgrounds(colors);
    SpreadsheetApp.flush();
    return report;
  });
}

// Publishers without a code (= checkUnmappedPublishers)
function _toolsCheckPublishers(source) {
  var sheetName = _sheetFromCode(source);
  var sheet = _getSheetOrThrow(sheetName);
  var COL = _resolveColumns(sheet);
  if (!COL.publisher) throw new Error("Column Publisher not found");

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

// Natural A-Z sort (= sortInventory) — reorders the whole sheet, so the client must reload
function _toolsSort(source) {
  return _withLock(function () {
    _w1TechnicalGate_("");
    var sheetName = _sheetFromCode(source);
    var sheet = _getSheetOrThrow(sheetName);
    var COL = _resolveColumns(sheet);
    if (!COL.name) throw new Error("Column Item name not found");

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

    var audit=_w1MaintenanceWrite_("sort inventory",sheet,range,data,function(){
      _fixDerivedFormulasForSheet(sheet,COL);
      if(sheetName===GGB_SHEET)_sp2RepaintFromRange(sheet,COL);
    },true);
    SpreadsheetApp.flush();
    return { rows: data.length,requestId:audit.requestId };
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

// Find a sheet by its required headers (skipping GGB/MAG/WEB) — header-driven, as everywhere else
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
  if (!sh) throw new Error("SALES sheet not found (it needs the headers Order / Product / Net Profit)");
  return sh;
}

// Order = OWA-YYYYMMDD-NN (NN = running number within the day)
function _nextOrderId() { _w1Access_(); return _w1NextId_(); }

// Note: the productId key uses the same "Product ID" header as the inventory (resolved per sheet)
function _setSalesCells() { throw new Error("LEGACY_SALE_WRITER_RETIRED use orders.confirm"); }

// ── CONFIRM SOLD: write SALES + Status=Sold + Sold Date (locked; current Status checked first) ──
// payload: { items:[{source, sku, price}], shipping?, channel? }
//   channel "SHOPEE" -> every price converted back to the shop-front base · Note = SKU · channel
function _apiSalesConfirm(p) { return _w1Mutate_("confirm",p); }

function _apiSalesList() {
  _w1Access_();
  var unsettled={};var requests=_w1Requests_();Object.keys(requests).forEach(function(k){if(requests[k].state!=="DONE")unsettled[requests[k].snap.orderId]=true;});
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
    if (!order && !product) continue;  // skip empty rows
    var od = _val(data[i], COL, "orderDate");
    var odStr = (od instanceof Date) ? Utilities.formatDate(od, tz, "yyyy-MM-dd") : str(od);
    if(unsettled[str(_val(data[i],COL,"order"))]) continue;
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

// ── BOOKING MATCH: find who has this game reserved in the queue ──
// payload title (full or base) -> { matches:[{name, queue}] }
function _apiBookingMatch(title) {
  var base = _getBaseTitle(String(title || "")).toLowerCase().trim();
  if (!base) return { matches: [] };
  var sh = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!sh) return { matches: [] };
  var COL = _resolveColumns(sh);
  var lastRow = sh.getLastRow();
  if (lastRow < 2 || !COL.gameTitle) return { matches: [] };

  var n = lastRow - 1; // start reading at row 2 (below the header)
  var titles = sh.getRange(2, COL.gameTitle, n, 1).getValues();
  var names  = COL.bookingName ? sh.getRange(2, COL.bookingName, n, 1).getValues() : null;
  var queues = COL.queue ? sh.getRange(2, COL.queue, n, 1).getValues() : null;

  var out = [];
  for (var i = 0; i < n; i++) {
    var gt = titles[i][0] ? _getBaseTitle(titles[i][0].toString()).toLowerCase().trim() : "";
    if (!gt) continue;
    // match: equal, or one side contains the other (long enough to avoid short-word collisions)
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

// Make sure a header exists (returns a 1-based index); appends it when missing (header-driven)
function _ensureHeader(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return c + 1;
  }
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue(headerText);
  delete _colCache[sheet.getSheetId()]; // bust the cache so _resolveColumns sees the new column
  return newCol;
}

function _bookingSheetOrThrow() {
  var s = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!s) throw new Error("BOOKING sheet not found (it needs the headers Booking Name / Game Title)");
  return s;
}
function _contentsSheetOrThrow() {
  var s = _sheetByHeaders(["contentTitle", "contents"]);
  if (!s) throw new Error("CONTENTS sheet not found (it needs the headers Title / Contents)");
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

// add (no row sent) or update (row sent) — only the fields that were sent are written
function _apiBookingSave(p) {
  return _withLock(function () {
    var sheet = _bookingSheetOrThrow();
    var statusCol = _ensureHeader(sheet, "Status");   // create the Status column when missing
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
    if (!row || row < 2) throw new Error("Invalid row");
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
    if (!row || row < 2) throw new Error("Invalid row");
    sheet.deleteRow(row);
    SpreadsheetApp.flush();
    return { deleted: row };
  });
}
