# Version 5 focused re-review — 2026-09-14

Verdict: **PASS for the local R1/R2 remediation gate.** No remaining actionable blocker was found in the reviewed payment-reload recovery and stale-recipient-response paths. This does not certify a deployment, live Sheets concurrency, or physical printing.

## Exact reviewed candidate

Independent project: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN Back House LAB`.

| File | SHA256, identical before and after this review |
|---|---|
| Code.gs | 0293642074283F2BBD71AAB5EBE632D59B587C244230E1BDEB43CABD06C3ACF3 |
| Index.html | D5EEF6B92505FC4A48096C082B6177F0B117BC7379C9CD7009F632E947E139D2 |
| tests/logic.test.js | D6CF6E6F370F5F36F70A3BA2EC82DBC91C6452AE1B1ADD2A47CBF6B52E4B11E6 |
| tests/ui.test.js | 1B7538229C120000F02D9383E32A71F532B6991FCDEB1851A24ED82B5262FFC0 |

## Findings disposition

- **R1 closed in the checked scope.** `getOrderById_` exposes the unfinished payment as `PENDING_COMPLETION`, verifies the matching request identity/payload, and returns the original payment request. Reload binds that persisted request and payload to the recovery button. Recovery follows the existing locked write path; no second Payment is inserted, the audit is created once, and the request completes. New-ID payment attempts and recipient finalization remain blocked while pending.
- **R2 closed in the checked scope.** Recipient success and failure handlers capture the submitted request ID and reject responses after a draft input changes it. The latest draft survives, Print stays disabled, and subsequent saving of that draft persists it and previews the correct address. The solution reuses the existing request ID instead of adding a second state mechanism, consistent with Ponytail full.

## Evidence

Commands run from the OWARIN STORE workspace:

```powershell
Get-Content '..\OWARIN Back House LAB\Code.gs' -Raw | node --check -
node '..\OWARIN Back House LAB\tests\logic.test.js'
node '..\OWARIN Back House LAB\tests\ui.test.js'
node '00 Docs\webapp-lab-v5-rereview-check.cjs'
```

All passed. The added review probe reuses the existing in-memory harnesses and passes serialized backend results into the candidate UI callbacks, then submits the UI-generated recovery payload back to the backend. It covers failure after Payment write and after AuditLog write, using blank, normal, numeric-looking, Japanese, and 2,000-character ordinary references; duplicate recovery; no-write rejection of new-ID payment and premature recipient requests; one Payment, one payment audit, COMPLETE journal; and saving the newer recipient draft after stale success or a lost response following a completed save.

The earlier `webapp-lab-v5-review-repro.cjs` asserts defects in the previous hashes. It is historical evidence, not a passing check for this candidate; use the re-review check above for the updated candidate.

## Limits and next gate

Tests use fictional in-memory data and mocked service/DOM behavior. They do not establish real Google Sheets coercion/escaping, simultaneous Apps Script executions, actual browser layout, native PDF output, or physical 100 × 150 mm print accuracy. There was no fresh cloud read/export, source upload, deployment, or business-data mutation in this review; earlier deployment observations were not reverified.

The next bounded step is owner-authorized upload of these exact Code.gs/Index.html hashes to the dedicated LAB DEV project and deployment verification with fictional data and owner-only access. Sol / Medium is the saved policy's recommendation for that routine execution phase; no current-chat model or effort switch is claimed. Keep separate authorization for real business use.
