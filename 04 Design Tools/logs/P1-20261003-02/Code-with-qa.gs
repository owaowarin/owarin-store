// ============================================================
// OWARIN BACK-OFFICE — Code.gs v27 (SP-2 pricing/SKU engine, pairs with WebApp.gs v25)
// v27 (2026-09-25): P1 PID CHANGES ledger (onEdit/web-app Product ID rewrites are logged old -> new;
//   buildFbCatalogue follows them and archives rows whose PID left the inventory) · F2 blank
//   Description is filled from the caption template · F4 image index read live from R2
//   meta/images.csv (R2 IMAGES sheet = fallback) · 🚀 Refresh Meta feed menu + health check.
//   Plan: 00 Docs/PLAN-META-PIPELINE-HARDENING_2026-09-25.md
// v26 (2026-09-25): exportMetaCsv reports Product IDs not in the inventory separately (F1).
// v25 (2026-09-23): buildFbCatalogue() Meta "title" falls back to the inventory Item name
//   (RESTOCK suffix stripped by _capTitle) when the FB Title cell is blank, so rows appended
//   by the v20b "add missing products" step are never exported without a title.
//   Requires R2Upload.gs NOT to redefine _resolveColumns/_val/_tryWrite/_sp2ResetWriteErrors/
//   _withLock (an old R2Upload.gs did, which silently broke every inventory lookup here --
//   see logs/fbcat_diag_20260923-2341.csv). See backup/Code_v24_superseded_2026-09-23.gs.
// v24 (2026-09-23): buildFbCatalogue() no longer lets a Sheets error value (e.g. #REF! from
//   a manually-edited formula in the Product ID column) flow through as a literal id -- it's
//   now treated as blank and counted/reported separately (see decisions_20260923.csv D6 area
//   and the FB CATALOGUE!A2 array-formula-vs-script-append conflict this guards against).
//   See backup/Code_v23_superseded_2026-09-23.gs for the prior version.
// ============================================================

var GGB_SHEET = "GAME GUIDE BOOKS";
var MAG_SHEET = "MAGAZINE";

// Master switch for automatic price recalculation on cell edit
var AUTO_PRICE_ON_EDIT = true;

// ───────────────── P3 SETTINGS ─────────────────
var SHIP_BASE = 50, SHIP_STEP = 10, SHIP_CAP = 100;

// ───────── v18.3: marketplace (Shopee) selling price ─────────
// Gross-up pricing so a sale never loses money: after the platform fee the
//   payout must still cover Price + shipping.
//   listing price = (Price + shipping) / (1 - fee)   [NOT Price x 1.3, which falls short]
var SHOPEE_FEE  = 0.30;   // platform fee, as a share of the listing price
var SHOPEE_SHIP = 50;     // shipping already baked into the marketplace price
var SHOPEE_MIN  = 60;     // minimum listing price
var ORDER_PREFIX = "OWA";
var SALES_SHEET  = "";

var BANK_INFO = { no: "TEST", bank: "TEST", account: "TEST" };

// ───────────────── SP-2 PRICING PARAMETERS (locked, per design §8) ─────────────────
var SP2 = {
  // ── Condition multipliers: a pricing policy, not an analysis result (94% of old rows are grade A) ──
  COND_MULT: { S: 1.30, A: 1.00, B: 0.85, C: 0.65, D: 0.45 },
  S_MIN_PREMIUM: 50,
  // ── Upward drift: titles that sell repeatedly tolerate a price increase ──
  //   Observed: 23 titles up, 13 down, 40 unchanged -> lean high, not to the middle.
  PCTL: 0.80,
  // ── Price level per publisher/platform (replaces the retired cover-price multiplier) ──
  //   Backtest median error: cover multiplier 29% · publisher x platform 25% · + series 24%
  LEVEL_MIN_N: 5,                        // minimum rows per bucket before a level is trusted
  SERIES_MIN_N: 3,                       // minimum rows per series
  LEVEL_CLAMP: [0.6, 1.8],               // clamp when adjusting across publisher/platform
  // ── Sell-through speed (no data yet; starts working once Listed/Sold Date fill in) ──
  VEL_BANDS: [[7, 1.20], [60, 1.00], [180, 0.95], [999999, 0.90]],
  FAST_DAYS: 7,
  FAST_STREAK_N: 2,
  // ── guard ──
  COST_FLOOR_MULT: 1.5,
  REVIEW_BASE: 400,
  STRONG_COMP_N: 3,
  RANGE_LO: 0.9, RANGE_HI: 1.2, RANGE_HI_RARE: 1.3, RANGE_HI_R2: 1.25,
  // v18.7: the sheet says MAP / COLOUR. POSTER / FC are kept as legacy aliases so old rows still price correctly.
  FLAGS: { MAP: 1.10, POSTER: 1.10, COLOUR: 1.15, FC: 1.15, STAMP: 0.90, NAME: 0.95, TAPE: 0.90 },
  MIN_PRICE: 30, ROUND: 10,
  USE_AUCTION_FLOOR: true,
  RARITY: { R1_PCTL: 0.95, R2_PCTL: 0.85, R1_PEER: 1.8, R2_PEER: 1.4, PEER_MIN_N: 8 },
  AUCTION_SUSPECT: { RATIO: 0.6, MIN_PEERS: 2 }
};

// v19: values where MAGAZINE differs from GGB
var SP2_MAG = {
  REVIEW_BASE: 180,
  MIN_PRICE: 20
};

var _sp2CfgCache = {};
// Return the config for a sheet (GGB = plain SP2 · MAG = SP2 + overrides)
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

// ───────────── v17.2: LAYOUT — column order, hidden columns, header notes ─────────────
// Order: product -> price -> evidence -> time. Columns not listed are pushed to the end; nothing is lost.
var SP2_ORDER = [
  // ── Product ──
  "Item name", "Product ID", "Status", "Condition", "Copy Flags", "Rarity",
  "Publisher", "Platform", "Genre",
  // ── Price ── (Price Range = suggested · Market Place = Shopee price · Gross Profit = profit + %)
  "Original", "Cost", "Price Range", "Price", "Gross Profit",
  "Market Place Price", "Gross Profit MP",
  // ── Evidence ──
  "Market Ref", "Ref Note",
  // ── Time ──
  "Listed Date", "Sold Date",
  // ── Hidden (internal numbers / long text) — pushed to the end, out of sight ──
  "Suggested Price", "Price Content Lists", "Max G Ref", "Shopee Upload"
];
// Hidden columns = internal numbers + long text fields (visible in the web app; can always be unhidden)
var SP2_HIDE = ["Suggested Price", "Price Content Lists", "Max G Ref", "Shopee Upload"];
// v17.4: in-sheet dropdowns — [column name, options]
var SP2_DROPDOWNS = [
  ["Status",    ["Instock", "Sold", "Auction", "Hold", "New Arrival"]],
  ["Condition", ["S", "A", "B", "C", "D"]],
  ["Rarity",    ["R1", "R2", "R3", "NEW"]]
];
// v18.4: columns whose dropdown is built from values already in the sheet (never overwrites a hand-set list)
var SP2_DROPDOWNS_FROM_DATA = ["Genre", "Platform", "Publisher"];
// Notes attached to each header cell (hover in the sheet to read them)
var SP2_NOTES = {
  "Item name":        "Product title. RESTOCK-NN is appended automatically for duplicates. Do not use : or / (converted automatically).",
  "Product ID":       "SKU built from title + publisher + condition + RESTOCK number. Never type this by hand.",
  "Status":           "Instock = in stock · Sold = sold (Sold Date filled automatically) · Auction = clearance (excluded from price comps) · Hold = on hold, not for sale · New Arrival = just received, not yet listed",
  "Condition":        "Grade S/A/B/C/D. A is the price base. Multipliers: S 1.30 / A 1.00 / B 0.85 / C 0.65 / D 0.45",
  "Copy Flags":       "What is different about THIS copy (space separated). MAP +10% (poster/map complete) · COLOUR +15% (full colour) · STAMP -10% (rental shop stamp) · NAME -5% (name written) · TAPE -10% (repaired cover/tape)",
  "Rarity":           "Demand tier, fillable from the Auto Rarity menu (sold prices vs the whole sheet and vs peers from the same publisher). R1 = rare, forces REVIEW · R2 = above average, widens the upper bound · R3 = ordinary · NEW = never sold before",
  "Publisher":        "Publisher. Affects both the SKU and the price (publishers sell at very different multiples).",
  "Platform":         "Game platform. Affects price (PS1 sells for roughly twice PS2 at the same cover price).",
  "Genre":            "Game genre. Categorisation only; no effect on price.",
  "Original":         "Cover price. The base when there is no sales history (with publisher + platform + cover-price band).",
  "Cost":             "Acquisition cost. Acts as a price floor (never suggest below cost x 1.5).",
  "Suggested Price":  "[internal, hidden] The single SP-2 target. The web app uses it as the fallback price for cart / Mark Sold. Read Price Range instead.",
  "Price Range":      "SP-2 suggestion. First number = ready to list, then the acceptable range. 🔥 = this title sells out fast so the price is pushed up. Orange = REVIEW: decide within the suggested range yourself.",
  "Price":            "Actual / listed price. ALWAYS the shop-front base. For a Shopee sale, record it through the web app and pick the channel; the base is converted for you.",
  "Market Ref":       "Reference price from outside the shop (Shopee sold / FB groups / eBay). Fill this for expensive items with no in-shop history.",
  "Ref Note":         "Where Market Ref came from, e.g. shopee sold 6/26, so the number can be audited later.",
  "Listed Date":      "Date first listed, filled automatically for new items. With Sold Date it gives days-to-sell: sold within 7 days means the price was below market, so the next copy is priced higher. Old rows may stay blank.",
  "Sold Date":        "Date sold, filled automatically when Status becomes Sold. Collected from July 2026 onwards (blank on older rows = weighted equally).",
  "Market Place Price": "[formula — do not overwrite] Shopee listing price = (Price + 50 shipping) / 0.7, rounded up to ฿10. Grossed up so that after Shopee takes 30% the payout still equals Price + shipping.",
  "Gross Profit":     "[formula — do not overwrite] Shop-front profit = Price - Cost. The bracket shows profit as a % of cost.",
  "Gross Profit MP":  "[formula — do not overwrite] Shopee profit = (Market Place Price x 0.7 - 50 shipping) - Cost. Normally close to Gross Profit; a large gap means Market Place Price was edited by hand.",
  "Price Content Lists": "[formula — do not overwrite] A title-and-price line ready to copy into a sales post.",
  "Max G Ref":        "[written by the system] Why this price was suggested: which comp tier, the condition-A base, and every adjustment.",
  "Shopee Upload":    "Shopee upload status (filled by hand)"
};
var SP2_REVIEW_BG = "#FFE0B2";           // background of the Suggested cell when REVIEW
var SP2_AUDIT_BG  = "#FFCDD2";           // background of the Price cell when underpriced

var _isEditRunning = false;
var _colCache = {}; // header -> index cache, per execution

// Header map: normalised header text -> logical key
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
  "sub genre":            "subGenre",     // secondary genres, comma separated (multi-game volumes)
  "type":                 "type",         // category / book format (POCKET BOOK, SPECIAL, TOP SECRET ...)
                                          // NOTE: "Series" is reserved for SP-2 (GAME INFO / SERIES MAP sheets)
                                          //       and must not be used as an inventory column
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
  // ── SALES sheet (P3) ── (post-consolidation names, with all aliases kept)
  "order":                "order",
  "order id":             "order",
  "product":              "product",
  "item name sold":       "product",      // avoids clashing with the inventory item name
  "order date":           "orderDate",
  "shiping cost":         "shipingCost",  // original misspelling in the sheet, kept for compatibility
  "shipping cost":        "shipingCost",
  "net profit":           "netProfit",
  "note":                 "note",
  // ── BOOKING sheet (P3) ──
  "booking name":         "bookingName",
  "customer name":        "bookingName",  // post-consolidation name
  "game title":           "gameTitle",
  "queue":                "queue",
  // ── CONTENTS sheet (P5) ──
  "title":                "contentTitle",
  "template name":        "contentTitle", // post-consolidation name (TEMPLATES)
  "contents":             "contents",
  "content":              "contents",
  "contents 2":           "contents2",
  "content alt":          "contents2",
  // ── GAME INFO (per game — not per copy) ──
  "base title":           "baseTitleRef",
  "series":               "seriesName",   // GAME INFO sheet only (not an inventory column)
  "synopsis":             "synopsis"
};

// ───────────── v18.6: SAFE WRITE (works with Google Sheets Tables) ─────────────
// A Google Sheets Table gives columns a type, and Apps Script cannot overwrite some of them:
//   it throws "This operation is not allowed on cells in typed columns."
// Every sheet write goes through _tryWrite: on failure it skips the cell, records the name, and carries on.
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
// Trailing alert text listing writes that were blocked
function _sp2WriteErrMsg() {
  if (!_SP2_WRITE_ERRORS.length) return "";
  var uniq = [], seen = {};
  for (var i = 0; i < _SP2_WRITE_ERRORS.length; i++) {
    var k = _SP2_WRITE_ERRORS[i];
    if (!seen[k]) { seen[k] = 1; uniq.push(k); }
  }
  return "\n\n⛔ " + uniq.length + " write(s) failed:\n  " + uniq.slice(0, 10).join("\n  ") +
         (uniq.length > 10 ? "\n  … and " + (uniq.length - 10) + " more" : "") +
         "\n\n💡 Cause: this sheet is a Google Sheets \"Table\", which locks column types.\n" +
         "   Permanent fix (once): click the table icon next to the sheet name, or right-click inside the table\n" +
         "   → choose \"Convert to range\", then run this menu item again.\n" +
         "   Data, colours and filters are preserved — only the Table label is lost.";
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

// ── Strip the RESTOCK suffix from a title -> base title ──
function _getBaseTitle(title) {
  if (!title) return "";
  var t = title.replace(/・RESTOCK-\d+/i, "");
  t = t.replace(/\s*\(RESTOCK-\d+\)/i, "");
  return t.trim();
}

// ============================================================
// [A] onEdit — v17: + automatic Listed Date + new input columns
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

    // Columns treated as input (editing them triggers a recalculation)
    var inputCols = [COL.name, COL.status, COL.publisher, COL.platform,
                     COL.genre, COL.condition, COL.original, COL.cost,
                     COL.copyFlags, COL.rarity, COL.marketRef];
    var isInput = inputCols.indexOf(editedCol) !== -1;
    if (!isInput) { _isEditRunning = false; return; }

    // v17.4: once a title is typed, fill Copy Flags automatically (blank cells only)
    if (editedCol === COL.name && COL.copyFlags) {
      var cfCell = sheet.getRange(currentRow, COL.copyFlags);
      if (!(cfCell.getValue() || "").toString().trim()) {
        var autoFl = _sp2FlagsFromName((range.getValue() || "").toString());
        if (autoFl) _tryWrite("onEdit Copy Flags", function () { cfCell.setValue(autoFl); });
      }
    }

    // Status -> Sold: fill Sold Date automatically (never overwrite an existing one)
    if (editedCol === COL.status && COL.soldDate) {
      var stVal = (range.getValue() || "").toString().trim();
      if (stVal === "Sold") {
        var sdCell = sheet.getRange(currentRow, COL.soldDate);
        if (!sdCell.getValue()) _tryWrite("onEdit Sold Date", function () { sdCell.setValue(new Date()); });
      }
    }

    // v17: editing a title on a row with no Listed Date that is not Sold stamps the listing date
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
// [A2] _recalcRow: the shared single-row pipeline (v16 structure)
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
    if (COL.productId) {
      var oldSKU = String(sheet.getRange(row, COL.productId).getValue() || "").trim();   // v27 (P1)
      if (_tryWrite("recalc Product ID", function () { sheet.getRange(row, COL.productId).setValue(newSKU); }) &&
          oldSKU && oldSKU !== String(newSKU) && !_looksLikeSheetError(oldSKU)) {
        _tryWrite("log Product ID change", function () { _logPidChange(sheet, row, oldSKU, String(newSKU), finalTitle); });
      }
    }
  }

  if (AUTO_PRICE_ON_EDIT || changed.forcePrice) {
    _recalcSuggestedPrice(sheet, row, COL, sheetName, allData, finalTitle);
  }

  _setDerivedFormulasForRow(sheet, row, COL);

  return finalTitle;
}

