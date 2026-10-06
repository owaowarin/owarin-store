'use strict';
// Mock-only review probes. Reuse the candidate's test harness without editing it.
const fs = require('node:fs');
const path = require('node:path');
const lab = path.resolve(__dirname, '../../OWARIN Back House LAB');
const run = (file, probe) => new Function('require', '__dirname', fs.readFileSync(path.join(lab, 'tests', file), 'utf8') + '\n' + probe)(require, path.join(lab, 'tests'));

run('logic.test.js', `
// A new fictional copy/order lives only in the existing mock spreadsheet.
evaluate("appendObject_(labSpreadsheet_(),'Items',{itemId:'ITM-REVIEW',title:'Review copy',kind:'Guide Book',askingPrice:100,status:'AVAILABLE',activeOrderId:'',updatedAt:now_()})");
const reviewOrder = evaluate("confirmAwaitingPaymentOrder({requestId:'REVIEW-O',customerId:customerId,lines:[{itemId:'ITM-REVIEW',salePrice:100}],recipient:{}})");
context.reviewOrderId = reviewOrder.orderId;
const beforeInvalid = JSON.stringify(spreadsheet.sheets);
for (const amount of [0,-1,149,151,'NaN']) {
  assert.throws(() => evaluate('recordPayment(' + JSON.stringify({requestId:'INVALID-'+amount,orderId:reviewOrder.orderId,amount,reference:''}) + ')'));
}
assert.equal(JSON.stringify(spreadsheet.sheets), beforeInvalid);
console.log('PASS: invalid new payments leave all mock tables unchanged');

// Verify missing and malformed schema on a write path too, not only bootstrap.
for (const name of ['Payments','AuditLog','SaveRequests']) {
  const originalSheets = spreadsheet.sheets.slice();
  spreadsheet.sheets = spreadsheet.sheets.filter(s => s.name !== name);
  const before = JSON.stringify(spreadsheet.sheets);
  assert.throws(() => evaluate("saveCustomer({requestId:'SCHEMA',buyerName:'Blocked'})"), /Required sheet is missing/);
  assert.equal(JSON.stringify(spreadsheet.sheets), before);
  spreadsheet.sheets = originalSheets;
}
const headers = spreadsheet.getSheetByName('Payments').values[0];
headers.push('unexpected');
assert.throws(() => evaluate('getBootstrapData()'), /Schema mismatch/);
headers.pop();
console.log('PASS: missing critical tables and extra headers block runtime');

evaluate("auditOnce_ = function(s,l,e,i,a,b,f,r) { if(r==='REVIEW-P') throw new Error('Injected review audit failure'); return originalAuditOnce(s,l,e,i,a,b,f,r); }");
assert.throws(() => evaluate("recordPayment({requestId:'REVIEW-P',orderId:reviewOrderId,amount:150,reference:'FICTIONAL'})"), /Injected review audit failure/);
evaluate('auditOnce_ = originalAuditOnce');
const reloaded = evaluate('getOrder(reviewOrderId)');
const pending = evaluate("findRow_(labSpreadsheet_(),'SaveRequests','requestId','REVIEW-P').object.status");
const audit = evaluate("findRow_(labSpreadsheet_(),'AuditLog','logId','REVIEW-P:payment')");
assert.equal(reloaded.paymentStatus,'PAID');
assert.equal(pending,'STARTED');
assert.equal(audit,null);
assert.throws(() => evaluate("recordPayment({requestId:'REVIEW-P-NEW',orderId:reviewOrderId,amount:150,reference:'FICTIONAL'})"), /Overpayment/);
const recipient = evaluate("updateOrderRecipient({requestId:'REVIEW-R',orderId:reviewOrderId,recipient:{recipientName:'Review',phone:'0800000000',address:'1 Fictional Road',postalCode:'10000'}})");
assert.equal(recipient.paymentStatus,'PAID');
console.log('CONFIRMED R1: reload exposes PAID with STARTED payment and no audit; new-ID payment retry is rejected; recipient save is allowed');
`);

run('ui.test.js', `
// A pending save response is for the same order but for an older recipient draft.
node('orderId').value = orderA.orderId;
vm.runInContext('state.order = orderA; renderOrder(orderA); saveRecipient();', ui);
const pendingSave = calls.at(-1);
assert.equal(pendingSave.method,'updateOrderRecipient');
node('labelAddress').value = 'New unsaved address';
node('labelAddress').listeners.input[0]();
assert.equal(node('printLabel').disabled,true);
pendingSave.successHandler(orderA);
assert.equal(node('labelAddress').value,orderA.address);
assert.equal(node('printLabel').disabled,false);
assert.equal(node('labelStage').hidden,false);
console.log('CONFIRMED R2: editing recipient during RPC loses the new draft and enables printing the older address');

// Reload resets the request ID and hides the recovery action once PAID is shown.
node('orderId').value = orderA.orderId;
const previousPaymentRequest = vm.runInContext('paymentRequestId',ui);
vm.runInContext('reloadOrder()',ui);
calls.at(-1).successHandler(orderA);
assert.notEqual(vm.runInContext('paymentRequestId',ui),previousPaymentRequest);
assert.equal(node('recordPayment').disabled,true);
assert.equal(node('saveRecipient').disabled,false);
console.log('CONFIRMED R1 UI: reload replaces the payment request ID and disables payment retry on PAID');
`);
