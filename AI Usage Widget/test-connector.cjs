const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, 'Chrome Connector', name), 'utf8');

function contentHarness(responses) {
  const timers = new Map(), sent = [], location = {pathname:'/settings/usage'};
  let id = 0, mutation, now = 1000000, valid = true, used = 20;
  const context = {
    location, Date:class extends Date { constructor() { super(now); } },
    document:{documentElement:{},querySelectorAll:() => valid ? [{innerText:'Plan usage limits'}] : []},
    UsageParser:{parse:() => [{label:'Current session',usedPercent:used}]},
    MutationObserver:class { constructor(fn) { mutation = fn; } observe() {} },
    setTimeout:(fn,delay) => { timers.set(++id,{fn,delay}); return id; },
    clearTimeout:key => timers.delete(key),
    chrome:{runtime:{sendMessage:async message => {
      sent.push(structuredClone(message));
      if (message.kind !== 'usage') return {ok:true};
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return typeof next === 'function' ? next() : next;
    }}}
  };
  vm.runInNewContext(source('content.js'),context);
  return {sent,timers,location,mutate:() => mutation(),advance:() => { now += 30000; },
    invalidate:() => { valid = false; },change:() => { used++; },
    async run(delay) {
      const entry = [...timers].find(([,timer]) => timer.delay === delay);
      assert.ok(entry,`Expected timer ${delay}`);
      timers.delete(entry[0]); await entry[1].fn();
    }};
}

async function main() {
  for (const failure of [{ok:false},undefined,new Error('Disconnected')]) {
    const h = contentHarness([failure,{ok:true}]);
    await h.run(1500); h.advance(); await h.run(30000);
    assert.equal(h.sent.length,2);
    assert.equal(h.sent[0].snapshot.observedAt,h.sent[1].snapshot.observedAt);
    await h.run(1200);
    assert.equal(h.sent.length,2,'Unchanged successful data must not renew freshness');
    assert.equal(h.timers.size,0);
  }
  for (const stop of ['navigate','sign-out']) {
    const h = contentHarness([{ok:false},{ok:true}]);
    await h.run(1500);
    if (stop === 'navigate') h.location.pathname = '/new'; else h.invalidate();
    await h.run(30000);
    assert.equal(h.sent.filter(x=>x.kind === 'usage').length,1);
    assert.equal(h.timers.size,0,'No stale retry after leaving valid Usage');
  }
  let acknowledge;
  const h = contentHarness([() => new Promise(resolve => { acknowledge = resolve; }),{ok:true}]);
  const flight = h.run(1500);
  h.change(); h.advance(); h.mutate(); await h.run(1200);
  assert.equal(h.sent.length,1,'Only one native delivery in flight');
  acknowledge({ok:true}); await flight; await h.run(1200);
  assert.equal(h.sent.length,2,'Page change during delivery is not lost');
  assert.notEqual(h.sent[0].snapshot.observedAt,h.sent[1].snapshot.observedAt);

  let listener, nativeReply, nativeCalls = 0;
  const stored = {}, event = {addListener:() => {}};
  const chrome = {
    storage:{local:{set:async value => Object.assign(stored,value)}},
    action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
    alarms:{onAlarm:event},
    runtime:{onInstalled:event,onStartup:event,onMessage:{addListener:fn => { listener = fn; }},
      sendNativeMessage:async () => { nativeCalls++; if(nativeReply instanceof Error) throw nativeReply; return nativeReply; }}
  };
  vm.runInNewContext(source('background.js'),{chrome,URL});
  const message = {kind:'usage',snapshot:{provider:'claude',observedAt:'original-time'}};
  const sender = {tab:{id:1},url:'https://claude.ai/settings/usage'};
  const dispatch = () => new Promise(resolve => assert.equal(listener(message,sender,resolve),true));
  for (const failure of [new Error('Host missing'),{ok:false,error:'Cache write failed'},undefined]) {
    nativeReply = failure;
    assert.equal((await dispatch()).ok,false,'Native failure must reach content script');
    assert.equal(stored.lastSent,undefined);
  }
  nativeReply = {ok:true}; assert.equal((await dispatch()).ok,true);
  assert.equal(stored.lastSent,'original-time');
  const count = nativeCalls;
  assert.equal(listener(message,{tab:{id:1},url:'https://claude.ai/new'},()=>assert.fail()),undefined);
  assert.equal(listener(message,{tab:{id:1},url:'https://example.com/settings/usage'},()=>assert.fail()),undefined);
  assert.equal(nativeCalls,count,'Wrong page cannot invoke native host');
  console.log('PASS: failed ACK/rejection recovery, original timestamps, no false freshness, navigation/sign-out stop, single-flight updates, native errors and sender scope.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
