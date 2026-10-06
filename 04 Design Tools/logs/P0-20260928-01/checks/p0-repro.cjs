// P0 diagnostic only: executes captured source with synthetic DOM/Sheets.
// No network, credentials, real customer data, or Google runtime calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'live-source', f), 'utf8').replace(/\r\n/g, '\n');
const html = read('Index.html');
const findings = [];
function record(id, observed) { findings.push({id, observed}); console.log(id + ': ' + observed); }
function between(s, a, b) { const start=s.indexOf(a); const end=s.indexOf(b,start+1); assert(start>=0 && end>start); return s.slice(start,end); }
function ui() {
  const elements = {};
  const $ = id => elements[id] ||= {value:'',innerHTML:'',textContent:'',disabled:false,style:{display:'none'},handlers:{},
    addEventListener(t, fn){(this.handlers[t] ||= []).push(fn);},focus(){},querySelectorAll(){return [];}};
  const notices=[], requests=[], pending=[];
  const c=vm.createContext({$, M:{mode:'add',source:'GGB',auto:{},saving:false}, S:{source:'GGB'}, LAST_ADD:null,
    setFlagChips(){},getFlagStr(){return '';},setModalSource(s){c.M.source=s;},showModal(){},setTimeout(){},
    toast(s){notices.push(s);},okToast(){},esc:String,money:String,bookingBanner(){return '';},
    addToCache(){},buildFilterOptions(){},render(){},
    callApi(action,payload){requests.push({action,payload});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}});
  vm.runInContext(between(html,'function fillForm(r){','/* ── autosuggest'),c);
  vm.runInContext(between(html,'function attachSuggest(','attachSuggest(\'fName\''),c);
  const fire=(id,event,e={})=>{for(const f of $(id).handlers[event]||[])f(e);};
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  const saved=()=>({item:{productId:'TEST-ONLY',name:'Synthetic',suggested:300},result:{},bookingMatches:[]});
  return {c,$,fire,requests,pending,notices,settle,saved};
}
function backend(status='Instock') {
  const invCol={name:1,productId:2,status:3,price:4,cost:5,soldDate:6,suggested:7};
  const salesCol={order:1,product:2,orderDate:3,cost:4,price:5,shipingCost:6,netProfit:7,note:8,productId:9};
  let fail=null;
  function sheet(name, rows, col) {
    return {name,rows,col,getName(){return name;},getLastRow(){return rows.length;},getLastColumn(){return Math.max(...Object.values(col));},
      getRange(row,column,height=1,width=1){return {
        getValue(){return rows[row-1]?.[column-1] ?? '';},
        getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>rows[row+i-1]?.[column+j-1] ?? ''));},
        setValue(value){if(fail?.(name,row,column,value))throw Error('INJECTED WRITE FAILURE');rows[row-1] ||= [];rows[row-1][column-1]=value;return this;},
        setFormula(value){return this.setValue(value);},setBackground(){return this;}
      };}};
  }
  const inventory=sheet('GAME GUIDE BOOKS',[[],[],['Synthetic','TEST-1',status,300,100,'',300]],invCol);
  const sales=sheet('SALES',[[],[]],salesCol);
  const sheets={'GAME GUIDE BOOKS':inventory,SALES:sales};
  const c=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]}),flush(){}},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{formatDate:()=> '20260928'},Session:{getScriptTimeZone:()=> 'Asia/Bangkok'},Logger:{log(){}}});
  for(const file of ['Code.gs','webapp.gs','FbAlbum.gs','R2Upload.gs'])vm.runInContext(read(file),c,{filename:file});
  c._resolveColumns=s=>s.col; c._getSalesSheet=()=>sales;
  c._readRow=(s,row,source)=>{const a=s.rows[row-1];return {source,name:a[0],baseTitle:a[0],productId:a[1],status:a[2],price:a[3],cost:a[4],suggested:a[6]};};
  c._recalcRow=()=>{};
  return {c,inventory,sales,setFail:f=>fail=f,payload:{items:[{source:'GGB',sku:'TEST-1',price:300}],shipping:0,channel:'SHOP'}};
}
(async()=>{
  // Actual success handler, sequential adds, alternating sources.
  let u=ui();
  for(let i=0;i<20;i++){
    u.c.S.source=i%2?'MAG':'GGB';u.c.openAdd();u.$('fName').value='Synthetic '+i;u.$('fCost').value='100';
    u.fire('mSave','click');u.pending.shift().resolve(u.saved());await u.settle();
    assert.equal(u.$('fName').value,'');assert.equal(u.$('fCost').value,'');assert.equal(u.$('fStatusSel').value,'New Arrival');assert.equal(u.c.M.saving,false);
  }
  record('ADD-01','20/20 synthetic successful callbacks reset fields; not Google runtime E2E.');
  u=ui();u.c.openAdd();u.$('fName').value='Retain on failure';u.fire('mSave','click');u.pending.shift().reject(Error('INJECTED SERVER ERROR'));await u.settle();
  assert.equal(u.$('fName').value,'Retain on failure');assert.equal(u.c.M.saving,false);
  record('ADD-02','Server rejection preserves entered fields and releases Save.');
  u=ui();u.c.openAdd();u.$('fName').value='Already saved';u.c.render=()=>{throw Error('INJECTED RENDER ERROR');};u.fire('mSave','click');u.pending.shift().resolve(u.saved());await u.settle();
  assert.equal(u.$('fName').value,'Already saved');assert(u.notices.includes('INJECTED RENDER ERROR'));
  record('ADD-03','Injected render exception after successful server response skips reset and displays generic error. Production trigger remains unproven.');
  u=ui();u.c.attachSuggest('fName','sugName',()=>['Synthetic prior title']);u.c.openAdd();u.$('fName').value='Syn';u.fire('fName','input');
  u.fire('mSave','click');u.pending.shift().resolve(u.saved());await u.settle();assert.equal(u.$('fName').value,'');assert.equal(u.$('sugName').style.display,'block');
  u.fire('fName','keydown',{key:'ArrowDown',preventDefault(){}});u.fire('fName','keydown',{key:'Enter',preventDefault(){}});
  assert.equal(u.$('fName').value,'Synthetic prior title');
  record('ADD-04','Suggestion closure survives successful reset; keyboard Save without blur then Down/Enter can restore the old title in DOM mock.');
  u=ui();u.c.openAdd();u.$('fName').value='First';u.fire('mSave','click');u.fire('mSave','click');assert.equal(u.requests.length,1);
  u.c.openAdd();u.$('fName').value='Next unsaved';u.pending.shift().resolve(u.saved());await u.settle();assert.equal(u.$('fName').value,'');
  record('ADD-05','In-flight double-click is blocked, but reopening and entering a new draft before old response lets old callback erase it.');
  let b=backend();assert.equal(b.c._priceToBase(500,'SHOPEE'),300);assert.equal(b.c._numOrRaw('390abc'),390);assert.equal(b.c._priceToBase(60,'SHOPEE'),-8);
  assert.deepEqual([0,1,2,6,20].map(n=>b.c._calcShipping(n)),[0,50,60,100,100]);
  record('MONEY-01','500 Shopee maps to 300 ledger base; malformed 390abc accepted as 390; 60 maps to -8; shipping 0/1/2/6/20 = 0/50/60/100/100. Synthetic only.');
  for(const status of ['Hold','Auction','New Arrival']){b=backend(status);b.c._apiSalesConfirm(b.payload);assert.equal(b.inventory.rows[2][2],'Sold');}
  record('RES-01','Cart server accepts Hold, Auction and New Arrival without reservation ownership.');
  b=backend('Hold');b.c._apiMarkSold({source:'GGB',sku:'TEST-1',price:300,shipping:0});assert.equal(b.inventory.rows[2][2],'Sold');
  b=backend('Hold');b.c._apiInvUpdate({source:'GGB',sku:'TEST-1',changes:{status:'Instock'}});assert.equal(b.inventory.rows[2][2],'Instock');
  record('RES-02','Single sold consumes Hold; inventory.update releases Hold directly, no order-owner check.');
  b=backend();b.payload.items.push({...b.payload.items[0]});const duplicate=b.c._apiSalesConfirm(b.payload);assert.equal(duplicate.count,2);assert.equal(b.sales.rows.length,4);
  record('SALE-01','Duplicate cart payload for one physical SKU produces two SALES lines.');
  b=backend();b.setFail((name,row,col)=>name==='GAME GUIDE BOOKS' && col===3);assert.throws(()=>b.c._apiSalesConfirm(b.payload),/INJECTED/);assert.equal(b.sales.rows.length,3);assert.equal(b.inventory.rows[2][2],'Instock');
  b.setFail(null);const retry=b.c._apiSalesConfirm(b.payload);assert.equal(b.sales.rows.length,4);assert.equal(retry.orderId,'OWA-20260928-02');
  record('SALE-02','Failure at inventory Status after ledger append leaves one SALES line; retry creates a second line with a new Order ID.');
  b=backend();b.setFail((name)=>name==='SALES');const single=b.c._apiMarkSold({source:'GGB',sku:'TEST-1',price:300,shipping:0});assert.equal(single.item.status,'Sold');assert.match(single.sales.error,/INJECTED/);
  record('SALE-03','Single sold writes inventory first; injected ledger failure returns Sold plus sales.error, with no durable recovery journal.');
  b=backend();b.sales.rows.push(['OWA-20260928-99']);assert.equal(b.c._nextOrderId(b.sales,b.sales.col),'OWA-20260928-100');
  const a=b.c._nextOrderId(b.sales,b.sales.col),d=b.c._nextOrderId(b.sales,b.sales.col);assert.equal(a,d);
  record('ID-01','Allocator supports >99, but merely scans SALES; two allocations without a SALES write return the same ID.');
  b=backend();b.inventory.rows.push([...b.inventory.rows[2]]);assert.throws(()=>b.c._findRowBySku(b.inventory,b.inventory.col,'TEST-1'),/appears on 2 rows/);
  record('ID-02','Duplicate SKU lookup fails closed; source+SKU remains mutable and is not an immutable item identity.');
  b=backend();b.c._autoFormat=s=>s;b.c._detectRestock=t=>({title:t,isRestock:false});b.c._buildSKU=()=> 'TEST-2';b.c._sp2BuildIndexes=()=>({});b.c._sp2Calc=()=>({price:300});b.c._setDerivedFormulasForRow=()=>{};
  b.setFail((name,row,col)=>name==='GAME GUIDE BOOKS' && col===3);const add=b.c.addInventoryRow({title:'Synthetic add'});assert.equal(add.success,true);assert.equal(b.inventory.rows[3][2],undefined);assert(b.c._SP2_WRITE_ERRORS.length>0);
  record('ADD-06','Injected Status write failure is swallowed by _tryWrite; addInventoryRow still returns success:true.');
  b=backend();let captured;b.c.addInventoryRow=p=>(captured=p,{row:3});b.c._apiInvAdd({title:'Synthetic'});assert.equal(captured.status,'Instock');
  record('ADD-07','Omitted Add status defaults to Instock on server, while UI opens New Arrival.');
  const names={};for(const f of ['Code.gs','webapp.gs','FbAlbum.gs','R2Upload.gs'])for(const m of read(f).matchAll(/^function\s+(\w+)\s*\(/gm))(names[m[1]] ||= []).push(f);
  const collisions=Object.entries(names).filter(([,v])=>v.length>1);assert.deepEqual(collisions,[['_colLetter',['Code.gs','webapp.gs']]]);
  const core=vm.createContext({});vm.runInContext(read('Code.gs'),core);
  const web=vm.createContext({});vm.runInContext(read('webapp.gs'),web);
  for(let n=1;n<=16384;n++)assert.equal(core._colLetter(n),web._colLetter(n));
  record('SOURCE-01','One existing declaration collision: _colLetter in Code/webapp; equivalent for columns 1..16384. All four .gs files parse/load.');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];for(const [,s]of scripts)if(s.trim())new vm.Script(s);
  record('SOURCE-02','Captured Index inline scripts pass syntax compilation.');
  fs.writeFileSync(path.join(__dirname,'p0-repro-results.json'),JSON.stringify({scope:'OFFLINE DIAGNOSTIC; PASS means observed baseline behavior reproduced, not acceptance passed',findings},null,2));
  console.log('PASS: '+findings.length+' diagnostic checks; no live writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
