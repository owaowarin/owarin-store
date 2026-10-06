// Backoffice candidate. Uses existing inventory/SALES headers; no external services.
// Durable request journal: one pending checkout at a time, replayable after a timeout.
// Do not delete journal rows or edit inventory/SALES while a request is pending.
var OWA_JOURNAL = 'OWA SALES REQUESTS';

function _owaMoney(v, label, allowZero) {
  if (v === null || v === undefined || String(v).trim() === '' ||
      !/^\d+(\.\d{1,2})?$/.test(String(v).trim())) throw new Error(label + ': enter a valid amount');
  var n = Number(v);
  if (!isFinite(n) || n > 100000000 || (allowZero ? n < 0 : n <= 0)) throw new Error(label + ': invalid amount');
  return n;
}
function _owaShipping(n) { return n > 0 ? Math.min(50 + 10 * (n - 1), 100) : 0; }
function _owaJournal() {
  var sh = _owaSpreadsheet().getSheetByName(OWA_JOURNAL);
  if (!sh || !sh.getLastRow()) return { sheet: sh, records: [] };
  if (sh.getRange(1, 1).getValue() !== 'OWA_CHECKOUT_V1') throw new Error('Journal schema mismatch');
  var records = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function(r, i) {
    if (!r[0]) throw new Error('Journal has an empty record; inspect before continuing');
    return { row: i + 2, value: JSON.parse(r[0]) };
  }) : [];
  return { sheet: sh, records: records };
}
function _owaNoPending() {
  _owaJournal().records.forEach(function(r) {
    if (r.value.state !== 'DONE') throw new Error('Checkout pending: retry request ' + r.value.id + ' before editing stock');
  });
}
function _owaNormalize(p) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(String(p.requestId || ''))) throw new Error('Missing checkout request ID; refresh the app');
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 50) throw new Error('Select 1–50 items');
  var seen = {}, items = p.items.map(function(it) {
    _sheetFromCode(it.source);
    var sku = String(it.sku || '').trim(), key = it.source + ':' + sku;
    if (!sku || seen[key]) throw new Error('Missing or duplicate copy in cart: ' + sku);
    seen[key] = true;
    var method = it.method || 'DIRECT';
    if (['DIRECT', 'AUCTION'].indexOf(method) < 0) throw new Error('Invalid sale method');
    return { source: it.source, sku: sku, price: _owaMoney(it.price, sku + ' price', false), method: method };
  });
  var channel = p.channel || 'SHOP';
  if (['SHOP', 'SHOPEE'].indexOf(channel) < 0) throw new Error('Invalid sale channel');
  var date = p.soldDate || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var parsed = new Date(date + 'T12:00:00+07:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed.getTime()) ||
      Utilities.formatDate(parsed, 'Asia/Bangkok', 'yyyy-MM-dd') !== date) throw new Error('Invalid sold date');
  return { id: p.requestId, items: items, channel: channel, date: date,
    shipping: _owaMoney(p.shipping, 'Carrier shipping expense', true),
    customerShipping: p.customerShipping === undefined ? _owaShipping(items.length) : _owaMoney(p.customerShipping, 'Customer shipping', true) };
}
function _owaSale(p) {
  return _withLock(function() {
    var input = _owaNormalize(p), signature = JSON.stringify(input), journal = _owaJournal();
    var existing = journal.records.filter(function(r) { return r.value.id === input.id; });
    if (existing.length > 1) throw new Error('Duplicate request journal records');
    var entry = existing[0];
    if (entry && entry.value.signature !== signature) throw new Error('Retry must use the original checkout values');
    if (entry && entry.value.state === 'DONE') return _owaResult(entry.value);
    journal.records.forEach(function(r) {
      if (r.value.state !== 'DONE' && r.value.id !== input.id) throw new Error('Another checkout is pending: retry ' + r.value.id);
    });
    var sales = _getSalesSheet(), sc = _resolveColumns(sales);
    ['order','product','orderDate','cost','price','shipingCost','netProfit','note'].forEach(function(k) {
      if (!sc[k]) throw new Error('SALES missing required column: ' + k);
    });
    if (!entry) {
      var snapshots = input.items.map(function(it) {
        var sh = _getSheetOrThrow(_sheetFromCode(it.source)), c = _resolveColumns(sh);
        ['productId','status','price','soldDate','cost'].forEach(function(k) { if (!c[k]) throw new Error(it.source + ' missing ' + k); });
        var row = _findRowBySku(sh, c, it.sku), obj = _readRow(sh, row, it.source);
        if (String(obj.status).trim() !== 'Instock') throw new Error(it.sku + ' is not Instock (Sold/Auction cannot be sold again)');
        return { item: it, title: obj.baseTitle || obj.name, cost: obj.cost === '' || obj.cost == null ? '' : _owaMoney(obj.cost, 'Recorded cost', true) };
      });
      var value = { id: input.id, signature: signature, state: 'PENDING', input: input,
        orderId: _nextOrderId(sales, sc), snapshots: snapshots };
      if (JSON.stringify(value).length > 45000) throw new Error('Checkout is too large; split into smaller orders');
      if (!journal.sheet) journal.sheet = _owaSpreadsheet().insertSheet(OWA_JOURNAL);
      journal.sheet.getRange(1, 1).setValue('OWA_CHECKOUT_V1');
      entry = { row: journal.sheet.getLastRow() + 1, value: value };
      journal.sheet.getRange(entry.row, 1).setValue(JSON.stringify(value));
      SpreadsheetApp.flush(); // Intent must exist before any stock/ledger writes.
    }
    var tx = entry.value, updated = [];
    tx.snapshots.forEach(function(snap, i) {
      var it = snap.item, sh = _getSheetOrThrow(_sheetFromCode(it.source)), c = _resolveColumns(sh);
      var row = _findRowBySku(sh, c, it.sku), current = String(sh.getRange(row, c.status).getValue()).trim();
      var status = it.method === 'AUCTION' ? 'Auction' : 'Sold';
      if (current !== 'Instock' && current !== status) throw new Error('Inventory changed during checkout: ' + it.sku);
      var marker = '[OWA:' + tx.id + ':' + i + ']';
      var notes = sales.getLastRow() >= 3 ? sales.getRange(3, sc.note, sales.getLastRow() - 2, 1).getValues() : [];
      var matches = [];
      notes.forEach(function(r, n) { if (String(r[0]).indexOf(marker) === 0) matches.push(n + 3); });
      if (matches.length > 1) throw new Error('Duplicate ledger marker: ' + marker);
      var target = matches.length ? matches[0] : Math.max(3, sales.getLastRow() + 1);
      // Claim this ledger row first. A retry finds it, even if subsequent writes fail.
      sales.getRange(target, sc.note).setValue(marker + ' ' + it.source + ' ' + it.sku + ' ' + it.method + ' ' + input.channel +
        ' | customerShipping=' + (i === 0 ? input.customerShipping : 0) + ' | payment=UNRECORDED');
      SpreadsheetApp.flush();
      var expense = i === 0 ? input.shipping : 0, charged = i === 0 ? input.customerShipping : 0;
      _setSalesCells(sales, sc, target, { order: tx.orderId, product: /^=/.test(snap.title) ? "'" + snap.title : snap.title,
        orderDate: new Date(input.date + 'T12:00:00+07:00'), cost: snap.cost, price: it.price,
        shipingCost: expense, productId: it.sku,
        // Includes customer delivery income once; unknown cost must not become zero.
        netProfit: snap.cost === '' ? '' : Math.round((it.price + charged - snap.cost - expense) * 100) / 100 });
      sh.getRange(row, c.price).setValue(it.price); // Actual selling price, no channel conversion.
      sh.getRange(row, c.soldDate).setValue(new Date(input.date + 'T12:00:00+07:00'));
      sh.getRange(row, c.status).setValue(status);
      updated.push(_readRow(sh, row, it.source));
    });
    SpreadsheetApp.flush();
    tx.state = 'DONE';
    journal.sheet.getRange(entry.row, 1).setValue(JSON.stringify(tx));
    SpreadsheetApp.flush();
    return { orderId: tx.orderId, count: updated.length, shipping: input.shipping,
      customerShipping: input.customerShipping, items: updated };
  });
}

