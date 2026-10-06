# W1 issues and attempts

**BUILD-01** — delimiter/CRLF and non-unique UI anchors; first build failed before candidate output. bounded anchors/normalization; build and syntax PASS. Recovery/evidence: attempt outputs retained.

**HARNESS-01** — blank/sparse rows made mock last row/column wrong; incorrect shipping field assertion. fixed mock/field; repeated steps PASS. Recovery/evidence: w1.test.cjs attempts1–4 retained.

**F01** — partial ORDER LINES append could lose identity or reject its own partial row. identity-first + allowed empty/before/after cells; all create/cancel boundaries PASS. Recovery/evidence: attempts/F01-partial-record.

**F02** — finish ARMED retry expected SOLD while row still RESERVED. allow both only for ARMED; DONE verifies finished row; full suite PASS. Recovery/evidence: attempts/F02-finish-armed.

**F03** — owner check in shared lock could break unattended Meta; bulk callers lacked W1 guard; customer shipping malformed input defaulted. preserve common lock, scoped guards, keep invalid input; regression PASS. Recovery/evidence: attempts/F03-shared-callers; source inspection finding, no live trigger claim.

**F04** — manual UID/status changes reproduced second reservation; API sort lacked recovery gate/checked write. global managed UID existence/uniqueness, sort gate/write/readback; original repro now rejected. Recovery/evidence: uid-reproduction.txt; attempts/F04-uid-sort-readback.

**F05** — Sheets alert suspension loses lock; maintenance needs reacquire before critical write. lock/guard immediately before PID/restock write; source-backed correction; relevant tests PASS. Recovery/evidence: attempts/F05-maintenance-lock; Google Ui reference; real menu concurrency still pending.

**F06** — browser observed subsidy reused by next cart; single Shopee disabled subsidy; stale single-sale formula text. clear subsidy after create/sale/clear, keep single subsidy editable, fix hint; UI/unit PASS. Recovery/evidence: attempts/F06-subsidy-new-cart; synthetic browser only.

**F07** — duplicate existing UID rejected after five progress events rather than preflight. validate resolved UID even on SKU lookup; no intent written; actual duplicate + midnight tests PASS. Recovery/evidence: duplicate-uid-reproduction.txt; attempts/F07-duplicate-UID-before-intent.

**TEST-ARGS-01** — new guard test called flags function with wrong signature; attempt7 failed. correct two-argument invocation; subsequent attempts PASS. Recovery/evidence: w1.test.cjs.attempt7.txt.

**BROWSER-01** — unsaved filename/renamed option selectors and disabled Save timed out; checkbox input ineffective; file option selection unreliable; Cancel dialog command timed out. fresh DOM/name-text selection, label click, clipboard readback after reload; Cancel was confirmed by toast and final card. Recovery/evidence: no blind mutation retry; final source matches; local Cancel has one request.

**GOOGLE-AUTH-01** — two fixture Run attempts stopped before execution at Authorization; Review permissions popup not exposed. cancelled both; explicit bound-sheet/UI/identity/external-request scopes; owner action requested. Recovery/evidence: test-before/ sources + Sheet; test data/formulas unchanged; no Google runtime PASS.

Freeze verification attempt1 expected only one Index storage-key substitution and failed; stage intentionally replaces both production key and TEST_OR_PROJECT. Corrected verifier to compare the exact forward staging transform; no runtime/source change. Retry/result in verification.txt; original verifier backed up under before/. Change W1-20261003-01, Request W1-FREEZE_ATTEMPT1.
