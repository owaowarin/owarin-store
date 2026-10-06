# W1 local candidate / isolated test staging — Session36

2026-10-04 02:59:46 +0700 · Stream B §§2,5,6,9 + §5.2.1 · Change W1-20261003-01 · one writer, no agents/chats.

**W1 ยังไม่ผ่าน gate: Google fixture/schema/real UI/failure/retry/concurrency และ Astra / High focused review ยังไม่ได้ทำ เพราะ Google Authorization ยังไม่สำเร็จใน browser ที่ควบคุมได้.**

Exact candidate revision: `W1-20261003-01/v32@3B0D1F63B06C4196578FFEA9714BEC50EC6AD060B3BAC95D8190582175B2BB08`. Per-file SHA256: [revision.json](revision.json); source/doc/test diffs: [diff/](diff/); recover: [UNDO.md](UNDO.md); focused-review packet: [REVIEW-ASTRA-HIGH.md](REVIEW-ASTRA-HIGH.md). No Git commit is claimed.

| Environment | Result / usable scope |
|---|---|
| Local candidate v32 | Cart button beside collapsed price; four channel commands; Orders Bento; SHOP Create/Pending/Cancel/Confirm, direct Shopee and single-sale compatibility; UID/ownership/guards; final review + Label later; intent/step/readback/replay/recovery implemented |
| Local deterministic tests | 14 behavioral groups PASS; 1,032 individual simulated write positions injected across create197/cancel164/confirm296/Shopee375; partial journal remains fail-closed/manual. Multi-item cross-source silent drop/retry, distinct subsidy, legacy ledger, actual duplicate UID/SKU, UTC→Bangkok midnight, >99 IDs, unauthorized/legacy bypass, external changes tested. UI recovery suite PASS; six impact regressions PASS |
| Local browser synthetic VM | Same candidate Index with mock google.script.run transport; Create/Cancel/SHOP review Back+Confirm/Shopee 630→391/single sale; two tabs same copy one winner, loser UNAVAILABLE Hold. Actual browser layout image [ui-proof.jpg](ui-proof.jpg). This is not Google LockService/typed-table/runtime acceptance |
| Separate Google test project | Saved Code/Webapp/Index/W1Orders/W1Qa + constrained appsscript.json; reload/clipboard LF readbacks match staged files. Fixture Run blocked by Authorization; fresh XLSX stored values/formulas equal backup, only original three tabs exist. W1 schema/data not installed; no deployment change |
| Shop | Fresh read-only v31 source hashes matched Session34; schema exported fresh. Root v31/P1Journal/Index bytes unchanged. No shop source/schema/data/Run/Save/deployment mutation; deployment4 statement remains Session34 evidence |

Test project: https://script.google.com/home/projects/1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd/edit
Test Sheet: https://docs.google.com/spreadsheets/d/13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM/edit

Schema delta: append Item UID to GGB/MAG; Order Line ID to SALES; create ORDERS14 / ORDER LINES14 / ORDER REQUESTS15 exact headers. Migration is hard-bound to the isolated Sheet ID. CLIENT A:F remains unchanged; W2 CLIENT/snapshot/Label/print is absent. Label later records Missing label and does not claim a printable label.

Money: entered SHOP price=ledger; Shopee ledger=round(entered*0.7-50); Customer Shipping and shop subsidy are explicit/separate; only subsidy goes to SALES Shipping Cost, assigned once across lines. SALES writes allocate after getMaxRows(), beyond existing finite spill/table/totals, write immutable line identity first, and verify per-row profit formula/value; never replace original G2 or old ledger rows. This deliberately leaves blank capacity and must be verified on real typed SALES in test.

Recovery limits: corrupted/partial journal requires manual reconciliation; partial derived inventory edit is manual unless only its outcome event was lost after verified result. Direct owner Sheets edits cannot be prevented by script locks; source detects claimed edits where trigger fires, snapshots detect changed values and UID orphaning blocks sibling mutations. Technical recovery gate is global; legitimate business Pending orders coexist. Bulk price/flags/PID/restock/Auction maintenance is conservatively blocked on sheets containing active managed claims or sales; common lock and Meta/R2 code remain operational in regressions. External marketplace stock/Meta feed still follows the existing separate process.

Run from this evidence directory: `node w1.test.cjs`, `node ui.test.cjs`, `node regression.cjs`. Mock harness substitutes _recalcRow only in transaction unit tests; pricing/Meta regressions load the real engines. Follow issues.md/changes.csv and attempt outputs for failures/fixes; no old evidence is represented as fresh Google acceptance.

One next step: owner authorizes the isolated project, then run guarded fixture and real-Google recovery helper once, inspect exact request IDs, perform UI/concurrency/table checks; finish focused review on this exact revision. Do not start W2/release or restart P0/P1.
