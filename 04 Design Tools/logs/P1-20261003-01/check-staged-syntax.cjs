const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, 'test-runtime-source');
for (const name of ['Code.gs', 'webapp.gs']) new Function(fs.readFileSync(path.join(dir, name), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'Index.html'), 'utf8');
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new Function(m[1]);
console.log('PASS: staged Code, webapp and Index scripts parse');
