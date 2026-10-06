// Same loopback UI-transfer pattern as W2 serve.cjs; scoped evidence only.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const d=__dirname,allowed=new Set(['sources-before.json','sources-after.json','native-probe.json','native-fixture.json','native-failure.json','native-retry.json','native-replay.json','ui-shop.png','ui-shopee.png','migration.png']);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer(async(req,res)=>{try{
 const [kind,file]=req.url.slice(1).split('/');res.setHeader('Content-Type','text/html; charset=utf-8');
 if(kind==='source'){res.end('<label>Source<textarea id="source">'+esc(fs.readFileSync(path.join(d,'W3Qa.gs'),'utf8'))+'</textarea></label>');return;}
 if(kind!=='capture'||!allowed.has(file))throw Error('SCOPE');
 if(req.method!=='POST'){res.end('<label>Evidence<textarea id="capture"></textarea></label><button id="save">Save evidence</button><p id="result"></p><script>document.getElementById("save").onclick=()=>fetch(location.pathname,{method:"POST",body:document.getElementById("capture").value}).then(r=>r.text()).then(t=>document.getElementById("result").textContent=t);</script>');return;}
 let body='';for await(const chunk of req)body+=chunk;if(body.length>10000000)throw Error('SIZE');
 const target=path.join(d,file);if(fs.existsSync(target))throw Error('EVIDENCE_EXISTS');
 if(file.endsWith('.json'))JSON.parse(body);const bytes=file.endsWith('.png')?Buffer.from(body,'base64'):Buffer.from(body);
 const csv=r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')+'\n';
 fs.appendFileSync(path.join(d,'changes.csv'),csv([new Date().toISOString(),'W3-20261006-02','CAPTURE-DRYRUN','ABSENT',target,'Scoped local evidence only']));
 fs.writeFileSync(target,bytes);fs.appendFileSync(path.join(d,'changes.csv'),csv([new Date().toISOString(),'W3-20261006-02','CAPTURE','ABSENT',crypto.createHash('sha256').update(bytes).digest('hex'),file+' '+bytes.length+' bytes PASS']));res.end('PASS '+file);
 }catch(e){res.statusCode=400;res.end(e.message);}}).listen(8768,'127.0.0.1',()=>console.log('W3 transfer on 127.0.0.1:8768'));
