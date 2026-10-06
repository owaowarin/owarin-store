# Delta 3 (Opus review): scrollIntoView nearest leaves the nav 16px end padding unscrolled, so the 18% fade mask still covered the selected last tab (TOOLS). Push the active tab left of the fade zone; at the end this reaches max scroll and the mask turns off.
from pathlib import Path
import csv,hashlib,json
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
old="  if (navOn && navOn.scrollIntoView) navOn.scrollIntoView({ inline: 'nearest', block: 'nearest' });\n"
new=old+"  if (navOn) { var navEl = navOn.parentNode, over = navOn.getBoundingClientRect().right - (navEl.getBoundingClientRect().right - navEl.clientWidth * 0.18); if (over > 0) navEl.scrollLeft += over; }\n"
for f in [p/'candidate/Index.html',app/'Index.html']:
 s=f.read_text(encoding='utf-8');assert s.count(old)==1,f;f.write_text(s.replace(old,new),encoding='utf-8',newline='\n')
assert (p/'candidate/Index.html').read_bytes()==(app/'Index.html').read_bytes()
rev=json.loads((p/'revision.json').read_text());prev=rev['revision']
rev['hashes']['Index.html']=sha((app/'Index.html').read_bytes())
for n,h in rev['hashes'].items():assert sha((app/n).read_bytes())==h,n
revision=p.name+'/v43@'+sha(json.dumps(rev['hashes'],sort_keys=True).encode())
(p/'revision.json').write_text(json.dumps({'revision':revision,'base':rev['base'],'hashes':rev['hashes']},indent=2)+'\n',encoding='utf-8')
log('EDIT','Index.html','candidate+repo','showView: keep selected nav tab out of the fade zone')
log('REVISION',prev,revision,'rehash after fix3')
print('PASS '+revision)
