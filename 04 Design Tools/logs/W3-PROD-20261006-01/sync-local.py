import csv,json,hashlib,shutil
from datetime import datetime
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2];web=root/'03 Apps Script/Web App';revision=json.loads((p/'revision.json').read_text())
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),'W3-PROD-20261006-01',a,b,c,d])
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest().upper()
archive=web/'backup/pre-v41-20261006';assert not archive.exists()
tests=['image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js','p1-add.test.cjs']
for n,h in revision['hashes'].items():assert sha(p/'candidate'/n)==h
log('LOCAL-SYNC-DRYRUN','Root production pair31/shared Index/tests','Root exact deployed pair41/helpers','Preserve old pair+Index/test files; immutable candidate revision matches13saved Google files; no auxiliary overwrite')
archive.mkdir(parents=True)
for n in ['Code_v31.gs','WebApp_v31.gs','Index.html']+tests:
 before=p/'before/local-source'/n;assert not before.exists();before.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(web/n,before)
for n in ['Code_v31.gs','WebApp_v31.gs']:
 shutil.copy2(web/n,archive/n);assert sha(web/n)==sha(archive/n)
 (web/n).write_text('// Superseded. Full source: backup/pre-v41-20261006/'+n+'\n// Current production pair: Code_v41.gs + WebApp_v41.gs; do not upload this stub.\n',encoding='utf-8')
for n,h in revision['hashes'].items():
 target=web/n
 if n!='Index.html':assert not target.exists(),n
 target.write_bytes((p/'candidate'/n).read_bytes());assert sha(target)==h
for n in tests:
 target=web/n;old=target.read_text();new=old.replace('Code_v31.gs','Code_v41.gs').replace('WebApp_v31.gs','WebApp_v41.gs');assert new!=old;target.write_text(new,encoding='utf-8',newline='\n')
log('LOCAL-SYNC','Root pair31/Index/tests',revision['revision'],'10exact source files; old full pair archived and stubs point41; four impacted tests repointed; live/other local R2/FbAlbum/P1Journal unchanged')
print('PASS root10files exact deployed v41; four test paths updated')
