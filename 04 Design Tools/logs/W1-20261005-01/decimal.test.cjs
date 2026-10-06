const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{fixture}=require('./harness.cjs');
const rev=JSON.parse(fs.readFileSync(__dirname+'/revision.json'));
for(const f of rev.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/candidate/'+f.file,'utf8').replace(/\r\n/g,'\n')).digest('hex').toUpperCase(),f.sha256LF);
const results=[];
function setup(legacy=false,small=false){
 const f=fixture(true),c=f.c;c._recalcRow=()=>{};
 f.item('DECIMAL-A','Instock','GGB',{price:small?0.10:390.10,cost:small?0.05:100.05});f.item('DECIMAL-B','Instock','MAG',{price:0.20,cost:0.05});
 // Independent cent-exact formula oracle plus Sheets' observed numeric storage roundtrip.
 const sales=f.sheets.SALES,cols=c._resolveColumns(sales);let adjustment=0,typed=null;
 const range=sales.getRange;sales.getRange=(row,col,h=1,w=1)=>{const r=range(row,col,h,w),get=r.getValues;
  r.getValues=()=>get().map((rr,i)=>rr.map((v,j)=>{if(col+j!==cols.netProfit||!String(sales.rows[row+i-1]?.[col+j-1]).startsWith('='))return v;
   if(typed!==null)return typed;const id=sales.rows[row+i-1]?.[cols.orderLineId-1];return (id.endsWith('-L1')?(small?-9.97:280.03):0.15)+adjustment;}));
  r.getValue=()=>r.getValues()[0][0];return r;};
 const orders=f.sheets.ORDERS,orderRange=orders.getRange;orders.getRange=(...args)=>{const r=orderRange(...args),get=r.getValues;r.getValues=()=>get().map(rr=>rr.map(v=>typeof v==='number'?Number(v.toPrecision(15)):v));r.getValue=()=>r.getValues()[0][0];return r;};
 if(legacy){const prepare=c._w1Prepare_;c._w1Prepare_=(...args)=>{const s=prepare(...args);delete s.format;delete s.alloc;s.subtotal=s.lines.reduce((a,l)=>a+l.entered,0);s.total=s.subtotal+s.customerShipping;return s;};}
 const p={requestId:'r7-decimal-create-001',channel:'SHOP',items:[{source:'GGB',sku:'DECIMAL-A',price:small?'0.10':'390.10'},{source:'MAG',sku:'DECIMAL-B',price:'0.20'}],customerShipping:'50.00',shippingSubsidy:'10.02'};
 return {f,c,p,sales,cols,adjust:v=>adjustment=v,type:v=>typed=v};
}
function confirm(x,o){return {requestId:'r7-decimal-confirm-001',orderId:o.orderId,expectedRevision:o.revision,labelLater:true};}
function check(x,p){const result=x.c._w1Mutate_('confirm',p);assert.equal(result.status,'SOLD');assert.equal(x.c._w1Mutate_('confirm',p).replayed,true);assert.equal(x.c._w1Requests_()[p.requestId].state,'DONE');assert.equal(x.c._apiSalesList().rows.length,2);assert.equal(x.sales.rows.filter(r=>r[x.cols.orderLineId-1]&&r[x.cols.orderLineId-1]!=='Order Line ID').length,2);return result;}
for(const legacy of [false,true])for(const small of [false,true]){
 const x=setup(legacy,small),o=x.c._w1Mutate_('create',x.p),r=x.c._w1Order_(o.orderId);assert.equal(r[7],small?0.30:390.30);assert.equal(r[10],small?50.30:440.30);assert.equal(x.c._w1Mutate_('create',x.p).replayed,true);
 const prefix=JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows);check(x,confirm(x,o));assert.equal(JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows.slice(0,JSON.parse(prefix).length)),prefix);
 if(legacy&&small)assert.equal(x.c._w1Requests_()[x.p.requestId].snap.subtotal,0.1+0.2);
 results.push({engine:legacy?'legacy':'batch20',small,status:'SOLD',oldEventsUnchanged:true});
}
for(const legacy of [false,true])for(const boundary of ['sales','order']){
 const x=setup(legacy,true),o=x.c._w1Mutate_('create',x.p),p=confirm(x,o),orig=x.c._tryWrite;let hit=false;
 x.c._tryWrite=(label,fn)=>orig(label,()=>{fn();if(!hit&&(boundary==='sales'?(legacy?label==='W1 SALES profit':label==='W1 SALES block'):label==='W1 ORDERS '+o.orderId)){hit=true;throw Error('R7_AFTER_EFFECT');}});
 assert.throws(()=>x.c._w1Mutate_('confirm',p),/RECOVERY_REQUIRED/);assert(hit);const prefix=JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows);
 assert.throws(()=>x.c._w1Mutate_('cancel',{requestId:'r7-sibling-cancel-001',orderId:o.orderId,expectedRevision:1}),/RECOVERY_REQUIRED/);
 x.c._tryWrite=orig;check(x,p);assert.equal(JSON.stringify(x.f.sheets['ORDER REQUESTS'].rows.slice(0,JSON.parse(prefix).length)),prefix);
 results.push({engine:legacy?'legacy':'batch20',afterEffect:boundary,sameIdRecovery:'SOLD',salesRows:2,siblingBlocked:true});
}
for(const legacy of [false,true])for(const bad of [0.01,-0.01,'280.03','#VALUE!',NaN,Infinity]){
 const x=setup(legacy),o=x.c._w1Mutate_('create',x.p),p=confirm(x,o);typeof bad==='number'&&isFinite(bad)?x.adjust(bad):x.type(bad);
 assert.throws(()=>x.c._w1Mutate_('confirm',p),/RECOVERY_REQUIRED.*SALES_PROFIT_VALUE/);assert.equal(x.c._w1Requests_()[p.requestId].state,'NEEDS_REVIEW');
 x.adjust(0);x.type(null);check(x,p);results.push({engine:legacy?'legacy':'batch20',bad:String(bad),rejected:true,sameIdRecovery:'SOLD'});
}
{
 const x=setup();for(const [v,l,c,s] of [[280.03,390.1,100.05,10.02],[280.03000000000003,390.1,100.05,10.02],[280,390,100,10],[0,100.05,100.05,0],[-0.02,0,0.01,0.01],[9999999.98,10000000,0.01,0.01]])assert.equal(x.c._w1ProfitMatches_(v,l,c,s),true);
 assert.equal(x.c._w1ProfitMatches_(280.030001,390.1,100.05,10.02),false);results.push({integerZeroNegativeBoundedNoise:'PASS'});
}
const output={revision:rev.revision,groups:results.length,checks:results};fs.writeFileSync(__dirname+'/decimal-results.json',JSON.stringify(output,null,2)+'\n');
fs.appendFileSync(__dirname+'/changes.csv',[new Date().toISOString(),'W1-20261005-01','R7-TEST','v38 cent-exact formula/storage readback, legacy totals, typed/1cent rejection, after-effect fixed-ID replay',`PASS ${results.length} groups`,'decimal.test.cjs; decimal-results.json; no Google writes'].map(v=>'"'+v.replaceAll('"','""')+'"').join(',')+'\n');console.log(JSON.stringify(output,null,2));
