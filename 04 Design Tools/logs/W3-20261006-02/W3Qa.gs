// Isolated native QA only; excluded from candidate and production. No runtime helper copy.
var W3_QA_CLIENT='W3 LEGACY CLIENT',W3_QA_REQUESTS='W3 MIGRATION REQUESTS';
function _w3Guard_(){_w1Access_();var ss=SpreadsheetApp.getActiveSpreadsheet();if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw Error('W3_TEST_SHEET_ONLY');return ss;}
function _w3Scope_(fn){
 var nativeApp=SpreadsheetApp,ss=_w3Guard_(),names={'CLIENT':W3_QA_CLIENT,'ORDER REQUESTS':W3_QA_REQUESTS};
 // This execution-local adapter routes real native Range calls to isolated fixture tabs.
 // It keeps the actual workbook ID, owner check, lock and all original v39 helpers.
 var view={getId:function(){return ss.getId();},getSheetByName:function(n){return ss.getSheetByName(names[n]||n);},insertSheet:function(n){if(!names[n])throw Error('W3_UNEXPECTED_INSERT');return ss.insertSheet(names[n]);}};
 try{SpreadsheetApp={getActiveSpreadsheet:function(){return view;},flush:function(){nativeApp.flush();}};return fn();}
 finally{SpreadsheetApp=nativeApp;}
}
function _w3OriginalProof_(){
 var ss=_w3Guard_(),out={};['GAME GUIDE BOOKS','MAGAZINE','SALES','CLIENT','ORDERS','ORDER LINES','ORDER REQUESTS','ADD REQUESTS','W1 DECIMAL REVIEW'].forEach(function(n){var sh=ss.getSheetByName(n),r=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn());out[n]=_w1Hash_({values:r.getValues(),formulas:r.getFormulas()},true);});return out;
}
function _w3Af_(){var sh=_w3Guard_().getSheetByName(W3_QA_CLIENT),r=sh.getRange(2,1,4,6);return {values:r.getValues(),formulas:r.getFormulas()};}
function _w3Output_(result){console.log(JSON.stringify(result));return result;}
function w3QaProbe(){var nativeApp=SpreadsheetApp,id=_w3Scope_(function(){return SpreadsheetApp.getActiveSpreadsheet().getId();});if(SpreadsheetApp!==nativeApp)throw Error('W3_BINDING_NOT_RESTORED');return _w3Output_({result:'PASS',readOnly:true,sheetId:id,serviceBindingRestored:true});}
function w3QaPrepare(){
 _w3Guard_();var result=_w2Run_('QA_W3_NATIVE_FIXTURE',{requestId:'qa-w3-native-fixture-20261006'},function(){var ss=_w3Guard_();[W3_QA_CLIENT,W3_QA_REQUESTS].forEach(function(n){if(ss.getSheetByName(n))throw Error('W3_FIXTURE_ALREADY_EXISTS');});return {orderId:'',rows:[['FB-A','ชื่อซ้ำ','0890000101','ที่อยู่ ก','00123','formula'],['','','','','',''],['FB-B','ชื่อซ้ำ','0890000102','ที่อยู่ ข','00124','private'],['','legacy numeric','890000003','old address','123','leave unchanged']]};},function(req){
  var ss=_w3Guard_();_w1Step_(req,'fixture',function(done){
   var sh=ss.getSheetByName(W3_QA_CLIENT),jr=ss.getSheetByName(W3_QA_REQUESTS);
   if(done){if(!sh||!jr)throw Error('W3_FIXTURE_CHANGED');return;}
   if(!sh)_w1Write_('QA W3 create CLIENT fixture',function(){sh=ss.insertSheet(W3_QA_CLIENT);});
   if(!jr)_w1Write_('QA W3 create journal fixture',function(){jr=ss.insertSheet(W3_QA_REQUESTS);});
   if(sh.getLastColumn()>6||jr.getLastRow()>1)throw Error('W3_FIXTURE_CHANGED');
   if(sh.getLastRow()>1){var saved=PropertiesService.getScriptProperties().getProperty('W3_AF_BEFORE');if(!saved||JSON.stringify(_w3Af_())!==saved)throw Error('W3_FIXTURE_PARTIAL_MANUAL_REVIEW');return;}
   _w1Write_('QA W3 fixture headers',function(){sh.getRange(1,1,1,6).setValues([W2_CLIENT_HEADERS.slice(0,6)]);jr.getRange(1,1,1,15).setValues([W1_HEADERS['ORDER REQUESTS']]);});
   _w1Write_('QA W3 legacy literal rows',function(){sh.getRange(2,1,4,6).setNumberFormat('@').setValues(req.snap.rows.map(function(r){return r.map(function(v){return v===''?'':"'"+v;});}));sh.getRange(2,6).setNumberFormat('General').setFormula('=1+1');sh.getRange(5,3).setNumberFormat('General').setValue(890000003);sh.getRange(5,5).setNumberFormat('General').setValue(123);});
   var af=_w3Af_();if(af.values[0][2]!=='0890000101'||af.values[0][4]!=='00123'||af.values[0][5]!==2||af.formulas[0][5]!=='=1+1'||typeof af.values[3][2]!=='number')throw Error('W3_NATIVE_FIXTURE_READBACK');
   PropertiesService.getScriptProperties().setProperty('W3_AF_BEFORE',JSON.stringify(af));
  });return {result:'PREPARED',clientTab:W3_QA_CLIENT,journalTab:W3_QA_REQUESTS,legacyRows:4};
 });return _w3Output_(result);
}
function _w3Migration_(inject){
 var original=_w3OriginalProof_(),af=_w3Af_(),saved=JSON.parse(PropertiesService.getScriptProperties().getProperty('W3_AF_BEFORE')||'null');if(JSON.stringify(af)!==JSON.stringify(saved))throw Error('W3_ORIGINAL_AF_CHANGED');
 var result=_w3Scope_(function(){
  var dry=w2SchemaDryRun(),old=_w1Requests_()['qa-w2-client-schema-20261005'],beforeJournal=_w1Rows_('ORDER REQUESTS'),beforeValues=_w3Rows_(),originalWrite=_tryWrite,hit=false,out,error='';
  if(inject&&old)throw Error('W3_FAILURE_ALREADY_ATTEMPTED');
  if(inject)_tryWrite=function(label,fn){return originalWrite(label,function(){fn();if(!hit&&label==='W1 CLIENT identities'){hit=true;throw Error('W3_NATIVE_AFTER_EFFECT');}});};
  try{out=w2PrepareTestSchema();}catch(e){error=String(e.message||e);if(!inject)throw e;}finally{_tryWrite=originalWrite;}
  if(inject&&(!hit||error.indexOf('RECOVERY_REQUIRED')<0))throw Error('W3_FAILURE_NOT_OBSERVED');
  var req=_w1Requests_()['qa-w2-client-schema-20261005'],rows=_getSheetOrThrow('CLIENT').getRange(2,1,4,8).getValues();
  if(old&&(JSON.stringify(old.snap.ids)!==JSON.stringify(req.snap.ids)||old.snap.time!==req.snap.time))throw Error('W3_ALLOCATIONS_CHANGED');
  if(!inject){var expected=req.snap.ids.map(function(id){return [id,id?req.snap.time:''];});if(JSON.stringify(rows.map(function(r){return r.slice(6);}))!==JSON.stringify(expected))throw Error('W3_ID_REVISION_CHANGED');_w2ClientRows_();}
  if(out&&out.replayed&&(JSON.stringify(beforeJournal)!==JSON.stringify(_w1Rows_('ORDER REQUESTS'))||JSON.stringify(beforeValues)!==JSON.stringify(_w3Rows_())))throw Error('W3_REPLAY_EFFECT');
  return {result:inject?'EXPECTED_FAILURE':'PASS',dryRun:dry,requestId:req.id,state:req.state,attempt:req.attempt,allocatedIds:req.snap.ids,allocatedRevision:req.snap.time,error:error,replayed:!!(out&&out.replayed),nativeRows:rows};
 });
 if(JSON.stringify(_w3Af_())!==JSON.stringify(saved))throw Error('W3_AF_CHANGED');if(JSON.stringify(_w3OriginalProof_())!==JSON.stringify(original))throw Error('W3_ORIGINAL_WORKBOOK_CHANGED');
 result.originalNineTabsUnchanged=true;result.originalAFValuesFormulasUnchanged=true;return _w3Output_(result);
}
function _w3Rows_(){var sh=_getSheetOrThrow('CLIENT');return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,Math.max(6,sh.getLastColumn())).getValues();}
function w3QaMigrationFail(){return _w3Migration_(true);}
function w3QaMigrationRetry(){return _w3Migration_(false);}
function w3QaUiReplay(){
 _w3Guard_();var before=_w3OriginalProof_(),requests=_w1Requests_(),ids=['OWA-20261006-01','OWA-20261006-02'],out=[];
 ids.forEach(function(id){var o=_w1Order_(id);if(o[1]!=='SOLD'||_w2Ready_(o[11])!=='READY')throw Error('W3_UI_ORDER_NOT_READY');});
 Object.keys(requests).forEach(function(k){var r=requests[k];if(ids.indexOf(r.snap.orderId)>=0&&['create','confirm','clients.save','labels.save'].indexOf(r.action)>=0){if(r.state!=='DONE')throw Error('W3_UI_REQUEST_NOT_DONE');var result=_w2Resume_(k);if(!result.replayed)throw Error('W3_UI_NOT_REPLAYED');out.push({id:k,action:r.action,replayed:true});}});
 if(out.length<4||JSON.stringify(before)!==JSON.stringify(_w3OriginalProof_()))throw Error('W3_UI_REPLAY_EFFECT');return _w3Output_({result:'PASS',orderIds:ids,replays:out,originalNineTabsUnchanged:true});
}
function w3QaFinalReplay(){return _w3Output_({result:'PASS',migration:_w3Migration_(false),ui:w3QaUiReplay()});}
