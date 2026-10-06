from pathlib import Path
import csv,hashlib,json,shutil
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
old=json.loads((p.parent/'W3-PROD-20261006-01/revision.json').read_text())
fresh=json.loads((p/'sources-before-retry.json').read_text(encoding='utf-8'))['sources']
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
for native,local in [('Code.gs','Code_v41.gs'),('webapp.gs','WebApp_v41.gs'),('Index.html','Index.html')]:
 s=fresh[native].replace('\r\n','\n');assert sha(s.encode())==old['hashes'][local]==sha((app/local).read_bytes())
 dest=p/'before/native'/native;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(s,encoding='utf-8',newline='\n')
for name,h in old['hashes'].items():
 assert sha((app/name).read_bytes())==h;shutil.copy2(app/name,p/'candidate'/name.replace('v41','v42'))
for name in ['Code_v42.gs','WebApp_v42.gs']:
 f=p/'candidate'/name;s=f.read_text(encoding='utf-8');assert s.count('v41')==2;f.write_text(s.replace('v41','v42'),encoding='utf-8',newline='\n')
f=p/'candidate/Index.html';s=f.read_text(encoding='utf-8');before=s
assert s.count('placeholder="Confirm subsidy, e.g. 0"')==2
s=s.replace('placeholder="Confirm subsidy, e.g. 0"','value="0" placeholder="0"')
assert s.count("$('cShipShop').value='';")==2 and s.count("$('soldShip').value = '';")==1
s=s.replace("$('cShipShop').value='';","$('cShipShop').value='0';").replace("$('soldShip').value = '';","$('soldShip').value = '0';")
log('EDIT-DRYRUN',old['revision'],'paired42; Index five default/reset changes','Owner default0; preserve explicit values during render/channel change, no money validation/server/recovery change')
f.write_text(s,encoding='utf-8',newline='\n')
hashes={n.replace('v41','v42'):sha((p/'candidate'/n.replace('v41','v42')).read_bytes()) for n in old['hashes']}
revision=p.name+'/v42@'+sha(json.dumps(hashes,sort_keys=True).encode())
(p/'revision.json').write_text(json.dumps({'revision':revision,'base':old['revision'],'hashes':hashes},indent=2)+'\n',encoding='utf-8')
s=(p.parent/'W3-PROD-20261006-01/regression.cjs').read_text().replace('Code_v41.gs','Code_v42.gs').replace('WebApp_v41.gs','WebApp_v42.gs');(p/'regression.cjs').write_text(s,encoding='utf-8')
log('EDIT',old['revision'],revision,'PASS full fresh native source match before edit; five Index defaults/resets + paired header bump only; old full pair/source backed; candidate helpers unchanged')
print('PASS '+revision)
