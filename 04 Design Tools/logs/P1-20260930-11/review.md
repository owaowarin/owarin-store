# P1 focused integrity review — NO-GO for shop promotion

Change `P1-20260930-11`; Request `P1-FOCUSED-INTEGRITY-REVIEW-001`; Stream B, master context §§2,5,6,9 and Plan §15; one writer. The owner reported selecting Astra / High for this review. This review inspected the local candidate and ran isolated in-memory reproductions; it did not edit candidate/runtime source, access or mutate Google data, or deploy anything.

## Findings, in priority order

**R1 — high: DONE recovery can return a different inventory item after SKU reuse.** `candidate/webapp.gs:216–249` validates the stored Result against the journal, then `_apiInvAddResult` finds today's inventory row by the historical SKU outside the journal lock. `_findRowBySku` correctly rejects simultaneous duplicate SKUs; the bug occurs when the old SKU is unique again but belongs to another copy after the original item was renamed/renumbered. The reproduction commits Synthetic 0, changes its SKU, assigns the old SKU to a different row, then calls the original request's status: state DONE, Result title Synthetic 0, but returned item name Different inventory copy. The UI accepts that response and can associate the old request with the wrong item. This is a confirmed local identity failure, not an observed shop incident.

Required fix: the response must remain tied to the committed item's provenance; do not rebuild an old success from an unverified current SKU. Use a canonical committed snapshot for historical outcome, or fail closed when the binding cannot be verified; keep live cache refresh separate when identity has drifted. Row number alone is not a replacement. Add regression cases for sort, SKU change, unique SKU reuse, duplicate SKU and missing item; stable Item UID remains required before P2 reservations.

**R2 — high: a missing money-column mapping can silently discard a value and still record DONE.** `candidate/Code.gs:2108–2109` requires only name/Product ID/Status; `setIf` at 2144 skips an unmapped field, and the readback loop at 2186 skips it again. With Cost unmapped, a valid Add carrying Cost 99 commits a row with no cost and returns success/DONE. No write exception is needed. The same pattern applies to other supplied fields and missing Price. The ordinary harness always supplies its column map, so earlier passing tests did not cover this.

Required fix: validate required money/identity schema and supplied-field destinations before PREPARED or any business write; report the missing header explicitly. Preserve supported empty optional fields. Test missing Cost/Price and a supplied optional field with no destination; assert no inventory or journal write.

**R3 — medium: invalid source and status values are accepted by the Add API.** `candidate/webapp.gs:71–73,184–198` maps every source except MAG to GGB and accepts arbitrary status text; `candidate/Code.gs:2119` repeats the unconstrained status default. The reproduction sends INVALID_SOURCE and gets a GGB DONE, and sends Pending-without-order and gets that status stored as DONE. The UI's fixed options do not validate direct/replayed API payloads. This is not evidence of an implemented Pending reservation.

Required fix: validate Add source and the existing allowed statuses before intent/write, while retaining blank/absent status → New Arrival and explicit valid statuses per Plan §3. Reuse validation across actual callable Add paths; do not expand the legacy source helper's behavior for unrelated routes without testing those callers. Reject unknown values rather than silently choosing GGB.

**R4 — medium, fault injection only: derived-price formula loss is outside the DONE readback.** `candidate/Code.gs:2173–2202` calls the real formula helper and checks recorded write exceptions, but its expected readback omits derived formula destinations. Re-enabling that helper in the harness and silently dropping the Market Place Price formula still produces DONE. This demonstrates a coverage/guard gap; no Google silent formula loss was observed, and ordinary throwing formula writes are already handled. The ordinary Add harness replaces `_setDerivedFormulasForRow` with a no-op.

Required fix: verify expected derived formulas at the destinations that exist before DONE, without changing Shopee pricing formulas. Add one targeted check that uses the real formula helper and loses a formula write; retain recovery state after a partial business write.

## Evidence and limits

- `node '04 Design Tools/logs/P1-20260930-11/review-repro.cjs'` executes the existing Add harness plus the defect cases against the frozen `baseline/` source: the original suite passes and all four findings are reproduced. Exit 0 means the **defects were demonstrated**, not that release acceptance passed. Output is `repro-output.txt`.
- `node '04 Design Tools/logs/P1-20260930-11/baseline/p1-ui.test.cjs'` passes; output is `ui-output.txt`. The harness still mocks SKU generation, SP-2 and row serialization. It is not a full formula/identity integration test.
- Source raw-byte SHA256: Code `C977093F40C6D2244B12C730D2F298310BCD0014DD49C051328A4CB92C46A8F5`; webapp `5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257`; Index `2F15FBBFC58B9CFEF01DB45389764A2F08ECFC573837D78B44586201725830F6`. These are local review revisions, not fresh Google saved-source hashes.
- Historical live evidence in P1-20260930-06 and P1-20260930-10 covers delayed callback and same-tab reload after commit; P1-20260930-07 covers no callback locally. No new live row counts are asserted here, and no fresh Sheet export was needed for this source-only review. Actual network outage remains unverified; it is not the only or primary current release blocker.
- Manual lost-ID reconciliation remains the working P1 procedure. It cannot enforce cross-device duplicate prevention; when exact request-to-item linkage is unavailable, stop rather than create another ID. No in-app lookup was added.

## Release decision and next change

Do not promote this revision. Fix R1/R2 first, include the bounded validation/readback fixes R3/R4, run regression checks that assert safe behavior, then install/read back only in the isolated test project and review the new exact revision. Return implementation to Sol / High; use Astra / High for the follow-up integrity review. Schema migration alone cannot fix these source defects.

P2 source risks from P1-20260930-08 remain separate: Auction resale override, reservation/status bypass, duplicate cart lines, partial stock/SALES commits, SALES-only Order ID allocation, and implicit shipping default. Their observations were not repeated live here. Preserve Pending reservation, order-owned Cancel, existing CLIENT, shop-subsidy Shipping Cost, Auction unavailable and Facebook Account excluded from Labels. Shop runtime journal, Orders and reservations are not claimed installed.

All changes in this review are local evidence/docs. Baseline copies make the reproduction stable after future fixes; restore docs only from `implementation-before.md`/`handoff-before.md` after checking for newer append history. No business recovery or failed fix occurred; expected faulty outcomes are intentionally retained as test evidence in `changes.csv`.
