# Delta 2 (Opus review): showView() now hides the toast (B3), but w1Saved() showed the order-saved toast BEFORE showView('orders'),
# so the owner never saw the order ID / status. Show the view first, then the toast. UI-only; no payload/money change.
from pathlib import Path
import csv,hashlib,json
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
t="okToast((result.message||result.status)+' · '+result.orderId+' · '+(result.labelReadiness==='MISSING'?'Missing label':''));"
old=" "+t+"\n showView('orders');load();"
new=" showView('orders');\n "+t+"\n load();"
for f in [p/'candidate/Index.html',app/'Index.html']:
 s=f.read_text(encoding='utf-8');assert s.count(old)==1,f;f.write_text(s.replace(old,new),encoding='utf-8',newline='\n')
assert (p/'candidate/Index.html').read_bytes()==(app/'Index.html').read_bytes()
rev=json.loads((p/'revision.json').read_text());prev=rev['revision']
rev['hashes']['Index.html']=sha((app/'Index.html').read_bytes())
for n,h in rev['hashes'].items():assert sha((app/n).read_bytes())==h,n
revision=p.name+'/v43@'+sha(json.dumps(rev['hashes'],sort_keys=True).encode())
(p/'revision.json').write_text(json.dumps({'revision':revision,'base':rev['base'],'hashes':rev['hashes']},indent=2)+'\n',encoding='utf-8')
log('EDIT','Index.html','candidate+repo','w1Saved: showView before okToast so order-saved toast survives B3 hide')
log('REVISION',prev,revision,'rehash after fix2')
print('PASS '+revision)
