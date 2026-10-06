const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../W1-20261005-01/harness.cjs'),base=__dirname+'/candidate';
const checks=[];
function setup(){
 const f=fixture(true),c=f.c;for(const name of ['Code_v39.gs','WebApp_v39.gs','W1Orders.gs','W2Clients.gs'])vm.runInContext(fs.readFileSync(base+'/'+name,'utf8'),c,{filename:name});
 c.w2PrepareTestSchema();const sh=f.sheets.CLIENT,range=sh.getRange,literals=new Set();
 sh.getRange=(r,col,h=1,w=1)=>{const x=range(r,col,h,w),getFormulas=x.getFormulas,getFormula=x.getFormula;
  x.setNumberFormat=()=>x;x.setValues=values=>{for(let i=0;i<values.length;i++)for(let j=0;j<values[i].length;j++){const v=values[i][j],literal=typeof v==='string'&&v.startsWith("'");range(r+i,col+j).setValue(literal?v.slice(1):v);if(literal)literals.add((r+i)+':'+(col+j));}return x;};
  x.getFormulas=()=>getFormulas().map((rr,i)=>rr.map((v,j)=>literals.has((r+i)+':'+(col+j))?'':v));x.getFormula=()=>literals.has(r+':'+col)?'':getFormula();return x;};
 f.item('W2-TEST-A','Instock','GGB');const payload={requestId:'w2-create-original-001',channel:'SHOP',items:[{source:'GGB',sku:'W2-TEST-A',price:'390.10'}],customerShipping:'50',shippingSubsidy:'10'};
 const order=c._w1Mutate_('create',payload);return {f,c,order};
}
const recipient={name:'ทดสอบ ผู้รับ',phone:'+66 89 000 0001',address:'123 ถนนทดสอบ กรุงเทพ',postalCode:'00123',deliveryNote:'โทรก่อนส่ง'};
const fields={facebook:'=FB INTERNAL',name:'ผู้ซื้อ ทดสอบ',phone:'0890000001',address:'45 ถนนผู้ซื้อ',postalCode:'00123',note:'@INTERNAL NEVER PRINT'};
function confirm(x,id='w2-confirm-original-001'){return {requestId:id,orderId:x.order.orderId,expectedRevision:1,labelLater:false,recipient,clientChoice:{mode:'new',fields}};}
function ledger(x){return x.c._apiSalesList().rows.length;}
function stable(x){return JSON.stringify([x.f.sheets.SALES.rows,x.f.sheets['GAME GUIDE BOOKS'].rows,x.f.sheets['ORDER LINES'].rows]);}
function plain(v){return JSON.parse(JSON.stringify(v));}
if(require.main===module){
{
 const x=setup(),p=confirm(x),out=x.c._w2Confirm_(p);assert.equal(out.status,'SOLD');assert.equal(out.clientSync,'SAVED');assert.equal(out.labelReadiness,'READY');assert.equal(ledger(x),1);
 const old=stable(x),client=x.c._w2FindClient_(out.clientId).client;assert.equal(client.phone,'0890000001');assert.equal(client.postalCode,'00123');assert.equal(client.facebook,'=FB INTERNAL');assert.equal(client.note,'@INTERNAL NEVER PRINT');
 const prefix=JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows);assert.equal(x.c._w2Confirm_(p).replayed,true);assert.equal(stable(x),old);assert.equal(JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows),prefix);assert.equal(x.c._w2ClientRows_().filter(r=>r[6]).length,1);
 const printed=x.c._w2Labels_({orderId:out.orderId});assert(!JSON.stringify(printed).includes('INTERNAL'));assert.deepEqual(Object.keys(printed.labels[0]).sort(),['senderName','senderPhone','recipientName','phone','address','postalCode','deliveryNote','itemTitles'].sort());
 assert.throws(()=>x.c._w2Confirm_({...p,recipient:{...recipient,name:'other'}}),/PAYLOAD_CONFLICT/);
 const found=x.c._w2Search_({fields:{phone:'+66890000001',name:'ผู้ซื้อ'}}).clients;assert.equal(found[0].id,out.clientId);
 checks.push('Save & confirm: buyer/recipient distinct; literal formula-safe phone/postcode; replay one sale/client; allowlist; combined +66 search');
}
for(const stage of ['CLIENT literal row','journal PREPARED','journal DONE']){
 const x=setup(),p=confirm(x),orig=x.c._tryWrite;let hit=false;
 x.c._tryWrite=(label,fn)=>orig(label,()=>{if(!hit&&label==='W1 '+stage&&(stage==='CLIENT literal row'||x.c._w1Requests_()[p.requestId]?.state==='DONE')){hit=true;if(stage!=='journal PREPARED')fn();throw Error('W2_INJECTED');}return fn();});
 const out=x.c._w2Confirm_(p);assert(hit);assert.equal(out.status,'SOLD');assert.equal(out.clientSync,'NEEDS_RETRY');assert.equal(ledger(x),1);assert.equal(x.c._w2Labels_({orderId:out.orderId}).labels.length,1);const before=stable(x);
 x.c._tryWrite=orig;const retry=x.c._w2Confirm_(p);assert.equal(retry.clientSync,'SAVED');assert.equal(stable(x),before);assert.equal(x.c._w2ClientRows_().filter(r=>r[6]).length,1);assert.equal(x.c._w1Requests_()[out.clientRequestId].state,'DONE');
 checks.push('CRM '+stage+' failure/after-effect: SOLD snapshot survives; only CRM retries, one client and sale');
}
for(const drop of [0,3,6,7]){
 const x=setup(),p=confirm(x),orig=x.f.sheets.CLIENT.getRange;let once=true;
 x.f.sheets.CLIENT.getRange=(...args)=>{const r=orig(...args);if(once&&args[0]>2&&args[1]===1&&args[3]===8){r.setValues=v=>{once=false;v[0].forEach((cell,j)=>{if(j!==drop)orig(args[0],j+1).setValues([[cell]]);});return r;};}return r;};
 const out=x.c._w2Confirm_(p);assert.equal(out.clientSync,'NEEDS_RETRY');x.f.sheets.CLIENT.getRange=orig;assert.equal(x.c._w2Resume_(out.clientRequestId).clientSync,'SAVED');assert.equal(ledger(x),1);checks.push('Partial literal CLIENT row, missing column '+drop+': same allocated ID-only recovery');
}
{
 const x=setup(),p=confirm(x);p.labelLater=true;delete p.recipient;delete p.clientChoice;const sale=x.c._w2Confirm_(p),before=stable(x);
 const lp={requestId:'w2-label-original-001',orderId:sale.orderId,expectedRevision:2,recipient,clientChoice:{mode:'new',fields}},saved=x.c._w2SaveLabel_(lp);assert.equal(saved.revision,3);assert.equal(saved.clientSync,'SAVED');assert.equal(stable(x),before);assert.equal(x.c._w2SaveLabel_(lp).replayed,true);
 const client=x.c._w2FindClient_(saved.clientId).client,snap=plain(x.c._w2Labels_({orderId:sale.orderId}));
 x.c._w2SaveClient_({requestId:'w2-client-update-001',choice:{mode:'update',id:client.id,expectedRevision:client.revision,fields:{...fields,address:'Changed buyer address'}}});assert.deepEqual(plain(x.c._w2Labels_({orderId:sale.orderId})),snap);assert.equal(stable(x),before);
 assert.throws(()=>x.c._w2SaveClient_({requestId:'w2-client-conflict-001',choice:{mode:'update',id:client.id,expectedRevision:'stale',fields}}),/REVISION_CONFLICT/);
 x.f.actor('outsider@test.invalid');for(const fn of [()=>x.c._w2Search_({query:'ทดสอบ'}),()=>x.c._w2Labels_({orderId:sale.orderId}),()=>x.c._w2SaveLabel_(lp),()=>x.c._w2Resume_(lp.requestId)])assert.throws(fn,/OWNER_ONLY/);
 checks.push('Label later completion/reprint/get never writes ledger or stock; CLIENT update leaves old snapshot unchanged; revision/access rejects');
}
{
 const x=setup(),orig=x.c._tryWrite,before=stable(x);x.c._tryWrite=(label,fn)=>label==='W1 journal PREPARED'?false:orig(label,fn);
 assert.throws(()=>x.c._w2Confirm_(confirm(x)),/WRITE_FAILED/);assert.equal(stable(x),before);assert.equal(ledger(x),0);assert.equal(x.c._w1Order_(x.order.orderId)[11],'');
 checks.push('Intent-write failure prevents sale and recipient loss');
}
for(const bad of [{...recipient,postalCode:'1234'},{...recipient,phone:'x'},{...recipient,name:''}]){
 const x=setup(),before=stable(x);assert.throws(()=>x.c._w2Confirm_({...confirm(x),recipient:bad}));assert.equal(stable(x),before);assert.equal(ledger(x),0);
}
checks.push('Invalid recipient rejects before effects');
{
 const x=setup(),p=confirm(x),orig=x.c._tryWrite;let failed=false;
 x.c._tryWrite=(label,fn)=>orig(label,()=>{if(!failed&&label==='W1 journal PREPARED'&&x.c._w1Requests_()[p.requestId]?.state==='DONE'){failed=true;throw Error('PREPARED_NOT_WRITTEN');}return fn();});
 const out=x.c._w2Confirm_(p);assert.equal(out.clientSync,'NEEDS_RETRY');assert(x.c._w2List_('ALL').recoveries.some(r=>r.requestId===p.requestId&&r.state==='CLIENT_NOT_STARTED'));assert.equal(x.c._w2Status_(p.requestId).data.clientSync,'NEEDS_RETRY');const before=stable(x);x.c._tryWrite=orig;
 assert.equal(x.c._w2Resume_(p.requestId).clientSync,'SAVED');assert.equal(stable(x),before);assert.equal(x.c._w2List_('ALL').recoveries.length,0);assert.equal(ledger(x),1);
 checks.push('Lost response before CLIENT intent: parent ID-only recovery/status/list remain actionable without a second sale');
}
{
 const x=setup(),p=confirm(x),saved=x.c._w2Confirm_(p),original=x.c._w2FindClient_(saved.clientId).client;
 const newer=x.c._w2SaveClient_({requestId:'w2-monotonic-update-001',choice:{mode:'update',id:original.id,expectedRevision:original.revision,fields}});assert(Date.parse(newer.clientRevision)>Date.parse(original.revision));
 const duplicate=x.c._w2SaveClient_({requestId:'w2-duplicate-name-001',choice:{mode:'new',id:'CL-duplicate-0001',fields:{...fields,phone:'0890000002'}}});
 const found=x.c._w2Search_({fields:{name:'ผู้ซื้อ ทดสอบ'}}).clients;assert.equal(found.length,2);assert.notEqual(found[0].id,found[1].id);assert.equal(x.c._w2Search_({fields:{name:'ผู้ซื้อ',phone:'+66890000002'}}).clients[0].id,duplicate.clientId);
 const before=stable(x),crm=x.c._w2ClientRows_().filter(r=>r[6]).length;
 const label={requestId:'w2-order-only-label-001',orderId:saved.orderId,expectedRevision:saved.revision,recipient:{...recipient,address:'Recipient edited only'},clientChoice:{mode:'order',id:original.id,expectedRevision:newer.clientRevision}};
 x.c._w2SaveLabel_(label);assert.equal(stable(x),before);assert.equal(x.c._w2ClientRows_().filter(r=>r[6]).length,crm);assert.equal(x.c._w2FindClient_(original.id).client.address,fields.address);
 checks.push('Monotonic CLIENT revision, duplicate-name IDs, combined ranking and default order-only edit preserve CLIENT/SALES');
}
{
 const x=setup(),p=confirm(x),saved=x.c._w2Confirm_(p),before=stable(x),client=x.c._w2FindClient_(saved.clientId).client;
 const lp={requestId:'w2-label-partial-001',orderId:saved.orderId,expectedRevision:saved.revision,recipient:{...recipient,address:'New committed recipient'},clientChoice:{mode:'order',id:client.id,expectedRevision:client.revision}},orig=x.c._tryWrite;let failed=false;
 x.c._tryWrite=(label,fn)=>orig(label,()=>{fn();if(!failed&&label==='W1 ORDERS '+saved.orderId){failed=true;throw Error('LABEL_AFTER_EFFECT');}});
 assert.throws(()=>x.c._w2SaveLabel_(lp),/RECOVERY_REQUIRED/);assert(failed);assert.equal(stable(x),before);assert.equal(x.c._w2Intent_(lp.requestId).action,'labels.save');x.c._tryWrite=orig;
 assert.equal(x.c._w2Resume_(lp.requestId).labelReadiness,'READY');assert.equal(stable(x),before);assert.throws(()=>x.c._w2SaveLabel_({...lp,recipient}),/PAYLOAD_CONFLICT/);
 const ids=x.c._w2ClientRows_().filter(r=>r[6]).map(r=>r[6]);assert.equal(x.c.w2PrepareTestSchema().schema,'READY');assert.deepEqual(plain(x.c._w2ClientRows_().filter(r=>r[6]).map(r=>r[6])),plain(ids));
 checks.push('Label after-effect original-ID replay preserves sold ledger; changed payload rejects; schema replay retains stable client identities');
}
const result={result:'PASS',groups:checks.length,checks};fs.writeFileSync(__dirname+'/w2-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
module.exports={setup,confirm};
