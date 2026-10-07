const path=require('path');const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage({viewport:{width:900,height:700}});
await pg.goto('file://'+process.argv[2]+'/labeldialog.html');await pg.evaluate(()=>document.getElementById('w2Modal').style.display='flex');await pg.waitForTimeout(200);
console.log(JSON.stringify(await pg.evaluate(()=>{const p=document.querySelector('.w2-panel'),i=document.getElementById('w2Name'),c=getComputedStyle;return {panelBg:c(p).backgroundColor,panelColor:c(p).color,panelBorder:c(p).borderColor,inputBg:c(i).backgroundColor,inputColor:c(i).color,vis:c(document.getElementById('w2Modal')).display}})));
await pg.screenshot({path:process.argv[2]+'/labeldialog.png'});await b.close();})();
