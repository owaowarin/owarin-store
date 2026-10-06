const { spawn } = require('node:child_process');
const child = spawn(process.argv[2] || 'codex', ['app-server', '--listen', 'stdio://'], {
  windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
});
let buffer = '', done = false;
const send = obj => child.stdin.write(JSON.stringify(obj) + '\n');
const timeout = setTimeout(() => finish({ error: 'Codex read timed out' }, 1), 20000);
function finish(value, code = 0) {
  if (done) return;
  done = true; clearTimeout(timeout); console.log(JSON.stringify(value)); child.kill(); process.exitCode = code;
}
child.on('error', e => finish({ error: e.message }, 1));
child.stderr.on('data', () => {}); // Do not print unrelated logs or local account data.
child.stdout.on('data', chunk => {
  buffer += chunk;
  let pos;
  while ((pos = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, pos); buffer = buffer.slice(pos + 1);
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id === 1) {
      if (msg.error) return finish({error:msg.error.message}, 1);
      send({method:'initialized'});
      send({id:2,method:'account/rateLimits/read'});
    }
    if (msg.id === 2) {
      if (msg.error) return finish({error:msg.error.message}, 1);
      const r = msg.result;
      const limits = r.rateLimitsByLimitId || { codex:r.rateLimits };
      finish(Object.fromEntries(Object.entries(limits).map(([id,x])=>[id,{
        primary:x.primary,secondary:x.secondary,planType:x.planType
      }])));
    }
  }
});
child.on('exit', code => { if (!done) finish({error:'App server exited before usage reply', code},1); });
send({id:1,method:'initialize',params:{clientInfo:{name:'ai_usage_widget',version:'2.0.0'}}});
