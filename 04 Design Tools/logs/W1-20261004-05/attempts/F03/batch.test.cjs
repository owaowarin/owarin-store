const fs=require('node:fs'),assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
const p=(n=1,action='create')=>({requestId:'v34-'+action+'-0000001',channel:action==='shopee'?'SHOPEE':'SHOP',items:Array.from({length:n},(_,i)=>({source:i%2?'MAG':'GGB',sku:'TEST-'+i,price:action==='shopee'?630:390})),customerShipping:'50.00',shippingSubsidy:'10.00',labelLater:true});
function setup(n,action){const f=fixture(true);for(let i=0;i<n;i++){f.item('TEST-'+i,'Instock',i%2?'MAG':'GGB');f.item('UNSELECTED-'+i,'Instock',i%2?'MAG':'GGB',{price:999});}let input=p(n,action);if(action==='confirm'||action==='cancel'){const o=f.c._w1Mutate_('create',p(n));input={requestId:input.requestId,orderId:o.orderId,expectedRevision:o.revision,labelLater:true};}return {f,input,run:()=>f.c._w1Mutate_(action==='shopee'?'confirm':action,input)};}
const summary={profiles:[],afterEffect:[],groups:[]};
for(const n of [1,10,100])for(const action of ['create','cancel','confirm','shopee']){
 const x=setup(n,action),f=x.f;let flush=0,writes=0,events=0,reads=0;const originalTry=f.c._tryWrite;f.c._tryWrite=(label,fn)=>{writes++;if(label.startsWith('W1 journal '))events++;return originalTry(label,fn);};f.c.SpreadsheetApp.flush=()=>flush++;
 for(const sh of Object.values(f.sheets)){const range=sh.getRange;sh.getRange=(...args)=>{const r=range(...args),get=r.getValues;r.getValues=()=>{reads++;return get();};return r;};}
 const r=x.run();assert.equal(r.count,n);assert.equal(r.status,action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD');assert.equal(x.run().replayed,true);
 assert.equal(f.c._apiSalesList().rows.filter(r=>r.order===r.order).length,action==='confirm'||action==='shopee'?n:0);
 for(let i=0;i<n;i++){const o=f.c._w1Inv_(i%2?'MAG':'GGB','UNSELECTED-'+i,'').obj;assert.equal(o.status,'Instock');assert.equal(o.price,999);}
 summary.profiles.push({n,action,flush,writes,journalEvents:events,getValues:reads});
}
summary.groups.push('1/10/100 all actions, mixed sources, sparse selected rows, unchanged unselected cells, unique SALES and same-ID replay');
for(const action of ['create','cancel','confirm','shopee']){
 const ref=setup(12,action);let positions=0;const tryWrite=ref.f.c._tryWrite;ref.f.c._tryWrite=(label,fn)=>tryWrite(label,()=>{fn();positions++;});ref.run();
 for(const after of [false,true])for(let position=1;position<=positions;position++){
  const x=setup(12,action),orig=x.f.c._tryWrite;let i=0,hit=false;x.f.c._tryWrite=(label,fn)=>orig(label,()=>{const fail=++i===position;if(fail&&!after){hit=true;throw Error('BEFORE_EFFECT');}fn();if(fail&&after){hit=true;throw Error('AFTER_EFFECT');}});
  assert.throws(x.run);assert(hit);x.f.c._tryWrite=orig;const result=x.run();assert.equal(result.status,action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD');assert.equal(x.run().replayed,true);assert.equal(x.f.c._apiSalesList().rows.length,action==='confirm'||action==='shopee'?12:0);
 }
 summary.afterEffect.push({action,n:12,positions,passes:positions*2});
}
summary.groups.push('Native write/journal/capacity failure before and AFTER effect at every boundary; two batches; exact resume and no duplicate SALES');
{
 const x=setup(12,'shopee'),c=x.f.c._resolveColumns(x.f.sheets.SALES);let dropped=false;x.f.fail((name,row,col,v)=>{if(name==='SALES'&&col===c.price&&!dropped){dropped=true;return 'DROP';}});assert.throws(x.run,/RECOVERY_REQUIRED.*SALES_READBACK/);assert.equal(x.f.c._apiSalesList().rows.length,0);x.f.fail(null);assert.equal(x.run().status,'SOLD');assert.equal(x.f.c._apiSalesList().rows.length,12);
}
summary.groups.push('Arbitrary subset silent-drop in SALES block hidden from reporting, same allocated block repaired without duplication');
for(const missing of [1,2,3,14]){
 const x=setup(12,'create');let dropped=false;x.f.fail((name,row,col)=>{if(name==='ORDER LINES'&&col===missing&&!dropped){dropped=true;return 'DROP';}});assert.throws(x.run,/RESERVATION_DRAFT_READBACK/);assert.equal(x.f.c._w1Rows_('ORDER LINES').filter(r=>r[12]==='RESERVED').length,0);x.f.fail(null);assert.equal(x.run().status,'PENDING');assert.equal(x.f.c._w1Rows_('ORDER LINES').filter(r=>r[12]==='RESERVED').length,12);assert.equal(x.run().replayed,true);
}
summary.groups.push('Missing Order ID/Line ID/UID/snapshot in new line block stays draft, sibling writes blocked; original allocated metadata/claim recovered');
{
 const x=setup(12,'create');x.input.items[0].price='0390.00';let dropped=false;x.f.fail((name,row,col,v)=>{if(v==='Hold'&&!dropped){dropped=true;return true;}});assert.throws(x.run,/RECOVERY_REQUIRED/);x.f.fail(null);const intent=x.f.c._w1Intent_(x.input.requestId);assert.equal(intent.payload.items[0].price,'0390.00');assert.equal(intent.payload.shippingSubsidy,'10.00');assert.equal(x.f.c._w1Hash_(intent.payload),x.f.c._w1Requests_()[x.input.requestId].hash);assert.equal(x.f.c._w1Mutate_('create',intent.payload).status,'PENDING');assert.throws(()=>x.f.c._w1Mutate_('create',{...intent.payload,shippingSubsidy:10}),/REQUEST_PAYLOAD_CONFLICT/);x.f.actor('intruder@test.invalid');assert.throws(()=>x.f.c._w1Intent_(x.input.requestId),/OWNER_ONLY/);
}
summary.groups.push('R6 exact strings/order restored from server intent; mismatch rejected; owner-only');
{
 const x=setup(1,'create'),prepare=x.f.c._w1Prepare_;x.f.c._w1Prepare_=(...args)=>{const s=prepare(...args);delete s.format;delete s.payload;delete s.alloc;return s;};let failed=false;x.f.fail((name,row,col,v)=>{if(v==='Hold'&&!failed){failed=true;return true;}});assert.throws(x.run);x.f.fail(null);assert.throws(()=>x.f.c._w1Intent_(x.input.requestId),/ORIGINAL_INTENT_REQUIRED/);assert.equal(x.run().status,'PENDING');
}
summary.groups.push('Unfinished legacy intent without payload explicitly blocked for server recovery; original payload resumes legacy engine');
{
 const x=setup(12,'shopee'),orig=x.f.c._tryWrite;let changed=false,oldRow;
 x.f.c._tryWrite=(label,fn)=>orig(label,()=>{fn();if(label==='W1 price batch'&&!changed){changed=true;const sh=x.f.sheets['ORDER LINES'];oldRow=sh.rows[1][0];sh.rows[1][0]='FOREIGN';}});assert.throws(x.run,/OWNERSHIP_CONFLICT/);assert(changed);assert.equal(x.f.c._apiSalesList().rows.length,0);x.f.sheets['ORDER LINES'].rows[1][0]=oldRow;x.f.c._tryWrite=orig;assert.equal(x.run().status,'SOLD');
}
summary.groups.push('Claim changed during stock batch: readback rejects and sibling mutations block; exact restore plus original retry succeeds');
fs.writeFileSync(__dirname+'/batch-results.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
