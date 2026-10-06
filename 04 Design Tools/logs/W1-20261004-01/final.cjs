const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),w=require('./work.cjs');
const rel='04 Design Tools/logs/W1-20261004-01/',old=path.join(w.dir,'../W1-20261003-01'),read=f=>fs.readFileSync(f),lf=f=>read(f).toString('utf8').replace(/\r\n/g,'\n');
w.log('CLEANUP','Keep test editor/Sheet/final dev; close temporary tabs; Ctrl+C loopback8765','PASS tabs marked; server exited after interrupt','Test Google source/data retained; no production rollback required');
const docs=['00 Docs/STATE.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDOFF_2026-09-28.md','00 Docs/HANDOFF_2026-10-04.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md'];
const messages=[];
for(const name of ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs'])assert.equal(w.sha(read(path.join(w.root,'03 Apps Script/Web App',name))),w.sha(read(path.join(old,'before/03 Apps Script/Web App',name))),name);
messages.push('PASS root production four-file source unchanged versus Session36 baseline backups; no fresh production deployment assertion.');
const revision=JSON.parse(read(path.join(w.dir,'revision.json')));
const files=revision.files.map(({file})=>({file,sha256LF:w.sha(lf(path.join(w.dir,'candidate',file)))}));
assert.deepEqual(files,revision.files);assert.equal(revision.revision,w.id+'/v32@'+w.sha(JSON.stringify(files)));
for(const name of ['Code_v32.gs','WebApp_v32.gs','W1Orders.gs'])assert.equal(w.sha(read(path.join(w.dir,'candidate',name))),w.sha(read(path.join(old,'candidate',name))));
for(const name of ['Code.gs','Webapp.gs','W1Orders.gs','appsscript.json'])assert.equal(w.sha(read(path.join(w.dir,'test-runtime',name))),w.sha(read(path.join(old,'test-runtime',name))));
messages.push('PASS exact candidate revision and byte-identical three backend files; four unchanged test files inherit Session36 Google readback.');
const previous=JSON.parse(read(path.join(old,'source-readback.json')));
const readback={time:w.time(),projectId:previous.projectId,files:['Code.gs','Webapp.gs','Index.html','W1Orders.gs','W1Qa.gs','appsscript.json'].map(file=>({file,sha256StagedLF:w.sha(lf(path.join(w.dir,'test-runtime',file))),evidence:['Index.html','W1Qa.gs'].includes(file)?'Session37 selected-file full clipboard LF comparison + saved/cloud_done; changes.csv install/readback entries':'Session36 source-readback.json; local staged bytes unchanged, not redundantly read in Session37'})),testOnly:'Index project storage keys and QA controls; sanitized test bank Code; guarded W1Qa helper; constrained manifest. Do not install test-runtime to production.'};
w.write(rel+'source-readback.json',JSON.stringify(readback,null,2));
const html=lf(path.join(w.dir,'test-runtime/Index.html')),candidate=lf(path.join(w.dir,'candidate/Index.html'));
const a=html.indexOf('<aside'),b=html.indexOf('</script>',a)+9;assert(a>=0&&b>a);
const stripped=html.slice(0,a)+html.slice(b);
const staged=candidate.replace(/owarin\.add\.pending\.[^']+\.v1/g,'owarin.add.pending.'+previous.projectId+'.v1').replace('owarin.w1.pending.TEST_OR_PROJECT.v32','owarin.w1.pending.'+previous.projectId+'.v32');
assert.equal(stripped,staged);messages.push('PASS test Index differs only by known QA controls and exact project storage keys.');
const state=lf(path.join(w.root,docs[0])),beforeState=lf(path.join(w.dir,'before',docs[0]));
assert(state.split('\n').length<=80);assert.equal(state.slice(state.indexOf('### 2. Meta')),beforeState.slice(beforeState.indexOf('### 2. Meta')));
for(const doc of docs.slice(2)) {const b=read(path.join(w.dir,'before',doc)),now=read(path.join(w.root,doc));assert(now.subarray(0,b.length).equals(b),'History prefix '+doc);}
messages.push('PASS STATE <=80 lines; other-stream suffix identical; five historical log/handbook/README prefixes preserved.');
const git='C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
for(const doc of docs){const r=cp.spawnSync(git,['diff','--no-index','--',path.join(w.dir,'before',doc),path.join(w.root,doc)],{encoding:'utf8'});assert(r.status<=1,r.stderr);w.write(rel+'diff/docs-'+path.basename(doc)+'.diff',r.stdout);}
const py='C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',r=cp.spawnSync(py,[path.join(w.dir,'final_google.py')],{encoding:'utf8'});
w.log('FINAL-CHECK','Final Google export invariant checks',`exit ${r.status}: ${r.stdout.trim()} ${r.stderr.trim()}`,'Preserve exports; assertion failure is diagnostic, no blind Google mutation');assert.equal(r.status,0,r.stderr);messages.push(r.stdout.trim());
const historical=JSON.parse(read(path.join(old,'manifest.json')));let frozen=0;
for(const [file,metadata] of Object.entries(historical.files))if(file.startsWith('04 Design Tools/logs/W1-20261003-01/')){assert.equal(w.sha(read(path.join(w.root,file))),metadata.sha256,file);frozen++;}
messages.push(`PASS ${frozen} historical package artifacts match frozen manifest; previous manifest SHA256 ${w.sha(read(path.join(old,'manifest.json')))}.`);
w.write(rel+'verification.txt',messages.join('\n')+'\nExact revision '+revision.revision+'\nFocused review prepared, not performed; W1 remains IN PROGRESS.\n');
w.log('FREEZE','Seal Session37 artifacts and seven doc diffs','PASS final verification; exact '+revision.revision,'UNDO.md / before/ / original IDs; preserve frozen manifest on future changes');
const manifest={revision:revision.revision,time:w.time(),historicalManifestSHA256:w.sha(read(path.join(old,'manifest.json'))),files:{}};
function add(file){const bytes=read(file);manifest.files[path.relative(w.root,file).split(path.sep).join('/')]= {bytes:bytes.length,sha256:w.sha(bytes)};}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='__pycache__'||e.name==='manifest.json')continue;const f=path.join(dir,e.name);e.isDirectory()?walk(f):add(f);}}
walk(w.dir);docs.forEach(doc=>add(path.join(w.root,doc)));
fs.writeFileSync(path.join(w.dir,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(messages.join('\n'));console.log('SEALED '+Object.keys(manifest.files).length+' hashes; '+revision.revision);
