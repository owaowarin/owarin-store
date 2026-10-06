'use strict';
// Review-only probes: run the existing harnesses, then bridge server results to UI callbacks.
// No filesystem, Apps Script, or spreadsheet writes occur when this script runs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const lab = path.resolve(__dirname, '../../OWARIN Back House LAB');
function harness(file, exports) {
  return new Function('require', '__dirname', fs.readFileSync(path.join(lab, 'tests', file), 'utf8') + '\nreturn {' + exports + '};')(require, path.join(lab, 'tests'));
}
const server = harness('logic.test.js', 'evaluate,context,spreadsheet');
const client = harness('ui.test.js', 'ui,node,calls');
const { evaluate } = server;
const { ui, node, calls } = client;
const invoke = (method, payload) => evaluate(method + '(' + JSON.stringify(payload) + ')');
const uiRun = code => vm.runInContext(code, ui);
let sequence = 0;
for (const failurePoint of ['audit', 'complete']) {
  for (const reference of ['', 'FICTIONAL-REF', '0', '架空-参照', 'A'.repeat(2000)]) {
    const id = 'REREVIEW-' + ++sequence;
    evaluate("appendObject_(labSpreadsheet_(),'Items'," + JSON.stringify({itemId:id,title:'Fictional review copy',kind:'Guide Book',askingPrice:100,status:'AVAILABLE',activeOrderId:'',updatedAt:''}) + ')');
    const order = invoke('confirmAwaitingPaymentOrder', {requestId:id+'-ORDER',customerId:server.context.customerId,lines:[{itemId:id,salePrice:100}],recipient:{}});
    const payment = {requestId:id+'-PAY',orderId:order.orderId,amount:150,reference};
    const target = failurePoint === 'audit' ? 'auditOnce_' : 'completeRequest_';
    evaluate('reviewOriginal = ' + target + '; ' + target + ' = function(){ throw new Error("Review interruption"); };');
    assert.throws(() => invoke('recordPayment', payment), /Review interruption/);
    evaluate(target + ' = reviewOriginal');
    const pending = invoke('getOrder', order.orderId);
    assert.equal(pending.paymentStatus, 'PENDING_COMPLETION');
    assert.equal(pending.pendingPayment.requestId, payment.requestId);
    const beforeBlocked = JSON.stringify(server.spreadsheet.sheets);
    assert.throws(() => invoke('recordPayment', {...payment,requestId:id+'-NEW'}), /Overpayment/);
    const recipientInput = {requestId:id+'-RECIPIENT',orderId:order.orderId,recipient:{recipientName:'Review Recipient',phone:'0800000000',address:'1 Fictional Road',postalCode:'10000'}};
    assert.throws(() => invoke('updateOrderRecipient', recipientInput), /only after full payment/);
    assert.equal(JSON.stringify(server.spreadsheet.sheets), beforeBlocked);
    node('orderId').value = order.orderId;
    uiRun('reloadOrder()');
    calls.at(-1).successHandler(JSON.parse(JSON.stringify(pending)));
    assert.equal(node('saveRecipient').disabled, true);
    assert.equal(node('printLabel').disabled, true);
    assert.equal(node('labelStage').hidden, true);
    uiRun('recordPayment()');
    const recovery = calls.at(-1);
    assert.equal(recovery.args[0].requestId, payment.requestId);
    const completed = invoke(recovery.method, recovery.args[0]);
    recovery.successHandler(JSON.parse(JSON.stringify(completed)));
    assert.equal(completed.paymentStatus, 'PAID');
    assert.equal(completed.pendingPayment, null);
    assert.equal(node('recordPayment').disabled, true);
    assert.equal(node('saveRecipient').disabled, false);
    invoke(recovery.method, recovery.args[0]);
    assert.equal(evaluate("rowsAsObjects_(sheet_(labSpreadsheet_(),'Payments')).filter(p => p.requestId === '"+payment.requestId+"').length"), 1);
    assert.equal(evaluate("rowsAsObjects_(sheet_(labSpreadsheet_(),'AuditLog')).filter(a => a.logId === '"+payment.requestId+":payment').length"), 1);
    assert.equal(evaluate("findRow_(labSpreadsheet_(),'SaveRequests','requestId','"+payment.requestId+"').object.status"), 'COMPLETE');
    invoke('updateOrderRecipient', recipientInput);
  }
}
console.log('PASS: server -> Reload UI -> original-request recovery, both interruption points, five reference values, duplicate retry and recipient gates');

// Existing UI regressions cover stale success/failure; also verify the preserved draft can then be saved.
for (const outcome of ['success', 'failure']) {
  node('labelRecipientName').value = 'Latest Recipient';
  node('labelPhone').value = '0800000000';
  node('labelAddress').value = 'Old submitted address';
  node('labelPostalCode').value = '10000';
  uiRun('saveRecipient()');
  const stale = calls.at(-1);
  const oldSaved = invoke(stale.method, stale.args[0]);
  node('labelAddress').value = 'Latest fictional address ' + outcome;
  node('labelAddress').listeners.input[0]();
  if (outcome === 'success') stale.successHandler(oldSaved);
  else stale.failureHandler(new Error('Response lost after save'));
  assert.equal(node('labelAddress').value, 'Latest fictional address ' + outcome);
  assert.equal(node('printLabel').disabled, true);
  assert.equal(node('labelStage').hidden, true);
  uiRun('saveRecipient()');
  const latest = calls.at(-1);
  latest.successHandler(invoke(latest.method, latest.args[0]));
  assert.equal(node('labelAddressText').textContent, 'Latest fictional address ' + outcome);
  assert.equal(node('printLabel').disabled, false);
  assert.equal(node('labelStage').hidden, false);
}
console.log('PASS: newer draft survives stale success/failure and can subsequently persist and preview');
