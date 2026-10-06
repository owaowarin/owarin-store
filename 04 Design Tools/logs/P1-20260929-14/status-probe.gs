
// P1-20260929-14: UNINSTALLED. Test-Sheet-only; run once, append 3 journal events,
// write no inventory row, then remove this function after evidence is captured.
function p1QaStatusProbe() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')
    throw new Error('Wrong spreadsheet: status probe disabled');
  var ggb = ss.getSheetByName(GGB_SHEET);
  var mag = ss.getSheetByName(MAG_SHEET);
  var journal = _addRequestSheet(ss);
  if (ggb.getLastRow() !== 19 || mag.getLastRow() !== 12 || journal.getLastRow() !== 62 ||
      ggb.getRange(20, 1).getValue() || journal.getRange(63, 3).getValue())
    throw new Error('Synthetic baseline changed; status probe disabled');

  var id = 'p1qa-status-fixture-20260929-01';
  var payload = { requestId: id, source: 'GGB', title: 'Synthetic QA Status Fixture 20260929 Q01',
    pub: 'TEST', cost: 0, price: 1, status: 'New Arrival' };
  var snapshot = function () { return [ggb.getLastRow(), mag.getLastRow(), journal.getLastRow()]; };
  var query = function (p) { return JSON.parse(api('inventory.addStatus', p)); };
  var assertState = function (state, eventRow) {
    var before = snapshot(), response = query(payload), after = snapshot();
    if (!response.ok || !response.data || response.data.state !== state ||
        before[0] !== after[0] || before[1] !== after[1] || before[2] !== after[2] ||
        after[0] !== 19 || after[1] !== 12 || after[2] !== eventRow ||
        ggb.getRange(20, 1).getValue())
      throw new Error('Status/read-only check failed for ' + state + ': ' + JSON.stringify(response));
    Logger.log(JSON.stringify({ requestId: id, state: state, sheetRows: after.slice(0, 2),
      journalLastRow: after[2], readOnly: true }));
  };

  assertState('NOT_FOUND', 62);
  var mismatch = query({ requestId: 'add-1790671871715-48yh8n9gtrn', source: 'GGB',
    title: payload.title, pub: 'TEST', cost: 0, price: 1, status: 'New Arrival' });
  if (mismatch.ok || String(mismatch.error).indexOf('different item data') < 0 ||
      journal.getLastRow() !== 62 || ggb.getLastRow() !== 19)
    throw new Error('Mismatched DONE Request ID did not fail closed');
  Logger.log(JSON.stringify({ requestId: 'add-1790671871715-48yh8n9gtrn',
    mismatchRejected: true, journalLastRow: 62 }));

  var hash = _addRequestHash(_apiInvAddData(payload));
  _addRequestEvent(journal, id, 1, 'PREPARED', GGB_SHEET, hash, '', '',
    'synthetic fixture; no inventory write', '', '', '');
  assertState('PREPARED', 63);
  _addRequestEvent(journal, id, 1, 'ERROR', GGB_SHEET, hash, '', '',
    'synthetic fixture; no inventory write', '', 'synthetic status test', '');
  assertState('ERROR', 64);
  _addRequestEvent(journal, id, 1, 'RECOVERED', GGB_SHEET, hash, '', '',
    'synthetic fixture; no inventory write', 'verified no inventory row', '', '');
  assertState('RECOVERED', 65);
  Logger.log('P1-20260929-14 PASS: no business row; status read-only at each state');
}
