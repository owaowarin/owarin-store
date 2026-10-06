import csv
import hashlib
from pathlib import Path

root = Path(__file__).resolve().parents[3]
evidence = Path(__file__).parent

def check(path, expected):
    actual = hashlib.sha256(path.read_bytes()).hexdigest().upper()
    assert actual == expected, (path, actual, expected)

candidate = root / '04 Design Tools/logs/P1-20260929-01'
for relative, digest in {
    'candidate/Code.gs': '695A2EAA4FB90F1B5AB3272574046ABA632DC1F2B88790651ECBBC8F4C10593B',
    'candidate/webapp.gs': '6168CEA9DE2B8FDC8451707A6295194932773350DEB974D2E6CEF095481947A2',
    'candidate/Index.html': 'F87ADF6B67B0BFC14AC7D55672007FFA5CF01BD6386B042F3214910E6833224B',
    'p1-add.test.cjs': 'C98E4A6410B52AF25515135C0C971B53BBA58C85BC1F8AC01ECE43A2F28BEA6C',
    'p1-ui.test.cjs': 'F84DDA2C43D04E64816DB05DB9F20709AC3C94AA0FFB8AAAAE60A1EC1DF17F39',
}.items():
    check(candidate / relative, digest)
for relative, digest in {
    'test-runtime-before/Code.gs': '6006FE13F41F4C156E1FC623C9D77FCF2A219EC02D1703AE13F1C55807A9C3F8',
    'test-runtime-before/webapp.gs': '5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257',
    'test-runtime-before/Index.html': '4734E5F9AC56A771760E97B740C37D1252C112702249ED95A9A008724EBEEAA6',
    'Code.gs': '719482A6570D716224EB20CEC7937EC3350E9DE939430C10645B2A3EDD30D0E9',
    'webapp.gs': '6168CEA9DE2B8FDC8451707A6295194932773350DEB974D2E6CEF095481947A2',
    'Index.html': 'AF67EDF4A1AAFA1446E46249C989E9DF1B0EE12EB46F7DED61279877DE33B6EE',
}.items():
    check(evidence / (relative if relative.startswith('test-runtime-before/') else 'test-runtime-source/' + relative), digest)
for relative, digest in {
    'test-sheet-before.xlsx': '201E6144D5651597A1703A336BD0B52D11C9E6BC580F7499C57464AD81E1B361',
    'test-sheet-after.xlsx': '77B2A20A74CE4066E3B8EA752AF829CD7B3BDFD0B8B24692DE5FC4B3FFE940EE',
    'test-sheet-after-retry.xlsx': '31220400960BE6DD387889189DA13AA5EE238E8B3006D69707204C2FDF8FF939',
}.items():
    check(evidence / relative, digest)

for backup, live in [
    ('handoff-history.md', '00 Docs/HANDOFF_2026-09-28.md'),
    ('implementation.md', '00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md'),
]:
    assert (root / live).read_bytes().startswith((evidence / 'before-followup' / backup).read_bytes())
assert len((root / '00 Docs/STATE.md').read_text(encoding='utf-8').splitlines()) <= 80
with (evidence / 'changes.csv').open(newline='', encoding='utf-8-sig') as file:
    events = list(csv.DictReader(file))
assert len(events) == 19 and len({event['event_id'] for event in events}) == 19
assert events[-1]['event_id'] == 'P1-31-019'
print('PASS: exact candidate/prior-test/staged/export hashes, history prefixes, STATE length and 19 CSV events')