// Price a single row — v17: read the whole row -> item object -> SP-2
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
// Per-copy flag multiplier: "POSTER STAMP" -> 1.10 x 0.90
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
// Weighted median over [{v, w}]
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
// ── v19: series / franchise ──────────────────────────────────────────
// Derive the series name from a title: strip sequel numbers, roman numerals, trailing qualifiers and brackets
//   "Final Fantasy Tactics Advance"  → FINAL FANTASY TACTICS
//   "Super Robot Wars Alpha 3"       → SUPER ROBOT WARS ALPHA
// A SERIES MAP sheet takes priority when present (editable, e.g. RESIDENT EVIL -> BIOHAZARD)
var SP2_SERIES_SHEET = "SERIES MAP";
var SP2_GAMEINFO_SHEET = "GAME INFO";     // per-game: Base Title | Series | Synopsis
var _sp2SeriesMapCache = null;
var _sp2GameInfoCache = null;

// GAME INFO -> { BASE TITLE (upper) : SERIES } — an exact match always beats a pattern
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
  } catch (e) { /* no sheet: fall through to SERIES MAP */ }
  _sp2GameInfoCache = map;
  return map;
}

function _sp2AutoSeries(title) {
  var t = _getBaseTitle(String(title || ""));
  t = t.split(/ [-–—×⨯｜|] /)[0];          // cut everything after a separator
  t = t.replace(/\s*\(.*$/, "");            // cut a trailing bracket
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
      out.sort(function (x, y) { return y.match.length - x.match.length; });  // longest first
    }
  } catch (e) { /* no sheet: fall back to auto-derive */ }
  _sp2SeriesMapCache = out;
  return out;
}

// Priority: GAME INFO (exact) -> SERIES MAP (pattern) -> auto-derive
function _sp2Series(title, map) {
  var up = _getBaseTitle(String(title || "")).toUpperCase();
  var gi = _sp2LoadGameInfo();
  if (gi && gi[up]) return gi[up];
  if (map) for (var i = 0; i < map.length; i++) if (up.indexOf(map[i].match) !== -1) return map[i].series;
  return _sp2AutoSeries(title);
}

// Median of a stored price level — used to adjust across publisher / platform
function _sp2LevelRatio(idx, kind, mine, theirs, C) {
  if (!mine || !theirs || mine === theirs) return 1;
  var lv = (kind === "pub") ? idx.pubLevel : idx.platLevel;
  var a = lv[mine], b = lv[theirs];
  if (!a || !b || b <= 0) return 1;
  var r = a / b;
  return Math.max(C.LEVEL_CLAMP[0], Math.min(C.LEVEL_CLAMP[1], r));
}

// Percentile over an array (no interpolation — only prices that actually happened)
function _sp2Pct(arr, p) {
  if (!arr || !arr.length) return null;
  var a = arr.slice().sort(function (x, y) { return x - y; });
  if (a.length === 1) return a[0];
  var i = Math.round(p * (a.length - 1));
  return a[Math.min(i, a.length - 1)];
}

// Build an item object from a row array
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
// Write the result into 3 cells + the REVIEW background
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
// [SP2-INDEX] v19 — one scan of the sheet collecting everything pricing needs:
//   3 comp tiers (title) · series · price level by publisher / platform / publisher x platform · auction floor
//   Every price is stored as a condition-A base (condition and Copy Flags multipliers divided out)
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

    // Auction is a floor, not a comp (auction closes average 29% of a normal sale)
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
    var aEq  = price / (C.COND_MULT[cond] || 1) / fm;      // condition-A base

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

  // Price level (median) — used both as a fallback base and to adjust across publisher / platform
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
// [SP2-CORE] v19 — price from real price levels, not a cover-price multiplier
//   Base-price ladder (every tier is a condition-A base):
//     T1 EXACT      same title + publisher + cover price
//     T2 TITLE-PUB  same title + publisher
//     T3 TITLE      same title (adjusted across publisher / platform by price level)
//     T4 SERIES     same series (n>=3), adjusted across publisher / platform
//     T5 CELL       price level of publisher x platform (n>=5)
//     T6 PUB/PLAT   price level of publisher or platform (n>=5)
//     T7 REF        hand-entered Market Ref
//     T8 MANUAL     leave it to a human
//   T1-T4 use p80 (upward drift) · T5-T6 use the median (the group's middle level)
//   No time weighting — when something sold in the past says nothing about today's price
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

  // ── Tiers T1-T3: this title's own sales history ──
  var kE = baseT + "|" + pub + "|" + _normOrig(item.original);
  var adjust = false;
  if (idx.exact[kE] && idx.exact[kE].length)                                   { comps = idx.exact[kE];            tier = "EXACT"; }
  else if (idx.pub[baseT + "|" + pub] && idx.pub[baseT + "|" + pub].length)    { comps = idx.pub[baseT + "|" + pub]; tier = "TITLE-PUB"; }
  else if (idx.base[baseT] && idx.base[baseT].length)                          { comps = idx.base[baseT];          tier = "TITLE"; adjust = true; }
  // ── Tier T4: series ──
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
      if (adjust) {   // restate as if it were this copy's publisher / platform
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
    if (adjust) notes.push("adjusted to publisher/platform level");
  }

  // ── Tiers T5-T6: group price level ──
  if (titleBase === null) {
    var cell = (pub && plat) ? idx.cell[pub + "|" + plat] : null;
    if (cell)                                       { titleBase = cell.v; tier = "CELL n=" + cell.n; }
    else if (pub && idx.pubN[pub])                  { titleBase = idx.pubN[pub].v;  tier = "PUB n=" + idx.pubN[pub].n; }
    else if (plat && idx.platN[plat])               { titleBase = idx.platN[plat].v; tier = "PLAT n=" + idx.platN[plat].n; }
  }

  // ── T7: Market Ref (used as a floor) ──
  if (!isNaN(mref) && mref > 0) {
    if (titleBase === null || mref > titleBase) { titleBase = mref; tier = (tier ? tier + "+" : "") + "REF"; }
    else notes.push("ref=" + Math.round(mref));
  }

  // ── T8: MANUAL ──
  if (titleBase === null) {
    var hint = idx.allN ? " · whole shop median ฿" + Math.round(idx.allLevel) + " (n=" + idx.allN + ")" : "";
    return { price: "", target: "", min: "", max: "", open: "", tier: "MANUAL",
             review: true, label: "MANUAL",
             rangeStr: "REVIEW · set manually" + (idx.allN ? " · ref ฿" + Math.round(idx.allLevel) : ""),
             refStr: "[REVIEW · MANUAL] no sales history for title, series, publisher or platform" + hint +
                     " — set it by hand, or fill in Market Ref" };
  }

  // ── Assemble the price for this copy ──
  var fl = _sp2FlagsMult(item.copyFlags, C);
  var target = titleBase * cMult * fl.mult;
  if (cond === "S" && target < titleBase + C.S_MIN_PREMIUM) target = titleBase + C.S_MIN_PREMIUM;
  if (fl.tags.length) notes.push("flags:" + fl.tags.join("+"));

  // ── Price floor ──
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
  if (strong && titleBase >= C.REVIEW_BASE) notes.push("✔strong evidence");
  if (weakTier) notes.push("no title/series history");

  // ── Output ──
  var tgt = _sp2Round(target, C);
  var lo  = _sp2Round(target * C.RANGE_LO, C);
  var hiMult = review ? C.RANGE_HI_RARE : (rarity === "R2" ? C.RANGE_HI_R2 : C.RANGE_HI);
  var hi  = _sp2Round(target * hiMult, C);
  if (rarity === "R2" && !review) notes.push("R2 widens upper bound");
  var open = (hot || review) ? hi : tgt;
  if (hot) notes.push("🔥fast×" + fastStreak + "→upper bound opened");

  var rangeStr = review
    ? "REVIEW · set manually · range " + lo + "–" + hi
    : open + (hot ? " 🔥" : "") + " · range " + lo + "–" + hi;
  var refStr = "[" + (review ? "REVIEW · " : "") + tier + "] baseA≈" + Math.round(titleBase) +
               " · " + cond + "×" + cMult +
               (notes.length ? " · " + notes.join(" · ") : "") + " → " + tgt;

  return { price: review ? "" : tgt, target: tgt, min: lo, max: hi, open: open,
           tier: tier, review: review, rangeStr: rangeStr, refStr: refStr,
           label: review ? "REVIEW" : (floorHit ? "COST-FLOOR" : tier) };
}

// ============================================================
// [PRICE] _calcSuggestedPrice — v18: every sheet uses the same SP-2 engine;
//   only the config bound to idx in _sp2BuildIndexes(data, COL, sheetName) differs.
//   (MAGAZINE's publisher-aware v13 formula was retired — see the file header.)
// ============================================================
function _calcSuggestedPrice(item, sheetName, idx) {
  return _sp2Calc(item, idx);
}

// ============================================================
// [SP2-FILL] core routine that fills prices for a whole sheet — used by the menu and the web app
// ============================================================
function _fillSuggestedCore(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  var COL = _resolveColumns(sheet);
  if (!COL.suggested) throw new Error("Column Suggested Price not found");

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

// Menu: calculate Suggested Price (SP-2)
function fillAllSuggestedPrices() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet before calculating.");
    return;
  }
  _sp2ResetWriteErrors();
  var cnt = _fillSuggestedCore(sheetName);
  var C = _sp2Cfg(sheetName);
  var msg = "✅ Suggested Price (SP-2) — " + sheetName + " · " + cnt.rows + " rows\n" +
        "   Base ladder: title → series → publisher×platform · REVIEW ≥ ฿" + C.REVIEW_BASE + "\n\n" +
        "🎯 EXACT (base+pub+orig):   " + cnt.exact + "\n" +
        "📗 TITLE-PUB:               " + cnt.titlePub + "\n" +
        "📘 TITLE (across publishers): " + cnt.title + "\n" +
        "📈 CURVE (cover multiplier):  " + cnt.curve + "\n" +
        "🧭 REF (market ref):        " + cnt.ref + "\n" +
        "🔶 REVIEW (needs a decision): " + cnt.review + "\n" +
        "⬜ MANUAL (no data):          " + cnt.manual + "\n" +
        "⚓ hit COST-FLOOR:            " + cnt.floor + "\n\n" +
        "REVIEW/MANUAL = orange Price Range cell · reasoning in Max G Ref" + _sp2WriteErrMsg();
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-SETUP] add the SP-2 columns (reuse an empty "Column N" slot first, then append)
// ============================================================
function _sp2EnsureHeader2(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return { col: c + 1, added: false };
  }
  // Find a fully empty "Column N" slot -> rename its header instead of appending
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

