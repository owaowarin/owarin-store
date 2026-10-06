// W2 local/test candidate. Reuses W1 lock, append-only journal and original intent recovery.
var W2_CLIENT_HEADERS=['Facebook Account','Name','Phone Number','Address','Post Code','Note','Client ID','Updated At'];
function _w2Text_(v,key,max,required){
 if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('INVALID_TEXT '+key);
 v=v.trim();if(required&&!v)throw Error('REQUIRED '+key);return v;
}
function _w2Recipient_(p){
 if(!p||typeof p!=='object')throw Error('RECIPIENT_REQUIRED');
 var r={name:_w2Text_(p.name,'Recipient name',200,true),phone:_w2Text_(p.phone,'Phone',40,true),address:_w2Text_(p.address,'Address',1500,true),postalCode:_w2Text_(p.postalCode,'Postal code',5,true),deliveryNote:_w2Text_(p.deliveryNote||'','Delivery note',300,false)};
 if(!/^\d{5}$/.test(r.postalCode)||!/^\+?[\d ()-]+$/.test(r.phone)||!/^\d{9,10}$/.test(_w2Phone_(r.phone)))throw Error('INVALID_RECIPIENT');return r;
}
function _w2Phone_(v){var d=String(v||'').replace(/\D/g,'');return d.indexOf('66')===0&&(d.length===11||d.length===12)?'0'+d.slice(2):d;}
function _w2Norm_(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
function _w2ClientTable_(){
 var sh=_getSheetOrThrow('CLIENT');if(sh.getLastColumn()!==8||JSON.stringify(sh.getRange(1,1,1,8).getValues()[0])!==JSON.stringify(W2_CLIENT_HEADERS))throw Error('CLIENT_SCHEMA_REQUIRED');return sh;
}
function _w2ClientRows_(){
 var sh=_w2ClientTable_(),rows=sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,8).getValues(),seen={};
 rows.forEach(function(r){if(!r.some(function(v){return v!=='';}))return;if(!r[6]||!r[7]||seen[r[6]])throw Error('CLIENT_IDENTITY_CONFLICT');seen[r[6]]=true;});return rows;
}
function _w2Client_(r){return {id:r[6],revision:String(r[7]),facebook:String(r[0]),name:String(r[1]),phone:String(r[2]),address:String(r[3]),postalCode:String(r[4]),note:String(r[5])};}
function _w2FindClient_(id){var rows=_w2ClientRows_(),hits=[];rows.forEach(function(r,i){if(r[6]===id)hits.push({row:i+2,values:r,client:_w2Client_(r)});});if(hits.length!==1)throw Error('CLIENT_NOT_UNIQUE');return hits[0];}
function _w2Search_(p){
 _w1Access_();var q=p.fields||{query:p.query||''},keys=Object.keys(q);keys.forEach(function(k){if(['query','name','phone','facebook','address','postalCode','note'].indexOf(k)<0)throw Error('INVALID_SEARCH');_w2Text_(q[k],k,1500,false);});
 var terms=keys.filter(function(k){return _w2Norm_(q[k]);});if(!terms.length)return {clients:[]};
 var ranked=_w2ClientRows_().filter(function(r){return r[6];}).map(function(r){var c=_w2Client_(r),score=0,ok=terms.every(function(k){var needle=_w2Norm_(q[k]),values=k==='query'?[c.name,c.phone,c.facebook,c.address,c.postalCode,c.note]:[c[k]],best=-1;
  values.forEach(function(v){var hay=_w2Norm_(v),n=needle;if(k==='phone'||k==='query'&&/^[+\d ()-]+$/.test(needle)){hay=_w2Phone_(v);n=_w2Phone_(needle);}var rank=hay===n?3:hay.indexOf(n)===0?2:hay.indexOf(n)>=0?1:0;best=Math.max(best,rank);});score+=best;return best>0;});return {client:c,score:ok?score:0};});
 return {clients:ranked.filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score||a.client.id.localeCompare(b.client.id);}).slice(0,8).map(function(x){return x.client;})};
}
function _w2Choice_(choice){
 choice=choice||{mode:'none'};if(['none','order','new','update'].indexOf(choice.mode)<0)throw Error('INVALID_CLIENT_CHOICE');
 if(choice.mode==='none')return {mode:'none',id:''};
 var id=choice.id||'',existing;if(choice.mode!=='new'){existing=_w2FindClient_(id);if(String(choice.expectedRevision)!==existing.client.revision)throw Error('CLIENT_REVISION_CONFLICT');}
 if(choice.mode==='order')return {mode:'order',id:id};
 var c=choice.fields||{},recipient=_w2Recipient_({name:c.name,phone:c.phone,address:c.address,postalCode:c.postalCode,deliveryNote:''});
 return {mode:choice.mode,id:choice.mode==='new'?'CL-'+Utilities.getUuid():id,expectedRevision:existing?existing.client.revision:'',fields:{facebook:_w2Text_(c.facebook||'','Facebook',200,false),name:recipient.name,phone:recipient.phone,address:recipient.address,postalCode:recipient.postalCode,note:_w2Text_(c.note||'','Internal note',1500,false)}};
}
function _w2Attach_(s,p){
 s.clientId=s.orderBefore?s.orderBefore[6]:'';s.recipientSnapshot=s.orderBefore?s.orderBefore[11]:'';
 if(p.labelLater===false||p.recipient){s.recipientSnapshot=JSON.stringify(_w2Recipient_(p.recipient));s.clientChoice=_w2Choice_(p.clientChoice);s.clientId=s.clientChoice.id;}
}
function _w2Ready_(value){if(!value)return 'MISSING';try{_w2Recipient_(JSON.parse(value));return 'READY';}catch(e){return 'MISSING';}}
function _w2Error_(e){return String(e.message||e).split(/\r?\n/)[0].replace(/\bCL-[A-Za-z0-9_-]+/g,'[client]');}
function _w2Run_(action,p,prepare,apply){
 _w1Access_();if(!p||!/^[A-Za-z0-9_-]{12,100}$/.test(p.requestId||''))throw Error('REQUEST_ID_REQUIRED');
 return _w1Locked_(function(){var old=_w1TechnicalGate_(p.requestId),hash=_w1PayloadHash_(p,old&&old.hash),req;
  if(old){if(old.action!==action||hash!==old.hash||JSON.stringify(old.snap.payload)!==JSON.stringify(p))throw Error('REQUEST_PAYLOAD_CONFLICT');if(old.state==='DONE')return Object.assign({},old.result,{replayed:true});req=old;req.attempt++;}
  else{var snap=prepare();snap.payload=JSON.parse(JSON.stringify(p));snap.steps={};_w1Encode_(snap);req={id:p.requestId,attempt:1,action:action,hash:hash,snap:snap,entrySource:'web/sheet W2'};_w1Event_(req,'PREPARED');}
  try{_w1Event_(req,'APPLYING');var result=apply(req);_w1Event_(req,'DONE',result);return result;}
  catch(e){var message=_w2Error_(e);try{_w1Event_(req,'NEEDS_REVIEW',null,message);}catch(a){throw Error('PARTIAL_AUDIT '+req.id+' '+message);}throw Error('RECOVERY_REQUIRED '+req.id+' '+message);}
 });
}
function _w2SaveClient_(p){
 return _w2Run_('clients.save',p,function(){var c=p.choice;if(!c||['new','update'].indexOf(c.mode)<0)throw Error('CLIENT_SAVE_MODE');
  var f=c.fields,validated=_w2Recipient_({name:f.name,phone:f.phone,address:f.address,postalCode:f.postalCode,deliveryNote:''}),facebook=_w2Text_(f.facebook||'','Facebook',200,false),note=_w2Text_(f.note||'','Internal note',1500,false),sh=_w2ClientTable_(),id=c.id;
  if(typeof id!=='string'||!/^CL-[A-Za-z0-9_-]{8,100}$/.test(id))throw Error('INVALID_CLIENT_ID');
  var existing=c.mode==='update'?_w2FindClient_(id):null;if(existing&&String(c.expectedRevision)!==existing.client.revision)throw Error('CLIENT_REVISION_CONFLICT');
  if(!existing&&_w2ClientRows_().some(function(r){return r[6]===id;}))throw Error('CLIENT_ID_EXISTS');
  var revision=new Date(Math.max(Date.now(),existing?Date.parse(existing.client.revision)+1:0)).toISOString();
  return {orderId:p.orderId||'',clientId:id,row:existing?existing.row:sh.getMaxRows()+1,before:existing?existing.values:new Array(8).fill(''),after:[facebook,validated.name,validated.phone,validated.address,validated.postalCode,note,id,revision]};
 },function(req){var s=req.snap,sh=_w2ClientTable_();
  _w1Step_(req,'client',function(done){var rows=_w2ClientRowsForRetry_(),hits=[];rows.forEach(function(r,i){if(r[6]===s.clientId)hits.push(i+2);});if(hits.length>1||hits.length&&hits[0]!==s.row)throw Error('CLIENT_IDENTITY_CONFLICT');
   _w1EnsureRow_(sh,s.row);var range=sh.getRange(s.row,1,1,8),current=range.getValues()[0];if(JSON.stringify(current)===JSON.stringify(s.after)){if(range.getFormulas()[0].some(function(v){return v;}))throw Error('CLIENT_READBACK');return;}if(done)throw Error('CLIENT_CHANGED');
   current.forEach(function(v,i){if(v!==s.before[i]&&v!==s.after[i])throw Error('CLIENT_CHANGED');});
   // Apostrophe escaping plus plain-text format; native Sheets readback is mandatory.
   _w1Write_('CLIENT literal row',function(){range.setNumberFormat('@');range.setValues([s.after.map(function(v){return v===''?'':"'"+String(v);})]);});
   if(JSON.stringify(range.getValues()[0])!==JSON.stringify(s.after)||range.getFormulas()[0].some(function(v){return v;}))throw Error('CLIENT_READBACK');
  });return {clientId:s.clientId,clientRevision:s.after[7],clientSync:'SAVED'};
 });
}
// A partial new row may not have its ID yet. Only its original allocated request can complete it.
function _w2ClientRowsForRetry_(){var sh=_w2ClientTable_();return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,8).getValues();}
function _w2SyncClient_(result,req){
 var c=req.snap.clientChoice;if(!c||['new','update'].indexOf(c.mode)<0)return Object.assign({},result,{clientSync:'ORDER_ONLY'});
 var id='crm-'+_w1Hash_(req.id,true);
 try{var crm=_w2SaveClient_({requestId:id,orderId:req.snap.orderId,choice:c});return Object.assign({},result,crm,{clientRequestId:id});}
 catch(e){return Object.assign({},result,{clientSync:'NEEDS_RETRY',clientRequestId:id,clientRecoveryRequestId:req.id,message:req.action==='confirm'?'Sale saved; client save needs retry':'Label saved; client save needs retry',clientError:_w2Error_(e)});}
}
function _w2Confirm_(p){
 _w1Access_();var old=_w1Requests_()[p.requestId],result;
 if(old&&old.state==='DONE'){if(old.action!=='confirm'||old.hash!==_w1PayloadHash_(p,old.hash)||JSON.stringify(old.snap.payload)!==JSON.stringify(p))throw Error('REQUEST_PAYLOAD_CONFLICT');result=Object.assign({},old.result,{replayed:true});}
 else result=_w1Mutate_('confirm',p);
 return _w2SyncClient_(result,_w1Requests_()[p.requestId]);
}
function _w2SaveLabel_(p){
 _w1Access_();var old=_w1Requests_()[p.requestId],result;
 if(old&&old.state==='DONE'){if(old.action!=='labels.save'||old.hash!==_w1PayloadHash_(p,old.hash)||JSON.stringify(old.snap.payload)!==JSON.stringify(p))throw Error('REQUEST_PAYLOAD_CONFLICT');result=Object.assign({},old.result,{replayed:true});}
 else result=_w2Run_('labels.save',p,function(){var o=_w1Order_(p.orderId);if(['PENDING','SOLD'].indexOf(o[1])<0)throw Error('LABEL_ORDER_STATUS');if(String(o[12])!==String(p.expectedRevision))throw Error('REVISION_CONFLICT');var recipient=_w2Recipient_(p.recipient),choice=_w2Choice_(p.clientChoice),after=o.slice();after[6]=choice.mode==='none'?o[6]:choice.id;after[11]=JSON.stringify(recipient);after[12]=Number(o[12])+1;after[13]=p.requestId;return {orderId:p.orderId,before:o,after:after,clientChoice:choice};
 },function(req){var s=req.snap;_w1Step_(req,'label',function(done){if(done){if(JSON.stringify(_w1Order_(s.orderId))!==JSON.stringify(s.after))throw Error('ORDER_CHANGED');return;}_w1Record_('ORDERS',s.orderId,s.after,s.before);});return {orderId:s.orderId,status:s.after[1],revision:s.after[12],labelReadiness:'READY'};});
 return _w2SyncClient_(result,_w1Requests_()[p.requestId]);
}
function _w2Resume_(id){
 _w1Access_();var req=_w1Requests_()[id];if(!req)throw Error('REQUEST_NOT_FOUND');var p=req.snap.payload;if(!p||p.requestId!==id||_w1PayloadHash_(p,req.hash)!==req.hash)throw Error('ORIGINAL_INTENT_REQUIRED');
 if(req.action==='clients.save')return _w2SaveClient_(p);if(req.action==='labels.save')return _w2SaveLabel_(p);if(req.action==='confirm')return _w2Confirm_(p);return _w1Resume_(id);
}
function _w2Intent_(id){
 _w1Access_();var req=_w1Requests_()[id];if(!req)throw Error('REQUEST_NOT_FOUND');if(['clients.save','labels.save'].indexOf(req.action)<0)return _w1Intent_(id);
 var p=req.snap.payload;if(!p||p.requestId!==id||_w1PayloadHash_(p,req.hash)!==req.hash)throw Error('ORIGINAL_INTENT_REQUIRED');return {action:req.action,payload:p,state:req.state};
}
function _w2Draft_(id){_w1Access_();var o=_w1Order_(id),requests=_w1Requests_(),recovery='';Object.keys(requests).forEach(function(k){var r=requests[k],c=r.snap.clientChoice;if(r.snap.orderId===id&&r.state==='DONE'&&c&&['new','update'].indexOf(c.mode)>=0){var crm=requests['crm-'+_w1Hash_(k,true)];if(!crm||crm.state!=='DONE')recovery=k;}});return {orderId:id,status:o[1],revision:o[12],clientId:o[6],recipient:o[11]?JSON.parse(o[11]):null,clientRecoveryRequestId:recovery};}
function _w2List_(status){
 var result=_w1List_(status),requests=_w1Requests_();Object.keys(requests).forEach(function(id){var r=requests[id],c=r.snap.clientChoice;if(r.state==='DONE'&&c&&['new','update'].indexOf(c.mode)>=0&&!requests['crm-'+_w1Hash_(id,true)])result.recoveries.push({requestId:id,orderId:r.snap.orderId,state:'CLIENT_NOT_STARTED',error:'Sale saved; client save needs retry'});});return result;
}
function _w2Status_(id){
 var state=_w1Status_(id),r=_w1Requests_()[id];if(r&&r.state==='DONE'&&r.snap.clientChoice&&['new','update'].indexOf(r.snap.clientChoice.mode)>=0){var crm=_w1Requests_()['crm-'+_w1Hash_(id,true)];if(!crm||crm.state!=='DONE')state.data=Object.assign({},state.data,{clientSync:'NEEDS_RETRY',message:'Sale saved; client save needs retry'});}return state;
}
function _w2Labels_(p){
 _w1Access_();var ids=p.orderIds||[p.orderId];if(!Array.isArray(ids)||!ids.length||ids.length>100)throw Error('INVALID_LABEL_SELECTION');
 return {labels:ids.filter(function(v,i,a){return a.indexOf(v)===i;}).map(function(id){var o=_w1Order_(id);if(['PENDING','SOLD'].indexOf(o[1])<0)throw Error('LABEL_ORDER_STATUS');var r=_w2Recipient_(o[11]?JSON.parse(o[11]):null),titles=_w1Rows_('ORDER LINES').filter(function(l){return l[0]===id;}).map(function(l){return String(l[5]);}).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});
  return {senderName:"OWA — OWARIN's STORE",senderPhone:'065-208-3088',recipientName:r.name,phone:r.phone,address:r.address,postalCode:r.postalCode,deliveryNote:r.deliveryNote,itemTitles:titles};})};
}
function _w2Include_(name){if(['LabelRenderer','W2LabelUI','W2Suggest'].indexOf(name)<0)throw Error('INVALID_INCLUDE');var html=HtmlService.createHtmlOutputFromFile(name).getContent();return name==='W2Suggest'?html.replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, ''):html;}
function openLabelTool(){
 _w1Access_();var ids=[],ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getActiveSheet(),selection=ss.getActiveRangeList();
 if(sh.getName()==='ORDERS'&&selection)selection.getRanges().forEach(function(r){for(var row=Math.max(2,r.getRow());row<r.getRow()+r.getNumRows();row++){var id=sh.getRange(row,1).getValue();if(id&&ids.indexOf(id)<0)ids.push(id);}});
 var t=HtmlService.createTemplateFromFile('LabelDialog');t.orderIds=JSON.stringify(ids).replace(/</g,'\\u003c');SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(1100).setHeight(800),'OWA · Label Tool');
}
function w2SchemaDryRun(){
 _w1Access_();var ss=SpreadsheetApp.getActiveSpreadsheet();if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw Error('TEST_SHEET_ONLY');var sh=ss.getSheetByName('CLIENT');
 if(!sh)return {changes:['Create synthetic CLIENT with original A:F plus Client ID/Updated At'],rows:0};
 if(sh.getLastColumn()!==6&&sh.getLastColumn()!==8||JSON.stringify(sh.getRange(1,1,1,6).getValues()[0])!==JSON.stringify(W2_CLIENT_HEADERS.slice(0,6)))throw Error('CLIENT_SCHEMA_CONFLICT');
 return {changes:sh.getLastColumn()===6?['Append Client ID / Updated At; initialize identities only']:[],rows:sh.getLastRow()-1};
}
function w2PrepareTestSchema(){
 _w1Access_();var dry=w2SchemaDryRun(),prior=_w1Requests_()['qa-w2-client-schema-20261005'];if(!prior&&!dry.changes.length){_w2ClientRows_();return {schema:'READY',replayed:true};}return _w2Run_('W2_SCHEMA',{requestId:'qa-w2-client-schema-20261005'},function(){var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENT'),rows=sh&&sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,6).getValues():[];return {orderId:'',before:rows,ids:rows.map(function(r){return r.some(function(v){return v!=='';})?'CL-'+Utilities.getUuid():'';}),time:new Date().toISOString()};},function(req){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('CLIENT');
  if(!sh){_w1Write_('CLIENT test create',function(){sh=ss.insertSheet('CLIENT');});}
  var s=req.snap;_w1Step_(req,'headers',function(){var current=sh.getRange(1,1,1,8).getValues()[0];current.forEach(function(v,i){if(v!==''&&v!==W2_CLIENT_HEADERS[i])throw Error('CLIENT_SCHEMA_CONFLICT');});_w1Write_('CLIENT headers',function(){sh.getRange(1,1,1,8).setValues([W2_CLIENT_HEADERS]);});_w2ClientTable_();});
  if(s.before.length)_w1Step_(req,'ids',function(){if(JSON.stringify(sh.getRange(2,1,s.before.length,6).getValues())!==JSON.stringify(s.before))throw Error('CLIENT_MIGRATION_CHANGED');var expected=s.ids.map(function(id){return [id,id?s.time:''];}),range=sh.getRange(2,7,s.before.length,2),current=range.getValues();current.forEach(function(r,i){r.forEach(function(v,j){if(v!==''&&v!==expected[i][j])throw Error('CLIENT_MIGRATION_CHANGED');});});_w1Write_('CLIENT identities',function(){range.setValues(expected);});if(JSON.stringify(range.getValues())!==JSON.stringify(expected))throw Error('CLIENT_ID_READBACK');});
  _w2ClientRows_();return {schema:'READY',rows:s.before.length};
 });
}
