const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/candidate/Index.html','utf8'),start=html.indexOf('var w1Pending='),end=html.indexOf('function w1CartPayload()',start);
const backing=new Map(),requests=[],deferred=[];
function ui(){const els={};const c=vm.createContext({Date,Math,JSON,Error,Promise,document:{querySelectorAll:()=>[]},$:id=>els[id]||=( {disabled:false,textContent:''}),sessionStorage:{getItem:k=>backing.get(k)||null,setItem:(k,v)=>backing.set(k,v),removeItem:k=>backing.delete(k)},toast(){},callApi:(action,payload)=>{requests.push({action,payload});return new Promise((resolve,reject)=>deferred.push({resolve,reject}));}});vm.runInContext(html.slice(start,end),c);return c;}
(async()=>{let c=ui(),p={requestId:'ui-server-intent-20261004',items:[{price:'0390.00'}]};
 c.w1Run('orders.create',p,true);assert.equal(requests[0].action,'requests.resume');assert.deepEqual(JSON.parse(JSON.stringify(requests[0].payload)),{requestId:p.requestId});
 assert.equal(JSON.parse([...backing.values()][0]).serverRecovery,true);
 c=ui();assert.equal(c.w1Pending.serverRecovery,true);assert.equal(c.w1Pending.payload.items[0].price,'0390.00');
 const promise=c.w1Send();assert.equal(requests[1].action,'requests.resume');deferred[1].resolve({status:'PENDING'});await promise;assert.equal(c.w1Pending,null);assert.equal(backing.size,0);
 c=ui();c.w1Run('orders.create',{requestId:'ui-normal-request-20261004'},false);assert.equal(requests[2].action,'orders.create');
 console.log('PASS actual UI recovery sends ID only and retains mode/exact intent across lost-response reload; normal send unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
