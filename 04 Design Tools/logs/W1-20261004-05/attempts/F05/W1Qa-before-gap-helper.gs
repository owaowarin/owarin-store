// Isolated v34 QA only. Never install in production.
function _w1QaV34Test_(){_w1Access_();if(SpreadsheetApp.getActiveSpreadsheet().getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw new Error('TEST_ONLY');}
function _w1QaV34Fixture_(count,prefix){
 _w1QaV34Test_();return _withLock(function(){var id='qa-fixture-'+prefix,old=_w1Requests_()[id];if(old&&old.state==='DONE')return old.result;_w1TechnicalGate_(id);var sh=_getSheetOrThrow(MAG_SHEET),c=_resolveColumns(sh),req=old;
  if(!req){var start=sh.getMaxRows()+1,rows=[];for(var i=0;i<count;i++){var r=new Array(sh.getLastColumn()).fill('');r[c.name-1]=prefix+' Copy '+i+' '+new Array(201).join('x');r[c.productId-1]=prefix+'-'+i;r[c.status-1]='Instock';r[c.cost-1]=100;r[c.price-1]=390;r[c.condition-1]='A';r[c.publisher-1]='TEST';rows.push(r);}req={id:id,attempt:1,action:'QA_FIXTURE',hash:_w1Hash_([prefix,count]),entrySource:'isolated test QA',snap:{orderId:'',sheet:MAG_SHEET,start:start,rows:rows}};_w1Encode_(req.snap);_w1Event_(req,'PREPARED');}
  var s=req.snap;_w1EnsureRow_(sh,s.start+s.rows.length-1);var range=sh.getRange(s.start,1,s.rows.length,s.rows[0].length),current=range.getValues();current.forEach(function(r,i){r.forEach(function(v,j){if(v!==''&&v!==s.rows[i][j])throw new Error('QA_FIXTURE_CONFLICT');});});_w1Write_('QA fixture '+prefix,function(){range.setValues(s.rows);});if(JSON.stringify(range.getValues())!==JSON.stringify(s.rows))throw new Error('QA_FIXTURE_READBACK');var result={start:s.start,count:s.rows.length,prefix:prefix};_w1Event_(req,'DONE',result);return result;
 });
}
function _w1QaV34Payload_(kind){var p={requestId:'v34-bulk-'+kind+'-20261004',channel:kind==='shopee'?'SHOPEE':'SHOP',items:[],customerShipping:'0.00',shippingSubsidy:'10.00',labelLater:true};for(var i=0;i<100;i++)p.items.push({source:'MAG',sku:'W1V34BULK-'+i,price:kind==='shopee'?'630.00':i===0?'0390.00':'390.00'});return p;}
function _w1QaV34Run_(action,p){_w1QaV34Test_();var start=Date.now(),r=_w1Mutate_(action,p);return JSON.stringify({action:action,ms:Date.now()-start,orderId:r.orderId,status:r.status,count:r.count,replayed:!!r.replayed,requestId:p.requestId});}
function w1QaV34Prepare(){return JSON.stringify([_w1QaV34Fixture_(100,'W1V34BULK'),_w1QaV34Fixture_(3,'W1V34CHECK')]);}
function w1QaV34Create(){_w1QaV34Test_();var requests=_w1Requests_(),firstCancel=requests['v34-bulk-cancel-20261004'];return _w1QaV34Run_('create',_w1QaV34Payload_(firstCancel&&firstCancel.state==='DONE'?'create-final':'create'));}
function w1QaV34Cancel(){_w1QaV34Test_();var requests=_w1Requests_(),final=requests['v34-bulk-create-final-20261004'],old=final||requests['v34-bulk-create-20261004'];if(!old||old.state!=='DONE')throw new Error('CREATE_NOT_DONE');return _w1QaV34Run_('cancel',{requestId:final?'v34-bulk-cancel-final-20261004':'v34-bulk-cancel-20261004',orderId:old.result.orderId,expectedRevision:old.result.revision});}
function w1QaV34Shopee(){return _w1QaV34Run_('confirm',_w1QaV34Payload_('shopee'));}
function _w1QaV34Inject_(kind){
 _w1Access_();return _withLock(function(){_w1QaV34Test_();var ledger=kind==='ledger',p={requestId:'v34-server-'+kind+'-20261004',channel:ledger?'SHOPEE':'SHOP',items:[{source:'MAG',sku:'W1V34CHECK-'+(ledger?2:0),price:ledger?'630.00':'0400.00'}],customerShipping:'50.00',shippingSubsidy:'10.00',labelLater:true},old=_w1Requests_()[p.requestId];if(old)return JSON.stringify({requestId:p.requestId,state:old.state,replayed:true});
 var original=_tryWrite,injected=false;_tryWrite=function(label,fn){if(label===(ledger?'W1 SALES block':'W1 hold batch')&&!injected){injected=true;if(ledger&&!original(label,fn))throw new Error('QA_NATIVE_WRITE_FAILED');return false;}return original(label,fn);};
 try{_w1Mutate_(ledger?'confirm':'create',p);throw new Error('EXPECTED_FAILURE');}catch(e){if(String(e.message).indexOf('RECOVERY_REQUIRED')!==0)throw e;}finally{_tryWrite=original;}
 var req=_w1Requests_()[p.requestId];if(!injected||!req||req.state!=='NEEDS_REVIEW'||_w1Hash_(req.snap.payload)!==req.hash)throw new Error('QA_INTENT_FAILURE');return JSON.stringify({requestId:req.id,state:req.state,nativeLedgerAlreadyWritten:ledger,payloadRetained:true});
 });
}
function w1QaV34Intent(){return _w1QaV34Inject_('intent');}
function w1QaV34Ledger(){return _w1QaV34Inject_('ledger');}
function w1QaV34Read(){_w1QaV34Test_();var requests=_w1Requests_(),ids=Object.keys(requests).filter(function(id){return id.indexOf('v34-')===0;});return JSON.stringify(ids.map(function(id){var r=requests[id];return {requestId:id,state:r.state,attempt:r.attempt,orderId:r.snap.orderId,count:r.result&&r.result.count,status:r.result&&r.result.status,error:r.error};}));}
