import sys,json,openpyxl
from pathlib import Path
p=Path(__file__).parent
name=sys.argv[1]
w=openpyxl.load_workbook(p/name,data_only=False)
cached=openpyxl.load_workbook(p/name,data_only=True)
def val(v):
 if hasattr(v,'text'): return {'formula':v.text,'ref':v.ref}
 if hasattr(v,'isoformat'): return v.isoformat()
 return v
out={'file':name,'tabs':{s.title:{'rows':s.max_row,'columns':s.max_column,'tables':list(s.tables)} for s in w}}
out['copies']=[{'row':r[0].row,'name':r[0].value,'status':r[1].value,'sku':r[9].value} for r in w['GAME GUIDE BOOKS'] if str(r[0].value).startswith('W1 QA')]
for tab in ['ORDERS','ORDER LINES','ORDER REQUESTS','SALES']:
 if tab in w:
  s=w[tab];out[tab]=[[val(c.value) for c in row] for row in s if any(c.value is not None for c in row)]
if 'SALES' in w:
 out['SALES_profit_cached']=[{'row':r[0].row,'order':r[0].value,'profit':r[6].value} for r in cached['SALES'] if r[0].value]
target=p/(name.replace('.xlsx','')+'-readback.json')
target.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:out[k] for k in ['file','tabs','copies']},ensure_ascii=False))
