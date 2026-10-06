"""Read-only integrity checks for the Session35 documentation package."""
from pathlib import Path
import csv, hashlib, json, re
from urllib.parse import unquote

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
m=json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
def sha(b): return hashlib.sha256(b).hexdigest()
for name, entry in m['files'].items():
    current=(ROOT/name).read_bytes()
    assert sha(current)==entry['after_sha256'], ('changed after commit',name)
    assert sha((HERE/entry['backup']).read_bytes())==entry['before_sha256'], ('backup',name)
    assert current.decode('utf-8-sig').find('\ufffd') < 0, ('encoding',name)
    assert (HERE/entry['diff']).stat().st_size > 0, ('missing diff',name)
print('PASS: 12 document readbacks, backup hashes, nonempty diffs and UTF-8')

for name, expected in m['source_unchanged'].items():
    assert sha((ROOT/name).read_bytes())==expected, ('source changed',name)
expected_lf={
 'Code_v31.gs':'6ef098cd39f5b82f888d60a41577c71ecd3c81c26d4e4604e41eefb27e87cd5d',
 'WebApp_v31.gs':'7102cc7fa4735f5859b7e8f11092b0cadc2bf155e5d204658949a11696ace67d',
 'Index.html':'5ece912bc9ae2f7d7fbb9662c2e417b125f78930c68c0d9a03619de44eb69aeb',
 'P1Journal.gs':'fdf4b656488ea92db4ccb50b573ac75bfd8aa27c91769b425e03ff06509890bf'}
for name, expected in expected_lf.items():
    assert sha((ROOT/'03 Apps Script/Web App'/name).read_bytes().replace(b'\r\n',b'\n'))==expected, name
print('PASS: all four local application files unchanged and match Session34 LF hashes')

for name in ['00 Docs/HANDOFF_2026-09-28.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','04 Design Tools/logs/decisions_20261003.csv']:
    assert (ROOT/name).read_bytes().startswith((HERE/'before'/name).read_bytes()), ('history prefix',name)
print('PASS: historical HANDOFF, Implementation log and decisions byte prefixes preserved')

plan_name='00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
plan=(ROOT/plan_name).read_text(encoding='utf-8')
old_plan=(HERE/'before'/plan_name).read_text(encoding='utf-8')
assert set(re.findall(r'\| (R\d{2}) \|',plan))==set(re.findall(r'\| (R\d{2}) \|',old_plan))=={'R%02d'%i for i in range(1,15)}
assert set(re.findall(r'\| (QA-[A-L]) ',plan))=={'QA-'+c for c in 'ABCDEFGHIJKL'}
assert 'Shipping Subsidy' in plan and 'Subtotal, Customer Shipping, Carrier Expense' not in plan
for old in ['P1–P6 ยังไม่เริ่ม','snapshot 10 ก.ย. ทับ v27','README ระบุ `Code_v27.gs + WebApp_v25.gs`']:
    assert old not in plan, old
for key in ['W1.1','W1.2','W1.3','W2','W3','R1–R4','first real production Add/DONE','QA-L','ARRAYFORMULA','two']:
    if key!='two': assert key in plan, key
book=(ROOT/'00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md').read_text(encoding='utf-8')
assert 'เริ่ม P0 แบบ read-only' not in book
assert 'filter AUDIT LOG →' not in book
assert 'NOT_FOUND' in book and 'manual recovery' in book and 'provenance' in book
print('PASS: all R01-R14 and QA-A-L retained; active baseline/recovery/priority contradictions removed')

state=(ROOT/'00 Docs/STATE.md').read_text(encoding='utf-8')
old_state=(HERE/'before/00 Docs/STATE.md').read_text(encoding='utf-8')
assert len(state.splitlines())<=80
assert state.split('### 2.')[1].split('## Environment')[0]==old_state.split('### 2.')[1].split('## Environment')[0]
assert state.count('Next ONE step:')==1
assert 'master §5.2.1' in (ROOT/'AGENTS.md').read_text(encoding='utf-8')
assert 'master §5.2.1' in (ROOT/'CLAUDE.md').read_text(encoding='utf-8')
master=(ROOT/'OWARI-MASTER-CONTEXT_EN_2026-09-13.md').read_text(encoding='utf-8')
rules=master.split('### 5.2.1')[1].split('### 5.3')[0]
assert len(re.findall(r'^\d\. ',rules,re.M))==6
print('PASS: STATE 44 lines, other streams unchanged, one next step and six canonical priorities linked')

for name in [plan_name,'00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/ORDERS-CRM-LABEL-DESIGN.md']:
    for link in re.findall(r'\]\(([^)]+)\)',(ROOT/name).read_text(encoding='utf-8')):
        if re.match(r'^[a-z]+://',link) or link.startswith('#'): continue
        assert ((ROOT/name).parent/unquote(link.split('#')[0])).exists(), (name,link)
readme=(ROOT/'03 Apps Script/Web App/README.md').read_text(encoding='utf-8')
for filename in ['PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md']:
    assert (ROOT/'00 Docs'/filename).exists() and filename in readme
with (HERE/'changes.csv').open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
assert sum(r['event']=='COMMIT' for r in rows)==12
assert sum(r['event']=='DRY_RUN' for r in rows)==12
assert all(r['change_id']=='PLAN-20261003-01' and r['request_id']=='PLAN-REMAINING-EFFICIENCY-001' and r['recovery'] for r in rows)
print('PASS: active document links, per-file dry-run/commit logs, Change/Request IDs and recovery references')
print('NOT RUN: app suites, live Google checks, business transactions or physical printing (documentation-only scope)')
