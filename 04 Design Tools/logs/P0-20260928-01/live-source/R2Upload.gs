// Request queue for the Windows image worker. This file is pasted into the bound Apps Script project as R2Upload.gs.
var R2_QUEUE_SHEET = "R2 JOBS";
var R2_RESULTS_SHEET = "IMAGE UPLOADS";
var R2_SCOPE_VERSION = "r2-hybrid-v3";
var R2_QUEUE_HEADERS = [
  "Request ID", "Batch ID", "Requested UTC", "Mode", "Source", "Product ID",
  "Item name", "Type", "Requested Status", "Input fingerprint", "Plan ID",
  "Plan hash", "Scope version", "Snapshot read UTC"
];
var R2_RESULT_HEADERS = [
  "Request ID", "Batch ID", "Source", "Product ID", "Item name", "Input fingerprint",
  "Manifest hash", "State", "Photo count", "Cover URL", "Image URLs", "Run ID",
  "Plan ID", "Plan hash", "Last checked UTC", "Last success UTC", "Error",
  "Local output path", "Snapshot read UTC"
];

function r2ExportInstockSnapshot() {
  var ui = SpreadsheetApp.getUi();
  var preview;
  try {
    preview = _r2ReadTargets_("Instock");
  } catch (e) {
    ui.alert("Export Instock stopped", String((e && e.message) || e), ui.ButtonSet.OK);
    throw e;
  }
  if (!preview.targets.length) {
    ui.alert("Export Instock", "No Instock rows were found. Nothing was queued.", ui.ButtonSet.OK);
    return null;
  }
  var answer = ui.alert(
    "Export Instock snapshot",
    "Queue " + preview.targets.length + " current Instock products for the Windows PC?\n\n" +
      "This command does not upload to R2 and does not change product Status.",
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return null;

  try {
    var result = _r2WithLock_(function () {
      var fresh = _r2ReadTargets_("Instock");
      if (!fresh.targets.length) throw new Error("No Instock rows remained at enqueue time.");
      return _r2EnqueueBatch_("EXPORT_INSTOCK", "Instock", fresh);
    });
    ui.alert(
      "Queued / waiting for PC",
      "Batch: " + result.batchId + "\nProducts: " + result.count + "\nSnapshot: " + result.snapshotReadUtc,
      ui.ButtonSet.OK
    );
    return result;
  } catch (e2) {
    ui.alert("Export Instock was not queued", String((e2 && e2.message) || e2), ui.ButtonSet.OK);
    throw e2;
  }
}

function r2ShowUploadResults() {
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(_r2ResultsSheet_());
}

function _r2ReadTargets_(requestedStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targets = [];
  var pidCounts = {};
  var problems = [];
  [GGB_SHEET, MAG_SHEET].forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Inventory sheet not found: " + sheetName);
    var col = _r2ResolveColumns_(sheet);
    ["itemName", "productId", "status", "type"].forEach(function (key) {
      if (!col[key]) throw new Error("Missing required inventory column '" + key + "' in " + sheetName);
    });
    if (sheet.getLastRow() < 3) return;
    var rows = sheet.getRange(3, 1, sheet.getLastRow() - 2, sheet.getLastColumn()).getDisplayValues();
    rows.forEach(function (row, index) {
      var pid = String(_r2Val_(row, col, "productId") || "").trim();
      if (pid) pidCounts[pid] = (pidCounts[pid] || 0) + 1;
      var status = String(_r2Val_(row, col, "status") || "").trim();
      if (status !== requestedStatus) return;
      var itemName = String(_r2Val_(row, col, "itemName") || "").trim();
      var type = String(_r2Val_(row, col, "type") || "").trim();
      if (!pid || !itemName || !type) {
        problems.push(sheetName + " row " + (index + 3) + " is missing Product ID, Item name or Type");
        return;
      }
      targets.push({ source: sheetName, productId: pid, itemName: itemName, type: type, status: status });
    });
  });
  targets.forEach(function (target) {
    if (pidCounts[target.productId] !== 1) problems.push("Duplicate Product ID: " + target.productId);
  });
  if (problems.length) throw new Error(problems.slice(0, 10).join("\n") + (problems.length > 10 ? "\n…and more" : ""));
  targets.sort(function (a, b) {
    return (a.source + "\u001f" + a.productId).localeCompare(b.source + "\u001f" + b.productId);
  });
  return { targets: targets, snapshotReadUtc: new Date().toISOString() };
}

