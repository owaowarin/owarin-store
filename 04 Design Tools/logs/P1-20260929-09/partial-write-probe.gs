
// P1-20260929-09: temporary, synthetic-only Google runtime failure probe.
function p1QaPartialWriteProbe() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')
    throw new Error('Wrong spreadsheet: partial-write probe disabled');
  var inventory = ss.getSheetByName(GGB_SHEET);
  var journal = _addRequestSheet(ss);
  var id = 'p1qa-partial-20260929-01';
  var data = { requestId: id, sheetName: GGB_SHEET,
    title: 'Synthetic QA Partial 20260929 P01', pub: 'TEST',
    cost: 0, price: 321, status: 'New Arrival' };
  var beforeRow = inventory.getLastRow(), beforeEvent = journal.getLastRow();
  var prior = beforeEvent > 1 ? journal.getRange(2, 3, beforeEvent - 1, 1).getValues() : [];
  if (prior.some(function(r){ return String(r[0]) === id; }))
    throw new Error('Probe Request ID already exists; reconcile it first');
  if (inventory.getRange(beforeRow + 1, 1).getValue())
    throw new Error('Expected next inventory row is occupied');

  var write = _tryWrite, firstError = '', retryError = '';
  try {
    _tryWrite = function(label, fn) {
      return label === 'add status' ? false : write(label, fn);
    };
    addInventoryRow(data);
  } catch (e) { firstError = String(e && e.message || e); }
  finally { _tryWrite = write; }
  if (firstError.indexOf('Add write failed: status') < 0)
    throw new Error('Unexpected first outcome: ' + firstError);

  var row = beforeRow + 1, col = _resolveColumns(inventory);
  var partial = inventory.getRange(row, 1, 1, inventory.getLastColumn()).getValues()[0];
  if (inventory.getLastRow() !== row ||
      String(partial[col.name - 1]).indexOf('Synthetic QA Partial') !== 0 ||
      partial[col.status - 1] || partial[col.productId - 1])
    throw new Error('Partial row differs from expected; do not clear it');
  try { addInventoryRow(data); }
  catch (e) { retryError = String(e && e.message || e); }
  if (retryError.indexOf('Retry blocked pending recovery') < 0 || inventory.getLastRow() !== row)
    throw new Error('Same-ID retry was not safely blocked: ' + retryError);
  var events = journal.getRange(beforeEvent + 1, 3, journal.getLastRow() - beforeEvent, 3).getValues()
    .filter(function(r){ return r[0] === id; });
  if (events.length !== 3 || events.map(function(r){ return r[2]; }).join(',') !== 'PREPARED,ERROR,ERROR')
    throw new Error('Journal stages differ; do not clear partial row');

  inventory.getRange(row, 1, 1, inventory.getLastColumn()).clearContent();
  SpreadsheetApp.flush();
  if (inventory.getRange(row, col.name).getValue())
    throw new Error('Synthetic partial row did not clear');
  _addRequestEvent(journal, id, 3, 'RECOVERED', GGB_SHEET, _addRequestHash(data), row, '',
    JSON.stringify({ name: partial[col.name - 1], status: '', productId: '' }),
    'synthetic partial row cleared after blocked retry', firstError, '');
  Logger.log(JSON.stringify({ id: id, beforeRow: beforeRow, afterRow: inventory.getLastRow(),
    beforeEvent: beforeEvent, afterEvent: journal.getLastRow(),
    firstError: firstError, retryError: retryError,
    states: 'PREPARED,ERROR,ERROR,RECOVERED', rowCleared: true }));
}
