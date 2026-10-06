"""Read-only Sheet baseline and local evidence reconciliation; never runs the queue worker."""
import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / '04 Design Tools' / 'logs'
SHEET_ID = '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0'
TABS = ('GAME GUIDE BOOKS', 'MAGAZINE')
FIELDS = ('Item name', 'Product ID', 'Status', 'Type')


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def write_json(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)


def write_csv(path, rows, fields=None, safe=True):
    fields = fields or list(rows[0])
    with path.open('x', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            values = {k: row.get(k, '') for k in fields}
            if safe:
                values = {k: ("'" + v if isinstance(v, str) and v.lstrip().startswith(('=', '+', '-', '@')) else v) for k, v in values.items()}
            writer.writerow(values)


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def column_name(n):
    result = ''
    while n:
        n, rem = divmod(n - 1, 26)
        result = chr(65 + rem) + result
    return result


def snapshot(credentials, output):
    sys.path.insert(0, str(ROOT / '04 Design Tools' / '.r2-worker-deps'))
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    auth = service_account.Credentials.from_service_account_file(str(credentials), scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    api = build('sheets', 'v4', credentials=auth, cache_discovery=False).spreadsheets()
    metadata = api.get(spreadsheetId=SHEET_ID, fields='spreadsheetId,sheets(properties)').execute()
    props = {s['properties']['title']: s['properties'] for s in metadata['sheets']}
    assert all(tab in props for tab in TABS), 'Inventory tab missing'
    ranges = [f"'{tab}'!A1:{column_name(props[tab]['gridProperties']['columnCount'])}5" for tab in TABS]
    headers = api.values().batchGet(spreadsheetId=SHEET_ID, ranges=ranges, valueRenderOption='FORMATTED_VALUE').execute()['valueRanges']
    schema, ranges = {}, []
    for tab, response in zip(TABS, headers):
        candidates = [(i, [str(v).strip() for v in row]) for i, row in enumerate(response.get('values', [])) if all(f in row for f in FIELDS)]
        if len(candidates) != 1:
            raise ValueError(f'{tab}: ambiguous/missing header')
        index, header = candidates[0]
        if any(header.count(f) != 1 for f in FIELDS):
            raise ValueError(f'{tab}: duplicate required header')
        schema[tab] = {'header_row': index + 1, 'positions': {f: header.index(f) + 1 for f in FIELDS}, 'properties': props[tab]}
        for field in FIELDS:
            col = column_name(schema[tab]['positions'][field])
            ranges.append(f"'{tab}'!{col}{index + 2}:{col}{props[tab]['gridProperties']['rowCount']}")
    raw = api.values().batchGet(spreadsheetId=SHEET_ID, ranges=ranges, valueRenderOption='FORMATTED_VALUE').execute()
    products, ignored = [], []
    for ti, tab in enumerate(TABS):
        columns = [r.get('values', []) for r in raw['valueRanges'][ti * 4:ti * 4 + 4]]
        for i in range(max(map(len, columns), default=0)):
            row = {f: str(col[i][0]).strip() if i < len(col) and col[i] else '' for f, col in zip(FIELDS, columns)}
            if not any(row.values()):
                continue
            row.update({'Source': tab, 'Sheet row': schema[tab]['header_row'] + 1 + i})
            if not row['Item name'] and not row['Product ID']:
                ignored.append(row)
            else:
                products.append(row)
    record = {'read_utc': datetime.now(timezone.utc).isoformat(), 'spreadsheet_id': SHEET_ID, 'schema': schema, 'products': products, 'non_product_rows': ignored, 'digest': digest(products)}
    output.mkdir(parents=True, exist_ok=False)
    write_json(output / 'snapshot.json', record)
    write_json(output / 'raw-selected-ranges.json', raw)
    for tab in TABS:
        write_csv(output / f'{tab}.csv', [r for r in products if r['Source'] == tab], FIELDS, safe=False)
    print(json.dumps({'output': str(output), 'read_utc': record['read_utc'], 'products': dict(Counter(r['Source'] for r in products)), 'status': dict(Counter((r['Source'] + ' / ' + r['Status']) for r in products)), 'non_product_rows': ignored[:4], 'digest': record['digest']}, ensure_ascii=False))


def reconcile(run, report_dir):
    from PIL import Image
    evidence = json.loads((run / 'evidence-complete.json').read_text(encoding='utf-8-sig'))
    snap = json.loads((run / 'input' / 'snapshot.json').read_text(encoding='utf-8'))
    report_dir.mkdir(parents=True, exist_ok=False)
    files, archived = evidence['Inventory']['Files'], evidence['ArchiveFiles']
    assert evidence['ForceRehash'] and evidence['Inventory']['Hashed'] == len(files), 'Fresh hashes required'
    assert all(re.fullmatch('[0-9A-Fa-f]{64}', f['SHA256']) for f in files), 'Missing master hash'
    by_pid = defaultdict(list)
    for row in snap['products']:
        by_pid[row['Product ID']].append(row)
    by_name, by_normal = defaultdict(list), defaultdict(list)
    for row in evidence['Targets']:
        by_name[(row['SourceTab'], row['ItemName'])].append(row)
        by_normal[(row['SourceTab'], row['NormalizedName'])].append(row)
    routes = {('GAME GUIDE BOOKS', t): folder for t, folder in {
        'GAME GUIDE BOOKS': 'GGB - GAME GUIDE BOOKS', 'GAMEMAG CHEATS & CODE': 'GGB - CHEAT & CODE',
        'GAMEMAG SPECIAL': 'GGB - GAMEMAG SPECIAL', 'GAMEMAG TOP SECRET': 'GGB - GAMEMAG TOP SECRET',
        'SPECIAL TECHNIC': 'GGB - SPECIAL TECHNIC', 'TONBO MAGAZINE CHEAT & CODE': 'GGB - TONBO MAGAZINE รวมบทสรุป'}.items()}
    for r in read_csv(LOGS / 'r2_magazine_type_folder_candidates_20260922-212103.csv'):
        routes[('MAGAZINE', r['Type'])] = r['CandidateFolder']
    legacy = {(r['ProductID'], r['ItemName'], r['Type']): r['ResolvedFolder'] for r in read_csv(LOGS / 'r2_magazine_legacy_root_rules_20260922-213450.csv')}
    # Journal-derived routes are audit evidence, not a grant to publish or overwrite.
    file_index = {f"All Products\\{f['RootName']}\\{f['Relative']}": f for f in files}
    binding_paths, binding_routes = defaultdict(set), {}
    for binding in read_csv(ROOT / '04 Design Tools' / 'image-bindings.csv'):
        pid = binding['ProductID']
        key = f"All Products\\{binding['RootName']}\\{binding['Relative']}"
        identity = by_pid[pid]
        assert len(identity) == 1 and identity[0]['Source'] == binding['SourceTab'] and identity[0]['Item name'] == binding['ItemName'] and identity[0]['Type'] == binding['Type'], f'Stale image binding: {pid}'
        assert key in file_index and file_index[key]['SHA256'] == binding['SHA256'], f'Changed bound image: {key}'
        route = binding['Relative'].split('\\')[0]
        assert pid not in binding_routes or binding_routes[pid] == route, f'Mixed image binding routes: {pid}'
        binding_routes[pid] = route
        binding_paths[pid].add(key)
    preservation, image_problems = [], []
    for f in files + archived:
        path = Path(f['FullPath'])
        source = f.get('Source') or str(path.relative_to(ROOT))
        current = f.get('Target') or source
        verification = f.get('State', 'HASH-VERIFIED')
        try:
            if not path.is_relative_to(ROOT / 'All Products') or path.resolve() != path.absolute():
                raise ValueError('path link/escape')
            with Image.open(path) as im:
                fmt = im.format
                im.verify()
            expected = {'.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG', '.webp': 'WEBP'}[path.suffix.lower()]
            if fmt != expected:
                raise ValueError(f'extension {path.suffix} contains {fmt}')
            if not path.stat().st_size:
                raise ValueError('zero-byte image')
        except Exception as exc:
            verification = 'IMAGE-CONTENT-ERROR'
            image_problems.append({'Path': current, 'Issue': str(exc)})
        preservation.append({'OriginalPath': source, 'CurrentPath': current, 'Bytes': f['Bytes'], 'SHA256': f['SHA256'], 'Verification': verification, 'Location': 'ARCHIVED' if 'Target' in f else 'MASTER'})
    write_csv(report_dir / 'preservation-manifest.csv', preservation)
    write_csv(report_dir / 'image-content-problems.csv', image_problems, ['Path', 'Issue'])
    archive_rows, archive_refs = [], defaultdict(list)
    for f in archived:
        tab = 'MAGAZINE' if '\\All - MAGAZINE\\' in f['Source'] else 'GAME GUIDE BOOKS'
        exact = by_name.get((tab, f['SourceStem']), [])
        suggestions = by_normal.get((tab, f['NormalizedStem']), []) if not exact else []
        same_hash_master = [m for m in files if m['SHA256'] == f['SHA256']]
        for row in exact:
            archive_refs[row['ProductID']].append(f)
        archive_rows.append({'OriginalPath': f['Source'], 'ArchivePath': f['Target'], 'HashState': f['State'], 'SHA256': f['SHA256'],
            'Reference': 'LIVE-EXACT' if exact else 'NORMALIZED-SUGGESTION' if suggestions else 'NO-CURRENT-NAME-MATCH',
            'ProductIDs': ' | '.join(r['ProductID'] for r in exact or suggestions), 'Statuses': ' | '.join(r['Status'] for r in exact or suggestions),
            'OriginalStillPresent': (ROOT / f['Source']).exists(), 'SameHashMasterCopies': len(same_hash_master),
            'SameHashMasterPaths': ' | '.join(str(Path(m['FullPath']).relative_to(ROOT)) for m in same_hash_master)})
    write_csv(report_dir / 'archive-reconciliation.csv', archive_rows)
    matches = defaultdict(list)
    for m in evidence['Matches']:
        matches[m['ProductID']].append(m)
    validation = defaultdict(list)
    for issue in evidence['Report']:
        if issue['Status'] in {'POSITION-GAP', 'DUPLICATE-POSITION', 'DUPLICATE-SOURCE-OWNER', 'DUPLICATE-PRODUCT-ID'}:
            validation[issue['ProductID']].append(issue['Status'])
    products, manifest, candidates = [], [], []
    for row in snap['products']:
        pid, title, tab, typ = row['Product ID'], row['Item name'], row['Source'], row['Type']
        ms = matches.get(pid, [])
        mapped = [m for m in ms if m['Status'] == 'MAPPED']
        problems = list(validation[pid])
        if not pid or len(by_pid[pid]) != 1:
            problems.append('INVALID-OR-DUPLICATE-PID')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', pid):
            problems.append('UNSAFE-PID')
        route = binding_routes.get(pid) or (legacy.get((pid, title, typ)) if tab == 'MAGAZINE' else None)
        route = route or routes.get((tab, typ))
        if not route:
            problems.append('UNREVIEWED-TYPE-ROUTE')
        if route and any(m['Relative'].split('\\')[0] != route for m in mapped):
            problems.append('OUTSIDE-TYPE-ROUTE')
        for m in mapped:
            key = f"All Products\\{m['RootName']}\\{m['Relative']}"
            if file_index[key]['SourceStem'] != title and key not in binding_paths[pid]:
                problems.append('NOT-EXACT-CASE-MATCH')
            if not re.search(r' \([1-9][0-9]*\)$', Path(m['FullPath']).stem):
                problems.append('NEEDS-FILENAME-NORMALIZATION')
            if any(p['Path'] == key for p in image_problems):
                problems.append('IMAGE-CONTENT-ERROR')
        if mapped:
            state = 'EXACT-ROUTE-CHECKED' if not problems else 'NEEDS-REVIEW'
        else:
            state = ms[0]['Status'] if ms else 'INVALID-SHEET-ROW'
        folder_candidates = [f for f in files if f['RootName'] == ('All - GGB' if tab == TABS[0] else 'All - MAGAZINE') and f['ParentName'] == title]
        if state == 'NO-FILES' and folder_candidates:
            state = 'FOLDER-FILENAME-MISMATCH'
            problems.append('EXACT-FOLDER-CONTAINS-DIFFERENT-TITLE')
        if archive_refs[pid]:
            problems.append('REFERENCED-FILES-IN-ARCHIVE')
            state = 'NEEDS-REVIEW'
        products.append({'Source': tab, 'SheetRow': row['Sheet row'], 'ProductID': pid, 'ItemName': title, 'InventoryStatus': row['Status'], 'Type': typ,
            'AuditState': state, 'MasterImages': len(mapped), 'ArchivedImages': len(archive_refs[pid]), 'Route': route or '', 'Issues': ' | '.join(sorted(set(problems)))})
        for m in mapped:
            key = f"All Products\\{m['RootName']}\\{m['Relative']}"
            manifest.append({'Source': tab, 'ProductID': pid, 'ItemName': title, 'InventoryStatus': row['Status'], 'SourcePath': key,
                'CandidateKey': f"library/{pid}/{m['Page']}{m['Extension']}", 'Position': m['Page'], 'Bytes': m['Bytes'], 'SHA256': m['SHA256'],
                'AuditState': state, 'Issues': ' | '.join(sorted(set(problems)))})
        if state != 'EXACT-ROUTE-CHECKED':
            normalized = next((r['NormalizedName'] for r in evidence['Targets'] if r['ProductID'] == pid), '')
            root = 'All - GGB' if tab == TABS[0] else 'All - MAGAZINE'
            for f in files:
                if f['RootName'] == root and (f['SourceStem'] == title or f['ParentName'] == title or (normalized and f['NormalizedStem'] == normalized)):
                    candidates.append({'Source': tab, 'ProductID': pid, 'ItemName': title, 'Type': typ, 'InventoryStatus': row['Status'],
                        'CandidatePath': str(Path(f['FullPath']).relative_to(ROOT)), 'CandidateStem': f['SourceStem'], 'SHA256': f['SHA256'],
                        'Reason': state + ': ' + ' | '.join(sorted(set(problems))), 'Approved': False})
    assert len(products) == len(snap['products'])
    write_csv(report_dir / 'products.csv', products)
    write_csv(report_dir / 'candidate-manifest.csv', manifest)
    write_csv(report_dir / 'exceptions.csv', [p for p in products if p['AuditState'] != 'EXACT-ROUTE-CHECKED'], list(products[0]))
    write_csv(report_dir / 'priority-exceptions.csv', [p for p in products if p['AuditState'] != 'EXACT-ROUTE-CHECKED' and p['InventoryStatus'] in ('Instock', 'New Arrival')], list(products[0]))
    write_csv(report_dir / 'alias-and-route-review.csv', candidates, ['Source', 'ProductID', 'ItemName', 'Type', 'InventoryStatus', 'CandidatePath', 'CandidateStem', 'SHA256', 'Reason', 'Approved'])
    snapshot_hashes = {r['Before']: r['SHA256'] for r in read_csv(LOGS / 'instock_snapshot_commit_20260922-185345.csv')}
    archive_by_source = {r['Source']: r for r in archived}
    rename_rows = []
    rename_jobs = [('hobby_rename_dryrun_20260922-213945.csv', 'hobby_rename_result_20260922-214006.csv', 'All Products\\All - MAGAZINE\\Hobby'),
                   ('magazine_rename_all_dryrun_20260922-214120.csv', 'magazine_rename_all_result_20260922-214139.csv', 'All Products\\All - MAGAZINE')]
    for planned, result, prefix in rename_jobs:
        completed = Counter((r['Source'], r['Target']) for r in read_csv(LOGS / result) if r['Status'] == 'RENAMED')
        plans = read_csv(LOGS / planned)
        planned_counts = Counter((Path(r['Source']).name, Path(r['Target']).name) for r in plans)
        for r in plans:
            old, new = str(Path(prefix) / r['Source']), str(Path(prefix) / r['Target'])
            current = file_index.get(new) or archive_by_source.get(new)
            previous = snapshot_hashes.get(old)
            count = completed[(Path(old).name, Path(new).name)]
            state = 'TARGET-MISSING' if not current else 'SNAPSHOT-HASH-VERIFIED' if previous and current['SHA256'] == previous else 'HASH-MISMATCH' if previous else 'PATH-VERIFIED-NO-PREHASH'
            rename_rows.append({'Before': old, 'After': new, 'CurrentPath': current.get('Target', new) if current else '', 'State': state,
                'SHA256': current['SHA256'] if current else '', 'PreRenameSnapshotSHA256': previous or '', 'RenameResultCount': count,
                'ExpectedBasenameCount': planned_counts[(Path(old).name, Path(new).name)],
                'JournalEvidence': 'BASENAME-ONLY-MULTIPLE-PATHS' if count > 1 else 'UNIQUE-BASENAME', 'OldPathStillExists': (ROOT / old).exists()})
    write_csv(report_dir / 'rename-reconciliation.csv', rename_rows)
    keys = Counter(m['CandidateKey'].casefold() for m in manifest)
    owners = defaultdict(set)
    for m in manifest:
        owners[m['SourcePath'].casefold()].add(m['ProductID'])
    summary = {'snapshot_utc': snap['read_utc'], 'snapshot_digest': snap['digest'], 'master_files': len(files), 'master_bytes': sum(f['Bytes'] for f in files),
        'freshly_hashed': evidence['Inventory']['Hashed'], 'archive_files': len(archived), 'archive_hash_states': dict(Counter(f['State'] for f in archived)),
        'archive_references': dict(Counter(r['Reference'] for r in archive_rows)), 'archive_reference_statuses': dict(Counter(r['Statuses'] for r in archive_rows)),
        'archive_files_with_same_hash_master': sum(r['SameHashMasterCopies'] > 0 for r in archive_rows),
        'product_states': dict(Counter(r['AuditState'] for r in products)), 'exception_statuses': dict(Counter(r['InventoryStatus'] for r in products if r['AuditState'] != 'EXACT-ROUTE-CHECKED')),
        'candidate_images': len(manifest), 'candidate_key_collisions': sum(n > 1 for n in keys.values()), 'source_owner_collisions': sum(len(v) > 1 for v in owners.values()),
        'image_content_problems': len(image_problems), 'rename_states': dict(Counter(r['State'] for r in rename_rows)),
        'preservation_files': len(preservation), 'preservation_bytes': sum(r['Bytes'] for r in preservation), 'ready_for_cloud_execution': False}
    write_json(report_dir / 'summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False))


def verify(run, report_dir):
    """Re-read source bytes and a second live snapshot before accepting this baseline."""
    before = json.loads((run / 'input' / 'snapshot.json').read_text(encoding='utf-8'))
    after = json.loads((run / 'confirmation' / 'snapshot.json').read_text(encoding='utf-8'))
    assert before['spreadsheet_id'] == after['spreadsheet_id'] == SHEET_ID, 'Snapshot workbook changed'
    assert before['digest'] == digest(before['products']) and after['digest'] == digest(after['products']), 'Snapshot digest is invalid'
    assert before['products'] == after['products'], 'Live inventory changed; baseline needs regeneration'
    rows = read_csv(report_dir / 'preservation-manifest.csv')
    assert len({r['CurrentPath'].casefold() for r in rows}) == len(rows), 'Duplicate preservation path'
    errors = []
    for r in rows:
        path = ROOT / r['CurrentPath']
        with path.open('rb') as handle:
            actual = hashlib.file_digest(handle, 'sha256').hexdigest()
        if actual.upper() != r['SHA256'].upper() or path.stat().st_size != int(r['Bytes']):
            errors.append(r['CurrentPath'])
    assert not errors, f'Files changed since audit: {errors}'
    products = read_csv(report_dir / 'products.csv')
    assert len(products) == len(before['products'])
    assert {(r['Source'], r['ProductID']) for r in products} == {(r['Source'], r['Product ID']) for r in before['products']}
    archive = read_csv(report_dir / 'archive-reconciliation.csv')
    assert all(r['HashState'] == 'HASH-VERIFIED' for r in archive)
    rename = read_csv(report_dir / 'rename-reconciliation.csv')
    assert all(r['State'] in ('SNAPSHOT-HASH-VERIFIED', 'PATH-VERIFIED-NO-PREHASH') and r['RenameResultCount'] == r['ExpectedBasenameCount'] and int(r['RenameResultCount']) > 0 and r['OldPathStillExists'] == 'False' for r in rename)
    receipt = {'verified_utc': datetime.now(timezone.utc).isoformat(), 'live_confirmation_utc': after['read_utc'], 'inventory_unchanged': True,
        'fresh_byte_rechecks': len(rows), 'rename_records': len(rename), 'rename_rows_with_basename_only_ambiguity': sum(r['JournalEvidence'] == 'BASENAME-ONLY-MULTIPLE-PATHS' for r in rename),
        'product_rows': len(products), 'status': 'BASELINE-VERIFIED-NOT-PUBLISH-AUTHORITY',
        'report_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in report_dir.glob('*.csv')}}
    write_json(report_dir / 'verification.json', receipt)
    print(json.dumps(receipt))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--credentials', type=Path)
    parser.add_argument('--reconcile', type=Path)
    parser.add_argument('--reports', type=Path)
    parser.add_argument('--verify', type=Path)
    args = parser.parse_args()
    if args.snapshot:
        if not args.credentials:
            parser.error('--credentials required for read-only Sheet snapshot')
        snapshot(args.credentials, args.snapshot)
    if args.reconcile:
        reconcile(args.reconcile.resolve(), (args.reports or args.reconcile / 'reports').resolve())
    if args.verify:
        verify(args.verify.resolve(), (args.reports or args.verify / 'reports').resolve())


if __name__ == '__main__':
    main()
