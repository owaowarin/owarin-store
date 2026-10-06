const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/watchdog-probe.gs', 'utf8');
new vm.Script(source);
let writes = 0, sleep = [];
const sheet = { getId: () => '13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM' };
const c = vm.createContext({
  addInventoryRow(data) { writes++; return {title:data.title, row:23}; },
  SpreadsheetApp: { getActiveSpreadsheet: () => sheet },
  Utilities: { sleep(ms) { sleep.push(ms); } },
});
vm.runInContext(source, c);
assert.equal(c.addInventoryRow({title:'Other test item'}).row, 23);
assert.equal(writes, 1);
assert.deepEqual(sleep, []);
c.addInventoryRow({title:'Synthetic QA Watchdog 20260930 A31'});
assert.equal(writes, 2);
assert.deepEqual(sleep, [52000]);
sheet.getId = () => 'WRONG_SHEET';
assert.throws(() => c.addInventoryRow({title:'Synthetic QA Watchdog 20260930 A31'}), /blocked outside/);
assert.equal(writes, 2, 'wrong Sheet must fail before business write');
console.log('PASS: exact test-Sheet guard, exact-title post-commit delay, wrong-Sheet no-write');
