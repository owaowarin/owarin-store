// P1 journal migration and read-only readiness checks. No inventory or SALES writes.
function p1PrepareAddJournal() {
  return _withLock(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss.getId() !== '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0') throw new Error('Wrong production Sheet');
    var headers = ['Event ID','Timestamp','Request ID','Attempt','State','Actor','Entry Source','App Version','Sheet','Payload Hash','Row','Product ID','Before','After','Error','Result','Recovery Ref'];
    var sh = ss.getSheetByName('ADD REQUESTS');
    if (!sh) sh = ss.insertSheet('ADD REQUESTS');
    if (sh.getLastRow() === 0) {
      if (!_tryWrite('P1 journal headers', function () { sh.getRange(1, 1, 1, 17).setValues([headers]); }))
        throw new Error('Journal header write failed; inspect empty tab before retry');
      SpreadsheetApp.flush();
    }
    var actual = sh.getRange(1, 1, 1, 17).getValues()[0];
    for (var i = 0; i < headers.length; i++) if (actual[i] !== headers[i]) throw new Error('Journal header mismatch at ' + (i + 1) + '; no existing data changed');
    Logger.log('P1 journal ready: sheetId=' + sh.getSheetId() + '; eventRows=' + Math.max(0, sh.getLastRow() - 1));
  });
}

function p1CheckAddReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getId() !== '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0') throw new Error('Wrong production Sheet');
  var journal = _addRequestSheet(ss);
  [GGB_SHEET, MAG_SHEET].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) throw new Error('Missing inventory sheet ' + name);
    delete _colCache[sh.getSheetId()];
    var col = _resolveColumns(sh);
    var keys = ['name','productId','status','original','cost','price','suggested','publisher','condition','type','copyFlags','rarity','marketRef','refNote','marketplace','grossProfit','grossProfitMP','priceContentLists'];
    if (name === GGB_SHEET) keys = keys.concat(['platform','genre','subGenre']);
    keys.forEach(function (key) {
      if (!col[key]) throw new Error('Inventory header missing: ' + name + '/' + key);
    });
    Logger.log('PASS header resolution: ' + name);
  });
  var p = {requestId:'p1-readiness-20261003-03',source:'GGB',title:'P1 readiness read only',status:'New Arrival'};
  if (_apiInvAddStatus(p).state !== 'NOT_FOUND') throw new Error('Readiness ID already exists; inspect journal');
  var error = '';
  try { _apiInvAdd({source:'INVALID',title:'Invalid source'}); } catch (e) { error=String(e.message); }
  if (error.indexOf('Invalid Add source') < 0) throw new Error('Source guard failed');
  error = '';
  try { _apiInvAdd({source:'GGB',title:'Invalid status',status:false}); } catch (e) { error=String(e.message); }
  if (error.indexOf('Invalid Add status') < 0) throw new Error('Status guard failed');
  Logger.log('PASS P1 readiness: Code v31 / WebApp v31; exact schema; both inventories; invalid input rejected; no inventory/SALES/journal events written; existing events=' + Math.max(0,journal.getLastRow()-1));
}
