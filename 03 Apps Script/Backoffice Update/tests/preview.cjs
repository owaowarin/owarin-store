// Local UI fixture only; no Google or production connections and no persistent writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const fixture=String.raw`
const demo={GGB:[],MAG:[]};
function demoBook(source,productId,name,status,price){
 const r={};['publisher','platform','genre','subGenre','type','condition','original','cost','suggested','marketplace','grossProfit','priceContentLists','soldDate','listedDate','copyFlags','rarity','marketRef','refNote','priceRange','maxGRef'].forEach(k=>r[k]='');
 return Object.assign(r,{source,productId,name,baseTitle:name,status,price,condition:'A',publisher:'DEMO',cost:100,type:source==='GGB'?'Strategy Guide':'Magazine'});
}
demo.GGB=[demoBook('GGB','DEMO-G10','Final Fantasy 10','Instock',410),demoBook('GGB','DEMO-G2','Final Fantasy 2','Instock',220),demoBook('GGB','DEMO-OLD','Chrono Trigger','Auction',750)];
demo.MAG=[demoBook('MAG','DEMO-M2','Model Graphix 2','Instock',180),demoBook('MAG','DEMO-M10','Model Graphix 10','Sold',250)];
window.google={script:{get run(){let ok,fail;return{withSuccessHandler(f){ok=f;return this},withFailureHandler(f){fail=f;return this},api(action,p){setTimeout(()=>{try{
 let data;
 if(action==='inventory.bootstrap')data={...demo,settings:{ship:{base:50,step:10,cap:100},bank:{}},sheetUrl:'http://127.0.0.1:8769/DEMO',generatedAt:new Date().toISOString()};
 else if(action==='sales.list')data={rows:[],pendingRequests:[],history:Object.values(demo).flat().filter(r=>['Sold','Auction'].includes(r.status)).map(r=>({...r,product:r.name,sku:r.productId,method:r.status==='Auction'?'AUCTION':'DIRECT'}))};
 else if(action==='inventory.add'){if(p.title==='FAIL')throw Error('DEMO: save failed; values retained');const r=demoBook(p.source,'DEMO-NEW-'+Date.now(),p.title,'Instock',p.price);r.publisher=p.pub;r.condition=p.cond;r.cost=p.cost;demo[p.source].push(r);data={item:r,result:{},bookingMatches:[]};}
 else throw Error('Preview supports inventory, Add and sales history only');
 ok(JSON.stringify({ok:true,data}));
 }catch(e){ok(JSON.stringify({ok:false,error:e.message,safeToEditCheckout:true}));}},100)}}}}};
`;
http.createServer((req,res)=>{
 if(req.url!=='/'){res.writeHead(404);return res.end('Not found');}
 let html=fs.readFileSync(path.join(__dirname,'../Index.html'),'utf8');
 html=html.replace('<script>','<script>'+fixture+'</script><script>')
 .replace('<body>','<body><div style="padding:10px;background:#ffdf8b;color:#171717;text-align:center">LOCAL TEST — ข้อมูลสมมติ ไม่เชื่อม Google Sheet</div>');
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);
}).listen(8769,'127.0.0.1',()=>console.log('UI fixture: http://127.0.0.1:8769/'));
