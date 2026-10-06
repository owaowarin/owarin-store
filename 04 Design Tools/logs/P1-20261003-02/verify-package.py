import csv
import hashlib
import json
from pathlib import Path

e = Path(__file__).resolve().parent
root = e.parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest().upper()

for name, expected in {
    'candidate/Code.gs':'695A2EAA4FB90F1B5AB3272574046ABA632DC1F2B88790651ECBBC8F4C10593B',
    'candidate/webapp.gs':'6168CEA9DE2B8FDC8451707A6295194932773350DEB974D2E6CEF095481947A2',
    'candidate/Index.html':'F87ADF6B67B0BFC14AC7D55672007FFA5CF01BD6386B042F3214910E6833224B',
    'p1-add.test.cjs':'C98E4A6410B52AF25515135C0C971B53BBA58C85BC1F8AC01ECE43A2F28BEA6C',
    'p1-ui.test.cjs':'F84DDA2C43D04E64816DB05DB9F20709AC3C94AA0FFB8AAAAE60A1EC1DF17F39',
}.items():
    assert sha(e/'baseline'/name)==expected, name

manifest=json.loads((e/'manifest.json').read_text(encoding='utf-8'))
for name, expected in manifest.items():
    p=root/name
    assert p.stat().st_size==expected['bytes'] and sha(p)==expected['sha256'], name

for backup,target in [('handoff-history.md','HANDOFF_2026-09-28.md'),('implementation.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md')]:
    assert (root/'00 Docs'/target).read_bytes().startswith((e/'before'/backup).read_bytes())
state=(root/'00 Docs/STATE.md').read_text(encoding='utf-8')
prior=(e/'before/STATE.md').read_text(encoding='utf-8')
assert len(state.splitlines())<=80
assert state[state.index('### 2.'):state.index('## Housekeeping')]==prior[prior.index('### 2.'):prior.index('## Housekeeping')]
with (e/'changes.csv').open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
assert len(rows)==16 and len({r['event_id'] for r in rows})==16
assert all(r['change_id']=='P1-20261003-02' and r['request_id'] and r['recovery_ref'] for r in rows)
readback=json.loads((e/'source-readback.json').read_text(encoding='utf-8'))
assert readback['saved_to_drive_observed'] and readback['temporary_helper_absent']
for name,expected in readback['sha256_normalized_lf'].items():
    text=(e/'test-runtime-source'/name).read_text(encoding='utf-8')
    assert hashlib.sha256(text.encode()).hexdigest().upper()==expected
    assert 'function p1ReviewQa20261003' not in text
assert 'PASS ALL' in (e/'runtime-output.txt').read_text(encoding='utf-8')
assert '158 added cells only' in (e/'live-qa-output.txt').read_text(encoding='utf-8-sig')
print(f'PASS: {len(manifest)} exact artifact hashes/sizes; frozen submitted revision; historical prefixes; other STATE streams unchanged; STATE <=80 lines; 16 CSV events; helper-free saved-source hashes; isolated export result')
