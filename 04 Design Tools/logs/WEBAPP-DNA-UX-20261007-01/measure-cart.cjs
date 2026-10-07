const path=require('path');const {chromium}=require('/opt/node-tools/node_modules/playwright');const OUT=process.argv[2];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:390,height:844}});
await pg.goto('file://'+path.join(OUT,'page.html'));await pg.waitForTimeout(1500);
await pg.locator('button:has-text("Add to cart")').nth(0).click();await pg.waitForTimeout(300);
await pg.click('nav >> text=CART');await pg.waitForTimeout(400);
console.log(JSON.stringify(await pg.$$eval('button,select,input:not([type=checkbox])',els=>els.filter(e=>e.offsetParent&&(e.tagName==='BUTTON'?e.offsetHeight<36:e.offsetHeight<40)).map(e=>[e.tagName,e.id,e.className,(e.textContent||'').trim().slice(0,20),e.offsetHeight]))));await b.close();})();
