// Cart/Add flow check (2026-10-07). Run webapp-ux-harness.cjs first (it writes <outDir>/page.html). Usage: node webapp-ux-flow.cjs <outDir>
const path=require('path');const {chromium}=require('/opt/node-tools/node_modules/playwright');const OUT=process.argv[2];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.join(OUT,'page.html'));await pg.waitForTimeout(1500);
await pg.locator("button:has-text(\"Add to cart\")").nth(0).click();await pg.waitForTimeout(300);await pg.locator("button:has-text(\"Add to cart\")").nth(0).click();await pg.waitForTimeout(500);
await pg.screenshot({path:OUT+'/f1-after-add.png'});console.log('toast',await pg.$eval('#toast',e=>e.style.display+' '+e.textContent));
console.log('navCart',await pg.$eval('nav',e=>e.innerText.replace(/\n/g,' | ')));
await pg.click('nav >> text=CART');await pg.waitForTimeout(500);await pg.screenshot({path:OUT+'/f2-cart.png',fullPage:true});
console.log('subsidy',await pg.$eval('#cShipShop',e=>e.value));
await pg.fill('#cShipShop','');const create=await pg.$('button:text-is("Create order")');console.log('createBtn',create?await create.innerText():null);
if(create){await create.click();await pg.waitForTimeout(600);console.log('toast2',await pg.$eval('#toast',e=>e.style.display+' '+e.textContent));await pg.screenshot({path:OUT+'/f3-blank-subsidy.png'});}
// tap target sizes of chips
console.log('chipH',await pg.$$eval('button',bs=>[...new Set(bs.filter(b=>b.offsetHeight).map(b=>b.offsetHeight))].join(',')));
// FAB overlap
console.log('fab',await pg.evaluate(()=>{const f=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+');return f?JSON.stringify(f.getBoundingClientRect()):null}));
await pg.click('nav >> text=INVENTORY');await pg.waitForTimeout(300);
const fab=[...await pg.$$('button')];for(const x of fab){if((await x.innerText()).trim()==='+'){await x.click();break;}}await pg.waitForTimeout(500);await pg.screenshot({path:OUT+'/f4-add-form.png',fullPage:false});
console.log('fabEl',await pg.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length==0&&x.textContent.trim()==='+'&&x.offsetWidth>30);return e?e.tagName+'#'+e.id+'.'+e.className+' '+JSON.stringify(e.getBoundingClientRect()):null}));console.log('errors',JSON.stringify(errs));await b.close();})();
