const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),w=require('./work.cjs');
const files=['Index.html','W1Qa.gs'],esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer(async(req,res)=>{try{
 const route=req.url;let body='';if(req.method==='POST'){for await(const chunk of req){body+=chunk;if(body.length>2500000)throw Error('Too large');}}
 if(req.method==='POST'&&route.startsWith('/backup/')){let file=route.slice(8);if(!files.includes(file))throw Error('File');const expected=fs.readFileSync(path.join(w.dir,'../W1-20261003-01/test-runtime',file),'utf8').replace(/\r\n/g,'\n');if(body.replace(/\r\n/g,'\n')!==expected)throw Error('Fresh source differs; stop');w.write('04 Design Tools/logs/W1-20261004-01/fresh-source-before/'+file,body);res.end('Fresh backup matches frozen test source '+w.sha(body));return;}
 if(req.method==='POST'&&route==='/evidence'){const b=Buffer.from(body,'base64');if(b[0]!==255||b[1]!==216)throw Error('JPEG only');w.write('04 Design Tools/logs/W1-20261004-01/google-proof.jpg',b);res.end('Saved google-proof.jpg');return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
 if(route.startsWith('/backup/')||route==='/evidence'){res.end('<label>Evidence<textarea id="capture"></textarea></label><button id="save">Save evidence</button><p id="result"></p><script>document.getElementById("save").onclick=function(){fetch(location.pathname,{method:"POST",body:document.getElementById("capture").value}).then(r=>r.text()).then(t=>document.getElementById("result").textContent=t);}</script>');return;}
 const file=route.slice(1);if(files.includes(file)){res.end('<h1>'+file+'</h1><label>Source<textarea style="width:98%;height:80vh">'+esc(fs.readFileSync(path.join(w.dir,'test-runtime',file),'utf8'))+'</textarea></label>');return;}
 res.end('Scoped test QA source transfer');
 }catch(e){res.writeHead(400);res.end(e.message);}
}).listen(8765,'127.0.0.1',()=>console.log('QA test-only transfer localhost:8765'));
