const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function fixture(failureAt = 0, afterWrite = false) {
  let operations = 0, locked = false;
  function fault(write) {
    operations++;
    if (afterWrite) write();
    if (operations === failureAt) throw Error('simulated disconnect');
    if (!afterWrite) write();
  }
  class Sheet {
    constructor(name, cols, rows = []) { this.name = name; this.cols = cols; this.rows = rows; }
    getLastRow() { return this.rows.length; }
    getSheetId() { return this.name; }
    getLastColumn() { return Math.max(1, ...this.rows.map(r => r.length), ...Object.values(this.cols)); }
    getRange(row, col, nr=1, nc=1) {
      const self = this;
      return {
        getValues() { return Array.from({length:nr}, (_,r) => Array.from({length:nc}, (_,c) => self.rows[row+r-1]?.[col+c-1] ?? '')); },
        getValue() { return this.getValues()[0][0]; },
        setValue(v) { fault(() => { while(self.rows.length < row) self.rows.push([]); self.rows[row-1][col-1]=v; }); return this; },
        setFormula(v) { return this.setValue(v); }
      };
    }
  }
  const cols = {name:1,productId:2,status:3,price:4,cost:5,soldDate:6,condition:7};
  const sc = {order:1,product:2,orderDate:3,cost:4,price:5,shipingCost:6,netProfit:7,note:8};
  const sheets = {
    'GAME GUIDE BOOKS': new Sheet('GAME GUIDE BOOKS', cols, [[],[],['Final Fantasy 10','G1','Instock',300,100,'','A'],['Final Fantasy 2','G2','Auction',500,120,'','B']]),
    MAGAZINE: new Sheet('MAGAZINE', cols, [[],[],['Model Graphix 2','M1','Instock',200,80,'','A']]),
    SALES: new Sheet('SALES', sc, [[],[]])
  };
  const ctx = vm.createContext({Date,JSON,Math,Number,String,Array,Object,RegExp,isFinite,isNaN,parseFloat,parseInt,console:{log(){}},
    GGB_SHEET:'GAME GUIDE BOOKS',MAG_SHEET:'MAGAZINE',SALES_SHEET:'SALES',ORDER_PREFIX:'OWA',
    SpreadsheetApp:{getActiveSpreadsheet:()=>null,openById:id=>({getId:()=>id,getSheetByName:n=>sheets[n],insertSheet:n=>{if(sheets[n])throw Error('exists');return sheets[n]=new Sheet(n,{});}}),flush:()=>fault(()=>{})},
    Utilities:{formatDate:(d,tz,fmt)=>{const iso=new Date(d.getTime()+7*3600000).toISOString().slice(0,10); return fmt==='yyyyMMdd'?iso.replaceAll('-',''):iso;}},
    Session:{getScriptTimeZone:()=> 'Asia/Bangkok'},
    _resolveColumns:sh=>sh.cols,_val:(r,c,k)=>c[k]?r[c[k]-1]??'':'',_getBaseTitle:n=>n,
    _withLock:fn=>{assert.equal(locked,false);locked=true;try{return fn();}finally{locked=false;}},
    _recalcRow:()=>{},_sheetByHeaders:()=>sheets.SALES
  });
  vm.runInContext(read('Runtime.gs')+'\n'+read('WebApp.gs')+'\n'+read('SalesService.gs'),ctx);
  const payload = {requestId:'request-0123456789',soldDate:'2026-09-09',channel:'SHOP',shipping:'65',customerShipping:'60',
    items:[{source:'GGB',sku:'G1',price:'350',method:'DIRECT'},{source:'MAG',sku:'M1',price:'245.50',method:'AUCTION'}]};
  return {ctx,sheets,payload,ops:()=>operations};
}
test('source syntax and unique top-level declarations across v20 core + candidate',()=>{
  const core = read('Core.gs');
  const all = core+'\n'+read('Runtime.gs')+'\n'+read('WebApp.gs')+'\n'+read('SalesService.gs');
  new vm.Script(all);
  const names = [...all.matchAll(/^function (\w+)\(/gm)].map(m=>m[1]);
  assert.equal(new Set(names).size,names.length,'duplicate functions would replace handlers');
  new vm.Script(read('Index.html').match(/<script>([\s\S]*?)<\/script>/)[1]);
});
test('mixed GGB/MAG auction checkout keeps actual prices and charges shipping once',()=>{
  const {ctx,sheets,payload}=fixture();payload.channel='SHOPEE';
  const res=ctx._apiSalesConfirm(payload);
  assert.equal(res.count,2);
  assert.equal(sheets['GAME GUIDE BOOKS'].rows[2][3],350);
  assert.equal(sheets.MAGAZINE.rows[2][3],245.5);
  assert.equal(sheets.MAGAZINE.rows[2][2],'Auction');
  assert.equal(sheets.SALES.rows[2][6],245); //350 +60 -100 -65
  assert.equal(sheets.SALES.rows[3][6],165.5);
  assert.equal(sheets.SALES.rows[3][5],0);
  assert.match(sheets.SALES.rows[3][7],/AUCTION SHOPEE/);
});
test('same checkout is idempotent; changed payload and fresh requests cannot resell',()=>{
  const {ctx,sheets,payload,ops}=fixture();ctx._owaSale(payload);const before=ops();
  ctx._owaSale(payload);assert.equal(ops(),before);assert.equal(sheets.SALES.rows.length,4);
  payload.items[0].price='999';assert.throws(()=>ctx._owaSale(payload),/original checkout/);
  payload.requestId='different-0123456789';assert.throws(()=>ctx._owaSale(payload),/not Instock/);
});
test('invalid whole carts write no stock or ledger, including duplicate IDs and sold Auction',()=>{
  for(const mutate of [p=>p.items.push({...p.items[0]}),p=>p.items[1].source='ALL',p=>p.items[0].sku='G2',
    p=>p.items[1].price='30abc',p=>p.items[1].price='-1',p=>p.items[1].price='0',p=>p.shipping='',p=>p.customerShipping='NaN',
    p=>p.soldDate='2026-02-30',p=>p.items[1].method='BID_PENDING']) {
    const {ctx,payload,ops}=fixture();mutate(payload);assert.throws(()=>ctx._owaSale(payload));assert.equal(ops(),0);
  }
  const f=fixture();f.sheets.MAGAZINE.rows.push([...f.sheets.MAGAZINE.rows[2]]);
  assert.throws(()=>f.ctx._owaSale(f.payload),/appears on 2 rows/);assert.equal(f.ops(),0);
});
test('recover before/after every simulated write and flush without duplicate rows',()=>{
  const base=fixture();base.ctx._owaSale(base.payload);const max=base.ops();
  for(const after of [false,true]) for(let n=1;n<=max;n++) {
    const f=fixture(n,after);
    assert.throws(()=>f.ctx._owaSale(f.payload),/simulated disconnect/,`fault ${n}`);
    const result=f.ctx._owaSale(f.payload);
    assert.equal(result.count,2,`replay ${n}`);
    assert.equal(f.sheets.SALES.rows.length,4,`ledger fault ${n} after=${after}`);
    assert.equal(f.sheets.MAGAZINE.rows[2][2],'Auction');
    assert.equal(f.ctx._owaJournal().records.length,1);
    assert.equal(f.ctx._owaJournal().records[0].value.state,'DONE');
  }
});
test('pending request blocks another checkout and incomplete ledger is excluded',()=>{
  const f=fixture(9,true);assert.throws(()=>f.ctx._owaSale(f.payload));
  assert.throws(()=>f.ctx._owaSale({...f.payload,requestId:'second-0123456789'}),/pending/);
  assert.throws(()=>f.ctx._owaNoPending(),/pending/);
  const list=f.ctx._apiSalesList();assert.equal(list.rows.length,0);assert.equal(list.pendingRequests.length,1);
});
test('unknown recorded cost stays unknown; legacy sold dates are never invented',()=>{
  const f=fixture();f.sheets.MAGAZINE.rows[2][4]='';f.ctx._owaSale(f.payload);
  assert.equal(f.sheets.SALES.rows[3][6],'');
  const old=f.ctx._apiSalesList().history.find(r=>r.sku==='G2');
  assert.equal(old.soldDate,'');assert.equal(old.method,'AUCTION');
});
test('shipping boundaries and standalone Mark Sold use the same transaction',()=>{
  const f=fixture();assert.deepEqual(Array.from({length:9},(_,n)=>f.ctx._owaShipping(n)),[0,50,60,70,80,90,100,100,100]);
  const result=f.ctx._apiMarkSold({requestId:'single-0123456789',source:'MAG',sku:'M1',price:'123',method:'AUCTION',shipping:'40',customerShipping:'50',soldDate:'2026-09-08'});
  assert.equal(result.item.status,'Auction');assert.equal(result.item.price,123);assert.ok(result.sales.orderId);
});
test('generic update cannot bypass sales ledger or clear auction dates',()=>{
  const f=fixture();
  assert.throws(()=>f.ctx._apiInvUpdate({source:'GGB',sku:'G1',changes:{status:'Sold'}}),/Mark Sold/);
  assert.throws(()=>f.ctx._apiInvUpdate({source:'GGB',sku:'G2',changes:{status:'Instock'}}),/read-only/);
  assert.equal(f.ops(),0);
  assert.throws(()=>f.ctx._route('tools.suspectAuction',{source:'GGB',dryRun:false}),/actual sale/);
});

// Lightweight DOM double executes the actual inline script and registered event handlers.
function uiFixture() {
  const html=read('Index.html'), elements=new Map();
  class Element {
    constructor(id='') {this.id=id;this.value='';this.innerHTML='';this.style={};this.handlers={};this.disabled=false;this.attributes={};this.classList={toggle(){},add(){},remove(){}};}
    addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);}
    focus(){} querySelectorAll(){return [];} setAttribute(k,v){this.attributes[k]=v;} getAttribute(k){return this.attributes[k];}
    appendChild(el){if(el.id)elements.set(el.id,el);el.parentNode=this;}
    removeChild(){} matches(){return false;}
  }
  for(const m of html.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element(m[1]));
  const parent=new Element();for(const el of elements.values())el.parentNode=parent;
  const ctx=vm.createContext({Intl,Date,Promise,JSON,Math,Number,String,Array,Object,RegExp,isNaN,parseFloat,parseInt,
    document:{getElementById:id=>{if(!elements.has(id))throw Error('Missing DOM ID '+id);return elements.get(id);},querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){},body:parent},
    navigator:{},window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    setTimeout:()=>1,clearTimeout(){},confirm:()=>true
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\nload\(\);\s*$/, '\n'),ctx);
  return {ctx,e:id=>elements.get(id)};
}
test('UI boots with actual HTML IDs and ALL routes same SKU by source',()=>{
  const {ctx}=uiFixture();assert.equal(ctx.S.source,'ALL');
  ctx.S.data.GGB=[{productId:'SAME',source:'GGB'}];ctx.S.data.MAG=[{productId:'SAME',source:'MAG'}];
  assert.equal(ctx.inventoryRows().length,2);assert.equal(ctx.findBySku('MAG','SAME').source,'MAG');
  ctx.S.data.MAG.push({productId:'SAME',source:'MAG'});assert.equal(ctx.findBySku('MAG','SAME'),null);
});
test('Quotation sorts naturally, preserves copy prices and does not reorder cart',()=>{
  const {ctx}=uiFixture();ctx.S.cart=[{baseTitle:'Final Fantasy 10',price:410,source:'GGB',sku:'10'},
    {baseTitle:'final fantasy 2',price:220,source:'GGB',sku:'2'},{baseTitle:'Biohazard',price:300,source:'MAG',sku:'B'}];
  assert.equal(ctx.buildItemsLines(),'Biohazard — 300\nfinal fantasy 2 — 220\nFinal Fantasy 10 — 410');
  assert.equal(ctx.S.cart[0].sku,'10');
});
test('Add reset clears all book fields and suggestion keyboard state',()=>{
  const {ctx,e}=uiFixture();
  const ids=['fName','fPubIn','fPlat','fGenre','fSubGen','fType2','fCondSel','fOrig','fCost','fPrice','fRarity','fMRef','fRefNote'];
  ids.forEach(id=>e(id).value='stale');let resetCalled=0;ctx.suggestionResets.push(()=>resetCalled++);
  ctx.M.auto={genre:true,platform:true,original:true};ctx.resetAddForm();
  ids.forEach(id=>assert.equal(e(id).value,'',id));assert.equal(e('fStatusSel').value,'Instock');assert.equal(resetCalled,1);
  assert.equal(ctx.M.auto.genre,false);
});
test('checkout retries same payload, preserves uncertainty, clears validation failures',async()=>{
  const {ctx}=uiFixture();ctx.S.sheetUrl='https://docs.google.com/spreadsheets/d/LAB/edit';let requests=[];
  ctx.callApi=async(action,p)=>{requests.push(JSON.stringify(p));throw Error('lost response');};
  await assert.rejects(ctx.checkoutApi('sales.confirm',{items:[]}),/lost response/);assert.ok(ctx.pendingCheckout);
  await assert.rejects(ctx.checkoutApi('sales.confirm',{items:[1]}),/Retry/);
  ctx.callApi=async(action,p)=>{requests.push(JSON.stringify(p));return {orderId:'done'};};
  await ctx.sendPendingCheckout();assert.equal(requests[0],requests[1]);assert.equal(ctx.pendingCheckout,null);
  ctx.callApi=async()=>{const e=Error('bad price');e.safeToEditCheckout=true;throw e;};
  await assert.rejects(ctx.checkoutApi('sales.confirm',{}),/bad price/);assert.equal(ctx.pendingCheckout,null);
});
test('server recovery after browser storage loss uses original checkout values',()=>{
  const f=fixture(9,true);assert.throws(()=>f.ctx._owaSale(f.payload));
  const result=f.ctx._route('sales.retry',{requestId:f.payload.requestId});
  assert.equal(result.items[1].price,245.5);assert.equal(f.sheets.SALES.rows.length,4);
});
test('pending checkout is never replayed against a different spreadsheet',async()=>{
  const {ctx}=uiFixture();ctx.S.sheetUrl='PRODUCTION';
  ctx.pendingCheckout={sheetUrl:'LAB',action:'sales.confirm',payload:{}};
  ctx.callApi=()=>{throw Error('must not call');};
  await assert.rejects(ctx.sendPendingCheckout(),/ชีตอื่น/);
});
test('real v20 header resolver accepts existing legacy columns; preflight does not write',()=>{
  const f=fixture(), lock=f.ctx._withLock;
  vm.runInContext(read('Core.gs'),f.ctx);
  f.ctx._withLock=lock;
  // Spreadsheet headers from the legacy schema, no added Product ID in SALES.
  const inv=['Item name','Product ID','Status','Price','Cost','Sold Date','Condition'];
  f.sheets['GAME GUIDE BOOKS'].rows[0]=inv;f.sheets.MAGAZINE.rows[0]=inv;
  f.sheets.SALES.rows[0]=['Order','Product','Order Date','Cost','Price','Shiping Cost','Net Profit','Note'];
  const report=f.ctx.owaCheckEnvironment();assert.equal(report.ready,true);assert.equal(f.ops(),0);
  f.ctx._owaSale(f.payload);assert.equal(f.sheets.SALES.rows[2][6],245);
});
test('history dates retain Bangkok calendar day around midnight',()=>{
  const f=fixture();
  assert.equal(f.ctx._owaHistoryDate('2026-09-08T18:00:00.000Z'),'2026-09-09');
  assert.equal(f.ctx._owaHistoryDate(''),'');assert.equal(f.ctx._owaHistoryDate('2026-09-08'),'2026-09-08');
});
test('web runtime uses only the configured LAB when active spreadsheet is absent',()=>{
  const f=fixture();assert.equal(f.ctx.SpreadsheetApp.getActiveSpreadsheet(),null);
  assert.equal(f.ctx._owaSpreadsheet().getId(),'158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE');
  for(const file of ['Core.gs','WebApp.gs','SalesService.gs']) assert.doesNotMatch(read(file),/SpreadsheetApp\.getActive(?:Spreadsheet)?\(\)/,file);
  f.ctx._owaSpreadsheetCache=null;f.ctx.SpreadsheetApp.openById=()=>({getId:()=> 'wrong-sheet'});
  assert.throws(()=>f.ctx._owaSpreadsheet(),/mismatch/);
});
test('LAB sample uses real column positions and copy data for mixed checkout',()=>{
  const sample=JSON.parse(read('tests/lab-sample.json')), f=fixture(), lock=f.ctx._withLock;
  vm.runInContext(read('Core.gs'),f.ctx);f.ctx._withLock=lock;
  for(const name of ['GAME GUIDE BOOKS','MAGAZINE']) {
    const s=sample.sheets[name];f.sheets[name].rows=[s.headers,[],...s.rows];
  }
  f.sheets.SALES.rows=[sample.sheets.SALES.headers,...Array.from({length:69},()=>[])];
  const guide=f.ctx._readInventory('GAME GUIDE BOOKS')[0], mag=f.ctx._readInventory('MAGAZINE')[0];
  assert.equal(guide.name,'Alan Wake (RESTOCK-01)');assert.equal(mag.name,'A・Club vol 12');
  assert.equal(guide.cost,16);assert.equal(mag.cost,13);
  f.payload.items=[{source:'GGB',sku:guide.productId,price:270,method:'DIRECT'},
    {source:'MAG',sku:mag.productId,price:123.45,method:'AUCTION'}];
  f.payload.shipping=55;f.payload.customerShipping=60;
  const result=f.ctx._owaSale(f.payload);
  assert.equal(result.items[0].status,'Sold');assert.equal(result.items[1].status,'Auction');
  assert.equal(f.sheets.SALES.rows[70][6]+f.sheets.SALES.rows[71][6],369.45);
});
