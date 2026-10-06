const fs=require('fs'); const vm=require('vm');
let idc=900; const page={ // albumId -> {cover, photos:[{id,name}]}
 A1:{cover:'1',photos:[{id:'1',name:'logo'},{id:'11',name:'sold'},{id:'12',name:'keep'},{id:'13',name:'orphan'}]},
 A2:{cover:'2',photos:[{id:'2',name:'logo'}]},
 SYS:{cover:'5',photos:[{id:'5'},{id:'6'}]}};
const calls=[]; const props={}; const trig=[]; let rate=false;
function resp(code,obj){return{getResponseCode:()=>code,getContentText:()=>JSON.stringify(obj),getAllHeaders:()=>({})}}
const UrlFetchApp={fetch(url,o){o=o||{};calls.push((o.method||'get')+' '+url.split('?')[0].replace('https://graph.facebook.com/v23.0',''));
 let m;
 if((o.method)==='delete'){ if(rate) return resp(400,{error:{code:4,message:'rate'}});m=url.match(/v23.0\/(\d+)\?/);for(const a in page){page[a].photos=page[a].photos.filter(p=>p.id!==m[1]);}return resp(200,{success:true});}
 if(o.method==='post'){m=url.match(/v23.0\/(\w+)\/photos/);const id=String(++idc);page[m[1]].photos.push({id,name:o.payload.caption});return resp(200,{id});}
 if(m=url.match(/v23.0\/(\w+)\?fields=cover_photo/))return resp(200,{cover_photo:{id:page[m[1]].cover}});
 if(m=url.match(/v23.0\/(\w+)\/photos\?/))return resp(200,{data:page[m[1]].photos});
 throw url;}};
function sheet(rows){return{rows,getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getMaxRows:()=>rows.length,
 getRange(r,c,nr,nc){if(typeof r==='string')return{setValue(){},setValues(){},setFontWeight(){return this}};nr=nr||1;nc=nc||1;return{getValues:()=>{const o=[];for(let i=0;i<nr;i++){const x=[];for(let j=0;j<nc;j++)x.push((rows[r-1+i]||[])[c-1+j]??'');o.push(x)}return o},
  setValues(v){v.forEach((x,i)=>{rows[r-1+i]=rows[r-1+i]||Array(rows[0].length).fill('');x.forEach((y,j)=>rows[r-1+i][c-1+j]=y)})},setValue(v){},clearContent(){for(let i=0;i<nr;i++)rows[r-1+i][c-1]=''},setFontWeight(){return this}}},
 copyTo(){return{setName(){}}},clear(){},setFrozenRows(){}}}
const cap=sheet([['Product ID','Item name','Sheet','Image URL','Caption','Posted'],
 ['P-SOLD','x','G','u','c','11 | d'],['P-KEEP','y','G','u','c','12 | d'],['P-DEAD','z','G','u','c','77 | d'],['P-DUP1','Book (RESTOCK-01)','G','u','c',''],['P-DUP2','Book','G','u','c','']]);
const albums=sheet([['k','id','n','c','a'],['T1',"'A1",'','',true],['T2',"'A2",'','',true],['Photos',"'SYS",'','',true]]);
const logS=sheet([['Time','Action','Album','Photo ID','Product ID','Caption','Reason']]);
const sheets={'FB ALBUM CAPTION':cap,'FB ALBUMS':albums,'FB ALBUM LOG':logS};
const inv={'P-SOLD':{name:'s',status:'Sold',type:'T1'},'P-KEEP':{name:'k',status:'Instock',type:'T1'},'P-DEAD':{name:'d',status:'Instock',type:'T1'},
 'P-DUP1':{name:'Book (RESTOCK-01)',status:'Instock',type:'T2',publisher:'X',original:'100'},'P-DUP2':{name:'Book',status:'Instock',type:'T2',publisher:'X',original:'100'},
 'P-NEW':{name:'new',status:'Instock',type:'T2',publisher:'Y'},'P-NOALB':{name:'q',status:'Instock',type:'T9'}};