function _owaResult(tx) {
  // Replay never writes. Merge immutable sale values into the latest descriptive fields.
  var items = tx.snapshots.map(function(snap) {
    var it = snap.item, sh = _getSheetOrThrow(_sheetFromCode(it.source)), c = _resolveColumns(sh);
    var obj = _readRow(sh, _findRowBySku(sh, c, it.sku), it.source);
    obj.price = it.price; obj.status = it.method === 'AUCTION' ? 'Auction' : 'Sold';
    obj.soldDate = tx.input.date; return obj;
  });
  return { orderId: tx.orderId, count: items.length, shipping: tx.input.shipping,
    customerShipping: tx.input.customerShipping, items: items };
}
function _owaRetry(requestId) {
  var entry = _owaJournal().records.filter(function(r) { return r.value.id === requestId; });
  if (entry.length !== 1) throw new Error('Checkout request not found in this spreadsheet');
  var p = JSON.parse(JSON.stringify(entry[0].value.input));
  p.requestId = p.id; p.soldDate = p.date;
  return _owaSale(p);
}

function _owaMarkSold(p) {
  var result = _owaSale({ requestId: p.requestId, items: [{ source: p.source, sku: p.sku, price: p.price, method: p.method }],
    channel: p.channel, shipping: p.shipping, customerShipping: p.customerShipping, soldDate: p.soldDate });
  return { item: result.items[0], sales: { orderId: result.orderId } };
}

