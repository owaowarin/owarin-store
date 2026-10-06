import csv,hashlib,json,shutil
from datetime import datetime
from pathlib import Path
p=Path(__file__).parent;out=p/'candidate';old=json.loads((p/'revision.json').read_text())
backup=p/'backup/v40';assert not backup.exists()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),'W3-PROD-20261006-01',a,b,c,d])
log('FIX-DRYRUN',old['revision'],'v41','Native CLIENT table A1:F1000 extended to H1000; generated Column 7/8; original request remains v40; preserve all attempts/IDs')
backup.mkdir(parents=True);shutil.copy2(p/'revision.json',backup/'revision.json')
for n,h in old['hashes'].items():
 assert hashlib.sha256((out/n).read_bytes()).hexdigest().upper()==h
 shutil.copy2(out/n,backup/n)
for n in ['Code_v40.gs','WebApp_v40.gs']:
 s=(out/n).read_text().replace('Code.gs v40','Code.gs v41').replace('WebApp.gs v40','WebApp.gs v41')
 (out/n.replace('v40','v41')).write_text(s,encoding='utf-8',newline='\n')
 (out/n).write_text('// Archived full source: ../backup/v40/'+n+'; active pair is v41.\n',encoding='utf-8')
s=(out/'W1Orders.gs').read_text().replace('W1 v40 production release','W1 v41 production release').replace('Code v40 / WebApp v40','Code v41 / WebApp v41')
(out/'W1Orders.gs').write_text(s,encoding='utf-8',newline='\n')
s=(out/'W2Clients.gs').read_text().replace('v40','v41')
oldcode="var current=sh.getRange(1,1,1,8).getValues()[0];current.forEach(function(v,i){if(v!==''&&v!==W2_CLIENT_HEADERS[i])throw Error('CLIENT_SCHEMA_CONFLICT');});"
newcode="""var current=sh.getRange(1,1,1,8).getValues()[0];
   // Native Tables generate Column 7/8 when extending a six-column CLIENT table.
   // Accept only those exact placeholders while original A:F and new metadata remain untouched.
   var rows=Math.max(s.before.length,sh.getLastRow()-1),autoHeaders=req.snap.steps.headers==='ARMED'&&
    (!s.before.length||JSON.stringify(sh.getRange(2,1,s.before.length,6).getValues())===JSON.stringify(s.before))&&
    (!rows||sh.getRange(2,7,rows,2).getValues().every(function(r){return r.every(function(v){return v==='';});})&&sh.getRange(2,7,rows,2).getFormulas().every(function(r){return r.every(function(v){return v==='';});}));
   current.forEach(function(v,i){if(v!==''&&v!==W2_CLIENT_HEADERS[i]&&!(i>=6&&autoHeaders&&v==='Column '+(i+1)))throw Error('CLIENT_SCHEMA_CONFLICT');});"""
assert s.count(oldcode)==1;s=s.replace(oldcode,newcode)
(out/'W2Clients.gs').write_text(s,encoding='utf-8',newline='\n')
s=(out/'ReleaseMigration.gs').read_text().replace('// v40:','// v41:').replace('version:40','version:41')
# Keep the original production request ID and its allocated identities/time.
assert 'prod-w1w2-schema-20261006-v40' in s
(out/'ReleaseMigration.gs').write_text(s,encoding='utf-8',newline='\n')
names=[n.replace('v40','v41') for n in old['hashes']]
hashes={n:hashlib.sha256((out/n).read_bytes()).hexdigest().upper() for n in names};fingerprint=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest().upper()
(p/'revision.json').write_text(json.dumps({'revision':'W3-PROD-20261006-01/v41@'+fingerprint,'base':old['revision'],'hashes':hashes},indent=2)+'\n',encoding='utf-8')
for name in ['release.test.cjs','regression.cjs']:
 src=(p/name).read_text();shutil.copy2(p/name,backup/name)
 (p/name).write_text(src.replace('Code_v40.gs','Code_v41.gs').replace('WebApp_v40.gs','WebApp_v41.gs'),encoding='utf-8',newline='\n')
log('FIX',old['revision'],fingerprint,'Guarded exact generated native-table placeholders only; fixed original migration ID; previous full pair archived/stubbed')
print('PASS v41 '+fingerprint)
