# R2 Hybrid — full rebuild, commanded New Arrival uploads and Instock snapshots

Status: BASE ARCHITECTURE, revision 3, 2026-09-22; implementation has progressed since this initial design. For current incremental-check architecture, code-review findings and the next implementation phase, read [DESIGN-R2-INCREMENTAL_2026-09-22.md](DESIGN-R2-INCREMENTAL_2026-09-22.md). Dated sections below retain their historical evidence; they are not a fresh deployment/inventory report. Revision 2 introduced explicit Apps Script commands; revision 3 adopts the owner's renamed master folders and adds a separate commanded Instock snapshot export.
Stream B; rules: master context §2, §5, §6, §9 and current AGENTS.md. Design uses Ponytail full: reuse existing mapping/index tools; one Windows worker; no new cloud service or message broker.

## 1. Decisions

- Keep public keys `library/<Product ID>/<position>.<actual extension>` and current public base. Do not introduce `current/` or rename existing keys: existing consumers depend on them.
- Archive means **verified copies before replacement or retirement**. Retain still-used public objects/URLs; moving old objects out of `library/` can break existing URLs. Remote removal requires the exact retirement report in §4.1, not a blanket bucket clear.
- Proposed separate R2 bucket `owarin-images-archive`, private (no r2.dev or public custom domain), no automatic expiry. This bucket has NOT been created; name, access and capacity must be checked at execution time.
- First rebuild the full selected source set, across all inventory statuses: audit local candidates, preserve old remote objects and local originals, reconcile every source against its PID, replace approved changed objects and rebuild the verified index. No pre-upload wipe. Unmatched photos still get preserved privately, but never assigned a guessed PID. Identical bytes can be verified/reused; “full rebuild” is complete scope reconciliation, not unnecessary retransmission.
- Daily workflow: owner places photos and sets `New Arrival`, then runs an Apps Script command. The command snapshots eligible rows into `R2 JOBS`; Windows checks only that request queue every minute and uploads only requested targets. No request means no upload. Product Status remains unchanged.
- V1 interface is a bound Apps Script submenu in Google Sheets: `📦 Inventory Tools → R2 Images`. The same entry functions can be run from the Apps Script editor. A button in the separate HTML Web App is optional presentation of the same enqueue operation; an anonymous worker API is unnecessary.
- Normal `UPLOAD_NEW_ARRIVAL` is **add-only**: same content is a no-op; different content at an existing key/position is `CONFLICT`. Only `FULL_REBUILD_COMMIT` may replace the exact keys approved in a reviewed immutable plan, after verified before-images and a cache plan. No command means “delete everything first”.
- Master sources are now ONLY `All Products/All - GGB` and `All Products/All - MAGAZINE`. `All Products/Archived` stores unused material. `Instock` and `Instock - <date>` are derivative local copies, never input to R2 uploads or other exports.
- Add `Export Instock Snapshot`: explicit Apps Script request → read the live `Instock` rows in both tabs → Windows copies their matching original images and directory hierarchy → verify → rename working `Instock` to `Instock - dd-MM-yyyy`. This action does not upload to R2 or edit stock Status.

## 2. Evidence and limits of this design

Project root (all paths below are relative to this root unless stated otherwise):
`C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE`

Read-only checks made on 2026-09-22:

