# W1 final focused review — PASS

2026-10-05 +07 · Session44 · Stream B · master §§2,5,5.2.1,6,9.

**Verdict: PASS for W1 local candidate / isolated test acceptance.** No reproducible blocking finding in the reviewed money, reservation, access, journal and recovery paths. This completes the requested final focused review; W1 is closed in that scope. W2 implementation and W3 production release remain separate work.

Exact revision: `W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42`. Source remains in `../W1-20261005-01/candidate/`; this review changes no runtime source, test data or deployment. One writer, no agents. Review lane requested by the owner: GPT-6 Astra / High; no programmatic model-switch or independently verified runtime-model metadata is claimed.

## Findings and checks

| Area | Review conclusion and evidence |
|---|---|
| R7 money | W1Orders.gs:19–27,116,166,198,426,446: validated new inputs have at most two decimals; totals accumulate integer cents. Maximum 100 × 10,000,000 baht plus shipping stays within exact integer arithmetic. Profit readback requires a finite number and the original formula; 0.0000001-baht tolerance covers representation noise while rejecting a one-cent change. Both engines use the same comparator. |
| Historical intent | Normalization changes materialized subtotal/total only. Stored payloads, prior hashes, event rows and request IDs are not rewritten. Legacy requests retain their old engine; missing original intent or conflicting materialized data fails closed and can require manual reconciliation. |
| R5 journal / stock | W1Orders.gs:359–452: durable ARMED precedes effects, flush/readback precedes DONE; completed steps verify on recovery. Fresh source/UID/claim and permitted before/after values guard each batch. Draft line metadata is read back before claims activate. SALES uses stored allocated rows and detects moved/duplicate line IDs. The shared script lock and unfinished-request gate serialize sibling operations. |
| R6 / UTF-8 | W1Orders.gs:16–18,203–213,322–329: new hashes explicitly use UTF-8; old-hash requests also compare original payload when available. ID-only resume reloads the stored action/payload server-side under the shared lock, avoiding transport key-order reconstruction. UI Index.html:2044–2125 retains the request before send and uses server outcome before clearing recovery state. |
| Access / entry points | WebApp_v38.gs:23–80 and Code_v38.gs:267–278: owner gate precedes API routing, mutation helpers gate again, and lock state is reset in finally. Sale aliases route to the transaction engine; old ledger writers fail closed. Final-review content uses escaped text and does not create another sale on recovery. |

Reviewed the exact v37→v38 patch and carried R5/R6/UTF-8 packet, tracing the transaction and UI recovery callers. Fresh read-only `verify.cjs` passed: four candidate LF hashes and aggregate revision, six saved test-source readbacks, unchanged manifest, paired version-only Code/WebApp diff, unchanged Index, syntax, and final-export SHA256. `verification.json` records the result. No runtime source changed, so no version bump or repeated broad fixture run was needed.

Behavioral evidence is dated **2026-10-05**, reread from its saved artifacts, not a fresh live-sheet claim: package01 `decimal-results.json` contains 21 targeted batch/legacy, typed/one-cent rejection and after-effect retry groups; `google-native-decimal.json`, `google-native-replay.json` and `google-v38-assertions.json` document two decimal UI orders, three SALES, four original-ID replays without new effects, and preservation of old cells/events/Pending08. Final export: 1,345,964 bytes, SHA256 `9cc89d03dc705843fa153de72e3c06d1a68cb276977ce00bc1978c71fb27af2e`. Package05 retains the earlier 724 batch failure-position checks, owner/intent/Unicode checks, actual two-tab/lost-response UI evidence and F05 repair proof; these are historical checks of the carried paths, not rerun v38 performance measurements.

The withdrawn native-v37 profit-failure claim remains withdrawn: native getValues returned 280.03000000000003, while XLSX cached 280.03. A cent-normalized mock or export alone does not establish a native failure. v38 is cent-total/readback hardening.

## Retained limits and recovery

Sheets writes cannot be atomic against direct owner edits; undelivered triggers/direct edits are not exhaustively audited, and cross-marketplace stock synchronization is absent. Old intents without original payload or conflicting externally changed rows can require manual reconciliation. These established boundaries remain; the verdict is not production-release approval.

No code/data rollback is needed. Source/data recovery remains `../W1-20261005-01/UNDO.md`; preserve original IDs, allocated rows and append-only events. Review-session document backups are under `before/`, with before/after hashes in `changes.csv`; restore individual documents only after checking for later edits. Session43 handoff was moved to `00 Docs/_archive/handoffs_old/HANDOFF_2026-10-05_Session43.md`; frozen acceptance packages remain in place as evidence.

**Next:** no W1 action remains. Await the owner's separate instruction for W2; W3 remains the production-release gate.
