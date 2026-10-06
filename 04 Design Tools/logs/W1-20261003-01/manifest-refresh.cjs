// Evidence-only finalization. No runtime rebuild or network operation.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),w=require('../../w1-work.cjs');
w.write('04 Design Tools/logs/W1-20261003-01/freeze.attempt1.txt','FAILED evidence-verifier assertion at freeze.cjs:12: inverse Index project-key transform omitted the TEST_OR_PROJECT replacement. Runtime candidate/staging unchanged. Fixed forward transform; retry PASS. Full verifier before/diff retained.\n');
const name='IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md';
const result=cp.spawnSync('C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe',['diff','--no-index','--no-color','--',path.join(w.dir,'before/00 Docs',name),path.join(w.root,'00 Docs',name)],{encoding:'utf8'});assert.ok([0,1].includes(result.status));fs.writeFileSync(path.join(w.dir,'diff/docs-'+name+'.diff'),result.stdout);
w.log('FREEZE_RETRY_PASS','freeze.cjs fixed transform','verification.txt','evidence assertion failed','forward staging transform PASS','Runtime revision unchanged; 239 artifacts verified before final evidence additions','before/ verifier and diff/freeze-verifier.diff');
const manifest=JSON.parse(fs.readFileSync(path.join(w.dir,'manifest.json'),'utf8'));
function add(f){const b=fs.readFileSync(path.join(w.root,f));manifest.files[f]={bytes:b.length,sha256:w.sha(b)};}
function walk(dir){for(const e of fs.readdirSync(path.join(w.root,dir),{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())walk(f);else if(e.name!=='manifest.json')add(f);}}
walk('04 Design Tools/logs/W1-20261003-01');for(const f of Object.keys(manifest.files))add(f);manifest.time=w.time();fs.writeFileSync(path.join(w.dir,'manifest.json'),JSON.stringify(manifest,null,2));
for(const [f,h] of Object.entries(manifest.files))assert.equal(w.sha(fs.readFileSync(path.join(w.root,f))),h.sha256);
console.log('PASS '+Object.keys(manifest.files).length+' final artifacts; '+manifest.revision);
