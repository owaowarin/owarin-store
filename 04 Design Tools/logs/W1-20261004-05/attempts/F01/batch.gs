// v34: bounded W1 batches, not atomic Sheets transactions. Legacy intents replay through the original engine.
function _w1Apply_(req){return req.snap.format===2?_w1ApplyBatched_(req):_w1ApplyLegacy_(req);}
function _w1Intent_(id){
 _w1Access_();var r=_w1Requests_()[id];if(!r)throw new Error('REQUEST_NOT_FOUND');
 if(['create','cancel','confirm'].indexOf(r.action)<0||!r.snap.payload)throw new Error('ORIGINAL_INTENT_REQUIRED manual recovery');
 if(r.snap.payload.requestId!==id||_w1Hash_(r.snap.payload)!==r.hash)throw new Error('CORRUPT_INTENT');
 return {action:'orders.'+r.action,payload:r.snap.payload,state:r.state};
}
function _w1View_(){
 var view={sources:{},uids:{}};
 [GGB_SHEET,MAG_SHEET].forEach(function(name){
  var sh=_getSheetOrThrow(name),matrix=sh.getRange(1,1,Math.max(1,sh.getLastRow()),sh.getLastColumn()).getValues(),c={},source=_srcCode(name);
  matrix[0].forEach(function(h,i){var k=HEADER_MAP[_normHeader(h)];if(k&&!c[k])c[k]=i+1;});
  ['name','productId','status','cost','price','soldDate','itemUid'].forEach(function(k){if(!c[k])throw new Error('MISSING_HEADER '+source+' '+k);});
  _colCache[sh.getSheetId()]=c;var data=matrix.slice(2),bySku={},byUid={};
  data.forEach(function(r,i){var uid=String(r[c.itemUid-1]||''),sku=String(r[c.productId-1]||'').trim(),x={sh:sh,c:c,row:i+3,obj:_rowToObj(r,c,i+3,source)};
   if(sku)(bySku[sku]||(bySku[sku]=[])).push(x);if(uid){(byUid[uid]||(byUid[uid]=[])).push(x);view.uids[uid]=(view.uids[uid]||0)+1;}
  });view.sources[source]={sh:sh,c:c,bySku:bySku,byUid:byUid};
 });return view;
}
function _w1ViewFind_(view,l,allowMissing){
 var src=view.sources[l.source];if(!src)throw new Error('INVALID_SOURCE');
 var hits=l.uid?src.byUid[l.uid]||[]:src.bySku[l.sku]||[];
 if(!hits.length&&l.uid&&allowMissing&&l.newUid&&!view.uids[l.uid])hits=src.bySku[l.sku]||[];
 if(hits.length!==1)throw new Error('IDENTITY_CONFLICT '+l.source+' '+(l.uid||l.sku));
 var x=hits[0],uid=String(x.obj.itemUid||'');
 if(l.uid&&uid!==l.uid&&!(allowMissing&&l.newUid&&!uid))throw new Error('UID_CHANGED');
 if(uid&&view.uids[uid]!==1)throw new Error('DUPLICATE_UID '+uid);
 if(!x.obj.productId||(src.bySku[x.obj.productId]||[]).length!==1)throw new Error('IDENTITY_CONFLICT duplicate SKU '+x.obj.productId);
 return x;
}
function _w1Assert_(l,obj,allowed){
 var now=_w1Snapshot_(obj);Object.keys(l.before).forEach(function(k){if((allowed&&allowed[k]||[l.before[k]]).indexOf(now[k])<0)throw new Error('EXTERNAL_CHANGE '+l.uid+' '+k);});
}
function _w1Allowed_(s,l,index,action){
 var chunk=Math.floor(index/10),a={status:[l.before.status],price:[l.before.price],soldDate:[l.before.soldDate]};
 if(s.steps['hold:'+chunk])a.status.push('Hold');
 if(action==='confirm'){if(s.steps['price:'+chunk])a.price.push(String(l.ledger));if(s.steps['date:'+chunk])a.soldDate.push(s.created);if(s.steps['sold:'+chunk])a.status.push('Sold');}
 if(action==='cancel'&&s.steps['release:'+chunk])a.status.push(l.prior);
 return a;
}
function _w1BatchWrite_(label,fn){if(!_tryWrite('W1 '+label,fn))throw new Error('WRITE_FAILED '+label+' '+_sp2WriteErrMsg());}
function _w1Batch_(req,key,write,verify){
 var steps=req.snap.steps;if(steps[key]==='DONE'){verify(true);return;}
 if(steps[key]!=='ARMED'){steps[key]='ARMED';_w1Event_(req,'APPLYING');}
 write();SpreadsheetApp.flush();verify(false);steps[key]='DONE';_w1Event_(req,'APPLYING');
}
function _w1Runs_(targets,fn){
 targets.sort(function(a,b){return a.source.localeCompare(b.source)||a.row-b.row;});
 for(var i=0;i<targets.length;){var end=i+1;while(end<targets.length&&targets[end].source===targets[i].source&&targets[end].row===targets[end-1].row+1)end++;fn(targets.slice(i,end));i=end;}
}
function _w1StockBatch_(req,part,start,phase,key,value){
 var s=req.snap,action=req.action,batchKey=phase+':'+Math.floor(start/10);
 function read(verify){var view=_w1View_(),targets=[];
  part.forEach(function(l,j){var index=start+j,x=_w1ViewFind_(view,l,phase==='uid'),a=_w1Allowed_(s,l,index,action);_w1Assert_(l,x.obj,a);
   var expected=value(l,index),actual=_w1String_(x.obj[key]),later=phase==='hold'&&s.steps['sold:'+Math.floor(index/10)]&&actual==='Sold';
   if(verify&&actual!==_w1String_(expected)&&!later)throw new Error('INVENTORY_READBACK '+l.uid+' '+key);
   if(phase==='uid'&&verify&&x.obj.itemUid!==l.uid)throw new Error('UID_READBACK');
   targets.push({source:l.source,row:x.row,sh:x.sh,c:x.c,l:l,index:index,value:expected,skip:actual===_w1String_(expected)||later});
  });return targets;
 }
 _w1Batch_(req,batchKey,function(){var targets=read(false).filter(function(x){return !x.skip;});
  _w1Runs_(targets,function(run){var first=run[0],range=first.sh.getRange(first.row,1,run.length,first.sh.getLastColumn()),current=range.getValues();
   run.forEach(function(x,j){var obj=_rowToObj(current[j],x.c,x.row,x.source),uid=String(obj.itemUid||'');if(uid!==x.l.uid&&!(phase==='uid'&&x.l.newUid&&!uid))throw new Error('UID_CHANGED');_w1Assert_(x.l,obj,_w1Allowed_(s,x.l,x.index,action));});
   _w1BatchWrite_(phase+' batch',function(){first.sh.getRange(first.row,first.c[key],run.length,1).setValues(run.map(function(x){return [x.value];}));});
  });
 },function(){read(true);});
}
function _w1LineBatch_(req,part,start,finish){
 var s=req.snap,action=req.action,sh=_w1Table_('ORDER LINES'),batchKey=(finish?'finish:':'line:')+Math.floor(start/10),desired=finish?(action==='cancel'?'RELEASED':'SOLD'):'RESERVED';
 function inspect(verify){var rows=_w1Rows_('ORDER LINES'),targets=[];
  part.forEach(function(l,j){var matches=[];rows.forEach(function(r,i){if(r[1]===l.id)matches.push(i+2);});if(matches.length>1)throw new Error('DUPLICATE_RECORD '+l.id);
   var row=s.orderBefore?matches[0]:s.alloc.lines+start+j;if(!row)throw new Error('RESERVATION_MISSING');if(matches.length&&matches[0]!==row)throw new Error('RECORD_MOVED '+l.id);
   var old=rows[row-2]||new Array(14).fill(''),expected=_w1LineRow_(s,l,desired),later=!finish&&s.steps['finish:'+Math.floor((start+j)/10)],finalRow=_w1LineRow_(s,l,action==='cancel'?'RELEASED':'SOLD');
   if(later&&JSON.stringify(old)===JSON.stringify(finalRow)){targets.push({source:'LINE',row:row,expected:finalRow,skip:true});return;}
   if(verify&&JSON.stringify(old)!==JSON.stringify(expected))throw new Error('RESERVATION_READBACK '+l.id);
   if(!verify){var prior=finish?_w1LineRow_(s,l,'RESERVED'):null;if(s.orderBefore&&!finish&&JSON.stringify(old)!==JSON.stringify(expected))throw new Error('RESERVATION_CHANGED');old.forEach(function(v,k){if(v!==expected[k]&&v!==(prior?prior[k]:''))throw new Error('RECORD_CHANGED '+l.id);});}
   targets.push({source:'LINE',row:row,expected:expected,skip:JSON.stringify(old)===JSON.stringify(expected)});
  });return targets;
 }
 _w1Batch_(req,batchKey,function(){var targets=inspect(false).filter(function(x){return !x.skip;});if(targets.length)_w1EnsureRow_(sh,Math.max.apply(null,targets.map(function(x){return x.row;})));
  _w1Runs_(targets,function(run){_w1BatchWrite_('ORDER LINES batch',function(){sh.getRange(run[0].row,1,run.length,14).setValues(run.map(function(x){return x.expected;}));});});
 },function(){inspect(true);});
}
function _w1OwnBatch_(req,part,start){
 var rows=_w1Rows_('ORDER LINES'),s=req.snap,view=_w1View_();
 part.forEach(function(l,j){var claims=rows.filter(function(r){return r[2]===l.uid&&(r[12]==='RESERVED'||r[12]==='SOLD');}),owned=rows.filter(function(r){return r[2]===l.uid&&r[0]===s.orderId&&r[1]===l.id;});
  if(owned.length!==1||claims.some(function(r){return r[0]!==s.orderId||r[1]!==l.id;}))throw new Error('OWNERSHIP_CONFLICT '+l.uid);
  var finalState=req.action==='cancel'?'RELEASED':'SOLD';if(owned[0][12]!=='RESERVED'&&!(s.steps['finish:'+Math.floor((start+j)/10)]&&owned[0][12]===finalState))throw new Error('RESERVATION_CHANGED');
  var x=_w1ViewFind_(view,l,false);_w1Assert_(l,x.obj,_w1Allowed_(s,l,start+j,req.action));
 });
}
function _w1SalesBatch_(req,part,start){
 var s=req.snap,sh=_getSalesSheet();delete _colCache[sh.getSheetId()];var c=_resolveColumns(sh),cols=sh.getLastColumn(),row=s.alloc.sales+start;
 ['order','product','orderDate','cost','price','shipingCost','netProfit','note','productId','orderLineId'].forEach(function(k){if(!c[k])throw new Error('SALES_HEADER '+k);});
 var expected=part.map(function(l,j){var r=new Array(cols).fill(''),index=start+j,values={order:s.orderId,product:l.title,orderDate:s.created,cost:l.cost,price:l.ledger,shipingCost:index===0?s.subsidy:0,note:l.sku,productId:l.sku,orderLineId:l.id};Object.keys(values).forEach(function(k){r[c[k]-1]=values[k];});r[c.netProfit-1]='='+_colLetter(c.price)+(row+j)+'-'+_colLetter(c.cost)+(row+j)+'-'+_colLetter(c.shipingCost)+(row+j);return r;});
 function inspect(verify){var n=sh.getLastRow(),ids=n>=2?sh.getRange(2,c.orderLineId,n-1,1).getValues():[];
  part.forEach(function(l,j){var hits=[];ids.forEach(function(r,i){if(r[0]===l.id)hits.push(i+2);});if(hits.length>1||hits.length&&hits[0]!==row+j)throw new Error('DUPLICATE_SALES '+l.id);});
  if(row+part.length-1>sh.getMaxRows()){if(verify)throw new Error('SALES_CAPACITY_READBACK');return false;}
  var range=sh.getRange(row,1,part.length,cols),values=range.getValues(),formulas=range.getFormulas(),complete=true;
  values.forEach(function(r,j){r.forEach(function(v,k){var expectedValue=expected[j][k],actual=k===c.netProfit-1?formulas[j][k]:v;if(_w1String_(actual)===_w1String_(expectedValue)){if(k===c.netProfit-1&&verify&&v!==part[j].ledger-part[j].cost-(start+j===0?s.subsidy:0))throw new Error('SALES_PROFIT_VALUE');return;}complete=false;if(verify||actual!==''&&actual!==null)throw new Error('SALES_CHANGED '+part[j].id+' '+k);});});return complete;
 }
 _w1Batch_(req,'sales:'+Math.floor(start/10),function(){if(inspect(false))return;var end=s.alloc.sales+s.lines.length-1;if(sh.getMaxRows()<end)_w1BatchWrite_('SALES capacity',function(){sh.insertRowsAfter(sh.getMaxRows(),end-sh.getMaxRows());});if(sh.getMaxRows()<end)throw new Error('CAPACITY_READBACK');inspect(false);_w1BatchWrite_('SALES block',function(){sh.getRange(row,1,part.length,cols).setValues(expected);});},function(){inspect(true);});
}
function _w1ApplyBatched_(req){
 var s=req.snap,action=req.action;
 function each(fn){for(var i=0;i<s.lines.length;i+=10)fn(s.lines.slice(i,i+10),i);}
 each(function(part,start){if(part.some(function(l){return l.newUid;}))_w1StockBatch_(req,part,start,'uid','itemUid',function(l){return l.uid;});});
 if(action!=='cancel')each(function(part,start){_w1LineBatch_(req,part,start,false);});
 each(function(part,start){_w1OwnBatch_(req,part,start);
  if(action==='create'||(!s.orderBefore&&action==='confirm'))_w1StockBatch_(req,part,start,'hold','status',function(){return 'Hold';});
  if(action==='cancel')_w1StockBatch_(req,part,start,'release','status',function(l){return l.prior;});
 });
 if(action==='confirm'){
  each(function(part,start){_w1OwnBatch_(req,part,start);_w1SalesBatch_(req,part,start);});
  each(function(part,start){_w1StockBatch_(req,part,start,'price','price',function(l){return l.ledger;});});
  each(function(part,start){_w1StockBatch_(req,part,start,'date','soldDate',function(){return new Date(s.created);});});
  each(function(part,start){_w1StockBatch_(req,part,start,'sold','status',function(){return 'Sold';});});
 }
 var status=action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD',order=[s.orderId,status,s.channel,s.orderBefore?s.orderBefore[3]:s.created,status==='SOLD'?s.created:'',status==='CANCELLED'?s.created:'','',s.subtotal,s.customerShipping,s.subsidy,s.total,'',s.revision,req.id];
 _w1Step_(req,'order',function(done){if(done){if(JSON.stringify(_w1Order_(s.orderId))!==JSON.stringify(order))throw new Error('ORDER_CHANGED');return;}_w1Record_('ORDERS',s.orderId,order,s.orderBefore||null);});
 if(action!=='create')each(function(part,start){_w1LineBatch_(req,part,start,true);});
 var view=_w1View_(),items=s.lines.map(function(l,i){var x=_w1ViewFind_(view,l,false);_w1Assert_(l,x.obj,_w1Allowed_(s,l,i,action));if(x.obj.status!==(action==='create'?'Hold':action==='cancel'?l.prior:'Sold'))throw new Error('FINAL_STOCK_READBACK');return x.obj;});
 return {orderId:s.orderId,status:status,revision:s.revision,count:s.lines.length,shipping:s.subsidy,labelReadiness:'MISSING',items:items};
}
