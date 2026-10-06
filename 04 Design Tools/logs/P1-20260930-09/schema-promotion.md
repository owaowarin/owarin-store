# P1 Add journal schema — local dry run only

Change `P1-20260930-09`; test Request `P1-ADD-SCHEMA-DRYRUN-001`; one writer. Source of truth for this prerequisite is `_addRequestSheet` in `04 Design Tools/logs/P1-20260929-01/candidate/Code.gs`. Fresh read-only shop export recorded in `P1-20260930-08/shop-schema-readback.json` has 16 tabs and no `ADD REQUESTS`. **This file does not authorize or record a Sheet mutation.**

## Exact row 1 required by the current P1 Add candidate

| Column | Header |
| --- | --- |
| A | Event ID |
| B | Timestamp |
| C | Request ID |
| D | Attempt |
| E | State |
| F | Actor |
| G | Entry Source |
| H | App Version |
| I | Sheet |
| J | Payload Hash |
| K | Row |
| L | Product ID |
| M | Before |
| N | After |
| O | Error |
| P | Result |
| Q | Recovery Ref |

The source compares all 17 header cell values exactly, left to right. It does not create the tab. A missing tab or one mismatched header throws before inventory write. This was simulated locally by `node '04 Design Tools/logs/P1-20260929-01/p1-add.test.cjs'` (PASS); no Google write was used for this check.

## Promotion gate, when a separate shop change is authorized

1. Reopen the exact shop Sheet and Apps Script IDs, verify the saved source hashes against the P1-20260930-08 baseline, confirm the 16-tab/no-journal starting state, and take a restricted, recoverable Sheet snapshot plus paired source backups. Preserve business rows outside public logs. Give the live change and any synthetic check distinct Change/Request IDs.
2. Resolve lost-ID recovery policy and the remaining transport-failure confidence gate. Recheck the exact candidate against the current shop source, update the paired source version and README per `AGENTS.md`, and finish the consequential integrity review. Do not deploy a candidate that still expects a missing journal.
3. In a controlled maintenance window, create one `ADD REQUESTS` tab with only A1:Q1 above, then read back tab identity, header values, and empty event region. If the tab already exists, inspect before changing anything; do not overwrite existing events or headers blindly. Run a schema-only read before any Add or source promotion.
4. Install the reviewed source pair and Index in the shop only under the later approved change. Read back full saved source hashes and version/deployment target. Test one controlled Add with fresh before/after exports and exact Request ID; verify one inventory row and PREPARED→DONE pair, then same-ID status/replay without another business write. Do not create a test product in the shop merely to satisfy this checklist; use an approved real transaction or a separately agreed check.
5. Record each step's before→after, attempt, outcome, error/retry, source revision, restricted snapshot and recovery reference in CSV, Implementation log and HANDOFF. A failed PREPARED write means stop before inventory mutation; a missing DONE after a committed row means freeze retries and reconcile by Request ID, row, SKU and payload hash.

Rollback is state-dependent: before any Add event/business write, the new empty tab and source pair can be restored from verified backups after checking no concurrent change; after an event or inventory write, retain the journal and reconcile the specific Request ID before changing source or schema. Never delete a journal with evidence, replay a business write to repair a log, or apply a snapshot over a newer edit. `ORDERS`, reservation audit and Label are separate P2 work and are not installed by this P1 journal migration.

## This dry run's result

Before: shop lacks `ADD REQUESTS` per fresh P1-20260930-08 manifest; local Add test did not assert missing/mismatched schema. After: only the local test asserts both failure paths and no inventory/journal write; the source, shop/test Sheets and deployments remain unchanged. Lost-ID choice and real transport outage remain unresolved. Local test backup `p1-add-before.test.cjs` restores the previous harness; docs backups `implementation-before.md` and `handoff-before.md` preserve pre-append history.