const ctx={UrlFetchApp,Logger:{log(){}},Utilities:{sleep(){},formatDate:()=>'2026-10-04 09:00'},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='PAGE_TOKEN'?'TOK':(props[k]||null),setProperty:(k,v)=>{props[k]=v}})},
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]=sheet([['']])}),getUi:()=>{throw 'noui'}},
 ScriptApp:{getProjectTriggers:()=>trig.map(h=>({getHandlerFunction:()=>h,_h:h})),deleteTrigger:t=>{const i=trig.indexOf(t._h);if(i>=0)trig.splice(i,1)},newTrigger:h=>({timeBased:()=>({everyHours:()=>({create:()=>trig.push(h)})})})},ALBUM_SHEET:'FB ALBUM CAPTION',ALBUM_HEADERS:[],
 _fbFindCol:(h,n)=>{const i=h.indexOf(n);return i<0?0:i+1},_withLock:f=>f(),_tryWrite:(l,f)=>{f();return true},_sp2ResetWriteErrors(){},_sp2WriteErrMsg:()=>'',
 _metaInvIndex:()=>inv,_imageUrl:p=>'https://r2/'+p+'/1.jpg',_buildCaption:it=>'CAP '+it.name,
 _getBaseTitle:t=>t.replace(/\s*\(RESTOCK-\d+\)/i,'').trim(),
 _metaDupKey:it=>[it.name.replace(/\s*\(RESTOCK-\d+\)/i,'').toLowerCase(),it.publisher||'',it.original||'',it.condition||'',''].join('|')};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);

ctx.SpreadsheetApp.getUi=()=>({alert:(t,m)=>{ctx.__last=t},Button:{YES:'YES'},ButtonSet:{},createMenu:()=>({})});
ctx.SpreadsheetApp.getUi=()=>({alert:(t)=>{ctx.__last=t;return 'YES'},Button:{YES:'YES'},ButtonSet:{YES_NO:1,OK:2}});
const live=()=>Object.keys(page).filter(a=>a!=='SYS').map(a=>a+':'+page[a].photos.length).join(' ');
console.log('start',live());
// 1. duplicate album guard
albums.rows.push(['T1',"'A9",'','',true]);
let threw=''; try{ctx._fbaRun(40,false)}catch(e){threw=e.message}
console.log('DUP GUARD ->',threw.slice(0,60)); albums.rows.pop();
// 2. start auto purge, hit rate limit -> not done, state running, posting paused
rate=true; ctx.fbaPurgeAuto(); console.log('after rate-limited pass:',ctx.__last,'| state=',props.FBA_PURGE,'| triggers=',trig.join(','),'|',live());
const pm=ctx._fbaRun(40,false); console.log('POST while running ->',pm.slice(0,40),'| posts made:',calls.filter(c=>c.startsWith('post')).length);
// 3. STOP (user) then resume
ctx.fbaRemoveTrigger(); console.log('after STOP triggers=',trig.join(',')||'none','state=',props.FBA_PURGE);
rate=false; ctx.fbaPurgeAuto(); console.log('after RESUME:',ctx.__last,'| state=',props.FBA_PURGE,'| triggers=',trig.join(','),'|',live());
console.log('Posted cleared:',cap.rows.slice(1).every(r=>r[5]===''),'| backup made:',!!sheets['FB ALBUM CAPTION BACKUP 2026-10-04']);
// 4. posting resumes after purge done and picks up where it is
const m=ctx._fbaRun(2,false); console.log('POST after purge ->',m.split('\n').filter(l=>/Posted OK|Still queued/.test(l)).join(' / '));
ctx.fbaRemoveTrigger(); console.log('STOP posting, triggers=',trig.join(',')||'none');
const m2=ctx._fbaRun(40,false); console.log('RESUME posting ->',m2.split('\n').filter(l=>/Posted OK|Still queued/.test(l)).join(' / '),'|',live());
// 5. trigger-handler path with no UI
props.FBA_PURGE='running'; ctx.SpreadsheetApp.getUi=()=>{throw 'noui'}; trig.length=0; trig.push('fbaPurgeStep'); ctx.fbaPurgeStep(); console.log('TRIGGER pass (no UI): state=',props.FBA_PURGE,'triggers=',trig.join(','));
