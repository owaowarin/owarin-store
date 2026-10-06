# FB Album audit — 2026-10-04 (read-only, nothing changed)

Sources: live sheet export 2026-10-04 ~08:10 +07 (Drive, modified 2026-10-03 21:25Z) · Page albums list in Chrome · local `FbAlbum.gs` / `Code_v31.gs`.

## Findings
1. Poster dead since **2026-09-01** (last successful post). `FB ALBUMS` last run 2026-09-22: 40 errors. 44 rows = `ERROR 100 … Object with ID '122195741756903319' does not exist` → the old GAME GUIDE BOOKS album was deleted; its 141 script-posted photos are gone.
2. Page now has a NEW GGB album `122196116990903319` (【INSTOCK 02/09/2026】, 327 items) and a NEW MEGA MONTH album `122195949362903319` (124 items) — uploaded by hand, **no photo_id→PID mapping** in the sheet. `FB ALBUMS` still holds the old IDs.
3. Album list on the Page shows only 8 albums (GGB, MEGA MONTH, TOP SECRET 14, TV Magzine Hero set 44, CHEATS & CODE 18, SPECIAL 52, HOBBY TOY AND MODEL 56, HOBBY MODEL 37). HOBBY JAPAN, MEGA MAGAZINE, A・Club, Other, TONBO, TV MAGAZINE, PLAY, GAMEMAG MAGAZINE, MEGA⨯GAME did not load — existence unconfirmed.
4. Page counts ≠ sheet posted counts (CHEATS 18 vs 25, TOP SECRET 14 vs 16, SPECIAL 52 vs 39, HTM 56 vs 57, HM 37 vs 40) → manual adds/deletes happened.
5. Tab is named `FB ALBUM CAPTION`; local `Code_v31.gs` has `ALBUM_SHEET = "ALBUM CAPTION"` → likely cause of the 100% trigger error rate (verify the deployed constant).
6. `FB ALBUM CAPTION`: 1,076 rows — posted 466 · duplicate 206 · error 45 · blank 359. Posted rows now Sold/Auction: 16. 19 rows have a PID no longer in inventory (renumbered; 6 map to a new Instock PID by name).
7. Inventory: Instock 1,337 · Sold 721 · Auction 405 · Hold 2. 310 Instock items are missing from the caption tab (rebuild needed).
8. R2: all 1,337 Instock PIDs have image 1 in the `R2 IMAGES` index; every caption Image URL = `library/<row PID>/1.jpg` (0 mismatches). HTTP check not possible from the container.
9. Instock Types with no album: `SPECIAL TECHNIC` (5), `TONBO MAGAZINE CHEAT & CODE` (9).
10. `FB ALBUMS` lists system albums (Photos 2,674, Mobile uploads, Cover photos, Profile pictures) with active=TRUE — any delete logic must use a hard allowlist of the 16 product albums only.

## Implication
"Keep-set" reconcile cannot run on hand-uploaded albums (it would delete all 451 photos). Recommended: reset album-by-album (owner deletes + recreates album, script re-syncs, clears Posted for that Type, reposts with captions), then add sold-photo deletion for script-managed albums only.
