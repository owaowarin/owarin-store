// v40: owner-only, exact production Sheet; no sale, stock or external service call.
function _prodReleaseAccess_(){
 _w1Access_();if(SpreadsheetApp.getActiveSpreadsheet().getId()!=='16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0')throw Error('PRODUCTION_SHEET_ONLY');
 _addRequestSheet(SpreadsheetApp.getActiveSpreadsheet());
}
function prodReleaseDryRun(){
 _prodReleaseAccess_();_getSheetOrThrow('CLIENT');var result={version:40,w1:_w1SchemaDryRun_(),w2:_w2SchemaDryRun_()};Logger.log(JSON.stringify(result));return result;
}
function prodReleaseMigrate(){
 _prodReleaseAccess_();prodReleaseDryRun();_w1PrepareSchema_();var result=_w2PrepareSchema_(_w2SchemaDryRun_(),'prod-w1w2-schema-20261006-v40');Logger.log(JSON.stringify(result));return result;
}
function prodReleaseReadiness(){
 _prodReleaseAccess_();Object.keys(W1_HEADERS).forEach(_w1Table_);_w1TechnicalGate_('');var rows=_w2ClientRows_(),result={version:40,schema:'READY',clients:rows.filter(function(r){return r[6];}).length,orders:_w1Rows_('ORDERS').length,lines:_w1Rows_('ORDER LINES').length,requests:_w1Rows_('ORDER REQUESTS').length};Logger.log(JSON.stringify(result));return result;
}
