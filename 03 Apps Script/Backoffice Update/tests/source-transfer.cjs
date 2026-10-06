// Local-only UI file handoff for the browser editor. No Google/API credentials.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), archive=path.resolve(root,'../Live Source/Current-2026-09-10');
const allowed=['Code.gs','webapp.gs','Index.html','FbAlbum.gs'];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET' && req.url==='/'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end('<h1>OWARIN local source archive</h1><p>Save only to Live Source/Current-2026-09-10</p><form method="post" action="/archive"><label>Source bundle<textarea name="bundle" rows="10" cols="90"></textarea></label><button>Save source snapshot</button></form>');
  }
  if(req.method==='POST' && req.url==='/archive'){
    let body='';req.on('data',x=>{body+=x;if(body.length>3000000)req.destroy();});req.on('end',()=>{
      try{const data=JSON.parse(new URLSearchParams(body).get('bundle'));if(Object.keys(data).some(k=>!allowed.includes(k)))throw Error('Unknown file');
        fs.mkdirSync(archive,{recursive:true});for(const [k,v]of Object.entries(data)){if(typeof v!=='string'||v.length<10)throw Error('Bad source'); const dest=path.join(archive,k);if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')!==v)throw Error('Snapshot already exists with different content');fs.writeFileSync(dest,v,'utf8');}
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Snapshot saved</h1><p>'+Object.keys(data).join(', ')+'</p>');
      }catch(e){res.statusCode=400;res.end(String(e));}
    });return;
  }
  const match=/^\/candidate\/(Core\.gs|Runtime\.gs|WebApp\.gs|SalesService\.gs|Index\.html|LabChecks\.gs|FbAlbum\.gs)$/.exec(req.url);
  if(req.method==='GET'&&match&&fs.existsSync(path.join(root,match[1]))){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<h1>'+match[1]+'</h1><label>Candidate source<textarea rows="25" cols="100">'+esc(fs.readFileSync(path.join(root,match[1]),'utf8'))+'</textarea></label>');}
  res.statusCode=404;res.end('Not found');
}).listen(8770,'127.0.0.1',()=>console.log('Source handoff UI http://127.0.0.1:8770/'));
