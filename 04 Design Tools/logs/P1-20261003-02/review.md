# P1 focused rereview and repair — Session 33

จัดทำ: 2026-10-03 21:17 +0700. Stream B; master context §§2,5,6,9. Change `P1-20261003-02`; Request `P1-R1-R4-REREVIEW-001`; one writer, no agent/chat created. Owner reported selecting Astra / High; no model switch was performed or inferred from defaults.

## Verdict and remaining scope

R1–R4 bounded acceptance **PASS after two residual findings were repaired**. Local failure/retry suites and actual isolated Google R1–R4 checks pass. This is the exact revised package for focused review; it is not a shop deployment approval. Production P1 remains **NO-GO** pending a separately reviewed current-source rebase/pairing and journal migration/promotion decision. P2 identity/reservation/order/sales work remains outside this change.

## Findings, before → after

| ID | Frozen submitted behavior | Targeted repair and proof |
|---|---|---|
| R1-R | `baseline/candidate/Code.gs:2116`, `webapp.gs:224`, `Index.html:1083`: same-ID Add replay returned the committed snapshot without historical provenance. NOT_FOUND→resend could replace today's reused-SKU cache entry; a historical booking result could enable a stale Instock notification. | `saved.replayed=true`; API marks all such replay results historical; UI clears LAST_ADD and returns before booking/cache updates. Repro demonstrates current Sold copy replaced by old New Arrival; new API/UI regressions fail on frozen source and pass after fix. |
| R2 | Original Session30 omitted money when mapping absent. Submitted fix was sound in bounded review. | Retained fresh header/money gates. Added missing Cost/Price/Platform restore→same-ID retry tests. Google missing Cost stops before journal/business writes; restoring header allows one DONE with Cost99/Price299. |
| R3-R | `baseline/candidate/Code.gs:2057`: status coercion accepted false, 0, [], ["Sold"] and committed DONE. | Reject non-string status except missing/null before default/allowlist. API, status lookup and callable core reject false/0/[]/["Sold"]/object before writes; supported blank defaults still pass. Invalid source/string-status checks retained. Google malformed inputs rejected before any rows/events. |
| R4 | Original Session30 failed to detect silent derived-price formula loss. Submitted readback fix passed. | Retained all four exact formula readbacks. Local tests drop each formula and prove ERROR/no duplicate on retry. Google marketplace-only fault injection yields ERROR; same-ID retry blocked. |

The Session30 frozen reproduction was rerun (`original-baseline-output.txt`) and still confirms all original defects. The Session32 frozen copy in `baseline/` reproduces residual R1-R/R3-R (`review-repro.cjs`, `repro-output.txt`). Reproduction exit 0 asserts defects; it is not acceptance. Red outputs `add-red-output.txt`/`ui-red-output.txt` are expected pre-fix regression failures, followed by `add-green-output.txt`/`ui-green-output.txt` PASS. The reported 20 Add calls/20 UI resets are loops within larger suites, not a claim of exactly 20 test cases. Syntax and helper wrong-Sheet guard pass (`check-runtime-qa.cjs`).

## Isolated Google evidence

- Apps Script project: `1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd`; Sheet: `13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM`. Only this test environment was written.
- Agent saved the three sanitized staged files, checked exact clipboard hashes, selected `p1ReviewQa20261003` after screenshot/DOM confirmation and clicked **Run**. Execution 16:20:32–16:20:43 Bangkok; log transcribed in `runtime-output.txt`.
- Helper first verifies the exact Sheet ID, GGB last row26/journal79 and unused QA IDs. Cost header and temporarily reassigned SKUs were restored in finally blocks with readback. Formula writer override was restored. Helper was removed and saved; fresh editor reload then all three source readbacks matched `source-readback.json` and the hashes below.
- R2 Request `p1-review-20261003-02-R2`: missing-header rejection had no writes; same-ID retry created GGB27 / `OWA-GGBS025N00`, journal80–81 PREPARED→DONE.
- R1 Request `p1-review-20261003-02-R1`: created GGB28 / `OWA-GGBS026N00`; temporary unique SKU reuse returned the committed original snapshot with historical=true for Add replay and status; journal82–84 PREPARED→DONE→DONE. Correct SKUs restored.
- R4 Request `p1-review-20261003-02-R4`: GGB29 / `OWA-GGBS027N00` deliberately retains blank marketplace formula. Journal85–87 PREPARED→ERROR→ERROR; second event describes readback mismatch, last describes blocked retry. Preserve this partial row/events as evidence; do not submit a new ID.
- `verify-live-qa.py` PASS: 158 added cells only, confined to GGB27–29/journal80–87; prior values/formulas and all MAG unchanged; next rows blank. These are fresh full XLSX exports from this QA run, not production totals.

