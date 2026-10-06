# PLAN — R2 image links → Facebook Catalogue (executable handoff)

จัดทำ: 2026-09-23 (Wednesday) · Stream B · master §§2/5/6/9 · Ponytail full · token-harness
Author session: claude-opus-5-5 (planning only — no Sheet, R2, code, Meta or photo writes were made)
Supersedes nothing. Builds on: `HANDOFF_2026-09-23.md` (last block), `BASELINE-R2-REVIEW_2026-09-23.md`, `PLAN-R2-HYBRID_2026-09-22.md` §4/§8, `R2-ARCHIVE-HANDBOOK_2026-09-23.md`.

## 0. Status board — the ONLY place to tick progress

Every step, when finished: (1) set its row here, (2) write its log CSV, (3) append a 5-item block to `00 Docs/HANDOFF_<today>.md`, (4) update any doc named in the step's "Docs" field. No log = step not done (CLAUDE.md).

| Step | Name | Model · effort | Status | Log / evidence |
|---|---|---|---|---|
| S0 | Session start + owner decisions D1–D5 | Sonnet · low | DONE | `decisions_20260923.csv` |
| S1 | Live image-link gap report (read-only) | Sonnet · medium | DONE | `fbcat_s1_gap_20260923T141926Z.csv`; `fbcat_s1_run_20260923-213239.csv`; `fbcat_s1_build_20260923-193334.csv` |
| S2 | Fix `.jpg` hardcode (v23) + `FB CATALOGUE!A2` #REF! root cause #1 (v24) — code done, deploy is owner click-level | Sonnet · medium | DONE (v25 live 2026-09-24; 19 .png links verified in META EXPORT) | `fbcat_s2_code_20260923-215917.csv`; `fbcat_s2fix_rootcause1_20260923-231709.csv`; D6 OPEN in `decisions_20260923.csv` |
| S3 | Close image gaps: add-only upload + index merge | Sonnet · medium (+ Opus · high refuter only if any REPLACE) | DONE 2026-09-25 — 240 PIDs / 439 files added (09-24: 232 · 09-25: 8), add-only via `upload-missing-r2.ps1`; META EXPORT Ready 1,342/1,342 | `r2_missing_upload_result_20260924-141712.csv`; `r2_missing_upload_result_20260925-125947.csv`; `fbcat_s3_close_20260925.csv`; `HANDOFF_2026-09-25.md` |
| S4-pre | Fix META EXPORT 0-ready: old live `R2Upload.gs` overrode Code.gs helpers (D7) → rename in live file + `Code_v25` title fallback | Opus · high (diagnosis) | DONE — META EXPORT Ready 1,109 / incomplete 248 | `fbcat_diag_20260923-2341.csv`; `fbcat_fix_r2collision_20260923-2350.csv`; `fbcat_fix_apply_20260924-0020.csv`; D7 |
| S4 | Build + validate feed (local checker) | Haiku · low to run / Sonnet · low to fix | DONE 2026-09-24 (1,109/1,109 valid) — re-run after 09-25 rebuild optional | `HANDOFF_2026-09-24.md` |
| S5 | Point Meta catalogue at a scheduled feed | Sonnet · medium | DONE 2026-09-24 — feed 1048143251023664 pulls META EXPORT daily 06:00 Bangkok, REPLACE | `logs/meta_feed_change_20260924-0555.md` |
| S6 | Daily auto-refresh (headless trigger) — SKIPPABLE, D1=manual upload | Sonnet · medium | TODO/SKIP | `fbcat_s6_trigger_<ts>.csv` |
| S7 | Diagnostics loop + close-out | Haiku · low (read) / Sonnet · low (fix) | TODO | `fbcat_s7_diag_<ts>.csv` |
| S8 | Optional: R2 IMAGES sheet formulas (67 broken .jpg links) | Sonnet · low | TODO | `fbcat_s8_formula_<ts>.csv` |

**Update 2026-09-25:** open follow-ups F1 (`exportMetaCsv` skip PIDs not in inventory — the recurring "Incomplete 23"), F2 (`buildFbCatalogue` Description fallback to `_buildCaption`), F3 (`upload-missing-r2.ps1 -Commit` chains index + backup + publish). Details and the current publish chain: `HANDOFF_2026-09-25.md`.

