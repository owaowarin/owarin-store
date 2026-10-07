const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const pg=await b.newPage({viewport:{width:390,height:844}});
await pg.goto('file://'+process.argv[2]);await pg.waitForTimeout(1200);
for(const t of await pg.$$('nav button')){const tx=(await t.textContent()).trim();await t.click();await pg.waitForTimeout(500);
console.log(tx,JSON.stringify(await pg.$eval('nav',n=>({sl:n.scrollLeft,sw:n.scrollWidth,cw:n.clientWidth,more:n.classList.contains('more'),mask:getComputedStyle(n).maskImage.slice(0,20)}))));}
await b.close();})();
