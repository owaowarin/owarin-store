// Mock test for SheetAudit.gs: read-only (no setter called), JSON shape, refs, duplicate hashes, no cell values leaked.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const writes=[];let dialog=null;
function sheet(name,vals,fr){const rows=vals.length,cols=vals[0].length;return{
 getName:()=>name,isSheetHidden:()=>false,getMaxRows:()=>rows+10,getMaxColumns:()=>cols,getLastRow:()=>rows,getLastColumn:()=>cols,getFrozenRows:()=>1,
 getConditionalFormatRules:()=>[1],getProtections:()=>[],getCharts:()=>[],getBandings:()=>[],getFilter:()=>null,
 getRange:(r,c,nr,nc)=>({getValues:()=>vals.slice(r-1,r-1+nr).map(x=>x.slice(c-1,c-1+nc)),getFormulasR1C1:()=>fr.slice(r-1,r-1+nr).map(x=>x.slice(c-1,c-1+nc)),
  getDataValidations:()=>[Array.from({length:nc},(_,i)=>i===0?{getCriteriaValues:()=>[{getA1Notation:()=>'A2:A99',getSheet:()=>({getName:()=>'TYPE LIST'})}],getCriteriaType:()=>'VALUE_IN_RANGE'}:null)],
  setValue(){writes.push(1)},setValues(){writes.push(1)}}),
 setName(){writes.push(1)},clear(){writes.push(1)},deleteRows(){writes.push(1)}};}
const PII='0812345678 Bangkok secret address';
const inv=sheet('GAME GUIDE BOOKS',[['Item name','Price','GP'],['Book A',100,90],['Book B',200,180],['','','']],[['','',''],['','','=R[0]C[-1]*0.9'],['','',"=VLOOKUP(R[0]C[-2],'FB CATALOGUE'!C1:C2,2,0)"],['','','']]);
const client=sheet('CLIENT',[['Name','Phone'],['Jin',PII]],[['',''],['','']]);
const dupA=sheet('FB ALBUM CAPTION BACKUP 2026-10',[['Product ID'],['X1']],[[''],['']]),dupB=sheet('Sheet23',[['Product ID'],['X1']],[[''],['']]);
const fb=sheet('FB CATALOGUE',[['id'],['1']],[['=ARRAYFORMULA(1)'],['']]);
const sheets=[inv,client,dupA,dupB,fb];
const ctx=vm.createContext({Date,JSON,Math,
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheets:()=>sheets,getId:()=>'ID',getSpreadsheetTimeZone:()=>'Asia/Bangkok',getSpreadsheetLocale:()=>'th_TH',getRecalculationInterval:()=>'ON_CHANGE',getNamedRanges:()=>[]}),
  ProtectionType:{RANGE:1,SHEET:2},getUi:()=>({showModalDialog:(h)=>{dialog=h.html;}})},
 ScriptApp:{getProjectTriggers:()=>[{getHandlerFunction:()=>'refreshMetaFeedAuto',getEventType:()=>'CLOCK',getTriggerSource:()=>'CLOCK'}]},
 HtmlService:{createHtmlOutput:h=>({html:h,setWidth(){return this},setHeight(){return this}})},
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(a,s)=>[...crypto.createHash('sha256').update(s,'utf8').digest()].map(b=>b>127?b-256:b),formatDate:()=>'2026-10-07_1200'}});
vm.runInContext(fs.readFileSync(__dirname+'/SheetAudit.gs','utf8'),ctx);
const file=ctx.sheetAuditRun();assert.equal(file,'sheet-audit_2026-10-07_1200.json');assert.equal(writes.length,0,'audit must not write');
const json=JSON.parse(JSON.parse(dialog.match(/var j=(".*?");document/)[1].replace(/\\u003c/g,'<')));
assert(!JSON.stringify(json).includes('0812345678'),'cell values must not leak');assert(!JSON.stringify(json).includes('Book A'));
const g=json.sheets.find(s=>s.name==='GAME GUIDE BOOKS');assert.equal(g.dataRows,2);assert.equal(g.formulaCells,2);assert.deepEqual(g.refsTo,{'FB CATALOGUE':1});
assert.equal(g.columns[2].fns.VLOOKUP,1);assert.equal(g.validation[0].source,'TYPE LIST!A2:A99');
const a=json.sheets.find(s=>s.name==='Sheet23'),b=json.sheets.find(s=>s.name.startsWith('FB ALBUM CAPTION BACKUP'));assert.equal(a.valuesHash,b.valuesHash);
assert.equal(json.sheets.find(s=>s.name==='FB CATALOGUE').columns[0].fns.ARRAYFORMULA,1);assert.equal(json.triggers[0].handler,'refreshMetaFeedAuto');
assert.equal(json.errors.length,0);console.log('PASS SheetAudit mock: read-only, no values leaked, refs/fns/validation/dup-hash/triggers');
