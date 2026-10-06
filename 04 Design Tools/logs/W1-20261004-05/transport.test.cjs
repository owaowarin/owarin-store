const assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
const f=fixture(true);f.item('TRANSPORT');
const p={requestId:'transport-intent-20261004',channel:'SHOP',items:[{source:'GGB',sku:'TRANSPORT',price:'0390.00'}],customerShipping:'50.00',shippingSubsidy:'10.00',labelLater:true};
const write=f.c._tryWrite;let injected=false;
f.c._tryWrite=(label,fn)=>{if(label==='W1 hold batch'&&!injected){injected=true;return false;}return write(label,fn);};
assert.throws(()=>f.c._w1Mutate_('create',p),/RECOVERY_REQUIRED/);f.c._tryWrite=write;
function transport(x){if(Array.isArray(x))return x.map(transport);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,transport(x[k])]));return x;}
const saved=f.c._w1Intent_(p.requestId),reordered=transport(saved.payload);
assert.throws(()=>f.c._w1Mutate_('create',reordered),/REQUEST_PAYLOAD_CONFLICT/);
assert.equal(f.c._w1Requests_()[p.requestId].attempt,1);
console.log('REPRO PASS: transport key order changes request hash; no business retry/write');
if(process.argv.includes('--repro'))process.exit(0);
const r=f.c._route('requests.resume',{requestId:p.requestId,payload:{price:999}});
assert.equal(r.status,'PENDING');assert.equal(f.c._w1Requests_()[p.requestId].attempt,2);
assert.equal(f.c._w1Intent_(p.requestId).payload.items[0].price,'0390.00');
assert.equal(f.c._route('requests.resume',{requestId:p.requestId}).replayed,true);
f.actor('other@test.invalid');assert.throws(()=>f.c._route('requests.resume',{requestId:p.requestId}),/OWNER_ONLY/);
console.log('PASS owner-only ID resume loads exact immutable server payload, ignores replacement values, same-ID DONE replay');
