import base64,hashlib,json,zlib
from datetime import datetime
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.worksheet.formula import ArrayFormula

p=Path(__file__).parent
base=p.parent/'W2-20261005-01'
revision=json.loads((base/'revision.json').read_text())
sha=lambda f:hashlib.sha256(f.read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest().upper()
for name,h in revision['hashes'].items(): assert sha(base/'candidate'/name)==h,name
sources=list((base/'test-runtime').iterdir())
for f in sources: assert sha(f)==sha(base/'google-source-readback'/f.name),f.name
assert sha(base/'google-source-before/appsscript.json')==sha(base/'google-source-readback/appsscript.json')
local=json.loads((p/'migration-results.json').read_text())
assert local['result']=='PASS' and len(local['checks'])==13
def cells(f):
    w=load_workbook(f,data_only=False)
    out={}
    for sh in w:
        rows=[[{'formula':v.text,'ref':v.ref} if isinstance(v,ArrayFormula) else v for v in r] for r in sh.values]
        while rows and not any(v is not None for v in rows[-1]): rows.pop()
        for row in rows:
            while row and row[-1] is None: row.pop()
        out[sh.title]=rows
    return out
fresh=p/'google-before-replay.xlsx'
old,current=cells(base/'google-final.xlsx'),cells(fresh)
assert set(old)==set(current)
for name in set(old)-{'ORDERS','ORDER REQUESTS'}: assert old[name]==current[name],name
orders=json.loads(json.dumps(old['ORDERS']))
assert orders[18][0]=='OWA-20261005-05' and orders[18][12]==3
orders[18][12]=4;orders[18][13]='w1-1791222331322-mxgbvwmbbv'
assert current['ORDERS']==orders,'Unreconciled order delta'
assert current['ORDER REQUESTS'][:len(old['ORDER REQUESTS'])]==old['ORDER REQUESTS'],'Journal prefix changed'
added=current['ORDER REQUESTS'][len(old['ORDER REQUESTS']):]
assert len(added)==5 and [r[7] for r in added]==['PREPARED','APPLYING','APPLYING','APPLYING','DONE']
def decode(s): return json.loads(zlib.decompress(base64.b64decode(s[5:]),31).decode() if s.startswith('GZIP:') else s)
snapshots=[decode(r[8]) for r in added]
for row,s in zip(added,snapshots):
    assert row[2]=='w1-1791222331322-mxgbvwmbbv' and row[4]=='labels.save' and row[6]=='OWA-20261005-05'
    assert s['before']==old['ORDERS'][18] and s['after']==current['ORDERS'][18]
    assert s['clientChoice']['mode']=='order' and s['payload']['expectedRevision']==3
    assert s['payload']['recipient']==json.loads(old['ORDERS'][18][11])
    assert s['payload']==snapshots[0]['payload']
assert decode(added[-1][9])['revision']==4
result={'result':'PASS','verifiedAt':datetime.now().astimezone().isoformat(timespec='seconds'),'revision':revision['revision'],'candidateFilesUnchanged':len(revision['hashes']),'recordedSourceReadbacksUnchanged':len(sources),'localChecks':len(local['checks']),'freshIsolatedExport':{'file':fresh.name,'bytes':fresh.stat().st_size,'sha256':hashlib.sha256(fresh.read_bytes()).hexdigest(),'sevenOtherSheetsUnchanged':True,'oldJournalPrefixPreserved':True,'priorSessionDeltaReconciled':{'requestId':added[0][2],'action':'labels.save','addedEvents':5,'orderRevision':'3 -> 4','allOtherOrderFieldsUnchanged':True,'noSalesStockClientChange':True,'originalIntentMatchesObservedBeforeAfter':True}},'nativeLegacySixColumnMigration':'NOT_TESTED','pdfPhysicalPrint':'DEFERRED_UNTESTED_NOT_PASS','productionChanged':False}
if (p/'google-after-replay.xlsx').exists():
    after=p/'google-after-replay.xlsx'
    assert cells(after)==cells(fresh),'Replay changed workbook values/formulas'
    result['afterReplayExport']={'file':after.name,'bytes':after.stat().st_size,'sha256':hashlib.sha256(after.read_bytes()).hexdigest(),'allSheetValuesFormulasUnchanged':True}
if (p/'native-replay-summary.json').exists():
    native=json.loads((p/'native-replay-summary.json').read_text())
    assert native['result']=='PASS' and native['beforeAfterNativeProofEqual'] and native['replays']==7 and native['allReplayed']
    result['freshNativeReplay']=native
(p/'verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
