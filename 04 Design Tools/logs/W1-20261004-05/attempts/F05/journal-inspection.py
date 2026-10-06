import pathlib,openpyxl,json
p=pathlib.Path(__file__).parent
w=openpyxl.load_workbook(p/'google-ledger-error.xlsx',data_only=True)
rows=list(w['ORDER REQUESTS'].values)
bad=[];latest={}
for n,r in enumerate(rows[1:],2):
 if any(not r[i] for i in [0,2,4,5,7,8]):bad.append({'row':n,'missing':[i+1 for i in [0,2,4,5,7,8] if not r[i]],'id':r[2],'state':r[7],'lengths':[len(str(v)) if v is not None else 0 for v in r]})
 if r[2]:latest[r[2]]={'row':n,'id':r[2],'action':r[4],'state':r[7],'attempt':r[3],'order':r[6],'error':r[10]}
out={'bad':bad,'latest':list(latest.values())[-10:],'orders':list(w['ORDERS'].values)[-6:],'salesLast':list(w['SALES'].values)[-3:]}
(p/'inspection.json').write_text(json.dumps(out,default=str,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'badRows':len(bad),'blankRows':sum(all(n==0 for n in r['lengths']) for r in bad),'ledgerEvents':[{'row':n,'time':r[1],'attempt':r[3],'state':r[7],'error':r[10],'version':r[13]} for n,r in enumerate(rows[1:],2) if r[2]=='v34-server-ledger-20261004']},default=str,ensure_ascii=False))
