// Review-only: demonstrate current defects in the existing VM harness; no Google calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, 'baseline');
const harness = fs.readFileSync(path.join(base, 'p1-add.test.cjs'), 'utf8');
const cases = `
// A committed item's SKU is changed, and a different item subsequently uses the old SKU.
const oldSku = rowsA[2][1];
rowsA[2][1] = 'RENAMED-ORIGINAL';
rowsA.push(['Different inventory copy', oldSku, 'New Arrival']);
const recovered = status(0);
assert.equal(recovered.state, 'DONE');
assert.equal(recovered.data.result.title, 'Synthetic 0');
assert.equal(recovered.data.item.name, 'Different inventory copy');
console.log('CONFIRMED R1: DONE journal title Synthetic 0 returns another item after unique SKU reuse');

const savedCostColumn = columns.cost;
delete columns.cost;
const missingCost = add('review-missing-cost', 'GGB', {cost:99});
assert.equal(missingCost.result.success, true);
assert.equal(rowsA[missingCost.result.row-1][savedCostColumn-1] ?? '', '');
assert.equal(rowsJ.at(-1)[4], 'DONE');
columns.cost = savedCostColumn;
console.log('CONFIRMED R2: absent Cost mapping silently drops requested 99 yet records DONE');

const unknownStatus = add('review-status', 'GGB', {status:'Pending-without-order'});
assert.equal(unknownStatus.item.status, 'Pending-without-order');
assert.equal(rowsJ.at(-1)[4], 'DONE');
console.log('CONFIRMED R3: arbitrary status Pending-without-order accepted and recorded DONE');
const wrongSource = add('review-source', 'INVALID_SOURCE');
assert.equal(wrongSource.result.sheetName, 'GAME GUIDE BOOKS');
assert.equal(rowsJ.at(-1)[4], 'DONE');
console.log('CONFIRMED R3: invalid source silently selects GAME GUIDE BOOKS and records DONE');

// Exercise the real derived-formula function: the ordinary harness replaces it with a no-op.
const code = read('Code.gs');
vm.runInContext(code.slice(code.indexOf('function _setDerivedFormulasForRow('),
  code.indexOf('function _fixDerivedFormulasForSheet(')), c);
columns.marketplace = 15;
failure = (name,row,col) => name === 'GAME GUIDE BOOKS' && col === 15 ? 'DROP' : null;
const silentFormula = add('review-formula-drop', 'GGB', {price:100});
failure = null;
assert.equal(silentFormula.result.success, true);
assert.equal(rowsA[silentFormula.result.row-1][14] ?? '', '');
assert.equal(rowsJ.at(-1)[4], 'DONE');
console.log('CONFIRMED R4 (injected silent write loss): missing marketplace formula is not checked before DONE');
`;
vm.runInNewContext(harness + cases, {require, __dirname:base, console, Buffer, process}, {filename:__filename});