// v18 helper — return an SP-2 capable sheet (GGB/MAG); omit the name to use the active sheet
function _sp2Sheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName;
  if (!name) {
    name = ss.getActiveSheet().getName();
    if (name !== GGB_SHEET && name !== MAG_SHEET) name = GGB_SHEET;
  }
  if (name !== GGB_SHEET && name !== MAG_SHEET) throw new Error("SP-2 supports only " + GGB_SHEET + " / " + MAG_SHEET);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  return { sheet: sheet, name: name };
}
// Check whether the active sheet can use SP-2 (for menu items)
function _sp2ActiveOrWarn() {
  var name = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
  if (name !== GGB_SHEET && name !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open " + GGB_SHEET + " or " + MAG_SHEET + " first.");
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
      if (res.added) added.push(SP2_COLUMNS[i] + " → column " + _colLetter(res.col));
      else existed.push(SP2_COLUMNS[i]);
    } catch (e) {
      // A Table sheet may refuse script-added columns -> tell the user to add the header by hand
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
  if (r.added.length)   msg += "➕ Added:\n" + r.added.join("\n") + "\n\n";
  if (r.existed.length) msg += "✓ Already there: " + r.existed.join(", ");
  if (!r.added.length && !r.failed.length) msg += "\n(Nothing to add — safe to run again.)";
  if (r.failed && r.failed.length) {
    msg += "\n\n⚠️ Could not add " + r.failed.length + " column(s):\n  " + r.failed.join("\n  ") +
           "\n\nThis sheet is probably a Google Sheets Table — add the headers by hand.\n" +
           "(The name must match exactly; position does not matter, the script finds it by header.)";
  }
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-LAYOUT] v17.2 — reorder columns, hide formula columns, add header notes
//   Uses moveColumns() so formulas and references follow correctly (not a value copy).
//   Columns not in SP2_ORDER are pushed to the end in their original order; nothing is lost.
// ============================================================
function _sp2HeaderPos(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var pos = {};   // normalised header -> 1-based index (first match wins)
  for (var c = 0; c < headers.length; c++) {
    var h = _normHeader(headers[c]);
    if (h && !pos[h]) pos[h] = c + 1;
  }
  return pos;
}

function _sp2LayoutCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  // v18.5: sheets using Google Sheets Tables / typed columns refuse some operations
  //   (e.g. setDataValidation on a column that already has a type -> Exception)
  //   so every step is wrapped in try/catch: skip what fails, carry on to the end.
  var skipped = [];
  function guard(label, fn) {
    try { return fn(); }
    catch (e) {
      var m = String((e && e.message) || e);
      skipped.push(label + (m.indexOf("typed columns") !== -1 ? " (column already has a type)" : ": " + m.slice(0, 60)));
      return null;
    }
  }

  // 1) Ordering: left to right, pulling each target column into place
  var moved = [], missing = [];
  var target = 1;
  for (var i = 0; i < SP2_ORDER.length; i++) {
    var want = _normHeader(SP2_ORDER[i]);
    var pos  = _sp2HeaderPos(sheet);       // re-read each pass (positions shift after a move)
    var cur  = pos[want];
    if (!cur) { missing.push(SP2_ORDER[i]); continue; }
    if (cur !== target) {
      // Always move leftwards (everything left of target is already locked) -> destination = target
      (function (c, tg, nm) {
        guard("move " + nm, function () { sheet.moveColumns(sheet.getRange(1, c, 1, 1), tg); });
      })(cur, target, SP2_ORDER[i]);
      moved.push(SP2_ORDER[i] + " (" + _colLetter(cur) + "→" + _colLetter(target) + ")");
    }
    target++;
  }
  delete _colCache[sheet.getSheetId()];

  // 2) Hide / show
  var pos2 = _sp2HeaderPos(sheet);
  var lastCol = sheet.getLastColumn();
  guard("show all columns (reset)", function () {
    for (var c = 1; c <= lastCol; c++) sheet.showColumns(c);
  });
  var hidden = [];
  for (var h = 0; h < SP2_HIDE.length; h++) {
    var hc = pos2[_normHeader(SP2_HIDE[h])];
    if (!hc) continue;
    if (guard("hide " + SP2_HIDE[h], (function (c3) {
      return function () { sheet.hideColumns(c3); return true; };
    })(hc))) hidden.push(SP2_HIDE[h]);
  }
  // Empty "Column NN" columns -> hide them too (less clutter)
  var heads = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var emptyHidden = 0;
  for (var e = 0; e < heads.length; e++) {
    if (/^column\s*\d+$/i.test(String(heads[e] || "").trim())) {
      if (guard("hide empty column " + _colLetter(e + 1), (function (cc) {
        return function () { sheet.hideColumns(cc); return true; };
      })(e + 1))) emptyHidden++;
    }
  }

  // 3) Header notes (hover to read) + freeze + layout
  var noted = 0;
  for (var key in SP2_NOTES) {
    var nc = pos2[_normHeader(key)];
    if (!nc) continue;
    if (guard("note " + key, (function (c2, k2) {
      return function () { sheet.getRange(1, c2).setNote(SP2_NOTES[k2]); return true; };
    })(nc, key))) noted++;
  }
  guard("freeze header rows", function () { sheet.setFrozenRows(2); });
  var nameCol = pos2[_normHeader("Item name")];
  if (nameCol) guard("freeze title column", function () { sheet.setFrozenColumns(nameCol); });

  // 4) Dropdowns (data validation) — pick from a list instead of typing, so no typos
  //   Columns that Google Sheets has already typed (Table typed column) cannot take one -> skip
  var lastRow2 = Math.max(sheet.getMaxRows(), 3);
  var nRows = lastRow2 - 2;
  var dd = [];
  function putDD(colName, items, help) {
    var dc = pos2[_normHeader(colName)];
    if (!dc || !items.length) return;
    var okDD = guard("dropdown " + colName, function () {
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(items, true)
        .setAllowInvalid(true)    // keep existing values that are not in the list (never breaks old data)
        .setHelpText(help || (colName + ": " + items.slice(0, 12).join(" / ")))
        .build();
      sheet.getRange(3, dc, nRows, 1).setDataValidation(rule);
      return true;
    });
    if (okDD) dd.push(colName + " (" + items.length + ")");
  }
  for (var d = 0; d < SP2_DROPDOWNS.length; d++) putDD(SP2_DROPDOWNS[d][0], SP2_DROPDOWNS[d][1]);

  // v18.4: Genre / Platform / Publisher -> build the list from values already in the sheet
  //   (a hand-set dropdown survives: its values are in the column, so they are picked up too)
  var lastData = sheet.getLastRow();
  if (lastData >= 3) {
    for (var g = 0; g < SP2_DROPDOWNS_FROM_DATA.length; g++) {
      var gname = SP2_DROPDOWNS_FROM_DATA[g];
      var gc = pos2[_normHeader(gname)];
      if (!gc) continue;
      var vals = guard("read values of " + gname, function () {
        return sheet.getRange(3, gc, lastData - 2, 1).getValues();
      });
      if (!vals) continue;
      var seen = {}, list = [];
      for (var v = 0; v < vals.length; v++) {
        var s = (vals[v][0] === null || vals[v][0] === undefined) ? "" : vals[v][0].toString().trim();
        if (s && !seen[s]) { seen[s] = 1; list.push(s); }
      }
      list.sort();
      putDD(gname, list, gname + " — list built from values found in the sheet (" + list.length + " distinct). Type a new value, then run the layout tool again to add it to the list.");
    }
  }

  return { moved: moved, hidden: hidden, emptyHidden: emptyHidden,
           noted: noted, dropdowns: dd, missing: missing, skipped: skipped, sheet: t.name };
}

function sp2Layout() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2LayoutCore(name); });
  var msg = "🎨 Sheet " + r.sheet + " laid out\n\n" +
    "↔️ Column moves: " + r.moved.length + "\n" +
    "🔒 Hidden formula/system columns: " + (r.hidden.length ? r.hidden.join(", ") : "-") + "\n" +
    "🫥 Hidden empty columns (Column NN): " + r.emptyHidden + "\n" +
    "💬 Header notes written: " + r.noted + " (hover a header to read)\n" +
    "🔽 Dropdowns: " + (r.dropdowns.length ? r.dropdowns.join(", ") : "-") + "\n" +
    "📌 Froze 2 header rows + the title column\n" +
    (r.missing.length ? "\n⚠️ Columns not found: " + r.missing.join(", ") + " (run SP-2 Setup first)" : "");
  if (r.skipped && r.skipped.length) {
    msg += "\n\n⏭️ Skipped " + r.skipped.length + " step(s) (the rest completed; no need to re-run):\n  " +
           r.skipped.slice(0, 8).join("\n  ") +
           (r.skipped.length > 8 ? "\n  … and " + (r.skipped.length - 8) + " more" : "") +
           "\n\nℹ️ column already has a type = this sheet uses a Google Sheets Table, which manages its own dropdowns.\n" +
           "   Not a problem — your dropdowns still work and are better than the script defaults.\n" +
           "   To let the script manage them instead: right-click the table › Convert to range, then run again.";
  }
  msg += _sp2WriteErrMsg() + "\n\nTo unhide columns: click the ▸ arrow between headers, or Format › Hide/Unhide";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-APPLY] v17.2 — write the SP-2 price into the Price column
//   Scope: every Instock row, except REVIEW/MANUAL (rare items a human should decide)
//   mode "UP"  = raise prices and fill blanks only (default — never lowers a set price)
//   mode "ALL" = overwrite everything, including lowering towards the target
//   Why UP is the default: a price above SP-2 was usually set by hand because the seller knew
//   the copy was good — knowledge the system does not have. Lowering later is always possible;
//   selling too cheap is not. dryRun = true -> list the changes, write nothing.
// ============================================================
function _sp2ApplyCore(dryRun, mode, sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  if (!COL.price || !COL.suggested) throw new Error("Columns Price / Suggested Price not found");

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
      if (mode !== "ALL") continue;    // UP mode: record it for the report, but do not overwrite
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
      return "  row " + x.row + " " + x.title.slice(0, 38) +
             ": " + (x.from === "" ? "(blank)" : "฿" + x.from) + " → ฿" + x.to;
    }).join("\n") + (arr.length > n ? "\n  … and " + (arr.length - n) + " more" : "");
  }
  var sumUp = 0, sumDown = 0;
  r.up.forEach(function (x) { sumUp += x.to - x.from; });
  r.down.forEach(function (x) { sumDown += x.from - x.to; });
  var isAll = (mode === "ALL");

  var m = (dryRun ? "👀 Preview (nothing written to the sheet)" : "✅ SP-2 prices written into Price") +
    " — " + (r.sheet || "") +
    "\nMode: " + (isAll ? "overwrite everything (incl. markdowns)" : "raise + fill blanks only") + "\n\n" +
    "⬆️ Raised: " + r.up.length + " items (+฿" + sumUp.toLocaleString() + ")\n" +
    "➕ Blanks filled: " + r.fill.length + " items\n" +
    "= Unchanged: " + r.same + " items\n" +
    (isAll
      ? "⬇️ Lowered: " + r.down.length + " items (−฿" + sumDown.toLocaleString() + ")\n"
      : "⏸️ Currently priced above SP-2: " + r.down.length + " items (−฿" + sumDown.toLocaleString() +
        " if lowered) — LEFT ALONE. Review the list below and decide.\n") +
    "🔶 Skipped REVIEW / rare: " + r.skipReview + " items (decide by hand)\n" +
    "Total " + (dryRun ? "to change" : "changed") + ": " + r.changed + " items\n";
  if (r.up.length)   m += "\n⬆️ Biggest increases:\n" + lines(r.up.slice().sort(function (a, b) { return (b.to - b.from) - (a.to - a.from); }), 10) + "\n";
  if (r.down.length) m += "\n" + (isAll ? "⬇️ Lowered:" : "⏸️ Above SP-2 (left alone — check whether the price is high on purpose):") +
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
  if (!pre.changed) { ui.alert("✅ Price already matches SP-2 (nothing to change in this mode)."); return; }
  var ok = ui.alert("Write SP-2 prices into Price — " + name,
    "Mode: " + (mode === "ALL" ? "overwrite everything (incl. markdowns)" : "raise + fill blanks only") + "\n\n" +
    pre.changed + " items will change — raised " + pre.up.length +
    " · blanks filled " + pre.fill.length +
    (mode === "ALL" ? " · lowered " + pre.down.length : "") + "\n" +
    "Skipping " + pre.skipReview + " REVIEW / rare items\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2ApplyCore(false, mode, name); });
  ui.alert(_sp2ApplyMsg(r, false, mode) + _sp2WriteErrMsg());
}
function sp2ApplySuggested()    { _sp2ApplyRun("UP"); }   // default — safe
function sp2ApplySuggestedAll() { _sp2ApplyRun("ALL"); }  // overwrite everything

// ============================================================
// [SP2-MIGRATE] v17.3 — fill Copy Flags automatically from the product title
//   "Incl. N Map(s)" / map / poster -> MAP · full colour -> COLOUR
//   Only blank Copy Flags cells are filled. Titles and SKUs are never touched (the variant
//   text in the title defines comp groups and RESTOCK numbers). Safe to run again.
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
  if (!COL.copyFlags) throw new Error("Column Copy Flags not found — run SP-2 Setup first");

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
    if (curv) { out.skippedHasValue++; continue; }   // already filled by hand — leave it
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
    ui.alert("✅ Nothing to fill (matched in the title but already set: " + pre.skippedHasValue + " items).");
    return;
  }
  var ok = ui.alert("Fill Copy Flags from the title",
    "Will fill " + pre.filled.length + " items (" +
    Object.keys(pre.byFlag).map(function (k) { return k + " " + pre.byFlag[k]; }).join(" · ") + ")\n" +
    "Skipping " + pre.skippedHasValue + " already filled · titles and SKUs untouched\n\n" +
    "⚠️ Afterwards, run Calculate SP-2 prices once.\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2MigrateFlagsCore(false, name); });
  var msg = "✅ Copy Flags filled for " + r.filled.length + " items (" + r.sheet + ")\n\n" +
    r.filled.slice(0, 15).map(function (x) {
      return "row " + x.row + " [" + x.flags + "] " + x.title;
    }).join("\n");
  if (r.filled.length > 15) msg += "\n… and " + (r.filled.length - 15) + " more";
  msg += "\n\n→ Remember to run 💰 Calculate SP-2 prices again" + _sp2WriteErrMsg();
  ui.alert(msg);
}

// ============================================================
// [SP2-RARITY] v18.4 — fill Rarity automatically from real sold prices
//   Two signals, neither of them affected by cost:
//     A) median sold price of the title vs the percentile of the whole sheet
//     B) median sold price vs its peer group = same publisher x same cover-price band (n>=8)
//   Meeting either one promotes the tier, so publisher genuinely matters.
//   A title that has never sold -> "NEW" (no evidence yet, not the same as "not rare").
//   Key = base title + publisher, falling back to base title alone.
// ============================================================
function _sp2Pctl(sortedArr, p) {
  if (!sortedArr.length) return null;
  var i = Math.floor(p * sortedArr.length);
  return sortedArr[Math.min(i, sortedArr.length - 1)];
}

function _sp2AutoRarityCore(sheetName, dryRun) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet, C = _sp2Cfg(t.name);
  var COL = _resolveColumns(sheet);
  if (!COL.rarity) throw new Error("Column Rarity not found — run SP-2 Setup first");

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var out = { counts: {}, changed: [], rows: 0, sheet: t.name, thresholds: {} };
  if (lastRow < 3) return out;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var R = C.RARITY;

  // ── Collect real sold prices ──
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
  if (t1 === null) throw new Error("No sales data on this sheet yet — Rarity cannot be filled automatically");

  var peerMed = {};
  for (var k in peer) if (peer[k].length >= R.PEER_MIN_N) peerMed[k] = _median(peer[k]);

  // ── Decide row by row ──
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
      if (out.changed.length < 400) out.changed.push({ row: j + 3, title: name.slice(0, 44), from: was || "(blank)", to: tier });
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
  var ok = ui.alert("Fill Rarity automatically — " + name,
    "Based on " + pre.thresholds.soldN + " real sales\n" +
    "Thresholds: R1 ≥ ฿" + pre.thresholds.r1 + " or ≥1.8x its publisher peers · " +
    "R2 ≥ ฿" + pre.thresholds.r2 + " or ≥1.4x\n\n" +
    "Result: " + ["R1", "R2", "R3", "NEW"].map(function (k) { return k + " " + (c[k] || 0); }).join(" · ") + "\n" +
    pre.changed.length + " rows will change\n\n" +
    "⚠️ Rarity is a computed field — this run overwrites anything entered by hand.\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  _sp2ResetWriteErrors();
  var r = _withLock(function () { return _sp2AutoRarityCore(name, false); });
  var msg = "✅ Rarity filled (" + r.sheet + ")\n\n" +
    ["R1", "R2", "R3", "NEW"].map(function (k) { return k + ": " + (r.counts[k] || 0); }).join(" · ") + "\n\n" +
    "Examples of what changed:\n" +
    r.changed.slice(0, 12).map(function (x) { return "  row " + x.row + " " + x.from + "→" + x.to + "  " + x.title; }).join("\n") +
    (r.changed.length > 12 ? "\n  … and " + (r.changed.length - 12) + " more rows" : "") +
    "\n\n→ Run 💰 Calculate SP-2 prices again (R1 goes to REVIEW · R2 widens the upper bound)" + _sp2WriteErrMsg();
  ui.alert(msg);
}

// ============================================================
// [SP2-SERIES] v19 — build / update an editable SERIES MAP sheet
//   Series names are derived from titles automatically, but some cases must be stated, e.g.
//     RESIDENT EVIL -> BIOHAZARD · ROCKMAN -> MEGA MAN · split SUPER ROBOT WARS ALPHA from F
//   Columns: Match (text found in the title) · Series (group name to use) · Note
//   A longer Match wins, so a specific phrase can override a broad one.
// ============================================================
function sp2BuildSeriesMap() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var t = _sp2Sheet(null), src = t.sheet;
  var COL = _resolveColumns(src);
  var lastRow = src.getLastRow();
  if (lastRow < 3) { ui.alert("No data on sheet " + t.name); return; }

  // Count real sales per series (auto-derived)
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
    .map(function (k) { return [k, k, cnt[k] + " sold · e.g. " + sample[k].slice(0, 40)]; });

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
  sh.getRange(1, 1).setNote("Match = text found in the title (upper case) · Series = the group name used for pricing\n" +
    "Examples you must add yourself: RESIDENT EVIL → BIOHAZARD · ROCKMAN → MEGA MAN\n" +
    "Longer matches are checked first · after editing, run 💰 Calculate SP-2 prices again");
  sh.autoResizeColumns(1, 3);
  _sp2SeriesMapCache = null;
  SpreadsheetApp.flush();
  ui.alert("🗂️ Sheet " + SP2_SERIES_SHEET + " created / updated\n\n" +
    "Series with >=2 recorded sales: " + rows.length + " (new: " + added + ")\n" +
    "Existing edits were preserved\n\n" +
    "→ Edit the Series column to merge groups, e.g. set BIOHAZARD on the RESIDENT EVIL row\n" +
    "→ Then run 💰 Calculate SP-2 prices again");
}

