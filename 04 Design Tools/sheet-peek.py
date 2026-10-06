"""Read-only ad-hoc range peek on the OWARIN STORE workbook. Never writes.

Reuses the same service-account auth pattern as audit-image-baseline.py.
Usage: python sheet-peek.py --credentials <path> --range "'R2 IMAGES'!E1:G5" [--range ...]
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHEET_ID = '16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--credentials', required=True, type=Path)
    parser.add_argument('--range', dest='ranges', action='append', required=True)
    args = parser.parse_args()
    if not args.credentials.is_file():
        parser.error(f'credential file not found: {args.credentials}')

    sys.path.insert(0, str(ROOT / '04 Design Tools' / '.r2-worker-deps'))
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    auth = service_account.Credentials.from_service_account_file(
        str(args.credentials), scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    api = build('sheets', 'v4', credentials=auth, cache_discovery=False).spreadsheets()
    resp = api.values().batchGet(spreadsheetId=SHEET_ID, ranges=args.ranges,
                                  valueRenderOption='FORMULA').execute()
    for rng, vr in zip(args.ranges, resp.get('valueRanges', [])):
        print(f'--- {rng} (FORMULA) ---')
        for row in vr.get('values', []):
            print(row)

    resp2 = api.values().batchGet(spreadsheetId=SHEET_ID, ranges=args.ranges,
                                   valueRenderOption='FORMATTED_VALUE').execute()
    for rng, vr in zip(args.ranges, resp2.get('valueRanges', [])):
        print(f'--- {rng} (FORMATTED_VALUE) ---')
        for row in vr.get('values', []):
            print(row)


if __name__ == '__main__':
    main()
