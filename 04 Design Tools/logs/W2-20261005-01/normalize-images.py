from pathlib import Path
from PIL import Image
import shutil, json
p=Path(__file__).parent
b=p/'before-close'
b.mkdir(exist_ok=True)
out=[]
for name in ['local-ui.png','google-ui.png','google-print.png']:
    f=p/name
    im=Image.open(f)
    if im.format!='PNG':
        backup=b/(name+'.original.jpg')
        if not backup.exists(): shutil.copy2(f,backup)
        im.save(f,format='PNG')
    check=Image.open(f)
    assert check.format=='PNG'
    check.verify()
    out.append({'file':name,'pixels':im.size,'bytes':f.stat().st_size})
(p/'image-verification.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
