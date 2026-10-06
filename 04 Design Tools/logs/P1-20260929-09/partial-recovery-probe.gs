
// P1-20260929-09: recover only the verified synthetic partial row.
function p1QaRecoverPartialProbe() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')
    throw new Error('Wrong spreadsheet: recovery disabled');
  var inventory = ss.getSheetByName(GGB_SHEET), journal = _addRequestSheet(ss);
  if (inventory.getLastRow() !== 15 || journal.getLastRow() !== 50)
    throw new Error('Sheet changed since readback; recovery stopped');
  var id = 'p1qa-partial-20260929-01', col = _resolveColumns(inventory);
  var events = journal.getRange(48, 1, 3, 17).getValues();
  if (events.some(function(e){ return e[2] !== id; }) ||
      events.map(function(e){ return e[4]; }).join(',') !== 'PREPARED,ERROR,ERROR')
    throw new Error('Journal changed since readback; recovery stopped');
  var row = inventory.getRange(15, 1, 1, inventory.getLastColumn());
  var before = row.getValues()[0];
  if (before[col.name - 1] !== 'Synthetic QA Partial 20260929 P01' ||
      before[col.publisher - 1] !== 'TEST' ||
      Number(before[col.cost - 1]) !== 0 || Number(before[col.price - 1]) !== 321 ||
      before[col.status - 1] || before[col.productId - 1])
    throw new Error('Partial row changed since readback; recovery stopped');
  row.clearContent();
  SpreadsheetApp.flush();
  if (row.getValues()[0].some(function(v){ return v !== ''; }))
    throw new Error('Synthetic partial row was not fully cleared');
  _addRequestEvent(journal, id, 3, 'RECOVERED', GGB_SHEET, events[0][9], 15, '',
    JSON.stringify({ name: before[col.name - 1], publisher: 'TEST', cost: 0, price: 321,
      status: '', productId: '' }), 'verified synthetic row 15 cleared',
    'P1-20260929-09 test-only recovery after injected add status failure', '');
  Logger.log(JSON.stringify({ id: id, row: 15, before: 'synthetic partial row',
    after: 'A15:Z15 cleared', journalRow: journal.getLastRow(),
    status: 'RECOVERED', inventoryLastRow: inventory.getLastRow() }));
}
