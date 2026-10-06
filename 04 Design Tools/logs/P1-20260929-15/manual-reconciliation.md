# P1-15 manual reconciliation dry run (read-only, test Sheet only)

Change ID: P1-20260929-15; evidence Request IDs: add-1790674542719-40wrcvxbwlt, add-1790674543674-9qeygjqbszk, p1qa-status-fixture-20260929-01.

Fresh 2026-09-29 +07:00 export: test-sheet-reconciliation.xlsx SHA256 3F5B969E3416897FA9FB31138F863BF5A847F47D7FD8F469D90C0F0A4C67D5E7. Its exported formulas/values across all three tabs equal test-sheet-after.xlsx; no Google write was made for this dry run.

The ADD REQUESTS header is A:Q = Event ID, Timestamp, Request ID, Attempt, State, Actor, Entry Source, App Version, Sheet, Payload Hash, Row, Product ID, Before, After, Error, Result, Recovery Ref. For A28, C66:C67 is the exact ID, E66:E67 PREPARED→DONE, I66:I67 GAME GUIDE BOOKS, J66:J67 the same hash, K66:K67 row 20, L66:L67 SKU OWA-GGBS018N00. P67 contains a success Result with row 20/title/SKU; GAME GUIDE BOOKS A20:C20 independently matches title/SKU/New Arrival. A29 has the analogous exact-ID PREPARED→DONE in journal rows 68:69, row 21, SKU OWA-GGBS019N00 and matching inventory row 21. Both are resolved; a second Add would be wrong.

The fixture has C63:C65 = p1qa-status-fixture-20260929-01, E63:E65 PREPARED→ERROR→RECOVERED and K:L empty. This is an intentionally journal-only synthetic fixture; RECOVERED here is not evidence that an inventory row was written. Do not generalize it into automatic retry permission.

For a known ID, filter journal column C by exact ID, read all events in row/time order, inspect the latest state and consistent hash/row/SKU, then read the referenced inventory row including title, SKU and status. DONE plus matching row resolves the Add; uncertain PREPARED/ERROR/RECOVERED, missing result, mismatched row, or later edits require human review before any retry. Preserve the same ID and draft where available.

For a lost ID in a new tab/device, search the journal only in the bounded time window and inspect possible row/SKU links; do not assume that time/title alone identifies a request. The current journal Actor is literal Unknown, PREPARED has no title, and there is no cross-tab status lookup. If no unique chain and matching inventory row can be proven, stop, retain the evidence, and do not mint a fresh ID to replay the remembered draft. This is a fail-closed operator procedure, not automatic recovery and not a production journal.

Local read-only inspection initially failed because openpyxl read-only worksheets returned max_column=None. The evidence script was corrected to use the known 17 columns and rerun successfully. No business retry or recovery write occurred. Backups: handbook-before-reconciliation.md, implementation-before-reconciliation.md, handoff-before-reconciliation.md. Test Sheet version history retains the synthetic events; no cleanup/rollback of rows is needed.