// ============================================================
// [SP2-AUCTION] v18.7 — find Sold rows that were really auctions but never re-flagged
//   Why: an auction closes far below a normal sale (observed: 29% of the Sold price).
//   Left as Sold they count as comps and drag the whole title's suggested price down.
//   Tested: excluding these 13 rows raised the median of the 12 affected titles by 26%.
// ============================================================
function _sp2SuspectAuctionCore(sheetName, dryRun, ratioOverride) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet, C = _sp2Cfg(t.name);
  var COL = _resolveColumns(sheet);
  if (!COL.status || !COL.price) throw new Error("Columns Status / Price not found");
  var conf = C.AUCTION_SUSPECT;
  var ratio = (ratioOverride > 0) ? ratioOverride : conf.RATIO;

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var out = { found: [], groups: 0, ratio: ratio, sheet: t.name, changed: 0 };
  if (lastRow < 3) return out;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

  // Group by base title + publisher + platform
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

  // Find rows that are abnormally low against the highest price in the same group
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
      if (sd) sd[out.found[f].idx][0] = "";   // an auction is not a normal sale -> clear the sold date
      out.changed++;
    }
    _tryWrite("Status → Auction", function () { stRange.setValues(st); });
    if (sd) _tryWrite("clear Sold Date", function () {
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
    ui.alert("✅ No abnormally cheap Sold rows found (" + name + ")\n" +
             "Compared within " + pre.groups + " groups (same title + publisher + platform)");
    return;
  }
  var lines = pre.found.slice(0, 20).map(function (x) {
    return "  row " + x.row + " · ฿" + x.price + " [" + (x.cond || "-") + "] = " + x.pct +
           "% of the top copy (฿" + x.topA + ")\n     " + x.title.slice(0, 52);
  }).join("\n");
  var ok = ui.alert("Sold rows that look like auctions — " + name,
    "Rule: condition-adjusted price below " + Math.round(pre.ratio * 100) +
    "% of the dearest copy in the same group\n" +
    "Group = identical base title + publisher + platform (" + pre.groups + " groups compared)\n\n" +
    "Found " + pre.found.length + " rows:\n" + lines +
    (pre.found.length > 20 ? "\n  … and " + (pre.found.length - 20) + " more rows" : "") +
    "\n\nStatus will be set to Auction and Sold Date cleared\n" +
    "(Auction rows are excluded from comps but still act as a price floor.)\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var r = _withLock(function () { return _sp2SuspectAuctionCore(name, false); });
  ui.alert("✅ " + r.changed + " rows set to Auction (" + r.sheet + ")\n\n" +
           "→ Run 💰 Calculate SP-2 prices again so prices reflect the cleaner data" + _sp2WriteErrMsg());
}

// ============================================================
// [SP2-AUDIT] Instock rows priced more than 20% below target (P1.5)
// ============================================================
function _sp2AuditCore(sheetName) {
  var t = _sp2Sheet(sheetName), sheet = t.sheet;
  var COL = _resolveColumns(sheet);
  if (!COL.price) throw new Error("Column Price not found");

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
  _tryWrite("colour Price cells (audit)", function () {
    sheet.getRange(3, COL.price, bg.length, 1).setBackgrounds(bg);
  });
  return out;
}

function sp2AuditUnderpriced() {
  var name = _sp2ActiveOrWarn(); if (!name) return;
  _sp2ResetWriteErrors();
  var rows = _withLock(function () { return _sp2AuditCore(name); });
  var msg = "🚨 Under-market audit — " + name + " (Instock · more than 20% below target)\n\n" +
            "Found " + rows.length + " items (Price cell shaded red)\n\n";
  msg += rows.slice(0, 15).map(function (r) {
    return "row " + r.row + ": " + r.title + " [" + r.cond + "] ฿" + r.price + " → target ฿" + r.target;
  }).join("\n");
  if (rows.length > 15) msg += "\n… and " + (rows.length - 15) + " more items";
  if (!rows.length) msg = "✅ No Instock item is more than 20% below target";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [SP2-REVIEW] queue of rare items waiting for a price decision
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
  var msg = "🔶 Review queue " + name + " (Instock awaiting a price) — " + rows.length + " items\n\n";
  msg += rows.slice(0, 15).map(function (r) {
    return "row " + r.row + ": " + r.title + " [" + r.cond + "] " + r.range;
  }).join("\n");
  if (rows.length > 15) msg += "\n… and " + (rows.length - 15) + " more items";
  if (!rows.length) msg = "✅ The review queue is empty";
  SpreadsheetApp.getUi().alert(msg);
}

// Repaint REVIEW shading from Price Range (used after a sort, so colours do not follow old rows)
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
  _tryWrite("REVIEW colour (Price Range)", function () {
    sheet.getRange(3, COL.priceRange, bg.length, 1).setBackgrounds(bg);
  });
}

// ============================================================
// [B] _detectRestock
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
// [C] _buildSKU
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
// [D] _composeSKU + publisher code map
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
// [E] getCatLetter
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
// [F] _autoFormat
// ============================================================
function _autoFormat(text) {
  text = text.replace(/\/\//g, "｜");
  text = text.replace(/\//g, "-");
  text = text.replace(/\s*[:：]\s*/g, "："); // Windows forbids ':' in filenames -> normalize to full-width '：', no surrounding spaces
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
// [SORT] natural sort
// ============================================================
var _SP2_ROMAN = { "viii":"008","vii":"007","vi":"006","iv":"004","iii":"003","ii":"002",
                   "ix":"009","xiv":"014","xiii":"013","xii":"012","xi":"011","xv":"015",
                   "x":"010","v":"005","i":"001" };
var _SP2_RN = "viii|vii|vi|iv|iii|ii|ix|xiv|xiii|xii|xi|xv|x|v|i";
// v18.2: "I-II" (a combined-volume range) must convert to a number too, or it sorts last
//   Convert only when both sides are roman numerals -> "X-Men" is unaffected (Men is not roman)
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

// v18.1: RESTOCK number taken from the title (no suffix = 0, the first copy)
function _restockNum(t) {
  var m = String(t || "").match(/RESTOCK-(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

// v18.1: title comparison for in-sheet sorting — strip RESTOCK first, then order by RESTOCK number
//   Comparing full titles used to put "Fatal Frame (RESTOCK-01)" after "Fatal Frame III",
//   because space (32) sorts before "(" (40), so sequels landed inside the RESTOCK group.
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
// [I] sortInventory — v17: + repaint REVIEW after the sort
// ============================================================
function sortInventory() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) return;

  var COL = _resolveColumns(sheet);
  if (!COL.name) { SpreadsheetApp.getUi().alert("Column Item name not found"); return; }

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
    return _titleCmp(va, vb);   // v18.1: RESTOCK copies always stay next to their parent volume
  });

  _tryWrite("sort setValues", function () { range.setValues(data); });
  _fixDerivedFormulasForSheet(sheet, COL);
  _sp2RepaintFromRange(sheet, COL);
}

// ============================================================
// [ADD] addInventoryRow — append a new row (called from the web app)
//   SP-2 + Listed Date + newer fields (platform/genre/copyFlags/rarity/marketRef/refNote)
//   copyFlags: when omitted it is derived from the title (v17.4)
// ============================================================
function _addRequestSheet(ss) {
  var sh = ss.getSheetByName('ADD REQUESTS');
  if (!sh) throw new Error('ADD REQUESTS journal is missing; Add is disabled');
  var expected = ['Event ID','Timestamp','Request ID','Attempt','State','Actor','Entry Source','App Version','Sheet','Payload Hash','Row','Product ID','Before','After','Error','Result','Recovery Ref'];
  var actual = sh.getRange(1, 1, 1, expected.length).getValues()[0];
  for (var i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) throw new Error('ADD REQUESTS header mismatch at ' + (i + 1));
  }
  return sh;
}
function _addRequestHash(data) {
  var p = {};
  Object.keys(data).sort().forEach(function(k){ if (k !== 'requestId') p[k] = data[k]; });
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(p));
  return bytes.map(function(b){ return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function _addStatus(value) {
  if (value !== undefined && value !== null && typeof value !== 'string')
    throw new Error('Invalid Add status: expected text');
  var status = String(value || '').trim() || 'New Arrival';
  if (['Instock', 'Sold', 'Auction', 'Hold', 'New Arrival'].indexOf(status) < 0)
    throw new Error('Invalid Add status: ' + status);
  return status;
}
function _addRequestEvent(sh, id, attempt, state, source, hash, row, sku, before, after, error, result) {
  var eventRow = sh.getLastRow() + 1;
  var actor = 'Unknown';
  var eventId = id + '-' + attempt + '-' + state;
  sh.getRange(eventRow, 1, 1, 17).setValues([[
    eventId, new Date(), id, attempt, state, actor, 'inventory.add API', 'P1 candidate',
    source, hash, row || '', sku || '', before || '', after || '', error || '', result || '', id
  ]]);
  SpreadsheetApp.flush();
  var check = sh.getRange(eventRow, 1, 1, 17).getValues()[0];
  if (!check[1]) throw new Error('ADD REQUESTS event readback failed at column 2');
  var required = {0:eventId, 2:id, 3:attempt, 4:state, 5:actor,
                  6:'inventory.add API', 7:'P1 candidate', 8:source, 9:hash,
                  10:row || '', 11:sku || '', 12:before || '', 13:after || '',
                  14:error || '', 15:result || '', 16:id};
  Object.keys(required).forEach(function (col) {
    if (String(check[col]) !== String(required[col])) throw new Error('ADD REQUESTS event readback failed at column ' + (Number(col) + 1));
  });
}
function addInventoryRow(data) {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requestId = String(data.requestId || '').trim();
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(requestId)) throw new Error('Valid Add Request ID required');
    if (data.sheetName !== GGB_SHEET && data.sheetName !== MAG_SHEET) throw new Error('Invalid Add source');
    data.status = _addStatus(data.status);
    var sheetName = data.sheetName;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    delete _colCache[sheet.getSheetId()]; // Add must see a header removed since the last request.
    var COL = _resolveColumns(sheet);
    ['name', 'productId', 'status', 'original', 'cost', 'price', 'suggested'].forEach(function (key) {
      if (!COL[key]) throw new Error('Inventory header missing: ' + key);
    });
    ['pub', 'cond', 'platform', 'genre', 'subGenre', 'type', 'copyFlags', 'rarity', 'marketRef', 'refNote'].forEach(function (key) {
      var col = {pub:'publisher', cond:'condition'}[key] || key;
      if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '' && !COL[col])
        throw new Error('Inventory header missing for supplied field: ' + col);
    });
    var journal = _addRequestSheet(ss);
    var hash = _addRequestHash(data);
    var events = journal.getLastRow() > 1 ? journal.getRange(2, 1, journal.getLastRow() - 1, 17).getValues() : [];
    var prior = null, attempt = 1;
    for (var e = 0; e < events.length; e++) if (String(events[e][2]) === requestId) { prior = events[e]; attempt = Math.max(attempt, Number(events[e][3]) + 1); }
    if (prior) {
      if (prior[9] !== hash) throw new Error('Add Request ID was already used with different item data');
      if (prior[4] === 'DONE') {
        var saved;
        try { saved = JSON.parse(prior[15]); } catch (ignored) {}
        if (!saved || saved.success !== true || saved.sku !== prior[11] ||
            Number(saved.row) !== Number(prior[10]) || saved.sheetName !== prior[8] ||
            !saved.itemSnapshot || saved.itemSnapshot.productId !== saved.sku ||
            saved.itemSnapshot.name !== saved.title)
          throw new Error('Add DONE result requires recovery; Request ID ' + requestId);
        _addRequestEvent(journal, requestId, attempt, 'DONE', prior[8], hash, prior[10], prior[11],
                         'replay of DONE', prior[13], '', prior[15]);
        saved.replayed = true;
        return saved;
      }
      _addRequestEvent(journal, requestId, attempt, 'ERROR', prior[8], hash, prior[10], prior[11],
                       'retry of ' + prior[4], '', 'Retry blocked pending recovery', '');
      throw new Error('Add outcome requires recovery; Request ID ' + requestId + ' (no duplicate row created)');
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var newRow  = lastRow + 1;
    if (newRow < 3) newRow = 3;

    var title     = _autoFormat(data.title.trim());
    var pub       = (data.pub || "").trim();
    var cond      = (data.cond || "").trim().toUpperCase();
    var original  = data.original === 0 ? 0 : (data.original || "");
    var cost      = data.cost === 0 ? 0 : (data.cost || "");
    var price     = data.price === 0 ? 0 : (data.price || "");
    var status    = data.status;
    var platform  = (data.platform  || "").toString().trim();
    var genre     = (data.genre     || "").toString().trim();
    var copyFlags = (data.copyFlags || "").toString().trim();
    var rarity    = (data.rarity    || "").toString().trim();
    if (!copyFlags) copyFlags = _sp2FlagsFromName(title);   // v17.4: derived from the title
    var marketRef = data.marketRef === 0 ? 0 : (data.marketRef || "");
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
    if (result.rangeStr && !COL.priceRange) throw new Error('Inventory header missing: priceRange');
    if (result.refStr && !COL.maxGRef) throw new Error('Inventory header missing: maxGRef');

    _addRequestEvent(journal, requestId, attempt, 'PREPARED', sheetName, hash, newRow, sku,
                     'absent', '', '', '');
    try {
    _sp2ResetWriteErrors();
    var setIf = function(key, val) { if (COL[key] && !_tryWrite("add " + key, function () { sheet.getRange(newRow, COL[key]).setValue(val); })) throw new Error('Add write failed: ' + key); };
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
    setIf("type", String(data.type || '').trim());
    setIf("subGenre", String(data.subGenre || '').trim());

    if (COL.priceRange) {
      setIf("priceRange", result.rangeStr || "");
      sheet.getRange(newRow, COL.priceRange).setBackground(result.review ? SP2_REVIEW_BG : null);
    }
    if (COL.maxGRef) setIf("maxGRef", result.refStr || "");

    // Listed Date: stamped for genuinely new listings (a backfilled Sold row has no listing date)
    if (status !== "Sold" && COL.listedDate) setIf("listedDate", new Date());
    if (status === "Sold" && COL.soldDate) setIf("soldDate", new Date());

    var formulas = _setDerivedFormulasForRow(sheet, newRow, COL);
    if (_SP2_WRITE_ERRORS.length) throw new Error('Add formula/write error: ' + _sp2WriteErrMsg());

    SpreadsheetApp.flush();
    var expected = { name: finalTitle, productId: sku, status: status, publisher: pub,
      platform: platform, genre: genre, subGenre: String(data.subGenre || '').trim(),
      type: String(data.type || '').trim(), condition: cond, original: original,
      cost: cost, price: price, suggested: result.price, copyFlags: copyFlags,
      rarity: rarity, marketRef: marketRef, refNote: refNote,
      priceRange: result.rangeStr || '', maxGRef: result.refStr || '' };
    var rowValues = sheet.getRange(newRow, 1, 1, lastCol).getValues()[0];
    var after = {};
    Object.keys(expected).forEach(function (key) {
      if (!COL[key]) return;
      var actual = rowValues[COL[key] - 1];
      if (String(actual === null || actual === undefined ? '' : actual) !== String(expected[key]))
        throw new Error('Add readback mismatch: ' + key);
      after[key] = actual;
    });
    Object.keys(formulas).forEach(function (key) {
      if (sheet.getRange(newRow, COL[key]).getFormula() !== formulas[key])
        throw new Error('Add readback mismatch: formula ' + key);
    });
    if (status !== 'Sold' && COL.listedDate && !rowValues[COL.listedDate - 1]) throw new Error('Add readback mismatch: listedDate');
    if (status === 'Sold' && COL.soldDate && !rowValues[COL.soldDate - 1]) throw new Error('Add readback mismatch: soldDate');
    if (COL.listedDate) after.listedDate = rowValues[COL.listedDate - 1] || '';
    if (COL.soldDate) after.soldDate = rowValues[COL.soldDate - 1] || '';
    var saved = { success: true, row: newRow, title: finalTitle, sku: sku,
             suggested: result.price, target: result.target, open: result.open,
             priceRange: result.rangeStr, refStr: result.refStr,
             tier: result.tier, label: result.label, review: result.review,
             isRestock: restockResult.isRestock, sheetName: sheetName,
             itemSnapshot: _rowToObj(rowValues, COL, newRow, sheetName === MAG_SHEET ? 'MAG' : 'GGB') };
    _addRequestEvent(journal, requestId, attempt, 'DONE', sheetName, hash, newRow, sku,
                     'absent', JSON.stringify(after), '', JSON.stringify(saved));
    return saved;
    } catch (err) {
      try { _addRequestEvent(journal, requestId, attempt, 'ERROR', sheetName, hash, newRow, sku,
                             'absent', '', String((err && err.message) || err), ''); } catch (ignored) {}
      throw new Error('Add outcome requires recovery; Request ID ' + requestId + ': ' + String((err && err.message) || err));
    }
  });
}


