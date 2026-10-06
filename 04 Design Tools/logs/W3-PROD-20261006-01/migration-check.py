import csv,json,hashlib,shutil,base64,gzip
from datetime import datetime
from pathlib import Path
from openpyxl import load_workbook
p=Path(__file__).parent
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),'W3-PROD-20261006-01',a,b,c,d])
src=Path('C:/Users/JIN/AppData/Local/Temp/browser-use/exports/OWARIN STORE-3fd317dd-e346-4b72-b1e7-104db458f26d.xlsx');target=p/'shop-migrated.xlsx'
if not target.exists():
 log('COPY-DRYRUN',str(src),'ABSENT','Fresh production migrated export');shutil.copy2(src,target)
else:assert target.read_bytes()==src.read_bytes()
before=load_workbook(p/'shop-pre-migration.xlsx');after=load_workbook(target);failed=load_workbook(p/'shop-migration-failed.xlsx')
def value(c):
 v=c.value;return (c.data_type,v.text if hasattr(v,'text') else v)
differences=[]
lastcols={n:max(c for (r,c),cell in before[n]._cells.items() if r==1 and cell.value is not None) for n in ['SALES','GAME GUIDE BOOKS','MAGAZINE']}
for name in before.sheetnames:
 a,b=before[name],after[name]
 for r,c in set(a._cells)|set(b._cells):
  if name=='CLIENT' and c>6:continue
  if name in lastcols and r==1 and c==lastcols[name]+1:continue
  if value(a.cell(r,c))!=value(b.cell(r,c)):differences.append({'sheet':name,'cell':a.cell(r,c).coordinate})
assert not differences,differences[:10]
assert set(after.sheetnames)-set(before.sheetnames)=={'ORDERS','ORDER LINES','ORDER REQUESTS'}
for name,header in [('SALES','Order Line ID'),('GAME GUIDE BOOKS','Item UID'),('MAGAZINE','Item UID')]:
 a,b=before[name],after[name];assert b.cell(1,lastcols[name]+1).value==header
 assert all(b.cell(r,lastcols[name]+1).value is None for r in range(2,b.max_row+1))
assert [c.value for c in after['CLIENT'][1]][6:]==['Client ID','Updated At']
j=failed['ORDER REQUESTS'];encoded=j.cell(j.max_row,9).value
snapshot=json.loads(gzip.decompress(base64.b64decode(encoded[5:])).decode() if encoded.startswith('GZIP:') else encoded)
ids=snapshot['ids'];time=snapshot['time'];assert len(ids)==6
for i,id in enumerate(ids,2):assert [after['CLIENT'].cell(i,7).value,after['CLIENT'].cell(i,8).value]==([id,time] if id else [None,None])
assert all(after['CLIENT'].cell(i,c).value is None for i in range(len(ids)+2,after['CLIENT'].max_row+1) for c in [7,8])
assert len(set(ids))==6
request=after['ORDER REQUESTS'];assert request.cell(request.max_row,8).value=='DONE';assert request.cell(request.max_row,3).value=='prod-w1w2-schema-20261006-v40';assert request.cell(request.max_row,4).value==2
for row in range(1,j.max_row+1):assert [value(c) for c in j[row]]==[value(c) for c in request[row]]
for name in ['ORDERS','ORDER LINES']:assert after[name].max_row==1
out={'result':'PASS','oldTabs':len(before.sheetnames),'newTabs':len(after.sheetnames),'oldStoredCellsUnchanged':True,'CLIENToriginalAFUnchanged':True,'allocatedClientIDsPreservedFromFailedAttempt':len(ids),'requestId':'prod-w1w2-schema-20261006-v40','attempt':2,'finalState':'DONE','orders':0,'lines':0,'events':request.max_row-1,'workbookSha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(p/'migration-verification.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');log('MIGRATION-VERIFY','v40 partial request',out['finalState'],'Same allocated6IDs; attempt2; original22tabs cells/formulas unchanged except exact metadata; no order/sale/stock writes')
print(json.dumps(out))
