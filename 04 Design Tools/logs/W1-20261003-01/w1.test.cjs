const assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
let passed=0;function test(n,fn){fn();console.log('PASS '+n);passed++;}
const create=(f,id='create-000000001',sku='ONE',extra={})=>f.c._w1Mutate_('create',{requestId:id,channel:'SHOP',items:[{source:'GGB',sku,price:'390'}],customerShipping:'50',shippingSubsidy:'10',...extra});
const confirm=(f,o,id='confirm-00000001')=>f.c._w1Mutate_('confirm',{requestId:id,orderId:o.orderId,expectedRevision:o.revision,labelLater:true});
const cancel=(f,o,id='cancel-000000001')=>f.c._w1Mutate_('cancel',{requestId:id,orderId:o.orderId,expectedRevision:o.revision});
const stock=(f,sku='ONE')=>f.c._w1Inv_('GGB',sku,'').obj;
test('Create -> Pending -> Cancel; no sale; replay; clear has no server effect',()=>{const f=fixture(true);f.item('ONE');const o=create(f);assert.equal(o.status,'PENDING');assert.equal(stock(f).status,'Hold');assert.equal(f.c._apiSalesList().rows.length,0);assert.equal(create(f).orderId,o.orderId);assert.equal(cancel(f,o).status,'CANCELLED');assert.equal(stock(f).status,'Instock');assert.equal(cancel(f,o).replayed,true);});
test('SHOP confirm snapshot prices, subsidy distinct, one line on timeout/retry',()=>{const f=fixture(true);f.item('ONE');const o=create(f);const sale=confirm(f,o);assert.equal(sale.status,'SOLD');assert.equal(stock(f).status,'Sold');assert.equal(confirm(f,o).replayed,true);const r=f.c._apiSalesList().rows;assert.equal(r.length,1);assert.equal(r[0].price,390);assert.equal(r[0].shipingCost,10);assert.equal(r[0].netProfit,280);assert.throws(()=>cancel(f,{...o,revision:2}),/ORDER_NOT_PENDING/);});
test('Two sessions/requests one copy one winner; independent Pending coexist',()=>{const f=fixture(true);f.item('ONE');f.item('TWO');create(f);assert.throws(()=>create(f,'create-000000002'),/UNAVAILABLE/);create(f,'create-000000003','TWO');assert.equal(f.c._w1List_('PENDING').orders.length,2);});
test('Reject unavailable, missing subsidy, malformed price, duplicate before mutation',()=>{for(const st of ['Auction','Sold','Hold','New Arrival']){const f=fixture(true);f.item('ONE',st);assert.throws(()=>create(f),/UNAVAILABLE/);assert.equal(f.c._w1Rows_('ORDER REQUESTS').length,0);}for(const x of [{shippingSubsidy:''},{shippingSubsidy:undefined},{items:[{source:'GGB',sku:'ONE',price:'390abc'}]},{items:[{source:'GGB',sku:'ONE',price:390},{source:'GGB',sku:'ONE',price:390}]}]){const f=fixture(true);f.item('ONE');assert.throws(()=>create(f,undefined,undefined,x),/INVALID_MONEY|DUPLICATE_CART/);assert.equal(f.c._w1Rows_('ORDER REQUESTS').length,0);}});
test('Direct Shopee no business Pending; price round(entered*0.7-50)',()=>{const f=fixture(true);f.item('ONE');const p={requestId:'shopee-000000001',channel:'SHOPEE',items:[{source:'GGB',sku:'ONE',price:'630'}],customerShipping:'0',shippingSubsidy:'0',labelLater:true};const r=f.c._apiSalesConfirm(p);assert.equal(r.status,'SOLD');assert.equal(stock(f).price,391);assert.equal(f.c._w1List_('PENDING').orders.length,0);assert.equal(f.c._apiSalesConfirm(p).replayed,true);});
test('UID survives sort/PID rename; source namespaces remain distinct',()=>{const f=fixture(true);f.item('ONE');f.item('TWO');const o=create(f);const sh=f.sheets['GAME GUIDE BOOKS'];[sh.rows[2],sh.rows[3]]=[sh.rows[3],sh.rows[2]];sh.rows[3][1]='RENAMED';const r=confirm(f,o);assert.equal(r.items[0].productId,'RENAMED');assert.equal(f.c._apiSalesList().rows[0].note,'ONE');});
test('Duplicate UID/SKU rejected; manual edits and wrong revision do not get overwritten',()=>{const f=fixture(true);f.item('ONE');const o=create(f);const sh=f.sheets['GAME GUIDE BOOKS'];sh.rows[2][2]='Sold';assert.throws(()=>cancel(f,o),/EXTERNAL_CHANGE/);assert.equal(stock(f).status,'Sold');assert.throws(()=>confirm(f,{...o,revision:999}),/REVISION_CONFLICT/);});
test('All legacy writers/status edit fail closed; unauthorized rejected',()=>{const f=fixture(true);f.item('ONE','Auction');assert.throws(()=>f.c._apiMarkSold({requestId:'single-000000001',source:'GGB',sku:'ONE',price:390,channel:'SHOP',customerShipping:0,shippingSubsidy:0,labelLater:true}),/UNAVAILABLE/);assert.throws(()=>f.c._apiInvUpdate({requestId:'edit-00000000001',source:'GGB',sku:'ONE',changes:{status:'Instock'}}),/STATUS_TRANSACTION/);assert.throws(()=>f.c._appendSalesRows([]),/RETIRED/);f.actor('intruder@test.invalid');assert.equal(JSON.parse(f.c.api('orders.list',{})).ok,false);assert.throws(()=>f.c._w1Mutate_('create',{}),/OWNER_ONLY/);});
test('Allocator includes ORDERS, SALES and intent and supports >99',()=>{const f=fixture(true);f.item('ONE');const o=create(f);const s=f.sheets.SALES,c=f.c._resolveColumns(s);s.rows[2]=[];s.rows[2][c.order-1]=o.orderId.replace(/-\d+$/,'-100');assert.ok(f.c._w1NextId_().endsWith('-101'));assert.throws(()=>create(f,undefined,undefined,{shippingSubsidy:11}),/REQUEST_PAYLOAD_CONFLICT/);});
test('Every actual write boundary: Create/Cancel/Confirm, throw before or response lost -> same-ID recovery',()=>{
 for(const action of ['create','cancel','confirm','shopee']){
  function setup(){const f=fixture(true);f.item('ONE');f.item('TWO');let o;if(action==='cancel'||action==='confirm')o=create(f);f.writes.length=0;const p=action==='shopee'?{requestId:'shopee-000000001',channel:'SHOPEE',items:[{source:'GGB',sku:'ONE',price:630}],customerShipping:0,shippingSubsidy:10,labelLater:true}:null;return {f,run:()=>action==='create'?create(f):action==='cancel'?cancel(f,o):action==='confirm'?confirm(f,o):f.c._w1Mutate_('confirm',p)};}
  const reference=setup();reference.run();const count=reference.f.writes.length;
  for(let failAt=1;failAt<=count;failAt++){
   const {f,run}=setup();let i=0,hit=false;f.fail(()=>{i++;if(i===failAt){hit=true;return true;}return false;});assert.throws(run,undefined,action+' boundary '+failAt);assert.ok(hit);f.fail(null);
   let corrupt=false;try{f.c._w1Requests_();}catch(e){assert.match(e.message,/CORRUPT_JOURNAL/);corrupt=true;}
   if(corrupt){assert.throws(run,/CORRUPT_JOURNAL/);continue;} // Partial journal append requires manual recovery, never blind retry.
   let retry;try{retry=run();}catch(e){console.log('FAILED_BOUNDARY '+action+' '+failAt+' '+JSON.stringify(f.writes[failAt-1]));throw e;}assert.equal(retry.status,action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD',action+' retry '+failAt);
   assert.equal(run().replayed,true);
   const sales=f.c._apiSalesList().rows;assert.equal(sales.length,action==='confirm'||action==='shopee'?1:0,action+' boundary '+failAt+' duplicate sale');
  }
  console.log('BOUNDARIES '+action+' '+count);
 }
});
console.log('PASS W1 '+passed+' groups');
test('Managed-item menu guards; unattended common lock preserved; foreign reservation unchanged',()=>{
 const f=fixture(true);f.item('ONE');f.item('TWO');const one=create(f),two=create(f,'create-000000003','TWO');
 assert.throws(()=>f.c._sp2ApplyCore(false,'UP','GAME GUIDE BOOKS'),/MANAGED_ITEMS/);
 assert.throws(()=>f.c._sp2MigrateFlagsCore(false,'GAME GUIDE BOOKS'),/MANAGED_ITEMS/);
 assert.throws(()=>f.c._w1MenuGuard_(f.sheets['GAME GUIDE BOOKS']),/MANAGED_ITEMS/);
 cancel(f,one);assert.equal(stock(f,'TWO').status,'Hold');assert.equal(f.c._w1Get_(two.orderId).status,'PENDING');
 f.actor('');assert.equal(f.c._withLock(()=>42),42);assert.throws(()=>f.c._w1Mutate_('create',{}),/OWNER_ONLY/);
});
test('Multi-item cross-source partial ledger, silent write loss, legacy profit/formula preserved',()=>{
 const f=fixture(true);f.item('ONE');f.item('ONE','Instock','MAG');const s=f.sheets.SALES,c=f.c._resolveColumns(s);s.rows[51]=[];s.rows[51][c.order-1]='LEGACY';s.rows[51][c.price-1]=200;s.rows[51][c.netProfit-1]=100;const legacy=JSON.stringify(s.rows[51]);
 const o=create(f,undefined,undefined,{items:[{source:'GGB',sku:'ONE',price:390},{source:'MAG',sku:'ONE',price:400}]});
 let lost=false;f.fail((n,r,col,v)=>{if(n==='SALES'&&col===c.price&&v===400&&!lost){lost=true;return 'DROP';}});assert.throws(()=>confirm(f,o),/RECOVERY_REQUIRED.*SALES_READBACK/);assert.equal(f.c._apiSalesList().rows.filter(r=>r.order===o.orderId).length,0);
 f.fail(null);confirm(f,o);assert.equal(confirm(f,o).replayed,true);const rows=f.c._apiSalesList().rows.filter(r=>r.order===o.orderId);assert.equal(rows.length,2);assert.equal(rows.reduce((n,r)=>n+r.shipingCost,0),10);assert.equal(JSON.stringify(s.rows[51]),legacy);
});
console.log('PASS W1 '+passed+' groups final');
test('UID/delete/relabel cannot orphan a claim and create another reservation',()=>{
 for(const newUid of ['MANUAL-UID','']){const f=fixture(true);f.item('ONE');const o=create(f),sh=f.sheets['GAME GUIDE BOOKS'],c=f.c._resolveColumns(sh);sh.rows[2][c.itemUid-1]=newUid;sh.rows[2][c.status-1]='Instock';sh.rows[2][c.productId-1]='RENAMED';assert.throws(()=>create(f,'create-000000002','RENAMED'),/MANAGED_IDENTITY_CONFLICT/);assert.equal(f.c._w1List_('PENDING').orders.length,1);}
});
console.log('PASS W1 '+passed+' groups accepted');
test('Actual duplicate UID/SKU rejected before intent; Bangkok midnight starts new sequence',()=>{
 const f=fixture(true);f.item('ONE','Instock','GGB',{itemUid:'DUPLICATE'});f.item('TWO','Instock','MAG',{itemUid:'DUPLICATE'});assert.throws(()=>create(f),/DUPLICATE_UID/);assert.equal(f.c._w1Rows_('ORDER REQUESTS').length,0);
 const d=fixture(true);d.item('ONE');d.item('ONE');assert.throws(()=>create(d),/IDENTITY_CONFLICT/);assert.equal(d.c._w1Rows_('ORDER REQUESTS').length,0);
 const t=fixture(true);let now='2026-10-03T16:59:59Z';t.c.Date=class extends Date{constructor(...args){super(...(args.length?args:[now]));}};assert.match(t.c._w1NextId_(),/^OWA-20261003-01$/);now='2026-10-03T17:00:01Z';assert.match(t.c._w1NextId_(),/^OWA-20261004-01$/);
});
console.log('PASS W1 '+passed+' groups final accepted');

