# Delta 1 (found by bad-check.cjs): input rules carry `outline:none` with higher specificity, so .bad outline never showed. CSS-only fix.
from pathlib import Path
import csv,hashlib,json,shutil
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
old='.bad{outline:1px solid var(--destructive);outline-offset:-1px}';new='.bad{outline:1px solid var(--destructive)!important;outline-offset:-1px}'
for f in [p/'candidate/Index.html',app/'Index.html']:
 s=f.read_text(encoding='utf-8');assert s.count(old)==1;f.write_text(s.replace(old,new),encoding='utf-8',newline='\n')
assert (p/'candidate/Index.html').read_bytes()==(app/'Index.html').read_bytes()
rev=json.loads((p/'revision.json').read_text());base=rev['base']
rev['hashes']['Index.html']=sha((app/'Index.html').read_bytes())
for n,h in rev['hashes'].items():assert sha((app/n).read_bytes())==h,n
revision=p.name+'/v43@'+sha(json.dumps(rev['hashes'],sort_keys=True).encode())
(p/'revision.json').write_text(json.dumps({'revision':revision,'base':base,'hashes':rev['hashes']},indent=2)+'\n',encoding='utf-8')
log('EDIT','Index.html','candidate+repo','.bad outline !important (specificity fix; outline only, no money logic)')
log('REVISION',rev.get('revision',''),revision,'rehash after fix1')
print('PASS '+revision)
