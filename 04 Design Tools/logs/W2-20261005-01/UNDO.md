# W2 recovery / undo — isolated only

จัดทำ: 2026-10-06T00:30:33+07:00 · `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`

**Do not overwrite the current workbook with a prior export: later history would be lost.** No automatic data rollback is authorized. Keep ORDERS/SALES/CLIENT IDs, allocated rows, recipient snapshots and append-only request events. Export the current isolated Sheet before any corrective write and compare exact values/formulas against original durable intent; unknown changes require reconciliation.

All W2 requests are DONE in final evidence. Do not repeat Prepare W2 fixture, Inject CRM after-effect failure, Repair observed synthetic text coercion or the old F05 repair. The observed first CLIENT correction has already completed under CRM `crm-e25e645597759a0b94bb7618f355e489633d7ac3afcf0556701ab91cbe7b698c`, retaining its textRepair before/formulas/after. Its parent confirm is `w1-1791211286953-0rsaw0nbbhm9`. If a future response is lost, keep its original Request ID and use Check / retry request or Recover original request; do not Confirm sold with a new ID. CLIENT failure after sale uses Retry client save, not a second sale. Existing DONE replays only return the canonical result.

Source rollback is different from data undo: fresh six-file pre-W2 source is in `google-source-before/`, v38 candidate backup under `candidate/backup/v38/`, standalone prior file under `before/04 Design Tools/`. Switching back to v38 hides W2 handling/CLIENT recovery and is inappropriate while any W2 request is unfinished. Keep all new data/events even if restoring source; compare every saved source to its exact backup through the editor. Never install QA helpers or candidate into production, and never restore source just to test print. Source attempts01–04 are evidence, not rollback targets.

No production/LAB undo is needed: neither was changed. `google-before.xlsx` and `google-coercion.xlsx` are private recovery evidence only. Current next step is the print gate in `CONTINUE.md`.
