// Same loopback UI-transfer pattern as W2 serve.cjs; scoped evidence only.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const d=__dirname,allowed=new Set(['sources-before.json','manifest-before.json','sources-after.json','sources-after-full.json','sources-final.json','project-settings.json','triggers-before.json','deployment-before.json','deployment-after.json','backup-copy.json','native-dryrun.json','native-migration.json','native-migration-retry.json','native-replay.json','native-readiness.json','smoke.png','backup.png']);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer(async(req,res)=>{try{
 const [kind,file]=req.url.slice(1).split('/');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(kind==='source'){if(!['Code_v41.gs','WebApp_v41.gs','Index.html','W1Orders.gs','W2Clients.gs','LabelRenderer.html','W2LabelUI.html','W2Suggest.html','LabelDialog.html','ReleaseMigration.gs'].includes(file))throw Error('SCOPE');res.end('<label>Source<textarea id="source">'+esc(fs.readFileSync(path.join(d,'candidate',file),'utf8'))+'</textarea></label>');return;}
 if(kind!=='capture'||!allowed.has(file))throw Error('SCOPE');
 if(req.method!=='POST'){res.end('<label>Evidence<textarea id="capture"></textarea></label><button id="save">Save evidence</button><p id="result"></p><script>document.getElementById("save").onclick=()=>fetch(location.pathname,{method:"POST",body:document.getElementById("capture").value}).then(r=>r.text()).then(t=>document.getElementById("result").textContent=t);</script>');return;}
 let body='';for await(const chunk of req)body+=chunk;if(body.length>10000000)throw Error('SIZE');
 const target=path.join(d,file);if(fs.existsSync(target))throw Error('EVIDENCE_EXISTS');
 if(file.endsWith('.json'))JSON.parse(body);const bytes=file.endsWith('.png')?Buffer.from(body,'base64'):Buffer.from(body);
 const csv=r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')+'\n';
 fs.appendFileSync(path.join(d,'changes.csv'),csv([new Date().toISOString(),'W3-PROD-20261006-01','CAPTURE-DRYRUN','ABSENT',target,'Scoped local evidence only']));
 fs.writeFileSync(target,bytes);fs.appendFileSync(path.join(d,'changes.csv'),csv([new Date().toISOString(),'W3-PROD-20261006-01','CAPTURE','ABSENT',crypto.createHash('sha256').update(bytes).digest('hex'),file+' '+bytes.length+' bytes PASS']));res.end('PASS '+file);
 }catch(e){res.statusCode=400;res.end(e.message);}}).listen(8769,'127.0.0.1',()=>console.log('W3 transfer on 127.0.0.1:8769'));

