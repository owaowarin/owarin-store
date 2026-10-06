// LAB target only. All back-office/core spreadsheet access uses this resolver.
// The target cannot be supplied by a web request. Do not point LAB at the store.
var OWA_TARGET_SPREADSHEET_ID = '158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE';
var _owaSpreadsheetCache = null;
function _owaSpreadsheet() {
  if (!_owaSpreadsheetCache) {
    if (!OWA_TARGET_SPREADSHEET_ID) throw new Error('Configure the spreadsheet target before running');
    var ss = SpreadsheetApp.openById(OWA_TARGET_SPREADSHEET_ID);
    if (!ss || ss.getId() !== OWA_TARGET_SPREADSHEET_ID) throw new Error('Spreadsheet target mismatch');
    _owaSpreadsheetCache = ss;
  }
  return _owaSpreadsheetCache;
}
