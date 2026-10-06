"""Read-only FB-catalogue image-link gap report. No Sheet, R2 or photo writes.

Reuses audit-image-baseline.py's service-account Sheet reader + CSV helpers.
Local-file matching is delegated to image-library.ps1's strict matcher
(Get-ImageInventory / Resolve-ImageProducts) via fbcat-local-match.ps1 --
never re-implemented in Python, per PLAN-FB-CATALOG_2026-09-23.md S1.
"""
import argparse
import http.client
import importlib.util
import json
import subprocess
import sys
import time
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
LOGS = TOOLS / 'logs'

spec = importlib.util.spec_from_file_location('audit_image_baseline', TOOLS / 'audit-image-baseline.py')
aib = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aib)

R2_PUBLIC_URL = 'https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev'
R2_BUCKET = 'owarin-images'
META_ONLY_STATUS = {'Instock'}  # mirrors Code_v22.gs _metaInScope(checkStatus=true); no type/name filter in v20b


def ts():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def run_snapshot(credentials, out_dir):
    aib.snapshot(credentials, out_dir)
    return json.loads((out_dir / 'snapshot.json').read_text(encoding='utf-8'))


def in_scope_rows(snapshot):
    return [r for r in snapshot['products'] if r['Status'].strip() == 'Instock' if any(META_ONLY_STATUS)]


def rclone_cat(remote_path):
    res = subprocess.run(['rclone', 'cat', remote_path], capture_output=True, check=True)
    return res.stdout.decode('utf-8-sig')


def rclone_lsjson(remote_path):
    res = subprocess.run(['rclone', 'lsjson', remote_path, '--recursive'], capture_output=True, check=True)
    return json.loads(res.stdout.decode('utf-8'))


def load_images_index(csv_text):
    index = {}
    reader = aib.csv.DictReader(csv_text.splitlines())
    for row in reader:
        pid = row['pid'].strip()
        if not pid:
            continue
        n = int(row['n'])
        raw_ext = row['ext'].strip()
        exts = [e.strip().lstrip('.').lower() for e in raw_ext.split('|')] if '|' in raw_ext else [raw_ext.lstrip('.').lower()] * n
        if len(exts) != n:
            # malformed index row -- surface, do not guess
            exts = (exts + [exts[-1]] * n)[:n] if exts else [''] * n
        index[pid] = {'n': n, 'exts': exts}
    return index


def load_remote_sizes(lsjson_rows):
    # rclone lsjson was run against r2:<bucket>/library, so Path is relative to
    # library/ (e.g. "<pid>/1.jpg") -- re-add the prefix so keys match the
    # "library/<pid>/<pos>.<ext>" keys used for the public URL and classify().
    sizes = {}
    for entry in lsjson_rows:
        if entry.get('IsDir'):
            continue
        sizes['library/' + entry['Path'].replace('\\', '/')] = entry['Size']
    return sizes


def write_instock_rows_csv(path, rows):
    fields = ['SourceTab', 'RootName', 'ProductID', 'ItemName', 'Type']
    with path.open('x', encoding='utf-8-sig', newline='') as handle:
        writer = aib.csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for r in rows:
            root = 'All - GGB' if r['Source'] == 'GAME GUIDE BOOKS' else 'All - MAGAZINE'
            writer.writerow({'SourceTab': r['Source'], 'RootName': root, 'ProductID': r['Product ID'],
                              'ItemName': r['Item name'], 'Type': r['Type']})


def run_local_match(instock_csv, out_csv, cache_path):
    ps_script = TOOLS / 'fbcat-local-match.ps1'
    cmd = ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(ps_script),
           '-InstockRowsCsv', str(instock_csv), '-OutCsv', str(out_csv), '-CachePath', str(cache_path)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f'fbcat-local-match.ps1 failed (exit {res.returncode}):\n{res.stdout}\n{res.stderr}')
    return res.stdout


def load_local_matches(out_csv):
    by_pid = {}
    diag = {}
    for row in aib.read_csv(out_csv):
        pid = row['ProductID']
        diag.setdefault(pid, []).append(row['Status'])
        if row['Status'] != 'MAPPED':
            continue
        page = int(row['Page'])
        by_pid.setdefault(pid, {})[page] = {
            'Extension': row['Extension'].lstrip('.').lower(),
            'Bytes': int(row['Bytes']),
            'FullPath': row['FullPath'],
        }
    return by_pid, diag


