const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../W1-20261005-01/harness.cjs');
const {setup:orderFixture,confirm}=require('../W2-20261005-01/w2.test.cjs');
const base=path.join(__dirname,'../W2-20261005-01/candidate'),request='qa-w2-client-schema-20261005';
const plain=v=>JSON.parse(JSON.stringify(v)),checks=[],evidence=[];
const protectedNames=['GAME GUIDE BOOKS','MAGAZINE','SALES','ORDERS','ORDER LINES'];
const protectedState=f=>JSON.stringify(protectedNames.map(n=>f.sheets[n].rows));
function legacy(){
 const f=fixture(true),c=f.c;
 for(const name of ['Code_v39.gs','WebApp_v39.gs','W1Orders.gs','W2Clients.gs'])vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),c,{filename:name});
 const sh=f.ss.insertSheet('CLIENT');
 sh.rows.push(['FB-A','ชื่อซ้ำ','0890000001','ที่อยู่ ก','00123','=1+1'],['','','','','',''],['FB-B','ชื่อซ้ำ','0890000002','ที่อยู่ ข','00124','private'],['','legacy numeric',890000003,'old address',123,'leave unchanged']);
 sh.rows[0]=plain(c.W2_CLIENT_HEADERS).slice(0,6);sh.rows.splice(1,1);
 const range=sh.getRange(2,1,sh.getLastRow()-1,6);
 return {f,c,sh,before:plain(range.getValues()),formulas:plain(range.getFormulas()),protected:protectedState(f)};
}
function preserved(x){
 assert.deepEqual(plain(x.sh.getRange(2,1,x.before.length,6).getValues()),x.before);
 assert.deepEqual(plain(x.sh.getRange(2,1,x.before.length,6).getFormulas()),x.formulas);
 assert.equal(protectedState(x.f),x.protected);
 assert(x.f.writes.every(w=>w[0]!=='CLIENT'||w[1]===1||w[2]>=7),'Migration must never write original A:F cells');
}
function identities(x){return plain(x.sh.getRange(2,7,x.before.length,2).getValues());}
function run(name,fn){
 try{fn();checks.push({name,result:'PASS'});}catch(e){checks.push({name,result:'FAIL',error:e.stack});throw e;}
}
function failure(x,label,after){
 const original=x.c._tryWrite;let hit=false;
 x.c._tryWrite=(key,fn)=>original(key,()=>{if(!hit&&key==='W1 '+label){hit=true;if(after)fn();throw Error('SYNTHETIC_RESPONSE_FAILURE');}return fn();});
 return ()=>{assert(hit,'Injection must actually execute');x.c._tryWrite=original;};
}
try{
 run('Six-column dry-run is read-only; migrate preserves values/formulas, blanks, numeric legacy values and duplicate-name identities',()=>{
  const x=legacy(),writes=x.f.writes.length,journal=JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows);
  const dry=x.c.w2SchemaDryRun();assert.equal(dry.rows,4);assert.equal(dry.changes.length,1);
  assert.equal(x.f.writes.length,writes);assert.equal(JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows),journal);
  assert.equal(x.c.w2PrepareTestSchema().schema,'READY');preserved(x);
  const ids=identities(x);assert.deepEqual(ids[1],['','']);assert.equal(new Set(ids.filter(r=>r[0]).map(r=>r[0])).size,3);
  assert(ids.filter(r=>r[0]).every(r=>r[0].startsWith('CL-')&&Number.isFinite(Date.parse(r[1]))));
  assert.equal(x.c._w2Search_({fields:{name:'ชื่อซ้ำ'}}).clients.length,2);
  const doneWrites=x.f.writes.length,doneJournal=JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows);
  assert.equal(x.c.w2PrepareTestSchema().replayed,true);assert.deepEqual(identities(x),ids);
  assert.equal(x.f.writes.length,doneWrites);assert.equal(JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows),doneJournal);
  evidence.push({case:'baseline',dryRun:plain(dry),before:x.before,formulas:x.formulas,after:plain(x.sh.getRange(2,1,4,8).getValues()),writes:x.f.writes.filter(w=>w[0]==='CLIENT')});
 });
 for(const [label,after] of [['journal PREPARED',false],['journal PREPARED',true],['CLIENT headers',true],['CLIENT identities',true],['journal DONE',true]])run(label+' '+(after?'after-effect':'before-effect')+' failure retries original migration without business effects',()=>{
  const x=legacy(),restore=failure(x,label,after);
  assert.throws(()=>x.c.w2PrepareTestSchema(),/WRITE_FAILED|RECOVERY_REQUIRED/);restore();preserved(x);
  const prior=x.c._w1Requests_()[request],allocated=prior?plain(prior.snap.ids):null,time=prior?.snap.time;
  const result=x.c.w2PrepareTestSchema();assert.equal(result.schema,'READY');preserved(x);
  const req=x.c._w1Requests_()[request];assert.equal(req.state,'DONE');
  if(allocated){assert.deepEqual(plain(req.snap.ids),allocated);assert.equal(req.snap.time,time);}
  assert.deepEqual(identities(x),plain(req.snap.ids.map(id=>[id,id?req.snap.time:''])));
  evidence.push({case:label,afterEffect:after,allocatedBeforeRetry:allocated,identitiesAfterRetry:identities(x),businessSheetsUnchanged:true});
 });
 run('Partial identity metadata completes only original allocated IDs and revision',()=>{
  const x=legacy(),original=x.sh.getRange;let hit=false;
  x.sh.getRange=(...a)=>{const r=original(...a);if(!hit&&a[0]===2&&a[1]===7&&a[3]===2)r.setValues=values=>{hit=true;original(2,7).setValue(values[0][0]);original(4,8).setValue(values[2][1]);return r;};return r;};
  assert.throws(()=>x.c.w2PrepareTestSchema(),/CLIENT_ID_READBACK/);assert(hit);x.sh.getRange=original;
  const allocated=plain(x.c._w1Requests_()[request].snap);x.c.w2PrepareTestSchema();preserved(x);
  assert.deepEqual(identities(x),allocated.ids.map(id=>[id,id?allocated.time:'']));
 });
 for(const column of [1,7])run('Unexpected external edit in '+(column===1?'A:F':'G:H')+' rejects migration retry without overwriting it',()=>{
  const x=legacy(),restore=failure(x,'CLIENT identities',false);
  assert.throws(()=>x.c.w2PrepareTestSchema(),/RECOVERY_REQUIRED/);restore();
  x.sh.rows[1][column-1]='EXTERNAL CHANGE';
  const before=JSON.stringify(x.sh.rows),protectedBefore=protectedState(x.f);
  assert.throws(()=>x.c.w2PrepareTestSchema(),/CLIENT_MIGRATION_CHANGED/);
  assert.equal(JSON.stringify(x.sh.rows),before);assert.equal(protectedState(x.f),protectedBefore);
 });
 run('Wrong owner, wrong test ID, unexpected headers, duplicate IDs and missing revisions fail closed',()=>{
  let x=legacy();x.f.actor('outsider@test.invalid');assert.throws(()=>x.c.w2SchemaDryRun(),/OWNER_ONLY/);
  x=legacy();x.f.ss.getId=()=> 'NOT-THE-ISOLATED-TEST';assert.throws(()=>x.c.w2PrepareTestSchema(),/TEST_SHEET_ONLY/);
  x=legacy();x.sh.rows[0][0]='Unknown';assert.throws(()=>x.c.w2PrepareTestSchema(),/CLIENT_SCHEMA_CONFLICT/);
  for(const invalid of ['duplicate','missing']){
   x=legacy();x.sh.rows[0]=plain(x.c.W2_CLIENT_HEADERS);
   for(const [i,row] of x.sh.rows.entries())if(i&&row.some(v=>v!=='')){row[6]=invalid==='duplicate'?'CL-duplicate-0001':'CL-row-'+i;row[7]=invalid==='missing'?'':'2026-10-06T00:00:00.000Z';}
   const before=JSON.stringify(x.sh.rows),writes=x.f.writes.length;
   assert.throws(()=>x.c.w2PrepareTestSchema(),/CLIENT_IDENTITY_CONFLICT/);assert.equal(JSON.stringify(x.sh.rows),before);assert.equal(x.f.writes.length,writes);
  }
 });
 run('Already valid eight-column CLIENT requires no migration or new journal event',()=>{
  const x=legacy();x.sh.rows[0]=plain(x.c.W2_CLIENT_HEADERS);
  for(const [i,row] of x.sh.rows.entries())if(i&&row.some(v=>v!=='')){row[6]='CL-existing-'+i;row[7]='2026-10-06T00:00:00.000Z';}
  const before=JSON.stringify(x.sh.rows),writes=x.f.writes.length;
  assert.equal(x.c.w2PrepareTestSchema().replayed,true);assert.equal(JSON.stringify(x.sh.rows),before);assert.equal(x.f.writes.length,writes);
 });
 run('SHOP create/cancel/recreate then migrated-client selection, label snapshot and SHOPEE label-later flow',()=>{
  const x=legacy();x.c.w2PrepareTestSchema();const client=x.c._w2Search_({fields:{name:'ชื่อซ้ำ',phone:'0890000001'}}).clients[0],beforeClient=JSON.stringify(x.sh.rows);
  x.f.item('W3-SHOP','Instock','GGB');
  const create={requestId:'w3-shop-create-0001',channel:'SHOP',items:[{source:'GGB',sku:'W3-SHOP',price:'390.10'}],customerShipping:'50',shippingSubsidy:'10'};
  const order=x.c._w1Mutate_('create',create);assert.equal(order.status,'PENDING');
  const cancelled=x.c._w1Mutate_('cancel',{requestId:'w3-shop-cancel-0001',orderId:order.orderId,expectedRevision:1});assert.equal(cancelled.status,'CANCELLED');assert.equal(x.c._apiSalesList().rows.length,0);
  const next=x.c._w1Mutate_('create',{...create,requestId:'w3-shop-create-0002'});
  const recipient={name:'คนรับแยกจากผู้ซื้อ',phone:'0890000099',address:'ที่อยู่ผู้รับ',postalCode:'00199',deliveryNote:'โทรก่อนส่ง'};
  const payload={requestId:'w3-shop-confirm-0001',orderId:next.orderId,expectedRevision:1,labelLater:false,recipient,clientChoice:{mode:'order',id:client.id,expectedRevision:client.revision}};
  const sold=x.c._w2Confirm_(payload);assert.equal(sold.status,'SOLD');assert.equal(sold.clientSync,'ORDER_ONLY');assert.equal(JSON.stringify(x.sh.rows),beforeClient);
  x.f.item('W3-SHOPEE','Instock','MAG');
  const market={requestId:'w3-shopee-confirm-0001',channel:'SHOPEE',items:[{source:'MAG',sku:'W3-SHOPEE',price:'500'}],customerShipping:'0',shippingSubsidy:'0',labelLater:true};
  const marketSold=x.c._w2Confirm_(market);assert.equal(marketSold.status,'SOLD');assert.equal(marketSold.labelReadiness,'MISSING');
  assert.throws(()=>x.c._w2Labels_({orderId:marketSold.orderId}),/RECIPIENT/);
  const business=JSON.stringify([x.f.sheets.SALES.rows,x.f.sheets['GAME GUIDE BOOKS'].rows,x.f.sheets.MAGAZINE.rows,x.f.sheets['ORDER LINES'].rows]);
  const label={requestId:'w3-label-later-0001',orderId:marketSold.orderId,expectedRevision:1,recipient,clientChoice:{mode:'order',id:client.id,expectedRevision:client.revision}};
  x.c._w2SaveLabel_(label);
  const readOnly=JSON.stringify(Object.values(x.f.sheets).map(s=>s.rows)),writes=x.f.writes.length;
  const preview=x.c._w2Labels_({orderIds:[sold.orderId,marketSold.orderId,sold.orderId]});assert.equal(preview.labels.length,2);assert.equal(preview.labels[0].recipientName,recipient.name);
  assert(!JSON.stringify(preview).includes('private'));assert.equal(x.c._w2Confirm_(payload).replayed,true);assert.equal(x.c._w2Confirm_(market).replayed,true);assert.equal(x.c._w2SaveLabel_(label).replayed,true);
  assert.equal(JSON.stringify(Object.values(x.f.sheets).map(s=>s.rows)),readOnly);assert.equal(x.f.writes.length,writes);assert.equal(JSON.stringify(x.sh.rows),beforeClient);
  assert.equal(JSON.stringify([x.f.sheets.SALES.rows,x.f.sheets['GAME GUIDE BOOKS'].rows,x.f.sheets.MAGAZINE.rows,x.f.sheets['ORDER LINES'].rows]),business);
  const sales=x.c._apiSalesList().rows;assert.equal(sales.length,2);assert.equal(sales.find(r=>r.channel==='SHOPEE')?.price,300);
  evidence.push({case:'non-print local E2E',shopOrderId:sold.orderId,shopeeOrderId:marketSold.orderId,selectedMigratedClientId:client.id,sales:plain(sales),preview:plain(preview),physicalPrint:'DEFERRED_UNTESTED'});
 });
 run('CRM after-effect failure from original sale recovers using original ID without a second sale',()=>{
  const x=orderFixture(),payload=confirm(x,'w3-crm-retry-0001'),restore=failure(x,'CLIENT literal row',true);
  const sale=x.c._w2Confirm_(payload);assert.equal(sale.clientSync,'NEEDS_RETRY');restore();
  const business=protectedState(x.f);assert.equal(x.c._w2Resume_(sale.clientRequestId).clientSync,'SAVED');assert.equal(protectedState(x.f),business);assert.equal(x.c._apiSalesList().rows.length,1);
  assert.equal(x.c._w2Confirm_(payload).clientSync,'SAVED');assert.equal(x.c._w2ClientRows_().filter(r=>r[6]).length,1);
 });
}catch(e){process.exitCode=1;console.error(e.stack);}
const result={result:process.exitCode?'FAIL':'PASS',executedAt:new Date().toISOString(),scope:'LOCAL_VM_SYNTHETIC_ONLY',runtime:'v39 unchanged',checks,evidence,limitations:['Not a fresh Google export/native migration','Mock formulas are preserved raw; no claim of native evaluation or coercion','Injected partial writes are recovery simulations, not proof of native Range batch atomicity','PDF/physical Print-Reprint DEFERRED, untested']};
fs.writeFileSync(path.join(__dirname,'migration-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:result.result,checks:checks.length,scope:result.scope}));
