import csv,hashlib,json
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image
p=Path(__file__).parent
base=p.parent/'W2-20261005-01'
def sha(s):return hashlib.sha256(s.replace('\r\n','\n').encode()).hexdigest().upper()
data=json.loads((p/'sources-before.json').read_text(encoding='utf-8'))
assert set(data)=={f.name for f in (base/'test-runtime').iterdir()}
for n,s in data.items(): assert sha(s)==sha((base/'test-runtime'/n).read_text(encoding='utf-8')),n
rev=json.loads((base/'revision.json').read_text())
for n,h in rev['hashes'].items():assert sha((base/'candidate'/n).read_text(encoding='utf-8'))==h,n
if (p/'sources-after.json').exists():
 after=json.loads((p/'sources-after.json').read_text(encoding='utf-8'))
 assert set(after)==set(data)|{'W3Qa.gs'}
 for n,s in data.items():assert sha(after[n])==sha(s),n
 assert sha(after['W3Qa.gs'])==sha((p/'W3Qa.gs').read_text(encoding='utf-8'))
for name in ['ui-shop.png','ui-shopee.png','migration.png']:
 f=p/name
 if not f.exists():continue
 with Image.open(f) as im:
  if im.format=='PNG':continue
  raw=p/(f.stem+'.raw.jpg')
  assert not raw.exists()
  with (p/'changes.csv').open('a',newline='',encoding='utf-8') as log:
   w=csv.writer(log);w.writerow([datetime.now(timezone.utc).isoformat(),p.name,'IMAGE-DRYRUN',hashlib.sha256(f.read_bytes()).hexdigest(),'preserve JPEG capture as '+raw.name+'; encode PNG','format only'])
   raw.write_bytes(f.read_bytes());im.save(f,format='PNG')
   w.writerow([datetime.now(timezone.utc).isoformat(),p.name,'IMAGE',raw.name,hashlib.sha256(f.read_bytes()).hexdigest(),'PNG verified; raw retained'])
 print(name,Image.open(f).format)
print('PASS: fresh 12-file source unchanged; candidate v39 hashes unchanged'+('; QA-only 13th file readback matches' if (p/'sources-after.json').exists() else ''))
(p/'source-verification.json').write_text(json.dumps({'result':'PASS','candidateRevision':rev,'original12FilesUnchanged':True,'qa13thFileReadback':(p/'sources-after.json').exists()},indent=2)+'\n',encoding='utf-8')
