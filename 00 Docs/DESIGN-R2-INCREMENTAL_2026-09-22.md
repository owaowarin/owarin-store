# R2 incremental checks — implementation design v1

Status: post-correction Step 2 baseline and offline batch guard completed 2026-09-23. Upload readiness remains false: R2 before-image/archive and consumer compatibility gates are documented in BASELINE-R2-REVIEW_2026-09-23.md. No deployment/cloud writes performed.
Stream B; master context §2, §5, §6, §9; Ponytail full. Owner requested design after switching model.
Project root: `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE`.

This addendum refines `PLAN-R2-HYBRID_2026-09-22.md` revision 3. Its public-key, explicit-command, archive-before-replacement and original-path Instock contracts remain in force. This document controls incremental checks and the implementation order below. Historical CSVs remain audit evidence, not executable upload plans.

## 1. Decision and expected benefit

Keep the existing Apps Script queue, Python Windows worker and PowerShell exporter. Extract ONE shared PowerShell file scanner/matcher from the exporter and use it from both the exporter and existing R2 mapper. Build an in-memory dictionary once per scan, persist a small JSON file-metadata/hash cache, and reuse the worker's ledger for receipts/recovery. No database, file watcher, broker, second worker or new cloud service in v1.

The current repeated ad-hoc commands, repeated network exports, per-product file scans, and changes to matching logic account for substantial avoidable work. Cache alone does not fix incorrect matching. Correctness and a reproducible command come before performance tuning.

Fast checking still enumerates the two allowed master trees once per requested batch. This finds additions, moves and missing paths reliably without a watcher; it reads metadata, not all photo bytes. Matching uses keyed lookups instead of rewalking folders for each product. Rebuild/check joins fresh Sheet rows each time; it does not cache business identity as truth.

| Operation | Work in v1 |
|---|---|
| Idle queue poll | Read queue and reconcile existing receipts; no image scan, hash or R2 scan |
| First Check Library | Fresh Sheet snapshot + one master enumeration + baseline hashes; no cloud write |
| Repeated Check Library | Fresh Sheet snapshot + one enumeration; hash new/changed files only |
| New Arrival request | Fresh identity checks, one enumeration, resolve requested products, stage/hash their actual bytes; inspect only their remote PID prefixes |
| Instock export | Same scanner/matcher; copy selected images with current original relative paths, hash-verify output |
| Full rebuild/archive plan | Full relevant inventory and byte verification; speed cache cannot authorize destructive actions |

Do not promise a duration before benchmarking. Enumeration is O(files), dictionary construction/join is O(files + rows + matches). OneDrive hydration and network latency remain real costs. Snapshot copy and backup still transfer the required bytes.

## 2. Evidence from current local code

Reviewed 2026-09-22; findings describe local source, not a newly verified live deployment or fresh inventory totals.

| Source | Evidence / implication |
|---|---|
| `04 Design Tools/export-instock-snapshot.ps1` | Already has exact-name, normalized-name and product-folder indexes. It separately enumerates files and directories and rescans each directory. Reuse its parser/path output; consolidate enumeration. Normalized/folder fallback currently auto-accepts some matches, so tighten qualification before sharing with uploads. |
| `04 Design Tools/build-r2-library-mapping.ps1` | Covers four GGB Types only, fetches gviz CSV, walks per row, silently skips unknown Types, does not validate rclone exit status. Its overlap percentage is a heuristic, not identity proof. Replace this flow through the shared matcher, not another parallel mapper. |
| `04 Design Tools/r2-queue-worker.py` | Only implements EXPORT_INSTOCK. `--dry-run` validates queued identity and writes READY, but never calls the photo mapper. Therefore it does not prove file readiness. |
| Same worker: `process_batch` | Inner result-write failure saves PENDING_REPORT, then outer exception handler overwrites it with FAILED. Recovery can lose the fact that export already completed. FINALIZING restart also re-enters copy instead of reconciling the recorded finalization. |
| Same worker: `append_results` / `run_once` | Any existing Request ID suppresses later result updates, including recovery from an earlier failure. Failed batches are skipped, and a batch failure can still return process exit 0. Need state-aware reporting, explicit retry and meaningful exit status. |
| Same worker: paths/concurrency | Default worker-state lives inside OneDrive; no OS-level mutex. Batch ID feeds a filesystem path without a strict ID/path contract. Shared Sheet values are untrusted inputs even for authorized editors. |
| `03 Apps Script/Web App/R2Upload.gs` | Defines global `_withLock`, `_resolveColumns`, `_tryWrite`, `_sp2ResetWriteErrors` also present in `Code_v22.gs`. Compatibility helpers must be namespaced or use the canonical helpers; duplicate global definitions may affect unrelated store tools. |
| `04 Design Tools/build-r2-images-index.ps1` | Prefers jpg if both jpg/png exist at a position. This cannot be generalized to new uploads; detect a conflict instead. |
| `03 Apps Script/Web App/Code_v22.gs` | `_imageUrl(pid)` assumes `1.jpg`. Mixed-extension upload readiness requires consumer checks/repair. |
| `00 Docs/HANDOFF_2026-09-22.md`, prior CSV logs | Record normalization and local archive operations. Earlier normalized mapping and partial GGB manifests are discovery reports; they are not a fresh, complete, collision-safe migration baseline. |

