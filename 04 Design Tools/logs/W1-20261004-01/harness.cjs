const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'schema.json'),'utf8'));
function fixture(candidate=false){
 const sheets={}, writes=[];let failure=null,serial=0,locked=false,actor='owner@test.invalid';
 function sheet(name,headers){let rows=[headers.slice(),[]],maxRows=60;const id=Object.keys(sheets).length+1;
  const sh={rows,getName:()=>name,getSheetId:()=>id,getLastColumn:()=>Math.max(0,...rows.filter(Boolean).map(r=>r.length)),getLastRow:()=>{let n=rows.length;while(n&&!(rows[n-1]||[]).some(v=>v!==''&&v!==null&&v!==undefined))n--;return n;},getMaxRows:()=>maxRows,getMaxColumns:()=>50,
   insertRowsAfter(i,n){put(name,i+1,0,'INSERT_ROWS');maxRows+=n;return sh;},insertColumnsAfter(){return sh;},getRange(r,c,h=1,w=1){
    if(typeof r==='string')throw Error('Unimplemented A1 '+r);
    return {getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>value(r+i,c+j))),getValue:()=>value(r,c),getFormula:()=>typeof raw(r,c)==='string'&&raw(r,c).startsWith('=')?raw(r,c):'',getFormulas:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>typeof raw(r+i,c+j)==='string'&&raw(r+i,c+j).startsWith('=')?raw(r+i,c+j):'')),
      setValue(v){put(name,r,c,v);return this;},setValues(v){for(let i=0;i<v.length;i++)for(let j=0;j<v[i].length;j++)put(name,r+i,c+j,v[i][j]);return this;},setFormula(v){put(name,r,c,v);return this;},getA1Notation:()=>r+':'+c,setBackground(){return this;},setFontWeight(){return this;}};
   }};
  function raw(r,c){return rows[r-1]?.[c-1]??'';}function value(r,c){let v=raw(r,c);if(typeof v==='string'&&/^=[A-Z]+\d+-[A-Z]+\d+-[A-Z]+\d+$/.test(v)){const refs=[...v.matchAll(/([A-Z]+)(\d+)/g)].map(m=>[+m[2],[...m[1]].reduce((a,x)=>a*26+x.charCodeAt(0)-64,0)]);return Number(value(...refs[0]))-Number(value(...refs[1]))-Number(value(...refs[2]));}return v;}
  sheets[name]=sh;return sh;
 }
 function put(name,r,c,v){writes.push([name,r,c,v]);const effect=failure?.(name,r,c,v);if(effect==='DROP')return;if(effect)throw Error('INJECTED '+name+' '+r+' '+c);if(c>0)(sheets[name].rows[r-1]||=[])[c-1]=v;}
 for(const name of ['GAME GUIDE BOOKS','MAGAZINE','SALES'])sheet(name,schema[name].headers.filter(x=>x!==null));
 const ss={getId:()=> '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM',getSheetByName:n=>sheets[n]||null,getSheets:()=>Object.values(sheets),insertSheet:n=>sheet(n,[]),getUrl:()=> 'TEST'};
 const c=vm.createContext({Date,JSON,Object,Array,Number,String,Math,Error,RegExp,isFinite,parseFloat,parseInt,SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){if(locked)throw Error('BUSY');locked=true;},releaseLock(){locked=false;}})},
  Utilities:{getUuid:()=> 'uid-'+String(++serial).padStart(12,'0'),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],formatDate:(d,tz,format)=>new Intl.DateTimeFormat('sv-SE',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/-/g,'')},
  Session:{getScriptTimeZone:()=> 'Asia/Bangkok',getActiveUser:()=>({getEmail:()=>actor}),getEffectiveUser:()=>({getEmail:()=> 'owner@test.invalid'})},Logger:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})}});
 const src=candidate?'candidate':'before/03 Apps Script/Web App';
 for(const f of [candidate?'Code_v32.gs':'Code_v31.gs',candidate?'WebApp_v32.gs':'WebApp_v31.gs',...(candidate?['W1Orders.gs']:[])])vm.runInContext(fs.readFileSync(path.join(__dirname,src,f),'utf8'),c,{filename:f});
 c._recalcRow=()=>{};
 if(candidate)c.w1PrepareTestSchema();
 function item(sku='SKU-1',status='Instock',source='GGB',extra={}){const sh=sheets[source==='MAG'?'MAGAZINE':'GAME GUIDE BOOKS'],cols=c._resolveColumns(sh),r=sh.rows.length+1;const obj={name:'Synthetic '+sku,productId:sku,status,condition:'A',publisher:'TEST',cost:100,price:390,...extra};for(const [k,v] of Object.entries(obj))if(cols[k])(sh.rows[r-1]||=[])[cols[k]-1]=v;return c._readRow(sh,r,source);}
 return {c,ss,sheets,writes,item,fail:f=>failure=f,actor:a=>actor=a};
}
module.exports={fixture};
