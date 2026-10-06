const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/candidate/Index.html','utf8');
function between(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+1);assert(i>=0&&j>i);return html.slice(i,j);}
function make(){
  const elements={}, pending=[], notices=[], requests=[], focused=[];
  const $=id=>elements[id] ||= {value:'',innerHTML:'',textContent:'',disabled:false,style:{display:'none'},handlers:{},
    addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);},focus(){focused.push(id);},querySelectorAll(){return []}};
  let render=()=>{};
  const c=vm.createContext({$,document:{querySelectorAll:()=>Object.values(elements)},
    M:{mode:'add',source:'GGB',saving:false,auto:{}},S:{source:'GGB',data:{GGB:[],MAG:[]}},
    LAST_ADD:null,addSuggestionResets:[],addAutoTimers:[],addRequestId:'',_flT:null,
    clearTimeout(){},setTimeout(){return 1;},setFlagChips(){},getFlagStr(){return '';},
    setModalSource(src){c.M.source=src;},showModal(){},toast(x){notices.push(x);},okToast(){},
    esc:String,money:String,bookingBanner(){return '';},addToCache(){},buildFilterOptions(){},
    render(){render();},callApi(action,payload){requests.push({action,payload});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}});
  vm.runInContext(between('function fillForm(r){','/* ── autosuggest'),c);
  vm.runInContext(between('function attachSuggest(','attachSuggest(\'fName\''),c);
  const fire=(id,type,e={})=>(($(id).handlers[type]||[]).forEach(fn=>fn(e)));
  const settle=()=>new Promise(r=>setImmediate(r));
  const saved=i=>({item:{productId:'TEST-'+i,name:'Synthetic '+i,suggested:300},result:{},bookingMatches:[]});
  return {c,$,fire,pending,notices,requests,focused,settle,saved,setRender:fn=>render=fn};
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
  u.fire('mSave','click');assert.equal(u.requests[1].payload.requestId,request);
  u.pending.shift().resolve(u.saved(99));await u.settle();assert.equal(u.c.addRequestId,'');
  u=make();u.c.openAdd();u.$('fName').value='Committed';u.setRender(()=>{throw Error('INJECTED RENDER ERROR');});
  u.fire('mSave','click');u.pending.shift().resolve(u.saved(100));await u.settle();
  assert.equal(u.$('fName').value,'');assert(u.notices.includes('Added — refresh the list to see the item'));
  u=make();u.c.openAdd();u.$('fName').value='Saving';u.fire('mSave','click');u.fire('mSave','click');
  u.c.openAdd();assert.equal(u.requests.length,1);assert.equal(u.$('fName').value,'Saving');
  u.pending.shift().resolve(u.saved(101));await u.settle();
  u=make();u.c.attachSuggest('fName','sugName',()=>['Old suggestion']);u.c.openAdd();
  u.$('fName').value='Old';u.fire('fName','input');u.fire('mSave','click');
  u.pending.shift().resolve(u.saved(102));await u.settle();
  assert.equal(u.$('sugName').style.display,'none');
  u.fire('fName','keydown',{key:'ArrowDown',preventDefault(){}});
  u.fire('fName','keydown',{key:'Enter',preventDefault(){}});
  assert.equal(u.$('fName').value,'');
  console.log('PASS: 20 UI resets, failure draft/request retention, retry ID reuse, render failure, in-flight guard, stale suggestion clear');
})().catch(e=>{console.error(e);process.exitCode=1;});