// ============================================================
// [J] regenerateAllSKUs
// ============================================================
// ── Product ID (SKU) generation ──────────────────────────────────────────────
// STABLE by default: an ID that already exists is never rewritten, so image
// keys on Cloudflare R2 (library/<Product ID>/1.jpg) stay valid. Only rows with
// an empty Product ID get a new number, continuing from the highest number
// already used in that category letter.
function regenerateAllSKUs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet first.");
    return;
  }
  var COL = _resolveColumns(sheet);
  if (!COL.productId) { SpreadsheetApp.getUi().alert("Column 'Product ID' not found."); return; }

  var ui = SpreadsheetApp.getUi();
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 3) return;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var prefix = sheetName === MAG_SHEET ? "OWA-MAG" : "OWA-GGB";
  var reNum  = new RegExp("^" + prefix + "([A-Z])(\\d{3})");

  // Pass 1 — learn the numbering already in use.
  var titleToNum = {}, catMax = {};
  for (var i = 0; i < data.length; i++) {
    var t0 = _val(data[i], COL, "name"); t0 = t0 ? t0.toString().trim() : "";
    var s0 = _val(data[i], COL, "productId"); s0 = s0 ? s0.toString().trim() : "";
    if (!t0 || !s0) continue;
    var m = reNum.exec(s0);
    if (!m) continue;
    var base0 = _getBaseTitle(t0).toUpperCase();
    if (!titleToNum[base0]) titleToNum[base0] = m[2];
    var n0 = parseInt(m[2], 10);
    if (!catMax[m[1]] || n0 > catMax[m[1]]) catMax[m[1]] = n0;
  }

  // Pass 2 — keep every existing ID, mint one only where it is missing.
  var colOut = [], minted = 0, kept = 0;
  for (var k = 0; k < data.length; k++) {
    var title = _val(data[k], COL, "name");      title = title ? title.toString().trim() : "";
    var pub   = _val(data[k], COL, "publisher"); pub   = pub   ? pub.toString().trim()   : "";
    var cond  = _val(data[k], COL, "condition"); cond  = cond  ? cond.toString().trim()  : "";
    var cur   = _val(data[k], COL, "productId"); cur   = cur   ? cur.toString().trim()   : "";
    if (!title) { colOut.push([cur]); continue; }
    if (cur) { colOut.push([cur]); kept++; continue; }
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
    minted++;
  }

  if (!minted) { ui.alert("Product ID", "Every row already has an ID. Nothing to do.", ui.ButtonSet.OK); return; }
  _tryWrite("fill Product ID", function () { sheet.getRange(3, COL.productId, colOut.length, 1).setValues(colOut); });
  ui.alert("Product ID", "Done for " + sheetName + ".\n\nKept: " + kept + " existing IDs\nCreated: " + minted + " new IDs", ui.ButtonSet.OK);
}

// DESTRUCTIVE: renumbers every row by position. This changes Product IDs that
// are already in use, which breaks the R2 image keys built from them. After
// running this you MUST re-export the sheet, rebuild the image staging folder
// and re-run "rclone sync" so the images follow their new IDs.
function forceRegenerateAllSKUs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet first.");
    return;
  }
  var COL = _resolveColumns(sheet);
  if (!COL.productId) { SpreadsheetApp.getUi().alert("Column 'Product ID' not found."); return; }

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("Rebuild every Product ID in " + sheetName + "?",
    "All Product IDs on this sheet will be renumbered by row order.\n\n" +
    "Any product image already stored on R2 under an old ID will no longer match. " +
    "Re-export the sheet and re-sync the images afterwards.\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 3) return;

  var data = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  var colOut = [], titleToNum = {}, catMax = {};
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
  ui.alert("Product ID", "All Product IDs on " + sheetName + " have been rebuilt.", ui.ButtonSet.OK);
}

// ============================================================
// [K] validateAllSKUs
// ============================================================
function validateAllSKUs() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet first.");
    return;
  }

  var COL = _resolveColumns(sheet);
    if (!COL.name || !COL.productId) { SpreadsheetApp.getUi().alert("Columns Item name / Product ID not found"); return; }

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
      report.missing.push("row " + (j + 3) + ": " + title);
    } else if (!prefixRegex.test(sku)) {
      cell.setBackground("#FFF3CD");
      report.badFormat.push("row " + (j + 3) + ": " + sku);
    } else if (skuCount[sku] > 1) {
      cell.setBackground("#FFD580");
      report.duplicate.push("row " + (j + 3) + ": " + sku);
    } else {
      cell.setBackground(null);
      report.ok++;
    }
  }

  var msg = "📋 Product ID validation — " + sheetName + "\n\n✅ Valid: " + report.ok + " rows\n";
  if (report.missing.length)   msg += "\n❌ Missing SKU (" + report.missing.length + ") — red:\n" + report.missing.slice(0,10).join("\n");
  if (report.duplicate.length) msg += "\n\n🔁 Duplicate SKU (" + report.duplicate.length + ") — orange:\n" + report.duplicate.slice(0,10).join("\n");
  if (report.badFormat.length) msg += "\n\n⚠️ Bad format (" + report.badFormat.length + ") — yellow:\n" + report.badFormat.slice(0,10).join("\n");
  if (!report.missing.length && !report.duplicate.length && !report.badFormat.length) msg += "\n🎉 Every Product ID is valid.";
  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
// [L] checkUnmappedPublishers
// ============================================================
function checkUnmappedPublishers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet first.");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.publisher) { SpreadsheetApp.getUi().alert("Column Publisher not found"); return; }

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
  if (!keys.length) { SpreadsheetApp.getUi().alert("✅ Every publisher has a code."); return; }
  keys.sort(function(a, b) { return unmapped[b] - unmapped[a]; });
  var msg = "⚠️ Publishers without a code (" + keys.length + "):\n\n";
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
  SpreadsheetApp.getUi().alert("✅ Installable trigger created.\nYou do not need to run this again.");
}

// ============================================================
// [O] fixAllRestockTags
// ============================================================
function fixAllRestockTags() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName !== GGB_SHEET && sheetName !== MAG_SHEET) {
    SpreadsheetApp.getUi().alert("Open the GAME GUIDE BOOKS or MAGAZINE sheet first.");
    return;
  }

  var COL = _resolveColumns(sheet);
  if (!COL.name) return;

  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("Renumber RESTOCK tags on " + sheetName + "?",
    "Existing RESTOCK numbers will be cleared and renumbered (01, 02, 03 ...). Continue?",
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
  ui.alert("✅ RESTOCK tags renumbered.\n\n⚠️ Titles changed — run 'Fill missing Product IDs' afterwards.");
}

// ============================================================
// [P] v15 — DERIVED FORMULAS
// ============================================================
function _colLetter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

// v18.3: gross up so the net after fees equals Price + shipping · round up to the next ฿10
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
// v18.4: marketplace profit = (listing price x (1 - fee) - shipping) - Cost
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
  var formulas = {};
  if (!COL.price) return formulas;
  var P = _colLetter(COL.price) + row;
  var C = COL.cost ? _colLetter(COL.cost) + row : "";
  var A = COL.name ? _colLetter(COL.name) + row : "";
  if (COL.marketplace) formulas.marketplace = _mktFormula(P);
  if (COL.grossProfit && C) formulas.grossProfit = _gpFormula(P, C);
  if (COL.grossProfitMP && C && COL.marketplace)
    formulas.grossProfitMP = _gpMpFormula(_colLetter(COL.marketplace) + row, C);
  if (COL.priceContentLists && A) formulas.priceContentLists = _pclFormula(A, P);
  Object.keys(formulas).forEach(function (key) {
    _tryWrite('formula ' + key, function () { sheet.getRange(row, COL[key]).setFormula(formulas[key]); });
  });
  return formulas;
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
  if (COL.marketplace) _tryWrite("formula Market Place Price", function () {
    sheet.getRange(2, COL.marketplace, n, 1).setFormulas(fM); });
  if (COL.grossProfit && Cl) _tryWrite("formula Gross Profit", function () {
    sheet.getRange(2, COL.grossProfit, n, 1).setFormulas(fG); });
  if (COL.grossProfitMP && Cl && Ml) _tryWrite("formula Gross Profit MP", function () {
    sheet.getRange(2, COL.grossProfitMP, n, 1).setFormulas(fGM); });
  if (COL.priceContentLists) _tryWrite("formula Price Content Lists", function () {
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
    if (!COL.price || !COL.name) { report.push("• " + name + ": Price / Item name not found"); return; }
    var last = _fixDerivedFormulasForSheet(sh, COL);
    report.push("• " + name + (last ? ": rows 2–" + last : ": no data"));
  });
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert("✅ Formulas filled (no #REF!)\n\n" + report.join("\n") + _sp2WriteErrMsg() +
    "\n\nMarket Place / Gross Profit / Price Content Lists\nSuggested / Price / Cost are untouched · safe to run again after adding items");
}

// ============================================================
// Add a header to a sheet, reusing an empty placeholder header first (never pushes other columns)
// Returns 0 if it already exists · the column number if just created · -1 if the write failed
function _addHeaderIfMissing(sheet, headerText) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (_normHeader(headers[c]) === _normHeader(headerText)) return 0;   // already there
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

// ============================================================
// ============================================================
// ============================================================
// [P5.4] buildFbCatalogue — merge DESCRIPTION into FB CATALOGUE + the Meta export block
//   1) rename the headers to English
//   2) pull description text from the DESCRIPTION sheet and store it as a value (not a formula),
//      so the source sheet can be deleted; 3) add the Meta field columns so the sheet can be
//      downloaded as a CSV and uploaded straight into Commerce Manager. Safe to run again.
// ============================================================
var FB_SHEET   = "FB CATALOGUE";
var DESC_SHEET = "DESCRIPTION";

// v18.8: values needed to fill the Meta block
var R2_PUBLIC_URL = "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev";  // Cloudflare R2 public base
var R2_IMAGES_SHEET = "R2 IMAGES";
var _r2ImageIndexCache = null;
var _r2ImageIndexSource = "";

// v27 (F4): R2 IMAGES!E:G is an IMPORTDATA copy that Google caches, so a freshly published
//   meta/images.csv stayed invisible until someone bumped ?v=N by hand (2026-09-25 incident).
//   Read the file straight from R2 instead; the sheet copy below stays as the fallback.
//   Same rules as the sheet reader: first "|" token of ext, default jpg.
function _r2ImageIndexLive() {
  if (typeof UrlFetchApp === "undefined") return null;
  try {
    var res = UrlFetchApp.fetch(R2_PUBLIC_URL + "/meta/images.csv?t=" + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var rows = Utilities.parseCsv(res.getContentText());
    if (!rows.length || String(rows[0][0]).trim().toLowerCase() !== "pid") return null;
    var index = {};
    for (var i = 1; i < rows.length; i++) {
      var pid = String(rows[i][0] || "").trim();
      if (!pid || index[pid]) continue;
      index[pid] = String(rows[i][2] || "").split("|")[0].trim().toLowerCase() || "jpg";
    }
    return Object.keys(index).length ? index : null;
  } catch (e) { return null; }
}

// R2 IMAGES!E:G imports meta/images.csv (IMPORTDATA spills from E2): header row 2 is
// "pid,n,ext"; data starts row 3. ext is one value ("jpg") or "|"-joined per position
// ("jpg|png") -- position 1 is the first token. Cached per execution (menu click = fresh run).
function _r2ImageIndex() {
  if (_r2ImageIndexCache) return _r2ImageIndexCache;
  var live = _r2ImageIndexLive();
  if (live) { _r2ImageIndexSource = "R2 meta/images.csv (live)"; _r2ImageIndexCache = live; return live; }
  _r2ImageIndexSource = "R2 IMAGES sheet (fallback: live read failed)";
  var index = {};
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(R2_IMAGES_SHEET);
  if (sh && sh.getLastRow() >= 3) {
    var n = sh.getLastRow() - 2;                       // data starts at row 3
    var vals = sh.getRange(3, 5, n, 3).getValues();     // E:G
    for (var i = 0; i < n; i++) {
      var pid = String(vals[i][0] || "").trim();
      if (!pid || index[pid]) continue;
      var ext1 = String(vals[i][2] || "").split("|")[0].trim().toLowerCase();
      index[pid] = ext1 || "jpg";
    }
  }
  _r2ImageIndexCache = index;
  return index;
}

// Product photo URL (position 1 only). Images live under library/<Product ID>/1.<ext>;
// ext comes from R2 IMAGES!E:G, not a hardcoded ".jpg" (that hardcode 404'd every PNG cover
// -- see decisions_20260913.csv). Returns "" when the Product ID has no R2 index row at all,
// so callers that require image_link (e.g. exportMetaCsv's META_REQUIRED check) skip it
// instead of uploading a URL that 404s.
function _imageUrl(pid) {
  if (!pid) return "";
  var ext = _r2ImageIndex()[pid];
  return ext ? (R2_PUBLIC_URL + "/library/" + pid + "/1." + ext) : "";
}
var FB_LANDING_URL = "https://m.me/owarinstore/";   // landing page Meta requires (the link column)
var FB_PRICE_SOURCE = "shop";   // "shop" = shop-front Price · "marketplace" = Shopee price

// old header -> new English header
var FB_HEADER_RENAMES = [
  ["ชื่อสินค้า (Facebook Title)",      "FB Title"],   // bracketed form (as it appears in the sheet)
  ["ชื่อสินค้า Facebook Title",        "FB Title"],
  ["ของแถม",                          "Freebies"],
  ["เรื่องย่อ",                         "Synopsis"],
  ["Market Place Price",              "Marketplace Price"],
  ["price Meta format",               "Price (Meta)"],
  ["mp price Meta format",            "Marketplace Price (Meta)"],
  ["[helper] raw name",               "Helper Raw Name"],
  ["[helper] base",                   "Helper Base Title"]
];
// Export block — the names must match the Meta spec exactly (lower case). Do not change them.
var META_FIELDS = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];

