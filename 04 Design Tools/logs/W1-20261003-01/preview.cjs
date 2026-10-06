// Loopback browser check of the unchanged candidate UI. Synthetic in-memory Sheets only.
// This is NOT Google runtime acceptance and cannot close the isolated-Google gate.
const http=require('node:http'),fs=require('node:fs'),{fixture}=require('./harness.cjs'),w=require('../../w1-work.cjs');
const f=fixture(true);f.c.BANK_INFO={no:'TEST',bank:'TEST',account:'TEST'};
for(let i=1;i<=8;i++)f.item('UI-'+i,i===8?'Auction':'Instock','GGB',{name:'W1 UI synthetic Copy '+i});
const bridge=`<script>var google={script:{run:{withSuccessHandler:function(ok){return {withFailureHandler:function(fail){return {api:function(action,payload){fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,payload:payload})}).then(function(r){return r.text();}).then(ok,fail);}};}};}}}};</script>`;
http.createServer(async(req,res)=>{
 try{
  const route=req.url;let body='';if(req.method==='POST'){for await(const chunk of req){body+=chunk;if(body.length>2000000)throw Error('Body too large');}}
  if(route==='/api'&&req.method==='POST'){
   const p=JSON.parse(body),allowed=['inventory.bootstrap','orders.create','orders.cancel','orders.confirm','orders.list','orders.get','requests.get','sales.list','inventory.markSold'];if(!allowed.includes(p.action))throw Error('Preview action unsupported');
   const before=f.writes.length,result=f.c.api(p.action,p.payload);if(f.writes.length!==before)w.log('LOCAL_UI_'+p.action,'synthetic VM','synthetic VM',before,f.writes.length,result,'Preview data held in memory; no Google writes');res.end(result);return;
  }
  if(route==='/evidence'&&req.method==='POST'){
   const data=Buffer.from(body,'base64');if(data[0]!==255||data[1]!==216)throw Error('JPEG only');w.write('04 Design Tools/logs/W1-20261003-01/ui-proof.jpg',data);res.end('Saved ui-proof.jpg');return;
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  if(route==='/evidence'){res.end('<h1>Save captured UI evidence locally</h1><label>JPEG base64<textarea id="capture"></textarea></label><button id="save">Save JPEG</button><p id="result"></p><script>document.getElementById("save").onclick=function(){fetch("/evidence",{method:"POST",body:document.getElementById("capture").value}).then(r=>r.text()).then(t=>document.getElementById("result").textContent=t);}</script>');return;}
  const html=fs.readFileSync(__dirname+'/candidate/Index.html','utf8').replace('<head>','<head>'+bridge).replace('<body>','<body><p style="background:#fff3cd;color:#333;padding:8px">LOCAL SYNTHETIC UI — Google runtime acceptance pending authorization</p>');res.end(html);
 }catch(e){res.writeHead(400);res.end(e.message);}
}).listen(8766,'127.0.0.1',()=>{w.log('LOCAL_UI_PREVIEW','candidate/Index.html','http://127.0.0.1:8766',w.sha(fs.readFileSync(__dirname+'/candidate/Index.html')),'same UI + mock transport','Started; Google gate remains pending','Ctrl+C stops fixture');console.log('Local synthetic UI http://127.0.0.1:8766');});
