const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm'),assert=require('node:assert/strict'),w=require('./work.cjs');
const old=path.join(w.dir,'../W1-20261003-01');
const files=['Code_v32.gs','WebApp_v32.gs','Index.html','W1Orders.gs'].map(file=>({file,sha256LF:w.sha(fs.readFileSync(path.join(w.dir,'candidate',file),'utf8').replace(/\r\n/g,'\n'))}));
const revision=w.id+'/v32@'+w.sha(JSON.stringify(files));
w.write('04 Design Tools/logs/W1-20261004-01/revision.json',JSON.stringify({revision,time:w.time(),git:'No Git repository; four LF-normalized file SHA256 bundle',base:JSON.parse(fs.readFileSync(path.join(old,'revision.json'))).revision,files},null,2));
for(const name of ['Code_v32.gs','WebApp_v32.gs','W1Orders.gs'])assert.equal(w.sha(fs.readFileSync(path.join(w.dir,'candidate',name))),w.sha(fs.readFileSync(path.join(old,'candidate',name))));
for(const m of fs.readFileSync(path.join(w.dir,'candidate/Index.html'),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
const git='C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
fs.mkdirSync(path.join(w.dir,'diff'),{recursive:true});
for(const [label,a,b] of [['candidate-Index',path.join(old,'candidate/Index.html'),path.join(w.dir,'candidate/Index.html')],['test-Index',path.join(old,'test-runtime/Index.html'),path.join(w.dir,'test-runtime/Index.html')],['test-W1Qa',path.join(old,'test-runtime/W1Qa.gs'),path.join(w.dir,'test-runtime/W1Qa.gs')]]){const r=cp.spawnSync(git,['diff','--no-index','--',a,b],{encoding:'utf8'});if(r.status>1)throw Error(r.stderr);fs.writeFileSync(path.join(w.dir,'diff',label+'.diff'),r.stdout);}
w.log('REVISION','Freeze candidate business source','PASS backend three files byte-identical; Index syntax PASS; exact '+revision,'Previous complete v31→v32 diff under W1-20261003-01/diff; continuation only Index diff');
console.log(revision);
