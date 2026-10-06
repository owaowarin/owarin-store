/* W1 Orders UI. Recipient/CLIENT/printing belongs to W2. No PII in browser storage. */
var w1Pending=null,w1Broken=false,w1Busy=false,w1Orders=[],w1Review=null,w1Filter='PENDING';
var W1_KEY='owarin.w1.pending.TEST_OR_PROJECT.v32';
try{var w1Stored=sessionStorage.getItem(W1_KEY);if(w1Stored){w1Pending=JSON.parse(w1Stored);if(!w1Pending||!w1Pending.action||!w1Pending.payload||!/^[A-Za-z0-9_-]{12,100}$/.test(w1Pending.payload.requestId))throw Error('Invalid pending intent');}}catch(e){w1Broken=true;}
function w1Id(){return 'w1-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function w1SyncButtons(){
 ['cActConfirm','cClear','w1Commit','soldGo'].forEach(function(id){$(id).disabled=w1Busy||!!w1Pending||w1Broken;});
 document.querySelectorAll('#cartLines input,#cartCh button,#cartLines button,#cShip,#cShipShop').forEach(function(el){el.disabled=w1Busy||!!w1Pending||w1Broken;});
 $('w1Retry').disabled=w1Busy||w1Broken||!w1Pending;
 $('w1Recovery').textContent=w1Broken?'Recovery record unreadable — reconcile server journal before another mutation':w1Pending?'Uncertain request '+w1Pending.payload.requestId+' — Check / retry same request':'';
}
function w1Run(action,payload){
 if(w1Broken)return Promise.reject(Error('Recovery record unreadable; manual reconciliation required'));
 if(w1Pending)return Promise.reject(Error('Resolve request '+w1Pending.payload.requestId+' first'));
 payload.requestId=payload.requestId||w1Id();w1Pending={action:action,payload:payload};
 try{sessionStorage.setItem(W1_KEY,JSON.stringify(w1Pending));}catch(e){w1Pending=null;return Promise.reject(Error('Cannot retain Request ID; no request sent'));}
 return w1Send();
}
function w1Send(){
 if(w1Busy)return Promise.reject(Error('Request already in progress'));var pending=w1Pending;
 w1Busy=true;w1SyncButtons();
 return callApi(pending.action,pending.payload).then(function(result){
  // Remove recovery record only after canonical server result; a lost response retains it.
  sessionStorage.removeItem(W1_KEY);w1Pending=null;return result;
 }).catch(function(err){
  return callApi('requests.get',{requestId:pending.payload.requestId}).then(function(state){
   if(state.state==='DONE'){sessionStorage.removeItem(W1_KEY);w1Pending=null;return state.data;}
   if(state.state==='NOT_FOUND'){sessionStorage.removeItem(W1_KEY);w1Pending=null;}
   throw Error(err.message+' · Request '+pending.payload.requestId+(state.state!=='NOT_FOUND'?' · Check / retry same request':''));
  },function(){throw Error(err.message+' · Request '+pending.payload.requestId+' · manual journal recovery if lookup fails');});
 }).finally(function(){w1Busy=false;w1SyncButtons();});
}
function w1Saved(result,action){
 if(action==='orders.create'||action==='orders.confirm'||action==='inventory.markSold'){
  S.cart=[];S.shipOverride=null;$('cShipShop').value='';updateCartCount();S.sales.loaded=false;showModal('w1ReviewModal',false);showModal('soldModal',false);
 }
 okToast(result.status+' · '+result.orderId+' · '+(result.labelReadiness==='MISSING'?'Missing label':''));
 showView('orders');load(); // Fresh inventory; do not apply a historical request snapshot to the current cache.
}
function w1Resume(){
 if(!w1Pending||w1Busy)return;var action=w1Pending.action;
 callApi('requests.get',{requestId:w1Pending.payload.requestId}).then(function(state){
  if(state.state==='DONE'){sessionStorage.removeItem(W1_KEY);w1Pending=null;w1SyncButtons();return state.data;}
  return w1Send();
 }).then(function(r){if(action==='inventory.update'){load();okToast('Edit recovered');}else w1Saved(r,action);}).catch(function(e){toast(e.message);});
}
function w1CartPayload(){
 return {channel:S.cartChannel,items:S.cart.map(function(c){return {source:c.source,sku:c.sku,itemUid:c.itemUid||'',price:c.price};}),customerShipping:String(cartShipping()),shippingSubsidy:$('cShipShop').value.trim(),labelLater:true};
}
function w1StrictMoney(v){return /^\d+(\.\d{1,2})?$/.test(String(v).trim())?Number(v):null;}
function confirmSold(){
 if(!S.cart.length){toast('Cart is empty');return;}var p=w1CartPayload();
 if(w1StrictMoney(p.customerShipping)===null||w1StrictMoney(p.shippingSubsidy)===null||p.items.some(function(i){return w1StrictMoney(i.price)===null;})){toast('Enter valid prices, Customer Shipping and Shipping Subsidy (0 is allowed)');return;}
 if(S.cartChannel==='SHOP')w1Run('orders.create',p).then(function(r){w1Saved(r,'orders.create');}).catch(function(e){toast(e.message);});
 else w1OpenReview(p,null);
}
function w1OpenReview(payload,order){
 w1Review={payload:payload,order:order,action:'orders.confirm'};$('w1ReviewTitle').textContent='Final review';$('w1Commit').textContent='Confirm sold · Label later';var lines=order?order.lines:payload.items.map(function(it){var r=findBySku(it.source,it.sku);return {title:r?r.baseTitle:it.sku,sku:it.sku,enteredPrice:Number(it.price),ledgerPrice:payload.channel==='SHOPEE'?Math.round(Number(it.price)*0.7-50):Number(it.price)};});
 var channel=order?order.channel:payload.channel,customer=order?order.customerShipping:payload.customerShipping,subsidy=order?order.shippingSubsidy:payload.shippingSubsidy;
 $('w1ReviewContent').innerHTML='<p>'+esc(order?order.orderId:'New '+channel+' sale')+'</p>'+lines.map(function(l){return '<p>'+esc(l.title)+' <span class="sku">'+esc(l.sku)+'</span> · entered '+money(l.enteredPrice)+' · SALES '+money(l.ledgerPrice)+'</p>';}).join('')+'<p>Customer Shipping '+money(customer)+' · Shipping Subsidy (shop contribution) '+money(subsidy)+'</p><p>Total '+money(lines.reduce(function(n,l){return n+Number(l.enteredPrice);},0)+Number(customer))+'</p><p class="hint">Label later — CLIENT and label completion will be added in W2.</p>';
 showModal('w1ReviewModal',true);w1SyncButtons();
}
function w1LoadOrders(){
 callApi('orders.list',{status:w1Filter}).then(function(data){w1Orders=data.orders;renderOrders(data.recoveries);}).catch(function(e){$('w1Board').textContent=e.message;});
}
function renderOrders(recoveries){
 $('w1Board').innerHTML=w1Orders.map(function(o){return '<article class="w1-card"><h3>'+esc(o.orderId)+'</h3><p>'+esc(o.status)+' · '+esc(o.channel)+' · '+o.lines.length+' item(s)</p><p class="hint">'+esc(o.createdAt)+'</p>'+o.lines.slice(0,3).map(function(l){return '<p>'+esc(l.title)+'</p>';}).join('')+(o.lines.length>3?'<p>+'+(o.lines.length-3)+' items</p>':'')+'<p>'+money(o.total)+' · Missing label</p><button class="btn small" data-order="'+esc(o.orderId)+'" data-op="details">Details</button>'+(o.status==='PENDING'&&!o.recovery.length?'<button class="btn small" data-order="'+esc(o.orderId)+'" data-op="cancel">Cancel</button><button class="btn primary small" data-order="'+esc(o.orderId)+'" data-op="confirm">Confirm sold</button>':'')+(o.status==='SOLD'?'<p class="hint">Complete label: W2</p>':'')+(o.recovery.length?'<p class="cl-warn">Recovery required '+esc(o.recovery.join(', '))+'</p>':'')+'</article>';}).join('')||'<div class="empty">No '+esc(w1Filter)+' orders</div>';
 $('w1ServerRecovery').textContent=(recoveries||[]).map(function(r){return 'Recovery '+r.requestId+' · '+r.orderId+' · '+r.error;}).join('\n');w1SyncButtons();
}
$('navOrders').addEventListener('click',function(){showView('orders');});
$('w1Filter').addEventListener('change',function(){w1Filter=this.value;w1LoadOrders();});
$('w1Refresh').addEventListener('click',w1LoadOrders);
$('w1Retry').addEventListener('click',w1Resume);
$('w1Board').addEventListener('click',function(e){
 var b=e.target.closest('[data-order]');if(!b)return;var o=w1Orders.filter(function(x){return x.orderId===b.getAttribute('data-order');})[0],op=b.getAttribute('data-op');if(!o)return;
 if(op==='cancel')w1OpenCancel(o);
 else if(op==='confirm')w1OpenReview({orderId:o.orderId,expectedRevision:o.revision,labelLater:true},o);
 else{$('w1Details').textContent=o.orderId+' · '+o.status+'\n'+o.lines.map(function(l){return l.title+' · '+l.sku+' · entered '+l.enteredPrice+' · SALES '+l.ledgerPrice;}).join('\n')+'\nCustomer Shipping '+o.customerShipping+' · Shipping Subsidy '+o.shippingSubsidy;}
});
function w1OpenCancel(order){w1Review={action:'orders.cancel',payload:{orderId:order.orderId,expectedRevision:order.revision}};$('w1ReviewTitle').textContent='Cancel order';$('w1ReviewContent').innerHTML='<p>'+esc(order.orderId)+'</p><p>Release only this order’s reservation. Other Pending orders remain reserved.</p>';$('w1Commit').textContent='Confirm cancel';showModal('w1ReviewModal',true);w1SyncButtons();}
$('w1Commit').addEventListener('click',function(){if(!w1Review)return;var action=w1Review.action;w1Run(action,w1Review.payload).then(function(r){showModal('w1ReviewModal',false);w1Saved(r,action);}).catch(function(e){toast(e.message);});});