import json,base64,zlib
from pathlib import Path
from openpyxl import load_workbook
p=Path(__file__).parent
w=load_workbook(p/'google-after-ui.xlsx',data_only=True)
orders=[list(r) for r in w['ORDERS'].values if r[0] in ['OWA-20261006-01','OWA-20261006-02']]
def decode(s):return json.loads(zlib.decompress(base64.b64decode(s[5:]),31).decode() if s.startswith('GZIP:') else s)
requests={}
for r in list(w['ORDER REQUESTS'].values)[1:]:
 if not r[0]:continue
 s=decode(r[8])
 if s.get('orderId') in ['OWA-20261006-01','OWA-20261006-02']:requests[r[2]]={'id':r[2],'action':r[4],'state':r[7],'snapshot':s}
print(json.dumps({'orders':orders,'requests':[{'id':r['id'],'action':r['action'],'state':r['state']} for r in requests.values()],'newClient':[list(r) for r in w['CLIENT'].values if 'ผู้ซื้อ W3 SHOPEE จำลอง' in r]},ensure_ascii=False,default=str))
(p/'ui-intent.json').write_text(json.dumps({'orders':orders,'requests':requests},ensure_ascii=False,default=str,indent=2)+'\n',encoding='utf-8')
