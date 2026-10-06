function p1InvalidCurrencyProbe() {
  var id = '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== id) throw new Error('Wrong spreadsheet: abort');
  var cell = ss.getSheetByName('GAME GUIDE BOOKS').getRange('K3');
  if (cell.getValue() !== '') throw new Error('Probe cell is not empty');
  var out = { changeId: 'P1-20260929-04', requestId: 'P1-TABLE-INVALID-001', before: 'K3 empty' };
  try {
    try { cell.setValue('NOT_A_NUMBER'); SpreadsheetApp.flush(); out.write = 'accepted'; out.readback = String(cell.getValue()); }
    catch (e) { out.write = 'rejected'; out.error = String(e.message || e); }
  } finally {
    try { cell.clearContent(); SpreadsheetApp.flush(); out.after = cell.getValue() === '' ? 'K3 empty' : 'cleanup incomplete'; }
    catch (e) { out.after = 'cleanup failed: ' + String(e.message || e); }
    Logger.log(JSON.stringify(out));
  }
  return out;
}
