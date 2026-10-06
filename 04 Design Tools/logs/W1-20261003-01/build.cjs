const fs=require('node:fs'),path=require('node:path'),{write,log}=require('../../w1-work.cjs');
const rel='04 Design Tools/logs/W1-20261003-01/candidate/', before='before/03 Apps Script/Web App/';
function replaceOnce(s,a,b){if(s.split(a).length!==2)throw Error('Not unique: '+a.slice(0,80));return s.replace(a,b);}
let code=fs.readFileSync(path.join(__dirname,before,'Code_v31.gs'),'utf8');
code=code.replace(/Code.gs v31/g,'Code.gs v32').replace(/WebApp.gs v31/g,'WebApp.gs v32');
code=replaceOnce(code,'var HEADER_MAP = {','var HEADER_MAP = {\n  "item uid": "itemUid",\n  "order line id": "orderLineId",');
// Preserve unattended Meta/R2 callers of the common lock; owner checks belong at W1 entries.
for(const name of ['regenerateAllSKUs','forceRegenerateAllSKUs','fixAllRestockTags','sortInventory']){
 const invoke='if(typeof _w1TechnicalGate_ === "function") _w1TechnicalGate_(""); return '+name+'Core_();';
 code=replaceOnce(code,'function '+name+'() {','function '+name+'() { '+(name==='sortInventory'?'return _withLock(function(){ '+invoke+' });':invoke)+' }\nfunction '+name+'Core_() {');
}
// Reacquire after Sheets confirmation dialogs, which can suspend a menu invocation.
for(const [label,range,values] of [['fill Product ID','sheet.getRange(3, COL.productId, colOut.length, 1)','colOut'],['regen Product ID','sheet.getRange(3, COL.productId, colOut.length, 1)','colOut'],['fix RESTOCK names','sheet.getRange(3, COL.name, updated.length, 1)','updated']]){
 const original='_tryWrite("'+label+'", function () { '+range+'.setValues('+values+'); });';
 code=replaceOnce(code,original,'_withLock(function(){ if(typeof _w1MenuGuard_ === "function") _w1MenuGuard_(sheet); if(typeof _w1Write_ === "function") _w1Write_("'+label+'",function(){'+range+'.setValues('+values+');}); else '+original+' });');
}
for(const name of ['regenerateAllSKUsCore_','forceRegenerateAllSKUsCore_','fixAllRestockTagsCore_']){
 const a=code.indexOf('function '+name+'('),b=code.indexOf('\nfunction ',a+10);let part=code.slice(a,b<0?code.length:b);
 part=replaceOnce(part,'  var COL = _resolveColumns(sheet);','  if(typeof _w1MenuGuard_ === "function") _w1MenuGuard_(sheet);\n  var COL = _resolveColumns(sheet);');code=code.slice(0,a)+part+code.slice(b<0?code.length:b);
}
for(const name of ['_sp2ApplyCore','_sp2MigrateFlagsCore']){
 const a=code.indexOf('function '+name+'('),b=code.indexOf('\nfunction ',a+10);let part=code.slice(a,b);
 part=replaceOnce(part,'  var COL = _resolveColumns(sheet);','  if(!dryRun && typeof _w1MenuGuard_ === "function") _w1MenuGuard_(sheet);\n  var COL = _resolveColumns(sheet);');code=code.slice(0,a)+part+code.slice(b);
}
code=replaceOnce(code,'    var COL     = _resolveColumns(sheet);','    var COL     = _resolveColumns(sheet);\n    if (typeof _w1ExternalEdit_ === "function" && _w1ExternalEdit_(e)) return;');
code=replaceOnce(code,'  if (!dryRun && out.found.length) {','  if (!dryRun && out.found.length) {\n    if (typeof _w1MenuGuard_ === "function") _w1MenuGuard_(sheet);');
write(rel+'Code_v32.gs',code);
let web=fs.readFileSync(path.join(__dirname,before,'WebApp_v31.gs'),'utf8');
web=web.replace(/Code.gs v31/g,'Code.gs v32').replace(/WebApp.gs v31/g,'WebApp.gs v32').replace(/÷1.2/g,'×0.7');
web=replaceOnce(web,'function doGet(e) {','function doGet(e) {\n  _w1Access_();');
web=replaceOnce(web,'  try {\n    var data = _route','  try {\n    _w1Access_();\n    var data = _route');
web=replaceOnce(web,'    case "ping":','    case "orders.create": return _w1Mutate_("create",p);\n    case "orders.cancel": return _w1Mutate_("cancel",p);\n    case "orders.confirm": return _w1Mutate_("confirm",p);\n    case "orders.list": return _w1List_(p.status);\n    case "orders.get": return _w1Get_(p.orderId);\n    case "requests.get": return _w1Status_(p.requestId);\n    case "ping":');
web=replaceOnce(web,'var _INV_KEYS = ["name"','var _INV_KEYS = ["itemUid","name"');
const sortStart=web.indexOf('function _toolsSort('),sortEnd=web.indexOf('\nfunction ',sortStart+10);let sort=web.slice(sortStart,sortEnd);
sort=replaceOnce(sort,'  return _withLock(function () {','  return _withLock(function () {\n    _w1TechnicalGate_("");');
sort=replaceOnce(sort,'    range.setValues(data);','    _w1Write_("sort inventory",function(){range.setValues(data);});\n    if(JSON.stringify(range.getValues())!==JSON.stringify(data))throw new Error("SORT_READBACK");');
web=web.slice(0,sortStart)+sort+web.slice(sortEnd);
// Retire every legacy sale writer; both API compatibility entries use the same journal/guard.
function replaceFunction(s,name,next,body){const a=s.indexOf('function '+name+'('),b=s.indexOf(next,a);if(a<0||b<0)throw Error(name);return s.slice(0,a)+body+'\n\n'+s.slice(b);}
web=replaceFunction(web,'_apiMarkSold','// ── Write rows into SALES',`function _apiMarkSold(p) {\n  return _w1Mutate_("confirm",{requestId:p.requestId,channel:p.channel,items:[{source:p.source,sku:p.sku,itemUid:p.itemUid,price:p.price}],customerShipping:p.customerShipping,shippingSubsidy:p.shippingSubsidy,labelLater:p.labelLater,single:true});\n}`);
web=replaceFunction(web,'_appendSalesRows','function _toolsFillSuggested',`function _appendSalesRows() { throw new Error("LEGACY_SALE_WRITER_RETIRED use orders.confirm"); }`);
web=replaceFunction(web,'_apiSalesConfirm','function _apiSalesList',`function _apiSalesConfirm(p) { return _w1Mutate_("confirm",p); }`);
web=replaceFunction(web,'_nextOrderId','// Note: the productId',`function _nextOrderId() { _w1Access_(); return _w1NextId_(); }`);
web=replaceFunction(web,'_setSalesCells','// ── CONFIRM SOLD',`function _setSalesCells() { throw new Error("LEGACY_SALE_WRITER_RETIRED use orders.confirm"); }`);
web=web.replace(/\r\n/g,'\n');
web=replaceOnce(web,'function _apiInvUpdate(p) {\n  return _withLock(function () {','function _apiInvUpdate(p) { return _w1Edit_(p); }\nfunction _apiInvUpdateCore_(p) {');
const start=web.indexOf('function _apiInvUpdateCore_'),end=web.indexOf('// ── WRITE: MARK SOLD',start);
let edit=web.slice(start,end);edit=replaceOnce(edit,'    var ch = p.changes || {};','    var ch = p.changes || {};\n    _w1EditGuard_(sheet,row,ch,p.requestId);\n    _sp2ResetWriteErrors();');
edit=replaceOnce(edit,'      sheet.getRange(row, COL[key]).setValue(v);','      _w1Write_("edit "+key,function(){sheet.getRange(row,COL[key]).setValue(v);});');
edit=edit.replace('  });\n}','}\n');
edit=replaceOnce(edit,'    return { item: _readRow','    if (_SP2_WRITE_ERRORS.length) throw new Error(_sp2WriteErrMsg());\n    return { item: _readRow');
web=web.slice(0,start)+edit+web.slice(end);
// Exclude rows from unsettled W1 intents from sales reports, without hiding recovery state in Orders.
web=replaceOnce(web,'function _apiSalesList() {','function _apiSalesList() {\n  _w1Access_();\n  var unsettled={};var requests=_w1Requests_();Object.keys(requests).forEach(function(k){if(requests[k].state!=="DONE")unsettled[requests[k].snap.orderId]=true;});');
web=replaceOnce(web,'    out.push({\n      order:', '    if(unsettled[str(_val(data[i],COL,"order"))]) continue;\n    out.push({\n      order:');
write(rel+'WebApp_v32.gs',web);
for(const f of ['Code_v31.gs','WebApp_v31.gs'])write(rel+'backup/'+f,fs.readFileSync(path.join(__dirname,before,f),'utf8'));
for(const f of ['Code_v31.gs','WebApp_v31.gs'])write(rel+f,'// Archived local baseline: backup/'+f+'; candidate v32. Production remains v31.\n');
log('CANDIDATE_BUILD',before,rel,'v31','v32 scoped guards/routes','written; acceptance pending');
