const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const suggest=fs.readFileSync(__dirname+'/W2Suggest.html','utf8').replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const html=fs.readFileSync(__dirname+'/Index.html','utf8').replace('<?!= _w2Include_("W2Suggest") ?>',suggest);
function between(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+1);assert(i>=0&&j>i);return html.slice(i,j);}
function make(backing=new Map(),storageFailure=false){
  const elements={}, pending=[], notices=[], requests=[], focused=[], timers=[];
  const $=id=>elements[id] ||= {value:'',innerHTML:'',textContent:'',disabled:false,style:{display:'none'},handlers:{},
    addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);},focus(){focused.push(id);},querySelectorAll(){return []}};
  let render=()=>{}, flags='';
  const sessionStorage={getItem:k=>backing.get(k)??null,
    setItem(k,v){if(storageFailure)throw Error('STORAGE BLOCKED');backing.set(k,v);},
    removeItem:k=>backing.delete(k)};
  const c=vm.createContext({$,sessionStorage,document:{querySelectorAll:sel=>
    sel==='#modal input, #modal select' ? Object.entries(elements).filter(([id])=>id.startsWith('f')).map(([,el])=>el) : Object.values(elements)},
    M:{mode:'add',source:'GGB',saving:false,auto:{}},S:{source:'GGB',data:{GGB:[],MAG:[]}},
    LAST_ADD:null,_flT:null,
    clearTimeout(id){if(timers[id-1])timers[id-1].cleared=true;},
    setTimeout(fn,ms){timers.push({fn,ms,cleared:false});return timers.length;},
    setFlagChips(v){flags=v;},getFlagStr(){return flags;},
    setModalSource(src){c.M.source=src;},showModal(){},toast(x){notices.push(x);},okToast(){},
    esc:String,money:String,bookingBanner(){return '';},buildFilterOptions(){},
    render(){render();},callApi(action,payload){requests.push({action,payload});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}});
  vm.runInContext(between('function findBySku','/* ── SP-2 helpers'),c);
  vm.runInContext(between('var addSuggestionResets','/* ── api bridge'),c);
  vm.runInContext(between('function fillForm(r){','/* ── autosuggest'),c);
  vm.runInContext(between('var remoteSuggestionEpoch=0;','attachSuggest(\'fName\''),c);
  const fire=(id,type,e={})=>(($(id).handlers[type]||[]).forEach(fn=>fn(e)));
  const settle=()=>new Promise(r=>setImmediate(r));
  const saved=i=>({item:{source:c.M.source,productId:'TEST-'+i,name:'Synthetic '+i,suggested:300},result:{},bookingMatches:[]});
  return {c,$,fire,pending,notices,requests,focused,timers,settle,saved,backing,setRender:fn=>render=fn};
}
(async()=>{
  let u=make();
  for(let i=0;i<20;i++){
    u.c.S.source=i%2?'MAG':'GGB';u.c.openAdd();u.$('fName').value='Synthetic '+i;
    u.$('fCost').value='0';u.fire('mSave','click');
    assert.equal(u.$('fName').disabled,true);
    u.pending.shift().resolve(u.saved(i));await u.settle();
    assert.equal(u.$('fName').value,'');assert.equal(u.$('fCost').value,'');
    assert.equal(u.$('fStatusSel').value,'New Arrival');assert.equal(u.$('fName').disabled,false);
    assert.equal(u.c.addRequestId,'');assert.equal(u.c.M.saving,false);
  }
  u=make();u.c.openAdd();u.$('fName').value='Retain me';u.fire('mSave','click');
  const request=u.requests[0].payload.requestId;
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  assert.equal(u.$('fName').value,'Retain me');assert.equal(u.c.addRequestId,request);
  u.c.openAdd();assert.equal(u.$('fName').value,'Retain me','unresolved request must not reset draft');
  assert.equal(u.$('fName').disabled,true,'uncertain draft must be frozen');
  u.$('fName').value='Tampered';
  u.fire('mSave','click');assert.equal(u.requests[1].action,'inventory.addStatus');
  assert.equal(u.requests[1].payload.requestId,request);
  assert.equal(u.requests[1].payload.title,'Retain me','status check must use frozen payload');
  u.pending.shift().resolve({state:'DONE',data:u.saved(99)});await u.settle();
  assert.equal(u.requests.length,2,'DONE status must not send another Add');
  assert.equal(u.c.addRequestId,'');
  assert.equal(u.backing.size,0,'committed request must clear browser storage');
  u=make();u.c.openAdd();u.$('fName').value='Old item';u.fire('mSave','click');
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  u.fire('mSave','click');
  u.pending.shift().resolve({state:'DONE',data:{...u.saved(99),historical:true}});await u.settle();
  assert.equal(u.c.S.data.GGB.length,0,'historical DONE must not insert a stale item into live cache');
  assert(u.notices.includes('Saved — refresh inventory to see current stock'));
  u=make();u.c.openAdd();u.$('fName').value='Historical replay';u.fire('mSave','click');
  u.pending.shift().reject(Error('RESPONSE INTERRUPTED'));await u.settle();
  u.fire('mSave','click');u.pending.shift().resolve({state:'NOT_FOUND'});await u.settle();
  assert.equal(u.requests.at(-1).action,'inventory.add');
  const current={source:'GGB',productId:'TEST-99',name:'Different current copy',status:'Sold'};
  u.c.S.data.GGB.push(current);
  u.pending.shift().resolve({...u.saved(99),historical:true,bookingMatches:[{name:'Waiting customer'}]});await u.settle();
  assert.equal(u.c.S.data.GGB[0],current,'Add replay must preserve the current inventory cache');
  assert.equal(u.c.LAST_ADD,null,'historical result must not enable an Instock notification');
  const store=new Map();u=make(store);u.c.S.source='MAG';u.c.openAdd();u.$('fName').value='After reload';
  u.$('fCost').value='1,200.50';u.fire('mSave','click');
  const frozen=JSON.stringify(u.requests[0].payload), oldId=u.requests[0].payload.requestId;
  assert.equal(store.size,1,'pending request must be stored before network call');
  const reloaded=make(store);reloaded.c.openAdd();
  assert.equal(reloaded.c.addRequestId,oldId);assert.equal(reloaded.c.M.source,'MAG');
  assert.equal(reloaded.$('fName').value,'After reload');assert.equal(reloaded.$('fCost').value,'1,200.50');
  assert.equal(reloaded.$('fName').disabled,true);
  assert.equal(reloaded.$('mSrcGGB').disabled,true);
  reloaded.c.S.data.MAG.push(reloaded.saved(110).item);
  reloaded.fire('mSave','click');assert.equal(reloaded.requests[0].action,'inventory.addStatus');
  assert.equal(JSON.stringify(reloaded.requests[0].payload),frozen);
  reloaded.pending.shift().resolve({state:'DONE',data:reloaded.saved(110)});await reloaded.settle();
  assert.equal(store.size,0);assert.equal(reloaded.c.addRequestId,'');
  assert.equal(reloaded.c.S.data.MAG.length,1,'replayed Add must not duplicate the loaded item in cache');
  u=make();u.c.openAdd();u.$('fName').value='Never reached server';u.fire('mSave','click');
  const missingId=u.requests[0].payload.requestId;
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  u.fire('mSave','click');assert.equal(u.requests[1].action,'inventory.addStatus');
  u.pending.shift().resolve({state:'NOT_FOUND'});await u.settle();
  assert.equal(u.requests[2].action,'inventory.add');
  assert.equal(u.requests[2].payload.requestId,missingId,'NOT_FOUND retries the original ID');
  u.pending.shift().resolve(u.saved(111));await u.settle();
  assert.equal(u.backing.size,0);
  u=make();u.c.openAdd();u.$('fName').value='Needs review';u.fire('mSave','click');
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  u.fire('mSave','click');u.pending.shift().resolve({state:'ERROR'});await u.settle();
  assert.equal(u.requests.length,2,'ERROR status must not retry Add');
  assert.equal(u.backing.size,1,'recovery state retains Request ID');
  assert.equal(u.$('fName').disabled,true);
  u=make();u.c.openAdd();u.$('fName').value='Corrupt retry';u.fire('mSave','click');
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  u.fire('mSave','click');u.pending.shift().reject(Error('Cost must be a number'));await u.settle();
  assert.equal(u.backing.size,1,'validation-like status error must not clear an uncertain request');
  u=make();u.c.openAdd();u.$('fName').value='Bad cost';u.$('fCost').value='bad';u.fire('mSave','click');
  u.pending.shift().reject(Error('Cost must be a number'));await u.settle();
  assert.equal(u.backing.size,0,'known pre-write validation failure may release ID');
  assert.equal(u.$('fName').disabled,false);assert.equal(u.$('fName').value,'Bad cost');
  u=make(new Map(),true);u.c.openAdd();u.$('fName').value='Cannot persist';u.fire('mSave','click');
  assert.equal(u.requests.length,0,'storage failure must prevent Add API call');
  u=make(new Map([['owarin.add.pending.1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp.v1','{broken']]));u.c.openAdd();
  assert.equal(u.c.addPendingBroken,true);assert.equal(u.requests.length,0);
  u=make();u.c.openAdd();u.$('fName').value='Committed';u.setRender(()=>{throw Error('INJECTED RENDER ERROR');});
  u.fire('mSave','click');u.pending.shift().resolve(u.saved(100));await u.settle();
  assert.equal(u.$('fName').value,'');assert(u.notices.includes('Added — refresh the list to see the item'));
  u=make();u.c.openAdd();u.$('fName').value='Saving';u.fire('mSave','click');u.fire('mSave','click');
  u.c.openAdd();assert.equal(u.requests.length,1);assert.equal(u.$('fName').value,'Saving');
  u.pending.shift().resolve(u.saved(101));await u.settle();
  u=make();u.c.openAdd();u.$('fName').value='Late success';u.fire('mSave','click');
  const delayed=u.pending.shift(), delayedId=u.c.addRequestId;
  u.timers.find(t=>t.ms===45000).fn();await u.settle();
  assert.equal(u.c.M.saving,false);assert.equal(u.c.addRequestId,delayedId);
  assert.equal(u.$('fName').disabled,true,'timed-out draft remains frozen');
  delayed.resolve(u.saved(103));await u.settle();
  assert.equal(u.c.addRequestId,delayedId,'late callback must not clear pending request');
  assert.equal(u.$('fName').value,'Late success','late callback must not reset form');
  u.fire('mSave','click');assert.equal(u.requests[1].action,'inventory.addStatus');
  u.pending.shift().resolve({state:'DONE',data:u.saved(103)});await u.settle();
  assert.equal(u.c.addRequestId,'');
  const sameTabStore=new Map();u=make(sameTabStore);u.c.openAdd();u.$('fName').value='No callback';u.fire('mSave','click');
  const noCallbackId=u.requests[0].payload.requestId;
  u.timers.find(t=>t.ms===45000).fn();await u.settle();
  assert.equal(u.c.addRequestId,noCallbackId);
  const sameTabReload=make(sameTabStore);sameTabReload.c.openAdd();
  assert.equal(sameTabReload.c.addRequestId,noCallbackId);
  assert.equal(sameTabReload.$('fName').value,'No callback');
  sameTabReload.fire('mSave','click');assert.equal(sameTabReload.requests[0].action,'inventory.addStatus');
  sameTabReload.pending.shift().resolve({state:'DONE',data:sameTabReload.saved(104)});await sameTabReload.settle();
  assert.equal(sameTabReload.requests.length,1,'reload must not create a second Add');
  assert.equal(sameTabStore.size,0,'DONE status clears the original pending ID');
  const newTab=make(new Map());newTab.c.openAdd();
  assert.equal(newTab.c.addRequestId,'','new tab cannot recover the prior tab-scoped ID');
  u=make();u.c.openAdd();u.$('fName').value='Late status';u.fire('mSave','click');
  u.pending.shift().reject(Error('INJECTED NETWORK ERROR'));await u.settle();
  u.fire('mSave','click');const delayedStatus=u.pending.shift();
  u.timers.filter(t=>t.ms===45000).at(-1).fn();await u.settle();
  delayedStatus.resolve({state:'NOT_FOUND'});await u.settle();
  assert.equal(u.requests.length,2,'late NOT_FOUND status must not launch Add');
  assert.equal(u.$('fName').disabled,true);
  u=make();u.c.attachSuggest('fName','sugName',()=>['Old suggestion']);u.c.openAdd();
  u.$('fName').value='Old';u.fire('fName','input');u.fire('mSave','click');
  u.pending.shift().resolve(u.saved(102));await u.settle();
  assert.equal(u.$('sugName').style.display,'none');
  u.fire('fName','keydown',{key:'ArrowDown',preventDefault(){}});
  u.fire('fName','keydown',{key:'Enter',preventDefault(){}});
  assert.equal(u.$('fName').value,'');
  console.log('PASS: 20 UI resets, DONE/NOT_FOUND/ERROR retries, historical DONE skips live cache, frozen reload, storage/render failure, timeout/no-callback/late callback, suggestion clear');
})().catch(e=>{console.error(e);process.exitCode=1;});
