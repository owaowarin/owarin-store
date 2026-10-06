from pathlib import Path
import csv
import hashlib
import json

here = Path(__file__).resolve().parent
root = here.parents[2]
digest = lambda data: hashlib.sha256(data).hexdigest().upper()
manifest = {}
expected = {
    'Code.gs': 'C977093F40C6D2244B12C730D2F298310BCD0014DD49C051328A4CB92C46A8F5',
    'webapp.gs': '5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257',
    'Index.html': '2F15FBBFC58B9CFEF01DB45389764A2F08ECFC573837D78B44586201725830F6',
}
for name, sha in expected.items():
    snapshot = (here / 'baseline/candidate' / name).read_bytes()
    current = (here.parent / 'P1-20260929-01/candidate' / name).read_bytes()
    assert current == snapshot and digest(current) == sha
    manifest[f'baseline/candidate/{name}'] = sha
for name, backup, followup in [
    ('IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md', 'implementation-before.md', 'followup-implementation.md'),
    ('HANDOFF_2026-09-28.md', 'handoff-before.md', 'followup-handoff.md'),
]:
    path = root / '00 Docs' / name
    before = (here / backup).read_bytes()
    after = before + (here / followup).read_bytes()
    found = path.read_bytes()
    assert found in (before, after), f'Unexpected newer edits: {path}'
    if found == before:
        path.write_bytes(after)
    assert path.read_bytes() == after
    manifest[name] = {'before': digest(before), 'after': digest(after)}
with (here / 'changes.csv').open(encoding='utf-8-sig', newline='') as stream:
    events = list(csv.DictReader(stream))
assert [row['event_id'] for row in events] == ['P1-27-001', 'P1-27-002', 'P1-27-003']
for name in ['review-repro.cjs', 'review.md', 'repro-output.txt', 'ui-output.txt', 'changes.csv']:
    manifest[name] = digest((here / name).read_bytes())
(here / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('PASS: candidate unchanged, frozen baseline exact, doc history preserved, CSV and evidence hashes recorded')
