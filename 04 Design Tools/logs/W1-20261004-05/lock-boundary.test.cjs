const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{fixture}=require('./harness.cjs');
const f=fixture(true);f.item('LOCKED');const p={requestId:'lock-resume-20261004',channel:'SHOP',items:[{source:'GGB',sku:'LOCKED',price:390}],customerShipping:0,shippingSubsidy:0};
const write=f.c._tryWrite;let injected=false;f.c._tryWrite=(label,fn)=>{if(label==='W1 hold batch'&&!injected){injected=true;return false;}return write(label,fn);};assert.throws(()=>f.c._w1Mutate_('create',p),/RECOVERY_REQUIRED/);f.c._tryWrite=write;
const rows=f.c._w1Rows_;let reads=0;f.c._w1Rows_=(name)=>{assert.equal(f.c._W1_LOCK_HELD,true,'No resume metadata/journal read before owning lock');reads++;return rows(name);};
assert.equal(f.c._w1Resume_(p.requestId).status,'PENDING');assert.equal(f.c._w1Resume_(p.requestId).replayed,true);assert(reads>0);assert.equal(f.c._W1_LOCK_HELD,false);
const q=fixture(true);q.item('W1V34CHECK-2','Instock','MAG');vm.runInContext(fs.readFileSync(__dirname+'/W1Qa.gs','utf8'),q.c);
const active=q.c.SpreadsheetApp.getActiveSpreadsheet;q.c.SpreadsheetApp.getActiveSpreadsheet=()=>{assert.equal(q.c._W1_LOCK_HELD,true,'No QA Sheet metadata access before lock');return active();};
assert.equal(JSON.parse(q.c.w1QaV34Ledger()).state,'NEEDS_REVIEW');assert.equal(JSON.parse(q.c.w1QaV34Ledger()).replayed,true);
console.log('PASS resume and duplicate QA-helper metadata reads are inside owned ScriptLock; same execution nests safely; no second mutation on QA replay');
