// Review evidence only: asserts remaining defects on the frozen submitted revision.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, 'baseline');
const bridge = {};
const server = fs.readFileSync(path.join(base, 'p1-add.test.cjs'), 'utf8');
vm.runInNewContext(server + `
const firstReviewAdd = add('review-replay', 'GGB', {price:199});
const reviewSku = firstReviewAdd.item.productId;
rowsA[firstReviewAdd.result.row - 1][columns.productId - 1] = 'RENAMED-ORIGINAL';
rowsA.push(['Different current copy', reviewSku, 'Sold']);
const reviewRowsBefore = rowsA.length;
const reviewReplay = add('review-replay', 'GGB', {price:199});
assert.equal(rowsA.length, reviewRowsBefore, 'server replay does not duplicate the row');
assert.equal(reviewReplay.item.name, 'Synthetic review-replay');
assert.equal(reviewReplay.item.status, 'New Arrival');
assert.equal(reviewReplay.historical, undefined, 'defect: Add replay lacks historical marker');
assert.equal(status('review-replay', 'GGB', {price:199}).data.historical, true);
bridge.replay = JSON.parse(JSON.stringify(reviewReplay));
bridge.current = {source:'GGB', productId:reviewSku, name:'Different current copy', status:'Sold'};
console.log('CONFIRMED R1-R: inventory.add replay returns an unmarked historical snapshot after SKU reuse; addStatus correctly marks it');

for (const [label, bad, accepted] of [['false',false,'New Arrival'], ['zero',0,'New Arrival'],
                                    ['empty-array',[],'New Arrival'], ['status-array',['Sold'],'Sold']]) {
  const beforeRows = rowsA.length;
  const result = add('review-status-'+label, 'GGB', {status:bad});
  assert.equal(rowsA.length, beforeRows+1);
  assert.equal(result.item.status, accepted);
  assert.equal(rowsJ.at(-1)[4], 'DONE');
  console.log('CONFIRMED R3-R: status '+JSON.stringify(bad)+' accepted as '+accepted+' and committed DONE');
}
`, {require, __dirname:base, console, Buffer, process, bridge}, {filename:__filename});

const uiHarness = fs.readFileSync(path.join(base, 'p1-ui.test.cjs'), 'utf8');
const factory = uiHarness.slice(0, uiHarness.indexOf('(async()=>{'));
vm.runInNewContext(factory + `
(async()=>{
  const u=make();u.c.openAdd();u.$('fName').value='Synthetic review-replay';u.fire('mSave','click');
  u.pending.shift().reject(Error('RESPONSE INTERRUPTED'));await u.settle();
  u.fire('mSave','click');
  u.pending.shift().resolve({state:'NOT_FOUND'});await u.settle();
  assert.equal(u.requests.at(-1).action,'inventory.add');
  u.c.S.data.GGB.push({...bridge.current});
  u.pending.shift().resolve(bridge.replay);await u.settle();
  assert.equal(u.c.S.data.GGB.length,1);
  assert.equal(u.c.S.data.GGB[0].name,'Synthetic review-replay');
  assert.equal(u.c.S.data.GGB[0].status,'New Arrival');
  console.log('CONFIRMED R1-R UI: same-ID resend response replaces Different current copy/Sold with historical name/New Arrival in live cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
`, {require, __dirname:base, console, Buffer, process, setImmediate, bridge}, {filename:__filename});
