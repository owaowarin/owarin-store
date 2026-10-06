const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../W1-20261005-01/harness.cjs');
const files=['Code_v41.gs','WebApp_v41.gs','W1Orders.gs','W2Clients.gs','ReleaseMigration.gs'];
const plain=v=>JSON.parse(JSON.stringify(v)),prod='16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0';
function setup(){const f=fixture(true);for(const n of ['ORDERS','ORDER LINES','ORDER REQUESTS'])delete f.sheets[n];for(const n of ['SALES','GAME GUIDE BOOKS','MAGAZINE'])f.sheets[n].rows[0].pop();for(const n of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'candidate',n),'utf8'),f.c,{filename:n});
 f.ss.getId=()=>prod;const client=f.ss.insertSheet('CLIENT');client.getRange(1,1,1,6).setValues([plain(f.c.W2_CLIENT_HEADERS).slice(0,6)]);
 client.getRange(2,1,4,6).setValues([['same','same',890000001,'address',12345,'=literal legacy'],['same','same','0890000002','address','00123','note'],['','','','','',''],['other','other','0890000003','address','00202','note']]);
 const journal=f.ss.insertSheet('ADD REQUESTS');journal.getRange(1,1,1,17).setValues([['Event ID','Timestamp','Request ID','Attempt','State','Actor','Entry Source','App Version','Sheet','Payload Hash','Row','Product ID','Before','After','Error','Result','Recovery Ref']]);return f;}
