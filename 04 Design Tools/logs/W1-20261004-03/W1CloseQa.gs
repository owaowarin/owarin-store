// Test only; no shop authorization. New fixtures are separate from Session37's one-shot fixtures.
function _w1CloseTest_(){_w1Access_();if(SpreadsheetApp.getActiveSpreadsheet().getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw new Error('TEST_ONLY');}
function _w1CloseFixture_(count,prefix){
 _w1CloseTest_();return _withLock(function(){
  var id='qa-fixture-'+prefix,old=_w1Requests_()[id];if(old&&old.state==='DONE')return old.result;_w1TechnicalGate_(id);var sh=_getSheetOrThrow(MAG_SHEET),c=_resolveColumns(sh),req=old;
  if(old&&old.state==='DONE')return old.result;
  if(!req){var start=sh.getMaxRows()+1,rows=[];for(var i=0;i<count;i++){var r=new Array(sh.getLastColumn()).fill('');r[c.name-1]=prefix+' Copy '+i+' '+new Array(201).join('x');r[c.productId-1]=prefix+'-'+i;r[c.status-1]='Instock';r[c.cost-1]=100;r[c.price-1]=390;r[c.condition-1]='A';r[c.publisher-1]='TEST';rows.push(r);}
   req={id:id,attempt:1,action:'QA_FIXTURE',hash:_w1Hash_([prefix,count]),entrySource:'isolated test QA',snap:{orderId:'',sheet:MAG_SHEET,start:start,rows:rows}};_w1Encode_(req.snap);_w1Event_(req,'PREPARED');
  }
  var s=req.snap;_w1EnsureRow_(sh,s.start+s.rows.length-1);var range=sh.getRange(s.start,1,s.rows.length,s.rows[0].length),current=range.getValues();
  current.forEach(function(r,i){r.forEach(function(v,j){if(v!==''&&v!==s.rows[i][j])throw new Error('QA_FIXTURE_CONFLICT');});});
  _w1Write_('QA fixture '+prefix,function(){range.setValues(s.rows);});if(JSON.stringify(range.getValues())!==JSON.stringify(s.rows))throw new Error('QA_FIXTURE_READBACK');
  var result={start:s.start,count:s.rows.length,prefix:prefix};_w1Event_(req,'DONE',result);return result;
 });
}
function w1QaClose20261004(){
 _w1CloseTest_();var fixture=_w1CloseFixture_(2,'W1V33CHECK'),sh=_getSheetOrThrow(MAG_SHEET),c=_resolveColumns(sh),held=fixture.start+1;
 var p={requestId:'v33-check-create-20261004',channel:'SHOP',items:[{source:'MAG',sku:'W1V33CHECK-1',price:390}],customerShipping:0,shippingSubsidy:0};
 var order=_w1Mutate_('create',p),uid=sh.getRange(held,c.itemUid).getValue();
 var multi=sh.getRange(fixture.start,c.price,2,1);_w1Write_('QA direct range change',function(){multi.setValues([[391],[391]]);});
 if(!_w1ExternalEdit_({range:multi}))throw new Error('MULTI_AUDIT_MISSING');
 _w1Write_('QA exact price restore',function(){multi.setValues([[390],[390]]);});
 var uidCell=sh.getRange(held,c.itemUid);_w1Write_('QA direct UID clear',function(){uidCell.setValue('');});if(!_w1ExternalEdit_({range:uidCell,oldValue:uid,value:''}))throw new Error('UID_AUDIT_MISSING');
 var rejected=false;try{_w1TechnicalGate_('');}catch(e){rejected=String(e.message).indexOf('MANAGED_IDENTITY_CONFLICT')===0;}if(!rejected)throw new Error('UID_GUARD_MISSING');
 _w1Write_('QA exact UID restore',function(){uidCell.setValue(uid);});_w1Mutate_('cancel',{requestId:'v33-check-cancel-20261004',orderId:order.orderId,expectedRevision:order.revision});
 var cell=sh.getRange(fixture.start,c.price),before=cell.getValue(),original=_tryWrite,failed=false;
 _tryWrite=function(label,fn){if(!failed&&label==='W1 QA maintenance failure'){failed=true;return false;}return original(label,fn);};
 try{_w1MaintenanceWrite_('QA maintenance failure',sh,cell,[[391]]);throw new Error('EXPECTED_FAILURE');}catch(e){if(String(e.message).indexOf('MAINTENANCE_MANUAL_RECOVERY')!==0)throw e;}finally{_tryWrite=original;}
 var requests=_w1Requests_(),pending=Object.keys(requests).filter(function(id){return requests[id].action==='MAINTENANCE'&&requests[id].state!=='DONE';});if(pending.length!==1||cell.getValue()!==before)throw new Error('MAINTENANCE_FAILURE_STATE');
 _w1ReconcileMaintenance_(pending[0]);var audit=_w1MaintenanceWrite_('QA maintenance success',sh,cell,[[391]]);if(_w1Requests_()[audit.requestId].state!=='DONE')throw new Error('MAINTENANCE_AUDIT');
 _w1MaintenanceWrite_('QA exact price restore',sh,cell,[[390]]);
 var large={text:new Array(78001).join('x')},encoded=_w1Encode_(large);if(encoded.indexOf('GZIP:')!==0||_w1Decode_(encoded).text.length!==78000)throw new Error('GZIP_ROUNDTRIP');
 _withLock(function(){_w1Event_({id:'qa-gzip-20261004',attempt:1,action:'QA_GZIP',hash:_w1Hash_(large),snap:{orderId:'',payload:large},entrySource:'isolated test QA'},'DONE',{encoded:encoded.length});});
 return 'R2 multi-row/UID + failclosed; R4 failure/reconcile/success; R3 real GZIP roundtrip PASS. '+order.orderId+' cancelled. Do not rerun this one-shot check.';
}
function w1QaBulk20261004(){
 _w1CloseTest_();_w1CloseFixture_(100,'W1V33BULK');var p={requestId:'v33-bulk-create-20261004',channel:'SHOP',items:[],customerShipping:0,shippingSubsidy:0};for(var i=0;i<100;i++)p.items.push({source:'MAG',sku:'W1V33BULK-'+i,price:390});
 var result=_w1Mutate_('create',p);return 'BULK100 '+result.orderId+' '+result.status+' count='+result.count+' replay='+!!result.replayed+'; same-ID safe to check/retry.';
}
function w1QaBulkReadback20261004(){_w1CloseTest_();var r=_w1Status_('v33-bulk-create-20261004');return JSON.stringify(r);}

function w1QaFinish20261004(){_w1CloseTest_();var requests=_w1Requests_();['v33-check-create-20261004','v33-check-cancel-20261004'].forEach(function(id){if(!requests[id]||requests[id].state!=='DONE')throw new Error('CHECK_RECOVERY_REQUIRED '+id);});if(Object.keys(requests).some(function(id){return requests[id].state!=='DONE';}))throw new Error('RECOVERY_REQUIRED');var large={text:new Array(78001).join('x')},encoded=_w1Encode_(large);if(encoded.indexOf('GZIP:')!==0||_w1Decode_(encoded).text.length!==78000)throw new Error('GZIP_ROUNDTRIP');return _withLock(function(){var old=_w1Requests_()['qa-gzip-20261004'];if(old&&old.state==='DONE')return 'GZIP replay verified; prior R2/R4 closed';_w1Event_({id:'qa-gzip-20261004',attempt:1,action:'QA_GZIP',hash:_w1Hash_(large),snap:{orderId:'',payload:large},entrySource:'isolated test QA'},'DONE',{encoded:encoded.length});if(_w1Requests_()['qa-gzip-20261004'].snap.payload.text.length!==78000)throw new Error('GZIP_JOURNAL_READBACK');return 'R2/R4 previous run completed; real GZIP roundtrip + compressed journal readback PASS. Original check order cancelled. No repeated fixture.';});}
