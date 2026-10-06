// REVIEW-20261004-01: bounded diagnostic reproductions; no candidate or Google writes.
const assert=require('node:assert/strict'),{fixture}=require('../W1-20261004-01/harness.cjs');
function create(f,sku,id){return f.c._w1Mutate_('create',{requestId:id,channel:'SHOP',items:[{source:'GGB',sku,price:390}],customerShipping:0,shippingSubsidy:0});}
function event(sh,row,col='M',rows=1){return {range:{getSheet:()=>sh,getRow:()=>row,getNumRows:()=>rows,getColumn:()=>13,getNumColumns:()=>1,getA1Notation:()=>col+row+(rows>1?':'+col+(row+rows-1):'')},oldValue:390};}
{
 const f=fixture(true);f.item('ONE');f.item('TWO');create(f,'ONE','review-create-0001');
 const original=f.c._tryWrite;let injected=false,auditId;
 f.c._tryWrite=function(label,fn){
  if(label==='W1 journal PREPARED'&&!injected){injected=true;assert.equal(f.c._w1ExternalEdit_(event(f.sheets['GAME GUIDE BOOKS'],3)),true);auditId=f.c._w1Rows_('ORDER REQUESTS').filter(r=>r[4]==='EXTERNAL_EDIT').at(-1)[0];}
  return original(label,fn);
 };
 create(f,'TWO','review-create-0002');
 assert(injected&&auditId);assert(!f.c._w1Rows_('ORDER REQUESTS').some(r=>r[0]===auditId));
 console.log('CONFIRMED R1: interleave unlocked EXTERNAL_EDIT between journal row allocation/write; completed audit event overwritten by PREPARED.');
}
{
 const f=fixture(true);f.item('FREE');f.item('HELD');create(f,'HELD','review-create-0003');
 const sh=f.sheets['GAME GUIDE BOOKS'],before=f.c._w1Rows_('ORDER REQUESTS').length;
 assert.equal(f.c._w1ExternalEdit_(event(sh,3,'M',2)),false);
 assert.equal(f.c._w1Rows_('ORDER REQUESTS').length,before);
 console.log('CONFIRMED R2a: multi-row edit starting on unclaimed row skips managed second row; no audit event.');
 const c=f.c._resolveColumns(sh);sh.rows[3][c.itemUid-1]='';
 assert.equal(f.c._w1ExternalEdit_(event(sh,4,'AA')),false);
 assert.throws(()=>f.c._w1TechnicalGate_(''),/MANAGED_IDENTITY_CONFLICT/);
 console.log('CONFIRMED R2b: deleted managed UID skips audit; transaction gate still rejects MANAGED_IDENTITY_CONFLICT (no demonstrated duplicate sale).');
}
{
 const f=fixture(true);for(let i=0;i<100;i++)f.item('BULK-'+i,'Instock','GGB',{name:'Synthetic '+String(i)+' '+ 'x'.repeat(200)});
 const p={requestId:'review-size-00001',channel:'SHOP',items:Array.from({length:100},(_,i)=>({source:'GGB',sku:'BULK-'+i,price:390})),customerShipping:0,shippingSubsidy:0};
 const snap=f.c._w1Prepare_('create',p);console.log('MEASURED R3: accepted 100-item PREPARED Snapshot='+JSON.stringify(snap).length+' characters in one cell; Google cell/capacity/runtime boundary remains unverified.');
}
