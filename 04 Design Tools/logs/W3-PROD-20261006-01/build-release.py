import csv,hashlib,json
from datetime import datetime
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2];frozen=p.parent/'W2-20261005-01';out=p/'candidate'
def log(action,before,after,detail):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),'W3-PROD-20261006-01',action,before,after,detail])
def swap(s,a,b):
 assert s.count(a)==1,(a,s.count(a))
 return s.replace(a,b)
assert not out.exists()
rev=json.loads((frozen/'revision.json').read_text(encoding='utf-8'))
files={}
for n,h in rev['hashes'].items():
 s=(frozen/'candidate'/n).read_text(encoding='utf-8');assert hashlib.sha256(s.encode()).hexdigest().upper()==h
 files[n.replace('v39','v40')]=s
log('BUILD-DRYRUN',rev['revision'],'candidate v40','Preserve frozen v39; production rebasing and owner-only schema entrypoints; no QA source')
s=files['Code_v40.gs'].replace('Code.gs v39','Code.gs v40').replace('WebApp.gs v39','WebApp.gs v40')
s=swap(s,'var ALBUM_SHEET   = "ALBUM CAPTION";','var ALBUM_SHEET   = "FB ALBUM CAPTION"; // Preserve fresh production v32 tab name.')
s=swap(s,'    .addSubMenu(ui.createMenu("Labels")','    .addSubMenu(fbaMenu_(ui)) // Preserve fresh production v32 FB Album menu.\n    .addSubMenu(ui.createMenu("Labels")')
files['Code_v40.gs']=s
files['WebApp_v40.gs']=files['WebApp_v40.gs'].replace('WebApp.gs v39','WebApp.gs v40').replace('Code.gs v39','Code.gs v40')
s=files['W1Orders.gs'].replace('W1 v39 local/test candidate','W1 v40 production release').replace('Code v39 / WebApp v39','Code v40 / WebApp v40')
s=swap(s," if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw new Error('TEST_SHEET_ONLY');"," if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw new Error('TEST_SHEET_ONLY');\n return _w1SchemaDryRun_();\n}\nfunction _w1SchemaDryRun_(){\n var ss=SpreadsheetApp.getActiveSpreadsheet(),out={sheetId:ss.getId(),changes:[]};")
s=swap(s,"else _w1Table_(n);","else if(!ss.getSheetByName(n).getLastRow())out.changes.push('Initialize empty '+n);else _w1Table_(n);")
s=swap(s," _w1Access_();return _withLock(function(){var dry=w1SchemaDryRun(),ss=SpreadsheetApp.getActiveSpreadsheet();"," _w1Access_();w1SchemaDryRun();return _w1PrepareSchema_();\n}\nfunction _w1PrepareSchema_(){\n return _withLock(function(){var dry=_w1SchemaDryRun_(),ss=SpreadsheetApp.getActiveSpreadsheet();")
s=swap(s,"if(!ss.getSheetByName(n)){var sh=ss.insertSheet(n);_w1Write_", "if(!ss.getSheetByName(n)||!ss.getSheetByName(n).getLastRow()){var sh=ss.getSheetByName(n)||ss.insertSheet(n);_w1Write_")
files['W1Orders.gs']=s
s=files['W2Clients.gs'].replace('v39','v40')
s=swap(s," _w1Access_();var ss=SpreadsheetApp.getActiveSpreadsheet();if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw Error('TEST_SHEET_ONLY');var sh=ss.getSheetByName('CLIENT');"," _w1Access_();var ss=SpreadsheetApp.getActiveSpreadsheet();if(ss.getId()!=='13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM')throw Error('TEST_SHEET_ONLY');return _w2SchemaDryRun_();\n}\nfunction _w2SchemaDryRun_(){\n var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENT');")
s=swap(s," _w1Access_();var dry=w2SchemaDryRun(),prior=_w1Requests_()['qa-w2-client-schema-20261005'];", " _w1Access_();return _w2PrepareSchema_(w2SchemaDryRun(),'qa-w2-client-schema-20261005');\n}\nfunction _w2PrepareSchema_(dry,id){\n var prior=_w1Requests_()[id];")
s=swap(s,"{requestId:'qa-w2-client-schema-20261005'}","{requestId:id}")
s=swap(s,"var s=req.snap;_w1Step_(req,'headers',function(){", "var s=req.snap;_w1Step_(req,'headers',function(){if(sh.getMaxColumns()<8)_w1Write_('CLIENT capacity',function(){sh.insertColumnsAfter(sh.getMaxColumns(),8-sh.getMaxColumns());});")
files['W2Clients.gs']=s
prod='1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp'
files['Index.html']=swap(files['Index.html'],"owarin.w1.pending.TEST_OR_PROJECT.v32","owarin.w1.pending."+prod+".v40")
files['LabelDialog.html']=swap(files['LabelDialog.html'],'1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd',prod)
files['ReleaseMigration.gs']='''// v40: owner-only, exact production Sheet; no sale, stock or external service call.
function _prodReleaseAccess_(){
 _w1Access_();if(SpreadsheetApp.getActiveSpreadsheet().getId()!=='16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0')throw Error('PRODUCTION_SHEET_ONLY');
 _addRequestSheet(SpreadsheetApp.getActiveSpreadsheet());
}
function prodReleaseDryRun(){
 _prodReleaseAccess_();_getSheetOrThrow('CLIENT');var result={version:40,w1:_w1SchemaDryRun_(),w2:_w2SchemaDryRun_()};Logger.log(JSON.stringify(result));return result;
}
function prodReleaseMigrate(){
 _prodReleaseAccess_();prodReleaseDryRun();_w1PrepareSchema_();var result=_w2PrepareSchema_(_w2SchemaDryRun_(),'prod-w1w2-schema-20261006-v40');Logger.log(JSON.stringify(result));return result;
}
function prodReleaseReadiness(){
 _prodReleaseAccess_();Object.keys(W1_HEADERS).forEach(_w1Table_);_w1TechnicalGate_('');var rows=_w2ClientRows_(),result={version:40,schema:'READY',clients:rows.filter(function(r){return r[6];}).length,orders:_w1Rows_('ORDERS').length,lines:_w1Rows_('ORDER LINES').length,requests:_w1Rows_('ORDER REQUESTS').length};Logger.log(JSON.stringify(result));return result;
}
'''
# Require the existing durable Add journal without reinitializing P1.
assert 'function _addRequestSheet' in files['Code_v40.gs']
out.mkdir()
hashes={}
for n,s in files.items():
 (out/n).write_text(s,encoding='utf-8',newline='\n');hashes[n]=hashlib.sha256(s.encode()).hexdigest().upper()
aggregate=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest().upper()
(p/'revision.json').write_text(json.dumps({'revision':'W3-PROD-20261006-01/v40@'+aggregate,'base':rev['revision'],'hashes':hashes},indent=2)+'\n',encoding='utf-8')
log('BUILD',rev['revision'],aggregate,'10 files; preserve FB Album tab/menu; private shared schema helpers; guarded prod migration; project-scoped request storage')
print('PASS v40 candidate '+aggregate)
