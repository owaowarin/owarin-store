# P1 production installation — Session34

จัดทำ: 2026-10-03 21:56:32 +0700. Stream B §§2,5,6,9. Change `P1-20261003-03`; Request `P1-PRODUCTION-READY-001`; one writer; no agents/chats. Owner explicitly approved source/schema/deploy after requiring backups for undo.

P1 **Add is installed and ready on the existing production endpoint**: Code/WebApp v31 pair, reviewed UI and guarded P1Journal add-on; ADD REQUESTS sheet ID1424987581 with exact17 headers; deployment Version4 (previous3), unchanged URL/owner-only access. This completes the bounded P1 promotion. Orders, reservation, shared sales transaction and Label P2 remain separate uninstalled work.

## Rebase and validation

Fresh production editor full readback matched local v30/v28/Index before any mutation. Reviewed Session33 P1 helpers/Add/API/UI/formula-readback were moved onto current v30 to retain Meta dedup/title/nightly-refresh/PID changes. `readiness.test.cjs` proves all existing Code regions outside Add/formula/version unchanged, resolves actual fresh GGB/MAG headers, and rejects invalid input without business delegation. Production journal event writes additionally use existing `_tryWrite` as project rules require; failures preserve the diagnostic in the exception. App Version journal field now records `Code v31 / WebApp v31`.

P1 Add/UI failures/retries, wrong-Sheet/idempotent/failed-header/mismatched-existing-journal guards, Index inventory, image URL, FB catalogue and Meta pipeline suites PASS. Outputs are `*-output.txt`; runnable source/tests are in `stage/`. Current production code path differs from the isolated QA candidate only by bounded rebase, version labels and checked journal wrapper. Session33 actual isolated R1–R4 fault-injection evidence remains in `P1-20261003-02/`; this session did not create fake stock/sales in the shop.

Actual production readiness at21:42 checks both header mappings, exact journal schema, read-only NOT_FOUND lookup and invalid source/non-string status rejection; event count stays0. New source readback after completed Save and fresh reload exactly matches all4 staged hashes. Existing deployment was updated to Version4 at21:44; `/exec` loads, inventory is rendered, Add modal opens with New Arrival, then closes without Save. No production normal Add/DONE event is claimed yet; first real owner transaction must retain Request ID and verify one row plus PREPARED→DONE. Local/isolated tests prove normal/failure/retry paths. New-tab/lost-ID recovery remains manual; actual network outage remains unproven.

## Exact installed source

Project `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp`; Sheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. Source files: `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE\03 Apps Script\Web App`. LF SHA256 after fresh live readback:

| File | SHA256 |
|---|---|
| `Code_v31.gs` | `6EF098CD39F5B82F888D60A41577C71ECD3C81C26D4E4604E41EEFB27E87CD5D` |
| `WebApp_v31.gs` | `7102CC7FA4735F5859B7E8F11092B0CADC2BF155E5D204658949A11696ACE67D` |
| `Index.html` | `5ECE912BC9AE2F7D7FBB9662C2E417B125F78930C68C0D9A03619DE44EB69AEB` |
| `P1Journal.gs` | `FDF4B656488EA92DB4CCB50B573AC75BFD8AA27C91769B425E03FF06509890BF` |

[Production web app](https://script.google.com/macros/s/AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn/exec). Version3 pinned deployment is the /exec rollback; before/Code_v30.gs and before/WebApp_v28.gs are the separate pre-install saved-head rollback. Access remains Only myself. FbAlbum/R2Upload source and triggers were not edited; Back House LAB was not touched.

## Before → after Sheet evidence

Fresh full exports taken before mutation and after deployment, 2026-10-03. Contains private shop data: retain locally; public notes contain schema/hash/result only.

| Snapshot | Bytes | SHA256 |
|---|---:|---|
| `before/shop-sheet.xlsx` | 1,535,818 | `D9989BA034C1744819C78870A53B1EE45039FF4673544EB98A63FCC203C733C2` |
| `shop-sheet-after.xlsx` | 1,539,120 | `06253E201BBFE1A08B84A7273C79FFAB1FCC1B95495887A7FA09B0D3F9E080B0` |

`verify-shop.py` PASS: all17 original tabs and195246 stored cells have identical values/formulas (ArrayFormula text+ref compared); original tab relative order unchanged. Only ADD REQUESTS was inserted after active SALES, with17 exact header values and no journal events. Existing inventory/SALES/CLIENT/Meta values/formulas unchanged. GGB/MAG header sets differ by design; readiness checks their common columns plus GGB-only Platform/Genre/Sub Genre.

## Issues, retries and recovery

Every attempt is in changes.csv and Implementation log. Automatic approval review initially rejected the production action twice, retaining the original no-production restriction and treating backup-first reply as preparation only. No workaround was used; owner then explicitly approved source/schema/deploy. A reload was deferred by auto-review until Save completion; screenshot/DOM cloud_done established completed Save and the permitted retry succeeded. One stale function-selector target failed before action; semantic DOM+ screenshot selection prevented an unintended Run.

Local Add test initially expected INJECTED but journal wrapper discarded the detailed cause; `_sp2WriteErrMsg` was added and retry passed. PowerShell LiteralPath wildcard and rg glob-path errors were corrected using proper wildcard/-g; no data changes. Export verifier first assumed new tab last, then compared ArrayFormula instances by identity; corrected relative-order/content checks passed. Four apparent formula differences were only separate object instances; actual formula text/ranges match. Formula cell G2 is hidden in SALES, so navigation advanced to visible rows; no edit was sent, one stale-grid attempt sent no input. Earlier guessed action timestamps in CSV were corrected to recorded timestamps; exact runtime UI times preserved.

Full undo instructions: `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE\04 Design Tools\logs\P1-20261003-03\UNDO.md`. Preserve current data/events before any rollback; never restore the entire old workbook over newer edits. Use original Request ID for uncertain Save; ERROR/partial row requires manual reconciliation, never a new ID. Source backups/diffs, version pair archives/stubs, README/test updates and docs are in this package's before/, *.diff and current Web App/backup/. No new source/schema migration creates Orders or stock reservations.

## One next step

Use the deployed P1 Add for the next real stock addition and reconcile its first Request ID/DONE; continue P2 transaction/reservation/Orders/Label as a separate bounded change. Do not treat the P1 journal as covering legacy sales/order paths.
