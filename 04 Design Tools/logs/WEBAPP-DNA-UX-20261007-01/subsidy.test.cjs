const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/candidate/Index.html','utf8');
function between(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+1);assert(i>=0&&j>i);return html.slice(i,j);}
const elements={},requests=[],notices=[],$=id=>elements[id]||=( {value:'',style:{},addEventListener(t,f){this[t]=f;}} );
for(const id of ['cShipShop','soldShip']){const tag=html.match(new RegExp('<input id="'+id+'"[^>]+>'))[0];assert.match(tag,/value="0"/);$(id).value='0';}
const c=vm.createContext({$,S:{cart:[{source:'GGB',sku:'TEST',price:'270'}],cartChannel:'SHOP',sales:{}},M:{},document:{querySelectorAll(){return [];}},cartShipping:()=>50,
 w1Run(action,payload){requests.push({action,payload});return new Promise(()=>{});},toast:s=>notices.push(s),markBad:(el,m)=>notices.push(m),updateCartCount(){},render(){},okToast(){},showModal(){},showView(){},load(){},w1SyncButtons(){},cartSubtotal:()=>270,money:String,esc:String,calcShip:()=>50,
 findBySku:()=>({baseTitle:'Test',name:'Test',price:'270'}),restockNo:()=>0,daysOnShelf:()=>null,updateSoldHint(){}});
vm.runInContext(between('function w1CartPayload(){','function w1OpenReview('),c);
c.confirmSold();assert.equal(requests.length,1);assert.equal(requests[0].payload.shippingSubsidy,'0');assert.equal(requests[0].payload.customerShipping,'50');
$('cShipShop').value='10';c.confirmSold();assert.equal(requests[1].payload.shippingSubsidy,'10');
$('cShipShop').value='';c.confirmSold();assert.equal(requests.length,2);assert.match(notices.at(-1),/Shipping Subsidy/);
vm.runInContext(between('function setCartChannel(ch){',"$('cartCh').addEventListener"),c);
vm.runInContext(between('function renderCart(){','function cartRecalcTotals(){'),c);
$('cShipShop').value='12.50';c.setCartChannel('SHOPEE');c.renderCart();assert.equal($('cShipShop').value,'12.50');
c.setCartChannel('SHOP');c.renderCart();assert.equal($('cShipShop').value,'12.50');
vm.runInContext(between("$('cClear').addEventListener", "$('mResult')"),c);
$('cClear').click();assert.equal($('cShipShop').value,'0');assert.equal(c.S.cart.length,0);
c.S.cart=[{price:'270'}];$('cShipShop').value='10';vm.runInContext(between('function w1Saved(result,action){','function w1Resume(){'),c);
c.w1Saved({status:'PENDING',orderId:'TEST'},'orders.create');assert.equal($('cShipShop').value,'0');
vm.runInContext(between('function openSold(sku, src){',"$('soldGo').addEventListener"),c);$('soldShip').value='25';c.openSold('TEST','GGB');assert.equal($('soldShip').value,'0');
assert.equal(c.w1StrictMoney(''),null);assert.equal(c.w1StrictMoney('-1'),null);assert.equal(c.w1StrictMoney('0'),0);
for(const file of ['Code_v43.gs','WebApp_v43.gs'])new vm.Script(fs.readFileSync(__dirname+'/candidate/'+file,'utf8'),{filename:file});
console.log('PASS subsidy defaults/reset/edit preservation; blank rejection; unchanged customer shipping; paired source syntax');
