const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),dir=__dirname,id='W1-20261004-01';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').toUpperCase();
const time=()=>new Date().toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'})+' +0700';
function log(request,action,result,recovery='Read back before retry; preserve original Request ID'){
 const csv=path.join(dir,'changes.csv');if(!fs.existsSync(csv))fs.writeFileSync(csv,'timestamp,change_id,request_id,action,result,recovery\n');
 fs.appendFileSync(csv,[time(),id,request,action,result,recovery].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')+'\n');
 fs.appendFileSync(path.join(dir,'implementation.md'),'\n- '+time()+' | '+id+' / '+request+' | '+action+' | '+result+' | Recovery: '+recovery+'\n');
}
function backup(rel){const f=path.join(root,rel),out=path.join(dir,'before',rel);fs.mkdirSync(path.dirname(out),{recursive:true});if(!fs.existsSync(out)){fs.copyFileSync(f,out);log('BACKUP','Backup '+rel,sha(fs.readFileSync(out)));}}
function write(rel,data){const f=path.join(root,rel);if(fs.existsSync(f))backup(rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data);if(sha(fs.readFileSync(f))!==sha(data))throw Error('Readback');log('WRITE','Write '+rel,'readback PASS '+sha(data),'before/; compare newer edits before restoring');}
module.exports={root,dir,id,sha,time,log,backup,write};
if(require.main===module){
 for(const rel of ['00 Docs/STATE.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDOFF_2026-10-04.md','00 Docs/HANDOFF_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md'])backup(rel);
 log('START','Session37 test-only authorization/runtime continuation','User: เข้าไปทำได้เลย; frozen v32 revision unchanged; no production/Back House writes');
}