**Superseded 2026-09-25 (evening):** F1–F3 plus the root-cause fixes (PID CHANGES ledger, live R2 image index, health-check popup) shipped as Code v27 — see `PLAN-META-PIPELINE-HARDENING_2026-09-25.md` for the current design and the live publish workflow.

Critical path: S0 → S1 → S2 → (S3 if S1 finds gaps) → S4 → S5 → S6 → S7. S8 is off the path (catalogue does not read those formulas).
Switch models only at a step boundary (after the HANDOFF block is written) — switching mid-step re-reads the whole chat uncached.

## 1. Facts this plan rests on (re-verify live before acting — never reuse these numbers as current)

Read 2026-09-23 ~18:00 Bangkok, read-only:

- **Public images**: bucket `owarin-images`, base `https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev`, keys `library/<PID>/<n>.<ext>`. Index `meta/images.csv` = `pid,n,ext` (1,816 PIDs; ext is one value, or per-position values joined by `|` — decisions_20260913 CLOSED). Bucket holds 2,700 `library/` + 4 `meta/` + 4 `_to_delete/` objects; 2,632 jpg / 72 png; largest image 4.6 MB (Meta max 8 MB → fine).
- **The `catalog/` prefix no longer exists in R2** (retired in Code v20). Private archive baseline (`owarin-images-archive/baseline/20260923T0718Z-3b229f4a/remote/`) holds verified before-images of every current key.
- **Meta catalogue in use**: `OWARIN STORE`, catalog_id `1993212747992458`, business `6 Tatami` (446938113053924). 364 items, one manual primary feed `OWARIN STORE - GGB UPDATE (08/08/2026)`, feed_id `1048143251023664`, no schedule, deletion_enabled=true, last upload 2026-08-08 (364 persisted, 0 errors). **Every item's image_url is `…/catalog/<PID>.jpg` (now deleted from R2)**; Meta shows its cached copy ("fetched") but any re-fetch will fail. All 364 are still `in stock` since Aug 8 → items sold since then are still advertised. Fixing both is the point of this plan.
- Other catalogues — **do not touch**: `Products for OWA ― OWARIN's STORE` (1356860213007842, 503 items, auto-built from Page shop posts, no feeds); empty `GGB - POCKET BOOK` (4365757106997577) and `GGB` (2784226255291390) in business Owa-Owarin; all Chubbygirlbkk catalogues (Stream A client).
- **Existing export code** (reuse, don't rebuild): `03 Apps Script/Web App/Code_v22.gs` lines ~2499–2990: `R2_PUBLIC_URL`, `_imageUrl(pid)` (hardcodes `/1.jpg` — the bug), `FB_LANDING_URL = https://m.me/owarinstore/`, `META_FIELDS`, `buildFbCatalogue()` (menu 📘 จัด FB CATALOGUE → fills FB CATALOGUE sheet), `_metaInScope()` (single scope filter: Instock, GGB + MAGAZINE), `_metaInvIndex()`, `exportMetaCsv()` (menu 📤 สร้างชีต META EXPORT; uses `ui.alert` → cannot run from a trigger as-is), `META_EXTRA = {quantity_to_sell_on_facebook: "1"}` (fixed the Aug "Missing quantity" errors).
- Live `R2 IMAGES` tab imports `meta/images.csv` at `E:G`; its B/C formulas also hardcode `.jpg` (67 broken links / 39 PIDs; 19 Instock) — see `baseline_postfix_20260923-024444/remote-preview/formula-link-risks.csv`.
- Baseline gap preview (historical, 02:56): 436 local-only keys, 158 size mismatches, 231 remote-only. Which of these are **Instock** is not yet known → S1.
- Tooling limits: the cloud session's device shell is down (Windows update released 2026-09-08 blocks it; owner must install the latest Windows update + restart). Scripts that hit Sheets/R2/r2.dev must run **on the PC** (Claude Code or Codex opened in the Stream B folder). Meta catalogue reads/writes can run from any session that has the Facebook Ads connector (`mcp__Facebook_Ads__ads_catalog_*`).

## 2. Owner decisions (S0 — ask once, all together, record CLOSED in `04 Design Tools/logs/decisions_<date>.csv`)

Read every `decisions_*.csv` first; never re-ask a CLOSED item.

| ID | Question | Recommended (why) |
|---|---|---|
| D1 | Feed delivery | **Scheduled URL feed**: publish only the `META EXPORT` tab as CSV (File → Share → Publish to web) and have Meta fetch it daily. Zero manual download/upload; one URL. Alternative: keep manual CSV upload each time. |
| D2 | Sold items | **Replace mode, Instock-only feed** on the existing feed `1048143251023664` (deletion_enabled already true): items missing from the feed are removed from the catalogue on the next fetch → sold books stop being advertised automatically. Same `id` = PID, so kept items keep their Meta product IDs. |
| D3 | Instock items whose local photo ≠ remote photo (S1 `SIZE_MISMATCH`) | Owner eyeballs the side-by-side sheet from S1; approve an explicit replace list or "keep remote". Before-images are already in the private archive, so a reviewed replace is reversible. |
| D4 | Extra photos in catalogue | **Yes**: `image_link` = position 1, `additional_image_link` = positions 2..n (comma-separated, Meta allows up to 20). Books sell on condition photos. |
| D5 | Unused archive token `owarin-archive-copy-20260923` | **Revoke now** (secret was never saved; S3 does not need it — see S3.4). Cloudflare → Manage account → Account API tokens → row `owarin-archive-copy-20260923` → ⋯ → Delete. |
| — | r2.dev host | Keep for now (owarin.com is not on this Cloudflare account). Cloudflare documents r2.dev as rate-limited/non-production; Meta caches fetched images, so load is low. Moving to a custom domain later = change `R2_PUBLIC_URL` only. Re-check the current Cloudflare doc wording before quoting it. |

**Decided 2026-09-23 (CLOSED, log `decisions_20260923.csv`):** D1 = **Manual CSV upload** (not scheduled feed — S5 becomes "download META EXPORT, upload in Commerce Manager by hand"; S6 daily trigger is skippable). D2 = Replace mode, Instock-only (as recommended). D3 = OPEN — S1 found 152 SIZE_MISMATCH PIDs and produced the side-by-side review at `04 Design Tools/logs/fbcat_s1_run_20260923T141926Z/fbcat_s1_mismatch_review.html`; owner still needs to review it and approve an explicit replace list (or "keep remote") before this closes. D4 = **Single photo only** (no `additional_image_link` — drop that part of S2's scope). D5 = revoke the token (as recommended, owner does it manually in Cloudflare). r2.dev host = kept as recommended (not asked, informational only).

S0 also: archive discipline per AGENTS.md (grep refs → dry-run → move → log) — candidates: none required for this plan; `Facebook - Catalouge Project/OWARIN STORE - META EXPORT*.csv` (Aug, `catalog/` URLs) become stale after S5 → move to `Facebook - Catalouge Project/_archive/` then, not before.

## 3. Steps

### S1 — Live image-link gap report (read-only) · Sonnet · medium
Goal: for every product that will be in the feed, prove each image URL resolves to the right bytes.
1. Read first (only these): `04 Design Tools/audit-image-baseline.py` (reuse its service-account Sheet reader, header detection and SHA-256 helpers), `04 Design Tools/image-library.ps1` (strict matcher + `image-bindings.csv`), `IMAGE-LIBRARY-RULES.md` §naming.
2. Add ONE script `04 Design Tools/fbcat-image-check.py` (import helpers from `audit-image-baseline.py`; no new dependency). Inputs, all fetched fresh at run time: both inventory tabs (GAME GUIDE BOOKS + MAGAZINE, same scope as `_metaInScope`: Status = `Instock`), `r2:owarin-images/meta/images.csv` (rclone cat), `rclone lsjson r2:owarin-images/library --recursive`.
3. For each in-scope PID emit one row: `pid,title,sheet,status,n,exts,urls,remote_sizes,local_paths,local_sizes,class` with class ∈ `OK` · `NOT_IN_INDEX` (no index row; local photo exists → S3 add) · `NO_PHOTO` (no local, no remote → owner shoots photos; excluded from feed) · `SIZE_MISMATCH` (remote exists, local bytes differ → D3) · `EXT_ONLY` (index ext ≠ `.jpg`; fixed by S2, no upload) · `INDEX_KEY_MISSING` (index says key, R2 lacks it → stop, investigate).
4. HTTP check: `HEAD` every URL of the `OK`/`EXT_ONLY` rows (throttle ~5 req/s; r2.dev is rate-limited): expect 200 + `Content-Type: image/*`. Record status.
5. For `SIZE_MISMATCH`, write `fbcat_s1_mismatch_review.html` (local file, two `<img>` per row: remote URL vs local file path) for the owner's D3 review.
6. Output `04 Design Tools/logs/fbcat_s1_gap_<ts>.csv` + a 6-line summary (counts per class). Mutation: none.
Docs: this Status board. Acceptance: every in-scope PID has exactly one class; counts sum to in-scope total; 0 `INDEX_KEY_MISSING` or each explained.

### S2 — Apps Script v23: ext-aware URLs (+ additional images, SKIPPED per D4) · Sonnet · medium
Plan-first rule applies: post the diff plan, wait for "ok", then edit.
**D4 = single photo only** — skip `_additionalImageUrls()` and the `additional_image_link` column; keep only the `.jpg`-hardcode fix.
1. Read `Code_v22.gs` lines 2499–2990 and `Web App/README.md` file table; confirm how `R2 IMAGES!E:G` is laid out (header row, `|` format) with one live read.
2. Copy `Code_v22.gs` → `Code_v23.gs`, `WebApp_v22.gs` → `WebApp_v23.gs` (header "pairs with Code.gs v23"); archive v22 pair into `Web App/backup/` and leave stubs per AGENTS "Web App versioning".
3. Targeted edits in `Code_v23.gs` only:
   - `_r2Index()` — read `R2 IMAGES!E:G` once per execution into `{pid: {n, exts[]}}` (single ext repeats to n; `|` splits per position). Cache in a module variable.
   - `_imageUrl(pid, pos)` — `pos` default 1; returns `""` if PID absent or pos > n; ext from index. Keep the old signature working (`_imageUrl(pid)`).
   - `_additionalImageUrls(pid)` — positions 2..min(n,21) joined by `,`.
   - Add `additional_image_link` to the export as an optional column (extend `META_EXTRA` handling or add to header after `META_REQUIRED`; blank allowed). Do NOT add it to `META_REQUIRED` (would skip single-photo books).
   - `exportMetaCsv()`: rows whose `image_link` is blank → skipped with reason `noImage` (reported, not exported).
   - Split UI from logic: `_buildMetaExport()` returns `{rows, report}`; `exportMetaCsv()` = UI wrapper; new `refreshMetaExportHeadless()` = no `ui.*`, writes the sheet + a one-line result to a `META LOG` tab (used by S6). Same for the FB CATALOGUE fill if S2.1 shows new Instock rows don't reach FB CATALOGUE without `buildFbCatalogue()` (its `ui.alert` confirm must stay in the menu path only).
4. Tests: extend `Web App/Index.test.js` pattern (node) with a pure-function test for the index parser: uniform jpg, uniform png, mixed `jpg|png|jpg`, n=1, missing PID, pos>n. `node --check` on extracted JS; run `R2Upload.test.js` + `Index.test.js`.
5. Deploy = owner pastes `Code_v23.gs` into the bound Apps Script project (click-level in HANDOFF: Extensions → Apps Script → file `Code.gs` → select all → paste → Save (Ctrl+S) → reload the Sheet). Then owner runs 📘 จัด FB CATALOGUE and 📤 สร้างชีต META EXPORT once.
6. Log `fbcat_s2_code_<ts>.csv` (file, before hash → after hash, test results). Docs: `Web App/README.md` table, this board.
Acceptance: META EXPORT rows for the 19 Instock PNG PIDs now end in `.png`; a mixed-ext PID gets correct per-position URLs.

### S3 — Close image gaps (only if S1 has `NOT_IN_INDEX` or approved D3 replaces) · Sonnet · medium
Warning first line for owner: **this writes to the public bucket; add-only; nothing is deleted.**
1. Build an explicit manifest from S1 (`NOT_IN_INDEX` rows + D3-approved replaces): `local_path,sha256,target_key,action(ADD|REPLACE)`. Use the strict matcher's paths only — never fuzzy.
2. Pre-check each target key: ADD → must not exist (`rclone lsf`); REPLACE → remote object must still equal the archived baseline copy (size + `rclone check --download` on that key vs `owarin-images-archive/baseline/20260923T0718Z-3b229f4a/remote/<key>`), otherwise stop.
3. Dry-run: `rclone copyto <local> r2:owarin-images/<key> --dry-run` per row (ADD adds `--immutable`). Log. Owner "ok". Commit same commands without `--dry-run`. Never `sync`, never a directory-level copy.
4. Verify each uploaded key with `rclone check --download` (one-file filter) and HEAD 200.
5. Index merge, index-last: fetch current `meta/images.csv`, save a copy + SHA-256 to `04 Design Tools/logs/fbcat_s3_upload_<ts>/before-images.csv`; confirm that hash equals the baseline-archived `meta/images.csv` (then the private before-image already exists — no archive token needed; if not equal, stop and ask for a new archive-scoped token). Merge only fully uploaded PIDs with `build-r2-images-index.ps1` rules (keep all other rows), validate, upload, read back, compare.
6. Owner refreshes the `R2 IMAGES` import (reload sheet); rerun S1 → target: 0 `NOT_IN_INDEX`.
Refuter (Opus · high, fresh chat) only when the manifest contains any REPLACE: give it the manifest + S1 CSV + archive paths, not this chat.
Logs: `fbcat_s3_upload_<ts>.csv` (local → key, before size/hash → after, action, result). Do not activate the v3/v4 queue worker; that remains a separate gate in `PLAN-R2-HYBRID`.

### S4 — Build + validate the feed · Haiku · low (run) / Sonnet · low (fix)
1. Owner (or S6 function) refreshes META EXPORT. Download it fresh (Sheets API read of the `META EXPORT` tab — never a local old CSV).
2. Add `04 Design Tools/fbcat-feed-check.py` (stdlib only): header must be `id,title,description,availability,condition,price,link,image_link,brand,quantity_to_sell_on_facebook[,additional_image_link]`; unique non-empty `id`; `availability` = `in stock`; `condition` ∈ new/refurbished/used; `price` matches `^\d+\.\d{2} THB$`; title ≤ 150 chars; description ≤ 9,999 chars; every `image_link` + additional URL HEAD 200 image/* (throttled); every id is Instock in the fresh sheet read; ids set vs S1 `OK+EXT_ONLY+fixed` set → diff listed.
3. Output `fbcat_s4_feed_<ts>.csv` (row, field, problem) + summary. Fix data in the Sheet (owner) or code (S2 follow-up) until 0 blocking problems.
Acceptance: 0 blocking; skipped rows each have a reason the owner accepts.

### S5 — Connect the catalogue · Sonnet · medium
**D1 = Manual CSV upload — steps 2–3 below (publish-to-web + schedule) are SKIPPED.** Instead: owner downloads the refreshed META EXPORT tab as CSV and uploads it by hand in Commerce Manager → catalogue OWARIN STORE → feed `1048143251023664` → Update products → upload the CSV. Do this each time the inventory changes and before ads run.
Warning first line: **replace-mode fetch deletes catalogue items that are not in the feed (sold/hold/no-photo books). This is intended (D2). Reversible by re-adding rows.**
1. Before-snapshot (read-only): `ads_catalog_list_products` on 1993212747992458 with fields `retailer_id,availability,image_url,image_fetch_status` → save all 364 to `fbcat_s5_meta_<ts>/before-products.csv`. Diff vs S4 feed ids → `will_delete.csv`, `will_add.csv`, `will_update.csv`; show counts to owner; wait "ok".
2. Publish the tab (owner, click-level): Google Sheet → **File** → **Share** → **Publish to web** → tab **Link** → first dropdown: **META EXPORT** (not "Entire document") → second dropdown: **Comma-separated values (.csv)** → expand **Published content and settings** → tick **Automatically republish when changes are made** → **Publish** → **OK** → copy the URL. Only that tab becomes public; inventory costs stay private. Paste the URL into the HANDOFF (it is not a secret, but don't post it elsewhere).
3. Attach schedule to the EXISTING feed `1048143251023664` (keeps product IDs/ad history): preferred via connector `ads_catalog_update_product_feed` (daily schedule, URL = step 2, replace/deletion enabled, timezone Asia/Bangkok, hour after S6's trigger, e.g. 06:00) — this is a write: state exact args, get owner "ok" in the same turn. UI fallback: Commerce Manager → catalogue **OWARIN STORE** → **Catalogue** → **Data sources** → feed **OWARIN STORE - GGB UPDATE (08/08/2026)** → **Settings** → **Schedule** / "Replace schedule" → **Set up automatic updates** → paste URL → **Daily** → time → **Save**. (Meta relabels this UI often; if labels differ, use the connector or `ads_get_help_article`.) Rename feed to `OWARIN STORE - META EXPORT (scheduled)`.
4. Trigger one immediate fetch ("Request update now" / upload session via connector), then read `latest_upload` until finished: record detected / persisted / invalid / deleted / errors / warnings.
5. After-snapshot of products (same fields) → `after-products.csv`; confirm: no `catalog/` URLs remain, image_fetch_status = fetched for all, count = feed rows.
Docs: put the feed URL, catalogue/feed IDs and schedule in `03 Apps Script/Web App/README.md` §Meta (replace the old manual steps 1–4 there with the scheduled flow; keep manual download as fallback). Then archive the Aug CSVs (S0 note).

### S6 — Daily auto-refresh (SKIPPABLE — D1 chose manual upload, no scheduled feed to refresh) · Sonnet · medium
1. Owner, click-level: Extensions → Apps Script → left bar **Triggers** (clock icon) → **+ Add Trigger** → function `refreshMetaExportHeadless` → deployment **Head** → event source **Time-driven** → **Day timer** → **5am to 6am** → failure notification **Notify me immediately** → **Save** → authorize.
2. Next morning (or run once manually): check `META LOG` row + feed `latest_upload` after 06:00; log both.
Acceptance: one unattended day passes with fresh upload, 0 errors; a book marked Sold the day before is gone from the catalogue.

### S7 — Diagnostics + close-out · Haiku · low / Sonnet · low
1. `ads_catalog_get_diagnostics` on 1993212747992458 and `ads_catalog_list_products` with `error_type=IMAGE_FETCH_FAILED` (and any others reported). Save to `fbcat_s7_diag_<ts>.csv`.
2. Fix loop via S4/S2; stop when diagnostics show no blocking errors.
3. Close-out: board all DONE; HANDOFF block; update memory-worthy facts only in project docs (`STATUS_OWARIN-STORE.md` §FB catalogue one paragraph); archive superseded Aug export CSVs.
Next (out of scope): product sets (GGB vs MAGAZINE) and catalogue ads — belongs to the ads plan, not this one.

### S8 — (optional) R2 IMAGES formulas · Sonnet · low
Read the live B/C formulas first (one cell each). Replace the hardcoded `".jpg"` with the ext from column G for that PID (position 1: first token of `SPLIT(G,"|")`; position 2: second token or the single ext). Owner pastes (click-level), then re-run the `formula-link-risks` check → expect 0 of 67. Log before formula → after formula.

## 4. Guardrails (all steps)
- Fresh reads only (Sheet via API, R2 via rclone, Meta via connector); never reuse a number from this file or chat as current.
- No `rclone sync|delete|purge`; no directory copy to the public bucket; no deletion of legacy keys (4 `_to_delete/`, 4 dup PNGs, 52 keys of absent PIDs stay `KEEP_LEGACY`).
- Do not activate/replay the v3 `R2 JOBS` batch or the v4 worker — separate gate.
- Never paste tokens/secrets into chat, logs or docs. Meta writes and Cloudflare credential actions need an explicit owner "ok" in the same turn.
- Log columns (all `fbcat_*` CSVs): `TimeBangkok,Step,Operation,Source,Destination,Before,After,Mutation,Status`.
- Token discipline: next session reads THIS file + the files named in the step, nothing else. Big outputs (rclone listings, product dumps) go to files, summarised in ≤ 10 lines.

## 5. Start prompt for the next model (paste as-is)

> Stream B. Read `00 Docs/PLAN-FB-CATALOG_2026-09-23.md` only, then the files that step names. Do the first TODO row of the Status board. Follow its model/effort; if you are the wrong model, say so in one line and continue only if the step is read-only. Ask D1–D5 together at S0 if not CLOSED. After the step: update the board, write the log CSV, append the HANDOFF block, and state which model/effort the next step needs.