// Ledger and inventory history are separate views: never invent old order/payment dates.
function _owaSalesList() {
  var ledger = _owaLegacySalesList().rows, pending = {}, pendingItems = {}, committed = {}, journal = _owaJournal();
  journal.records.forEach(function(r) {
    if (r.value.state === 'DONE') committed[r.value.id] = true; else {
      pending[r.value.id] = true;
      r.value.snapshots.forEach(function(s) { pendingItems[s.item.source + ':' + s.item.sku] = true; });
    }
  });
  ledger = ledger.filter(function(r) {
    var match = /^\[OWA:([^:]+):\d+\]/.exec(r.note);
    return !match || !!committed[match[1]];
  });
  var history = [];
  ['GGB','MAG'].forEach(function(src) {
    _readInventory(_sheetFromCode(src)).forEach(function(r) {
      if (r.status !== 'Sold' && r.status !== 'Auction') return;
      if (pendingItems[src + ':' + r.productId]) return;
      history.push({ source: src, sku: r.productId, product: r.baseTitle || r.name, price: r.price,
        method: r.status === 'Auction' ? 'AUCTION' : 'DIRECT',
        soldDate: _owaHistoryDate(r.soldDate),
        condition: r.condition });
    });
  });
  return { rows: ledger, history: history, pendingRequests: Object.keys(pending) };
}
function _owaHistoryDate(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd');
  var text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    var parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  return text;
}

// Run manually in the bound Apps Script editor. Read-only; does not install triggers.
function owaCheckEnvironment() {
  var ss = _owaSpreadsheet(), report = {spreadsheetId:ss.getId(), ready:true, sheets:[], pendingRequests:[]};
  ['GGB','MAG'].forEach(function(src) {
    var sh = _getSheetOrThrow(_sheetFromCode(src)), c = _resolveColumns(sh);
    var missing = ['name','productId','status','price','cost','soldDate'].filter(function(k){ return !c[k]; });
    var seen = {}, duplicates = [], availableWithoutPrice = [];
    _readInventory(_sheetFromCode(src)).forEach(function(r) {
      if (r.productId && seen[r.productId]) duplicates.push(r.productId);
      if (r.productId) seen[r.productId] = true;
      if (r.status === 'Instock' && (r.price === '' || r.price == null)) availableWithoutPrice.push(r.productId);
    });
    if (missing.length) report.ready = false;
    report.sheets.push({source:src, missing:missing, duplicateIds:duplicates, stockWithoutPrice:availableWithoutPrice});
  });
  var sc = _resolveColumns(_getSalesSheet());
  report.salesMissing = ['order','product','orderDate','cost','price','shipingCost','netProfit','note'].filter(function(k){return !sc[k];});
  report.pendingRequests = _owaJournal().records.filter(function(r){return r.value.state !== 'DONE';}).map(function(r){return r.value.id;});
  if (report.salesMissing.length || report.pendingRequests.length) report.ready = false;
  console.log(JSON.stringify(report));
  return report;
}
