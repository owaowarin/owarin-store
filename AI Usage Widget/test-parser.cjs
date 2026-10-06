const assert = require('node:assert/strict');
const {parse} = require('./Chrome Connector/parser.js');
const text = [
'Plan usage limits Pro','Current session','Starts when a message is sent','0% used',
'Weekly limits','Your limits are temporarily boosted.','Claude Code limit is 50% higher',
'All models','Resets Fri 1:00 PM','42% used','Last updated: just now','Usage credits','$0.00'
].join('\n');
assert.deepEqual(parse(text).map(x=>x.usedPercent),[0,42]);
assert.equal(parse(text)[0].resetText,'Starts when a message is sent');
assert.equal(parse(text)[1].resetText,'Resets Fri 1:00 PM');
assert.throws(()=>parse(text.replace('42% used','42% remaining')));
assert.throws(()=>parse(text.replace('42% used','101% used')));
assert.throws(()=>parse(text.replace('42% used','42% used\n30% used')));
assert.throws(()=>parse('A chat about Current session and 68% used'));
assert.throws(()=>parse(text.replace('0% used','')));
console.log('PASS: zero, boost isolation, row/reset boundaries, missing/ambiguous data, chat exclusion.');
