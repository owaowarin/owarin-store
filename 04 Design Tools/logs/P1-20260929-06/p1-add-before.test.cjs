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
      setValue(v){if(fail?.(name,r,c,v))throw Error('INJECTED WRITE FAILURE');(rows[r-1] ||= [])[c-1]=v;return this;},
      setValues(v){v.forEach((a,i)=>a.forEach((x,j)=>thisCell(r+i,c+j,x)));return this;},
      setBackground(){return this;}, setFormula(v){return this.setValue(v);}
    };function thisCell(rr,cc,v){if(fail?.(name,rr,cc,v))throw Error('INJECTED WRITE FAILURE');(rows[rr-1] ||= [])[cc-1]=v;}}
  };
}
const hdr=['Event ID','Timestamp','Request ID','Attempt','State','Actor','Entry Source','App Version','Sheet','Payload Hash','Row','Product ID','Before','After','Error','Result','Recovery Ref'];
const rowsA=[[],[]], rowsB=[[],[]], rowsJ=[hdr];
let failure=null, next=1;
const shA=sheet('GAME GUIDE BOOKS',rowsA,(...a)=>failure?.(...a));
const shB=sheet('MAGAZINE',rowsB,(...a)=>failure?.(...a));
const journal=sheet('ADD REQUESTS',rowsJ,(...a)=>failure?.(...a));
const ss={getSheetByName(n){return {'GAME GUIDE BOOKS':shA,'MAGAZINE':shB,'ADD REQUESTS':journal}[n] || null;}};
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
assert.throws(()=>add(0,'GGB',{title:'Changed'}),/different item data/);
const explicit=add('explicit','GGB',{status:'Hold'});assert.equal(explicit.item.status,'Hold');
failure=(name,row,col)=>name==='GAME GUIDE BOOKS' && col===3 && row===14;
assert.throws(()=>add('fail','GGB'),/recovery/);
assert.equal(rowsA.length,14);
failure=null;
assert.throws(()=>add('fail','GGB'),/recovery/);
assert.equal(rowsA.length,14,'failed request must not append a duplicate');
assert.equal(rowsJ.filter(r=>r[4]==='ERROR').length,2,'initial failure and blocked retry must both be logged');
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
console.log('PASS: syntax, 20 Add calls, invalid numeric rejection, comma numeric parsing, zero/default/explicit status, replay, changed payload, partial write, DONE log failure, intent failure');

