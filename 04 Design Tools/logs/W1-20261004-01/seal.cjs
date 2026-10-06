const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),w=require('./work.cjs');
const rel='04 Design Tools/logs/W1-20261004-01/';
const r=cp.spawnSync('C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe',['diff','--no-index','--',path.join(w.dir,'before',rel,'final_google.py'),path.join(w.dir,'final_google.py')],{encoding:'utf8'});
assert(r.status<=1,r.stderr);w.write(rel+'diff/final-google-checker-F01.diff',r.stdout);
w.log('FINAL-CHECK-F01-RESULT','Checker fix diff and same-step final export verification','PASS final.cjs: six orders/four ledgers, all latest DONE, original P1 cells preserved; no business source/data change','before/final_google.py and diff/final-google-checker-F01.diff; previous assertion logged; no runtime retest');
const file=path.join(w.dir,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file));
manifest.time=w.time();manifest.files={};
function add(f){const b=fs.readFileSync(f);manifest.files[path.relative(w.root,f).split(path.sep).join('/')]= {bytes:b.length,sha256:w.sha(b)};}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='__pycache__'||e.name==='manifest.json')continue;const f=path.join(dir,e.name);e.isDirectory()?walk(f):add(f);}}
walk(w.dir);
for(const doc of ['00 Docs/STATE.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDOFF_2026-09-28.md','00 Docs/HANDOFF_2026-10-04.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md'])add(path.join(w.root,doc));
fs.writeFileSync(file,JSON.stringify(manifest,null,2));
console.log('SEALED '+Object.keys(manifest.files).length+' files; manifest SHA256 '+w.sha(fs.readFileSync(file)));
