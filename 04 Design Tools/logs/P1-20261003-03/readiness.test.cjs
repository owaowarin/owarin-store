const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(__dirname+'/'+f,'utf8');
const before=read('before/Code_v30.gs'), after=read('stage/Code_v31.gs');
function removeRegions(s){
  s=s.slice(s.indexOf('function _sp2Cfg'));
  for(const [a,b] of [['// [ADD] addInventoryRow','// [J] regenerateAllSKUs'],['function _setDerivedFormulasForRow(','function _fixDerivedFormulasForSheet(']]){
    const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i);s=s.slice(0,i)+s.slice(j);
  }
  return s;
}
assert.equal(removeRegions(after),removeRegions(before),'all existing Meta/SKU code outside intended regions unchanged');
const schema=JSON.parse(read('shop-schema-before.json'));
const c=vm.createContext({Logger:{log(){}},Session:{getScriptTimeZone:()=> 'Asia/Bangkok'}});
vm.runInContext(after,c);vm.runInContext(read('stage/WebApp_v31.gs'),c);vm.runInContext(read('stage/P1Journal.gs'),c);
const sheets={};for(const name of ['GAME GUIDE BOOKS','MAGAZINE'])sheets[name]={getSheetId:()=>name==='MAGAZINE'?2:1,getLastColumn:()=>schema[name].headers.length,getRange:()=>({getValues:()=>[schema[name].headers]})};
let writes=0;
c.SpreadsheetApp={getActiveSpreadsheet:()=>({getId:()=> '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0',getSheetByName:n=>sheets[n]})};
c._addRequestSheet=()=>({getLastRow:()=>1});c._apiInvAddStatus=()=>({state:'NOT_FOUND'});
c.addInventoryRow=()=>{writes++;throw Error('Must not write');};
c.p1CheckAddReady();assert.equal(writes,0);
console.log('PASS: untouched Meta/SKU regions; actual fresh production headers resolve for GGB/MAG; readiness rejects bad source/status without any business call');
