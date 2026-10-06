# Web App LAB — Version 3 focused integrity review

Review date: 2026-09-13. Stream B; master §§2, 5.1, 6, 9; accepted LAB requirements and model harness. Ponytail full: reuse the existing test doubles, no new dependencies. Verdict: **CHANGES REQUIRED** before the integrity gate passes or shipment work begins.

## Reviewed snapshot and limits

Independent project: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN Back House LAB`.

- `Code.gs`: SHA256 `5B897D8672259406276788F498E381971A3C0147B4CB73F17F194FCEDF1DC4C0`.
- `Index.html`: SHA256 `F44496929874E28B4B37401F092801F2B9D5DF120A73DE3EECE12214D80ABFB2`.
- `tests/logic.test.js`: SHA256 `3AAB213BF0239B64B69BD3DD7547D811396DC584FD8A5EC245928A423587C968`.

Fresh hashes match the previously recorded Version 3 source. This turn reviewed the local snapshot, not a fresh cloud export; no current cloud values or deployment permissions are newly certified. Files are untracked, so review covers full source snapshots, not a committed diff; `git diff --check` alone would check no untracked source. Routing recommendation: Astra / High; owner reports switching, and the session received a GPT-6 model-switch notification, but exact effort is not independently exposed.

## Findings

### R1 — P1: bind actions to the loaded Order, not the editable lookup field

Location: `Index.html:180` and `Index.html:186`; related reload handling at `Index.html:165` and listeners at the end of the script.

Load Order A, edit the Order ID field to B without clicking Reload, then save recipient: the UI still displays A's fields, but the outgoing request targets B. If B is paid, A's address can overwrite B; the equivalent payment path can record against B when its balance matches the amount displayed for A. Existing label printing also stays enabled for A while B is in the lookup field. A failed reload leaves the same mismatch possible.

Confirmed using the actual client script with DOM/RPC doubles: request target was `ORDER-B`, recipient was `Recipient A`, and the old Print button remained enabled. Fix by invalidating the loaded selection/actions/preview when the lookup ID changes and binding actions to a successfully loaded Order ID; ignore stale asynchronous responses. Test ID edit, failed reload and out-of-order callbacks before accepting the fix.

### R2 — P1: preserve operation state across interrupted recipient writes

Location: `Code.gs:170` and `Code.gs:176` (Order update precedes audit and request completion).

If the Order write succeeds but audit fails, the request remains STARTED. Retrying rereads the already-updated row as its before-image, so the actual original recipient is lost from the audit. More seriously, if a newer request successfully saves another recipient before the old request retries, the old STARTED request unconditionally overwrites that newer recipient. ScriptLock serializes each attempt but does not protect against this sequence across attempts.

Both outcomes were reproduced with a failure injected immediately before the audit write. Preserve the original before/after intent durably and distinguish already-applied/recovering writes from new mutations; block or safely resolve stale retries before newer state can be overwritten. Required tests: failure after Order write, after audit write, delayed retry after another successful save, and exact complete replay.

### R3 — P1: block payment until order confirmation is complete

Location: `Code.gs:195` (payment eligibility), with Order header creation at `Code.gs:140` and unchecked reads at `Code.gs:211`.

Confirmation creates the Order header before its OrderLines and before marking SaveRequests COMPLETE. Failure at the first line write leaves a reloadable Order with zero lines; `recordPayment` checks only Order status and balance, so it accepts full payment for that incomplete sale. This is inherited from the first slice but directly affects the paid-order gate for labels.

Reproduced in memory: confirmation request STARTED, zero lines, then full payment accepted and payment status PAID. Require completed confirmation and consistent line count/totals/allocations before exposing a payable Order, with a deterministic way to resume the original request. Test interruption at each confirmation write boundary and reject payment/label finalization while incomplete.

## Label acceptance gap

The CSS defines a 100 × 150 mm print page, but `Index.html:38` permits a taller on-screen label and `Index.html:48` fixes print height without fitting/blocking overflow. Recipient strings may reach 2,000 characters; long addresses and long unbroken names need browser and print-preview overflow tests. Physical/PDF print fit remains unverified; the prior short preview does not close this requirement. This is a separate outstanding acceptance check, not a claimed live printer failure.

## Reproduction and checks

Run the read-only diagnostic (it reuses the existing test fixture entirely in memory):

```powershell
node "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\04 Design Tools\webapp-lab-v3-review.cjs"
```

Four diagnostic scenarios confirmed the three findings. The diagnostic intentionally asserts the defective Version 3 behavior; successful exit means reproduction, not acceptance. Baseline `node tests/logic.test.js` passed; backend and diagnostic syntax checks passed. The doubles do not simulate live Sheets buffering/coercion or real concurrency, and no browser/print verification was performed this turn.

No application code, LAB spreadsheet, deployment or permissions were modified. Only this report, its standalone reproducer, the review CSV log and a handoff section were written. Next implementation packet: return to Sol / High, fix R1–R3 with failure/retry tests and label overflow acceptance; rerun a focused review before expanding to shipments. No business-rule clarification is needed for these defects.

## Follow-up closure — 2026-09-14

The implementation packet is now complete in the independent LAB. `Code.gs` stores durable retry plans for recipient updates and confirmation, rejects stale retries, and gates reads/payments on completed confirmation with non-empty consistent lines and allocations. `Index.html` invalidates stale Order state on lookup edits, ignores out-of-order responses, and disables Print when the rendered 100 × 150 mm label overflows. `tests/logic.test.js` and `tests/ui.test.js` pass; source parity was checked after upload. DEV deployment `AKfycbyp3JbUahZH7qTWtz0DdF6PPC1VxFuSXcWOfBg2jGBR6fl8LEsdqaGtYURVbFjml0tRnQ` is active at Version 4 with owner execution and **Only myself** access.

Live checks passed with fictional data: Order ID editing cleared old actions and a failed reload did not restore stale state; a temporary 2,000-character fictional address showed the overflow warning and disabled Print; restoring the approved fictional address returned a fitting preview and enabled Print. The fresh exported DEV sheet was read after the check and shows the final recipient restored plus the corresponding SaveRequests/AuditLog before→after entries. The historical Version 3 verdict above remains unchanged as a snapshot; Version 4 is the accepted follow-up. Native print dialog/PDF output is still not claimed.