No fresh Sheet/R2 business counts were collected for this design. In particular, “all rows mapped” in a diagnostic report does not establish every file belongs to the right Product ID, all source photos are covered, or all consumers can load the result.

## 3. Scope and sources of truth

- Executable master roots: only `All Products/All - GGB` and `All Products/All - MAGAZINE`, using the existing plan's category allowlist. Nested Hobby/category directories remain supported.
- Archived, working/dated Instock, staging, logs and `_to_delete` never become active sources. Scan errors or missing roots mean INCOMPLETE, not an empty successful catalog. Never follow links/junctions outside the resolved roots; OneDrive placeholders must be successfully readable before use.
- Sheet is authoritative for tab + Product ID + Item name + Type + Status. IDs must be unique across BOTH tabs because public keys contain no tab component. The code attempts to preserve IDs today, but manual changes/renumbering must still invalidate bindings.
- Photos are authoritative for bytes and original relative paths. Public keys remain `library/<PID>/<position>.<actual ext>`.
- `SOLD OUT` in a folder name is not an archive instruction and is not an automatic exclusion if an image is referenced. Current inventory omission alone does not prove a file is obsolete.
- The user-authorized `(1)` renames are historical changes; future flat filenames are reported as NEEDS_FILENAME_NORMALIZATION, with a collision-checked rename plan. Matching/checking never silently renames originals.

## 4. One shared scanner and deterministic matcher

Proposed new file: `04 Design Tools/image-library.ps1`, dot-sourced by the existing scripts; not executable stock mutation code on import.

Suggested function boundaries (implement only these responsibilities, no plugin framework):

- `Get-ImageInventory`: root validation, single enumeration, filename parsing, cache comparison; returns file records, directory records, errors and metrics.
- `Resolve-ImageProducts`: fresh Sheet rows + file records + reviewed alias records → mapped files, product issues, unassigned files. Status filtering belongs to the caller.
- `Test-ImageManifest`: path/identity/source-owner/position/key checks and canonical manifest digest; mode-specific position policy.

Parser operates on `FileInfo.BaseName` for actual files only; never call filename/extension APIs on Item name values. Strip exactly the final ` (positive integer)` from a filename stem; preserve embedded `(1-8)`, `(RESTOCK-01)`, slash-like Unicode, Thai, accents and punctuation. Item names remain strings. Capture actual extension and numeric position separately.

Matching order:

1. Exact item name within a reviewed tab/Type/category route. A Type may allow more than one root (e.g. a mixed Other category); never invent a root from Type alone. Unknown route is NEEDS_REVIEW with candidate paths.
2. A reviewed explicit alias binding the exact current item identity to an exact source stem/subtree or file set. Product-folder fallback is also an explicit binding if contained filenames differ.
3. Normalized/fuzzy search produces SUGGESTED_MATCH only. No automatic upload/archive assignment from punctuation stripping. Different editions and RESTOCK suffixes must not collapse.

Alias storage: one small `04 Design Tools/image-name-aliases.csv` only when verified exceptions are implemented. Fields: source_tab, product_id, item_name, type, identity_fingerprint, root_id, source_subtree, source_stem_or_file, reason, reviewed_utc, evidence. A changed identity/root/rule invalidates the record; do not silently transfer an alias to a reused PID. Previous ad-hoc log suggestions need fresh validation before becoming rules.

Resolve all affected candidates before accepting a product. Enforce one source file → one product/position; globally unique PID; distinct source titles never merge through normalization; same name in multiple folders needs an explicit choice. Multiple images are expected: pages 1..44 are one valid product if each position has one file. Both 1.jpg and 1.png are a position conflict even though their complete keys differ. Case-colliding R2 keys and duplicate filesystem paths are reported, not merged silently.

R2 publication requires positions 1..N without gaps and an exact ext vector; Instock preserves original filenames/positions and reports gaps as warnings. Exact copied bytes, case and relative directories are preserved. Zero-byte, unreadable and extension/content mismatches block use.

