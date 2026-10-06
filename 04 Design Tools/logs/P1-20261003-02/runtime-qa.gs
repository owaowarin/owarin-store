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
