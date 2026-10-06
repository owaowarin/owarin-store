const assert=require('node:assert/strict'),crypto=require('node:crypto'),{fixture}=require('./harness.cjs');
function make(){const f=fixture(true);f.c.Utilities.Charset={UTF_8:'utf8'};f.c.Utilities.computeDigest=(_,s,charset)=>[...crypto.createHash('sha256').update(charset==='utf8'?s:s.replace(/[^\x00-\x7f]/g,'?')).digest()];return f;}
const f=make();f.item('HASH-THAI');
const p={requestId:'unicode-payload-20261004',channel:'SHOP',items:[{source:'GGB',sku:'HASH-THAI',price:390}],customerShipping:0,shippingSubsidy:0,note:'ไทย'};
const changed={...p,note:'ไทน'};
assert.equal(f.c._w1Hash_(p),f.c._w1Hash_(changed));
f.c._w1Mutate_('create',p);const writes=f.writes.length;
if(process.argv.includes('--repro')){assert.equal(f.c._w1Mutate_('create',changed).replayed,true);assert.equal(f.writes.length,writes);console.log('REPRO: different Unicode payload accepted as same request');process.exit(0);}
assert.throws(()=>f.c._w1Mutate_('create',changed),/REQUEST_PAYLOAD_CONFLICT/);assert.equal(f.writes.length,writes);
assert.match(f.c._w1Requests_()[p.requestId].hash,/^u8:/);assert.equal(f.c._w1Resume_(p.requestId).replayed,true);
// In-flight historical request keeps its exact hash/event history on ID-only recovery.
const old=make();old.item('HASH-OLD');const op={...p,requestId:'unicode-legacy-20261004',items:[{source:'GGB',sku:'HASH-OLD',price:'0390.00'}]};
const payloadHash=old.c._w1PayloadHash_;old.c._w1PayloadHash_=v=>old.c._w1Hash_(v);
const write=old.c._tryWrite;let failed=false;old.c._tryWrite=(label,fn)=>{if(label==='W1 hold batch'&&!failed){failed=true;return false;}return write(label,fn);};
assert.throws(()=>old.c._w1Mutate_('create',op),/RECOVERY_REQUIRED/);old.c._tryWrite=write;old.c._w1PayloadHash_=payloadHash;
const prefix=JSON.stringify(old.sheets['ORDER REQUESTS'].rows),oldHash=old.c._w1Requests_()[op.requestId].hash,n=old.sheets['ORDER REQUESTS'].rows.length;
assert.throws(()=>old.c._w1Mutate_('create',{...op,note:'ไทน'}),/REQUEST_PAYLOAD_CONFLICT/);
assert.equal(old.c._w1Resume_(op.requestId).status,'PENDING');assert.equal(old.c._w1Requests_()[op.requestId].hash,oldHash);
assert.equal(JSON.stringify(old.sheets['ORDER REQUESTS'].rows.slice(0,n)),prefix);
console.log('PASS UTF-8 new request hashes, Unicode conflict rejected before writes, same-ID legacy failure recovery preserves every original event/hash');
const edit=make();edit.item('HASH-EDIT');edit.c._apiInvUpdateCore_=p=>{const sh=edit.sheets['GAME GUIDE BOOKS'],c=edit.c._resolveColumns(sh);sh.rows[2][c.name-1]=p.changes.name;return {item:edit.c._readRow(sh,3,'GGB')};};
const ep={requestId:'unicode-edit-20261004',source:'GGB',sku:'HASH-EDIT',changes:{name:'ไทย'}};
edit.c._w1Edit_(ep);const ew=edit.writes.length;assert.throws(()=>edit.c._w1Edit_({...ep,changes:{name:'ไทน'}}),/REQUEST_PAYLOAD_CONFLICT/);assert.equal(edit.writes.length,ew);assert.equal(edit.c._w1Edit_(ep).replayed,true);
const sold=make();sold.item('HASH-SALE');const sp={...p,requestId:'unicode-sale-20261004',channel:'SHOPEE',items:[{source:'GGB',sku:'HASH-SALE',price:630}],labelLater:true};
const sw=sold.c._tryWrite;let lost=false;sold.c._tryWrite=(label,fn)=>{if(label==='W1 SALES block'&&!lost){lost=true;sw(label,fn);return false;}return sw(label,fn);};
assert.throws(()=>sold.c._w1Mutate_('confirm',sp),/RECOVERY_REQUIRED/);sold.c._tryWrite=sw;assert.equal(sold.c._w1Resume_(sp.requestId).status,'SOLD');assert.equal(sold.c._w1Resume_(sp.requestId).replayed,true);
const sc=sold.c._resolveColumns(sold.sheets.SALES);assert.equal(sold.sheets.SALES.rows.filter(r=>r[sc.orderLineId-1]&&r[sc.orderLineId-1]!=='Order Line ID').length,1);
console.log('PASS Unicode edit conflict/replay and UTF-8 sale after-effect failure recovery without duplicate SALES');