## Exact revision (raw local SHA256)

Candidate source and harness root: `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE\04 Design Tools\logs\P1-20260929-01`. This project uses a hash tuple for this uncommitted local candidate; no invented Git revision.

| File | SHA256 |
|---|---|
| `candidate/Code.gs` | `279140CB27CFC193BF591E56667CFB179B16B46D9646936AA8E73C275AC354EF` |
| `candidate/webapp.gs` | `057840A5F2E9675121FA0CB8E03EEE7F0B4593750CB7EB4A4C83E3E204E0B621` |
| `candidate/Index.html` | `5ECE912BC9AE2F7D7FBB9662C2E417B125F78930C68C0D9A03619DE44EB69AEB` |
| `p1-add.test.cjs` | `B6D572D1BA01D41BA529CFF9A7FAD6852E32CE74AEC901D7452E36F8ABFBC55C` |
| `p1-ui.test.cjs` | `8B12741BF912B7E79CE5A12E81F42BDA54A05D0823E440A9AEBFCEDE46D7422A` |

Sanitized test source is in `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\OWARIN STORE\04 Design Tools\logs\P1-20261003-02\test-runtime-source` (test bank placeholders and project-specific pending key retained). Saved Google source comparison normalizes CRLF to LF.

| File | SHA256 |
|---|---|
| `Code.gs` | `3F906DA2F078A943A3F2C7C5176FF1D6971CA95648FECC25BFBAB5DD64AA21D0` |
| `webapp.gs` | `057840A5F2E9675121FA0CB8E03EEE7F0B4593750CB7EB4A4C83E3E204E0B621` |
| `Index.html` | `271313D0D0674EDF2D6642D3D5788C7495EAF2302EBA4F794E3F1F8BD2486A12` |

| Snapshot | Bytes | SHA256 |
|---|---:|---|
| `test-sheet-before.xlsx` | 29,576 | `850B3D2EFE48021869979AE9BA3BC468570A4C641110BFBF7663FDF4FD7D00F1` |
| `test-sheet-after.xlsx` | 30,982 | `EE8EC2E7CD48A24DF2376C1242B125B8614C96FC21EC4B6425D894AE95FA4E51` |

## Audit, errors/retries and recovery

`changes.csv` records each finding/fix/test/source Save/helper install/run/removal and session close, including IDs and recovery references. Source/test `*.diff` compare frozen `baseline/` with the revised candidate. `test-runtime-*.diff` compare the prior saved Session32 staging with current staging. `before/` contains original documentation; historical HANDOFF and Implementation log are byte-preserving appends. `docs-*.diff` and `manifest.json` provide readback sizes/hashes. No new owner decision this session; the existing CLOSED issue/model-routing rule in AGENTS.md, CLAUDE.md and decisions_20261003.csv remains applicable.

Expected regression failures were fixed once; no repeated unsuccessful repair. The Apps Script function dropdown AX representation lagged while DOM/screenshot showed it open; the exact named option and DOM selected state were used before Run. Git diff exit1 means differences found; LF/CRLF warnings did not change source. No unauthorized Run/deployment or business retry occurred. The prior browser source-transfer block was bypassed only by ordinary authorized clipboard editing of the already-read sanitized test source, checked against staged hashes, not by weakening browser security.

Recovery: inspect newer edits before restoring local candidate/harness from `baseline/`; restore test source from prior `P1-20261003-01/test-runtime-source/` only if rollback is required and separately logged. Current helper-free source is in this package's `test-runtime-source/`. Preserve before/after XLSX and synthetic row29/journal ERROR; manually reconcile its original request with inventory before any repair. Never create a fresh Request ID to retry an uncertain Add. Do not rerun the one-shot helper: its before-state guard will reject the changed row counts.

Limits: live Google test exercised one missing Cost header, unique SKU reuse, malformed API input and deliberately dropped marketplace formula; the broader permutations run locally. UI cache/booking behavior is a VM regression, not a new live UI failure injection. R4 is intentional test-only fault injection, not evidence of spontaneous Google loss. Prior same-tab response interruption does not prove a real network outage. Lost ID/new-device recovery remains manual. No shop source/schema/data/deploy or Back House LAB change; no shop runtime journal, Orders or reservation installation is claimed.

## One next step

Use this exact hash tuple and evidence for any further focused review; the next implementation phase requires a separate current-shop source/schema promotion plan. Do not promote this old-base candidate directly over the current shop's newer Meta/catalog changes.
