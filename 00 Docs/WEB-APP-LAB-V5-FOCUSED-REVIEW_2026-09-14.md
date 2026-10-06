# Version 5 focused review

Verdict: CHANGES REQUIRED before candidate sign-off. Reviewed locally on 2026-09-14. No candidate source, cloud data or deployment changed.

## Reviewed revision

Project: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN Back House LAB`.

| File | SHA256 |
|---|---|
| Code.gs | 95C97D3B8FD4C319B64DFC5A91CFA0A100B7D70D029C5A0BD17731ABC8139F9A |
| Index.html | 71F0B8E72B5742635B06310BE266D2E1028896971A4C5C0B7616C84EFC5F6C57 |
| tests/logic.test.js | C7C8C9A373586680D535AF1E80F6A4855AC19115FB36771EAF04D811252AE486 |
| tests/ui.test.js | 056C5A192EB5AE71DAF8E870567DA2CED0B4A872C4BAAEAADFC16E13452B02EE |

## Findings

### R1 — P1: payment recovery is lost from the UI after reload

Locations: Code.gs:255, 280–283; Index.html:166–189.

Inject failure in auditOnce_ after a new Payment row is written. SaveRequests remains STARTED and its payment audit entry is missing. getOrder() nevertheless returns PAID, because it sums payment rows without exposing their incomplete journal state. Reload replaces paymentRequestId and disables Record full payment; a new-ID attempt is rejected as overpayment. Recipient saving remains permitted. Thus a normal reload leaves the operator unable to complete the interrupted transaction through the app, with incomplete audit history.

The server can recover if explicitly called with the original request ID and payload; the new tests demonstrate that narrower case. They do not prove recovery after reload. This is a surviving integration gap in the existing path, not a claim that Version 5 newly introduced it.

Required correction: expose pending payment completion distinctly from confirmed completion and provide a recovery action using the persisted original request/payment under the lock. Do not treat the payment as unpaid or append a second payment. Keep recipient/label finalization blocked while payment completion is unresolved. Add an interrupted-payment → reload → recovery test proving one Payment, one audit entry, COMPLETE journal and correct final action states.

### R2 — P1: an old recipient response discards the newer draft and enables its label

Locations: Index.html:202–212 and recipient input listeners.

Start Save & preview label, edit the address while the RPC is pending, then deliver the successful response for the earlier address. The input listener hides preview and disables Print, but the success handler checks only order ID. It overwrites the newer draft via renderOrder(), renders the older address and re-enables Print. The simulated UI reproduced draft loss and Print becoming enabled.

Required correction: bind the response to its submitted recipient request/draft generation, or prevent relevant edits while that save is pending. If the draft changes, preserve it and keep Print disabled until that draft is saved. Test the race for both successful and failed responses. This is a surviving race in the recipient/label flow, not newly introduced by the width check.

## Passing checks and limits

- Candidate hashes matched the V5 handoff.
- Code.gs syntax, existing logic.test.js and ui.test.js passed.
- Additional mock probes confirmed invalid zero/negative/partial/over/non-numeric new payments leave all tables unchanged; missing Payments/AuditLog/SaveRequests block a write path without recreating tables; extra headers block runtime reads.
- Attribute-context encoding is appropriate for the existing quoted attributes. Full DOM reconstruction is not required for this fix. Both dimensions participate in the label fit gate.
- Payment retries after row/audit interruptions pass when the original request is available. No repeated charge was observed in these probes.
- No new live export was needed: all new findings concern local source and fictional in-memory test data. No current live counts or deployment verification is claimed for this review.
- Browser layout, actual HTML parsing, Apps Script/Sheets service behavior under concurrency and native print/PDF are not established by these mocks. Physical 100 × 150 mm printing remains pending.

## Reproducer

Run from OWARIN STORE: `node "00 Docs/webapp-lab-v5-review-repro.cjs"`.

The script reuses the LAB test harnesses in memory and asserts the observed defects. Exit 0 means those observations were reproduced, not that the candidate is safe. It does not modify the candidate or business data.

## Next step

Resolve R1/R2 with focused regressions, then review the updated hashes. Sol / High is the recommended implementation setting under the saved policy; no model switch is claimed. Upload/deployment remains a later authorized gate.

## Remediation candidate — 2026-09-14

The original verdict above remains the result for the reviewed hashes. A later local-only candidate addresses R1 by exposing `PENDING_COMPLETION`, retaining the persisted payment request/payload across Reload, blocking recipient finalization, and completing the same Payment/Audit/SaveRequest path. It addresses R2 by discarding stale recipient success and failure callbacks when the draft request ID has changed.

Regression coverage now proves audit- and completion-interrupted payments reload and recover to one Payment, one audit and a COMPLETE request, with the expected UI gates; it also proves newer recipient drafts survive both stale success and stale failure responses with Print disabled. `Code.gs` syntax, `tests/logic.test.js`, and `tests/ui.test.js` pass. Updated hashes are recorded in the change log and handoff; focused re-review is still required before upload or deployment.
