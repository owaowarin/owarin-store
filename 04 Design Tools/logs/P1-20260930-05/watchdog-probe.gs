
// P1-20260930-05: TEMPORARY TEST-ONLY post-commit delayed callback for A31.
// Remove this exact suffix after the one isolated test and restore the Code.gs hash.
var _p1QaAddBeforeWatchdogProbe = addInventoryRow;
addInventoryRow = function(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')
    throw new Error('P1 QA watchdog probe blocked outside the separate test Sheet');
  var result = _p1QaAddBeforeWatchdogProbe(data);
  if (String(data.title || '').trim() === 'Synthetic QA Watchdog 20260930 A31')
    Utilities.sleep(52000);
  return result;
};
