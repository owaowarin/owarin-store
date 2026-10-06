// Session36: local evidence/backup utilities. No production network writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'), dir=path.join(__dirname,'logs','W1-20261003-01');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').toUpperCase();
const time=()=>new Date().toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'})+' +0700';
function log(action,source,destination,before,after,result,recovery='before/; preserve newer edits'){
 fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,'changes.csv');
 if(!fs.existsSync(f))fs.writeFileSync(f,'timestamp,change_id,request_id,action,source,destination,before,after,result,recovery\n');
 fs.appendFileSync(f,[time(),'W1-20261003-01','W1-'+action,action,source,destination,before,after,result,recovery].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')+'\n');
}
function backup(rel){const f=path.join(root,rel),out=path.join(dir,'before',rel);fs.mkdirSync(path.dirname(out),{recursive:true});if(!fs.existsSync(out)){fs.copyFileSync(f,out);log('BACKUP',f,out,sha(fs.readFileSync(f)),sha(fs.readFileSync(out)),'PASS');}}
function write(rel,text){const f=path.join(root,rel),was=fs.existsSync(f)?sha(fs.readFileSync(f)):'ABSENT';if(was!=='ABSENT')backup(rel);log('DRY_RUN',f,f,was,sha(text),'scoped local write');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text);if(sha(fs.readFileSync(f))!==sha(text))throw Error('Readback mismatch');log('COMMIT',f,f,was,sha(text),'readback PASS');}
if(require.main===module){
 for(const f of ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs'])backup('03 Apps Script/Web App/'+f);
 for(const f of ['STATE.md','PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','HANDOFF_2026-10-03.md','HANDOFF_2026-09-28.md'])backup('00 Docs/'+f);
 backup('03 Apps Script/Web App/README.md');
 for(const f of ['Code.gs','webapp.gs','Index.html']){const src=path.join(__dirname,'logs','P1-20261003-02','test-runtime-source',f);const out=path.join(dir,'test-before',f);fs.mkdirSync(path.dirname(out),{recursive:true});if(!fs.existsSync(out))fs.copyFileSync(src,out);log('TEST_BACKUP',src,out,sha(fs.readFileSync(src)),sha(fs.readFileSync(out)),'fresh editor LF hash matches Session33');}
 const fresh='C:/Users/JIN/AppData/Local/Temp/browser-use/exports/OWARIN STORE-58172928-af8b-4908-8ff3-aa39b3fbd891.xlsx';fs.copyFileSync(fresh,path.join(dir,'shop-schema-before.xlsx'));log('FRESH_READ_ONLY_EXPORT',fresh,path.join(dir,'shop-schema-before.xlsx'),'live read only',sha(fs.readFileSync(fresh)),'schema source; restricted business data');
 write('04 Design Tools/logs/W1-20261003-01/baseline.json',JSON.stringify({time:time(),source:'fresh production editor clipboard read, Saved to Drive; no mutation',hashes:{'Code_v31.gs':'6EF098CD39F5B82F888D60A41577C71ECD3C81C26D4E4604E41EEFB27E87CD5D','WebApp_v31.gs':'7102CC7FA4735F5859B7E8F11092B0CADC2BF155E5D204658949A11696ACE67D','Index.html':'5ECE912BC9AE2F7D7FBB9662C2E417B125F78930C68C0D9A03619DE44EB69AEB','P1Journal.gs':'FDF4B656488EA92DB4CCB50B573AC75BFD8AA27C91769B425E03FF06509890BF'},archive:'active references retained; no moves; owner housekeeping deferred'},null,2));
}
module.exports={root,dir,sha,time,log,backup,write};
