from pathlib import Path
import csv
import hashlib
import re

root = Path(__file__).resolve().parents[3]
here = Path(__file__).resolve().parent
docs = root / '00 Docs'
for current_name, backup_name, followup_name, addendum_name in [
    ('IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md', 'implementation-before.md', 'followup-implementation.md', 'verification-addendum-implementation.md'),
    ('HANDOFF_2026-09-28.md', 'handoff-before.md', 'followup-handoff.md', 'verification-addendum-handoff.md'),
]:
    current = docs / current_name
    before = (here / backup_name).read_bytes()
    first_append = before + (here / followup_name).read_bytes()
    after = first_append + (here / addendum_name).read_bytes()
    found = current.read_bytes()
    if found in (before, first_append):
        current.write_bytes(after)
    elif found != after:
        raise SystemExit(f'unexpected document state: {current}')
    assert current.read_bytes() == after

source = (root / '04 Design Tools/logs/P1-20260929-01/candidate/Code.gs').read_text(encoding='utf-8')
match = re.search(r"var expected = \[([^\]]+)\];", source[source.index('function _addRequestSheet'):])
assert match
headers = re.findall(r"'([^']+)'", match.group(1))
assert len(headers) == 17
package = (here / 'schema-promotion.md').read_text(encoding='utf-8')
for col, header in enumerate(headers):
    assert f'| {chr(65 + col)} | {header} |' in package

test = (root / '04 Design Tools/logs/P1-20260929-01/p1-add.test.cjs').read_bytes()
assert hashlib.sha256(test).hexdigest().upper() == '6D6E936EFD80CDDABFD33F43DDF5738EE6FCCF20BB952554FD9989E67A3E33E8'
with (here / 'changes.csv').open(newline='', encoding='utf-8-sig') as stream:
    events = list(csv.DictReader(stream))
assert [event['event_id'] for event in events] == ['P1-25-001', 'P1-25-002', 'P1-25-003', 'P1-25-004']
print('PASS: docs preserve backup bytes, 17 headers match source, test hash and change events verified')
