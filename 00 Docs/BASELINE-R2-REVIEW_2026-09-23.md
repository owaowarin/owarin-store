# Step 2 — fresh image baseline and archive reconciliation

Verified 2026-09-23 01:06 Asia/Bangkok. Stream B, master context §2, §5, §6, §9. This is a read-only audit; it is not a cloud execution manifest.

## Current evidence

Canonical run: `04 Design Tools/logs/baseline_20260922-234553/`. Use **reports-v2/** for final reports; the root CSVs and reports/ are earlier analysis checkpoints, retained for traceability and superseded by reports-v2.

Authenticated Sheets API reads used the existing service account with the `spreadsheets.readonly` scope. Both tabs were read using metadata-derived, bounded identity/status/Type columns across the full allocated row range. The first read was 2026-09-22 23:48:31 and the confirmation read was 2026-09-23 01:04:22 Bangkok; the complete inventory digest was unchanged: `3680a78787c2bae3c675980c3bd9f789a34e38e8ab2a4cd5249d180c4dfb4a2e`.

| Evidence | Result |
|---|---:|
| GAME GUIDE BOOKS product rows | 1,613 |
| MAGAZINE product rows, all statuses | 852 |
| Total products | 2,465 |
| Master images, fresh SHA-256 | 2,913 / 860,194,527 bytes |
| Previously archived images, fresh SHA-256 against move journal | 164 / all hashes match |
| Preservation set (master + exact prior archive journal) | 3,077 files / 897,894,338 bytes |
| Image format/extension verification errors | 0 |
| Candidate mapping image rows | 2,892 |
| Candidate key collisions / source ownership collisions | 0 / 0 |
| Unassigned master images in strict shared check | 21 |

The preservation manifest includes all allowed master images plus the exact historical archive set. It does not recursively include unrelated Archived or Instock folders. The candidate mapping includes review cases and must not be fed directly to an uploader. `EXACT-ROUTE-CHECKED` means local filename/routing/position checks passed; it does not verify existing R2 content or authorize replacement. No fresh remote inventory was read in this phase.

## Correction to the previous archive rationale

All **164** archived images have exact current MAGAZINE references with **Sold** status. The earlier 576-row MAGAZINE view covered Instock only, so the prior statement that these files had no live Sheet reference was based on incomplete data. This audit establishes the missing status coverage; it does not infer which UI/export setting caused it.

All archive bytes match their pre/post-move hashes. No archived image in this journal matches an Instock or New Arrival row. Four archived images also have byte-identical copies in master; the other 160 do not have a same-hash master copy. Preserve the archive paths and references in the private-backup plan. Do not automatically restore everything or treat Sold as permission to delete public URLs.

Detailed evidence: `reports-v2/archive-reconciliation.csv` and `reports-v2/preservation-manifest.csv`.

## Priority exceptions: 34 Instock + 1 New Arrival

All 35 have files or explicit candidate paths. The report does not claim those candidates are automatically approved.

| Class | Instock | Required next action |
|---|---:|---|
| Folder matches but filenames disagree | 3 | Review exact rename/alias proposal below; do not silently borrow another edition |
| Punctuation/title normalization only | 6 | Record exact identity-bound aliases, or review a collision-safe normalization plan |
| Positions are 1,3 | 5 | Confirm whether page 2 is missing or filenames are misnumbered before changing positions |
| Category routing incomplete or cross-root | 20 | Register reviewed routes/bindings; physical file moves are unnecessary |

Three folder/filename cases:

- `OWA-GGBF033AR01` — Final Fantasy Tactics Advance (RESTOCK-01): its exact folder contains `Final Fantasy Tactics Advance (1).jpg`, missing RESTOCK-01 in the filename. The non-restock title also exists, so global name matching is ambiguous.
- `OWA-GGBH036FGAN00` — Heroes of Might and Magic IV (Incl. Unit Data): folder matches, but filenames start `Heroes IV of Might and Magic (Incl. Unit Data)`; two images.
- `OWA-GGBY003YKAR03` — Ys VI：The Ark of Napishtim (RESTOCK-03): folder matches, but two filenames omit `VI`.

The five Instock position-gap products are Onimusha：Dawn of Dreams (RESTOCK-03), Silent Hill (RESTOCK-01), Super Robot Wars Alpha (RESTOCK-01), Valkyrie Profile 2：Silmeria (RESTOCK-04), and Xenosaga Episode I：Der Wille zur Macht (RESTOCK-01). Four additional gap products are Auction; all nine remain listed in the full exceptions report. A missing number is not proof that the book lacks a physical photo, nor permission to remap 3 to 2.

The 20 route cases comprise 5 SPECIAL TECHNIC, 9 TONBO MAGAZINE CHEAT & CODE, 1 Tonbo title typed GAME GUIDE BOOKS but stored under the Tonbo root, and 5 Other/Mast Culture titles outside the default Other folder. The candidate report supplies their exact paths and hashes.

The New Arrival exception is `OWA-MAGT022AMAN00`, **TV Magazine vol 54**: at confirmation, `MAGAZINE!W838` (Type) is blank. Existing peers use `TV MAGAZINE`; that is a proposed value to confirm before any Sheet edit. Re-resolve Product ID before editing because row positions can change.

Exact 35-row list: `reports-v2/priority-exceptions.csv`. Candidate file paths: `reports-v2/alias-and-route-review.csv` (Approved remains False). All statuses, including Sold/Auction/Hold, remain in `reports-v2/products.csv` and `reports-v2/exceptions.csv`.

## Rename evidence and limits

All 327 rename-plan target paths resolve either in master or through the exact archive move journal; original paths no longer exist. For 135, an earlier Instock manifest provides a pre-rename hash and the current hash matches. For 192, no pre-rename byte hash is available, so only current path/hash and rename journal evidence can be claimed. Eight records share basenames across different folders; the old result log omitted directory paths. Full-path dry-run records and matching aggregate result counts reconcile them, but do not manufacture per-path historical hash evidence.

An initial verification incorrectly expected every basename result count to be one. It correctly failed on these eight records; the final verification compares planned and completed multiplicities and explicitly retains the basename ambiguity. No source image was changed to make this check pass.

## Offline worker hardening completed; production activation remains gated

At 2026-09-23 01:30 Bangkok, the first four defects above were repaired and covered by offline checks:

1. Dry-run now writes only a `previews/<batch>/preview.json` receipt. It cannot append result rows or change the durable ledger, including a `PENDING_REPORT` or `FINALIZING` checkpoint.
2. Snapshot preview returns failure when any mapping issue exists; unresolved rows cannot be reported as a successful preview.
3. Finalize can recover a verified destination from a `PLANNED` rename journal and rewrites the journal as `COMPLETED-RECOVERED`.
4. Startup now refuses to ignore the legacy ledger. `--migrate-state-from` performs an explicit locked copy with per-file SHA-256 verification and retains the source.

The full 35-row review set is now materialized at `04 Design Tools/logs/worker_hardening_20260923-012809/priority-route-alias-proposals.csv`; all rows remain `Approved=FALSE` and `MutationPerformed=NONE`. It proposes nine Product-ID aliases, six Product-ID route overrides, two type routes covering 14 products, five owner decisions for page gaps, and one blank-Type decision. `type-route-proposals.csv` contains the two shared route rules. No alias, route, Sheet value, worker state, photo, R2 object, deployment or scheduler was changed.

`verification.json` in that folder records file hashes and four passing checks: Python compile, worker self-test, image/exporter integration, and PowerShell parse. Production activation remains blocked on owner review of the proposals, implementation of approved identity-bound rules and complete-batch validation, an explicit live ledger migration decision, and later R2 inventory/archive planning.

## Continuation: local image bindings, 2026-09-23 01:49 Bangkok

The next authorized local implementation used a fresh connected-Sheet read of the complete `GAME GUIDE BOOKS` and `MAGAZINE` identity/status/Type columns. All 35 priority identities and statuses still matched the prior proposal, including blank `MAGAZINE!W838`. The live values were exported into `04 Design Tools/logs/image_bindings_20260923-014408/` solely as read evidence.

`04 Design Tools/image-bindings.csv` now pins 31 current master image paths and SHA-256 values to 29 Product IDs. The shared matcher checks the live Sheet title/Type and image hash before using a binding, and reserves each bound file from other products. It also routes the `SPECIAL TECHNIC` and `TONBO MAGAZINE CHEAT & CODE` types to their reviewed roots. The Instock exporter now uses the strict shared matcher without generic folder or normalized-name fallback. `audit-image-baseline.py` recognizes the bindings for the next full baseline refresh.

Full offline checks against the fresh Sheet export and a new hash read of all 2,913 master images found zero unresolved Instock products and zero cross-product source ownership collisions. The Instock preview selected 1,333 products and mapped 1,933 images. Ten product mapping results changed: nine intended aliases now map, and one Sold base edition (`OWA-GGBF033GBPAN00`) changed from ambiguous to its own two-file folder because the RESTOCK image is reserved for its own ID. See `before-after.csv`, `all-product-before-after.csv`, `image_library_check_20260923-014758.csv`, and `instock_snapshot_dryrun_20260923-014917.csv` in the run folder.

Six priority decisions remain: five Instock page sequences with positions 1,3, and the blank Type for `OWA-MAGT022AMAN00` / `TV Magazine vol 54`. No value was written to the Sheet. The old `reports-v2/` baseline remains historical evidence, not an updated post-binding report; regenerate it after those decisions. The worker still needs complete-batch validation and an explicit live-ledger migration choice before activation. No cloud/archive action was taken.

The Apps Script add-on `R2Upload.gs` now verifies all 14 request fields on queue read-back rather than only Request ID and Batch ID; its request-contract test includes a wrong-Type read-back. This strengthens enqueue confirmation but does not let a worker prove that a later queue read contains every expected row. An immutable batch count/digest contract is still required before production use.

## Six-item recheck, 2026-09-23 02:22 Bangkok

The owner reported correcting the five page sequences and the TV Magazine row. A new read of both live inventory tabs confirmed the five GGB Product IDs remain Instock. `OWA-MAGT022AMAN00` / `TV Magazine vol 54` is now Instock with Type `TV MAGAZINE` at `MAGAZINE!W838` (previously New Arrival with blank Type). The shared strict matcher rescanned and freshly hashed all 2,913 master images: each of the five GGB titles now has positions `1,2`, and TV Magazine vol 54 has position `1` under `All - MAGAZINE/TV Magazine`. No `POSITION-GAP`, missing match or source-owner issue was returned for these six; all 11 selected files passed image-format verification.

Exact per-item before→after values, paths and SHA-256 values are in `04 Design Tools/logs/six_pending_recheck_20260923-022058/six-item-recheck.csv`; `summary.json` records six passes and zero manifest issues. This closes the six previously pending local-data exceptions as of this check. It does not change the historical `reports-v2` counts or certify the current entire library for upload; complete-batch validation, ledger migration and a post-change full baseline still remain.

## Verification and next step

`reports-v2/verification.json` records a second fresh read of all 3,077 selected files and unchanged hashes/bytes, inventory confirmation, complete product coverage, rename reconciliation and report digests. PowerShell fixture tests passed, including a same-size/same-mtime byte edit detected by ForceRehash. No photo rename/copy/move, Sheet write, R2 operation, deployment, scheduler change or runtime-ledger migration occurred.

Next: review/approve the 35 proposals, especially the five page gaps and blank Type at the row currently identified as MAGAZINE W838. Re-resolve Product ID before any Sheet edit. Then implement only approved identity-bound rules, migrate or explicitly retain the old ledger, refresh the baseline, and prepare Step 3's exact remote inventory/private archive/rebuild plan. Do not clear a bucket or run rclone sync.

## Post-correction baseline and read-only R2 preview — 2026-09-23 02:56 Bangkok

The earlier `reports-v2` and 35-proposal narrative above are historical. The current canonical local report is `04 Design Tools/logs/baseline_postfix_20260923-024444/reports/`. A fresh complete Sheet read and confirmation have the same digest (`9a287fb1266dbce51f068f2fd1b635dc80e1b3d5467c6fed2e37f500d6191311`) across 2,465 product rows. All 2,913 master images and the 164 exact archived-journal images were SHA-256 rechecked; `verification.json` records 3,077 fresh byte rechecks and status `BASELINE-VERIFIED-NOT-PUBLISH-AUTHORITY`. Image-format errors, candidate-key collisions, source-owner collisions, and Instock/New Arrival exceptions are all zero. Product states are 1,853 `EXACT-ROUTE-CHECKED`, 444 `NO-FILES`, 168 `NEEDS-REVIEW`; the latter two are non-priority statuses. The 4 remaining position gaps are Auction, not the six owner-corrected items. Candidate mapping has 2,905 image rows. No local photo or Sheet data was changed.

An actual **read-only** `rclone lsf --fast-list` of `r2:owarin-images/library` returned 2,700 objects / 795,355,391 listed bytes. Exact key/size comparison against the 2,905 local candidates produced 436 `LOCAL-ONLY` (428 Instock, 8 Auction), 231 `REMOTE-ONLY`, 158 `SIZE-MISMATCH` (153 Instock, 5 Sold), and 2,311 `SAME-SIZE-NOT-BYTE-VERIFIED`. Among remote-only objects, 160 Sold keys have Product IDs present in the verified local archive journal, 52 have no current Sheet Product ID, 12 are Instock, and 7 are Auction. These relationships do **not** prove matching bytes or permission to remove old public keys. `remote-preview/remote-inventory.csv`, `key-size-comparison.csv`, and `reconciled-inventory.csv` preserve the complete read-only evidence; the first failed reconciliation attempt used PowerShell's reserved `$PID` variable, was immediately regenerated with `$productId`, and the final row counts/hashes were checked. No remote read included object-content hashes. Before any replacement or retirement, preserve and verify exact remote before-image bytes in a confirmed private destination and review public URL dependencies. No R2 write, delete, or move occurred.

The offline EXPORT_INSTOCK request contract now uses scope `r2-hybrid-v4`, recording `COUNT:<N>` and a deterministic SHA-256 over all other queue fields in the existing `Plan ID`/`Plan hash` columns. The worker checks the full batch before processing or retry-report writes. Apps Script and Python produced the same two-row test vector; missing/tampered rows and legacy scope fail the worker self-test. The existing live queue/ledger is still v3/READY and cannot be silently replayed by this v4 worker. Do not activate it until an explicit fresh requeue/legacy-ledger decision and the normal credential/deployment gates. No queue, ledger, deployment, scheduler, or public index was changed.

## Live index/consumer audit — 2026-09-23 04:06 Bangkok

A fresh read of the actual `r2:owarin-images/meta/images.csv` matched the live `R2 IMAGES!E:G` import **row-for-row**: 1,816 unique `pid,n,ext` rows. A fresh R2 `library/` listing contained 2,700 keys. The index expects 2,696 exact keys; all exist. The four unindexed keys are old duplicate `.png` objects for `OWA-GGBD045BRBN00` and `OWA-GGBD049FWAN00`, while the index chooses their `.jpg` peers. Preserve them pending link review; the absence of an index reference does not prove no public URL uses them. There are 31 indexed Product IDs absent from the current Sheet product list; do not delete their 52 public keys on that basis.

The live `R2 IMAGES!B2:C2` formulas construct `/1.jpg` and `/2.jpg` regardless of the index's `ext` value, and `Code_v22.gs`'s `_imageUrl(pid)` likewise constructs `/1.jpg` for Meta/FB outputs. Compared against the actual R2 keys, the Sheet formulas produce **67 missing `.jpg` URLs across 39 current products**, all of which have corresponding `.png` keys. The affected products are 19 Instock (31 links), 11 Auction (19), and 9 Sold (17). `R2 IMAGES!A55:C55` was directly read as an example: `OWA-GGBB010YKBR02` displays two `.jpg` URLs while its live index says `png` and R2 has the `.png` keys. The Shopee builder reads the `ext` column, so this specific hardcoded-jpg defect is in Sheet formulas and the back-office helper, not its URL-construction function. Exact affected cells/keys are in `remote-preview/formula-link-risks.csv` and `formula-link-product-summary.csv`.

The live `R2 JOBS` tab still contains one 1,333-row `EXPORT_INSTOCK` batch with scope `r2-hybrid-v3`; its `Plan ID`/`Plan hash` fields are empty. The local durable ledger is `READY`. It is historical input, not compatible with v4 and must be explicitly superseded/requeued or migrated with a reviewed receipt before the worker is enabled. `rclone lsd r2:` returned 403 `ListBuckets` AccessDenied, so this credential cannot establish whether a separate private archive bucket exists. Do not infer absence or privacy from that error. No R2/Sheet/queue/ledger content was changed; only local audit reports and documentation were written. No stale artifact met the reference-checked archive rule in this session, so none was moved.

## Owner's Cloudflare account screenshot — 2026-09-23 14:09 Bangkok

The owner selected the Cloudflare R2 account shown in the screenshot; it visibly lists `owarin-images`. This is the existing public image bucket, not a private archive destination. Cloudflare's [public bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/) says enabling an `r2.dev` public URL makes bucket contents internet-accessible, and [bucket documentation](https://developers.cloudflare.com/r2/buckets/create-buckets/) says newly created buckets are private by default. Therefore putting old images under `archive/` within `owarin-images` would not make them private. Keep `owarin-images` and its public URLs unchanged; the safe archive design uses a separate private bucket in this same account, with no public `r2.dev` or custom domain. The screenshot is point-in-time evidence, not proof of all current bucket settings.

The Cloudflare dashboard opened in Codex's in-app browser but redirected to its login page; authentication was not attempted. The existing R2 S3 credential still cannot enumerate buckets (`ListBuckets` 403), so no private archive bucket was created or verified. Before creation or copying, the owner must sign into that dashboard session and confirm a new private archive bucket in this account. No Cloudflare setting, object, Sheet row or local source photo was changed.

Update 2026-09-23 14:15 Bangkok: after the owner signed in, the live R2 Overview in the same Cloudflare account showed only `owarin-images`. Its bucket detail displayed `Public Access: Enabled`. The new-bucket form is prepared with name `owarin-images-archive`, Automatic location (UI selected Asia Pacific), and Standard storage class; the form says new buckets are not publicly accessible by default. **Create bucket has not been clicked.** The form is left open for owner confirmation. No existing bucket/object, access setting, Sheet or local photo was changed.
