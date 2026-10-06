import json,csv,hashlib
from pathlib import Path
e=Path(__file__).resolve().parent;root=e.parents[2];live=root/'03 Apps Script/Web App'
manifest=json.loads((e/'manifest.json').read_text(encoding='utf-8'))
for name,expected in manifest.items():
    p=root/name
    assert p.stat().st_size==expected['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest().upper()==expected['sha256'],name
for name in ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs']:
    assert (live/name).read_bytes()==(e/'stage'/name).read_bytes(),name
for name in ['Code_v30.gs','WebApp_v28.gs']:
    assert (live/'backup'/(name[:-3]+'_superseded_2026-10-03.gs')).read_bytes()==(e/'before'/name).read_bytes()
    assert 'SUPERSEDED' in (live/name).read_text(encoding='utf-8')
for name in ['HANDOFF_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md']:
    assert (root/'00 Docs'/name).read_bytes().startswith((e/'before'/name).read_bytes()),name
state=(root/'00 Docs/STATE.md').read_text(encoding='utf-8');prior=(e/'before/STATE.md').read_text(encoding='utf-8')
assert len(state.splitlines())<=80
assert state[state.index('### 2.'):state.index('## Housekeeping')]==prior[prior.index('### 2.'):prior.index('## Housekeeping')]
with (e/'changes.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
assert len(rows)==14 and len({r['event_id'] for r in rows})==14
assert all(r['request_id'] and r['recovery_ref'] for r in rows)
r=json.loads((e/'source-readback.json').read_text(encoding='utf-8'))
assert r['deployment']['before_version']==3 and r['deployment']['after_version']==4 and r['deployment']['access']=='Only myself'
assert '17 original tabs and 195246 values/formulas unchanged' in (e/'shop-readback-output.txt').read_text(encoding='utf-8-sig')
assert 'P1 Add LIVE' in state
print(f'PASS: {len(manifest)} exact file sizes/hashes; installed staged source mirrors; previous pair backups/stubs; historical prefixes; other STATE streams unchanged; <=80lines; 14 complete audit events; deployment4/rollback3; production content readback')