function _r2EnqueueBatch_(mode, requestedStatus, snapshot) {
  var requestedUtc = new Date().toISOString();
  var batchId = _r2NewId_("R2B");
  var rows = _r2BuildRequestRows_(snapshot.targets, mode, requestedStatus, requestedUtc, batchId, snapshot.snapshotReadUtc);
  var signature = _r2Sha256_(mode + "\n" + rows.map(function (row) { return row[9]; }).join("\n"));
  var propertyKey = "R2_LAST_" + mode;
  var props = PropertiesService.getScriptProperties();
  var priorText = props.getProperty(propertyKey);
  if (priorText) {
    var prior = JSON.parse(priorText);
    if (prior.signature === signature && Date.now() - prior.at < 120000) {
      throw new Error("The same request was queued less than 2 minutes ago. Wait for the PC instead of clicking twice.");
    }
  }

  var sheet = _r2QueueSheet_();
  _r2ResultsSheet_();
  var startRow = Math.max(2, sheet.getLastRow() + 1);
  _r2ResetWriteErrors_();
  var wrote = _r2TryWrite_("R2 JOBS batch " + batchId, function () {
    var range = sheet.getRange(startRow, 1, rows.length, R2_QUEUE_HEADERS.length);
    range.setNumberFormat("@");
    range.setValues(rows);
    SpreadsheetApp.flush();
  });
  var confirmed = _r2ConfirmBatch_(sheet, startRow, rows);
  if (!wrote && !confirmed) throw new Error("R2 JOBS write failed. No success was reported; check the sheet before retrying.");
  if (!confirmed) throw new Error("R2 JOBS read-back did not match the complete batch. Do not retry until the sheet is checked.");
  props.setProperty(propertyKey, JSON.stringify({ signature: signature, at: Date.now(), batchId: batchId }));
  return { batchId: batchId, count: rows.length, snapshotReadUtc: snapshot.snapshotReadUtc };
}

function _r2BuildRequestRows_(targets, mode, requestedStatus, requestedUtc, batchId, snapshotReadUtc) {
  return targets.map(function (target) {
    var fingerprint = _r2Sha256_([
      target.source, target.productId, target.itemName, target.type, target.status
    ].join("\u001f"));
    return [
      _r2NewId_("R2R"), batchId, requestedUtc, mode, target.source, target.productId,
      target.itemName, target.type, requestedStatus, fingerprint, "", "",
      R2_SCOPE_VERSION, snapshotReadUtc
    ];
  });
}

function _r2ResultsSheet_() {
  return _r2EnsureTechnicalSheet_(R2_RESULTS_SHEET, R2_RESULT_HEADERS);
}

function _r2QueueSheet_() {
  return _r2EnsureTechnicalSheet_(R2_QUEUE_SHEET, R2_QUEUE_HEADERS);
}

function _r2EnsureTechnicalSheet_(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  var existing = sheet.getLastColumn() ?
    sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getDisplayValues()[0] : [];
  var hasAnyHeader = existing.some(function (value) { return String(value).trim() !== ""; });
  if (!hasAnyHeader) {
    _r2ResetWriteErrors_();
    var ok = _r2TryWrite_(sheetName + " headers", function () {
      sheet.getRange(1, 1, 1, headers.length).setNumberFormat("@").setValues([headers]);
      sheet.setFrozenRows(1);
      SpreadsheetApp.flush();
    });
    if (!ok) throw new Error("Could not initialize " + sheetName + " headers.");
  } else {
    var actual = existing.slice(0, headers.length).map(String);
    if (actual.join("\u001f") !== headers.join("\u001f")) {
      throw new Error(sheetName + " headers do not match the required contract. No rows were written.");
    }
  }
  return sheet;
}

function _r2ConfirmBatch_(sheet, startRow, expectedRows) {
  var actual = sheet.getRange(startRow, 1, expectedRows.length, R2_QUEUE_HEADERS.length).getDisplayValues();
  if (actual.length !== expectedRows.length) return false;
  for (var i = 0; i < expectedRows.length; i++) {
    if (actual[i][0] !== expectedRows[i][0] || actual[i][1] !== expectedRows[i][1]) return false;
  }
  return true;
}

function _r2NewId_(prefix) {
  var stamp = Utilities.formatDate(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'");
  return prefix + "-" + stamp + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function _r2Sha256_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (byte) { return (byte + 256).toString(16).slice(-2); })
    .join("");
}


// Controlled fallback for the Apps Script editor when the Sheet UI is unavailable.
function r2QueueInstockSnapshotNoUi() {
  return _r2WithLock_(function () {
    var fresh = _r2ReadTargets_("Instock");
    if (!fresh.targets.length) throw new Error("No Instock rows remained at enqueue time.");
    var result = _r2EnqueueBatch_("EXPORT_INSTOCK", "Instock", fresh);
    Logger.log(JSON.stringify(result));
    return result;
  });
}


// Compatibility helper for the bound project if its older source does not expose LockService.
function _r2WithLock_(fn) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}


var GGB_SHEET = "GAME GUIDE BOOKS";
var MAG_SHEET = "MAGAZINE";
function _r2ResolveColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var out = {};
  headers.forEach(function (h, i) {
    var key = String(h).trim().toLowerCase().replace(/\s+/g, " ");
    if (key === "item name" || key === "name" || key === "title") out.itemName = out.itemName || i + 1;
    if (key === "product id" || key === "productid" || key === "sku") out.productId = out.productId || i + 1;
    if (key === "status") out.status = out.status || i + 1;
    if (key === "type") out.type = out.type || i + 1;
  });
  return out;
}
function _r2Val_(row, columns, key) { var index = columns[key]; return index && index <= row.length ? row[index - 1] : null; }
function _r2ResetWriteErrors_() {}
function _r2TryWrite_(label, fn) { try { fn(); return true; } catch (e) { Logger.log(label + ": " + e); return false; } }
