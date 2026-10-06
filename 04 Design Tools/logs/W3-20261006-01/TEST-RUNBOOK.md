# W3 local/test installation and recovery packet

Stream B · Session48 · 2026-10-06 · one writer · local candidate / named isolated test only.

Exact candidate: `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`. Source is unchanged. No installation is needed in the existing isolated project: its recorded saved source already matches this candidate. This packet does not authorize production, a numbered deployment, real CLIENT migration, or Back House LAB.

## Source reconciliation before any future isolated source change

1. Open only Apps Script project `1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd`, bound to test Sheet `13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM`. Check the full ID before editing.
2. Export the current test workbook and capture every current source file and `appsscript.json` before a write. Compare saved editor content against the candidate; normalize CRLF to LF for SHA256 only, never trim whitespace. Keep a before→after CSV. A historical export/readback is evidence, not a fresh backup.
3. Candidate mapping: `Code_v39.gs` → `Code.gs`; `WebApp_v39.gs` → `Webapp.gs`; `W1Orders.gs`, `W2Clients.gs`, `Index.html`, `LabelRenderer.html`, `W2LabelUI.html`, `W2Suggest.html`, `LabelDialog.html` retain their names. The exact nine files and hashes are in `../W2-20261005-01/revision.json`. Retain the manifest unless a separate scoped requirement exists. `W1Qa.gs`/`W2Qa.gs` and the QA toolbar belong only to the isolated test; they are excluded from the nine-file candidate.
4. After a separately needed edit, save and read back all affected files before opening the same `/dev` URL. Code changes require the paired version/backup rule. Never deploy a numbered version just to test.

## Legacy CLIENT migration: executed locally, native six-column case still untested

Run `migration.test.cjs` with Node (built-in assert/VM; existing W1/W2 harness). It exercises the actual v39 schema helpers on synthetic six-column CLIENT rows, with original values/formulas, equal names, a blank row and already-numeric legacy contact values. The dry-run writes nothing. The migration writes only appended G:H identities and headers; it never repairs lost leading zeroes or rewrites A:F. An already-valid eight-column CLIENT needs no migration.

The helper is **test-Sheet-ID restricted**, uses one fixed request ID `qa-w2-client-schema-20261005`, and saves allocated IDs/revision in its durable intent. In the existing Google test this request is already DONE and CLIENT has eight columns. Do not replace that table with a six-column fixture or replay Prepare expecting another migration: this would invalidate existing identities/history. A native legacy migration needs a separately designed isolated fixture that preserves those records; real-store schema reconciliation stays a separate authorization.

On an interrupted local migration, restore the injected test fault and call **the same `w2PrepareTestSchema()` helper**, retaining the request and workbook state. Generic UI `requests.resume` does not support `W2_SCHEMA`; do not use it for schema recovery. Unexpected A:F or G:H changes must stop with `CLIENT_MIGRATION_CHANGED`; reconcile against the original intent before any correction. Never generate replacement IDs or erase request events.

## Workflow and recovery checks

Local tests cover SHOP Create → Cancel → Create → Confirm with an explicitly selected migrated Client ID/revision; separate recipient snapshot; SHOPEE direct Confirm → Label later → Save label; read-only preview and original-ID replays. The SHOPEE test asserts ledger 300 for entered price 500. CRM after-effect failure leaves one sale and completes only the original client request on retry. Test injections are simulations, not evidence of native batch atomicity or Sheets coercion.

For the named test `/dev`, `Read native proof` and `Replay original requests` are the reviewed read-only controls for existing DONE synthetic requests. Do not run `Prepare W2 fixture`, `Inject CRM after-effect failure`, `Repair observed synthetic text coercion` or the old F05 repair. On a future genuine timeout, use the original Request ID with `Check / retry request` / `Recover original request`; on `Sale saved; client save needs retry`, use `Retry client save`. Do not Confirm sold again under a new ID.

## Undo and remaining acceptance

Authoritative recovery remains `../W2-20261005-01/UNDO.md`: retain new IDs, recipient snapshots, SALES, stock and append-only events. Never restore an old XLSX over later workbook history. Source restoration is separate from data undo; the retained pre-W2 source/v38 backup is inappropriate while any W2 request is unfinished. No automatic source/data rollback has been executed in this phase.

PDF page/content and physical Print/Reprint: **DEFERRED — ยังไม่ได้ทดสอบ; NOT PASS**. Do not retry browser/printer setup during independent work. Native six-column migration and a fresh complete two-channel UI flow are not proven by local VM checks or DONE replay. These gaps remain visible before release; local readiness is not W3 production completion.
