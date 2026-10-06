// Journal keeps the existing 15-column schema and reads old plain JSON events.
function _w1Encode_(value){
 var text=JSON.stringify(value);
 if(text.length>40000)text='GZIP:'+Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(text,'application/json')).getBytes());
 if(text.length>45000)throw new Error('JOURNAL_PAYLOAD_TOO_LARGE');
 return text;
}
function _w1Decode_(text){
 text=String(text);if(text.indexOf('GZIP:')===0)text=Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(text.slice(5)))).getDataAsString('UTF-8');
 return JSON.parse(text);
}
function _w1EnsureRow_(sh,row){
 if(row>sh.getMaxRows())_w1Write_('capacity '+sh.getName(),function(){sh.insertRowsAfter(sh.getMaxRows(),Math.max(50,row-sh.getMaxRows()));});
 if(row>sh.getMaxRows())throw new Error('CAPACITY_READBACK '+sh.getName());
}
function _w1Preflight_(action,s){
 var future=JSON.parse(JSON.stringify(s));
 s.lines.forEach(function(l){['uid','line','hold','sales','price','date','sold','release','finish'].forEach(function(k){future.steps[l.id+'.'+k]='ARMED';});});future.steps.order='ARMED';
 _w1Encode_(future);
 var result={orderId:s.orderId,status:action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD',revision:s.revision,count:s.lines.length,shipping:s.subsidy,labelReadiness:'MISSING',items:(s._previewItems||[]).map(function(o,i){var item=Object.assign({},o),l=s.lines[i];item.itemUid=l.uid;item.status=action==='create'?'Hold':action==='cancel'?l.prior:'Sold';if(action==='confirm'){item.price=l.ledger;item.soldDate=s.created;}return item;})};
 _w1Encode_(result);
}
function _w1Locked_(fn){return typeof _W1_LOCK_HELD!=='undefined'&&_W1_LOCK_HELD?fn():_withLock(fn);}
function _w1ReconcileMaintenance_(id){
 _w1Access_();return _withLock(function(){
  var req=_w1Requests_()[id];if(!req||req.action!=='MAINTENANCE')throw new Error('MAINTENANCE_REQUEST_REQUIRED');if(req.state==='DONE')return {requestId:id,replayed:true};
  var s=req.snap,sh=_getSheetOrThrow(s.sheet),range=sh.getRange(s.range);
  if(JSON.stringify(range.getValues())!==JSON.stringify(s.before)||JSON.stringify(range.getFormulas())!==JSON.stringify(s.beforeFormulas))throw new Error('RESTORE_EXACT_BEFORE_REQUIRED '+id);
  req.attempt++;var result={requestId:id,reconciled:'verified exact before restored',beforeHash:_w1Hash_(s.before)};_w1Event_(req,'DONE',result);return result;
 });
}
function _w1MaintenanceWrite_(label,sh,range,values,after,allowManaged){
 return _w1Locked_(function(){
  _w1Access_();if(allowManaged)_w1TechnicalGate_('');else _w1MenuGuard_(sh);
  var req={id:'maintenance-'+Utilities.getUuid(),attempt:1,action:'MAINTENANCE',hash:_w1Hash_([label,sh.getName(),range.getA1Notation(),values]),entrySource:'sheet/menu/tools',snap:{orderId:'',label:label,sheet:sh.getName(),range:range.getA1Notation(),before:range.getValues(),beforeFormulas:range.getFormulas(),after:values}};
  _w1Encode_(req.snap);_w1Event_(req,'PREPARED');
  try{
   _w1Write_(label,function(){range.setValues(values);});if(JSON.stringify(range.getValues())!==JSON.stringify(values))throw new Error('MAINTENANCE_READBACK');
   if(after)after();req.snap.after=range.getValues();req.snap.afterFormulas=range.getFormulas();
   var result={requestId:req.id,range:req.snap.range,beforeHash:_w1Hash_(req.snap.before),afterHash:_w1Hash_(req.snap.after)};_w1Event_(req,'DONE',result);Logger.log('DONE '+req.id+' '+label);return result;
  }catch(e){try{_w1Event_(req,'NEEDS_REVIEW',null,e.message);}catch(a){throw new Error('PARTIAL_AUDIT '+req.id+' '+e.message);}throw new Error('MAINTENANCE_MANUAL_RECOVERY '+req.id+' '+e.message);}
 });
}
function _w1ExternalEdit_(e){
 // No nested acquisition: a Sheet trigger is its own execution. Serialize its append with transaction appends.
 return _withLock(function(){
  var sh=e.range.getSheet(),c=_resolveColumns(sh);if(!c.itemUid)return false;
  var first=e.range.getRow(),last=first+(e.range.getNumRows?e.range.getNumRows():1)-1,source=_srcCode(sh.getName()),claims=_w1Rows_('ORDER LINES').filter(function(r){return r[3]===source&&(r[12]==='RESERVED'||r[12]==='SOLD');});
  var data=sh.getLastRow()<3?[]:sh.getRange(3,1,sh.getLastRow()-2,sh.getLastColumn()).getValues(),affected=[];
  claims.forEach(function(l){var found=[];data.forEach(function(r,i){if(r[c.itemUid-1]===l[2])found.push(i+3);});
   if(found.length!==1||found[0]>=first&&found[0]<=last)affected.push({orderId:l[0],lineId:l[1],uid:l[2],rows:found,identityConflict:found.length!==1,reservationSnapshot:_w1Decode_(l[13])});
  });
  if(!affected.length)return false;
  var actor=e.user&&e.user.getEmail?e.user.getEmail():Session.getActiveUser().getEmail();
  var req={id:'external-'+Utilities.getUuid(),attempt:1,action:'EXTERNAL_EDIT',actor:actor||'Unknown',entrySource:'sheet/onEdit',hash:_w1Hash_([source,e.range.getA1Notation(),affected]),snap:{orderId:affected[0].orderId,range:e.range.getA1Notation(),source:source,affected:affected,before:e.oldValue===undefined?'Unknown':String(e.oldValue),after:e.value===undefined?'External change; inspect restricted Sheet version history':String(e.value)}};
  _w1Event_(req,'DONE',{external:true,count:affected.length});return true;
 });
}
