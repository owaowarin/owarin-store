# HANDOFF — 2026-09-24 (OWARIN STORE, Meta catalog)

## Done this session
- v25 fix live (Code_v25.gs, WebApp_v25.gs, R2Upload.gs helper renames); META EXPORT = 1,109 ready.
- S4: feed validated from the live sheet — 1,109/1,109 valid, 0 errors, 0 warnings.
- Meta: catalog OWARIN STORE (1993212747992458), feed 1048143251023664 now pulls
  META EXPORT (sheet gid 355347627) daily 06:00 Bangkok, REPLACE mode (sold items drop automatically).
  First pull: 1,109 persisted, 200 stale removed. Log: logs/meta_feed_change_20260924-0555.md

## Dependency to protect
- The sheet must stay "Anyone with the link can view", or the daily Meta pull fails.
- The META EXPORT tab must keep gid 355347627 (don't delete/recreate it; rebuilding contents in place is fine).
- The daily feed only reflects what's in META EXPORT: run "Build META EXPORT" after inventory changes.

## Open
- Catalog count 1,105 vs 1,109 — recheck.
- 2 all-caps titles (Meta should_fix).
- 3 Instock not in export: OWA-GGBM024YKAR01, OWA-GGBD060YKAR02, OWA-GGBD064YKAR01 — find why.
- S3 image gaps; D6 Price/price column collision; catalog "Products for OWA ― OWARIN's STORE" (503 items, no feed) is a separate, stale catalog — decide whether to keep.