## 5. Minimal cache and invalidation

Runtime state target: `%LOCALAPPDATA%\OWARIN\image-worker\` (resolved once to an absolute path in setup). Keep it outside OneDrive. Continue supporting explicit `--state-dir`; migrate the existing ledger only after stopping the old worker, verifying copies and recording the transition. Never discard the existing ledger and replay every old queue request.

```text
image-worker/
  library-cache.json           disposable file metadata/hash cache
  ledger.json                  durable job state + verified receipts, not disposable
  runs/<validated-run-id>/     frozen inputs, manifest, stage, journal, before-images
```

Workspace retains code, rules, human-readable CSV run logs and documentation. Do not create three competing authoritative CSV indexes. Export CSV from each run for inspection; the cache is internal and rebuildable. Runtime directory creation/migration belongs to implementation/setup, not this design task.

Cache envelope: schema_version, scanner_version, rules_hash, root_signature (resolved root paths), last_complete_scan_id, completed_utc; entries keyed by root_id + exact relative path. Each entry stores bytes, last_write_utc_ticks, attributes/readability state, source_stem, position, extension, sha256 (nullable), hashed_utc, and metadata observed when hashed. Store timestamp integers as strings where JSON readers could lose precision. Do not store authoritative PID mappings in the file cache.

| Change | Required action |
|---|---|
| Same relative path + size + mtime | Reuse hash for preview only; label cached evidence |
| New path / size / mtime / relevant attributes | Reparse and rehash accessible file; instability/read failure blocks the affected product |
| Path no longer enumerated | Mark MISSING only after a complete successful scan; do not delete remote data |
| Rename / move | Treat old path as missing and new path as new; a hash-equal rename is a diagnostic hint, not permission to assign ownership |
| Sheet name/PID/Type/Status changed | Refresh mapping/eligibility and invalidate related request fingerprints even if every file is unchanged |
| Rules/root/schema changed or cache corrupt | Discard cache trust, rebuild scan/mapping; keep ledger and receipts |
| OneDrive unavailable / permission error | Record INCOMPLETE; do not replace previous complete cache with partial results |

Size + mtime are not integrity proof: a file can change while preserving both. Before upload, replacement, local archive or verified export, read/stage the selected bytes and calculate fresh SHA-256, checking source metadata before/after. Freeze that staged file set and hash in the manifest; upload those bytes, never reread an uncontrolled live path for transfer. Strict full verification remains available for an explicit full audit. Do not claim that metadata-only checks detect all same-size/same-time edits.

Write cache to a temporary sibling, flush and atomically replace after a complete scan. A failed write leaves the old cache valid. Ledger updates and run journals also need atomic/durable writes; this mechanism does not provide a transaction across filesystem, R2 and Sheet.

## 6. Fresh Sheet inputs without repeated exports

Use the existing authenticated Google client. At each batch pickup, batch-read relevant inventory columns for BOTH tabs, with explicit header/data-row validation and detection of the current second-row helper layout. No hardcoded `values[2:]` assumption without checking that layout. Missing/duplicate headers or unexpected schema block the run. A single values.batchGet can read multiple ranges; it does not lock future human edits.

Build the PID lookup and duplicate counts once. Rows cannot be cached as permanently accurate or located by stored row number. Keep the fresh snapshot/read time/digest in the run folder. Re-read at the destructive/publication boundary and compare the exact requested identity/status fields. A changed queued target yields STALE; no automatic replacement with a newly discovered product.

Apps Script still snapshots eligible New Arrival rows only when the user runs Upload New Arrival. Later rows/photos do not join the frozen request. Empty queue causes zero photo work. No live-data cache allows uploading without a fresh relevant identity check.

## 7. R2 checking and archive rules

Initial/full audit: one complete paginated remote inventory plus existing public index, with nonzero exit/partial listing fatal. Daily requested batch: list each affected `library/<PID>/` prefix once, including competing extensions, and fetch the current meta index once per publication. Do not rescan the whole bucket for each product or each poll. A cold/missing cache can increase reads but never relax validation.

Receipt fields in ledger/run manifest: exact bucket/key, size, verified SHA-256, verification method/time, remote validator, request/run/manifest IDs. An ETag is a validator, not a universal SHA-256/MD5 checksum. Compare actual content when receipt/remote state is absent or different. A fresh validator plus verified receipt is a narrow optimization only under the single-writer assumption; strict rebuild/archive verifies bytes.

New Arrival is add-only: existing same verified bytes → no upload; different bytes/position extension → CONFLICT. Require one worker lock shared by manual and scheduled starts. Remote single-writer interval is an additional prerequisite; a local mutex cannot lock manual/dashboard clients. Use conditional create/update where the selected transport demonstrably supports it; failed precondition invalidates the plan. R2's S3 API documents PutObject conditions, but rclone flag/wire behavior must be verified before treating it as conditional protection. No handwritten signing or speculative dependency in the initial offline phase.

Local archive proposal must include source path/hash, fresh reference check, destination and reason. Execute an approved fixed manifest to `All Products/Archived/<run-id>/<original master-relative path>` with no overwrite, per-file prepared/result journal and hash verification. Interrupted runs reconcile exact source/target hashes before resuming; never infer success from the target merely existing. Restoring uses the reverse manifest and stops if the old path is occupied. Existing historical archives retain their current layout.

A local archive is still on the user's PC/OneDrive; it does not fulfill “archive on Cloudflare.” Before the full rebuild is complete, privately preserve the exact local originals selected in its archive manifest, including unmatched sources and files moved earlier in this task. Resolve those earlier moves through the archive execution logs; neither omit them because they left the master nor recursively upload all unrelated Archived content. Keep original relative paths and verified hashes.

Remote replacement: verified private before-image of each affected key and old meta index → authorized replacement → byte verification → compatible index publication. Missing Sheet row, Sold status or missing local file never causes public-key deletion. Private backup does not preserve an old public URL, so retire only separately reviewed exact keys. No `rclone sync`, bucket clear, or automatic expiry. Preserve unaffected public index rows.

Completed Instock directories are historical snapshots: do not rename their inner files after a master rename. Preserve their original manifest and add a separate source-path translation/rename record if verification needs it. Regenerate pending plans against current sources. The dated snapshot is never an upload source.

## 8. Worker recovery and user commands

Priority repairs before enabling scheduled execution:

1. OS-held single-worker lock; validate request/batch/run IDs and resolved path containment before mkdir/subprocess. Use argument arrays/literal paths and allowlisted modes.
2. Preserve durable state when reporting fails; never let outer exception handling replace PENDING_REPORT with FAILED. Save final output path + manifest digest + complete result payload BEFORE attempting Sheet reporting.
3. Recover COPYING/FINALIZING by inspecting the existing journal, manifest and verified final path. A restart must not create a second dated Instock snapshot or repeat an already verified transfer.
4. Use worker-owned result upsert keyed by Request ID, verifying the unique row and allowing a newer known state; no “existing ID means never report again.” On uncertain append, read back the same ID. Duplicate result IDs block reporting until reconciled. Keep event history in the local journal.
5. `--dry-run` must actually invoke shared matching/validation and create a dry-run manifest; it cannot mark executable work complete or update operational state to success. Failure exits nonzero; results distinguish preview from execution.
6. Namespace R2 compatibility helpers or use canonical store helpers. Verify local vs deployed Apps Script before deployment; follow Code/WebApp paired versioning for any touched numbered file.

State sequence: QUEUED → VALIDATED → PLANNED → STAGED → VERIFIED → PENDING_REPORT → DONE. Operation-specific checkpoints (COPYING, FINALIZING, UPLOADING, INDEX_PUBLISHED) carry durable manifests/receipts. NEEDS_REVIEW, STALE and WAITING_FILES stop affected work; RETRYABLE_ERROR retains the last completed checkpoint and retries only the same frozen request. DONE is represented as EXPORTED for Instock and UPLOADED for R2 in results. Transient failures must not erase known success.

Preserve the existing R2 JOBS / IMAGE UPLOADS contract where possible. If fields/modes must change, version them explicitly, validate old pending requests, and reject incompatible versions rather than guessing. Validate complete batch count/request-ID set against an immutable batch descriptor before any execution; incomplete Sheet appends are not a smaller valid request. Reuse the previously planned atomic enqueue + same-ID readback behavior when repairing current enqueue code.

User-facing commands under Inventory Tools → R2 Images (proposed English labels):

- Check Library: fresh local/Sheet audit and exception report; no uploads.
- Upload New Arrival: snapshot eligible rows and queue the scoped operation.
- Export Instock snapshot: existing flow, shared matching, date on outer root only.
- View image job results: last state, failures and log/run ID.

Full rebuild and archive execution stay reviewed maintenance operations. Do not add periodic photo scans or start uploading merely because Status becomes New Arrival.

## 9. Run logs and reproducible checks

One run ID = UTC time + random suffix, persisted on retries. Each run has one CSV summary plus one detailed manifest/event journal, rather than a new log per trivial display command. Record actions before execution and append verified results immediately, so an interruption still leaves evidence.

Include: run/request IDs, timestamps, phase, source/target paths or keys, before/after fingerprints and hashes, rule version, Sheet snapshot digest, result/error, and cache evidence level. No secrets. Failed reads are failed reads; they cannot be logged as successful just because a path was intended. CSV reports must preserve UTF-8 and protect spreadsheet users from formula-like untrusted values; canonical machine manifests retain exact strings.

Performance counters: queue/Sheet read count, directories enumerated, files statted, bytes read/hashed, reused hashes, matched/ambiguous/unassigned count, remote listings/heads/bytes, elapsed per phase. Benchmark identical immutable test data before/after and report medians plus hydration state; avoid invented seconds or token savings.

Minimum failure/regression tests (offline fixtures, no live stock as test data):

- Exact `S.I.C`, `L.A. Noire`, `358/2`, Unicode punctuation, accents and RESTOCK; no title truncation. A normalization collision is a suggestion/conflict, never an accepted mapping.
- Valid multi-page book, gap, duplicate page across jpg/png, duplicate source ownership, duplicate PID across tabs, unknown Type and missing expected row.
- Cache cold/warm, changed same-size file with new mtime, changed bytes with same size/mtime (strict staging must catch), rename, missing root, permission error, OneDrive unreadable file, corrupt cache, rules change and PID/status-only change.
- Archived/Instock never scanned; symlink/junction escape and `../` request ID rejected. Scan once per batch, not per product; warm preview hashes zero unchanged bytes; idle poll scans zero images.
- Crash after copy but before rename, after rename but before ledger/report, after remote write but before receipt, after index publication but before Sheet result. Resume preserves completed work and reports the same request exactly once/current state.
- Result-write timeout, nonzero remote listing, partial inventory, another worker, changed remote validator and changed Sheet fingerprint all fail safely without false DONE.
- Local archive collision/hash failure preserves recoverability; public object is never removed as a side effect of local disappearance or SOLD OUT naming.

## 10. Ordered implementation handoff

1. **COMPLETED 2026-09-22 — Offline correctness + shared scanner.** `image-library.ps1` now supplies one scanner/matcher/manifest validator and disposable metadata/hash cache to the Instock exporter, GGB R2 mapper and offline Check Library command. Worker recovery/result upsert/mutex/ID-path/dry-run behavior and Apps Script helper namespaces were repaired. Offline fixture tests include commit/finalize/retry recovery; production photos, Sheet and R2 remained unchanged.
2. **AUDIT COMPLETED 2026-09-23 — Fresh baseline.** Both authenticated inventory snapshots agree; master and exact prior archive files are freshly hashed, references and rename journals reconciled. Canonical evidence is `04 Design Tools/logs/baseline_20260922-234553/reports-v2/`. The prior archived set all references Sold rows; preserve its originals in the private archive plan. Resolve priority mapping exceptions and residual Step 1 defects in `BASELINE-R2-REVIEW_2026-09-23.md` before moving to cloud execution.
3. **Reviewed full rebuild.** Fresh complete remote inventory, private archive configuration, size/capacity estimate, verified remote/local preservation, sole writer and exact plan hash; limited upload then reviewed rebuild/index/consumer verification.
4. **Commanded daily use.** Deploy New Arrival command and worker only after retry tests/smoke checks pass; enable the queue poll schedule and demonstrate PC-off/resume and harmless repeat click.

Suggested next implementation prompt:

> Continue from HANDOFF_2026-09-23.md and BASELINE-R2-REVIEW_2026-09-23.md. Repair the documented offline worker dry-run/recovery/state-migration defects and add targeted failure/retry tests. Prepare explicit route/alias proposals from baseline_20260922-234553/reports-v2; preserve decisions requiring owner input (missing Type and photo numbering). Do not mutate photos, write Sheet data, deploy, schedule, or write/delete R2 objects. Refresh the authenticated baseline after resolved decisions before Step 3.

This design does not require new owner business choices to implement step 1. Exact alias/archive/replacement decisions arise from its fresh exception reports; retain uncertain items until resolved.

## 11. Primary technical references checked 2026-09-22

- [Sheets values.batchGet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet): multiple ranges per read; used to reduce inventory round trips.
- [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/): prefix listing, object metadata and conditional operations; validate transport behavior and do not assume S3 bucket versioning is the archive strategy.
- [rclone check](https://rclone.org/commands/rclone_check/): download-based comparison is available when usable checksums are absent; byte verification is deliberately retained at archive/transfer boundaries.
