const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
const matrix=JSON.parse(fs.readFileSync(__dirname+'/attempts/F05/journal-proof.json','utf8'));
function make(){const f=fixture(true);const a=f.sheets['ORDER REQUESTS'].rows;a.splice(0,a.length,f.c.W1_HEADERS['ORDER REQUESTS'].slice(),...matrix.map(r=>r.slice()));vm.runInContext(fs.readFileSync(__dirname+'/W1Qa.gs','utf8'),f.c);return f;}
const f=make();assert.throws(()=>f.c._w1Requests_(),/CORRUPT_JOURNAL/);
f.fail((name,row,col)=>name==='ORDER REQUESTS'&&row===1051&&col===3?'DROP':false);assert.throws(()=>f.c.w1QaV36RepairGaps(),/QA_GAP_READBACK/);f.fail(null);
const result=JSON.parse(f.c.w1QaV36RepairGaps());assert.equal(result.gaps,49);assert.equal(JSON.parse(f.c.w1QaV36RepairGaps()).replayed,true);
const gaps=new Set(f.c.W1_QA_GAP_REPAIR.gaps.map(g=>g.row));matrix.forEach((r,i)=>{if(!gaps.has(i+2))assert.deepEqual(f.sheets['ORDER REQUESTS'].rows[i+1],r);});
assert(Object.values(f.c._w1Requests_()).every(r=>r.state==='DONE'));
const conflict=make();conflict.sheets['ORDER REQUESTS'].rows[3][1]='changed';const before=conflict.writes.length;assert.throws(()=>conflict.c.w1QaV36RepairGaps(),/QA_ORIGINAL_JOURNAL_CHANGED/);assert.equal(conflict.writes.length,before);
const denied=make();denied.actor('other@test.invalid');assert.throws(()=>denied.c.w1QaV36RepairGaps(),/OWNER_ONLY/);
console.log('PASS49 explicit gap notes, durable intent/partial replay, original events unchanged, source hash guard and owner-only; no blank-row skipping');
