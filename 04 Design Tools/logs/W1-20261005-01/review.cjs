const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.join(__dirname,'../W1-20261004-05'),{fixture}=require(base+'/harness.cjs');
const rev=JSON.parse(fs.readFileSync(base+'/revision.json','utf8'));
for(const file of rev.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+'/candidate/'+file.file,'utf8').replace(/\r\n/g,'\n')).digest('hex').toUpperCase(),file.sha256LF);
function run(rounded){
 const f=fixture(true);f.item('DECIMAL-REVIEW','Instock','GGB',{cost:100.05,price:390.10});
 const s=f.sheets.SALES,c=f.c._resolveColumns(s),range=s.getRange;
 if(rounded)s.getRange=(row,col,h=1,w=1)=>{const r=range(row,col,h,w),get=r.getValues,getOne=r.getValue;
  function normalize(v,i,j){return col+j===c.netProfit&&typeof s.rows[row+i-1]?.[col+j-1]==='string'&&s.rows[row+i-1][col+j-1].startsWith('=')?Math.round(v*100)/100:v;}
  r.getValues=()=>get().map((rr,i)=>rr.map((v,j)=>normalize(v,i,j)));r.getValue=()=>normalize(getOne(),0,0);return r;};
 const order=f.c._w1Mutate_('create',{requestId:'review-decimal-create',channel:'SHOP',items:[{source:'GGB',sku:'DECIMAL-REVIEW',price:'390.10'}],customerShipping:'50.00',shippingSubsidy:'10.02'});
 const p={requestId:'review-decimal-confirm',orderId:order.orderId,expectedRevision:order.revision,labelLater:true};
 if(!rounded){assert.equal(f.c._w1Mutate_('confirm',p).status,'SOLD');return {mode:'existing-JS-formula-fixture',outcome:'SOLD'};}
 for(let i=0;i<2;i++)assert.throws(()=>f.c._w1Mutate_('confirm',p),/RECOVERY_REQUIRED.*SALES_PROFIT_VALUE/);
 assert.equal(f.c._w1Requests_()[p.requestId].state,'NEEDS_REVIEW');
 assert.equal(s.rows.filter(r=>r[c.orderLineId-1]&&r[c.orderLineId-1]!=='Order Line ID').length,1);
 assert.throws(()=>f.c._w1Mutate_('cancel',{requestId:'review-decimal-cancel',orderId:order.orderId,expectedRevision:order.revision}),/RECOVERY_REQUIRED/);
 return {mode:'cent-exact-numeric-formula-readback',outcome:'NEEDS_REVIEW on first call and same-ID retry',correctProfit:280.03,jsExpected:390.10-100.05-10.02,salesRows:1,siblingBlocked:true};
}
const result={revision:rev.revision,localOnly:true,realGoogleDecimalReadback:'not tested by this script',checks:[run(false),run(true)]};
fs.writeFileSync(__dirname+'/review-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
