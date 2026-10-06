# Undo — default subsidy0 v42

Before rollback, preserve any unsaved Cart/recovery record; use the existing deployment's Deploy → Manage deployments → Edit → Version → **Version5 (2026-10-06 07:34AM)** → Deploy. Keep original URL and owner/Onlymyself access. This restores the prior runtime default; it does not undo orders, SALES, stock, CLIENT or journal history.

For Head/source rollback, use exact before/native/Code.gs, webapp.gs, Index.html captured fresh before this change, or full local pair under `03 Apps Script/Web App/backup/pre-v42-20261006/` plus packet before/03 Apps Script/Web App/Index.html. Archive42 and update paired source references/tests/docs in the same pass; preserve unchanged helpers and all durable requests. No schema migration or data restore is needed for this UI default change.

Previous broader W1/W2 undo and private backup: ../W3-PROD-20261006-01/UNDO.md. Never restore old exports over later business history. Exact `W1-SUBSIDY0-20261006-01/v42@AD586F229B65505B7EF8E3473D6E0846EEDD298CDA4F3588BBC0C2A0F7131263`; native prior Version5 receipt deployment-before.json.
