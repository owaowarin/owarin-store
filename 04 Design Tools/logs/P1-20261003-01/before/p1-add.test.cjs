const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const base = path.join(__dirname, 'candidate');
const read = f => fs.readFileSync(path.join(base, f), 'utf8');
for (const f of ['Code.gs', 'webapp.gs']) new vm.Script(read(f), {filename:f});
const html = read('Index.html');
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new vm.Script(m[1], {filename:'Index.html'});

const columns = {name:1, productId:2, status:3, condition:4, copyFlags:5, rarity:6,
  publisher:7, platform:8, genre:9, original:10, cost:11, priceRange:12, price:13,
  marketRef:17, refNote:18, listedDate:19, soldDate:20, suggested:21, maxGRef:23,
  type:25, subGenre:26};
function sheet(name, rows, fail) {
  return {name, rows, getName(){return name;}, getLastRow(){return rows.length;},
    getLastColumn(){return name === 'ADD REQUESTS' ? 17 : 26;}, getSheetId(){return name === 'MAGAZINE' ? 2 : 1;},
    getRange(r,c,h=1,w=1){return {
      getValue(){return rows[r-1]?.[c-1] ?? '';},
      getValues(){return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1] ?? ''));},
      setValue(v){const effect=fail?.(name,r,c,v);if(effect==='DROP')return this;if(effect)throw Error('INJECTED WRITE FAILURE');(rows[r-1] ||= [])[c-1]=v;return this;},
      setValues(v){v.forEach((a,i)=>a.forEach((x,j)=>thisCell(r+i,c+j,x)));return this;},
      setBackground(){return this;}, setFormula(v){return this.setValue(v);}
    };function thisCell(rr,cc,v){const effect=fail?.(name,rr,cc,v);if(effect==='DROP')return;if(effect)throw Error('INJECTED WRITE FAILURE');(rows[rr-1] ||= [])[cc-1]=v;}}
  };
}
const hdr=['Event ID','Timestamp','Request ID','Attempt','State','Actor','Entry Source','App Version','Sheet','Payload Hash','Row','Product ID','Before','After','Error','Result','Recovery Ref'];
const rowsA=[[],[]], rowsB=[[],[]], rowsJ=[hdr];
let failure=null, next=1, journalEnabled=true;
const shA=sheet('GAME GUIDE BOOKS',rowsA,(...a)=>failure?.(...a));
const shB=sheet('MAGAZINE',rowsB,(...a)=>failure?.(...a));
const journal=sheet('ADD REQUESTS',rowsJ,(...a)=>failure?.(...a));
const ss={getSheetByName(n){return n==='ADD REQUESTS' && !journalEnabled ? null : {'GAME GUIDE BOOKS':shA,'MAGAZINE':shB,'ADD REQUESTS':journal}[n] || null;}};
const c=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},
  Session:{getScriptTimeZone:()=> 'Asia/Bangkok',getActiveUser:()=>({getEmail:()=>''})},Logger:{log(){}}});
