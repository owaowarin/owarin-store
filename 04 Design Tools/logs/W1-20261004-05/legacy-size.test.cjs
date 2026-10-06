const assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
for(const size of [undefined,10]){
 const f=fixture(true);for(let i=0;i<24;i++)f.item('OLD-'+i);const prepare=f.c._w1Prepare_;f.c._w1Prepare_=(...args)=>{const s=prepare(...args);if(size===undefined)delete s.batchSize;else s.batchSize=size;return s;};const p={requestId:'v34-old-size-'+String(size),channel:'SHOP',items:Array.from({length:24},(_,i)=>({source:'GGB',sku:'OLD-'+i,price:390})),customerShipping:0,shippingSubsidy:0};let injected=false;f.fail((n,row,col,v)=>{if(v==='Hold'&&!injected){injected=true;return true;}});assert.throws(()=>f.c._w1Mutate_('create',p));f.fail(null);const intent=f.c._w1Intent_(p.requestId);assert.equal(f.c._w1Mutate_('create',intent.payload).count,24);assert.equal(f.c._w1Mutate_('create',p).replayed,true);
}
{
 const f=fixture(true);f.item('BAD');const prepare=f.c._w1Prepare_;f.c._w1Prepare_=(...args)=>{const s=prepare(...args);s.batchSize=-1;return s;};assert.throws(()=>f.c._w1Mutate_('create',{requestId:'v34-corrupt-size-0001',channel:'SHOP',items:[{source:'GGB',sku:'BAD',price:390}],customerShipping:0,shippingSubsidy:0}),/CORRUPT_BATCH_SIZE/);assert.equal(f.c._w1Rows_('ORDERS').length,0);assert.equal(f.c._w1Inv_('GGB','BAD','').obj.status,'Instock');assert.equal(f.c._w1Inv_('GGB','BAD','').obj.itemUid,'');
}
console.log('PASS old absent/10 batch size exact-intent retry; malformed batch size blocked before business writes');