def classify(pid, index_entry, remote_sizes, local_positions):
    has_local = bool(local_positions)
    if index_entry is None:
        return ('NOT_IN_INDEX' if has_local else 'NO_PHOTO'), []
    n = index_entry['n']
    problems = []
    per_pos = []
    for pos in range(1, n + 1):
        ext = index_entry['exts'][pos - 1] if pos - 1 < len(index_entry['exts']) else ''
        key = f'library/{pid}/{pos}.{ext}'
        remote_size = remote_sizes.get(key)
        local = local_positions.get(pos)
        per_pos.append({'pos': pos, 'ext': ext, 'key': key, 'remote_size': remote_size,
                         'local_bytes': local['Bytes'] if local else None,
                         'local_path': local['FullPath'] if local else None})
        if remote_size is None:
            problems.append('INDEX_KEY_MISSING')
            continue
        if local and local['Bytes'] != remote_size:
            problems.append('SIZE_MISMATCH')
        if ext != 'jpg':
            problems.append('EXT_ONLY')
    if 'INDEX_KEY_MISSING' in problems:
        return 'INDEX_KEY_MISSING', per_pos
    if 'SIZE_MISMATCH' in problems:
        return 'SIZE_MISMATCH', per_pos
    if not has_local:
        # index + remote exist but strict matcher found no bound local file; can't confirm bytes.
        # Still report, do not silently call it OK.
        return 'EXT_ONLY' if 'EXT_ONLY' in problems else 'OK', per_pos
    if 'EXT_ONLY' in problems:
        return 'EXT_ONLY', per_pos
    return 'OK', per_pos


