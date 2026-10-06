import base64,gzip,json,pathlib,csv,openpyxl
p=pathlib.Path(__file__).parent
b=openpyxl.load_workbook(p/'google-before.xlsx',data_only=False)
f=openpyxl.load_workbook(p/'google-final.xlsx',data_only=False)
v=openpyxl.load_workbook(p/'google-final.xlsx',data_only=True)
def rows(sh):
 return [tuple(('ARRAY_FORMULA',x.text,x.ref) if isinstance(x,openpyxl.worksheet.formula.ArrayFormula) else x for x in row) for row in sh.values]
def decode(s):
 return json.loads(gzip.decompress(base64.b64decode(s[5:]))) if s.startswith('GZIP:') else json.loads(s)
assert b.sheetnames==f.sheetnames
changed={'MAGAZINE','SALES','ORDERS','ORDER LINES','ORDER REQUESTS'}
for name in b.sheetnames:
 old=rows(b[name]);new=rows(f[name])
 assert (new[:len(old)] if name in changed else new)==old,(name,'original cells/formulas changed')
events=list(f['ORDER REQUESTS'].values)[1:];latest={}
assert len({r[0] for r in events})==len(events)
for r in events:
 assert all(r[i] is not None for i in [0,2,4,5,7,8])
 latest[r[2]]={'requestId':r[2],'action':r[4],'state':r[7],'attempt':r[3],'orderId':r[6] or '', 'snap':decode(r[8]),'result':decode(r[9]),'time':r[1]}
assert all(r['state']=='DONE' for r in latest.values()),[(k,r['state']) for k,r in latest.items() if r['state']!='DONE']
orders=list(v['ORDERS'].values)[1:];lines=list(v['ORDER LINES'].values)[1:]
sales=list(v['SALES'].values);head=sales[0];sc={h:i for i,h in enumerate(head)}
sale_rows=[r for r in sales[1:] if r[sc['Order Line ID']]]
assert len({r[sc['Order Line ID']] for r in sale_rows})==len(sale_rows)
mag=list(v['MAGAZINE'].values);mc={h:i for i,h in enumerate(mag[0])}
def check_order(req_id,status,count):
 req=latest[req_id];oid=req['orderId'];o=[r for r in orders if r[0]==oid];ls=[r for r in lines if r[0]==oid]
 assert len(o)==1 and o[0][1]==status and len(ls)==count and len({r[2] for r in ls})==count,(req_id,status)
 assert req['result']['count']==count
 if status=='SOLD':
  ss=[r for r in sale_rows if r[sc['Order ID']]==oid];assert len(ss)==count
  assert sum(r[sc['Shipping Cost']] for r in ss)==o[0][9]
  for l in ls:
   sr=[r for r in ss if r[sc['Order Line ID']]==l[1]];assert len(sr)==1
   sr=sr[0];assert sr[sc['Price']]==l[9] and sr[sc['Net Profit']]==l[9]-l[7]-sr[sc['Shipping Cost']]
   found=[r for r in mag[2:] if r[mc['Item UID']]==l[2]];assert len(found)==1 and found[0][mc['Status']]=='Sold'
  assert all(l[12]=='SOLD' for l in ls)
 elif status=='CANCELLED':assert all(l[12]=='RELEASED' for l in ls)
 return {'requestId':req_id,'orderId':oid,'status':status,'count':count,'attempt':req['attempt']}
checks=[check_order('v34-bulk-cancel-final-20261004','CANCELLED',100),check_order('v34-bulk-shopee-20261004','SOLD',100),check_order('v34-server-ledger-20261004','SOLD',1)]
assert latest['v34-server-intent-20261004']['attempt']==2
assert latest['v34-server-intent-20261004']['snap']['payload']['items'][0]['price']=='0400.00'
assert latest['v34-server-ledger-20261004']['attempt']==2
# Every new one-item UI order must reach its normal Cancel/Sold outcome.
fresh_orders=orders[b['ORDERS'].max_row-1:]
assert all(r[1] in ['CANCELLED','SOLD'] for r in fresh_orders)
assert len([r for r in fresh_orders if r[1]=='SOLD' and r[2]=='SHOP'])==1
assert len(sale_rows)==len([r for r in list(openpyxl.load_workbook(p/'google-before.xlsx',data_only=True)['SALES'].values)[1:] if r[sc['Order Line ID']]])+102
original08=[r for r in orders if r[0]=='OWA-20261004-08'];assert len(original08)==1 and original08[0][1]=='PENDING'
ls08=[r for r in lines if r[0]==original08[0][0]];assert len(ls08)==100 and all(l[12]=='RESERVED' for l in ls08)
for l in ls08:
 found=[r for r in mag[2:] if r[mc['Item UID']]==l[2]];assert len(found)==1 and found[0][mc['Status']]=='Hold'
out={'result':'PASS','revision':json.loads((p/'revision.json').read_text())['revision'],'checks':checks,'allRequestsDONE':True,'uniqueEventIDs':len(events),'uniqueSALES':len(sale_rows),'newSALES':102,'baselineAllTabsFormulasHistoryPreserved':True,'originalPending08Preserved':True,'lostClientExactPayloadRecovered':True,'nativeLedgerAfterEffectRecoveredWithoutDuplicate':True}
(p/'google-assertions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
with (p/'google-transactions.csv').open('w',newline='',encoding='utf8') as fp:
 writer=csv.DictWriter(fp,fieldnames=['time','requestId','action','state','attempt','orderId','diff','recovery']);writer.writeheader()
 for r in latest.values():
  if r['requestId'].startswith('v34-') or any(r['orderId']==o[0] for o in fresh_orders):writer.writerow({k:r[k] for k in ['time','requestId','action','state','attempt','orderId']}|{'diff':'diff/candidate-W1Orders.gs.diff','recovery':'same original ID/payload and allocated rows; google-before.xlsx/google-final.xlsx'})
print(json.dumps(out,ensure_ascii=False))