function _fbFindCol(headers, text) {
  for (var i = 0; i < headers.length; i++) {
    if (_normHeader(headers[i]) === _normHeader(text)) return i + 1;
  }
  return 0;
}

// Sheets error values (from a broken formula anywhere upstream) always start with "#" --
// #REF!, #N/A, #VALUE!, #DIV/0!, #NULL!, #NUM!, #NAME?, #ERROR!. getValues() returns them as
// this literal string, so without this guard a broken cell can silently flow through as if it
// were a real Product ID (see decisions_20260923.csv: FB CATALOGUE!A2 array-formula conflict).
function _looksLikeSheetError(v) {
  return /^#[A-Z]/.test(String(v == null ? "" : v).trim());
}

// ============================================================
// v27 (P1) PID CHANGES ledger. Product ID is the key for R2 photos (library/<PID>/), FB CATALOGUE
//   rows and the Meta retailer_id, but _recalcRow rebuilds it whenever Item name / Publisher /
//   Condition change (onEdit and the web app). Every rewrite is logged old -> new so
//   upload-missing-r2.ps1 can copy the photos and buildFbCatalogue can keep the row.
// ============================================================
var PID_LOG_SHEET = "PID CHANGES";
var FB_ARCHIVE_SHEET = "FB CATALOGUE ARCHIVE";
var FB_ARCHIVE_MAX_SHARE = 0.05;   // safety stop: never auto-archive more than 5% of rows (min 50)
var _lastFbBuildLog = null;        // set by buildFbCatalogue, shown by exportMetaCsv (Refresh Meta feed)

function _logPidChange(sheet, row, oldPid, newPid, itemName) {
  if (!oldPid || !newPid || oldPid === newPid) return;
  var ss = sheet.getParent();
  var sh = ss.getSheetByName(PID_LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PID_LOG_SHEET);
    sh.getRange(1, 1, 1, 6).setValues([["Timestamp", "Sheet", "Row", "Old Product ID", "New Product ID", "Item name"]]);
    sh.setFrozenRows(1);
  }
  sh.getRange(sh.getLastRow() + 1, 1, 1, 6).setValues([[new Date(), sheet.getName(), row, oldPid, newPid, itemName || ""]]);
  try { ss.toast(oldPid + " → " + newPid, "Product ID changed (logged in " + PID_LOG_SHEET + ")", 6); } catch (e) {}
}

// old PID -> latest PID (follows chains A -> B -> C; later ledger rows win; loops stop)
function _pidChangeMap() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PID_LOG_SHEET);
  var step = {}, out = {};
  if (sh && sh.getLastRow() >= 2) {
    var v = sh.getRange(2, 4, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < v.length; i++) {
      var o = String(v[i][0] || "").trim(), nw = String(v[i][1] || "").trim();
      if (o && nw && o !== nw) step[o] = nw;
    }
  }
  Object.keys(step).forEach(function (o) {
    var cur = step[o], seen = {};
    seen[o] = true;
    while (step[cur] && !seen[cur]) { seen[cur] = true; cur = step[cur]; }
    out[o] = cur;
  });
  return out;
}

// Copy whole FB CATALOGUE rows (values) to FB CATALOGUE ARCHIVE, then delete them bottom-up.
function _archiveFbRows(fb, rowNums, reason) {
  if (!rowNums.length) return 0;
  var ss = fb.getParent();
  var nc = fb.getLastColumn();
  var ar = ss.getSheetByName(FB_ARCHIVE_SHEET);
  if (!ar) {
    ar = ss.insertSheet(FB_ARCHIVE_SHEET);
    ar.getRange(1, 1, 1, nc + 2).setValues([["Archived at", "Reason"].concat(fb.getRange(1, 1, 1, nc).getValues()[0])]);
    ar.setFrozenRows(1);
  }
  var now = new Date();
  var asc = rowNums.slice().sort(function (a, b) { return a - b; });
  var rows = asc.map(function (r) { return [now, reason].concat(fb.getRange(r, 1, 1, nc).getValues()[0]); });
  ar.getRange(ar.getLastRow() + 1, 1, rows.length, nc + 2).setValues(rows);      // copy first ...
  asc.reverse().forEach(function (r) { fb.deleteRow(r); });                       // ... then delete
  return rows.length;
}

// v27: one menu click = Build FB CATALOGUE (no prompts) + Build META EXPORT + health check
function refreshMetaFeed() {
  _lastFbBuildLog = null;
  buildFbCatalogue({ silent: true });
  if (!_lastFbBuildLog) return;          // the build stopped and already showed why
  exportMetaCsv();
}

function buildFbCatalogue(opts) {
  var silent = !!(opts && opts.silent === true);
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = ss.getSheetByName(FB_SHEET);
  if (!fb) { ui.alert("Sheet " + FB_SHEET + " not found"); return; }

  var ok = silent ? ui.Button.YES : ui.alert("Prepare FB CATALOGUE for Meta upload",
    "Three things will happen (no sheet is deleted):\n" +
    "1) rename the headers to English\n" +
    "2) copy Description from the DESCRIPTION sheet into this sheet (as values, not formulas)\n" +
    "3) add the Meta spec columns: " + META_FIELDS.join(", ") + "\n\nContinue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  var log = [];

  // ── 1) rename headers ──
  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];
  FB_HEADER_RENAMES.forEach(function (r) {
    if (_fbFindCol(headers, r[1])) return;              // the new header already exists
    var c = _fbFindCol(headers, r[0]);
    if (!c) return;
    if (_tryWrite(FB_SHEET + "!" + r[1], function () { fb.getRange(1, c).setValue(r[1]); })) {
      headers[c - 1] = r[1];
      log.push("✓ header: \"" + r[0] + "\" → \"" + r[1] + "\"");
    }
  });

  // ── 2) Add the required columns ──
  ["Description"].concat(META_FIELDS).forEach(function (h) {
    var r = _addHeaderIfMissing(fb, h);
    if (r > 0) log.push("✓ added column \"" + h + "\"");
  });
  _colCache = {};
  headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];

  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("Headers are set, but there is no data to fill yet."); return; }
  var n = lastRow - 1;

  var invIdx = _metaInvIndex();   // shared inventory index (used by every Facebook tool)

  // ── 2a) v27 (P1): follow PID CHANGES, then archive rows whose Product ID left the inventory.
  //   Renamed product -> its row gets the new PID in place (FB Title / Freebies / Synopsis kept).
  //   Otherwise the row is copied to FB CATALOGUE ARCHIVE and removed (safety stop above 5%).
  var cPid2a = _fbFindCol(headers, "Product ID");
  if (cPid2a) {
    var pidMap = _pidChangeMap();
    var pv = fb.getRange(2, cPid2a, n, 1).getValues();
    var present = {}, renamed = [], orphan = [];
    pv.forEach(function (r) { var k = String(r[0] || "").trim(); if (k) present[k] = true; });
    for (var q = 0; q < n; q++) {
      var op = String(pv[q][0] || "").trim();
      if (!op || _looksLikeSheetError(op) || invIdx[op]) continue;
      var np = pidMap[op];
      if (np && invIdx[np] && !present[np]) { pv[q][0] = np; present[np] = true; renamed.push(op + " → " + np); }
      else orphan.push(q + 2);
    }
    if (renamed.length && _tryWrite(FB_SHEET + "!Product ID (follow PID CHANGES)", function () {
          fb.getRange(2, cPid2a, n, 1).setValues(pv); })) {
      log.push("✓ followed " + renamed.length + " Product ID change(s): " + renamed.slice(0, 5).join(", ") + (renamed.length > 5 ? " …" : ""));
    }
    if (orphan.length) {
      var cap = Math.max(50, Math.round(n * FB_ARCHIVE_MAX_SHARE));
      if (orphan.length > cap) {
        log.push("⛔ " + orphan.length + " rows have a Product ID that is not in the inventory — above the safety limit (" + cap + "), nothing archived. Check GAME GUIDE BOOKS / MAGAZINE first.");
      } else if (_tryWrite(FB_ARCHIVE_SHEET, function () { _archiveFbRows(fb, orphan, "Product ID not in inventory"); })) {
        log.push("✓ moved " + orphan.length + " row(s) whose Product ID left the inventory to " + FB_ARCHIVE_SHEET);
        lastRow = fb.getLastRow();
        n = lastRow - 1;
      }
    }
  }

  // ── 2b) v20b: add a row for every in-scope product that is not on this sheet yet.
  //   Before v20b the sheet only ever held the rows someone had already created, so
  //   magazines never appeared here at all.
  var cPidH = _fbFindCol(headers, "Product ID");
  var cTitleH = _fbFindCol(headers, "FB Title");
  if (cPidH) {
    var existing = {};
    var ex = fb.getRange(2, cPidH, n, 1).getValues();
    for (var e = 0; e < ex.length; e++) {
      var ek = String(ex[e][0] || "").trim();
      if (ek && !_looksLikeSheetError(ek)) existing[ek] = true;
    }
    var add = [];
    Object.keys(invIdx).sort().forEach(function (pid) {
      if (existing[pid]) return;
      if (!_metaInScope(invIdx[pid], false).ok) return;
      add.push(pid);
    });
    if (add.length) {
      var startRow = fb.getLastRow() + 1;
      _tryWrite(FB_SHEET + "!new rows", function () {
        fb.getRange(startRow, cPidH, add.length, 1)
          .setValues(add.map(function (pd) { return [pd]; }));
        if (cTitleH) {
          fb.getRange(startRow, cTitleH, add.length, 1)
            .setValues(add.map(function (pd) { return [invIdx[pd].name]; }));
        }
      });
      log.push("✓ added " + add.length + " new rows (products that were missing from this sheet)");
      SpreadsheetApp.flush();
      lastRow = fb.getLastRow();
      n = lastRow - 1;
    }
  }

  // ── Index: descriptions from the DESCRIPTION sheet (keyed by Product ID) ──
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
      log.push("• read descriptions from " + DESC_SHEET + ": " + Object.keys(descIdx).length + " rows");
    }
  }

  // ── Read the values needed from FB CATALOGUE ──
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

  if (!vPid) { ui.alert("Product ID column not found in " + FB_SHEET); return; }

  // ── 3) Fill Description (blank cells only) ──
  var descFilled = 0;
  if (vDescV) {
    for (var i = 0; i < n; i++) {
      if (String(vDescV[i][0] || "").trim()) continue;
      var pid = (vPid[i][0] || "").toString().trim();
      if (pid && descIdx[pid]) { vDescV[i][0] = descIdx[pid]; descFilled++; }
      else if (pid && invIdx[pid] && _metaInScope(invIdx[pid], false).ok) {   // v27 (F2): same template as Rebuild descriptions
        vDescV[i][0] = _buildCaption(invIdx[pid], { price: false }); descFilled++;
      }
    }
    _tryWrite(FB_SHEET + "!Description", function () {
      fb.getRange(2, vDescC, n, 1).setValues(vDescV);
    });
    log.push("✓ Description filled: " + descFilled + " rows");
  }

  // ── 4) Fill the Meta block ──
  var out = {};
  META_FIELDS.forEach(function (f) { out[f] = []; });
  var noInv = 0, outOfScope = 0, formulaErr = 0;
  for (var i = 0; i < n; i++) {
    var pidRaw = (vPid[i][0] || "").toString().trim();
    var pid = _looksLikeSheetError(pidRaw) ? "" : pidRaw;
    if (pid !== pidRaw) formulaErr++;
    var inv  = invIdx[pid];
    if (pid && !inv) noInv++;

    // Out of scope -> leave every Meta field blank so it cannot leak into the export
    if (inv && !_metaInScope(inv, false).ok) {
      outOfScope++;
      META_FIELDS.forEach(function (f) { out[f].push([""]); });
      continue;
    }
    var desc = vDescV ? String(vDescV[i][0] || "") : "";
    if (!desc && vSyn) desc = String(vSyn[i][0] || "");

    // Price is always taken from the inventory sheet by Product ID (never from a column here),
    //   because columns here can drift after a sort; binding to Product ID is safe.
    var priceStr = "";
    if (inv) {
      var raw = (FB_PRICE_SOURCE === "marketplace") ? inv.mktPrice : inv.price;
      raw = String(raw || "").replace(/[^\d.]/g, "");
      // Meta wants "number + 3-letter currency code" with a dot decimal, e.g. 320.00 THB
      if (raw) priceStr = parseFloat(raw).toFixed(2) + " THB";
    }

    out.id.push([pid]);
    var fbTitle = vTitle ? String(vTitle[i][0] || "").trim() : "";
    out.title.push([fbTitle || (inv ? _capTitle(inv.name) : "")]);   // v25: fall back to the inventory name
    out.description.push([desc]);
    out.availability.push([inv ? (inv.status === "Sold" ? "out of stock" : "in stock") : ""]);
    // Everything is second-hand -> Meta accepts only new / refurbished / used
    out.condition.push([inv && inv.condition ? "used" : ""]);
    out.price.push([priceStr]);
    out.link.push([FB_LANDING_URL]);
    out.image_link.push([_imageUrl(pid)]);
    out.brand.push([inv ? inv.publisher : ""]);
  }

  META_FIELDS.forEach(function (f) {
    var c = _fbFindCol(headers, f);
    if (!c) return;
    _tryWrite(FB_SHEET + "!" + f, function () { fb.getRange(2, c, n, 1).setValues(out[f]); });
  });
  log.push("✓ Meta block filled: " + (n - outOfScope) + " rows (game guide books + magazines)");
  log.push("• image index: " + (_r2ImageIndexSource || "none"));   // v27 (F4)
  if (outOfScope) log.push("• Out of scope: " + outOfScope + " rows");
  if (noInv) log.push("⚠️ " + noInv + " rows have a Product ID that is not in the inventory");
  if (formulaErr) log.push("⚠️ " + formulaErr + " rows have a Sheets error (e.g. #REF!) instead of a Product ID — fix the cell/formula directly in the sheet");

  SpreadsheetApp.flush();
  _lastFbBuildLog = log.concat(_sp2WriteErrMsg() ? [_sp2WriteErrMsg()] : []);
  if (silent) return;
  ui.alert("FB CATALOGUE is ready",
    log.join("\n") +
    "\n\nEvery field Meta requires is filled:" +
    "\n• price → from the " + (FB_PRICE_SOURCE === "marketplace" ? "Shopee price" : "shop-front price") + " (format 000 THB)" +
    "\n• link → " + FB_LANDING_URL +
    "\n• image_link -> " + R2_PUBLIC_URL + "/library/<Product ID>/1.<ext> (ext from " + (_r2ImageIndexSource || "the R2 index") + "; blank if the Product ID has no R2 index row)" +
    "\n\nTo export: File → Download → CSV, then upload it in Commerce Manager" +
    _sp2WriteErrMsg(),
    ui.ButtonSet.OK);
}

