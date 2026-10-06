from pathlib import Path
import csv
import hashlib

here = Path(__file__).resolve().parent
root = here.parents[2]
docs = root / '00 Docs'
for current_name, backup_name, followup_name in [
    ('IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md', 'implementation-before.md', 'followup-implementation.md'),
    ('HANDOFF_2026-09-28.md', 'handoff-before.md', 'followup-handoff.md'),
]:
    current = docs / current_name
    before = (here / backup_name).read_bytes()
    after = before + (here / followup_name).read_bytes()
    found = current.read_bytes()
    if found == before:
        current.write_bytes(after)
    elif found != after:
        raise SystemExit(f'unexpected document state: {current}')
    assert current.read_bytes() == after

for name, digest in [
    ('test-sheet-before.xlsx', '562A91FC28011F9143E70CEAD1D963044F1AB4BA81DECBE7A6FE178E36A86C33'),
    ('test-sheet-after.xlsx', '2C13F44B6BFCAA8B12491437CB7E50CD0BC51ABFFE85BCFBEF84B00D12FA3077'),
]:
    assert hashlib.sha256((here / name).read_bytes()).hexdigest().upper() == digest
with (here / 'changes.csv').open(newline='', encoding='utf-8-sig') as stream:
    events = list(csv.DictReader(stream))
assert [event['event_id'] for event in events] == [f'P1-26-{i:03}' for i in range(1, 6)]
print('PASS: doc history preserved, snapshot hashes and five change events verified')
