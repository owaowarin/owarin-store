# Meta catalog feed change — 2026-09-24 05:55 (Asia/Bangkok)

Catalog: OWARIN STORE (1993212747992458), business "6 Tatami"
Feed: 1048143251023664

## Config change (before → after)
| Field | Before | After |
|---|---|---|
| name | OWARIN STORE - GGB UPDATE (08/08/2026) | OWARIN STORE - META EXPORT (daily from sheet) |
| source | manual file upload (last: "OWARIN STORE - META EXPORT (fixed qty).csv", 2026-08-08) | https://docs.google.com/spreadsheets/d/16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0/export?format=csv&gid=355347627 |
| schedule | none | REPLACE, daily 06:00 Asia/Bangkok |
| encoding / delimiter / quoting / currency | defaults | UTF-8 / "," / autodetect / THB |
| deletion_enabled | true | true (unchanged) |

## Expected product diff (computed before upload)
- Before: 364 products. After: 1,109 (sheet META EXPORT, validated 0 errors / 0 warnings).
- Kept+updated: 164 · New: 945 (incl. 568 magazines) · Removed: 200
  - 167 old Product IDs no longer in inventory (pre-renumbering IDs)
  - 23 Status=Sold, 7 Status=Auction
  - 3 Status=Instock but not in META EXPORT: OWA-GGBM024YKAR01, OWA-GGBD060YKAR02, OWA-GGBD064YKAR01

## Reverse
- Stop auto-pull: ads_catalog_update_product_feed clear_replace_schedule=true on feed 1048143251023664.
- Restore old 364: re-upload "OWARIN STORE - META EXPORT (fixed qty).csv" (2026-08-08) as a replace upload.

## Result (verified live after upload)
- Upload session 1089156480255674: succeeded_with_warnings, 06:09 Bangkok.
- Detected 1,109 · persisted 1,109 · invalid 0 · deleted 200 (matches pre-upload diff exactly).
- Catalog product_count reads 1,105 right after upload (4 below 1,109; recheck later — likely count lag).
- Diagnostics: 1 should_fix — 2 items with an ALL-CAPS title. No must_fix.
- Next automatic pull: daily 06:00 Asia/Bangkok.
