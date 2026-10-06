const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{
  const name=decodeURIComponent(req.url.slice(1));
  if(!['Code.gs','webapp.gs','Index.html'].includes(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  fs.createReadStream(path.join(__dirname,name)).pipe(res);
}).listen(8765,'127.0.0.1',()=>console.log('P1 local source server ready'));
