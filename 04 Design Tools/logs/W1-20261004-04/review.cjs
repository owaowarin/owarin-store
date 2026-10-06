const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),base=path.join(__dirname,'../W1-20261004-03');
const {fixture}=require(path.join(base,'harness.cjs'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const revision=JSON.parse(fs.readFileSync(path.join(base,'revision.json'),'utf8'));
for(const r of revision.files)assert.equal(sha(fs.readFileSync(path.join(base,'candidate',r.file),'utf8').replace(/\r\n/g,'\n')),r.sha256LF);
const log=(id,action,result)=>fs.appendFileSync(path.join(__dirname,'changes.csv'),[new Date().toISOString(),'W1-20261004-04',id,action,result,'Read-only runtime; new local harness evidence only; preserve frozen v33'].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')+'\n');
if(!fs.existsSync(path.join(__dirname,'changes.csv')))fs.writeFileSync(path.join(__dirname,'changes.csv'),'timestamp,change_id,request_id,action,result,recovery\n');
log('START','Dry run: exact revision check; new read-only review package; no runtime/source/schema writes','PASS four candidate hashes; frozen evidence remains in place because it is referenced');
function instrument(f){
 const m={getValues:0,getValue:0,getFormulas:0,getFormula:0,readCells:0,setValues:0,setValue:0,setFormula:0,flush:0,inserts:0,journalEvents:0,journalChars:0,inventoryScans:0,decode:0};
 for(const sh of Object.values(f.sheets)){
  const original=sh.getRange;sh.getRange=function(r,c,h=1,w=1){const range=original(r,c,h,w);for(const k of ['getValues','getValue','getFormulas','getFormula','setValues','setValue','setFormula']){const fn=range[k];range[k]=function(...args){m[k]++;if(k.startsWith('get'))m.readCells+=k==='getValues'||k==='getFormulas'?h*w:1;if(k==='getValues'&&r===1&&h>=3&&/GUIDE|MAGAZINE/.test(sh.getName()))m.inventoryScans++;return fn.apply(this,args);};}return range;};
  const insert=sh.insertRowsAfter;sh.insertRowsAfter=(...args)=>{m.inserts++;return insert(...args);};
 }
 const flush=f.c.SpreadsheetApp.flush;f.c.SpreadsheetApp.flush=()=>{m.flush++;return flush();};
 const event=f.c._w1Event_;f.c._w1Event_=(req,...args)=>{m.journalEvents++;m.journalChars+=JSON.stringify(req.snap).length;return event(req,...args);};
 const decode=f.c._w1Decode_;f.c._w1Decode_=v=>{m.decode++;return decode(v);};
 return m;
}
function payload(n,id='review-create-0001'){return {requestId:id,channel:'SHOP',items:Array.from({length:n},(_,i)=>({source:'GGB',sku:'PERF-'+i,price:390})),customerShipping:50,shippingSubsidy:10,labelLater:true};}
const out={revision:revision.revision,environment:'Local synthetic instrumented original v33; no Google calls; method counts are not network RPC counts or measured latency',profiles:[],findings:[]};
for(const n of [1,10,100]){
 const f=fixture(true);for(let i=0;i<n;i++)f.item('PERF-'+i,'Instock','GGB',{name:'Synthetic '+i+' '+'x'.repeat(200)});
 const m=instrument(f),p=payload(n),start=Date.now(),o=f.c._w1Mutate_('create',p);
 assert.equal(o.count,n);assert.equal(o.status,'PENDING');out.profiles.push({action:'create',n,localMs:Date.now()-start,...m});
 for(const k in m)m[k]=0;f.c._w1Status_(p.requestId);out.profiles.push({action:'request-status',n,...m});
 if(n===100){for(const k in m)m[k]=0;const s=f.c._w1Mutate_('confirm',{requestId:'review-confirm-0001',orderId:o.orderId,expectedRevision:o.revision,labelLater:true});assert.equal(s.status,'SOLD');out.profiles.push({action:'confirm',n,...m});}
 log('PERF-'+n,'Instrument original v33 create'+(n===100?'/confirm':'')+' and status','PASS; see review-results.json counts');
}
// A lost browser payload cannot be reconstructed from the current journal snapshot/hash.
{
 const f=fixture(true);f.item('PERF-0');const p=payload(1,'review-lost-intent-01');p.items[0].price='0390.00';p.shippingSubsidy='10.00';p.customerShipping='50.00';
 let injected=false;f.fail((sheet,row,col,value)=>{if(!injected&&sheet==='GAME GUIDE BOOKS'&&value==='Hold'){injected=true;return true;}});
 assert.throws(()=>f.c._w1Mutate_('create',p),/RECOVERY_REQUIRED/);f.fail(null);
 const req=f.c._w1Requests_()[p.requestId];assert.equal(req.state,'NEEDS_REVIEW');assert(!('payload' in req.snap));
 const reconstructed=payload(1,p.requestId);assert.throws(()=>f.c._w1Mutate_('create',reconstructed),/REQUEST_PAYLOAD_CONFLICT/);
 assert.equal(f.c._w1Mutate_('create',p).status,'PENDING');
 out.findings.push({id:'R6',confirmed:true,problem:'Lost client payload: semantic snapshot cannot reproduce exact JSON hash. Existing UNDO claim to recover exact payload from journal is false.',proof:'Original price 0390.00/subsidy 10.00/customer 50.00 lost; reconstructed equivalent request conflicts; original retained request succeeds.'});
 log('R6-LOST-INTENT','Inject Hold failure; drop original payload; reconstruct semantically then retry exact original','REPRODUCED payload conflict; exact original recovered fixture to Pending');
}
// _w1Mutate_ catches errors, so emulate response loss AFTER each native write operation.
for(const action of ['create','cancel','confirm','shopee']){
 const setup=()=>{const f=fixture(true);f.item('PERF-0');let p=payload(1,'review-after-'+action);if(action==='cancel'||action==='confirm'){const o=f.c._w1Mutate_('create',payload(1));p={requestId:p.requestId,orderId:o.orderId,expectedRevision:o.revision,labelLater:true};}if(action==='shopee'){p.channel='SHOPEE';p.items[0].price=630;}return {f,p,run:()=>f.c._w1Mutate_(action==='shopee'?'confirm':action,p)};};
 const sample=setup();let count=0;const orig=sample.f.c._w1Write_;sample.f.c._w1Write_=(label,fn)=>orig(label,()=>{fn();count++;});sample.run();
 for(let position=1;position<=count;position++){const x=setup(),write=x.f.c._w1Write_;let i=0,hit=false;x.f.c._w1Write_=(label,fn)=>write(label,()=>{fn();if(++i===position){hit=true;throw Error('AFTER_EFFECT');}});assert.throws(x.run);assert(hit);x.f.c._w1Write_=write;const result=x.run();assert.equal(result.status,action==='create'?'PENDING':action==='cancel'?'CANCELLED':'SOLD');assert.equal(x.run().replayed,true);assert.equal(x.f.c._apiSalesList().rows.length,action==='confirm'||action==='shopee'?1:0);}
 out.profiles.push({action:'after-effect-failure',kind:action,positions:count,pass:true});log('AFTER-'+action,'Fail AFTER each full _w1Write operation then exact replay','PASS '+count+' positions; unique SALES');
}
fs.writeFileSync(path.join(__dirname,'review-results.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