// ============================================================
// [P5.5] auditDropdowns — check Platform + Genre against their dropdowns
//   Lists values that are in use but missing from the dropdown, and offers to add them.
// ============================================================
// ============================================================
var DD_COLUMNS = ["platform", "genre"];      // logical keys in HEADER_MAP

// Read a column's dropdown list (from the first cell that has a rule)
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
      // The rule points at a range -> read the values from that range
      if (vals && vals.length && vals[0] && vals[0].getValues) {
        var got = vals[0].getValues().map(function (x) { return String(x[0] || "").trim(); })
                         .filter(function (x) { return x; });
        return { list: got, row: r, range: vals[0], allowInvalid: rule.getAllowInvalid() };
      }
    } catch (e) { /* skip */ }
  }
  return null;
}

function auditDropdowns() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var name = sheet.getName();
  if (name !== GGB_SHEET && name !== MAG_SHEET) {
    ui.alert("Open " + GGB_SHEET + " or " + MAG_SHEET + " first.");
    return;
  }
  var COL = _resolveColumns(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) { ui.alert("No data"); return; }

  var report = [], toAdd = {};
  DD_COLUMNS.forEach(function (key) {
    var c = COL[key];
    if (!c) { report.push("• column " + key + " is not on this sheet"); return; }
    var dd = _ddGetList(sheet, c);
    var used = {}, order = [];
    var vals = sheet.getRange(3, c, lastRow - 2, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0] || "").trim();
      if (v && !used[v]) { used[v] = 1; order.push(v); }
    }
    if (!dd) {
      report.push("• " + key.toUpperCase() + ": no dropdown (free text, " + order.length + " distinct values)");
      return;
    }
    var inList = {};
    dd.list.forEach(function (x) { inList[String(x).trim()] = 1; });
    var missing = order.filter(function (v) { return !inList[v]; });
    report.push("• " + key.toUpperCase() + ": dropdown has " + dd.list.length +
                " values · " + order.length + " in use · " + missing.length + " not in the dropdown");
    missing.slice(0, 12).forEach(function (m) { report.push("      – " + m); });
    if (missing.length) toAdd[key] = { col: c, dd: dd, missing: missing };
  });

  var keys = Object.keys(toAdd);
  if (!keys.length) {
    ui.alert("Dropdown check", report.join("\n") + "\n\n✅ Every value in use is already in the dropdown.", ui.ButtonSet.OK);
    return;
  }
  var ok = ui.alert("Dropdown check",
    report.join("\n") + "\n\nAdd the missing values to the dropdown now?", ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  keys.forEach(function (key) {
    var t = toAdd[key];
    var newList = t.dd.list.map(function (x) { return String(x).trim(); }).concat(t.missing);
    // If the dropdown reads from a range -> append the new values to that range
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
  ui.alert("Values added to the dropdown\n\n" +
    keys.map(function (k) { return "• " + k + ": +" + toAdd[k].missing.length + " values"; }).join("\n") +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}


var META_EXPORT_SHEET = "META EXPORT";
var META_REQUIRED = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"];
// Optional for Meta, but without it a product shows as "Not visible in Shops".
// Second-hand books are one copy per SKU -> always 1.
var META_EXTRA = { "quantity_to_sell_on_facebook": "1" };

// ══════════════════════════════════════════════════════════
//  Facebook catalogue scope — the single place that controls every tool.
//  v20b: BOTH sheets are in scope — GAME GUIDE BOOKS and MAGAZINE.
//  (Until v20 the catalogue was POCKET BOOK only and every magazine was excluded.)
//  ⚠️ Every tool (buildFbCatalogue · rebuildDescriptions · exportMetaCsv)
//     must call _metaInScope(); never write a separate filter.
// ══════════════════════════════════════════════════════════
var META_ONLY_STATUS = ["Instock"];          // [] = do not filter on status
var META_ONLY_TYPE = "";                     // set e.g. "POCKET BOOK" to narrow the catalogue by Type again
var META_EXCLUDE_NAME = null;                // v20b: no name-based exclusion (magazines are in scope)

// Returns { ok:true } when in scope, otherwise the reason
//   it = { name, status, type, sheet }
function _metaInScope(it, checkStatus) {
  if (!it) return { ok: false, why: "noInv" };
  if (META_ONLY_TYPE && it.type && it.type !== META_ONLY_TYPE) return { ok: false, why: "outScope" };
  if (!META_ONLY_TYPE && META_EXCLUDE_NAME && META_EXCLUDE_NAME.test(it.name || "")) return { ok: false, why: "outScope" };
  if (checkStatus && META_ONLY_STATUS.length && META_ONLY_STATUS.indexOf(it.status) === -1) {
    return { ok: false, why: "wrongStatus" };
  }
  return { ok: true };
}

// Standard inventory index — shared by every Facebook tool
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
  if (!fb) { ui.alert("Sheet " + FB_SHEET + " not found"); return; }

  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("No data in " + FB_SHEET); return; }
  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];

  // Locate the column of each field
  var colOf = {}, missingCols = [];
  META_REQUIRED.forEach(function (f) {
    var c = _fbFindCol(headers, f);
    if (c) colOf[f] = c; else missingCols.push(f);
  });
  if (missingCols.length) {
    ui.alert("Columns not found in " + FB_SHEET + ": " + missingCols.join(", ") +
             "\n\nRun \"Build FB CATALOGUE\" first.");
    return;
  }

  var n = lastRow - 1;
  var data = {};
  META_REQUIRED.forEach(function (f) {
    data[f] = fb.getRange(2, colOf[f], n, 1).getValues();
  });

  var inv = _metaInvIndex();      // shared inventory index

  var extraKeys = Object.keys(META_EXTRA);
  var out = [META_REQUIRED.concat(extraKeys)];   // header row = Meta field names
  var skipped = [], reasons = {};
  var outScope = 0, wrongStatus = 0, notInv = [], missByPid = {};
  for (var i = 0; i < n; i++) {
    // ── Scope filter first ──
    var thisPid = String(data.id[i][0] == null ? "" : data.id[i][0]).trim();
    var it = inv[thisPid];
    // v26 (F1): FB CATALOGUE row whose Product ID is no longer in GGB/MAGAZINE -> never exportable; report apart, not as incomplete
    if (thisPid && !it) { notInv.push("row " + (i + 2) + ": " + thisPid); continue; }
    if (thisPid && it) {
      var sc = _metaInScope(it, true);          // the same shared filter used by the other tools
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
    if (!row[0]) continue;                 // no id = empty row, skip silently
    if (miss.length) {
      skipped.push(row[0] + " (missing " + miss.join(", ") + ")");
      missByPid[row[0]] = miss;
      miss.forEach(function (f) { reasons[f] = (reasons[f] || 0) + 1; });
      continue;
    }
    extraKeys.forEach(function (k) { row.push(META_EXTRA[k]); });
    out.push(row);
  }

  // Write the new sheet
  var ex = ss.getSheetByName(META_EXPORT_SHEET);
  if (!ex) ex = ss.insertSheet(META_EXPORT_SHEET);
  else ex.clear();
  var nCols = out[0].length;                 // = required + extra (safe when fields are added)
  ex.getRange(1, 1, out.length, nCols).setValues(out);
  ex.setFrozenRows(1);
  ex.getRange(1, 1, 1, nCols).setFontWeight("bold");
  SpreadsheetApp.flush();
  ss.setActiveSheet(ex);

  // v27: health check — every in-scope Instock product must be in the feed; name the ones that are not and why
  var exportedIds = {}, gaps = [];
  for (var x = 1; x < out.length; x++) exportedIds[out[x][0]] = true;
  Object.keys(inv).forEach(function (pid) {
    if (exportedIds[pid] || !_metaInScope(inv[pid], true).ok) return;
    gaps.push(pid + " " + inv[pid].name + " — " +
      (missByPid[pid] ? _metaFixHint(missByPid[pid]) : "no row in FB CATALOGUE → run 🚀 Refresh Meta feed"));
  });
  var msg = (gaps.length
      ? "⚠️ " + gaps.length + " Instock product(s) are NOT in the feed:\n   " + gaps.slice(0, 30).join("\n   ") +
        (gaps.length > 30 ? "\n   … and " + (gaps.length - 30) + " more" : "") + "\n\n"
      : "✅ Every Instock product is in the feed (" + (out.length - 1) + ")\n\n") +
    (_lastFbBuildLog ? "FB CATALOGUE:\n   " + _lastFbBuildLog.join("\n   ") + "\n\n" : "") +
    "✅ Sheet \"" + META_EXPORT_SHEET + "\" created\n" +
            "Scope: game guide books + magazines · status " + (META_ONLY_STATUS.join("/") || "any") + "\n\n" +
            "• Ready to upload: " + (out.length - 1) + " products\n" +
            "• Out of scope: " + outScope + "\n" +
            "• Wrong status (sold / auction / hold / new arrival): " + wrongStatus + "\n" +
            "• Incomplete data: " + skipped.length + "\n" +
            "• Not in inventory (FB CATALOGUE rows to clean up): " + notInv.length + "\n";
  if (skipped.length) {
    msg += "\nMissing fields:\n";
    Object.keys(reasons).forEach(function (f) { msg += "   • " + f + " : " + reasons[f] + " rows\n"; });
    msg += "\nExamples:\n   " + skipped.slice(0, 5).join("\n   ") +
           (skipped.length > 5 ? "\n   … and " + (skipped.length - 5) + " more" : "") + "\n";
  }
  if (notInv.length) {
    msg += "\nNot in inventory (Product ID not in GGB/MAGAZINE — skipped):\n   " + notInv.slice(0, 30).join("\n   ") +
           (notInv.length > 30 ? "\n   … and " + (notInv.length - 30) + " more" : "") + "\n";
  }
  msg += "\n── How to export ──\n" +
         "1) You are on the " + META_EXPORT_SHEET + " sheet (already opened)\n" +
         "2) File → Download → Comma-separated values (.csv)\n" +
         "3) Upload the file in Commerce Manager → Catalog → Data Sources → Upload\n\n" +
         "Note: the Meta template has 31 columns but only these 9 are required;\n" +
         "the rest are optional.";
  _lastFbBuildLog = null;
  ui.alert("META EXPORT", msg, ui.ButtonSet.OK);
}

// v27: turn missing Meta fields into the action that fixes them
function _metaFixHint(miss) {
  var hints = [], known = ["image_link", "price", "brand"];
  if (miss.indexOf("image_link") !== -1) hints.push("no photo on R2 → run upload-missing-r2.ps1 -Commit");
  if (miss.indexOf("price") !== -1) hints.push("Price is blank in the inventory sheet");
  if (miss.indexOf("brand") !== -1) hints.push("Publisher is blank in the inventory sheet");
  var other = miss.filter(function (f) { return known.indexOf(f) === -1; });
  if (other.length) hints.push("missing " + other.join(", ") + " → run 🚀 Refresh Meta feed");
  return hints.join("; ");
}


var DESC_COND_PREFIX = "CONDITION — ";

// ============================================================
// [CAPTION ENGINE] v20 — one shared template for both FB album captions and Meta descriptions
//   「title」            ← 「」 marks the title (Japanese convention)
//   ■ Field：Value       ← ■ marks a data field
//   ※ note               ← ※ is for footnotes only, never in front of data
//   Sold -> 「title」【SOLD OUT】 (a single line)
//   Empty fields are skipped, so MAGAZINE rows without Platform/Genre use the same template
// ============================================================
var CAP = {
  FIELD_MARK:  "■ ",
  COLON:       "：",
  TITLE_OPEN:  "「",
  TITLE_CLOSE: "」",
  SOLD_TAG:    "【SOLD OUT】",
  CURRENCY:    "THB",
  FIELDS: [                       // field order — [label shown, key in the data]
    ["Platform",  "platform"],
    ["Publisher", "publisher"],
    ["Genre",     "genre"],
    ["Extra",     "extra"],
    ["Condition", "condition"],
    ["Price",     "priceTxt"]
  ],
  NOTES: [                        // edit here once; applies to every channel
    "※ ค่าส่งเริ่มต้น : 50.- 「เล่มต่อไปเพิ่มเล่มละ 10 บาท | สูงสุดไม่เกิน 100 บาท」",
    "※ ไม่มีบริการเก็บเงินปลายทางนะคะ"
  ]
};

function _capComma(n) {                                   // 1650 -> 1,650 (no toLocaleString)
  var s = String(n).split(".");
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return s.join(".");
}

function _capExtra(name) {                                // "Biohazard 2 (Incl. 2 Maps・RESTOCK-02)" → "2 Maps"
  var m = String(name || "").match(/[\(（]\s*Incl\.\s*([^)）]*)[\)）]/i);
  if (!m) return "";
  return m[1].replace(/・?\s*RESTOCK-\d+/i, "").replace(/[|｜・]\s*$/, "").trim();
}

function _capTitle(name) {                                // display name: drop RESTOCK, keep freebie brackets
  var t = _getBaseTitle(String(name || ""));
  t = t.replace(/[\(（]\s*Incl\.\s*([^)）]*)[\)）]/i, function (_m, g) {
    return "(Incl. " + g.replace(/・?\s*RESTOCK-\d+/i, "").trim() + ")";
  });
  return t.replace(/\s{2,}/g, " ").trim();
}

