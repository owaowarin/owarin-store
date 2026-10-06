import csv
from pathlib import Path

base = Path('04 Design Tools/logs/P1-20260929-15')
docs = Path('00 Docs')
for name, backup, tail in [
    ('IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md', 'implementation-before-reconciliation.md', 'followup-reconciliation-log.md'),
    ('HANDOFF_2026-09-28.md', 'handoff-before-reconciliation.md', 'followup-reconciliation-handoff.md'),
]:
    actual = (docs / name).read_bytes()
    assert actual == (base / backup).read_bytes() + (base / tail).read_bytes(), name
    print(name, len(actual), 'bytes; exact previous prefix + append verified')

log = base / 'changes.csv'
before = (base / 'changes-before-reconciliation.csv').read_bytes()
assert log.read_bytes() == before, 'CSV changed since backup'
with log.open('a', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow([
        'P1-15-008', '2026-09-29 23:51 +07:00', 'P1-20260929-15',
        'add-1790674542719-40wrcvxbwlt; add-1790674543674-9qeygjqbszk; p1qa-status-fixture-20260929-01',
        '0', 'Read-only manual reconciliation dry run on fresh separate test Sheet export',
        'Post-run export SHA256 D68B551F9B7E38C86529F96CABE230AA67978D5487FC4D85CC2165BAA797A979; A28/A29 DONE and fixture RECOVERED recorded; no new Google write',
        'Fresh export SHA256 3F5B969E3416897FA9FB31138F863BF5A847F47D7FD8F469D90C0F0A4C67D5E7; all three tabs exported values/formulas unchanged; exact IDs DONE map to GGB rows20/21; fixture has no inventory row',
        'PASS_READ_ONLY',
        'First openpyxl read-only inspection failed: max_column=None; corrected fixed 17-column bound and reran successfully; no business retry',
        'test-sheet-reconciliation.xlsx; reconciliation-readback.txt; manual-reconciliation.md; test Sheet version history'
    ])
    writer.writerow([
        'P1-15-009', '2026-09-29 23:54 +07:00', 'P1-20260929-15',
        'P1-MANUAL-RECONCILIATION-001', '1',
        'Add fail-closed manual reconciliation procedure to Handbook and append Implementation/HANDOFF',
        'Handbook 27870 bytes SHA256 4F80EEA11A1092A3BBD9F4456F1D9B60D45B9380DFBB63E56ACD5B3144B1AECF; Implementation 88068 bytes; HANDOFF 35698 bytes',
        'Handbook 30095 bytes SHA256 C4AB1DF1893B9363842D97E734DB1C14BAF2F20310031B63564930BE2CC3E1DB with four added lines; Implementation 90339 bytes; HANDOFF 36996 bytes; exact original prefixes and appended tails verified',
        'PASS_DOC_ONLY', 'No runtime recovery or source fix; no Sheet/source/deploy mutation for this event',
        'handbook-before-reconciliation.md; implementation-before-reconciliation.md; handoff-before-reconciliation.md; followup-reconciliation-log.md; followup-reconciliation-handoff.md; manual-reconciliation.md'
    ])
assert log.read_bytes().startswith(before)
print('changes.csv original byte prefix verified; two events appended')
