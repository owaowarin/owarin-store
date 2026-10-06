// Isolated synthetic QA only. Excluded from candidate/production.
function _w2QaTest_(){_w1QaV34Test_();}
function _w2QaBase_(){
 _w2QaTest_();var props=PropertiesService.getScriptProperties();if(props.getProperty('W2_BASE'))return;
 var base={};['ORDER REQUESTS','ORDERS','ORDER LINES',GGB_SHEET,MAG_SHEET,'SALES'].forEach(function(name){var sh=_getSheetOrThrow(name),n=sh.getLastRow(),rows=sh.getRange(1,1,n,sh.getLastColumn()).getValues();base[name]={rows:n,cols:sh.getLastColumn(),hash:_w1QaProofHash_(rows)};});props.setProperty('W2_BASE',JSON.stringify(base));
}
function w2QaPrepare(){
 _w2QaTest_();_w2QaBase_();var dry=w2SchemaDryRun(),schema=w2PrepareTestSchema(),fixture=_w1QaV34Fixture_(3,'W2V39');
 var requests=_w1Requests_(),out=[];[0,1].forEach(function(i){var id='qa-w2-create-'+i+'-20261005',old=requests[id],r=old&&old.state==='DONE'?old.result:_w1Mutate_('create',{requestId:id,channel:'SHOP',items:[{source:'MAG',sku:'W2V39-'+i,price:'390.10'}],customerShipping:'50',shippingSubsidy:'10'});out.push({orderId:r.orderId,status:r.status});});
 return JSON.stringify({dry:dry,schema:schema,fixture:fixture,orders:out});
}
function w2QaArmClientFailure(){_w2QaTest_();PropertiesService.getScriptProperties().setProperty('W2_FAIL_CRM','1');return 'ARMED CRM after-effect failure; synthetic test only';}
function w2QaApi(action,p){
 _w2QaTest_();var props=PropertiesService.getScriptProperties(),orig=_tryWrite,armed=props.getProperty('W2_FAIL_CRM')==='1';
 if(armed)_tryWrite=function(label,fn){return orig(label,function(){fn();if(label==='W1 CLIENT literal row'){props.deleteProperty('W2_FAIL_CRM');throw Error('W2_QA_CRM_AFTER_EFFECT');}});};
 try{return api(action,p);}finally{_tryWrite=orig;}
}
function w2QaRead(){
 _w2QaTest_();var props=PropertiesService.getScriptProperties(),base=JSON.parse(props.getProperty('W2_BASE')||'null');if(!base)throw Error('QA_BASE_REQUIRED');var preserved={};
 Object.keys(base).forEach(function(name){var b=base[name],sh=_getSheetOrThrow(name);preserved[name]=_w1QaProofHash_(sh.getRange(1,1,b.rows,b.cols).getValues())===b.hash;});
 var lines=_w1Rows_('ORDER LINES').filter(function(r){return /^W2V39-/.test(r[4]);}),ids=lines.map(function(r){return r[0];}).filter(function(v,i,a){return a.indexOf(v)===i;}),requests=_w1Requests_(),sales=_getSalesSheet(),cols=_resolveColumns(sales),ledger=sales.getRange(2,1,sales.getLastRow()-1,sales.getLastColumn()).getValues().filter(function(r){return ids.indexOf(r[cols.order-1])>=0;});
 return JSON.stringify({preserved:preserved,orders:ids.map(function(id){var o=_w1Order_(id);return {id:id,status:o[1],clientId:o[6],revision:o[12],ready:_w2Ready_(o[11])};}),saleCount:ledger.length,lineIds:ledger.map(function(r){return r[cols.orderLineId-1];}),clientCount:_w2ClientRows_().filter(function(r){return r[6];}).length,clients:_w2ClientRows_().filter(function(r){return r[6];}).map(_w2Client_),requests:Object.keys(requests).filter(function(k){return ids.indexOf(requests[k].snap.orderId)>=0;}).map(function(k){var r=requests[k];return {id:k,action:r.action,state:r.state,attempt:r.attempt,payloadRetained:!!r.snap.payload};}),labels:ids.filter(function(id){return _w2Ready_(_w1Order_(id)[11])==='READY';}).map(function(id){return _w2Labels_({orderId:id}).labels[0];}),journalRows:_w1Rows_('ORDER REQUESTS').length,journalHash:_w1QaProofHash_(_w1Rows_('ORDER REQUESTS'))});
}
function w2QaReplay(){
 _w2QaTest_();var before=JSON.parse(w2QaRead()),requests=_w1Requests_(),ids=before.orders.map(function(o){return o.id;}),out=[];
 Object.keys(requests).forEach(function(k){var r=requests[k];if(ids.indexOf(r.snap.orderId)>=0&&r.state==='DONE'&&['confirm','clients.save','labels.save'].indexOf(r.action)>=0){var result=_w2Resume_(k);out.push({id:k,replayed:!!result.replayed});}});
 var after=JSON.parse(w2QaRead());if(JSON.stringify(before)!==JSON.stringify(after))throw Error('QA_REPLAY_EFFECT');return JSON.stringify({result:'PASS',replays:out,proof:after});
}
