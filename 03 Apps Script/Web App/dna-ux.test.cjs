// v43 DNA/UX checks: W2LabelUI tokens+fallbacks, money accept/reject identical to v42, confirmSold field targeting.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const html=read('Index.html');
const v42=fs.readFileSync(path.join(__dirname,'../../04 Design Tools/logs/WEBAPP-DNA-UX-20261007-01/before/Index.html'),'utf8');
function between(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i,a);return src.slice(i,j);}
// 1. W2LabelUI: every hex colour sits inside var(--x,#hex) except the #w2Preview paper (#ddd); no non-zero radius
const ui=read('W2LabelUI.html'),style=ui.match(/<style>([\s\S]*?)<\/style>/)[1];
for(const m of style.matchAll(/#[0-9a-fA-F]{3,8}\b/g)){
 const before=style.slice(Math.max(0,m.index-40),m.index);
 if(m[0].toLowerCase()==='#ddd'&&/#w2Preview[^}]*$/.test(style.slice(0,m.index)))continue;
 assert(/var\(--[a-z-]+,$/.test(before),'hex without var fallback: '+m[0]+' after '+before);
}
for(const m of style.matchAll(/border-radius\s*:\s*([^;}]+)/g))assert(/^0(px)?$/.test(m[1].trim()),'radius '+m[1]);
// 2. Money matrix: v43 w1StrictMoney identical to v42
const fn=s=>vm.runInNewContext(between(s,'function w1StrictMoney(','\n')+';w1StrictMoney');
const f43=fn(html),f42=fn(v42);
for(const v of ['0','12.50','450','270','0.5',' 7 ']){assert.notEqual(f43(v),null,v);assert.equal(f43(v),f42(v));}
for(const v of ['',' ','-1','1.234','abc','1e3','12.','.5']){assert.equal(f43(v),null,JSON.stringify(v));assert.equal(f42(v),null);}
// 3. confirmSold field targeting; valid SHOP payload reaches w1Run unchanged
function run(payload,channel){
 const calls={bad:[],run:[],review:[]};
 const ctx=vm.createContext({S:{cart:[1],cartChannel:channel},toast(){},$:id=>({id}),document:{querySelector:q=>({q})},
  w1CartPayload:()=>JSON.parse(JSON.stringify(payload)),markBad:(el,m)=>calls.bad.push({el,m}),
  w1Run:(a,p)=>{calls.run.push({a,p});return new Promise(()=>{});},w1OpenReview:p=>calls.review.push(p),w1Saved(){}});
 vm.runInContext(between(html,'function w1StrictMoney(','\n'),ctx);
 vm.runInContext(between(html,'function confirmSold(){','function w1OpenReview('),ctx);
 ctx.confirmSold();return calls;
}
const ok={channel:'SHOP',customerShipping:'50',shippingSubsidy:'0',items:[{source:'GGB',sku:'A',price:'450'},{source:'GGB',sku:'B',price:'270'}]};
let r=run({...ok,items:[{...ok.items[0],price:'abc'},ok.items[1]]},'SHOP');
assert.equal(r.run.length,0);assert.equal(r.bad.length,1);assert.equal(r.bad[0].el.q,'.cl-price[data-idx="0"]');assert.match(r.bad[0].m,/Price of item 1/);
r=run({...ok,items:[ok.items[0],{...ok.items[1],price:''}]},'SHOP');assert.equal(r.bad[0].el.q,'.cl-price[data-idx="1"]');assert.match(r.bad[0].m,/item 2/);
r=run({...ok,customerShipping:'x'},'SHOP');assert.equal(r.bad[0].el.id,'cShip');assert.equal(r.run.length,0);
r=run({...ok,shippingSubsidy:''},'SHOP');assert.equal(r.bad[0].el.id,'cShipShop');assert.match(r.bad[0].m,/Shipping Subsidy/);assert.equal(r.run.length,0);
r=run(ok,'SHOP');assert.equal(r.bad.length,0);assert.equal(r.run.length,1);assert.equal(r.run[0].a,'orders.create');assert.deepEqual(r.run[0].p,ok);
r=run(ok,'SHOPEE');assert.equal(r.bad.length,0);assert.equal(r.run.length,0);assert.equal(r.review.length,1);assert.deepEqual(r.review[0],ok);
// 4. single sold form: bad price -> soldPrice, bad subsidy -> soldShip (condition kept byte-identical to v42)
const cond='if(w1StrictMoney(price)===null||w1StrictMoney(subsidy)===null){';
assert.equal(html.split(cond).length-1,1);assert.equal(v42.split(cond).length-1,1);
assert.match(html,/markBad\(w1StrictMoney\(price\)===null\?\$\('soldPrice'\):\$\('soldShip'\)/);
// 5. toast hidden on tab change / modal open; helpers present
assert.match(between(html,'function showView(v){','\nfunction ',),/\$\('toast'\)\.style\.display = 'none';/);
assert.match(html,/function showModal\(id, on\)\{ if \(on\) \$\('toast'\)\.style\.display = 'none'; /);
for(const s of ['function navFade(','function markBad(','nav.more{','.fab.hide{','.bad{outline:1px solid var(--destructive)!important'])assert(html.includes(s),s);
// 6. phone CSS rules only inside max-width:600px/420px
const blk=html.match(/@media\(max-width:600px\)\{\n  nav button[\s\S]*?\n\}/)[0];
for(const r of ['nav button{padding:14px 12px 12px}','.chip{min-height:36px}','.btn,.btn.small,.seg button{min-height:36px}','select,input:not([type=checkbox]){min-height:40px}'])assert(blk.includes(r),r);
// 7. order-saved toast must survive B3: w1Saved switches view BEFORE showing the toast
{const seq=[];const ctx=vm.createContext({S:{cart:[1],sales:{}},$:()=>({value:''}),updateCartCount(){},showModal(){},
 showView:v=>seq.push('view:'+v),okToast:m=>seq.push('toast'),load:()=>seq.push('load')});
 vm.runInContext(between(html,'function w1Saved(result,action){','function w1Resume(){'),ctx);
 ctx.w1Saved({status:'PENDING',orderId:'X'},'orders.create');assert.deepEqual(seq,['view:orders','toast','load']);}
console.log('PASS dna-ux: W2LabelUI fallbacks; money matrix == v42; confirmSold field targeting; toast/nav/FAB helpers; phone CSS scoped');
