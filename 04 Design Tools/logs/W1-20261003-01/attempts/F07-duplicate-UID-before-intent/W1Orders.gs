// W1 v32 local/test candidate. Private helpers end in _. No marketplace stock sync.
var W1_HEADERS = {
 'ORDERS':['Order ID','Status','Channel','Created At','Sold At','Cancelled At','Client ID','Subtotal','Customer Shipping','Shipping Subsidy','Total','Recipient Snapshot','Revision','Last Request ID'],
 'ORDER LINES':['Order ID','Line ID','Item UID','Source','SKU Snapshot','Title Snapshot','Condition Snapshot','Cost Snapshot','Entered Price','Ledger Price','Price Basis','Prior Status','Reservation State','Inventory Snapshot'],
 'ORDER REQUESTS':['Event ID','Timestamp','Request ID','Attempt','Action','Payload Hash','Order ID','State','Snapshot','Result','Error','Actor','Entry Source','App Version','Recovery Ref']
};
function _w1Access_(){
 var actor=Session.getActiveUser().getEmail(), owner=Session.getEffectiveUser().getEmail();
 if(!actor || !owner || actor!==owner) throw new Error('OWNER_ONLY');
}
function _w1Write_(label,fn){
 if(!_tryWrite('W1 '+label,fn))throw new Error('WRITE_FAILED '+label+' '+_sp2WriteErrMsg());
 SpreadsheetApp.flush();
}
function _w1String_(v){return v instanceof Date?v.toISOString():String(v==null?'':v);}
function _w1Hash_(v){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(v)).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function _w1Money_(v,field){
 if((typeof v!=='string' && typeof v!=='number') || String(v).trim()==='' || !/^\d+(\.\d{1,2})?$/.test(String(v).trim()))throw new Error('INVALID_MONEY '+field);
 var n=Number(v);if(!isFinite(n)||n>10000000)throw new Error('INVALID_MONEY '+field);return n;
}
function _w1Table_(name){
 var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name), h=W1_HEADERS[name];
 if(!sh)throw new Error('SCHEMA_MISSING '+name);
 var actual=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
 if(JSON.stringify(actual)!==JSON.stringify(h))throw new Error('SCHEMA_MISMATCH '+name);
 return sh;
}
function _w1Rows_(name){var sh=_w1Table_(name),n=sh.getLastRow();return n<2?[]:sh.getRange(2,1,n-1,W1_HEADERS[name].length).getValues();}
function _w1Event_(req,state,result,error){
 var sh=_w1Table_('ORDER REQUESTS'),row=[Utilities.getUuid(),new Date().toISOString(),req.id,req.attempt,req.action,req.hash,req.snap.orderId||'',state,JSON.stringify(req.snap),JSON.stringify(result||null),String(error||'').slice(0,1000),Session.getActiveUser().getEmail(),'web/api','Code v32 / WebApp v32','Request '+req.id+'; retry same payload; never a new ID'];
 var r=sh.getLastRow()+1;_w1Write_('journal '+state,function(){sh.getRange(r,1,1,row.length).setValues([row]);});
 if(JSON.stringify(sh.getRange(r,1,1,row.length).getValues()[0])!==JSON.stringify(row))throw new Error('JOURNAL_READBACK '+req.id);
}
function _w1Requests_(){
 var last={};_w1Rows_('ORDER REQUESTS').forEach(function(r){
  if(!r[0]||!r[2]||!r[4]||!r[5]||!r[7]||!r[8])throw new Error('CORRUPT_JOURNAL manual reconciliation required');
  var snap;try{snap=JSON.parse(r[8]);JSON.parse(r[9]);}catch(e){throw new Error('CORRUPT_JOURNAL '+r[2]);}
  last[r[2]]={id:r[2],attempt:Number(r[3]),action:r[4],hash:r[5],snap:snap,state:r[7],result:JSON.parse(r[9]),error:r[10]};
 });return last;
}
function _w1TechnicalGate_(id){
 var all=_w1Requests_();Object.keys(all).forEach(function(k){if(k!==id && all[k].state!=='DONE')throw new Error('RECOVERY_REQUIRED '+k+' '+all[k].snap.orderId);});
 // Changing/deleting a managed UID must not let the same physical copy acquire a new claim.
 var claims=_w1Rows_('ORDER LINES').filter(function(r){return r[12]==='RESERVED'||r[12]==='SOLD';}),uids={};
 if(claims.length)[GGB_SHEET,MAG_SHEET].forEach(function(n){var sh=_getSheetOrThrow(n);delete _colCache[sh.getSheetId()];var c=_resolveColumns(sh);if(!c.itemUid)throw new Error('MISSING_HEADER '+n+' Item UID');
  if(sh.getLastRow()>=3)sh.getRange(3,c.itemUid,sh.getLastRow()-2,1).getValues().forEach(function(r){if(r[0]){var id=String(r[0]);if(!uids[id])uids[id]={count:0,source:_srcCode(n)};uids[id].count++;}});
 });
 claims.forEach(function(r){var found=uids[r[2]];if(!found||found.count!==1||found.source!==r[3])throw new Error('MANAGED_IDENTITY_CONFLICT '+r[0]+' '+r[1]);});
 return all[id]||null;
}
function _w1Inv_(source,sku,uid){
 if(source!=='GGB'&&source!=='MAG')throw new Error('INVALID_SOURCE');
 var sh=_getSheetOrThrow(_sheetFromCode(source));delete _colCache[sh.getSheetId()];var c=_resolveColumns(sh);
 ['name','productId','status','cost','price','soldDate','itemUid'].forEach(function(k){if(!c[k])throw new Error('MISSING_HEADER '+source+' '+k);});
 var data=sh.getLastRow()<3?[]:sh.getRange(3,1,sh.getLastRow()-2,sh.getLastColumn()).getValues(),hits=[];
 data.forEach(function(r,i){if(_w1String_(r[(uid?c.itemUid:c.productId)-1])===(uid||sku))hits.push(i+3);});
 if(hits.length!==1)throw new Error('IDENTITY_CONFLICT '+source+' '+(uid||sku));
 var r=hits[0],obj=_readRow(sh,r,source);
 if(!obj.productId)throw new Error('SKU_REQUIRED');
 // UID is global across both inventories; SKU is unique within its source.
 if(uid){[GGB_SHEET,MAG_SHEET].forEach(function(n){var s=_getSheetOrThrow(n);delete _colCache[s.getSheetId()];var cc=_resolveColumns(s),values=s.getLastRow()<3?[]:s.getRange(3,cc.itemUid,s.getLastRow()-2,1).getValues();var count=values.filter(function(x){return x[0]===uid;}).length;if(count!==(n===sh.getName()?1:0))throw new Error('DUPLICATE_UID '+uid);});}
 _findRowBySku(sh,c,String(obj.productId));
 return {sh:sh,c:c,row:r,obj:obj};
}
function _w1Snapshot_(o){var s={};['name','publisher','condition','copyFlags','original','cost','price','status','soldDate'].forEach(function(k){s[k]=_w1String_(o[k]);});return s;}
function _w1Check_(line,allowed){
 var x=_w1Inv_(line.source,line.sku,line.uid),now=_w1Snapshot_(x.obj);
 Object.keys(line.before).forEach(function(k){var choices=allowed&&allowed[k]||[line.before[k]];if(choices.indexOf(now[k])<0)throw new Error('EXTERNAL_CHANGE '+line.uid+' '+k);});
 return x;
}
function _w1Claims_(uid){return _w1Rows_('ORDER LINES').filter(function(r){return r[2]===uid && (r[12]==='RESERVED'||r[12]==='SOLD');});}
function _w1GuardItem_(x,orderId){
 var uid=x.obj.itemUid,claims=uid?_w1Claims_(uid):[], status=String(x.obj.status);
 if(claims.length>1)throw new Error('DUPLICATE_CLAIM '+uid);
 if(orderId){if(claims.length!==1 || claims[0][0]!==orderId || claims[0][12]!=='RESERVED' || status!=='Hold')throw new Error('RESERVATION_CONFLICT '+(claims[0]?claims[0][0]:'unowned'));
 }else if(status!=='Instock'||claims.length)throw new Error('UNAVAILABLE '+status+' '+(claims[0]?claims[0][0]:''));
}
function _w1Order_(id){var hits=_w1Rows_('ORDERS').filter(function(r){return r[0]===id;});if(hits.length!==1)throw new Error('ORDER_CONFLICT '+id);return hits[0];}
function _w1NextId_(){
 var prefix='OWA-'+Utilities.formatDate(new Date(),'Asia/Bangkok','yyyyMMdd')+'-', max=0,ids=[];
 _w1Rows_('ORDERS').forEach(function(r){ids.push(r[0]);});_w1Rows_('ORDER REQUESTS').forEach(function(r){ids.push(r[6]);});
 var sh=_getSalesSheet(),c=_resolveColumns(sh);if(sh.getLastRow()>=2)sh.getRange(2,c.order,sh.getLastRow()-1,1).getValues().forEach(function(r){ids.push(r[0]);});
 ids.forEach(function(id){id=String(id);if(id.indexOf(prefix)===0&&/^\d+$/.test(id.slice(prefix.length)))max=Math.max(max,Number(id.slice(prefix.length)));});
 return prefix+('0'+(max+1)).slice(max+1<10?-2:1);
}
function _w1Prepare_(action,p){
 var snap={orderId:p.orderId||'',created:new Date().toISOString(),lines:[],steps:{}};
 if(action==='cancel'||(action==='confirm'&&p.orderId)){
  var o=_w1Order_(p.orderId);if(o[1]!=='PENDING')throw new Error('ORDER_NOT_PENDING');if(String(o[12])!==String(p.expectedRevision))throw new Error('REVISION_CONFLICT');
  snap.orderBefore=o.map(function(v){return v instanceof Date?v.toISOString():v;});snap.channel=o[2];snap.customerShipping=Number(o[8]);snap.subsidy=Number(o[9]);snap.revision=Number(o[12])+1;
  snap.lines=_w1Rows_('ORDER LINES').filter(function(r){return r[0]===p.orderId;}).map(function(r){return {id:r[1],uid:r[2],source:r[3],sku:r[4],title:r[5],condition:r[6],cost:Number(r[7]),entered:Number(r[8]),ledger:Number(r[9]),basis:r[10],prior:r[11],before:JSON.parse(r[13])};});
  if(!snap.lines.length)throw new Error('EMPTY_ORDER');
  snap.lines.forEach(function(l){l.before.status='Hold';var x=_w1Check_(l);_w1GuardItem_(x,p.orderId);});
 }else{
  if(p.channel!=='SHOP'&&p.channel!=='SHOPEE')throw new Error('INVALID_CHANNEL');if(action==='create'&&p.channel!=='SHOP')throw new Error('SHOP_CREATE_ONLY');if(action==='confirm'&&p.channel!=='SHOPEE'&&!p.single)throw new Error('CREATE_SHOP_ORDER_FIRST');
  if(!Array.isArray(p.items)||!p.items.length||p.items.length>100)throw new Error('INVALID_CART');
  snap.channel=p.channel;snap.customerShipping=_w1Money_(p.customerShipping,'Customer Shipping');snap.subsidy=_w1Money_(p.shippingSubsidy,'Shipping Subsidy');snap.revision=1;
  var seen={};p.items.forEach(function(it,i){
   var x=_w1Inv_(it.source,String(it.sku||''),it.itemUid||'');_w1GuardItem_(x,'');
   var key=x.obj.itemUid||(it.source+':'+x.obj.productId);if(seen[key])throw new Error('DUPLICATE_CART_ITEM');seen[key]=true;
   var entered=_w1Money_(it.price,'Entered Price'),ledger=p.channel==='SHOPEE'?Math.round(entered*0.7-50):entered;
   if(ledger<0)throw new Error('NEGATIVE_LEDGER_PRICE');
   snap.lines.push({id:'',uid:x.obj.itemUid||Utilities.getUuid(),source:it.source,sku:x.obj.productId,title:x.obj.baseTitle,condition:String(x.obj.condition),cost:_w1Money_(x.obj.cost,'Cost'),entered:entered,ledger:ledger,basis:p.channel==='SHOPEE'?'round(entered*0.7-50)':'SHOP entered',prior:'Instock',before:_w1Snapshot_(x.obj),newUid:!x.obj.itemUid});
  });snap.orderId=_w1NextId_();snap.lines.forEach(function(l,i){l.id=snap.orderId+'-L'+(i+1);});
 }
 // W1 supports Label later. W2 will add CLIENT/snapshot/renderer, without another sale.
 if(action==='confirm'&&p.labelLater!==true)throw new Error('LABEL_LATER_REQUIRED_W1');
 snap.subtotal=snap.lines.reduce(function(a,l){return a+l.entered;},0);snap.total=snap.subtotal+snap.customerShipping;
 return snap;
}
function _w1Record_(name,id,values,prior){
 var sh=_w1Table_(name),rows=_w1Rows_(name),idx=name==='ORDER LINES'?1:0,hits=[];
 rows.forEach(function(r,i){if(r[idx]===id)hits.push(i+2);});if(hits.length>1)throw new Error('DUPLICATE_RECORD '+id);
 var row=hits.length?hits[0]:sh.getLastRow()+1,old=hits.length?sh.getRange(row,1,1,values.length).getValues()[0]:null;
 if(old&&JSON.stringify(old)===JSON.stringify(values))return;
 if(old && old.some(function(v,i){return v!==values[i] && v!==(prior?prior[i]:'');}))throw new Error('RECORD_CHANGED '+id);
 if(!old){_w1Write_(name+' identity '+id,function(){sh.getRange(row,idx+1).setValue(id);});if(sh.getRange(row,idx+1).getValue()!==id)throw new Error('RECORD_ID_READBACK');}
 _w1Write_(name+' '+id,function(){sh.getRange(row,1,1,values.length).setValues([values]);});
 if(JSON.stringify(sh.getRange(row,1,1,values.length).getValues()[0])!==JSON.stringify(values))throw new Error('RECORD_READBACK '+id);
}
function _w1LineRow_(s,l,state){return [s.orderId,l.id,l.uid,l.source,l.sku,l.title,l.condition,l.cost,l.entered,l.ledger,l.basis,l.prior,state,JSON.stringify(l.before.status==='Hold'?Object.assign({},l.before,{status:l.prior}):l.before)];}
function _w1Step_(req,key,fn){
 // Arm durably before a business write; an interrupted armed step re-reads only allowed before/after values.
 if(req.snap.steps[key]==='DONE'){fn(true);return;}
 if(req.snap.steps[key]!=='ARMED'){req.snap.steps[key]='ARMED';_w1Event_(req,'APPLYING');}
 fn(false);req.snap.steps[key]='DONE';_w1Event_(req,'APPLYING');
}
function _w1Cell_(line,key,value,allowed,verifyOnly){
 var x=_w1Check_(line,allowed),cell=x.sh.getRange(x.row,x.c[key]);
 if(_w1String_(cell.getValue())===_w1String_(value))return;
 if(verifyOnly)throw new Error('INVENTORY_CHANGED '+line.uid+' '+key);
 _w1Write_('inventory '+line.uid+' '+key,function(){cell.setValue(value);});
 if(_w1String_(cell.getValue())!==_w1String_(value))throw new Error('INVENTORY_READBACK '+line.uid+' '+key);
}
function _w1Sales_(s,l,index,verifyOnly){
 var sh=_getSalesSheet();delete _colCache[sh.getSheetId()];var c=_resolveColumns(sh);
 ['order','product','orderDate','cost','price','shipingCost','netProfit','note','productId','orderLineId'].forEach(function(k){if(!c[k])throw new Error('SALES_HEADER '+k);});
 var n=sh.getLastRow(),hits=[];if(n>=2)sh.getRange(2,c.orderLineId,n-1,1).getValues().forEach(function(r,i){if(r[0]===l.id)hits.push(i+2);});if(hits.length>1)throw new Error('DUPLICATE_SALES '+l.id);
 if(!hits.length&&verifyOnly)throw new Error('SALES_MISSING '+l.id);
 var row=hits[0];
 if(!row){
  // ponytail: append outside every existing table/totals/spill; compact the blank capacity only in a separately approved migration.
  row=sh.getMaxRows()+1;_w1Write_('SALES capacity',function(){sh.insertRowsAfter(sh.getMaxRows(),1);});
  _w1Write_('SALES line identity',function(){sh.getRange(row,c.orderLineId).setValue(l.id);});
  if(sh.getRange(row,c.orderLineId).getValue()!==l.id)throw new Error('SALES_ID_READBACK');
 }
 var values={order:s.orderId,product:l.title,orderDate:s.created,cost:l.cost,price:l.ledger,shipingCost:index===0?s.subsidy:0,note:l.sku,productId:l.sku};
 Object.keys(values).forEach(function(k){var cell=sh.getRange(row,c[k]),v=cell.getValue(),expected=values[k];
  if(_w1String_(v)===_w1String_(expected))return;if(v!==''&&v!==null)throw new Error('SALES_CHANGED '+l.id+' '+k);if(verifyOnly)throw new Error('SALES_INCOMPLETE '+l.id);
  _w1Write_('SALES '+l.id+' '+k,function(){cell.setValue(expected);});if(_w1String_(cell.getValue())!==_w1String_(expected))throw new Error('SALES_READBACK '+k);
 });
 var formula='='+_colLetter(c.price)+row+'-'+_colLetter(c.cost)+row+'-'+_colLetter(c.shipingCost)+row,profit=sh.getRange(row,c.netProfit);
 // The allocated row is beyond the original finite spill and table; never touch G2 or existing ledger cells.
 var existing=profit.getFormula();if(existing&&existing!==formula)throw new Error('SALES_FORMULA_CHANGED');
 if(existing!==formula){if(verifyOnly)throw new Error('SALES_FORMULA_MISSING');_w1Write_('SALES profit',function(){profit.setFormula(formula);});}
 if(profit.getFormula()!==formula)throw new Error('SALES_PROFIT_READBACK');
 var profitValue=profit.getValue();if(typeof profitValue!=='number'||profitValue!==l.ledger-l.cost-(index===0?s.subsidy:0))throw new Error('SALES_PROFIT_VALUE');
 return row;
}
function _w1Apply_(req){
 var s=req.snap,action=req.action;
 s.lines.forEach(function(l){if(l.newUid){_w1Step_(req,l.id+'.uid',function(done){
   var x;try{x=_w1Inv_(l.source,l.sku,l.uid);}catch(e){if(String(e.message).indexOf('IDENTITY_CONFLICT')!==0)throw e;x=_w1Inv_(l.source,l.sku,'');if(x.obj.itemUid)throw new Error('UID_CHANGED');if(JSON.stringify(_w1Snapshot_(x.obj))!==JSON.stringify(l.before))throw new Error('EXTERNAL_CHANGE before UID');if(done)throw new Error('UID_MISSING');_w1Write_('assign UID',function(){x.sh.getRange(x.row,x.c.itemUid).setValue(l.uid);});}
   if(_w1Inv_(l.source,l.sku,l.uid).obj.itemUid!==l.uid)throw new Error('UID_READBACK');
  });}});
 if(action!=='cancel')s.lines.forEach(function(l){_w1Step_(req,l.id+'.line',function(done){var row=_w1LineRow_(s,l,'RESERVED'),finished=_w1LineRow_(s,l,'SOLD');if(s.steps[l.id+'.finish']==='DONE')row=finished;if(!s.orderBefore&&!done)_w1Record_('ORDER LINES',l.id,row,null);else{var current=_w1Rows_('ORDER LINES').filter(function(r){return r[1]===l.id;});if(current.length!==1 || (JSON.stringify(current[0])!==JSON.stringify(row)&&!(s.steps[l.id+'.finish']==='ARMED'&&JSON.stringify(current[0])===JSON.stringify(finished))))throw new Error('RESERVATION_CHANGED');}});});
 // Freeze each claim even for direct Shopee confirm. Partial operations block all sibling mutations.
 s.lines.forEach(function(l,i){
  var owned=_w1Rows_('ORDER LINES').filter(function(r){return r[2]===l.uid && r[0]===s.orderId && r[1]===l.id;});if(owned.length!==1)throw new Error('OWNERSHIP_CONFLICT '+l.uid);
  var other=_w1Claims_(l.uid).filter(function(r){return r[0]!==s.orderId;});if(other.length)throw new Error('OWNERSHIP_CONFLICT '+l.uid);
  var desired=action==='cancel'?'RELEASED':'SOLD';if(owned[0][12]!=='RESERVED'&&!(s.steps[l.id+'.finish']&&owned[0][12]===desired))throw new Error('RESERVATION_CHANGED '+l.uid);
  var allowed={status:[l.before.status,'Hold'],price:[l.before.price],soldDate:[l.before.soldDate]};
  if(action==='confirm'){
   if(s.steps[l.id+'.price'])allowed.price.push(String(l.ledger));
   if(s.steps[l.id+'.date'])allowed.soldDate.push(s.created);
   if(s.steps[l.id+'.sold'])allowed.status.push('Sold');
  }else if(action==='cancel'&&s.steps[l.id+'.release'])allowed.status.push(l.prior);
  _w1Check_(l,allowed);
  if(action==='create'||(!s.orderBefore&&action==='confirm'))_w1Step_(req,l.id+'.hold',function(done){if(done&&s.steps[l.id+'.sold']){_w1Check_(l,allowed);return;}_w1Cell_(l,'status','Hold',allowed,done);});
  if(action==='cancel'){
   allowed.status.push(l.prior);_w1Step_(req,l.id+'.release',function(done){_w1Cell_(l,'status',l.prior,allowed,done);});
  }else if(action==='confirm'){
   _w1Step_(req,l.id+'.sales',function(done){_w1Sales_(s,l,i,done);});
   allowed.price.push(String(l.ledger));_w1Step_(req,l.id+'.price',function(done){_w1Cell_(l,'price',l.ledger,allowed,done);});
   allowed.soldDate.push(s.created);_w1Step_(req,l.id+'.date',function(done){_w1Cell_(l,'soldDate',new Date(s.created),allowed,done);});
   allowed.status.push('Sold');_w1Step_(req,l.id+'.sold',function(done){_w1Cell_(l,'status','Sold',allowed,done);});
  }
 });
 var status=action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD',order=[s.orderId,status,s.channel,s.orderBefore?s.orderBefore[3]:s.created,status==='SOLD'?s.created:'',status==='CANCELLED'?s.created:'','',s.subtotal,s.customerShipping,s.subsidy,s.total,'',s.revision,req.id];
 _w1Step_(req,'order',function(done){if(done){if(JSON.stringify(_w1Order_(s.orderId))!==JSON.stringify(order))throw new Error('ORDER_CHANGED');return;}_w1Record_('ORDERS',s.orderId,order,s.orderBefore||null);});
 if(action!=='create')s.lines.forEach(function(l){_w1Step_(req,l.id+'.finish',function(){_w1Record_('ORDER LINES',l.id,_w1LineRow_(s,l,action==='cancel'?'RELEASED':'SOLD'),_w1LineRow_(s,l,'RESERVED'));});});
 return {orderId:s.orderId,status:status,revision:s.revision,count:s.lines.length,shipping:s.subsidy,labelReadiness:'MISSING',items:s.lines.map(function(l){return _w1Inv_(l.source,l.sku,l.uid).obj;})};
}
function _w1Mutate_(action,p){
 _w1Access_();if(!p||!/^[A-Za-z0-9_-]{12,100}$/.test(p.requestId||''))throw new Error('REQUEST_ID_REQUIRED');
 return _withLock(function(){
  var hash=_w1Hash_(p),old=_w1TechnicalGate_(p.requestId),req;
  if(old){if(old.hash!==hash||old.action!==action)throw new Error('REQUEST_PAYLOAD_CONFLICT');if(old.state==='DONE')return Object.assign({},old.result,{replayed:true});req=old;req.attempt++;}
  else{req={id:p.requestId,attempt:1,action:action,hash:hash,snap:_w1Prepare_(action,p)};_w1Event_(req,'PREPARED');}
  try{_w1Event_(req,'APPLYING');var result=_w1Apply_(req);_w1Event_(req,'DONE',result);return result;}
  catch(e){try{_w1Event_(req,'NEEDS_REVIEW',null,e.message);}catch(a){throw new Error('PARTIAL_AUDIT '+req.id+' '+e.message+'; '+a.message);}throw new Error('RECOVERY_REQUIRED '+req.id+' '+e.message);}
 });
}
function _w1List_(status){_w1Access_();var pending=_w1Requests_();var rows=_w1Rows_('ORDERS').map(function(r){var lines=_w1Rows_('ORDER LINES').filter(function(l){return l[0]===r[0];});return {orderId:r[0],status:r[1],channel:r[2],createdAt:r[3],subtotal:r[7],customerShipping:r[8],shippingSubsidy:r[9],total:r[10],revision:r[12],labelReadiness:'MISSING',lines:lines.map(function(l){return {lineId:l[1],itemUid:l[2],source:l[3],sku:l[4],title:l[5],enteredPrice:l[8],ledgerPrice:l[9],priceBasis:l[10]};}),recovery:Object.keys(pending).filter(function(k){return pending[k].snap.orderId===r[0]&&pending[k].state!=='DONE';})};});return {orders:rows.filter(function(o){return !status||status==='ALL'||o.status===status;}).reverse(),recoveries:Object.keys(pending).filter(function(k){return pending[k].state!=='DONE';}).map(function(k){return {requestId:k,orderId:pending[k].snap.orderId,state:pending[k].state,error:pending[k].error};})};}
function _w1Get_(id){var list=_w1List_('ALL').orders.filter(function(o){return o.orderId===id;});if(list.length!==1)throw new Error('ORDER_NOT_FOUND');return list[0];}
function _w1Status_(id){_w1Access_();var r=_w1Requests_()[id];return r?{requestId:id,state:r.state,orderId:r.snap.orderId,error:r.error,data:r.state==='DONE'?r.result:null}:{state:'NOT_FOUND'};}
function _w1EditGuard_(sh,row,ch,requestId){
 _w1Access_();_w1TechnicalGate_(requestId||'');delete _colCache[sh.getSheetId()];var c=_resolveColumns(sh),o=_readRow(sh,row,_srcCode(sh.getName()));
 if(c.itemUid&&o.itemUid&&_w1Claims_(o.itemUid).length)throw new Error('MANAGED_ITEM use Orders; reservation/sale locked');
 if(ch.status!==undefined && (ch.status==='Sold'||ch.status==='Auction'||o.status==='Sold'||o.status==='Auction'))throw new Error('STATUS_TRANSACTION_REQUIRED');
}
function _w1Edit_(p){
 _w1Access_();if(!p||!/^[A-Za-z0-9_-]{12,100}$/.test(p.requestId||''))throw new Error('REQUEST_ID_REQUIRED');
 return _withLock(function(){
  var hash=_w1Hash_(p),old=_w1TechnicalGate_(p.requestId),req;
  if(old){if(old.hash!==hash||old.action!=='edit')throw new Error('REQUEST_PAYLOAD_CONFLICT');if(old.state==='DONE')return Object.assign({},old.result,{replayed:true});
   // Edit's derived SKU/SP-2 work is not automatically replayable. A completed readback can repair only its outcome log.
   req=old;req.attempt++;if(!req.snap.editResult){_w1Event_(req,'NEEDS_REVIEW',null,'Partial edit requires manual reconciliation');throw new Error('EDIT_MANUAL_RECOVERY '+req.id);}
   var current=_w1Inv_(p.source,req.snap.editResult.item.productId,req.snap.editResult.item.itemUid||'');if(_w1Hash_(current.obj)!==req.snap.editHash)throw new Error('EDIT_CHANGED');_w1Event_(req,'DONE',req.snap.editResult);return req.snap.editResult;
  }
  if(p.source!=='GGB'&&p.source!=='MAG')throw new Error('INVALID_SOURCE');
  var sh=_getSheetOrThrow(_sheetFromCode(p.source)),c=_resolveColumns(sh),row=_findRowBySku(sh,c,p.sku),ch=p.changes||{};
  _w1EditGuard_(sh,row,ch);Object.keys(ch).forEach(function(k){if(_EDITABLE.indexOf(k)<0)throw new Error('EDIT_FIELD '+k);if(_NUMERIC[k]&&ch[k]!=='')_w1Money_(ch[k],k);});
  if(ch.status!==undefined&&['Instock','Hold','New Arrival'].indexOf(ch.status)<0)throw new Error('INVALID_STATUS');
  req={id:p.requestId,attempt:1,action:'edit',hash:hash,snap:{orderId:'',source:p.source,sku:p.sku,before:_w1Snapshot_(_readRow(sh,row,p.source)),changes:ch}};_w1Event_(req,'PREPARED');
  try{var result=_apiInvUpdateCore_(p);Object.keys(ch).forEach(function(k){if(k==='name'||k==='condition'||k==='publisher')return;if(_w1String_(result.item[k])!==_w1String_(ch[k]))throw new Error('EDIT_READBACK '+k);});req.snap.editResult=result;req.snap.editHash=_w1Hash_(result.item);_w1Event_(req,'APPLYING',result);_w1Event_(req,'DONE',result);return result;}
  catch(e){try{_w1Event_(req,'NEEDS_REVIEW',null,e.message);}catch(a){throw new Error('PARTIAL_AUDIT '+req.id);}throw new Error('EDIT_MANUAL_RECOVERY '+req.id+' '+e.message);}
 });
}
function _w1MenuGuard_(sh){
 _w1Access_();_w1TechnicalGate_('');var c=_resolveColumns(sh);if(c.itemUid&&sh.getLastRow()>=3){var uids=sh.getRange(3,c.itemUid,sh.getLastRow()-2,1).getValues();if(uids.some(function(r){return r[0]&&_w1Claims_(r[0]).length;}))throw new Error('MANAGED_ITEMS menu write blocked; use Orders or scoped maintenance');}
}
function _w1ExternalEdit_(e){
 var c=_resolveColumns(e.range.getSheet());if(!c.itemUid)return false;
 var sh=e.range.getSheet(),r=e.range.getRow(),uid=r>=3?sh.getRange(r,c.itemUid).getValue():'';
 if(!uid||!_w1Claims_(uid).length)return false;
 // Direct Sheets edits are observed after the fact. Never restore a guessed old value or claim they were prevented.
 var req={id:'external-'+Utilities.getUuid(),attempt:1,action:'EXTERNAL_EDIT',hash:_w1Hash_([uid,e.range.getA1Notation()]),snap:{orderId:_w1Claims_(uid)[0][0],uid:uid,range:e.range.getA1Notation(),before:e.oldValue===undefined?'Unknown':String(e.oldValue),after:'External change detected; inspect restricted Sheet version history'}};
 _w1Event_(req,'DONE',{external:true});return true;
}
function w1SchemaDryRun(){
 _w1Access_();var ss=SpreadsheetApp.getActiveSpreadsheet(),out={sheetId:ss.getId(),changes:[]};
 if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw new Error('TEST_SHEET_ONLY');
 Object.keys(W1_HEADERS).forEach(function(n){if(!ss.getSheetByName(n))out.changes.push('Create '+n);else _w1Table_(n);});
 [GGB_SHEET,MAG_SHEET].forEach(function(n){var sh=_getSheetOrThrow(n);delete _colCache[sh.getSheetId()];if(!_resolveColumns(sh).itemUid)out.changes.push(n+': append Item UID');});
 var sales=_getSalesSheet();delete _colCache[sales.getSheetId()];if(!_resolveColumns(sales).orderLineId)out.changes.push('SALES: append Order Line ID');
 Logger.log(JSON.stringify(out));return out;
}
function w1PrepareTestSchema(){
 _w1Access_();return _withLock(function(){var dry=w1SchemaDryRun(),ss=SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(W1_HEADERS).forEach(function(n){if(!ss.getSheetByName(n)){var sh=ss.insertSheet(n);_w1Write_('headers '+n,function(){sh.getRange(1,1,1,W1_HEADERS[n].length).setValues([W1_HEADERS[n]]);});}_w1Table_(n);});
  [[GGB_SHEET,'Item UID','itemUid'],[MAG_SHEET,'Item UID','itemUid'],[_getSalesSheet().getName(),'Order Line ID','orderLineId']].forEach(function(pair){var sh=_getSheetOrThrow(pair[0]);delete _colCache[sh.getSheetId()];if(!_resolveColumns(sh)[pair[2]]){var col=sh.getLastColumn()+1;if(col>sh.getMaxColumns())_w1Write_('column capacity',function(){sh.insertColumnsAfter(sh.getMaxColumns(),1);});_w1Write_('header '+pair[1],function(){sh.getRange(1,col).setValue(pair[1]);});delete _colCache[sh.getSheetId()];if(!_resolveColumns(sh)[pair[2]])throw new Error('HEADER_READBACK');}});
  Logger.log('PASS W1 test schema '+JSON.stringify(dry));return dry;
 });
}