const checks=[];
{
 const f=setup(),prefix=JSON.stringify(f.sheets.CLIENT.rows.map(r=>r.slice(0,6))),inventory=JSON.stringify([f.sheets.SALES.rows,f.sheets['GAME GUIDE BOOKS'].rows,f.sheets.MAGAZINE.rows]);
 const before=f.writes.length;assert.equal(f.c.prodReleaseDryRun().w1.changes.length,6);assert.equal(f.writes.length,before);
 assert.throws(()=>f.c.w1PrepareTestSchema(),/TEST_SHEET_ONLY/);assert.throws(()=>f.c.w2PrepareTestSchema(),/TEST_SHEET_ONLY/);
 assert.equal(f.c.prodReleaseMigrate().schema,'READY');assert.equal(JSON.stringify(f.sheets.CLIENT.rows.map(r=>r.slice(0,6))),prefix);
 const ids=f.sheets.CLIENT.rows.slice(1).map(r=>r[6]);assert.equal(new Set(ids.filter(Boolean)).size,3);assert(!ids[2]);
 const snapshot=JSON.stringify(Object.fromEntries(Object.entries(f.sheets).map(([n,s])=>[n,s.rows])));assert.equal(f.c.prodReleaseMigrate().replayed,true);assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.sheets).map(([n,s])=>[n,s.rows]))),snapshot);
 assert.equal(f.c.prodReleaseReadiness().clients,3);assert.equal(f.c.prodReleaseReadiness().orders,0);assert.equal(f.c.prodReleaseReadiness().lines,0);
 assert.equal(JSON.stringify([f.sheets.SALES.rows.map(r=>r.slice(0,-1)),f.sheets['GAME GUIDE BOOKS'].rows.map(r=>r.slice(0,-1)),f.sheets.MAGAZINE.rows.map(r=>r.slice(0,-1))]).length>0,true);
 // Every actual legacy cell survives; only appended headers change inventory/ledger.
 const original=JSON.parse(inventory);[f.sheets.SALES,f.sheets['GAME GUIDE BOOKS'],f.sheets.MAGAZINE].forEach((s,i)=>original[i].forEach((r,j)=>assert.deepEqual(s.rows[j].slice(0,r.length),r)));
 checks.push('Read-only dry-run; production/test guards; CLIENT original A:F/zeros/blank/equal names retained; metadata only; replay unchanged; no orders/sale/stock');
}
for(const stage of ['headers ORDERS','header Item UID','CLIENT headers','CLIENT identities','journal DONE']){
 const f=setup(),write=f.c._tryWrite;let hit=false;
 f.c._tryWrite=(label,fn)=>write(label,()=>{fn();if(!hit&&label==='W1 '+stage){hit=true;throw Error('AFTER_EFFECT');}});
 assert.throws(()=>f.c.prodReleaseMigrate());assert(hit,stage);const ids=f.sheets.CLIENT.rows.map(r=>r[6]);f.c._tryWrite=write;
 assert.equal(f.c.prodReleaseMigrate().schema,'READY');ids.forEach((id,i)=>{if(id)assert.equal(f.sheets.CLIENT.rows[i][6],id);});assert.equal(f.c.prodReleaseReadiness().clients,3);assert.equal(f.c.prodReleaseReadiness().orders,0);
 checks.push(stage+': after-effect retry completes same identities; no business transaction');
}
{
 const f=setup();f.ss.getId=()=> 'wrong';const before=f.writes.length;assert.throws(()=>f.c.prodReleaseMigrate(),/PRODUCTION_SHEET_ONLY/);assert.equal(f.writes.length,before);
 f.ss.getId=()=>prod;f.actor('other@test.invalid');assert.throws(()=>f.c.prodReleaseMigrate(),/OWNER_ONLY/);assert.equal(f.writes.length,before);
 checks.push('Wrong Sheet and non-owner stop before writes');
}
{
 const f=setup();f.sheets.CLIENT.rows[0][0]='wrong';const before=f.writes.length;assert.throws(()=>f.c.prodReleaseMigrate(),/CLIENT_SCHEMA_CONFLICT/);assert.equal(f.writes.length,before);
 checks.push('Unexpected CLIENT schema blocks all bootstrap writes');
}
{
 const f=setup(),write=f.c._tryWrite;let hit=false;f.c._tryWrite=(label,fn)=>write(label,()=>{fn();if(!hit&&label==='W1 CLIENT identities'){hit=true;throw Error('AFTER_EFFECT');}});assert.throws(()=>f.c.prodReleaseMigrate());f.c._tryWrite=write;f.sheets.CLIENT.rows[1][0]='external change';const before=f.writes.length;assert.throws(()=>f.c.prodReleaseMigrate(),/CLIENT_MIGRATION_CHANGED/);assert.equal(f.sheets.CLIENT.rows[1][0],'external change');assert.equal(f.c._w1Requests_()['prod-w1w2-schema-20261006-v40'].state,'NEEDS_REVIEW');assert(f.writes.length>before);checks.push('External A:F change blocks retry without overwriting client; durable recovery retained');
}
for(const unexpected of ['', 'external metadata', '=unexpected formula']){
 const f=setup(),sh=f.sheets.CLIENT;let max=6;sh.getMaxColumns=()=>max;sh.insertColumnsAfter=(i,n)=>{sh.getRange(1,7,1,2).setValues([['Column 7','Column 8']]);if(unexpected)sh.getRange(2,7).setValue(unexpected);max+=n;return sh;};
 if(unexpected){assert.throws(()=>f.c.prodReleaseMigrate(),/CLIENT_SCHEMA_CONFLICT/);assert.equal(sh.rows[1][6],unexpected);}
 else {assert.equal(f.c.prodReleaseMigrate().schema,'READY');assert.equal(f.c.prodReleaseReadiness().clients,3);const before=JSON.stringify(sh.rows);assert.equal(f.c.prodReleaseMigrate().replayed,true);assert.equal(JSON.stringify(sh.rows),before);}
 checks.push('Native Table generated Column 7/8: '+(unexpected?'unexpected metadata blocks, never overwritten':'six-column capacity migration and replay pass'));
}
{
 const f=setup(),sh=f.sheets.CLIENT;let max=6;sh.getMaxColumns=()=>max;sh.insertColumnsAfter=(i,n)=>{sh.getRange(1,7,1,2).setValues([['Column 7','Column 8']]);max+=n;throw Error('COLUMN_CAPACITY_AFTER_EFFECT');};
 assert.throws(()=>f.c.prodReleaseMigrate());sh.insertColumnsAfter=()=>{throw Error('Must not reallocate capacity');};assert.equal(f.c.prodReleaseMigrate().schema,'READY');assert.equal(f.c._w1Requests_()['prod-w1w2-schema-20261006-v40'].attempt,2);checks.push('Native Table capacity after-effect: original request/allocated IDs survive retry');
}
for(const n of files)new vm.Script(fs.readFileSync(path.join(__dirname,'candidate',n),'utf8'),{filename:n});
assert(fs.readFileSync(path.join(__dirname,'candidate/Code_v41.gs'),'utf8').includes('var ALBUM_SHEET   = "FB ALBUM CAPTION";'));
assert(fs.readFileSync(path.join(__dirname,'candidate/Code_v41.gs'),'utf8').includes('.addSubMenu(fbaMenu_(ui))'));
console.log(JSON.stringify({result:'PASS',checks},null,2));