// opts: {price:true|false · title:true|false · notes:true|false · sold:true}
function _buildCaption(it, opts) {
  if (!it) return "";
  opts = opts || {};
  if (opts.sold) return CAP.TITLE_OPEN + _capTitle(it.name) + CAP.TITLE_CLOSE + CAP.SOLD_TAG;

  var v = {
    platform:  it.platform  || "",
    publisher: it.publisher || "",
    genre:     it.genre     || "",
    extra:     _capExtra(it.name),
    condition: it.condition || "",
    priceTxt:  ""
  };
  if (opts.price !== false) {
    var p = String(it.price == null ? "" : it.price).replace(/[^\d.]/g, "");
    if (p) v.priceTxt = _capComma(Math.round(Number(p))) + " " + CAP.CURRENCY;
  }

  var lines = [];
  if (opts.title !== false) { lines.push(CAP.TITLE_OPEN + _capTitle(it.name) + CAP.TITLE_CLOSE); lines.push(""); }
  CAP.FIELDS.forEach(function (f) {
    if (v[f[1]]) lines.push(CAP.FIELD_MARK + f[0] + CAP.COLON + v[f[1]]);
  });
  if (opts.notes !== false) { lines.push(""); lines = lines.concat(CAP.NOTES); }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Inventory titles carry a trailing freebie bracket, e.g. "Bully (Incl. Map)", while GAME INFO stores the bare title
// -> try several forms: full title -> without (Incl. ...) -> without the final bracket
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
  if (!fb) { ui.alert("Sheet " + FB_SHEET + " not found"); return; }
  var lastRow = fb.getLastRow();
  if (lastRow < 2) { ui.alert("No data"); return; }

  var headers = fb.getRange(1, 1, 1, Math.max(fb.getLastColumn(), 1)).getValues()[0];
  var cPid  = _fbFindCol(headers, "Product ID");
  var cDesc = _fbFindCol(headers, "Description");
  var cSyn  = _fbFindCol(headers, "Synopsis");
  if (!cPid || !cDesc) { ui.alert("Product ID and Description columns are required"); return; }

  var n = lastRow - 1;
  var pids = fb.getRange(2, cPid, n, 1).getValues();

  var inv = _metaInvIndex();     // shared inventory index

  // ── Synopsis index: Base Title -> Synopsis (from GAME INFO) ──
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

  // ── Compose the text ──
  var out = [], built = 0, noInv = [], noSyn = 0, skipScope = 0;
  for (var r = 0; r < n; r++) {
    var pid2 = String(pids[r][0] || "").trim();
    var it = inv[pid2];
    if (!pid2 || !it) { out.push([""]); if (pid2) noInv.push(pid2); continue; }

    // Out of scope -> leave the existing value alone
    var sc = _metaInScope(it, false);
    if (!sc.ok) { out.push([String(fb.getRange(r + 2, cDesc).getValue() || "")]); skipScope++; continue; }

    // v20: use the shared _buildCaption template — compact / minimal
    //      Price is left out (Meta has its own price field, so markdowns cannot conflict)
    //      The GAME INFO synopsis stays in the sheet but is not appended yet; can be enabled later
    out.push([_buildCaption(it, { price: false })]);
    built++;
  }

  var msg = "Scope: game guide books + magazines\n\n" +
            "• Rebuilt: " + built + " rows\n" +
            "• Skipped (out of scope): " + skipScope + " rows\n" +
            "• Not in inventory (left blank): " + noInv.length + " rows\n" +
            "• Format: compact template (no price, no synopsis yet)\n\n" +
            "Continue?";
  if (ui.alert("Rebuild descriptions", msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  _tryWrite(FB_SHEET + "!Description", function () {
    fb.getRange(2, cDesc, n, 1).setValues(out);
  });
  SpreadsheetApp.flush();

  ui.alert("Done",
    "Rebuilt " + built + " descriptions\n" +
    "Skipped " + skipScope + " out-of-scope rows — left unchanged\n" +
    (noInv.length ? "Left blank: " + noInv.length + " rows (Product ID not found in inventory)\n" : "") +
    "\nSpot-check 5 rows, then rebuild the META EXPORT sheet" +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}


// ============================================================
// [ALBUM CAPTION] v20 — the shared sheet for the "in stock" album on the page (GGB + MAGAZINE)
//   Columns: Product ID | Item name | Sheet | Image URL | Caption | Posted
//   Copy and paste when uploading photos by hand, or let a later phase post via the Graph API
// ============================================================
var ALBUM_SHEET   = "ALBUM CAPTION";
var ALBUM_HEADERS = ["Product ID", "Item name", "Sheet", "Image URL", "Caption", "Posted"];

function buildAlbumCaptions() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inv = _metaInvIndex();

  // ── Image URLs come straight from the Product ID (v20) ──
  // Images live on R2 at library/<Product ID>/1.jpg for BOTH game guide books and
  // magazines, so there is no need to read image_link out of FB CATALOGUE any more
  // (before v20b that sheet only covered POCKET BOOK, which left every magazine row without an image).

  // ── Preserve the existing Posted flags so they survive a rebuild ──
  var prevPosted = {};
  var sh = ss.getSheetByName(ALBUM_SHEET);
  if (sh && sh.getLastRow() >= 2) {
    var ph = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    var pP = _fbFindCol(ph, "Product ID"), pS = _fbFindCol(ph, "Posted");
    if (pP && pS) {
      var pn = sh.getLastRow() - 1;
      var pk = sh.getRange(2, pP, pn, 1).getValues(), pv = sh.getRange(2, pS, pn, 1).getValues();
      for (var j = 0; j < pn; j++) {
        var pkk = String(pk[j][0] || "").trim();
        if (pkk) prevPosted[pkk] = pv[j][0];
      }
    }
  }

  var rows = [], noImg = 0;
  Object.keys(inv).sort().forEach(function (pid) {
    var it = inv[pid];
    if (it.status !== "Instock") return;
    var img = _imageUrl(pid);
    if (!img) noImg++;
    rows.push([pid, it.name, it.sheet, img, _buildCaption(it, { price: true }), prevPosted[pid] || ""]);
  });

  if (!rows.length) { ui.alert("No rows with Status = Instock"); return; }
  if (ui.alert("Build " + ALBUM_SHEET,
        "In stock: " + rows.length + " items\n" +
        "Without an image link: " + noImg + " items\n\n" +
        ALBUM_SHEET + " will be overwritten (Posted flags are preserved)\n\nContinue?",
        ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  _sp2ResetWriteErrors();
  if (!sh) sh = ss.insertSheet(ALBUM_SHEET);
  _tryWrite(ALBUM_SHEET, function () {
    sh.clear();
    sh.getRange(1, 1, 1, ALBUM_HEADERS.length).setValues([ALBUM_HEADERS]).setFontWeight("bold");
    sh.getRange(2, 1, rows.length, ALBUM_HEADERS.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 5, sh.getMaxRows(), 1).setWrap(true);
    sh.setColumnWidth(2, 260);
    sh.setColumnWidth(5, 420);
  });
  SpreadsheetApp.flush();

  ui.alert("Done",
    ALBUM_SHEET + " built with " + rows.length + " rows" +
    (noImg ? "\n⚠️ " + noImg + " rows have no image link (missing Product ID, or not yet in R2 IMAGES/meta index)" : "") +
    _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

// Caption for an item that has sold — copy it over the existing album caption
function albumSoldCaption() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt("SOLD OUT caption", "Enter the Product ID", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var it = _metaInvIndex()[String(res.getResponseText() || "").trim()];
  if (!it) { ui.alert("That Product ID is not in the inventory"); return; }
  ui.alert("Copy this over the existing caption", _buildCaption(it, { sold: true }), ui.ButtonSet.OK);
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📦 Inventory Tools")
    // ── Sheet setup (run once per sheet — GGB and MAGAZINE separately) ──
    .addItem("🧱 SP-2 column setup (current sheet)", "sp2Setup")
    .addItem("🎨 Lay out sheet — order / hide / dropdowns", "sp2Layout")
    .addSeparator()
    // ── Pricing (everyday use) ──
    .addItem("💰 Calculate SP-2 prices (whole sheet)", "fillAllSuggestedPrices")
    .addItem("👀 Preview: SP-2 price into Price", "sp2PreviewApply")
    .addItem("✍️ Apply SP-2 price (raise + fill blanks)", "sp2ApplySuggested")
    .addItem("🚨 Audit under-market prices", "sp2AuditUnderpriced")
    .addItem("🔶 Review queue for rare items", "sp2ReviewQueue")
    .addSeparator()
    // ── Data upkeep ──
    .addItem("🏷️ Fill Copy Flags from title", "sp2MigrateFlags")
    .addItem("💎 Fill Rarity automatically (from sold prices)", "sp2AutoRarity")
    .addItem("🔍 Find Sold that look like Auction (price outliers)", "sp2FlagSuspectAuction")
    .addItem("🗂️ Build / update SERIES MAP", "sp2BuildSeriesMap")
    .addItem("🔽 Check Platform/Genre dropdowns (+add missing)", "auditDropdowns")
    .addSeparator()
    // ── Publishing ──
    .addItem("🚀 Refresh Meta feed (catalogue + export + health check)", "refreshMetaFeed")
    .addItem("📘 Build FB CATALOGUE (description + Meta fields)", "buildFbCatalogue")
    .addItem("✍️ Rebuild descriptions from live data", "rebuildDescriptions")
    .addItem("🖼️ Build ALBUM CAPTION (GGB + MAG)", "buildAlbumCaptions")
    .addItem("🏷️ SOLD OUT caption (single item)", "albumSoldCaption")
    .addItem("📤 Build META EXPORT sheet (CSV for Meta)", "exportMetaCsv")
    .addSeparator()
    // ── Request-driven local image jobs ──
    .addSubMenu(ui.createMenu("🖼️ R2 Images")
      .addItem("📁 Export Instock snapshot", "r2ExportInstockSnapshot")
      .addItem("📋 View image job results", "r2ShowUploadResults"))
    .addSeparator()
    // ── Integrity checks ──
    .addItem("✅ Validate Product IDs", "validateAllSKUs")
    .addItem("🆕 Fill missing Product IDs (safe)", "regenerateAllSKUs")
    .addItem("🔍 Find publishers without a code", "checkUnmappedPublishers")
    .addItem("🔤 Sort A-Z (natural sort)", "sortInventory")
    .addItem("🧮 Fill Market · Profit · Content formulas", "fixDerivedFormulas")
    .addSeparator()
    // ── Setup & repair (rarely needed) ──
    .addSubMenu(ui.createMenu("⚙️ Setup & repair")
      .addItem("⚙️ Install trigger (run once)", "setupInstallableTrigger")
      .addSeparator()
      .addItem("✍️ Apply SP-2 price to every row (incl. markdowns)", "sp2ApplySuggestedAll")
      .addItem("🛠️ Renumber RESTOCK tags ⚠️", "fixAllRestockTags")
      .addItem("🔄 Rebuild ALL Product IDs ⚠️ breaks image links", "forceRegenerateAllSKUs"))
    .addToUi();
}

// Temporary isolated Google QA; remove after the single guarded run.
function p1ReviewQa20261003() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getId() !== '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM') throw new Error('Wrong QA Sheet');
  var sh = ss.getSheetByName(GGB_SHEET), journal = _addRequestSheet(ss);
  var tag = 'p1-review-20261003-02-';
  function check(ok, label) { if (!ok) throw new Error('QA assertion: ' + label); }
  function reject(fn, pattern) {
    var error = '';
    try { fn(); } catch (e) { error = String(e.message || e); }
    check(pattern.test(error), 'expected rejection ' + pattern + '; got ' + error);
  }
  function write(row, col, value) {
    check(_tryWrite('QA test cell', function () { sh.getRange(row, col).setValue(value); }), 'QA write');
    SpreadsheetApp.flush();
    check(sh.getRange(row, col).getValue() === value, 'QA cell readback');
  }
  function payload(label) {
    return {requestId:tag + label, source:'GGB', title:'Synthetic QA Astra 20261003 ' + label,
      pub:'TEST', cond:'', original:300, cost:99, price:299, status:'New Arrival',
      platform:'', genre:'', subGenre:'', type:'', copyFlags:'', rarity:'R3', marketRef:'', refNote:''};
  }
  check(sh.getLastRow() === 26 && journal.getLastRow() === 79, 'before row counts; do not rerun');
  check(journal.getRange(2, 3, 78, 1).getValues().every(function(r) { return String(r[0]).indexOf(tag) !== 0; }), 'QA IDs unused');
  delete _colCache[sh.getSheetId()];
  var col = _resolveColumns(sh);
  check(col.cost && col.productId && col.marketplace && sh.getRange(1, col.cost).getValue() === 'Cost', 'expected headers');
  [false, 0, [], ['Sold'], 'Pending-without-order'].forEach(function(value, i) {
    var p = payload('R3-' + i); p.status = value;
    reject(function() { _apiInvAdd(p); }, /Invalid Add status/);
  });
  var badSource = payload('R3-source'); badSource.source = 'INVALID';
  reject(function() { _apiInvAdd(badSource); }, /Invalid Add source/);
  check(sh.getLastRow() === 26 && journal.getLastRow() === 79, 'R3 no writes');
  Logger.log('PASS R3: malformed status/source rejected before writes');
  var p2 = payload('R2');
  try {
    write(1, col.cost, 'QA_DISABLED_COST');
    reject(function() { _apiInvAdd(p2); }, /Inventory header missing: cost/);
    check(sh.getLastRow() === 26 && journal.getLastRow() === 79, 'R2 no writes');
  } finally {
    write(1, col.cost, 'Cost'); delete _colCache[sh.getSheetId()];
  }
  var r2 = _apiInvAdd(p2);
  check(r2.item.cost === 99 && r2.item.price === 299 && r2.result.row === 27, 'R2 same-ID retry');
  Logger.log('PASS R2: missing Cost stopped before writes; header restored; same-ID retry DONE row 27');
  var p1 = payload('R1'), r1 = _apiInvAdd(p1);
  check(r1.result.row === 28, 'R1 row');
  try {
    write(28, col.productId, 'QA-RENAMED-ORIGINAL');
    write(27, col.productId, r1.item.productId);
    var replay = _apiInvAdd(p1), status = _apiInvAddStatus(p1);
    check(replay.historical === true && replay.item.name === r1.item.name, 'R1 replay provenance');
    check(status.state === 'DONE' && status.data.historical === true && status.data.item.name === r1.item.name, 'R1 status provenance');
    check(sh.getLastRow() === 28, 'R1 no duplicate');
  } finally {
    write(27, col.productId, r2.item.productId); write(28, col.productId, r1.item.productId);
  }
  Logger.log('PASS R1: unique SKU reuse; replay/status returned historical committed snapshot; SKUs restored');
  var p4 = payload('R4'), realWriter = _setDerivedFormulasForRow;
  try {
    _setDerivedFormulasForRow = function(sheet, row, cols) {
      var formulas = realWriter(sheet, row, cols);
      check(sheet.getSheetId() === sh.getSheetId() && row === 29, 'fault target');
      write(row, cols.marketplace, '');
      return formulas;
    };
    reject(function() { _apiInvAdd(p4); }, /Add readback mismatch: formula marketplace/);
  } finally { _setDerivedFormulasForRow = realWriter; }
  check(sh.getLastRow() === 29, 'R4 partial row');
  reject(function() { _apiInvAdd(p4); }, /requires recovery/);
  check(sh.getLastRow() === 29 && _apiInvAddStatus(p4).state === 'ERROR', 'R4 no duplicate; ERROR retained');
  check(sh.getRange(29, col.marketplace).getFormula() === '', 'R4 dropped formula retained as evidence');
  check(journal.getLastRow() === 87, 'final journal count');
  Logger.log('PASS R4: injected marketplace formula loss -> ERROR; same-ID retry blocked; row 29 retained for evidence');
  Logger.log('PASS ALL: R1-R4 isolated runtime; requests ' + tag + 'R2/R1/R4; final GGB row 29, journal row 87');
}
