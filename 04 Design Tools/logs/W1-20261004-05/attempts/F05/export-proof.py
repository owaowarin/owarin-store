import pathlib,json,openpyxl
p=pathlib.Path(__file__).parent
w=openpyxl.load_workbook(p/'google-ledger-error.xlsx',data_only=True)
r=[[x if x is not None else '' for x in row] for row in w['ORDER REQUESTS'].values][1:]
while r and all(x=='' for x in r[-1]):r.pop()
(p/'journal-proof.json').write_text(json.dumps(r,ensure_ascii=False),encoding='utf8')
print('Saved exact logical journal matrix proof; rows',len(r),'fully blank',sum(all(x=='' for x in row) for row in r))
print('Cells at XLSX32767 boundary:',[(i+2,j+1,row[2]) for i,row in enumerate(r) for j,x in enumerate(row) if isinstance(x,str) and len(x)==32767])
