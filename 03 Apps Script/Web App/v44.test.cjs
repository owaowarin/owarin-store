// v44: journal lookup equivalence, formula readback, BOOKING by name, menu cleanup.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const code=read('Code_v44.gs'),web=read('WebApp_v44.gs');
function between(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i,a);return src.slice(i,j);}
// 1. _addFindPrior == old full-read algorithm on randomised journals
const find=vm.runInNewContext(between(code,'function _addFindPrior(','function _addRequestEvent(')+';_addFindPrior');
function oldAlgo(events,id){let prior=null,attempt=1;for(const e of events)if(String(e[2])===id){prior=e;attempt=Math.max(attempt,Number(e[3])+1);}return{prior,attempt};}
function journal(events){const hdr=['h'];const rows=[hdr,...events];let reads=[];return{getLastRow:()=>rows.length,reads,
 getRange:(r,c,h,w)=>({getValues:()=>{reads.push([r,c,h,w]);return Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1][c+j-1]));}})};}
let seed=7;const rnd=n=>(seed=(seed*1103515245+12345)&0x7fffffff)%n;
for(let t=0;t<300;t++){const n=rnd(30),ids=['A','B','C','D'];
 const ev=Array.from({length:n},(_,i)=>{const row=Array(17).fill('x');row[0]='E'+i;row[2]=ids[rnd(4)];row[3]=1+rnd(5);row[4]=['PREPARED','DONE','ERROR'][rnd(3)];return row;});
 for(const id of [...ids,'Z']){const j=journal(ev),got=find(j,id),want=oldAlgo(ev,id);
  assert.equal(JSON.stringify(got.prior),JSON.stringify(want.prior));assert.equal(got.attempt,want.attempt);
  for(const rd of j.reads)assert(rd[3]===2||rd[3]===17&&rd[2]===1,'only 2-col scan + one full row: '+rd);}}
assert.equal(JSON.stringify(find(journal([]),'A')),JSON.stringify({prior:null,attempt:1}));
// 2. addInventoryRow / status use the helper; old full read gone
assert(!/getRange\(2, 1, journal\.getLastRow\(\) - 1, 17\)/.test(code));assert(code.includes('_addFindPrior(journal, requestId)'));
assert(web.includes('_addFindPrior(journal, id).prior')&&!web.includes('getRange(2, 1, last - 1, 17)'));
assert(code.includes('getRange(newRow, 1, 1, lastCol).getFormulas()[0]')&&!code.includes('.getFormula() !== formulas[key]'));
// 3. BOOKING by name first, header scan fallback
function booking(sheetsByName,scan){const calls={scan:0};
 const ctx=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheetsByName[n]||null})},
  _getBaseTitle:x=>x,_resolveColumns:s=>s.COL,_sheetByHeaders:()=>{calls.scan++;return scan;}});
 vm.runInContext(between(web,'function _apiBookingMatch(','\nfunction ')+'\n',ctx);return{ctx,calls};}
const mk=(rows,COL)=>({COL,getLastRow:()=>rows.length+1,getRange:(r,c,n)=>({getValues:()=>rows.map(x=>[x[c===1?0:c===2?1:2]])})});
const good=mk([['Ann','Zelda','1']],{bookingName:1,gameTitle:2,queue:3});
let b=booking({BOOKING:good},null);let r=b.ctx._apiBookingMatch('Zelda');assert.equal(r.matches.length,1);assert.equal(b.calls.scan,0,'no scan when BOOKING exists');
b=booking({},good);r=b.ctx._apiBookingMatch('Zelda');assert.equal(r.matches.length,1);assert.equal(b.calls.scan,1,'fallback scan when no BOOKING tab');
b=booking({BOOKING:mk([],{})},good);b.ctx._apiBookingMatch('Zelda');assert.equal(b.calls.scan,1,'fallback when BOOKING lacks headers');
// 4. menu cleanup (TOOLS-MENU-1)
const menu=between(code,'function onOpen()','\n}\n');
for(const gone of ['sp2BuildSeriesMap','r2ExportInstockSnapshot','r2ShowUploadResults','forceRegenerateAllSKUs'])assert(!menu.includes('"'+gone+'"'),'still in menu: '+gone);
for(const kept of ['refreshMetaFeed','regenerateAllSKUs','validateAllSKUs','sortInventory','fixDerivedFormulas','sp2Setup','sp2Layout','sp2MigrateFlags','buildFbCatalogue','rebuildDescriptions','exportMetaCsv','setupInstallableTrigger','fixAllRestockTags','openLabelTool','sp2ApplySuggestedAll'])assert(menu.includes('"'+kept+'"'),'missing from menu: '+kept);
const setup=menu.slice(menu.indexOf('Setup & repair'));for(const m of ['sp2Setup','sp2Layout','sp2MigrateFlags','buildFbCatalogue','rebuildDescriptions','exportMetaCsv'])assert(setup.includes('"'+m+'"'),'not in Setup & repair: '+m);
assert(menu.includes('fbaMenu_(ui)'),'FB Album menu stays (parked, not removed)');
console.log('PASS v44: journal lookup == old algorithm (300 random journals, 2-col scan), formula readback, BOOKING by name + fallback, menu cleanup');
