// Source transfer UI bound to loopback only. Serves sanitized test package, not the workspace.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'test-runtime'),files=['Code.gs','Webapp.gs','Index.html','W1Orders.gs','W1Qa.gs'];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer((req,res)=>{const f=decodeURIComponent(req.url.slice(1));if(!files.includes(f)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<h1>W1 sanitized test source</h1>'+files.map(f=>'<p><a href="/'+f+'">'+f+'</a></p>').join(''));return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<h1>'+f+'</h1><label>Source<textarea id="source" style="width:98%;height:80vh">'+escape(fs.readFileSync(path.join(dir,f),'utf8'))+'</textarea></label>');
}).listen(8765,'127.0.0.1',()=>console.log('W1 sanitized transfer http://127.0.0.1:8765'));