vm.runInContext(read('Code.gs'),c);vm.runInContext(read('webapp.gs'),c);
c._resolveColumns=()=>columns;
c._autoFormat=x=>x;c._detectRestock=x=>({title:x,isRestock:false});
c._buildSKU=()=> 'TEST-' + next++;c._sp2BuildIndexes=()=>({});c._sp2Calc=()=>({price:300});
c._setDerivedFormulasForRow=()=>{};
c._readRow=(s,r,source)=>({source,productId:s.rows[r-1][1],name:s.rows[r-1][0],status:s.rows[r-1][2],suggested:300});
c._apiBookingMatch=()=>({matches:[]});
const add=(i,source='GGB',extra={})=>c._apiInvAdd({requestId:'p1-test-request-'+i,source,title:'Synthetic '+i,price:'0',...extra});
const status=(i,source='GGB',extra={})=>c._apiInvAddStatus({requestId:'p1-test-request-'+i,source,title:'Synthetic '+i,price:'0',...extra});
journalEnabled=false;
assert.throws(()=>add('missing-journal'),/ADD REQUESTS journal is missing/);
assert.equal(rowsA.length,2,'missing journal must stop before inventory write');
journalEnabled=true;
hdr[5]='Wrong';
assert.throws(()=>add('wrong-header'),/ADD REQUESTS header mismatch at 6/);
hdr[5]='Actor';
assert.equal(rowsA.length,2,'wrong journal header must stop before inventory write');
assert.equal(rowsJ.length,1,'schema failures must not append journal events');
assert.equal(status('missing').state,'NOT_FOUND');
assert.equal(rowsJ.length,1,'status lookup must not append a journal event');
for(const [field,bad] of [['original','1,2'],['cost','NOT_A_NUMBER'],['price','120abc'],['marketRef','Infinity']]){
  const before=rowsJ.length;
  assert.throws(()=>add('invalid-'+field,'GGB',{[field]:bad}),/must be a number/);
  assert.equal(rowsJ.length,before,'invalid Add must not begin a journal or inventory write');
}
for(let i=0;i<20;i++){
  const result=add(i,i%2?'MAG':'GGB');
  assert.equal(result.item.status,'New Arrival');
  assert.equal(result.item.productId,'TEST-'+(i+1));
}
assert.equal(rowsA.length,12);assert.equal(rowsB.length,12);
assert.equal(rowsJ.filter(r=>r[4]==='DONE').length,20);
assert.equal(shA.rows[2][12],0,'zero price must be preserved');
const replay=add(0);assert.equal(replay.item.productId,'TEST-1');assert.equal(rowsA.length,12);
const beforeStatus=rowsJ.length, doneStatus=status(0);
assert.equal(doneStatus.state,'DONE');assert.equal(doneStatus.data.item.productId,'TEST-1');
assert.equal(rowsJ.length,beforeStatus,'DONE status lookup must be read-only');
const corruptDone=[...rowsJ].reverse().find(r=>r[2]==='p1-test-request-0');
const validResult=corruptDone[15], beforeCorrupt=rowsJ.length;
corruptDone[15]='{';
assert.throws(()=>status(0),/requires recovery/);
assert.throws(()=>add(0),/requires recovery/);
assert.equal(rowsJ.length,beforeCorrupt,'corrupt DONE result must not append another DONE event');
corruptDone[15]=validResult;
assert.throws(()=>status(0,'GGB',{title:'Changed'}),/different item data/);
assert.throws(()=>add(0,'GGB',{title:'Changed'}),/different item data/);
const explicit=add('explicit','GGB',{status:'Hold'});assert.equal(explicit.item.status,'Hold');
failure=(name,row,col)=>name==='GAME GUIDE BOOKS' && col===3 && row===14;
assert.throws(()=>add('fail','GGB'),/recovery/);
assert.equal(rowsA.length,14);
failure=null;
assert.throws(()=>add('fail','GGB'),/recovery/);
assert.equal(rowsA.length,14,'failed request must not append a duplicate');
assert.equal(rowsJ.filter(r=>r[4]==='ERROR').length,2,'initial failure and blocked retry must both be logged');
const beforeFailureStatus=rowsJ.length, failedStatus=status('fail');
assert.equal(failedStatus.state,'ERROR');assert.equal(failedStatus.row,14);
assert.equal(rowsJ.length,beforeFailureStatus,'ERROR status lookup must be read-only');
const beforeLogFailure=rowsA.length;
failure=(name,row,col,value)=>name==='ADD REQUESTS' && col===5 && value==='DONE';
assert.throws(()=>add('done-log-fail','GGB'),/recovery/);
assert.equal(rowsA.length,beforeLogFailure+1,'business row committed before DONE event failed');
failure=null;
assert.throws(()=>add('done-log-fail','GGB'),/recovery/);
assert.equal(rowsA.length,beforeLogFailure+1,'audit failure retry must not duplicate business row');
const beforeIntentFailure=rowsA.length;
failure=(name,row,col,value)=>name==='ADD REQUESTS' && col===5 && value==='PREPARED';
assert.throws(()=>add('intent-fail','GGB'),/INJECTED/);
assert.equal(rowsA.length,beforeIntentFailure,'no business write before durable intent');
failure=null;
const comma=add('comma','GGB',{cost:'1,200.50'});
assert.equal(rowsA[comma.result.row-1][10],1200.5);
const silentRow=rowsA.length+1, doneBefore=rowsJ.filter(r=>r[4]==='DONE').length;
failure=(name,row,col)=>name==='GAME GUIDE BOOKS'&&row===silentRow&&col===11?'DROP':null;
assert.throws(()=>add('silent-cost','GGB',{cost:'99'}),/Add readback mismatch: cost/);
failure=null;
assert.equal(rowsJ.filter(r=>r[4]==='DONE').length,doneBefore,'silently missing cost must not commit DONE');
assert.throws(()=>add('silent-cost','GGB',{cost:'99'}),/recovery/);
const rowsBeforeJournal=rowsA.length;
failure=(name,row,col)=>name==='ADD REQUESTS'&&col===10?'DROP':null;
assert.throws(()=>add('silent-journal','GGB'),/ADD REQUESTS event readback failed at column 10/);
failure=null;
assert.equal(rowsA.length,rowsBeforeJournal,'journal readback failure must precede inventory write');
const beforeSilentDone=rowsA.length;
failure=(name,row,col,value)=>name==='ADD REQUESTS'&&col===16&&String(value).includes('"success":true')?'DROP':null;
assert.throws(()=>add('silent-done','GGB'),/recovery/);
failure=null;
assert.equal(rowsA.length,beforeSilentDone+1,'business row exists after silent DONE result loss');
assert.throws(()=>add('silent-done','GGB'),/recovery/);
assert.equal(rowsA.length,beforeSilentDone+1,'retry after silent DONE failure must not duplicate row');
console.log('PASS: syntax, missing/mismatched journal fail closed, 20 Add calls, read-only status lookup, numeric validation, replay, partial/failed writes, silent inventory/PREPARED/DONE readback failures');

