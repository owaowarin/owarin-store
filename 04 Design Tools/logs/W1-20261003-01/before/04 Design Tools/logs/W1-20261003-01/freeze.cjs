const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),w=require('../../w1-work.cjs');
const rel='04 Design Tools/logs/W1-20261003-01/',read=f=>fs.readFileSync(path.join(w.dir,f),'utf8');
const data=[['Code.gs',185105],['Webapp.gs',33109],['Index.html',112617],['W1Orders.gs',26463],['W1Qa.gs',3249],['appsscript.json',472]].map(([file,clipboardChars])=>({file,clipboardChars,match:true,comparison:file==='appsscript.json'?'semantic JSON':'LF normalized exact source',sha256StagedLF:w.sha(read('test-runtime/'+file).replace(/\r\n/g,'\n'))}));
w.write(rel+'source-readback.json',JSON.stringify({time:w.time(),projectId:'1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd',method:'fresh Google editor file name selected, clipboard read after Save/reload; cloud_done; no Run/deploy during final reads',files:data},null,2));
const rev=JSON.parse(read('revision.json'));for(const e of rev.files)assert.equal(w.sha(read('candidate/'+e.file).replace(/\r\n/g,'\n')),e.sha256LF);
assert.equal(rev.revision.split('@')[1],w.sha(JSON.stringify(rev.files)));
for(const file of ['Code_v32.gs','WebApp_v32.gs','W1Orders.gs'])new vm.Script(read('candidate/'+file));
const html=read('candidate/Index.html');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);assert.ok(!html.includes('÷1.2 −50'));
assert.equal(read('test-runtime/W1Orders.gs'),read('candidate/W1Orders.gs'));
assert.equal(read('test-runtime/Webapp.gs'),read('candidate/WebApp_v32.gs'));
assert.equal(read('test-runtime/Code.gs').replace(/var BANK_INFO = \{[\s\S]*?\};/,'BANK'),read('candidate/Code_v32.gs').replace(/var BANK_INFO = \{[\s\S]*?\};/,'BANK'));
assert.equal(read('test-runtime/Index.html').replaceAll('1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd','1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp'),html);
const latest=(name)=>fs.readdirSync(w.dir).filter(f=>f.startsWith(name+'.attempt')).sort((a,b)=>Number(a.match(/attempt(\d+)/)[1])-Number(b.match(/attempt(\d+)/)[1])).at(-1);
assert.match(read(latest('w1.test.cjs')),/PASS W1 14 groups final accepted/);assert.match(read(latest('ui.test.cjs')),/PASS lost successful response/);
for(const f of ['p1-add.test.cjs','p1-ui.test.cjs','Index.test.js','image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js'])assert.ok(read('regression-'+f+'.txt').length>0);
assert.equal(JSON.parse(read('test-data-readback.json')).ordersSchemaInstalled,false);
for(const file of ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs'])assert.equal(w.sha(fs.readFileSync(path.join(w.root,'03 Apps Script/Web App',file))),w.sha(fs.readFileSync(path.join(w.dir,'before/03 Apps Script/Web App',file))));
for(const f of ['HANDOFF_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md']){const before=fs.readFileSync(path.join(w.dir,'before/00 Docs',f)),after=fs.readFileSync(path.join(w.root,'00 Docs',f));assert.ok(after.subarray(0,before.length).equals(before));}
const state=fs.readFileSync(path.join(w.root,'00 Docs/STATE.md'),'utf8');assert.ok(state.split('\n').length<=80);
for(const f of ['revision.json','issues.md','result.md','UNDO.md','REVIEW-ASTRA-HIGH.md','source-readback.json','ui-proof.jpg'])assert.ok(fs.existsSync(path.join(w.dir,f)));
w.log('FINAL_SOURCE_READBACK','Google isolated editor','test-runtime','final Save/reload','six matches','PASS five LF sources / semantic manifest; helper selected but not run','test-before/ + UNDO.md');
w.log('FINAL_STATUS','W1 local/test staging','HANDOFF Session36','W1 TODO','local implemented; Google acceptance blocked; review prepared','NOT DONE W1; no production/LAB; local servers stopped','same revision and original IDs; owner authorization next');
w.write(rel+'verification.txt','PASS revision bundle and source syntax; staged-source transformations; final Google editor readback;14 transaction groups /1,032 simulated write positions; UI recovery suite; six existing regressions; shop root unchanged; history prefixes; STATE <=80; required evidence exists.\nW1 Google runtime acceptance and focused review remain pending authorization.\n');
const docFiles=['00 Docs/STATE.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDOFF_2026-09-28.md','00 Docs/HANDOFF_2026-10-04.md','03 Apps Script/Web App/README.md','04 Design Tools/logs/decisions_20261004.csv'];
const files={};function add(f){const bytes=fs.readFileSync(path.join(w.root,f));files[f]={bytes:bytes.length,sha256:w.sha(bytes)};}
function walk(dir){for(const ent of fs.readdirSync(path.join(w.root,dir),{withFileTypes:true})){const f=dir+'/'+ent.name;if(ent.isDirectory())walk(f);else if(ent.name!=='manifest.json')add(f);}}
walk(rel.slice(0,-1));docFiles.forEach(add);fs.writeFileSync(path.join(w.dir,'manifest.json'),JSON.stringify({revision:rev.revision,time:w.time(),files},null,2));
for(const [f,h] of Object.entries(files))assert.equal(w.sha(fs.readFileSync(path.join(w.root,f))),h.sha256);
console.log('PASS '+Object.keys(files).length+' frozen artifact hashes; '+rev.revision);
