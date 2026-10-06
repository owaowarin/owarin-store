const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'Index.html'), 'utf8');
const source = html.match(/function inventoryRows\(\)\s*\{[^}]+\}/)?.[0];
assert.ok(source, 'inventoryRows() is missing');

const S = { allSheets: true, source: 'GGB', data: { GGB: [{ source: 'GGB' }], MAG: [{ source: 'MAG' }] } };
const inventoryRows = Function('S', `${source}; return inventoryRows;`)(S);
assert.deepEqual(inventoryRows().map(row => row.source), ['GGB', 'MAG']);
S.allSheets = false;
assert.deepEqual(inventoryRows().map(row => row.source), ['GGB']);

assert.match(html, /fillForm\(\{ status: 'New Arrival' \}\)/);
assert.match(html, /data-src="' \+ esc\(r\.source\)/);
console.log('Index inventory smoke test passed');
