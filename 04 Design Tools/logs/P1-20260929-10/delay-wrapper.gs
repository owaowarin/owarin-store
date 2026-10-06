
// P1-20260929-10: temporary test-only delayed response after a committed Add.
var _p1QaOriginalAddInventoryRow = addInventoryRow;
addInventoryRow = function(data) {
  var result = _p1QaOriginalAddInventoryRow(data);
  if (SpreadsheetApp.getActiveSpreadsheet().getId() === '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM' &&
      String(data.title || '').trim() === 'Synthetic QA Delay 20260929 A23')
    Utilities.sleep(15000);
  return result;
};
