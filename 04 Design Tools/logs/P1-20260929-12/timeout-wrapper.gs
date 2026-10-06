
// P1-20260929-12: temporary test-only delayed response after a committed Add.
var _p1QaOriginalAddInventoryRow = addInventoryRow;
addInventoryRow = function(data) {
  var result = _p1QaOriginalAddInventoryRow(data);
  if (SpreadsheetApp.getActiveSpreadsheet().getId() === '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM' &&
      String(data.title || '').trim() === 'Synthetic QA Timeout 20260929 A26')
    Utilities.sleep(20000);
  return result;
};
