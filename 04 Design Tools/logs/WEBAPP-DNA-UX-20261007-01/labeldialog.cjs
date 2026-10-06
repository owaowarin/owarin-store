// Standalone LabelDialog render (no :root tokens, as in the Sheets dialog). Usage: node labeldialog.cjs <appDir> <outDir>
const fs=require('fs'),path=require('path');const {chromium}=require('/opt/node-tools/node_modules/playwright');
const [app,out]=process.argv.slice(2);const rd=f=>fs.readFileSync(path.join(app,f),'utf8');
let h=rd('LabelDialog.html').replace(/<\?!= _w2Include_\('(\w+)'\) \?>/g,(m,n)=>rd(n+'.html')).replace('<?!= orderIds ?>','[]');
fs.writeFileSync(path.join(out,'labeldialog.html'),h);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage({viewport:{width:900,height:700}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.join(out,'labeldialog.html'));await pg.waitForTimeout(800);
console.log(JSON.stringify(await pg.evaluate(()=>{const q=s=>document.querySelector(s);const cs=e=>e?getComputedStyle(e):null;const root=getComputedStyle(document.documentElement).getPropertyValue('--card');
const el=[...document.querySelectorAll('*')].find(e=>/w2/i.test(e.id)&&getComputedStyle(e).position==='fixed');return {rootCardToken:root,panel:el&&el.id,bg:el&&cs(el).backgroundColor,color:el&&cs(el).color,bodyBg:cs(document.body).backgroundColor}})));
await pg.screenshot({path:path.join(out,'labeldialog.png')});console.log('errors',errs);await b.close();})();
