# Next step — Add item Save speed (v44, after v43 is live) — prepared 2026-10-07 by Opus; execute with Sonnet, Opus reviews
Read `00 Docs/STATE.md`. Do this only AFTER v43 is PASS owner-confirmed (Version 7). Owner approved the plan below: "<paste owner reply>".

Path traced (Code_v43 `addInventoryRow`, WebApp_v43 `_apiInvAdd`): lock → header reads → FULL ADD REQUESTS journal read (17 cols incl. Result JSON, grows every Add) → full inventory read → PREPARED event (write + flush + readback) → ~20 setValue + 4 setFormula → flush → row readback + 4 separate getFormula reads → DONE event (write + flush + readback) → `_apiBookingMatch` → `_sheetByHeaders` reads the header row of every tab (~25) until it finds BOOKING (`_colCache` is per execution, no reuse).
Unmeasured: the 3 flushes each wait for sheet recalculation; that may dominate and is not changed here.

Step 0 (measure first, no code): owner opens Apps Script → Executions, adds one real item, reports the Duration of the `api` run. Optional: add `console.log` phase timings (Date.now deltas) as v44a, read them in Executions → the run → Logs.
Changes (keep every guard: same Request ID semantics, PREPARED before effects, value+formula readback, DONE event):
1. Journal lookup: read only cols 3–4 (Request ID, Attempt) for all rows; read the full 17-col row only for the matching prior. Same `prior` = last match, same `attempt` = max+1. Apply to `addInventoryRow` and `_apiInvAddStatus`.
2. Formula readback: one `getRange(newRow,1,1,lastCol).getFormulas()` instead of 4 `getFormula()` calls; compare the same keys.
3. Booking: `getSheetByName('BOOKING')` first, verify headers bookingName+gameTitle via `_resolveColumns`; fall back to the existing `_sheetByHeaders` scan.
Tests: p1-add (all 20 Add calls incl. retries/readback failures), p1-ui, all suites; add tests: journal with matching row in middle/last, attempt numbering unchanged, formula mismatch still rejects, BOOKING renamed → fallback scan still finds it. Pair bump Code/WebApp v44, backup v43, logs per CLAUDE.md. Owner pastes Code.gs + webapp.gs only (Index unchanged) and deploys a new version; compare Executions Duration before/after.
