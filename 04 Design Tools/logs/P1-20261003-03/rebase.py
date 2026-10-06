from pathlib import Path
import difflib, hashlib, json

e=Path(__file__).resolve().parent
root=e.parents[2]
live=root/'03 Apps Script/Web App'
candidate=root/'04 Design Tools/logs/P1-20260929-01/candidate'
stage=e/'stage';stage.mkdir(exist_ok=True)
read=lambda p:p.read_text(encoding='utf-8')
def region(s,a,b):
    i=s.index(a);j=s.index(b,i+len(a));return s[i:j]
def replace(s,a,b,new):
    i=s.index(a);j=s.index(b,i+len(a));return s[:i]+new+s[j:]
code=read(live/'Code_v30.gs'); old=code; fixed=read(candidate/'Code.gs')
code=replace(code,'function addInventoryRow(data) {','// [J] regenerateAllSKUs',region(fixed,'function _addRequestSheet(ss) {','// [J] regenerateAllSKUs'))
code=replace(code,'function _setDerivedFormulasForRow(','function _fixDerivedFormulasForSheet(',region(fixed,'function _setDerivedFormulasForRow(','function _fixDerivedFormulasForSheet('))
code=code.replace('Code.gs v30 (SP-2 pricing/SKU engine, pairs with WebApp.gs v28)','Code.gs v31 (SP-2 pricing/SKU engine, pairs with WebApp.gs v31)',1)
code=code.replace('// v30 (2026-10-02):','// v31 (2026-10-03): durable Add journal, validated money/source/status, committed snapshot replay and formula readback.\n// v30 (2026-10-02):',1)
# Keep the reviewed behavior; use the project-required write wrapper for journal writes.
code=code.replace("  sh.getRange(eventRow, 1, 1, 17).setValues([[", "  if (!_tryWrite('Add journal ' + state, function () { sh.getRange(eventRow, 1, 1, 17).setValues([[",1)
code=code.replace("  ]]);\n  SpreadsheetApp.flush();\n  var check = sh.getRange(eventRow", "  ]]); })) throw new Error('ADD REQUESTS journal write failed: ' + state + _sp2WriteErrMsg());\n  SpreadsheetApp.flush();\n  var check = sh.getRange(eventRow",1)
code=code.replace("'P1 candidate'","'Code v31 / WebApp v31'")
web=read(live/'WebApp_v28.gs');oldweb=web;fixedweb=read(candidate/'webapp.gs')
web=replace(web,'// ── WRITE: ADD','// ── WRITE: UPDATE',region(fixedweb,'function _addNumber(','// ── WRITE: UPDATE'))
web=web.replace('    case "inventory.add":         return _apiInvAdd(p);','    case "inventory.add":         return _apiInvAdd(p);\n    case "inventory.addStatus":   return _apiInvAddStatus(p);',1)
web=web.replace('WebApp.gs v28 (SP-2, pairs with Code.gs v30)','WebApp.gs v31 (SP-2, pairs with Code.gs v31)',1)
web=web.replace('// v28:','// v31 (2026-10-03): validated Add payload and read-only same-ID recovery; pairs with Code.gs v31.\n// v28:',1)
html=read(candidate/'Index.html')
for name,text,prior in [('Code_v31.gs',code,old),('WebApp_v31.gs',web,oldweb),('Index.html',html,read(live/'Index.html'))]:
    (stage/name).write_text(text,encoding='utf-8',newline='\n')
    (e/(name+'.diff')).write_text(''.join(difflib.unified_diff(prior.splitlines(True),text.splitlines(True),fromfile=str(live/name),tofile=str(stage/name))),encoding='utf-8')
# Run the existing suites against the actual rebased source, retaining the original harness.
for test in ['p1-add.test.cjs','p1-ui.test.cjs']:
    text=read(root/'04 Design Tools/logs/P1-20260929-01'/test)
    if test=='p1-add.test.cjs':
        text=text.replace("path.join(__dirname, 'candidate')","path.join(__dirname, 'stage')").replace("['Code.gs', 'webapp.gs']","['Code_v31.gs', 'WebApp_v31.gs']").replace("read('Code.gs')","read('Code_v31.gs')").replace("read('webapp.gs')","read('WebApp_v31.gs')")
    else:text=text.replace("__dirname+'/candidate/Index.html'","__dirname+'/stage/Index.html'")
    (e/test).write_text(text,encoding='utf-8')
# Copies are test-only; they load new version names in the stage directory.
for name in ['Index.test.js','image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js','R2Upload.gs']:
    text=read(live/name).replace('Code_v30.gs','Code_v31.gs')
    (stage/name).write_text(text,encoding='utf-8')
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest().upper() for p in stage.iterdir() if p.suffix in ['.gs','.html']}
(e/'stage-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Prepared bounded v30→v31 rebase; Meta source retained outside Add/formula/version blocks; P1/Meta tests target stage')
