# CONTINUE — Stream B Session43 R7 checkpoint

จัดทำ: 2026-10-05 +07; one writer, master §§2/5/5.2.1/6/9.

Session43 checkpoint 2026-10-05T06:32:58.189Z: focused v37 review found R7 strict binary decimal readback. Actual fresh isolated scratch export gives profit280.03 and subtotal0.3; v37 deterministic cent-readback adapter leaves NEEDS_REVIEW on first/retry. v38 bounded candidate built (W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42): integer-cent new totals, canonical materialized historical totals, typed finite profit readback tolerance0.0000001baht in batch and legacy paths; exact formulas and immutable old hashes/payloads retained. Syntax PASS only; v38 behavioral tests and Google save/UI/export are NOT DONE. Google core remains v37, original tabs unchanged in first scratch export; final subtotal scratch export preservation check pending. Resume at CONTINUE.md with Sol/High; no source switch or model-specific sign-off claimed. No P0/P1 restart, production, LAB or W2 action.

ONE NEXT STEP: finish targeted v38 tests using existing harness.cjs (adapted from frozen v37 harness). Test cent-exact formula readback390.10−100.05−10.02=280.03, .10+.20 subtotal=.30, integer control, negative/zero profit, typed errors and 1-cent corruption fail closed. Exercise legacy absent-format intent with historical binary subtotal, fixed-ID after-effect SALES/order failures, preservation of old journal rows, no duplicate SALES and no sibling bypass. Do not rerun unchanged broad batch/100-item timings.

Then stage sanitized test-runtime with current v38 pair/W1Orders, existing unchanged manifest and test-only W1Qa. Fresh source backup from exact editor BEFORE save, full LF readback afterwards. Only exact test project. Use a fresh isolated decimal fixture and normal UI Create/Final review/Confirm once, retain IDs; export fresh workbook and compare previous tabs/history/old Pending08. Focused review the small v37→v38 diff before claiming W1 closed. Historical tests stay dated; do not claim v38 broad tests were run.

- Sheet https://docs.google.com/spreadsheets/d/13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM/edit
- Project https://script.google.com/home/projects/1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd/edit
- /dev https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev
- Browser2 scratch tab7; use inventory/known URL if handle lost. Scratch retained as evidence. CUA docs restored this turn.
- New raw final scratch export google-decimal-final.xlsx: D2=280.03,C5=.3,D5=.3. verify-probe.py currently reads FIRST google-decimal.xlsx; adapt to verify final export too, normalize ArrayFormula as existing verifier does.
- Node C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe; Python analogous dependencies/python/python.exe. Default WindowsApps Python unusable.
- build-v38.cjs is one-shot ALREADY RUN: do not rerun (backup/archive guards). Candidate W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42; no Git repository.
- Avoid frozen package05 serve.cjs /proof, which overwrites Session42 evidence. Use distinct new-package readback/proof paths and guard backups. No server active here.

Recovery: new before/ docs; candidate/backup/v37 all four old files, old package05 Google source snapshots and result/UNDO. Local v38 can be reverted from backup before any save; Google still v37, scratch additive only. Never wipe/import old exports or journal rows. Prior F05 repair remains closed.
