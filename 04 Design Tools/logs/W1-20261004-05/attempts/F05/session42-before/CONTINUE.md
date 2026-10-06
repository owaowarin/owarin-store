# CONTINUE — Stream B Session41 checkpoint

จัดทำ: 2026-10-04T15:43:18.210Z; checkpoint for owner-requested new chat, W1 NOT COMPLETE. Master §§2,5,5.2.1,6,9.

Exact candidate: W1-20261004-05/v36@D25BAE5207BDBC45BB946FF6F19FE0B5B7A6004E74EEBD422417DFD9DFF00A67. Four files in candidate/, full LF hashes revision.json; base v33, no Git repository. Core v36 and current test-only helper saved/read back in exact isolated project. No production/LAB/W2 edits.

Implemented R5/R6: format2 batch20 (legacy10/absent supported); original exact payload + durable ARMED/DONE intent, fresh ownership/UID/cell guards and readback; SALES fixed allocated rows and grouped writes. F02 writes new line metadata before reservation claims; F04 actual google.script.run key-order conflict fixed via ID-only owner server resume; F05 resume/helper read inside owned lock before any Sheet access. No dependency/refactor.

Local evidence retained tests/:14groups/1032positions,724 batch before/after-effect positions, bounds/small-grid/R1–R4, legacy-size, P1/UI, transport/recovery UI, QA injection/lock boundary/gap repair PASS. Do not repeat unaffected checks. Existing gap-repair test uses exported matrix and passed, but actual gap repair is NOT done.

Actual isolated Google evidence (synthetic only, fresh during Session41; not current shop QA): final bulk Create100 48164ms, Cancel100 52408ms, Shopee100 161051ms on v34 batch20 engine; v36 retains that engine but these are NOT rerun v36 timings. Orders10Cancelled100,11Sold100,12original-intent attempt2 Pending then UI Cancelled. Request v34-server-intent-20261004 retained original 0400.00; actual ID-only Recover succeeded. Cancel12 ID w1-1791111802267-hlb16trsuq.

Open F05: Google showed TWO ledger helper executions at same start time; before-lock reading is suspected cause of stale capacity placement. Event13 v34-server-ledger-20261004: native ledger applied then NEEDS_REVIEW WRITE_FAILED SALES block attempt1, same-ID attempt2 DONE with exactly one SALES row in captured export. Logical blanks49 at rows1051–1059 and1061–1100; reader correctly fails CORRUPT_JOURNAL. Old events/data must never be skipped/erased/reordered or hashes/IDs replaced. v36 moves reads inside lock; local lock-boundary tests PASS; exact Google cache mechanism remains inference.

Prepared test-only w1QaV36RepairGaps validates exact1120-row prefix,49 recorded blank rows and unique capacity-note IDs, appends durable repair intent, writes only blanks, verifies all old rows unchanged. Actual invocation rejected QA_ORIGINAL_JOURNAL_CHANGED BEFORE PREPARED or gap writes. Specification is unchanged, not bypassed.

Native comparison resolved suspected export difference: attempts/F05/google-journal-native.json is exact Google getValues JSON (read-only helper output captured);1120rows,49blanks, native-comparison.json shows0 differing cells vs journal-proof.json. Node SHA256(JSON.stringify(matrix))=18f551d36c114eaf00b5f3d9713c0c02ffc1e55335c77756749d3b65d4124014, equal fixed spec. No32767-truncated cells. So do NOT alter expected hash without diagnosis.

LAST ACTION / ONE NEXT STEP: saved/readback test-only W1Qa.gs diagnostic w1QaV36NativeProof now returns rows/hash/roundtripHash/normalizedHash/expected/specRows/thai/ascii (no matrix). Loaded /dev and clicked Read exact native journal; UI last observed RUNNING native; same ID retained. CUA kernel then stopped (Windows sandbox CreateProcessWithLogonW1056), result unobserved. Reattach existing test browser, read #qaResult FIRST; do not re-run repair/fixtures blindly. Compare server hashes to native proof; local SHA256 uses UTF8, actual default Utilities charset not established. Diagnostic makes no writes. Backups before diagnostic in attempts/F05/.

Environment:
- project https://script.google.com/home/projects/1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd/edit
- Sheet https://docs.google.com/spreadsheets/d/13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM/edit
- /dev https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev
- browser2 IAB tabs2race,3editor,4localhost transfer,5recovery/diagnostic,6Sheet at last inventory. Handles may be lost; use known URLs after inventory. No production URL in this checkpoint. Manifest owner-only/currentonly unchanged, numbered /exec unchanged.
- Local server session20348 at127.0.0.1:8765; if stopped, Node serve.cjs. Native capture limit20MB after6.36MB proof. /backup-native route blocked by browser; existing /backup-v36 route validated exact prewrite data before local copies. Fresh-source-before-native holds source backups. /readback/file full-LF compares current test-runtime; /capture-journal saves same native proof. Do not overwrite original proof on later reads; add new proof path if needed.

After hash diagnosis: correct helper minimally with backup/repro/retest; execute49-note reconciliation only when original guard proves unchanged, readback native event preservation. Then two fresh v36 UI sessions compete for W1V34CHECK-1 (Instock as last observed), one Pending, other unavailable; reload winner during Create to verify same-ID lost-response recovery; Final review Back then Confirm sold · Label later once. Keep old08Pending100 untouched. Existing13 ledger helper is now DONE replay; no new effect needed. Fresh final export/verify-google.py (adapt documented reconciliation), UI screenshot. Expected final SALES baseline4 +100bulk +1ledger +1SHOP=106 is a TEST EXPECTATION, not a fresh verified count.

Finish changed-money/stock/security review and exact Astra/High packet (existing REVIEW-ASTRA-HIGH.md stale v35), docs/logs/result/UNDO/manifest. Do not call W1 gate passed before actual journal repair and two-session/final export gates. Production remains P1 v31/deployment4 historical Session34; W1 usable only in isolated test when journal healthy. W2 CLIENT/Label later.

Recovery: candidate backup/v34/v35 and before/candidate/v33; fresh Google source backups/readbacks, google-before.xlsx, attempts/F05/google-ledger-error.xlsx + native exact proof; changes.csv/implementation.md all attempts. Repair spec gap-repair-intent.json fixed49UUIDs. Never restore entire stale export over later writes; compare exact affected cells/event positions first. Historical build.cjs/native-proof.cjs/make-gap-helper.cjs/fix-*.cjs are one-shot, DO NOT rerun. tests run through test-run.cjs; stage.cjs stages currentcandidate only.

Model: current active model/effort not exposed; no model-specific signoff or self-switch claimed. Owner prefers Astra/High for this consequential hash/capacity diagnosis and focused review; select manually in app. No agents/new chats are automatically created.
