from pathlib import Path
import csv,hashlib,json,shutil
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
old=json.loads((p.parent/'W1-SUBSIDY0-20261006-01/revision.json').read_text())
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
def replace(s,find,new,count=1):
 assert s.count(find)==count,('anchor count',s.count(find),find[:70]);return s.replace(find,new)
# S1.1 preflight
for name,h in old['hashes'].items():assert sha((app/name).read_bytes())==h,name
log('PREFLIGHT',old['revision'],'10 files','PASS all SHA256 equal W1-SUBSIDY0 revision.json')
# S1.2 before + backup
bk=app/'backup/pre-v43-20261007';bk.mkdir(parents=True,exist_ok=True)
for name in old['hashes']:shutil.copy2(app/name,p/'before'/name)
for name in ['Code_v42.gs','WebApp_v42.gs']:shutil.copy2(app/name,bk/name)
log('BACKUP','Code_v42.gs+WebApp_v42.gs',str(bk.relative_to(root)),'full copy; 10 files copied to packet before/')
# S1.3 candidate
for name in old['hashes']:
 shutil.copy2(app/name,p/'candidate'/name.replace('v42','v43'))
hdr='// v43 (2026-10-07): UI only — DNA tokens in W2LabelUI, phone nav/header/touch/FAB, field-specific money errors. Server unchanged.\n'
for name in ['Code_v43.gs','WebApp_v43.gs']:
 f=p/'candidate'/name;s=f.read_text(encoding='utf-8');assert s.count('v42')==2
 s=s.replace('v42','v43');lines=s.split('\n',3)
 assert lines[0].startswith('// ====') and 'v43' in lines[1]
 s=lines[0]+'\n'+lines[1]+'\n'+hdr+lines[2]+'\n'+lines[3];f.write_text(s,encoding='utf-8',newline='\n')
# A1
f=p/'candidate/W2LabelUI.html';s=f.read_text(encoding='utf-8')
for a,b,c in [('background:#000b','background:hsl(0 0% 0% / .73)',1),('background:#151515','background:var(--card,#151515)',1),('color:#eee','color:var(--fg,#eee)',2),('border:1px solid #ad914d','border:1px solid var(--gold-muted,#ad914d)',1),('background:#222','background:var(--input,#222)',2),('border:1px solid #555','border:1px solid var(--border,#555)',1),('background:#63532e','background:var(--gold-muted,#63532e)',1)]:
 s=replace(s,a,b,c)
f.write_text(s,encoding='utf-8',newline='\n');log('EDIT','W2LabelUI.html','candidate','A1 colours to tokens with fallbacks (9 replacements)')
# B
f=p/'candidate/Index.html';s=f.read_text(encoding='utf-8')
css='''@media(min-width:700px){ .modal-bg{align-items:center} html,body{font-size:15px} }
/* v43 phone UX (2026-10-07) */
nav.more{-webkit-mask-image:linear-gradient(90deg,#000 82%,transparent);mask-image:linear-gradient(90deg,#000 82%,transparent)}
.bad{outline:1px solid var(--destructive);outline-offset:-1px}
.fab{transition:opacity .15s}.fab.hide{opacity:0;pointer-events:none}
@media(max-width:600px){
  nav button{padding:14px 12px 12px}
  .chip{min-height:36px}
  .btn,.btn.small,.seg button{min-height:36px}
  select,input:not([type=checkbox]){min-height:40px}
}
@media(max-width:420px){
  .brand{letter-spacing:.2em;font-size:12px}
  .brand .g,#count{white-space:nowrap}
}'''
s=replace(s,'@media(min-width:700px){ .modal-bg{align-items:center} html,body{font-size:15px} }',css)
a="  if (v === 'contents') loadContents(false);"
i=s.index(a,s.index('function showView(v){'));j=s.index('\n',i)
assert s[j+1]=='}',repr(s[j:j+10])
s=s[:j+1]+"  $('toast').style.display = 'none';\n  var navOn = document.querySelector('nav button.on');\n  if (navOn && navOn.scrollIntoView) navOn.scrollIntoView({ inline: 'nearest', block: 'nearest' });\n  navFade();\n"+s[j+1:]
s=replace(s,"function showModal(id, on){ $(id).classList.toggle('open', !!on); }","function showModal(id, on){ if (on) $('toast').style.display = 'none'; $(id).classList.toggle('open', !!on); }")
helpers='''$('fab').addEventListener('click', openAdd);
function navFade(){ var n = document.querySelector('nav'); n.classList.toggle('more', n.scrollLeft + n.clientWidth < n.scrollWidth - 4); }
document.querySelector('nav').addEventListener('scroll', navFade, { passive: true });
window.addEventListener('resize', navFade);
navFade();
var fabTimer = null;
window.addEventListener('scroll', function(){
  var f = $('fab'); if (window.innerWidth > 600 || f.style.display === 'none') return;
  f.classList.add('hide'); clearTimeout(fabTimer);
  fabTimer = setTimeout(function(){ f.classList.remove('hide'); }, 700);
}, { passive: true });
document.addEventListener('input', function(e){ if (e.target.classList && e.target.classList.contains('bad')) e.target.classList.remove('bad'); });
function markBad(el, msg){
  var old = document.querySelectorAll('.bad'); for (var i = 0; i < old.length; i++) old[i].classList.remove('bad');
  if (el) { el.classList.add('bad'); el.focus(); }
  toast(msg);
}'''
s=replace(s,"$('fab').addEventListener('click', openAdd);",helpers)
oldv="""if(w1StrictMoney(p.customerShipping)===null||w1StrictMoney(p.shippingSubsidy)===null||p.items.some(function(i){return w1StrictMoney(i.price)===null;})){toast('Enter valid prices, Customer Shipping and Shipping Subsidy (0 is allowed)');return;}"""
newv="""var badIdx=-1;p.items.some(function(i,k){if(w1StrictMoney(i.price)===null){badIdx=k;return true;}return false;});
 if(badIdx>=0){markBad(document.querySelector('.cl-price[data-idx="'+badIdx+'"]'),'Price of item '+(badIdx+1)+' — ใส่ตัวเลข เช่น 450');return;}
 if(w1StrictMoney(p.customerShipping)===null){markBad($('cShip'),'Customer Shipping — ใส่ตัวเลข (0 ได้)');return;}
 if(w1StrictMoney(p.shippingSubsidy)===null){markBad($('cShipShop'),'Shipping Subsidy — ใส่ตัวเลข (0 ได้)');return;}"""
s=replace(s,oldv,newv)
s=replace(s,"toast('Valid price/subsidy required');return;}","markBad(w1StrictMoney(price)===null?$('soldPrice'):$('soldShip'),w1StrictMoney(price)===null?'Price — ใส่ตัวเลข เช่น 450':'Shipping Subsidy — ใส่ตัวเลข (0 ได้)');return;}")
f.write_text(s,encoding='utf-8',newline='\n');log('EDIT','Index.html','candidate','B1-B6 CSS + showView/showModal/helpers/confirmSold/sold form')
hashes={n.replace('v42','v43'):sha((p/'candidate'/n.replace('v42','v43')).read_bytes()) for n in old['hashes']}
revision=p.name+'/v43@'+sha(json.dumps(hashes,sort_keys=True).encode())
(p/'revision.json').write_text(json.dumps({'revision':revision,'base':old['revision'],'hashes':hashes},indent=2)+'\n',encoding='utf-8')
log('REVISION',old['revision'],revision,'candidate built; repo not yet touched')
print('PASS '+revision)
