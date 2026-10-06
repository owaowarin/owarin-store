# P1 R1–R4 local candidate result — Google test pending

Change `P1-20261003-01`; Request `P1-R1-R4-LOCAL-FIX-001`; Stream B §§2,5,6,9; 2026-10-03 Bangkok; one writer. Scope is only the local P1 candidate and its existing VM harness. No shop, test Sheet, Google source or Back House LAB mutation.

| File under `04 Design Tools/logs/P1-20260929-01/` | Before SHA256 | After SHA256 | Recovery/diff |
|---|---|---|---|
| `candidate/Code.gs` | `C977093F40C6D2244B12C730D2F298310BCD0014DD49C051328A4CB92C46A8F5` | `695A2EAA4FB90F1B5AB3272574046ABA632DC1F2B88790651ECBBC8F4C10593B` | `before/Code.gs`, `Code.diff` |
| `candidate/webapp.gs` | `5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257` | `6168CEA9DE2B8FDC8451707A6295194932773350DEB974D2E6CEF095481947A2` | `before/webapp.gs`, `webapp.diff` |
| `candidate/Index.html` | `2F15FBBFC58B9CFEF01DB45389764A2F08ECFC573837D78B44586201725830F6` | `F87ADF6B67B0BFC14AC7D55672007FFA5CF01BD6386B042F3214910E6833224B` | `before/Index.html`, `Index.diff` |
| `p1-add.test.cjs` | `6D6E936EFD80CDDABFD33F43DDF5738EE6FCCF20BB952554FD9989E67A3E33E8` | `C98E4A6410B52AF25515135C0C971B53BBA58C85BC1F8AC01ECE43A2F28BEA6C` | `before/p1-add.test.cjs`, `p1-add.diff` |
| `p1-ui.test.cjs` | `81F50F7CB6323506B846159DF90B47A6C6467E98B2546FC3BBB92CABF8ED612A` | `F84DDA2C43D04E64816DB05DB9F20709AC3C94AA0FFB8AAAAE60A1EC1DF17F39` | `before/p1-ui.test.cjs`, `p1-ui.diff` |

All paths above resolve under `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE\`. Backups under this change folder are copies, not source edits. The archived Session 30 `baseline/` retains the exact pre-fix candidate and tests. Archive dry run: all current candidate/evidence files are referenced by STATE/HANDOFF, so no archive move was appropriate.

## Before → after by finding

- **R1:** Frozen baseline status returns `Different inventory copy` after the original SKU is uniquely reused. Candidate stores the verified row snapshot inside the DONE result; status/replay returns that snapshot, and old DONE without it fails closed. UI does not insert historical DONE into live cache. Tests cover sort, SKU change, unique reuse, duplicate, removal, corrupt/old result and same-ID replay.
- **R2:** Frozen baseline commits Cost 99 with Cost unmapped and records DONE. Candidate refreshes header resolution per Add and validates name/Product ID/status/Original/Cost/Price/Suggested plus destinations for supplied optional values before journal PREPARED. Tests cover missing Cost/Price, supplied Platform with no destination, empty optional, and header removal after cache priming; none writes an inventory row or journal event.
- **R3:** Frozen baseline maps unknown source to GGB and stores arbitrary status. Candidate rejects unknown GGB/MAG source and statuses outside `Instock`, `Sold`, `Auction`, `Hold`, `New Arrival` in API and core. Blank status remains `New Arrival`. Tests assert no journal/inventory write for invalid values.
- **R4:** Frozen baseline records DONE when injected silent Market Place Price formula loss occurs. Candidate reads back exact formulas with `getFormula()` before DONE. Tests silently drop each of Market Place Price, Gross Profit, Gross Profit MP and Price Content Lists; each leaves ERROR/recovery state, and retry with the same ID adds no second inventory row. A full successful formula write reaches DONE.

## Verification and remaining gate

From the nested OWARIN STORE directory, run `node '04 Design Tools/logs/P1-20260930-11/review-repro.cjs'` to reproduce unsafe *frozen* behavior; `baseline-repro-output.txt` records all four. Run `node '04 Design Tools/logs/P1-20260929-01/p1-add.test.cjs'` and `node '04 Design Tools/logs/P1-20260929-01/p1-ui.test.cjs'` for revised local regressions; outputs are `add-output.txt` and `ui-output.txt`, both exit 0. `node -e "const f=require('fs');for(const p of ['04 Design Tools/logs/P1-20260929-01/candidate/Code.gs','04 Design Tools/logs/P1-20260929-01/candidate/webapp.gs'])new Function(f.readFileSync(p,'utf8'))"` parsed both. No fresh live Sheet export or business row count is asserted.

Separate test Apps Script `1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd` opened read-only with `Saved to Drive`; local browser transfer attempt to `127.0.0.1:8765` failed `net::ERR_BLOCKED_BY_CLIENT`. The local server was stopped and the editor was closed without a Save. Google runtime/save/readback and actual partial-write QA for this revision remain unverified, so P1 stays NO-GO. Next: install/read back the exact three-file candidate only in the separate test project, take a before snapshot of its Sheet, run the R1–R4 failure/retry matrix there, and then request GPT-6 Astra / High focused review of the revision tuple above.

For that test project, `test-runtime-source/{Code.gs,webapp.gs,Index.html}` is the prepared copy: it differs from the local candidate only by the pre-existing test bank placeholders and test script-specific pending key. Its raw SHA256 tuple is Code `719482A6570D716224EB20CEC7937EC3350E9DE939430C10645B2A3EDD30D0E9`, webapp `6168CEA9DE2B8FDC8451707A6295194932773350DEB974D2E6CEF095481947A2`, Index `AF67EDF4A1AAFA1446E46249C989E9DF1B0EE12EB46F7DED61279877DE33B6EE`. `git diff --no-index` verified only those two environment substitutions; sanitized Code/webapp parse. Use these files for the isolated Google test, and re-check its exact Sheet binding before Save/Run.

`node '04 Design Tools/logs/P1-20261003-01/check-staged-syntax.cjs'` also parses all three staged files. An earlier inline `node -e` syntax check failed from shell regex quoting before reading the staged source; the saved check is the successful retry. No source or Google state was changed by that command failure.

Recovery: inspect for newer local edits before restoring any `before/` copy; compare its hash against the table. The test project and shop need no rollback for this change because neither was modified. For an uncertain Add, retain the original Request ID and reconcile journal↔inventory manually; never create a new ID as a recovery retry. The old snapshot-less DONE remains fail-closed by design. No shop runtime journal, Orders or reservations were installed.
