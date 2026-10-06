// Reuse the label renderer with the reviewed caution artwork; then check syntax.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const workspace = path.resolve(__dirname, '../..');
const target = 'C:/Users/JIN/.codex/visualizations/2026/09/08/01a081d6-69cd-73e2-b880-2186e18c54cd/owarin-orders.html';
const source = fs.readFileSync(path.join(workspace, '04 Design Tools/OWARIN — LABEL TOOL.html'), 'utf8');
let preview = fs.readFileSync(target, 'utf8');
const css = source.slice(source.indexOf('  /* ═══ THE LABEL'), source.indexOf('  .measure{')).replace(/(^|\n)(\s*)(\.[\w-][^{]*?)(\{)/g, (_, n, space, selectors, brace) => n + space + selectors.split(',').map(s => '#owa-design ' + s.trim()).join(',') + brace)
  + '\n#owa-design .footer{padding:0;line-height:0;background:#000}\n#owa-design .footer img{display:block;width:100%;height:auto;margin:0}\n';
assert(css.includes('#owa-design .label'));
const asset = 'const CAUTION_STICKER = ' + JSON.stringify('data:image/webp;base64,' + fs.readFileSync(path.join(workspace,'04 Design Tools/caution-v2.webp')).toString('base64')) + ';';
const names = source.slice(source.indexOf('function bareName('), source.indexOf('function bareName(') + source.slice(source.indexOf('function bareName(')).indexOf('\n}', source.slice(source.indexOf('function bareName(')).indexOf('function displayName(')) + 2);
const render = source.slice(source.indexOf('function postalBoxes('), source.indexOf('function fitAll(')).replaceAll('รายการ', 'items');
assert(names.includes('function displayName('));
assert(render.includes('function labelHTML(') && render.includes('function fitItems('));
preview = preview.replace(/\/\* LABEL_CSS_START \*\/[\s\S]*?\/\* LABEL_CSS_END \*\//, () => '/* LABEL_CSS_START */\n' + css + '\n/* LABEL_CSS_END */');
preview = preview.replace(/\/\* LABEL_JS_START \*\/[\s\S]*?\/\* LABEL_JS_END \*\//, () => '/* LABEL_JS_START */\n' + asset + '\n' + names + '\n' + render + '\n/* LABEL_JS_END */');
assert(Buffer.byteLength(preview) < 1024 * 1024);
const script = preview.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
// Run the actual prototype's calculation checks without a browser or fake framework.
const helpers = script.slice(script.indexOf('const money='), script.indexOf('let selectedCustomer='));
const check = script.slice(script.indexOf('function selfCheck(){'), script.indexOf('selfCheck();renderMatches();'));
vm.runInNewContext("const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n" + helpers + check + '\nselfCheck();');
fs.writeFileSync(target, preview);
console.log('PASS: existing renderer with corrected caution artwork and zero footer padding; syntax, totals, shipping, payment state, recipient guard, natural sort and escaping.');