- R2 `rclone lsf r2:owarin-images --max-depth 1` succeeded (exit 0) after network permission: `_to_delete/`, `library/`, `meta/`. No top-level `archive/` or `catalog/` was returned. This is NOT a recursive inventory, integrity check, or proof of write permissions.
- No live sheet rows, formulas, OAuth permissions, Apps Script deployment settings, R2 lifecycle rules or bucket privacy settings were read. No claim about current New Arrival counts or live deployment version is made. Refresh all these prerequisites before an actual run.
- Local current documented code is `Code_v22.gs` + `WebApp_v22.gs` + `R2Upload.gs` + `Index.html`; v22 is locally tested but not deployed. HANDOFF_2026-09-20 records New Arrival as the Add Item UI default, but does not establish that the local change was deployed.
- Revision 1 image scan (before the owner's move) excluded `_to_delete`, `_archive`, `OLD PRESET` and counted `.jpg/.jpeg/.png/.webp` in the 22 selected categories: **3,075 files / 897,336,513 bytes (~897 MB / 0.836 GiB)**. The table below records that pre-move scan, not a refreshed per-category inventory. Its parent aliases `GGB-All` / `Magazine` now correspond to `All - GGB` / `All - MAGAZINE`. Earlier chat's 3,305 included excluded directories and must not be used as the baseline.
- Revision 3 filesystem check after the owner's move: `All - GGB` has 2,234 files / 665,824,762 bytes, `All - MAGAZINE` 841 files / 231,511,751 bytes; `Archived` has 954 files / 1,021,009,370 bytes. Working `Instock` has 0 files; its empty branches were corrected to `All - GGB` / `All - MAGAZINE` on 2026-09-22. These are directory-entry counts, not hash verification or current Sheet Instock counts. All six GGB and sixteen magazine categories remain present under the new roots.
- This is a filesystem listing, not a byte-read or image-decoding check. OneDrive placeholders may still fail to open. Unsupported extensions must be inventoried in implementation, not silently omitted.

| Parent | Exact folder | Images |
|---|---|---:|
| GGB-All | GGB - CHEAT & CODE | 36 |
| GGB-All | GGB - GAME GUIDE BOOKS | 2,051 |
| GGB-All | GGB - GAMEMAG SPECIAL | 103 |
| GGB-All | GGB - GAMEMAG TOP SECRET | 26 |
| GGB-All | GGB - SPECIAL TECHNIC | 5 |
| GGB-All | GGB - TONBO MAGAZINE รวมบทสรุป | 13 |
| Magazine | A・Club | 33 |
| Magazine | Game Magazine | 0 |
| Magazine | GAMECOM | 1 |
| Magazine | GAMEMAG Magazine | 29 |
| Magazine | GAMER EXTREAM | 8 |
| Magazine | Hobby | 320 |
| Magazine | Mast Culture | 6 |
| Magazine | MEGA Magazine | 30 |
| Magazine | MEGA MONTH | 156 |
| Magazine | MEGA⨯GAME | 183 |
| Magazine | Other | 3 |
| Magazine | Play | 4 |
| Magazine | Tonbo Magazine | 8 |
| Magazine | Tricks Master | 1 |
| Magazine | TV Magazine | 15 |
| Magazine | TV Magazine - Hero | 44 |

`Hobby` contains `Hobby Japan`, `Hobby Model`, `Hobby Model and Toy`. Some categories are flat files; others have product or deeper category folders. “Find a folder with the same name” alone is insufficient.

## 3. Reuse and required repairs

| Existing file | What to reuse / change during implementation |
|---|---|
| `04 Design Tools/build-r2-library-mapping.ps1` | Root updated to `All Products/All - GGB` on 2026-09-22 and syntax-checked. Reuse exact filename suffix parser, PID key format and 4 known GGB Type mappings. Next: fail on a missing root, then extend to both tabs/categories using fresh authenticated rows and offline test input. It remains GGB-only, uses public gviz export, silently skips unknown Type and does not check rclone exit status. |
| `04 Design Tools/build-r2-images-index.ps1` | Reuse `pid,n,ext` serialization, mixed-extension handling and comparisons. Currently generalizes “jpg wins” from two historical cases and counts positions without detecting gaps; both are unsafe for new cases. Check exit status, uniqueness, exact key case and contiguous positions; fail/report ambiguous new cases. Do not automatically publish a full-bucket scan that includes partial uploads. |
| `04 Design Tools/new-arrivals-to-folders.ps1` | Default updated to `All Products/All - GGB` on 2026-09-22 and syntax-checked. It MOVES files from Downloads: never invoke for Instock copy or as part of R2 upload. Reuse only Type/name rules; source-photo organization is separate. |
| `04 Design Tools/export-instock-snapshot.ps1` | Implemented dry-run, guarded `-Commit`, and separately revalidated `-Finalize` on 2026-09-22. It accepts freshly exported GGB/MAGAZINE CSVs, selects exact `Instock`, scans only the two master roots, preserves master-relative paths, checks collisions/free space, copies without overwrite, verifies source/target SHA-256, writes a resumable manifest, requires the fresh plan hash to match before finalization, and renames only the outer Instock folder. Exact filename is preferred; bare single-image filenames, exact product-folder fallback and a unique normalized filename fallback are supported and logged. It does not upload to R2 or write to Sheets. |
| `03 Apps Script/Web App/prepare_r2_upload.py` | Legacy catalog/resizing flow with old source path. Do not use for this library upload, which preserves bytes and extensions. |
| `03 Apps Script/Web App/Code_v22.gs` | `_imageUrl(pid)` hardcodes `1.jpg` and feeds Meta export / contents paths. Requires focused compatibility repair before declaring all image consumers ready for PNG/mixed inputs. |
| `Shopee/build_shopee_upload.py` | Already reads ext and constructs positions 1..n; therefore `{1,3}` cannot be represented correctly by current index. Missing ext fallback to jpg is not validation. |
| `00 Docs/IMAGE-LIBRARY-RULES.md` | Exact names, Unicode and actual-extension rules apply. Its old `rclone sync` instructions conflict with current AGENTS/master §5.1: do NOT follow them. Update the stale instructions when the new workflow is implemented. |

Never rename source folders, normalize punctuation away, re-encode images or renumber PIDs to make mapping pass. Old documents are evidence, not executable authority. No stale-file move is needed to produce this design; reference-bearing files remain in place.

## 4. Initial migration and archive procedure

**Overwrite risk:** plain `rclone copy` can replace a different file at the same key. Copy is not a versioning policy; never run an unrestricted whole-root copy or sync against the public bucket.

Proposed storage layout:

```text
owarin-images (existing public bucket)
  library/<PID>/<position>.<ext>        existing public contract
  meta/images.csv                     pid,n,ext; existing compatibility index
  _to_delete/...                      existing objects left in place

owarin-images-archive (new PRIVATE bucket, proposed)
  baseline/<run-id>/remote/<original-key>
  baseline/<run-id>/source/All Products/All - GGB/<original-relative-path>
  baseline/<run-id>/source/All Products/All - MAGAZINE/<original-relative-path>
  runs/<run-id>/before/<original-key>   e.g. previous meta/images.csv
  runs/<run-id>/manifest.json          no credentials; before/after digests
```

Run ID includes UTC timestamp plus random suffix; resuming a run reuses its ID. It is never a bare date shared by unrelated runs. Archive is ordinary retained object storage, not a claim of a special cold-storage tier or free storage.

1. **Preflight / dry-run:** fetch both sheet tabs through authenticated Sheets API; identify headers dynamically (existing inventory headers are not necessarily row 1). Recursively list the remote with errors fatal; record all keys, sizes and available validators. Record a manifest of exact selected source files with byte count and SHA-256. List additions, matches, conflicts, unreadable/unsupported files, missing mapping and source-only/remote-only objects. No cloud writes in dry-run; local reports are allowed.
2. **Quiesce writers:** during the baseline and any index publication, this worker is the sole writer. Other upload scripts/manual R2 writes must be paused. Reads and existing public links continue. Re-read validators before writes; if remote contents changed, invalidate the relevant plan. There is no cross-object transaction to assume.
3. **Snapshot remote:** copy the explicitly enumerated existing remote object set into the private baseline, preserving original keys (including existing `_to_delete/`). Do not copy bucket root into its own descendant. Inventory lifecycle/access configuration separately; an object copy does not back up bucket settings.
4. **Verify archive:** compare every expected source/destination object and actual content. Use common trustworthy checksums when available; otherwise stream/download and hash (`rclone check --download` for equivalent trees). Sizes/counts alone and arbitrary S3 ETags are insufficient. Baseline is complete only after all remote objects verify and the source inventory remains stable.
5. **Preserve local originals:** copy every allowed image from the exact 22 folders into the private source snapshot with original relative names and bytes, including photos not mapped to a sheet row. Snapshot manifest records empty folders such as Game Magazine; do not invent image objects for empty folders. Verify full content; explain any unreadable files instead of claiming “all uploaded”.
6. **Rebuild public library:** enumerate all allowed source photos regardless of Status; classify keys `UNCHANGED`, `ADD`, `REPLACE`, `LEGACY_REFERENCED`, `RETIRE_CANDIDATE` or `UNRESOLVED`. Upload only manifest-approved PID mappings. For the full rebuild, changed bytes may replace the reviewed existing key only after its old bytes are archived and verified; ordinary New Arrival requests never inherit this replacement permission. If a position changes extension, publish the chosen actual extension in the candidate index and retain the previous key as a compatibility object until retirement review. Unknown mapping remains privately preserved and visible in the exception report.
7. **Publish index last:** start from the freshly fetched current `meta/images.csv`, preserve unaffected rows, merge only fully verified product groups and validate the resulting `pid,n,ext`. Copy the previous index to private `runs/<run-id>/before/meta/images.csv` and verify it before publishing the new one. Recheck the old index validator immediately before publication; mismatch => stop/replan. Verify the new index by reading it back.
8. **Compatibility check / finish:** check each new public URL and real content type, then the Sheet index consumer, FB URL generation and Shopee builder on representative jpg/png/mixed products. Record pending formula/cache refresh separately. Source/archive success is not the same as storefront-ready.

Remote-only old photos are not automatically removed just because they are absent locally or Sold. The initial rebuild reconciles and updates the full current collection; residual legacy objects are classified for separate retirement. No destructive cleanup is executed by the baseline upload routine.

### 4.1 What “clear old files” means, and cutover limits

**Link-loss risk:** removing an old R2 key can produce 404s in previous posts/listings even after a new index is published. Keeping a private archive alone does not preserve the public URL.

Order: local audit → exact cleanup/rebuild plan → verified remote archive → stable staged new set → publish approved images → publish verified index → validate consumers → review residual legacy objects. Never clear the existing library while the replacement only exists on the PC.

For a replacement under an existing URL, direct readers see the new bytes as soon as that object is written; “index last” is NOT atomic cutover of the whole library. Use a maintenance interval, verify per product, and keep a per-key restore manifest. A failure can require restoring replaced objects AND the index; restoring only the index cannot undo image-byte changes. This design does not promise zero-downtime atomic bulk replacement. Cache invalidation/revalidation must be planned against the actual serving domain before replacement.

Retirement report records exact old key, verified archive key/digest, replacement key if any, Sheet/index/code references, known exported feeds/post references and decision. Absence from the current Sheet cannot prove absence of external links. Unknown references default to `KEEP_LEGACY`; do not infer deletion permission from a filesystem folder name, age, or Sold status. To remove legacy public keys, the owner must accept the enumerated link impact after archive verification. Do not issue broad sync/delete/purge or automatic lifecycle expiry. Current task authorizes design/review only, not physical cleanup.

### 4.2 Local folder cleanup and future-run impact

Use a positive allowlist of the 22 selected category folders under `All Products/All - GGB` and `All Products/All - MAGAZINE`. Exclude `Archived`, `_archive`, `_to_delete`, OLD PRESET, `Instock`, `Instock - *`, staging and logs; never recursively scan All Products or the project root as a source. Resolve two configured master roots and validate path containment rather than relying on exclusions alone. These controls keep archived/staged/exported copies out of future runs.

| Category / evidence | Planned handling | Effect if not separated |
|---|---|---|
| Correct live source photo | Keep exact name/path and actual bytes | Available for current/future matching |
| Exact duplicate inside active scope, verified same SHA-256 AND same source/PID/position meaning | Retain the canonical Type/name path; archive the redundant copy with path log after reference checks | Ambiguous mapping, wasted scanning or re-upload risk; never deduplicate different books just because bytes match |
| Same/similar name, different bytes or different RESTOCK/PID | `NEEDS_REVIEW`; owner chooses canonical photo | Wrong edition/condition could be uploaded; never choose newest date automatically |
| `_r2_upload/_v3`, `_v4`, `_v5`, `library`, `catalog`, `_r2_backup`; `All Products/Archived`; working/dated Instock outputs | Exclude. The owner already moved old material; do not move it again or assume all content is disposable. Inspect references and unique files before future cleanup | If excluded correctly, no upload impact; broad scans can republish stale sets and duplicate snapshots |
| Sold, Auction, Hold or a photo with no current Sheet match | Keep/preserve; report mapping separately | Sold is not equivalent to obsolete, and missing rows can be temporary |
| Empty category folder | Keep; manifest can record it, no fake R2 image object | No material upload impact |

Owner's actual local archive is `All Products/Archived` (not `Archive`); preserve that spelling and existing content. Future recoverable moves use a unique run subfolder with original relative paths under it, outside both master roots; do not merge destructively. Before moving: inventory → hash/canonical decision → search references → update approved references → dry-run/log → reviewed move → rescan. Owner's source-root renames invalidate previously prepared upload manifests; rebuild them against new paths. This design does not classify individual photos as unused: no full byte/hash or live-sheet audit was performed. Local Archived is not the private R2 archive bucket, and its entire contents are not automatically included in R2 upload scope.

After initial cleanup/rebuild, generate a new clean staging directory per run and upload only its explicit manifest; never reuse the entire `_v5` or `_r2_upload/library` tree. Deleting a local file does not implicitly delete its R2 copy. A later full rebuild must still report remote-only keys rather than removing them silently. Thus cleanup improves clarity but does not become a repeated prerequisite before every New Arrival command.

## 5. Apps Script commands and request-driven New Arrival flow

```text
Owner: add book + final PID/Type/name in Sheet; place complete photos in All Products
    → click Inventory Tools → R2 Images → Upload New Arrival
    → Apps Script snapshots New Arrival identities/input fields into R2 JOBS
    → Windows Task Scheduler checks R2 JOBS every minute; empty queue = no work
    → re-read and validate ONLY the requested GAME GUIDE BOOKS / MAGAZINE rows
    → exact match, validate, stage a stable copy, calculate manifest hash
    → upload new keys / verify existing keys / report conflicts
    → verify complete product → backup + publish compatible index
    → write IMAGE UPLOADS result + URLs to Sheet
```

`New Arrival` determines eligibility AT THE CLICK, not authorization to auto-upload later arrivals. The owner clicks after preparing the photos. Rows added after the request require the next click. On the current request, freeze the photo manifest once the worker stages it; subsequent additions need another request. A failed/missing-photo request is reported, not kept watching the folder indefinitely. Network retries/resume stay within the same request and frozen manifest.

Submenu contract (EXPORT_INSTOCK + results viewer implemented locally in v22; remaining actions not implemented):

| Menu action | Function | Behavior |
|---|---|---|
| Preview Full Rebuild | `r2PreviewFullRebuild` | Queue `FULL_REBUILD_PLAN`; Windows audits ALL allowlisted folders and all inventory statuses; report only |
| Apply Reviewed Rebuild | `r2ApplyReviewedRebuild` | Queue `FULL_REBUILD_COMMIT` tied to the displayed plan ID/hash; only that plan's approved additions/replacements, no bulk deletion |
| Upload New Arrival | `r2UploadNewArrivals` | Queue `UPLOAD_NEW_ARRIVAL` for both tabs' current New Arrival rows; no automatic replacement |
| Export Instock Snapshot | `r2ExportInstockSnapshot` | Queue `EXPORT_INSTOCK` with both tabs' current Instock rows and snapshot-read time; copy to a dated local folder only, no R2 write |
| View Upload Results | `r2ShowUploadResults` | Open worker results; queued/working/failed/done are distinct |

Use `R2Upload.gs` and the small insertion in the EXISTING `onOpen()` at `Code_v22.gs`; do not define a second competing onOpen. It reuses `_resolveColumns`, `_withLock` and `_tryWrite`, treats `_tryWrite=false` as failed unless the exact IDs read back, validates the full batch, and blocks an identical double-click for two minutes. Code/WebApp were bumped together to v22 per AGENTS. The local request-contract test passes; no code has been deployed and no live technical tab/request has been created.

#### Minimal queue contract

`R2 JOBS` is append-only request data owned by Apps Script; Windows reads it, never writes it. `IMAGE UPLOADS` is result data owned by the single Windows worker; Apps Script reads it, never overwrites states. Source inventory is read-only for upload operations. There is no distributed shared-column lock to assume.

Request columns: `Request ID`, `Batch ID`, `Requested UTC`, `Mode`, `Source`, `Product ID`, `Item name`, `Type`, `Requested Status`, `Input fingerprint`, `Plan ID`, `Plan hash`, `Scope version`, `Snapshot read UTC`. One target row per product for New Arrival or Instock requests; all rows in an export batch share the successful read timestamp. Full-rebuild plan/commit uses one request for the fixed allowlist scope, never an arbitrary folder. Never put credentials/commands/absolute filesystem paths into request cells.

Enqueue under Apps Script lock; snapshot fresh rows, reject duplicate/missing PIDs, generate stable request IDs and append the batch atomically using Advanced Sheets `spreadsheets.batchUpdate` (explicit string values), wrapped in `_tryWrite`. On uncertain response, read back these IDs before retrying with the SAME IDs. Validate the complete expected batch/count before reporting queued. Use ordinary protected ranges; no manual sort/delete/edit of request rows. Required service setup belongs in deployment instructions, not an undocumented assumption.

Suppress duplicate pending requests for the same identity/fingerprint at enqueue. Worker also reconciles content hashes to make repeated completed requests harmless; a repeat click can still be meaningful when new photos were added to an unchanged New Arrival row. Worker processes batches serially under one machine mutex, rejects unknown modes/changed fingerprints, and records `(Request ID, Manifest hash)` before external writes. A `FULL_REBUILD_COMMIT` with missing/mismatched/stale plan hash is rejected rather than regenerated and applied silently.

Apps Script returns promptly with a batch ID and `Queued / waiting for PC`; it does not wait for the image transfer. Windows checks the queue about every minute while awake/online. If the PC is off, the request persists. Input changes while waiting produce `STALE` on pickup and require a new click. Polling itself never scans for unrequested New Arrival rows or adds targets to an existing batch.

The PC must be awake, online and able to read OneDrive files. Prefer an initial scheduled task running only in the signed-in owner's Windows session, with “do not start a new instance”; a manual run must obey the same machine-wide mutex. No listening local server, inbound port or remote desktop is needed. On resume, verify that an orphan transfer from the previous process is not still writing before starting another worker. Multiple machines/writers are out of scope.

### Readiness and matching contract

- Read by source tab + Product ID, never spreadsheet row number. Duplicate/missing PID blocks that product; duplicate global PID across tabs also blocks because the public key contains no tab name.
- Match exact `Item name`, with sheet Type mapped explicitly to a permitted category. Preserve `：／｜×⨯・` and RESTOCK suffixes; fuzzy/normalized matches are suggestions only, never upload authorization.
- Known four GGB Type mappings come from existing code. SPECIAL TECHNIC, TONBO and all MAG Type routes must be checked against fresh rows. Unknown Type => `NEEDS_REVIEW`, not a guessed category.
- Book-folder category: exact item folder plus matching filenames. Flat/nested magazine categories: match filename stem after stripping only final ` (N)` within the allowed category subtree. Multiple candidates for one PID/position => `CONFLICT`, even if byte-identical, until mapping is resolved.
- Enumerate .jpg/.jpeg/.png/.webp and report any other apparent image formats. Preserve actual file format and key case. Check extension/content agreement; a new format needs consumer compatibility, not silent renaming to `.jpg`.
- Reject zero bytes, inaccessible OneDrive files, junction/symlink escapes, unsafe PID path segments, separators, `..`, control characters and keys outside the configured bucket/prefix. Sheet strings must be passed as arguments, never interpolated into shell code. Use literal paths.
- Require position 1 and no gaps/duplicate positions for NEW published groups. Positions `{1,3}` are `NEEDS_REVIEW`; do not manufacture `2.jpg` or renumber. Mixed jpg/png is valid when each position is unique and the ext vector is exact.
- The contiguous-position rule is a public R2 index constraint, not an Instock filesystem-copy constraint: an otherwise unambiguous original set `(1),(3)` can be copied unchanged to Instock and reported as a warning. Do not reject/rename valid source files merely to satisfy an index unused by the export.
- Files must be stable across checks and staged bytes rechecked before upload. The Upload New Arrival click is the owner's readiness signal; status alone is not. Stability cannot prove an expected photo count: missing/unstable photos produce `WAITING_FILES` and require another click after correction. Do not continue discovering later photos under an old request. If strict completeness beyond the staged set is required, add expected-count input rather than claiming it is known.
- Changing a name/type/PID/status during work invalidates the input fingerprint. Re-read before upload and before index publication; on change, do not publish stale work or mark it current. Already uploaded new objects can remain logged as unpublished; a human Sheet edit is not locked by Apps Script locks.

### Technical states and retry

Create `IMAGE UPLOADS` only at implementation/setup time, in the existing workbook. This is a worker-owned technical tab, not extra columns forced into inventory Tables.

Fields: `Request ID`, `Batch ID`, `Source`, `Product ID`, `Item name`, `Input fingerprint`, `Manifest hash`, `State`, `Photo count`, `Cover URL`, `Image URLs`, `Run ID`, `Plan ID`, `Plan hash`, `Last checked UTC`, `Last success UTC`, `Error`. Keep per-request outcomes so a later request does not erase the previous audit trail.

Request with no result is `QUEUED` (waiting for PC); processing states are `READY` → `UPLOADING` → `VERIFYING` → `DONE`; exceptions `WAITING_FILES`, `NEEDS_REVIEW`, `CONFLICT`, `RETRY`, `STALE`. `FULL_REBUILD_PLAN` finishes as `PLAN_READY`, not upload DONE. Upload DONE means complete verified files + published/read-back index + confirmed result write. Until Sheet publication succeeds, local state is `PENDING_REPORT` and the next worker pass reconciles it. Missing files/mapping/conflicts are terminal for that request until the owner fixes them and clicks again.

Only the Windows worker writes this tab in V1; source tabs are read-only for it. Use exact sheet/range allowlists, literal/RAW value writes, and resolve records by stable identity each run. Do not overwrite formulas or `R2 IMAGES` import output. Retry transient network/rate-limit errors with bounded exponential backoff (up to 3 per run), then leave a visible recoverable result. Auth failures pause the batch; ambiguity does not self-resolve through retries.

Persist a small per-run manifest/journal locally with atomic file replacement and CSV before→after events. A crash after upload but before report publication resumes by reading remote objects/index, never by blindly repeating writes. `meta/images.csv` is published once per successful batch, not for every photo. Partial or conflicting products must never leak into an index rebuilt from a broad live bucket scan.

### 5.1 Instock local snapshot contract

Master folders remain the authoritative originals for every status. Instock is a dated selection for selling/content work, not another master. Only the top-level `Instock` name receives the date; its two roots and everything below them keep the master names and relative structure:

```text
All Products/
  All - GGB/<category>/<original relative folders and files>
  All - MAGAZINE/<category>/<original relative folders and files>
  Archived/...
  Instock - 22-09-2026/
    All - GGB/<category>/<selected original relative folders and files>
    All - MAGAZINE/<category>/<selected original relative folders and files>
```

Original root names, category/product folders, file names, Unicode, ordering suffixes and byte content remain unchanged inside the dated snapshot. For a flat category shared by many products, copy ONLY matching Instock files, not the entire category. For nested Hobby or book folders, retain the relative hierarchy and copy only the matched image set: never include a Sold sibling or another RESTOCK by copying an enclosing folder wholesale. Copy all matched original image formats, not just the cover. Never JPEG-convert, hardlink, symlink, or move originals. Copy auxiliary non-image files only if an explicit inclusion rule establishes they belong to the selected product; log excluded/unsupported entries.

Execution contract:

1. Apps Script reads both inventory tabs fresh and captures rows with trimmed canonical `Status = Instock`, including stable PID/source/type/name and read time. Exclude New Arrival, Hold, Auction and Sold; fail unknown/duplicate identities rather than guess. Queue a frozen batch using the same contract above. An empty eligible set returns `NO_MATCHES`, does not clear/create a misleading completed snapshot.
2. Worker revalidates queued inputs against live rows at pickup and before finalization; changed/missing rows yield STALE and require a fresh command. Photo mapping uses the SAME matcher/source configuration as R2, with export-specific validation. No live Sheet read means no export based on old CSVs.
3. Build the complete copy manifest and check accessible source bytes, path lengths, target containment, disk capacity, exact folder/file collisions and missing-photo exceptions. Output must not overlap either master or Archived. The request/source snapshot date, not completion time, controls the final name.
4. Working path is `All Products/Instock`, with empty `All - GGB` / `All - MAGAZINE` branches matching the masters. Use it only when empty except for that scaffold, or when an existing journal proves it is the SAME resumable job. Unknown files or another job => stop/report; never merge an old snapshot into the new selection, delete it, or silently rename it. Mark work in progress and keep its journal outside the image set.
5. Make real file copies, preserving last-write timestamps where supported, then verify SHA-256 and the complete expected relative path set. Source originals must remain unchanged. OneDrive availability, filenames and file bytes are checked; no success based on file length alone. Missing/ambiguous/failed selected products yield INCOMPLETE/NEEDS_REVIEW, not a completed dated export. Keep work resumable; partial results are not silently labeled complete.
6. After full validation, rename the SAME working directory to `Instock - dd-MM-yyyy`, using Asia/Bangkok and Gregorian year, e.g. `Instock - 22-09-2026`. Forward slash is invalid in Windows names. If that date already exists, use a distinct sequential suffix such as `Instock - 22-09-2026 (02)`, checking for collision under the worker lock; never overwrite the first snapshot. The next export can create a fresh Instock scaffold. An interrupted rename is recovered by the recorded run/final path and hashes, not by creating duplicate copies.
7. Report `EXPORTED` only after verifying final path, manifest and result write; this mode has no R2 upload/index prerequisite. Record full local output path, source-snapshot timestamp, copied-product/image counts and exception list in worker results/logs. Cloud-side UI displays the Windows path as text, not a public browser-download URL. Never publish a local filesystem path into the existing public `Cover URL`/`Image URLs` fields.

Add result fields `Local output path` and `Snapshot read UTC` (worker results only). Extend `PENDING_REPORT` recovery to local finalized exports so a Sheet write failure does not repeat copying. Normal output is a snapshot **as of the captured read**, not a live stock view: a later sale does not remove the copied photo. The owner runs Export Instock Snapshot again for a fresh view. Manual edits to a snapshot do not propagate back to All masters or R2.

Repeated snapshots consume real disk and OneDrive space. Retain old snapshots until the owner elects to archive them under Archived; do not add automatic deletion/retention. Instock export is independent of R2 migration/credentials and can be implemented/tested as its own bounded phase once live-sheet access and matching are ready.

Implementation checkpoint, 2026-09-22: after the owner corrected the four reported sources, live metadata and both inventory tabs were freshly read/exported again from spreadsheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. The committed plan selected all 1,333 Instock products / 1,933 image files with zero unresolved rows. All 577,189,525 bytes were copied and source/target SHA-256 verified; the tabs were exported fresh again and the identical plan hash was required before final rename. Completed output: `All Products/Instock - 22-09-2026/All - GGB|All - MAGAZINE`. Commit manifest: `04 Design Tools/logs/instock_snapshot_commit_20260922-185345.csv`; final log: `04 Design Tools/logs/instock_snapshot_finalize_20260922-185516.csv`. Source masters remain present and no Sheet/R2 write occurred.

## 6. Credentials and interface boundary

- Keep existing rclone connection on Windows; verify installed version and flags before relying on them. R2 credentials stay out of HTML, Sheet cells, source code and logs. Limit access to the required buckets; object-level/prefix least privilege must not be assumed from a broad bucket token.
- For authenticated Sheets access, prefer a dedicated service account shared only on this workbook, using the standard Google authentication library and Sheets API. Creating it, sharing the workbook and installing credentials are explicit setup actions in the implementation phase, not actions performed here. Do not borrow the unrelated affiliate/TTS credential file discovered elsewhere in the workspace.
- Keep the credential file outside the OneDrive/repository tree, protected to the scheduled Windows account. The Sheets OAuth scope is not tab-scoped: range allowlists are an application control, not a substitute for Google account/file permissions. If service-account sharing is unavailable, use Google's supported installed-app OAuth flow with owner consent; do not make the existing back-office public to bypass authentication.
- A minimal Python worker can use the Google auth library plus existing rclone/PowerShell mapping tools; do not hand-roll OAuth or duplicate the matcher. Python standard library covers manifests, hashing, process execution and logs. Extract/adapt existing PowerShell tool interfaces rather than creating an unrelated second mapping implementation.
- The current Apps Script `api()` exposes inventory and sales operations; it is not an authenticated worker REST endpoint. Do not add an anonymous `doPost` dispatcher to that router. Web UI extension, if requested later, uses existing `google.script.run` and deployment authentication after those settings are inspected.
- The bound Apps Script menu and R2 JOBS queue are REQUIRED in V1 (§5); an HTML Web App button is optional and must reuse the same enqueue checks. Only authorized workbook users can enqueue through the bound script. No public HTTP endpoint or cloud-to-PC inbound connection is needed.

## 7. Main risks and controls

| Risk found | Required control / release gate |
|---|---|
| Public links break when archive moves old files | Copy old objects; keep current keys. No automatic move/delete. |
| `copy` overwrites same key | Compare actual contents; immutable/add-only behavior; conflict is not skip-success. Before-image verification + owner-approved manifest for replacements. |
| “archive/” is still public in a public bucket | Separate private bucket for old content, original paths and operational manifests. Verify public access is disabled. |
| Same names / RESTOCK or Type ambiguity links wrong book | Exact qualified match, duplicate PID/name/position checks; unknown cases stay unassigned. |
| Half-uploaded group becomes visible to consumers | Publish only verified complete groups; preserve prior index until publication succeeds. |
| Current index silently maps `1,3` to `1,2`, or jpg beats png | Reject new gaps/extension collisions; retain legacy rows unchanged pending a separate remediation report. |
| FB path still hardcodes jpg | Repair `_imageUrl` and its callers with real ext data; test PNG/mixed before claiming downstream readiness. |
| Crash, repeated polling or Sheet reporting failure | Durable manifest, one worker, content reconciliation, idempotent technical-row update; no automatic Status change. |
| Another uploader changes remote during snapshot/index write | Sole-writer maintenance interval + validator rechecks; abort if violated. No promise of distributed locking. |
| Photo set incomplete / OneDrive placeholder | Read/stage/hash successfully; explain stability limitation; explicit readiness/count if strict completeness is required. |
| Archive space/operations grow | Estimate current remote bytes + local originals + before-images after fresh inventory. Do not assume quota/free cost from old guide. No retention deletion without owner policy. |
| Status change unexpectedly starts an upload | Explicit queued request required; an empty queue must perform zero image transfers |
| Bulk clear breaks historical URLs | Archive first; rebuild verified current keys; retire only exact reviewed residuals with known/accepted impact |
| Two systems overwrite queue/result cells | Separate append-only Apps Script request tab and worker-owned result tab; one worker; no shared-state locking claim |
| Owner renamed source roots | Two executable defaults updated on 2026-09-22; next fail on missing master roots and refresh manifests/source rules before any data operation |
| Dated Instock gets scanned/re-uploaded as a master | Two-root allowlist only; exclude working/dated Instock and Archived; never use All Products recursively as input |
| Copy whole category includes Sold siblings | Select at item/file level, preserve directory hierarchy without broad directory copying |
| Reusing yesterday's Instock leaves sold photos mixed in | Empty per-run working folder, verify expected file set, date only after success; snapshots are not live stock |
| Duplicate-date output, interrupted export or disk-full | Unique final suffix, run journal, real byte verification; preserve existing snapshots and originals |

Rollback: additive uploads do not require deleting new objects. A full-rebuild failure after replacements must restore affected before-image bytes as well as the prior index, with checks that no later run has published. Restoring an index or old image is itself an overwrite: produce exact rollback manifest and obtain the required authorization. Restore only the affected keys, never the whole bucket. Public browser/CDN caching must be checked if a previously published key's content changes.

## 8. Implementation sequence and acceptance

1. **Offline implementation / dry-run first:** repair renamed-root defaults and adapt the shared mapper/index validator; implement Apps Script commands including EXPORT_INSTOCK, immutable request contract and Windows worker with focused tests. Refresh manifests after the owner's moves. The Instock copy-only mode is separately testable; build the full-source cleanup/rebuild preview before New Arrival production uploads. No cloud writes or real stock-photo copies required for offline tests.
2. **Initial full rebuild:** refresh live schema/mappings, review local cleanup candidates and references, show exact full-source manifests + archive footprint. Perform only reviewed recoverable local moves and regenerate affected manifests. Set up private archive; copy/verify remote baseline and all selected originals; add/replace exactly approved public objects; publish validated index and report residual legacy keys. No pre-upload wipe; retirement is separately reviewed.
3. **Apps Script command integration:** deploy menu and technical tabs, execute a reviewed scoped New Arrival command, validate queue/state ownership, content/index/result publication and retries. Connect the queue checker so requests run only after a command; the one-minute schedule never grants autonomous discovery permission.
4. **Consumer integration / completion:** repair affected URL consumers, inspect/refresh real R2 IMAGES formulas, test cache behavior for replaced keys, document click-level operation and PC-off recovery. An HTML Web App button can reuse the same helper later, but the Apps Script menu is not deferred.

Minimum runnable tests (one compact test suite is sufficient):

- Exact full-width titles, RESTOCK-01 vs RESTOCK-02, flat GGB and nested Hobby routes, duplicated names/PIDs, unknown Type, path escape, unreadable file.
- Same-content rerun writes nothing; changed same-key content conflicts even when byte length is identical; jpg/png collision conflicts; mixed ext succeeds; missing position 2 fails.
- Interrupted transfer, failed verification, archive failure, nonzero/partial rclone listing, Sheet input changes, timeout after index publication and Sheet-result write failure all resume without a false DONE or overwriting another product.
- Concurrent scheduled/manual start has only one writer; immutable flag is not treated as byte-integrity verification.
- Empty queue + New Arrival rows = zero uploads; command includes both tabs' eligible rows at click time but excludes later additions; PC-off request persists; duplicate click/uncertain enqueue response does not duplicate work; modified snapshot becomes STALE.
- Apps Script request write failure produces no false queued message; worker cannot write request cells; request counts/IDs validate; stale FULL_REBUILD_COMMIT plan is rejected.
- Full rebuild covers all allowed photos/statuses; excluded archives/staging never enter its manifest; failure after replacement restores the exact old image AND index; residual referenced/unknown keys are not removed.
- Updated index preserves legacy/unaffected rows, excludes partial products, retains `pid,n,ext`, and produces actual jpg/png/mixed URLs through affected consumers.
- No test uses live stock, credentials or a public bucket as a fixture. Live smoke test uses the reviewed scoped manifest after setup.
- Instock tests: both tabs, exact Instock filtering, flat mixed-status category, nested Hobby hierarchy, source `(1),(3)` names preserved, unknown/duplicate mapping, missing photos, changing status during copy, safe dates/timezone, same-day suffix, interrupted copy/rename/report, disk-full, and unexpected files in working Instock. Verify source bytes untouched, real copies (not links), no R2 calls, and no reads from Archived/previous snapshots. A second snapshot after a sale must not retain that sold product from the first.

If editing either numbered `.gs` file, bump BOTH Code/WebApp from the then-current revision in one pass, archive prior source per AGENTS, update README, run existing Index.test.js plus applicable new checks. Do not edit the LAB or React storefront instead of the current production-source folder.

Before enabling external writes the implementer must resolve these execution prerequisites: live sheet schema/mappings, authorized Google credential, archive bucket privacy/lifecycle, full remote inventory and baseline verification, exact collision report, write-exclusive interval, and current R2 IMAGES refresh mechanism. These are not reasons to block offline implementation.

## 9. Handoff instruction

Step 2 fresh baseline audit completed on 2026-09-23; see [BASELINE-R2-REVIEW_2026-09-23.md](BASELINE-R2-REVIEW_2026-09-23.md) and [HANDOFF_2026-09-23.md](HANDOFF_2026-09-23.md). Offline worker dry-run/recovery guards and 29 Product-ID image bindings are implemented and tested. The five page-sequence issues and blank Type for `OWA-MAGT022AMAN00` were corrected by the owner and rechecked below; the post-change full baseline, complete-batch guard and live-ledger migration still precede Step 3. No deployment or cloud writes yet; one writer.

Recheck 2026-09-23 02:22 Bangkok: all five formerly gapped Instock titles now resolve to positions 1,2; `TV Magazine vol 54` has Type `TV MAGAZINE` and is now Instock. The six-item report in `04 Design Tools/logs/six_pending_recheck_20260923-022058/` records six passes. Remaining gates are the post-change full baseline, complete-batch validation, explicit live-ledger migration and Step 3 R2 inventory/archive plan.

Checkpoint 2026-09-23 02:56 Bangkok: post-change baseline and offline complete-batch validation are done; see `04 Design Tools/logs/baseline_postfix_20260923-024444/` and the review addendum. A read-only R2 key/size inventory now exists, with 436 local-only, 231 remote-only and 158 size-mismatched keys. This is an archive/rebuild **preview**, not a byte-verified replacement plan. Keep the old public keys intact. The remaining gates are exact remote before-image verification and private archive design, current index/consumer references, credentials, and explicit handling of the old v3/READY queue and ledger before v4 deployment. Never replay that stale batch automatically.

Checkpoint 2026-09-23 04:06 Bangkok: fresh `meta/images.csv` and live `R2 IMAGES!E:G` agree exactly; all 2,696 indexed image keys exist in R2. However, the Sheet B/C formulas and `Code_v22.gs` helper hardcode `.jpg`, producing 67 missing Sheet links for 39 products whose images are `.png`. This consumer defect must be fixed and tested before treating the rebuilt index as ready. Four unindexed duplicate PNG keys and 31 indexed PIDs absent from the current Sheet remain `KEEP_LEGACY` for now. Bucket-level enumeration is denied to this R2 token, so private archive bucket existence/privacy needs a separate authoritative check. The live v3 queue still has 1,333 rows; no automatic replay or in-place mutation.

Historical initial implementation prompt (superseded by the addendum's step 1 prompt):

> Implement phase 1 of `00 Docs/PLAN-R2-HYBRID_2026-09-22.md`, revision 3: use All Products/All - GGB and All - MAGAZINE as the only master sources; Archived and every Instock output are excluded. Fix stale root defaults, reuse the matcher/index tools, implement Apps Script commands and the Windows queue worker, including a separate EXPORT_INSTOCK mode that copies exact Instock items with original subfolders and renames the verified output Instock - dd-MM-yyyy. Add focused retry/failure/snapshot tests and full-rebuild dry-run manifests. New Arrival status alone never authorizes uploads. Keep live photos/Sheet/R2 unchanged in this implementation phase; do not deploy, schedule, copy actual stock, move/archive data or upload before execution prerequisites and exact manifests are ready.

## 10. Primary references checked 2026-09-22

- [rclone copy](https://rclone.org/commands/rclone_copy/): skips matching files, does not delete destination-only files; includes immutable/dry-run options. Not a guarantee of no overwrite or byte equality by itself.
- [rclone check](https://rclone.org/commands/rclone_check/): checksum checks and download-based verification.
- [Cloudflare public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/): public access exposes bucket objects; a folder name is not an access boundary. Keep existing public base during this task; production custom-domain migration is separate.
- [Google Sheets scopes](https://developers.google.com/workspace/sheets/api/scopes): permissions are not limited to individual tabs.
- [Google installed-app OAuth](https://developers.google.com/identity/protocols/oauth2/native-app): supported fallback if service-account setup is unavailable.
- [Apps Script web apps](https://developers.google.com/apps-script/guides/web): deployment identity/access must be checked before adding interfaces.
- [Apps Script LockService](https://developers.google.com/apps-script/reference/lock/lock-service): coordinates cooperating script executions, not external Sheet edits or Windows writers.
- [Apps Script custom menus](https://developers.google.com/apps-script/guides/menus): bound-script menu functions and integration with existing onOpen.
- [Sheets batch updates](https://developers.google.com/workspace/sheets/api/guides/batch): atomic subrequests for publishing a request batch; this does not make external R2 writes atomic.
- [Advanced Sheets service](https://developers.google.com/apps-script/advanced/sheets): explicit setup for the Apps Script batch request API.
- [Windows file naming rules](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file): slash is reserved in file/directory names; use hyphens in snapshot dates.
