const assert=require('node:assert/strict'),crypto=require('node:crypto'),{fixture}=require('./harness.cjs');
const create=(f,sku,id)=>f.c._w1Mutate_('create',{requestId:id,channel:'SHOP',items:[{source:'GGB',sku,price:390}],customerShipping:0,shippingSubsidy:0});
const event=(sh,row,rows=1)=>({range:{getSheet:()=>sh,getRow:()=>row,getNumRows:()=>rows,getA1Notation:()=>rows===1?'M'+row:'M'+row+':M'+(row+rows-1)},oldValue:390,value:391});
{
 const f=fixture(true);f.item('ONE');f.item('TWO');create(f,'ONE','remaining-create-01');const original=f.c._tryWrite;let attempted=false,blocked=false;
 f.c._tryWrite=(label,fn)=>{if(label==='W1 journal PREPARED'&&!attempted){attempted=true;try{f.c._w1ExternalEdit_(event(f.sheets['GAME GUIDE BOOKS'],3));}catch(e){assert.match(e.message,/BUSY/);blocked=true;}}return original(label,fn);};
 create(f,'TWO','remaining-create-02');assert(blocked);assert.equal(f.c._w1ExternalEdit_(event(f.sheets['GAME GUIDE BOOKS'],3)),true);
 const rows=f.c._w1Rows_('ORDER REQUESTS');assert.equal(rows.filter(r=>r[4]==='EXTERNAL_EDIT').length,1);assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);assert.equal(f.c._w1Requests_()['remaining-create-02'].state,'DONE');
 console.log('PASS R1 serialized append: contending mock lock rejects, append after release retains transaction and external event');
}
{
 const f=fixture(true);f.item('FREE');f.item('HELD');create(f,'HELD','remaining-create-03');const sh=f.sheets['GAME GUIDE BOOKS'];assert.equal(f.c._w1ExternalEdit_(event(sh,3,2)),true);
 const c=f.c._resolveColumns(sh);sh.rows[3][c.itemUid-1]='';assert.equal(f.c._w1ExternalEdit_(event(sh,4)),true);const req=Object.values(f.c._w1Requests_()).filter(r=>r.action==='EXTERNAL_EDIT').at(-1);assert(req.snap.affected[0].identityConflict);assert.throws(()=>f.c._w1TechnicalGate_(''),/MANAGED_IDENTITY_CONFLICT/);
 console.log('PASS R2 multi-row and missing UID audit; failclosed identity unchanged');
}
{
 const f=fixture(true);for(let i=0;i<100;i++)f.item('BULK-'+i,'Instock','GGB',{name:'Synthetic '+i+' '+'x'.repeat(200)});f.writes.length=0;
 const p={requestId:'remaining-bulk-01',channel:'SHOP',items:Array.from({length:100},(_,i)=>({source:'GGB',sku:'BULK-'+i,price:390})),customerShipping:0,shippingSubsidy:0};
 const snap=f.c._w1Prepare_('create',p),encoded=f.c._w1Encode_(snap);assert(encoded.startsWith('GZIP:'));assert(encoded.length<45000);assert.equal(JSON.stringify(f.c._w1Decode_(encoded)),JSON.stringify(snap));
 const r=f.c._w1Mutate_('create',p);assert.equal(r.count,100);assert.equal(f.c._w1Requests_()[p.requestId].state,'DONE');assert.equal(f.c._w1Mutate_('create',p).replayed,true);
 assert(f.sheets['ORDER REQUESTS'].getMaxRows()>60);assert(f.sheets['ORDER LINES'].getMaxRows()>60);
 console.log('PASS R3 100-item compressed create / same-ID replay / journal and lines capacity growth; encoded '+encoded.length);
 const g=fixture(true);for(let i=0;i<100;i++)g.item('LARGE-'+i,'Instock','GGB',{name:crypto.randomBytes(1500).toString('hex')});g.writes.length=0;
 assert.throws(()=>g.c._w1Mutate_('create',{...p,requestId:'remaining-large-01',items:Array.from({length:100},(_,i)=>({source:'GGB',sku:'LARGE-'+i,price:390}))}),/JOURNAL_PAYLOAD_TOO_LARGE/);assert.equal(g.writes.length,0);
 console.log('PASS R3 unsupported high-entropy payload rejected before first write');
}
{
 const f=fixture(true);f.item('Z');f.item('A');f.c._fixDerivedFormulasForSheet=()=>{};f.c._sp2RepaintFromRange=()=>{};const r=f.c._toolsSort('GGB');assert(r.requestId);assert.equal(f.c._w1Requests_()[r.requestId].state,'DONE');assert.equal(f.sheets['GAME GUIDE BOOKS'].rows[2][0],'Synthetic A');
 const sh=f.sheets['GAME GUIDE BOOKS'],range=sh.getRange(3,1,2,sh.getLastColumn()),before=range.getValues();f.fail((n,row,col)=>n===sh.getName()&&row===3&&col===2?'FAIL':null);
 assert.throws(()=>f.c._w1MaintenanceWrite_('failure',sh,range,before.slice().reverse()),/MAINTENANCE_MANUAL_RECOVERY/);f.fail(null);const req=Object.values(f.c._w1Requests_()).find(r=>r.state==='NEEDS_REVIEW');assert(req);assert.throws(()=>create(f,'A','remaining-after-01'),/RECOVERY_REQUIRED/);
 assert.throws(()=>f.c._w1ReconcileMaintenance_(req.id),/Unimplemented A1/); // Test below restores through equivalent fake numeric range.
 range.setValues(before);const oldRange=sh.getRange;sh.getRange=(...args)=>typeof args[0]==='string'?range:oldRange(...args);assert.equal(f.c._w1ReconcileMaintenance_(req.id).reconciled,'verified exact before restored');assert.equal(f.c._w1Requests_()[req.id].state,'DONE');
 console.log('PASS R4 sort audit plus partial write failclosed / exact-before reconciliation / no blind replay');
}

{const f=fixture(true);f.item('DERIVED');const sh=f.sheets['GAME GUIDE BOOKS'],range=sh.getRange(3,1,1,sh.getLastColumn()),before=range.getValues();f.c._SP2_WRITE_ERRORS.push('prior error');const ok=f.c._w1MaintenanceWrite_('prior error not new',sh,range,before);assert.equal(f.c._w1Requests_()[ok.requestId].state,'DONE');assert.throws(()=>f.c._w1MaintenanceWrite_('derived failure',sh,range,before,()=>f.c._SP2_WRITE_ERRORS.push('injected formula write failure')),/MAINTENANCE_DERIVED_WRITE/);assert(Object.values(f.c._w1Requests_()).some(r=>r.state==='NEEDS_REVIEW'));console.log('PASS R4 swallowed derived-write error blocks DONE; previous error does not cause false failure');}

{const f=fixture(true);f.item('ESCAPED','Instock','GGB',{name:'x\n'.repeat(24000)});f.writes.length=0;assert.throws(()=>create(f,'ESCAPED','remaining-escaped-01'),/CELL_PAYLOAD_TOO_LARGE/);assert.equal(f.writes.length,0);console.log('PASS R3 escaped plain line snapshot rejected before intent; compressed journal cannot bypass per-cell bound');}
