# Final focused W1 review — exact v38

จัดทำ: 2026-10-05 +07

Review W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42; four LF hashes revision.json, paired candidate/Code_v38.gs + WebApp_v38.gs, W1Orders.gs and unchanged Index.html. One writer, only local/exact isolated test; no production/LAB/W2 or repeated P0/P1/fixtures. Return PASS or a precise blocker with invariant/file/line/repro/smallest fix. No new agents/chats.

New diff: diff/v37-to-v38-W1Orders.patch; the paired Code/WebApp changes are version strings only. Check cent accumulation, typed finite profit comparison/tolerance, and historical floating-total materialization in BOTH batch/legacy without journal/hash changes.21 targeted decimal/failure/retry groups PASS; actual Google two UI orders and3SALES have exact formulas, all requestsDONE and four same-ID replays. Final export verifier proves1151old journal rows and old Pending08/all old cells preserved. Full six-file Google readback and manifest equality recorded.

Important correction: Native correction: the XLSX export rounds cached numeric results; actual Apps Script getValues returns280.03000000000003 (same as V8) for390.10−100.05−10.02. The initial adapter repro is a cent-readback compatibility counterexample, NOT proof of a native v37 transaction failure. Native subtotal roundtrip of the old unrounded candidate was not tested. v38 is scoped cent-total/readback hardening; the original native-failure claim is withdrawn. Do not re-open a native bug based only on a rounded export. New implementation/test outcome is result.md; native/export assertions contain full provenance.

Also finish the carried W1 critical review of unchanged v37 R5/R6/UTF8 paths using ../W1-20261004-05/REVIEW-ASTRA-HIGH.md and its dated tests/evidence: ARMED before effects/DONE after exact readback, fresh owner/UID/claim/cell guards, fixed SALES allocation, ID-only original payload resume, explicitUTF8 new hashes/legacy collision checks. Do not rerun unchanged100-item timings or F05 reconciliation. F05 is closed and events immutable.

Preserved limits: Sheets transactions cannot be atomic against direct owner edits; no cross-marketplace stock sync; old intents lacking exact payload may need manual recovery. UNDO.md is current. Formal requested named-model sign-off has NOT occurred; current-writer source review found no further blocker.
