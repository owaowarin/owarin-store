// One-shot bounded R7 candidate build. Historical v37 package stays frozen.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const dir=__dirname,base=path.join(dir,'../W1-20261004-05'),root=path.resolve(dir,'../../..');
const log=(id,action,result,recovery)=>fs.appendFileSync(dir+'/changes.csv',[new Date().toISOString(),'W1-20261005-01',id,action,result,recovery].map(v=>'"'+v.replaceAll('"','""')+'"').join(',')+'\n');
const docs=['00 Docs/STATE.md','00 Docs/HANDOFF_2026-10-05.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md','CLAUDE.md','04 Design Tools/logs/decisions_2026-10-05.csv'];
log('R7-DRYRUN','v37 strict binary money readback -> v38 cent totals and bounded profit readback; one writer','Plan: preserve formulas, IDs, payloads and old events; local + exact isolated test only','candidate/backup/v37; before/');
for(const rel of docs){const target=dir+'/before/'+rel;if(fs.existsSync(target))throw Error('BACKUP_EXISTS '+rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(root+'/'+rel,target);}
const handoff=root+'/00 Docs/HANDOFF_2026-10-05.md',archive=root+'/00 Docs/_archive/handoffs_old/HANDOFF_2026-10-05_Session42.md';
if(!archive.startsWith(root+path.sep)&&!archive.startsWith(root+'/'))throw Error('OUTSIDE_WORKSPACE');if(fs.existsSync(archive))throw Error('ARCHIVE_EXISTS');
log('ARCHIVE-DRYRUN',handoff+' -> '+archive,'References checked: STATE only; replacement dated handoff planned','before/00 Docs/HANDOFF_2026-10-05.md');fs.renameSync(handoff,archive);log('ARCHIVE',handoff+' -> '+archive,'Moved; no delete','archive retained');
fs.mkdirSync(dir+'/candidate/backup/v37',{recursive:true});
for(const f of ['Code_v37.gs','WebApp_v37.gs','W1Orders.gs','Index.html'])fs.copyFileSync(base+'/candidate/'+f,dir+'/candidate/backup/v37/'+f);
for(const f of ['Code','WebApp']){
 const source=fs.readFileSync(base+'/candidate/'+f+'_v37.gs','utf8').replaceAll('v37','v38');
 fs.writeFileSync(dir+'/candidate/'+f+'_v38.gs',source);fs.writeFileSync(dir+'/candidate/'+f+'_v37.gs','// Archived: backup/v37/'+f+'_v37.gs. Current local/test candidate: '+f+'_v38.gs.\n');new vm.Script(source);
}
fs.copyFileSync(base+'/candidate/Index.html',dir+'/candidate/Index.html');
let s=fs.readFileSync(base+'/candidate/W1Orders.gs','utf8').replaceAll('v37','v38');
function replace(a,b,n=1){if(s.split(a).length-1!==n)throw Error('PATCH_COUNT '+a);s=s.replaceAll(a,b);}
replace('function _w1Table_(name){',`// Sheets and V8 can differ below a cent. Preserve exact formulas and reject even 0.01 changes.
function _w1ProfitMatches_(value,ledger,cost,subsidy){
 var expected=(Math.round(ledger*100)-Math.round(cost*100)-Math.round(subsidy*100))/100;
 return typeof value==='number'&&isFinite(value)&&Math.abs(value-expected)<=0.0000001;
}
function _w1Table_(name){`);
replace('snap.subtotal=snap.lines.reduce(function(a,l){return a+l.entered;},0);snap.total=snap.subtotal+snap.customerShipping;','snap.subtotal=snap.lines.reduce(function(a,l){return a+Math.round(l.entered*100);},0)/100;snap.total=(Math.round(snap.subtotal*100)+Math.round(snap.customerShipping*100))/100;');
replace("typeof profitValue!=='number'||profitValue!==l.ledger-l.cost-(index===0?s.subsidy:0)",'!_w1ProfitMatches_(profitValue,l.ledger,l.cost,index===0?s.subsidy:0)');
replace('v!==part[j].ledger-part[j].cost-(start+j===0?s.subsidy:0)','!_w1ProfitMatches_(v,part[j].ledger,part[j].cost,start+j===0?s.subsidy:0)');
// Materialize historical floating totals as cents without modifying their immutable snapshots/hash.
replace("'',s.subtotal,s.customerShipping,s.subsidy,s.total,'',s.revision,req.id]","'',Math.round(s.subtotal*100)/100,s.customerShipping,s.subsidy,Math.round(s.total*100)/100,'',s.revision,req.id]",2);
new vm.Script(s);fs.writeFileSync(dir+'/candidate/W1Orders.gs',s);
fs.writeFileSync(dir+'/harness.cjs',fs.readFileSync(base+'/harness.cjs','utf8').replace("path.join(__dirname,'schema.json')","path.join(__dirname,'../W1-20261004-05/schema.json')").replaceAll('v37','v38'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').toUpperCase();
const files=['Code_v38.gs','WebApp_v38.gs','Index.html','W1Orders.gs'].map(file=>({file,sha256LF:hash(fs.readFileSync(dir+'/candidate/'+file,'utf8').replace(/\r\n/g,'\n'))}));
const revision='W1-20261005-01/v38@'+hash(JSON.stringify(files));fs.writeFileSync(dir+'/revision.json',JSON.stringify({revision,time:new Date().toISOString(),base:JSON.parse(fs.readFileSync(base+'/revision.json')).revision,files},null,2)+'\n');
log('R7-BUILD','v37 -> '+revision,'Syntax PASS; bank/source behavior otherwise unchanged','candidate/backup/v37; immutable previous package');console.log(revision);
