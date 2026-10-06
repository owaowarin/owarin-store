'use strict';
// Diagnostic evidence for the unchanged Version 3 source; no filesystem/cloud writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lab = path.resolve(__dirname, '../../OWARIN Back House LAB');
function fixture() {
  const sandbox = { require, __dirname: path.join(lab, 'tests'), console: { log() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(lab, 'tests/logic.test.js'), 'utf8') +
    '\nglobalThis.fixture = { evaluate, spreadsheet };', sandbox);
  return sandbox.fixture;
}
function recipient(f, request, name) {
  return f.evaluate(`updateOrderRecipient({requestId:${JSON.stringify(request)},orderId:orderId,recipient:{recipientName:${JSON.stringify(name)},phone:'0800000000',address:'1 Demo Road',postalCode:'10000'}})`);
}

// Failure after the Order write, before its audit row, loses the original before-image.
{
  const f = fixture();
  const original = f.evaluate('getOrder(orderId)').recipientName;
  f.evaluate(`const originalAudit = auditOnce_; auditOnce_ = function() { throw new Error('Injected audit failure'); };`);
  assert.throws(() => recipient(f, 'REVIEW-R1', 'First change'), /Injected audit failure/);
  f.evaluate('auditOnce_ = originalAudit');
  recipient(f, 'REVIEW-R1', 'First change');
  const audit = f.evaluate(`findRow_(labSpreadsheet_(),'AuditLog','logId','REVIEW-R1:recipient').object`);
  const loggedBefore = JSON.parse(audit.beforeJson).recipientName;
  assert.notEqual(loggedBefore, original);
  assert.equal(loggedBefore, 'First change');
  console.log('REPRO R2a: retry logs First change -> First change; original before-image is lost.');
}

// A delayed retry can overwrite a newer, successfully audited recipient update.
{
  const f = fixture();
  f.evaluate(`const originalAudit = auditOnce_; auditOnce_ = function() { throw new Error('Injected audit failure'); };`);
  assert.throws(() => recipient(f, 'REVIEW-OLD', 'Stale address owner'), /Injected audit failure/);
  f.evaluate('auditOnce_ = originalAudit');
  recipient(f, 'REVIEW-NEW', 'Latest address owner');
  recipient(f, 'REVIEW-OLD', 'Stale address owner');
  assert.equal(f.evaluate('getOrder(orderId)').recipientName, 'Stale address owner');
  console.log('REPRO R2b: unfinished old request overwrites a newer completed recipient save.');
}

// An Order header can become visible/payable before its lines have been written.
{
  const f = fixture();
  f.evaluate(`const originalAppend = appendObject_; appendObject_ = function(s,t,o) {
    if (t === 'OrderLines') throw new Error('Injected line failure');
    return originalAppend(s,t,o);
  };`);
  assert.throws(() => f.evaluate(`confirmAwaitingPaymentOrder({requestId:'REVIEW-PARTIAL',customerId:customerId,lines:[{itemId:'ITM-DEMO-002',salePrice:180}],recipient:{}})`), /Injected line failure/);
  f.evaluate(`appendObject_ = originalAppend; globalThis.partialId = findRow_(labSpreadsheet_(),'SaveRequests','requestId','REVIEW-PARTIAL').object.resultId;`);
  const partial = f.evaluate('getOrder(partialId)');
  assert.equal(partial.lines.length, 0);
  const paid = f.evaluate(`recordPayment({requestId:'REVIEW-PAY',orderId:partialId,amount:230,reference:'FICTIONAL'})`);
  assert.equal(paid.paymentStatus, 'PAID');
  assert.equal(paid.lines.length, 0);
  assert.equal(f.evaluate(`findRow_(labSpreadsheet_(),'SaveRequests','requestId','REVIEW-PARTIAL').object.status`), 'STARTED');
  console.log('REPRO R3: interrupted confirmation remains STARTED with zero lines, yet accepts full payment.');
}

// Run the actual client JS with minimal DOM/RPC doubles, recording outgoing IDs.
{
  const nodes = new Map(), calls = [];
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value:'', disabled:false, hidden:true, style:{}, listeners:{},
      setAttribute() {}, addEventListener(event, fn) { (this.listeners[event] ||= []).push(fn); } });
    return nodes.get(id);
  }
  const rpc = new Proxy({}, { get: (_, method) => (...args) => {
    if (!String(method).startsWith('with')) calls.push({method,args});
    return rpc;
  }});
  const sandbox = { document: { getElementById:node, querySelectorAll:()=>[], createElement:()=>({textContent:'', get innerHTML(){return this.textContent;}}) }, self:{}, google:{script:{run:rpc}}, window:{print(){}} };
  const ui = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(lab,'Index.html'),'utf8');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], ui);
  const a = {orderId:'ORDER-A',status:'AWAITING_PAYMENT',paymentStatus:'PAID',lines:[],orderTotal:230,paidAmount:230,balanceDue:0,recipientName:'Recipient A',phone:'0800000000',address:'A address',postalCode:'10000'};
  sandbox.orderA = a;
  node('orderId').value = a.orderId;
  vm.runInContext('state.order = orderA; renderOrder(orderA); renderLabel(orderA);',ui);
  node('orderId').value = 'ORDER-B';
  for (const event of ['input','change']) for (const fn of node('orderId').listeners[event] || []) fn();
  assert.equal(node('saveRecipient').disabled, false);
  assert.equal(node('printLabel').disabled, false);
  vm.runInContext('saveRecipient()',ui);
  const sent = calls.find(c=>c.method === 'updateOrderRecipient').args[0];
  assert.equal(sent.orderId,'ORDER-B');
  assert.equal(sent.recipient.recipientName,'Recipient A');
  node('paymentAmount').value='230';
  vm.runInContext('renderOrder({...orderA,paymentStatus:"UNPAID",paidAmount:0,balanceDue:230}); recordPayment();',ui);
  assert.equal(calls.find(c=>c.method==='recordPayment').args[0].orderId,'ORDER-B');
  console.log('REPRO R1: changing ID without Reload sends A recipient/payment details to B; old print stays enabled.');
}
console.log('Review reproduction completed: four scenarios demonstrate three confirmed defects; these are not acceptance tests.');
