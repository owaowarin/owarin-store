from pathlib import Path
import json, shutil, datetime
import openpyxl
p=Path(__file__).parent
source=Path(r'C:\Users\JIN\AppData\Local\Temp\browser-use\exports\OWARIN STORE — P1 Add isolated synthetic test — 2026-09-29-d6461293-5153-4220-b7f7-f99029c7450d.xlsx')
shutil.copy2(source,p/'test-after-source-save.xlsx')
before=openpyxl.load_workbook(p/'test-before/sheet.xlsx',data_only=False)
after=openpyxl.load_workbook(p/'test-after-source-save.xlsx',data_only=False)
def normalize(v):
 if hasattr(v,'text'): return {'formula':v.text,'ref':v.ref}
 if hasattr(v,'isoformat'): return v.isoformat()
 return v
def cells(w):
 return {s.title:{c.coordinate:normalize(c.value) for row in s for c in row if c.value is not None} for s in w}
a,b=cells(before),cells(after)
assert a==b, 'Test Sheet data/formula changed: reconcile before proceeding'
out={'result':'PASS test data and formulas identical before/after source saves; fixture not executed','tabs':list(b),'ordersSchemaInstalled':False,'source':str(source)}
(p/'test-data-readback.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False))