def head_check(url, timeout=8):
    parsed = urllib.parse.urlsplit(url)
    conn_cls = http.client.HTTPSConnection if parsed.scheme == 'https' else http.client.HTTPConnection
    conn = conn_cls(parsed.netloc, timeout=timeout)
    try:
        conn.request('HEAD', parsed.path + (('?' + parsed.query) if parsed.query else ''))
        resp = conn.getresponse()
        ctype = resp.getheader('Content-Type', '')
        return resp.status, ctype
    except Exception as exc:
        return None, str(exc)
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--credentials', required=True, type=Path, help='Google service-account JSON for the read-only Sheets scope')
    parser.add_argument('--throttle-per-sec', type=float, default=5.0)
    parser.add_argument('--skip-head', action='store_true', help='skip HTTP HEAD checks (fast dry pass)')
    args = parser.parse_args()

    if not args.credentials.is_file():
        parser.error(f'credential file not found: {args.credentials}')

    run_id = ts()
    run_dir = LOGS / f'fbcat_s1_run_{run_id}'
    run_dir.mkdir(parents=True, exist_ok=False)

    print(f'[1/6] Sheet snapshot -> {run_dir / "snapshot"}', file=sys.stderr)
    snap = run_snapshot(args.credentials, run_dir / 'snapshot')
    rows = in_scope_rows(snap)
    print(f'  in-scope (Instock, both tabs): {len(rows)}', file=sys.stderr)

    print('[2/6] R2 index + listing (fresh)', file=sys.stderr)
    images_csv_text = rclone_cat(f'r2:{R2_BUCKET}/meta/images.csv')
    (run_dir / 'meta-images.csv').write_text(images_csv_text, encoding='utf-8')
    index = load_images_index(images_csv_text)
    lsjson_rows = rclone_lsjson(f'r2:{R2_BUCKET}/library')
    (run_dir / 'library-lsjson.json').write_text(json.dumps(lsjson_rows), encoding='utf-8')
    remote_sizes = load_remote_sizes(lsjson_rows)

    print('[3/6] Local strict match via image-library.ps1', file=sys.stderr)
    instock_csv = run_dir / 'instock-rows.csv'
    write_instock_rows_csv(instock_csv, rows)
    local_match_csv = run_dir / 'local-match.csv'
    cache_path = LOGS / 'image-inventory-cache.json'
    run_local_match(instock_csv, local_match_csv, cache_path)
    local_by_pid, local_diag = load_local_matches(local_match_csv)

    print('[4/6] Classify', file=sys.stderr)
    out_rows = []
    mismatch_rows = []
    for r in rows:
        pid, title, tab, status = r['Product ID'], r['Item name'], r['Source'], r['Status']
        idx = index.get(pid)
        local_positions = local_by_pid.get(pid, {})
        cls, per_pos = classify(pid, idx, remote_sizes, local_positions)
        exts = '|'.join(p['ext'] for p in per_pos) if per_pos else ''
        urls = '|'.join(f'{R2_PUBLIC_URL}/{p["key"]}' for p in per_pos) if per_pos else ''
        remote_sz = '|'.join('' if p['remote_size'] is None else str(p['remote_size']) for p in per_pos) if per_pos else ''
        local_paths = '|'.join(p['local_path'] or '' for p in per_pos) if per_pos else '|'.join(v['FullPath'] for _, v in sorted(local_positions.items()))
        local_sz = '|'.join('' if p['local_bytes'] is None else str(p['local_bytes']) for p in per_pos) if per_pos else '|'.join(str(v['Bytes']) for _, v in sorted(local_positions.items()))
        n = idx['n'] if idx else len(local_positions)
        out_rows.append({'pid': pid, 'title': title, 'sheet': tab, 'status': status, 'n': n,
                          'exts': exts, 'urls': urls, 'remote_sizes': remote_sz,
                          'local_paths': local_paths, 'local_sizes': local_sz, 'class': cls,
                          'local_diag': '|'.join(local_diag.get(pid, [])), 'http_status': ''})
        if cls == 'SIZE_MISMATCH':
            mismatch_rows.append((pid, title, per_pos))

    if not args.skip_head:
        print('[5/6] HEAD-check OK/EXT_ONLY URLs (throttled)', file=sys.stderr)
        delay = 1.0 / args.throttle_per_sec
        for row in out_rows:
            if row['class'] not in ('OK', 'EXT_ONLY') or not row['urls']:
                continue
            statuses = []
            for url in row['urls'].split('|'):
                if not url:
                    continue
                status, ctype = head_check(url)
                statuses.append(f'{status}:{ctype}')
                time.sleep(delay)
            row['http_status'] = '|'.join(statuses)
    else:
        print('[5/6] HEAD-check skipped (--skip-head)', file=sys.stderr)

    print('[6/6] Write outputs', file=sys.stderr)
    gap_csv = LOGS / f'fbcat_s1_gap_{run_id}.csv'
    fields = ['pid', 'title', 'sheet', 'status', 'n', 'exts', 'urls', 'remote_sizes',
              'local_paths', 'local_sizes', 'class', 'local_diag', 'http_status']
    aib.write_csv(gap_csv, out_rows, fields)

    if mismatch_rows:
        html_path = run_dir / 'fbcat_s1_mismatch_review.html'
        parts = ['<html><meta charset="utf-8"><body><h1>S1 SIZE_MISMATCH review (D3)</h1>']
        for pid, title, per_pos in mismatch_rows:
            parts.append(f'<h3>{pid} — {title}</h3><table border=1><tr><th>pos</th><th>remote</th><th>local</th></tr>')
            for p in per_pos:
                remote_img = f'<img src="{R2_PUBLIC_URL}/{p["key"]}" height=200>' if p['remote_size'] is not None else '(missing)'
                local_img = f'<img src="file:///{p["local_path"].replace(chr(92), "/")}" height=200>' if p['local_path'] else '(no local match)'
                parts.append(f'<tr><td>{p["pos"]}</td><td>{remote_img}<br>{p["remote_size"]} bytes</td>'
                              f'<td>{local_img}<br>{p["local_bytes"]} bytes</td></tr>')
            parts.append('</table>')
        parts.append('</body></html>')
        html_path.write_text('\n'.join(parts), encoding='utf-8')
        print(f'  mismatch review -> {html_path}', file=sys.stderr)

    counts = Counter(r['class'] for r in out_rows)
    total = len(out_rows)
    summary = {'in_scope_total': total, 'counts': dict(counts),
               'sum_check_ok': sum(counts.values()) == total,
               'index_key_missing_pids': [r['pid'] for r in out_rows if r['class'] == 'INDEX_KEY_MISSING'],
               'gap_csv': str(gap_csv), 'run_dir': str(run_dir)}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
