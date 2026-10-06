# P1 v31 undo — production backup before installation

จัดทำ: 2026-10-03 21:36 +07:00. Change `P1-20261003-03`; Request `P1-PRODUCTION-READY-001`.

Owner condition: back up everything used in the real shop before testing, for undo. Only P1 Add is being promoted; Orders/reservation/Label transaction work is separate.

## Verified before state

- Production project `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp`; Sheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`.
- Full fresh Sheet snapshot: `before/shop-sheet.xlsx`. Contains business data; keep it local and do not paste customer records into logs. `shop-schema-before.json` lists names/headers only. No ADD REQUESTS tab at this read.
- `before/Code_v30.gs`, `before/WebApp_v28.gs`, `before/Index.html` are byte-preserving local copies whose normalized LF hashes match fresh live editor readback: `878360DFDD420CE8C4B8CC82DB7D63951C807031C5D1E190F08F69C869BAE44A`, `89887B523EC8803083E62AE06BBC89A4D3EF940277190AEB77B39E142CB1C84F`, `0F7C099C761DCE35DFC27D562AA98D3A34EF4B6A0A6224670BB18ED61E384FD3`.
- Active deployment before change: **Version 3**, description `v27 - Meta pipeline hardening 2026-09-25`, dated Sep25 2026 17:40 in UI. Deployment ID `AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn`. Execute as owner; access **Only myself**. Existing URL ends `/exec`; do not create a replacement URL or change access.
- FbAlbum.gs/R2Upload.gs are outside the installation and will remain intact. P1Journal.gs is a new add-on containing only guarded migration and read-only readiness checks.

## Undo without business writes

1. Stop Add activity and export the latest Sheet; inspect for concurrent changes and any ADD REQUESTS events. Never overwrite the live workbook with the old full snapshot.
2. Apps Script → Deploy → Manage deployments → select the active deployment → Edit → Version **3** → Deploy. Preserve execute-as/access settings and deployment ID. Read the success/version back.
3. Restore Code.gs from before/Code_v30.gs, webapp.gs from before/WebApp_v28.gs and Index.html from before/Index.html; Save and read all full source hashes back after reload. This also restores /dev and bound menu code to the verified pre-install head; Version3 /exec is a separate older pinned backup.
4. Keep the new P1Journal.gs inert (no trigger/menu installs). Keep an empty journal tab for review; deletion is not required to restore the old runtime. Do not remove backups or existing history.

## Undo after a PREPARED/DONE/ERROR or inventory write

Preserve the journal and current Sheet export. Reconcile the exact Request ID, payload hash, original row/SKU and committed snapshot before source rollback; document newer edits. Never replay an uncertain Add with a new ID, delete journal evidence or restore the entire workbook. A formula/readback error may leave a partial row that needs an individually logged repair. The full snapshot supports comparison/recovery, not blind replacement.

## Production test restrictions

Use schema/source/readiness checks and invalid-input rejection to verify production without inventing a fake stock row or sale. Normal Add/failure/retry have already run in the separate synthetic test project; first actual owner Add must retain its Request ID and read back one row plus PREPARED→DONE. No production sale, stock reservation or customer write is part of this installation.
