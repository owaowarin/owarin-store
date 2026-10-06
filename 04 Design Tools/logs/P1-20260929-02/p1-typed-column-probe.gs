/** @OnlyCurrentDoc */
function p1TypedColumnProbe() {
  var id = '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== id) throw new Error('Wrong spreadsheet: abort');
  var sh = ss.getSheetByName('GAME GUIDE BOOKS');
  var row = 3, rg = sh.getRange(row, 1, 1, 26);
  if (rg.getValues()[0].some(function (v) { return v !== ''; })) throw new Error('Probe row is not empty');
  var out = { changeId: 'P1-20260929-02', requestId: 'P1-TABLE-PROBE-001', sheetId: id, before: 'A3:Z3 empty', writes: [] };
  var steps = [['name', 1, 'P1 TEST ONLY'], ['sku', 2, 'P1-TEST-001'], ['status', 3, 'New Arrival'], ['cost-zero', 11, 0], ['price', 13, 120], ['listed-date', 19, new Date('2026-09-29T00:00:00+07:00')]];
  try {
    steps.forEach(function (step) {
      try { sh.getRange(row, step[1]).setValue(step[2]); out.writes.push({ field: step[0], ok: true, readback: String(sh.getRange(row, step[1]).getValue()) }); }
      catch (e) { out.writes.push({ field: step[0], ok: false, error: String(e.message || e) }); }
    });
    try { sh.getRange(row, 13).setFormula('=120'); out.writes.push({ field: 'price-formula', ok: true, readback: sh.getRange(row, 13).getFormula() }); }
    catch (e) { out.writes.push({ field: 'price-formula', ok: false, error: String(e.message || e) }); }
  } finally {
    try { rg.clearContent(); SpreadsheetApp.flush(); out.after = rg.getValues()[0].every(function (v) { return v === ''; }) ? 'A3:Z3 empty' : 'cleanup incomplete'; }
    catch (e) { out.after = 'cleanup failed: ' + String(e.message || e); }
    Logger.log(JSON.stringify(out));
  }
  return out;
}
