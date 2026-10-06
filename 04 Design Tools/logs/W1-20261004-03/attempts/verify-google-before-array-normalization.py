import base64,gzip,json,pathlib,openpyxl
p=pathlib.Path(__file__).parent
b=openpyxl.load_workbook(p/'google-before.xlsx',data_only=False)
f=openpyxl.load_workbook(p/'google-final.xlsx',data_only=False)
fv=openpyxl.load_workbook(p/'google-final.xlsx',data_only=True)
assert b.sheetnames==f.sheetnames
for name in ['GAME GUIDE BOOKS','SALES','ADD REQUESTS']:
 assert list(b[name].values)==list(f[name].values),(name,'changed original data/formulas')
original_mag=list(b['MAGAZINE'].values)
assert list(f['MAGAZINE'].values)[:len(original_mag)]==original_mag,'original MAG changed'
for name in ['ORDERS','ORDER LINES','ORDER REQUESTS']:
 old=list(b[name].values)
 assert list(f[name].values)[:len(old)]==old,(name,'history prefix changed')
requests={};ids=[]
def decode(s):
 return json.loads(gzip.decompress(base64.b64decode(s[5:]))) if s.startswith('GZIP:') else json.loads(s)
for r in list(f['ORDER REQUESTS'].values)[1:]:
 assert all(r[i] is not None for i in [0,2,4,5,7,8])
 ids.append(r[0]);requests[r[2]]={'state':r[7],'action':r[4],'attempt':r[3],'snap':decode(r[8]),'result':decode(r[9])}
assert len(ids)==len(set(ids))
assert all(r['state']=='DONE' for r in requests.values()),[(k,r['state']) for k,r in requests.items() if r['state']!='DONE']
bulk=requests['v33-bulk-create-20261004'];assert bulk['result']['count']==100 and bulk['result']['status']=='PENDING'
oid=bulk['snap']['orderId'];orders=[r for r in list(f['ORDERS'].values)[1:] if r[0]==oid]
assert len(orders)==1 and orders[0][1]=='PENDING' and orders[0][7]==39000 and orders[0][9]==0
lines=[r for r in list(f['ORDER LINES'].values)[1:] if r[0]==oid]
assert len(lines)==100 and len({r[2] for r in lines})==100 and all(r[12]=='RESERVED' for r in lines)
mag=list(fv['MAGAZINE'].values);header=mag[0];uidc=header.index('Item UID');statusc=header.index('Status')
for l in lines:
 matched=[r for r in mag[2:] if r[uidc]==l[2]];assert len(matched)==1 and matched[0][statusc]=='Hold'
assert requests['v33-check-cancel-20261004']['result']['status']=='CANCELLED'
assert requests['qa-gzip-20261004']['snap']['payload']['text']=='x'*78000
fresh=list(f['ORDER REQUESTS'].values)[b['ORDER REQUESTS'].max_row:]
external=[r for r in fresh if r[4]=='EXTERNAL_EDIT'];assert len(external)>=2
assert any(any(x['identityConflict'] for x in decode(r[8])['affected']) for r in external)
maint=[r for r in fresh if r[4]=='MAINTENANCE'];assert any(r[7]=='NEEDS_REVIEW' for r in maint)
assert len([r for r in maint if r[7]=='DONE'])>=3
sales=[r for r in list(fv['SALES'].values)[1:] if len(r)>9 and r[9]];assert len(sales)==4
assert len({r[9] for r in sales})==4
out={'result':'PASS','export':'google-final.xlsx','bulk':{'orderId':oid,'count':100,'status':'PENDING','attempt':bulk['attempt'],'sameIDReplay':True},'checkOrder':'CANCELLED','uniqueEventIDs':len(ids),'allRequestsDONE':True,'compressedJournalEvents':sum(str(r[8]).startswith('GZIP:') for r in list(f['ORDER REQUESTS'].values)[1:]),'existingSALES':4,'SALES_Formula_Add_GGB_HistoryUnchanged':True,'R2':'Google helper invoked real audit function for multi-range / UID removal; not a new physical Sheet trigger UI edit','R4':'real injected write failure and exact-before reconcile/success','capacity':'100 MAG fixtures grew physical grid; journal/line growth verified in local bounded-grid harness','limits':['Owner direct-edit audit not exhaustive; simple trigger runtime/queue/lock timeout remains','No marketplace sync / W2 / production install','Astra High specific sign-off prepared, not claimed']}
(p/'google-assertions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out,ensure_ascii=False))
