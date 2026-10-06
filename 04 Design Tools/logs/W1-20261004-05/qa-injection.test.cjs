const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{fixture}=require('./harness.cjs');
const f=fixture(true);f.item('W1V34CHECK-2','Instock','MAG');vm.runInContext(fs.readFileSync(__dirname+'/W1Qa.gs','utf8'),f.c);
const result=JSON.parse(f.c.w1QaV34Ledger());assert.equal(result.state,'NEEDS_REVIEW');assert.equal(result.nativeLedgerAlreadyWritten,true);assert.equal(result.payloadRetained,true);
console.log('PASS exact saved test helper injects SALES after-effect failure on isolated fixture');
