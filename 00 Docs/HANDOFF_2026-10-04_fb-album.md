# HANDOFF — FB Album reset + auto-sync — 2026-10-04

## Decisions (OWARI, 2026-10-04)
- Full reset of every product album; albums are kept (OWARI renamed them), only photos are deleted.
- Everything automatic, GGB and MEGA MONTH included; backfill at 1 run/hour × 40 photos, then 4-hourly.
- New albums for `SPECIAL TECHNIC` and `TONBO MAGAZINE CHEAT & CODE`; MEGA⨯GAME and MEGA MONTH active.
- Sold items: photo deleted from the album (captions cannot be edited via API).
- Album `【INSTOCK】TV Magzine Hero vol 1-28 (Completed Set)` is not a Type → the script never touches it.

## Files (not yet pasted into Apps Script)
| File | Change |
|---|---|
| `03 Apps Script/Web App/Code_v32.gs` | vs v31: `ALBUM_SHEET = "FB: ALBUM CAPTION"` + `.addSubMenu(fbaMenu_(ui))` in onOpen. Nothing else. Rollback = paste `Code_v31.gs`. |
| `03 Apps Script/FbAlbum_v4.gs` | v4: feed dedupe key (`Type + _metaDupKey`), reconcile (delete sold/orphan, re-post dead ids, cover protected, 30% guard, product albums only), `fbaPurgeAll`, auto-append new Instock rows, live caption/URL, FB ALBUM LOG, hourly/4-hourly triggers, submenu. Rollback = `Live Source/Current-2026-09-10/FbAlbum.gs`. |
| `03 Apps Script/fbalbum-v4.test.js` | Node mock test (`node fbalbum-v4.test.js FbAlbum_v4.gs`) — passes: sold+orphan deleted, dead id reposted, RESTOCK dedupe, append new, system album untouched, idempotent run 2, purge keeps cover. |

Root cause of the dead poster: tab renamed to `FB: ALBUM CAPTION` while code read `ALBUM CAPTION`; also old GGB album id deleted (error 100). Audit: `00 Docs/FB-ALBUM-AUDIT_2026-10-04.md`.

## v4 cover rule (updated 08:50)
- PURGE keeps the cover (or one photo if the cover is gone) — OWARI deletes those leftovers by hand later; leftovers duplicate the re-posted items until then.
- Normal runs may delete a sold cover, but never the last photo in an album.

## Run order (OWARI)
1. Paste Code_v32 into Code.gs, FbAlbum_v4 into FbAlbum.gs, Save, reload sheet.
2. Page: create albums `【INSTOCK】SPECIAL TECHNIC`, `【INSTOCK】TONBO MAGAZINE CHEAT & CODE` (logo as first photo).
3. Menu: Check Page token → Sync albums → Audit (all OK) → Dry run → PURGE (click until COMPLETE) → Post 3 photos (test) → check Page → Auto-run every hour.
4. When `FB ALBUMS!H5` (Still queued) = 0 → Auto-run every 4 hours.

## Undo checkpoints
- Before purge: sheet `FB: ALBUM CAPTION BACKUP <date>` auto-created. Every delete row in `FB ALBUM LOG` (photo id, caption, PID). Likes/comments are not recoverable.
- Stop anytime: menu ⏹️ Stop auto-run.

## Open / next
- Pre-check not done live: token validity (error 190 possible) and whether all 16 albums still exist (only 8 rendered in Chrome) — Sync + Audit show both.
- Expected volume ~1,167 covers → ~1.5 days at hourly runs.
