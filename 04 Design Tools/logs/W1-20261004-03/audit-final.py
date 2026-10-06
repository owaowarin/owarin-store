import csv,json,pathlib,openpyxl
p=pathlib.Path(__file__).parent
b=openpyxl.load_workbook(p/'google-before.xlsx',data_only=True)
f=openpyxl.load_workbook(p/'google-final.xlsx',data_only=True)
fresh=list(f['ORDER REQUESTS'].values)[b['ORDER REQUESTS'].max_row:]
latest={r[2]:r for r in fresh}
records=[{'requestId':k,'action':r[4],'state':r[7],'attempt':r[3],'orderId':r[6] or '', 'timestamp':r[1],'diff':'diff/candidate-W1Orders.gs.diff; frozen full baseline W1-20261003-01','recovery':'original ID/payload; exported before/after; exact-before maintenance reconcile; no fresh fixture'} for k,r in latest.items()]
(p/'request-outcomes.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
with (p/'request-outcomes.csv').open('w',encoding='utf-8',newline='') as out:
 writer=csv.DictWriter(out,fieldnames=list(records[0]));writer.writeheader();writer.writerows(records)
bulk=[r for r in fresh if r[2]=='v33-bulk-create-20261004']
times={}
for r in bulk:
 key=str(int(r[3]));times.setdefault(key,{'firstEvent':r[1],'lastEvent':r[1],'lastState':r[7]});times[key].update(lastEvent=r[1],lastState=r[7])
(p/'bulk-attempts.json').write_text(json.dumps(times,indent=2),encoding='utf-8')
print(json.dumps({'newRequests':len(records),'bulkAttemptTimes':times},ensure_ascii=False))
