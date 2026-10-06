const {spawn} = require('node:child_process');
const {resolve} = require('node:path');
const assert = require('node:assert/strict');
const origin = 'chrome-extension://nbfbbnnagaajnbhbdljbpncfdgnhfabe/';
async function run(args, body) {
  return new Promise((resolveTest,reject) => {
    const child=spawn(resolve('release/AIUsageBridge.exe'),args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
    const chunks=[]; const timeout=setTimeout(()=>{child.kill();reject(Error('Host timed out'));},5000);
    child.stdout.on('data',x=>chunks.push(x));
    child.stderr.on('data',()=>{});
    child.on('error',reject);
    child.on('exit',code=>{clearTimeout(timeout);resolveTest({code,bytes:Buffer.concat(chunks)});});
    child.stdin.on('error',()=>{});
    const bytes=Buffer.from(JSON.stringify(body),'utf8');
    const length=Buffer.alloc(4);length.writeUInt32LE(bytes.length);
    child.stdin.end(Buffer.concat([length,bytes]));
  });
}
(async()=>{
  const bad=await run([origin],{version:2,provider:'other',note:'ภาษาไทย'});
  assert.equal(bad.code,0);
  assert.equal(bad.bytes.readUInt32LE(0),bad.bytes.length-4);
  assert.equal(JSON.parse(bad.bytes.subarray(4).toString('utf8')).ok,false);
  const wrong=await run(['chrome-extension://wrong/'],{});
  assert.equal(wrong.code,1);assert.equal(wrong.bytes.length,0);
  console.log('PASS: native host rejects invalid messages and wrong extension origins; UTF-8 response framing is valid.');
})().catch(e=>{console.error(e);process.exitCode=1;});
