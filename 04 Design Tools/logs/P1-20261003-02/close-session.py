"""Write the Session 33 evidence and bounded documentation updates once."""
import csv
import difflib
import hashlib
import json
from datetime import datetime
from pathlib import Path

e = Path(__file__).resolve().parent
root = e.parents[2]
c = root / '04 Design Tools/logs/P1-20260929-01'
now = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %z')
assert now.startswith('2026-10-03')

def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

current = {
    'candidate/Code.gs': '279140CB27CFC193BF591E56667CFB179B16B46D9646936AA8E73C275AC354EF',
    'candidate/webapp.gs': '057840A5F2E9675121FA0CB8E03EEE7F0B4593750CB7EB4A4C83E3E204E0B621',
    'candidate/Index.html': '5ECE912BC9AE2F7D7FBB9662C2E417B125F78930C68C0D9A03619DE44EB69AEB',
    'p1-add.test.cjs': 'B6D572D1BA01D41BA529CFF9A7FAD6852E32CE74AEC901D7452E36F8ABFBC55C',
    'p1-ui.test.cjs': '8B12741BF912B7E79CE5A12E81F42BDA54A05D0823E440A9AEBFCEDE46D7422A',
}
staged = {
    'Code.gs': '3F906DA2F078A943A3F2C7C5176FF1D6971CA95648FECC25BFBAB5DD64AA21D0',
    'webapp.gs': current['candidate/webapp.gs'],
    'Index.html': '271313D0D0674EDF2D6642D3D5788C7495EAF2302EBA4F794E3F1F8BD2486A12',
}
for name, expected in current.items():
    assert sha(c / name) == expected, name
for name, expected in staged.items():
    assert sha(e / 'test-runtime-source' / name) == expected, name

write(e / 'runtime-output.txt', '''Observed Apps Script execution log, isolated test project, 2026-10-03 Bangkok.
4:20:32 PM Notice Execution started
4:20:32 PM Info PASS R3: malformed status/source rejected before writes
4:20:35 PM Info PASS R2: missing Cost stopped before writes; header restored; same-ID retry DONE row 27
4:20:38 PM Info PASS R1: unique SKU reuse; replay/status returned historical committed snapshot; SKUs restored
4:20:41 PM Info PASS R4: injected marketplace formula loss -> ERROR; same-ID retry blocked; row 29 retained for evidence
4:20:41 PM Info PASS ALL: R1-R4 isolated runtime; requests p1-review-20261003-02-R2/R1/R4; final GGB row 29, journal row 87
4:20:43 PM Notice Execution completed
''')
write(e / 'source-readback.json', json.dumps({
    'recorded_at': now,
    'project_id': '1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd',
    'method': 'Fresh editor reload; deliberately focused Select All/Copy; CRLF normalized to LF; exact string comparison and SHA256 in browser tool',
    'saved_to_drive_observed': True, 'temporary_helper_absent': True,
    'sha256_normalized_lf': staged,
    'deployment': 'No /exec deployment',
}, indent=2) + '\n')

header = '''# P1 focused rereview and repair — Session 33

จัดทำ: {now}. Stream B; master context §§2,5,6,9. Change `P1-20261003-02`; Request `P1-R1-R4-REREVIEW-001`; one writer, no agent/chat created. Owner reported selecting Astra / High; no model switch was performed or inferred from defaults.

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

Candidate source and harness root: `{candidate}`. This project uses a hash tuple for this uncommitted local candidate; no invented Git revision.

| File | SHA256 |
|---|---|
{candidate_table}

Sanitized test source is in `{staging}` (test bank placeholders and project-specific pending key retained). Saved Google source comparison normalizes CRLF to LF.

| File | SHA256 |
|---|---|
{staged_table}

| Snapshot | Bytes | SHA256 |
|---|---:|---|
{export_table}

## Audit, errors/retries and recovery

`changes.csv` records each finding/fix/test/source Save/helper install/run/removal and session close, including IDs and recovery references. Source/test `*.diff` compare frozen `baseline/` with the revised candidate. `test-runtime-*.diff` compare the prior saved Session32 staging with current staging. `before/` contains original documentation; historical HANDOFF and Implementation log are byte-preserving appends. `docs-*.diff` and `manifest.json` provide readback sizes/hashes. No new owner decision this session; the existing CLOSED issue/model-routing rule in AGENTS.md, CLAUDE.md and decisions_20261003.csv remains applicable.

Expected regression failures were fixed once; no repeated unsuccessful repair. The Apps Script function dropdown AX representation lagged while DOM/screenshot showed it open; the exact named option and DOM selected state were used before Run. Git diff exit1 means differences found; LF/CRLF warnings did not change source. No unauthorized Run/deployment or business retry occurred. The prior browser source-transfer block was bypassed only by ordinary authorized clipboard editing of the already-read sanitized test source, checked against staged hashes, not by weakening browser security.

Recovery: inspect newer edits before restoring local candidate/harness from `baseline/`; restore test source from prior `P1-20261003-01/test-runtime-source/` only if rollback is required and separately logged. Current helper-free source is in this package's `test-runtime-source/`. Preserve before/after XLSX and synthetic row29/journal ERROR; manually reconcile its original request with inventory before any repair. Never create a fresh Request ID to retry an uncertain Add. Do not rerun the one-shot helper: its before-state guard will reject the changed row counts.

Limits: live Google test exercised one missing Cost header, unique SKU reuse, malformed API input and deliberately dropped marketplace formula; the broader permutations run locally. UI cache/booking behavior is a VM regression, not a new live UI failure injection. R4 is intentional test-only fault injection, not evidence of spontaneous Google loss. Prior same-tab response interruption does not prove a real network outage. Lost ID/new-device recovery remains manual. No shop source/schema/data/deploy or Back House LAB change; no shop runtime journal, Orders or reservation installation is claimed.

## One next step

Use this exact hash tuple and evidence for any further focused review; the next implementation phase requires a separate current-shop source/schema promotion plan. Do not promote this old-base candidate directly over the current shop's newer Meta/catalog changes.
'''
tables = lambda d: '\n'.join('| `' + k + '` | `' + v + '` |' for k,v in d.items())
export_table = '\n'.join(f'| `{name}` | {(e/name).stat().st_size:,} | `{sha(e/name)}` |' for name in ['test-sheet-before.xlsx','test-sheet-after.xlsx'])
write(e / 'review.md', header.format(now=now, candidate=c, staging=e/'test-runtime-source',candidate_table=tables(current),staged_table=tables(staged),export_table=export_table))

with (e / 'changes.csv').open(encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f); fields=reader.fieldnames; events=list(reader)
assert len(events)==2, 'Session close has already run; do not duplicate events'
def event(action,before,after,outcome,error,recovery,request='P1-R1-R4-REREVIEW-001',stamp=None):
    events.append(dict(zip(fields,[f'P1-33-{len(events)+1:03}',stamp or now,'P1-20261003-02',request,action,before,after,outcome,error,recovery])))
event('Reproduce frozen Session30 and Session32 defects','Baseline suites pass despite gaps','R1-R unmarked Add replay overwrites cache; R3-R accepts malformed types; original R1-R4 reproduced','CONFIRMED','Repro exit0 intentionally asserts unsafe outcomes','baseline/; original-baseline-output.txt; repro-output.txt')
event('R1-R candidate/Code.gs + webapp.gs + Index.html targeted fix','Add replay has no provenance; historical result enables LAST_ADD','Replay flag propagated to historical; UI returns before cache/booking mutation','PASS','Add/UI red assertions fail before repair then pass','baseline/candidate/; Code.gs.diff; webapp.gs.diff; Index.html.diff; add-red-output.txt; ui-red-output.txt')
event('R3-R candidate/Code.gs status type guard','false/0/arrays silently coerce','Non-string present status rejected; missing/null/blank default retained','PASS','Malformed requests fail before inventory/journal writes','baseline/candidate/Code.gs; Code.gs.diff; repro-output.txt; add-green-output.txt')
event('R2/R4 and API/UI failure-retry regressions','Existing coverage lacks restored-header retry and replay UI path','Header restore same-ID retry; malformed types; historical cache/notification assertions added','PASS','R4 ERROR retries stay blocked; expected red outputs retained','baseline/p1-add.test.cjs; baseline/p1-ui.test.cjs; p1-add.test.cjs.diff; p1-ui.test.cjs.diff; *green-output.txt')
event('Save three revised sanitized files to isolated Apps Script','Session32 source hashes 719482A6/6168CEA9/AF67EDF4','Current staged hashes 3F906DA2/057840A5/271313D0 saved and read back','PASS','Clipboard text changes checked against staged hashes; no deploy','../P1-20261003-01/test-runtime-source/; test-runtime-*.diff; source-readback.json')
event('Fresh isolated Sheet export before QA','GGB last row26; journal79; correct Cost header','test-sheet-before.xlsx 29576 bytes captured; before guard verified','PASS','No writes during export','test-sheet-before.xlsx; verify-live-qa.py')
event('Install temporary guarded QA helper into test Code only','Helper-free staged Code','Code-with-qa.gs temporarily saved; wrong-Sheet guard and syntax pass','PASS','AX dropdown lag resolved with DOM/screenshot; exact helper selected before Run','runtime-qa.gs; check-runtime-qa.cjs; Code-with-qa.gs; test-runtime-source/Code.gs')
event('Google R3 invalid source/status','GGB26/journal79','Malformed statuses and INVALID source rejected; same counts','PASS','Expected validation errors; no business retry','runtime-output.txt; runtime-qa.gs; test-sheet-before.xlsx',stamp='2026-10-03 16:20:32 +07:00')
event('Google R2 missing Cost and same-ID retry','Cost header temporarily QA_DISABLED_COST; no business writes','Header restored; one GGB27; journal80-81 PREPARED/DONE; Cost99 Price299','PASS','Expected missing-header error; same-ID retry after restoration succeeds','runtime-qa.gs; runtime-output.txt; test-sheet-before.xlsx; test-sheet-after.xlsx','p1-review-20261003-02-R2','2026-10-03 16:20:35 +07:00')
event('Google R1 unique SKU reuse replay/status','GGB28 original SKU temporarily assigned to GGB27','Both paths historical canonical snapshot; no duplicate; original SKUs restored; journal82-84','PASS','Same-ID Add replay appends DONE; read-only status no write','runtime-qa.gs; runtime-output.txt; test-sheet-after.xlsx','p1-review-20261003-02-R1','2026-10-03 16:20:38 +07:00')
event('Google R4 silent formula loss and retry','Formula writer temporarily blanks new GGB29 marketplace formula','Readback mismatch -> ERROR; same-ID retry blocked; journal85-87; partial row retained','PASS','Expected formula marketplace mismatch and recovery-required errors; no duplicate','runtime-qa.gs; runtime-output.txt; test-sheet-after.xlsx; preserve row29 and original ID','p1-review-20261003-02-R4','2026-10-03 16:20:41 +07:00')
event('Remove temporary helper and reload saved source','Test Code contains temporary guarded QA helper','Helper absent; fresh all-three-file readback equals staged hashes','PASS','No deploy; Save completed and verified after reload','test-runtime-source/; source-readback.json')
event('Export after QA and compare every populated cell','Fresh before workbook','158 added cells only; GGB27-29/journal80-87; all prior cells and MAG unchanged','PASS','No verifier retry needed; expected XLSX REGEXREPLACE wrapper accounted for','test-sheet-before.xlsx; test-sheet-after.xlsx; verify-live-qa.py; live-qa-output.txt')
event('Close Session33 docs and exact revision package','Session32 status awaiting review','Review+repair results; historical append; STATE/plan/current HANDOFF updated; hashes/diffs recorded','COMPLETE','No new owner decision; existing issue escalation rule retained','before/; docs-*.diff; review.md; manifest.json; verify-package.py')
with (e / 'changes.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(events)

summary = f'''Stream B §§2,5,6,9; Change `P1-20261003-02`, Request `P1-R1-R4-REREVIEW-001`; one writer. Focused rereview found two residual defects: unmarked same-ID Add replay could overwrite a reused-SKU cache item/enable stale booking notification (R1-R), and non-string status false/0/arrays could commit DONE (R3-R). Targeted candidate fixes and added API/UI failure-retry tests now pass; frozen Session30 and submitted Session32 reproductions are retained. R2 header gates and R4 all-four-formula readback pass; missing-header repair with same-ID retry is now covered. Exact source/test hashes, per-fix backups/diffs, expected red→green outputs, all errors/retries and recovery: `{e / 'review.md'}` and `changes.csv`.

Agent saved only the three sanitized source files in separate test Apps Script `1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd`, then ran guarded helper `p1ReviewQa20261003` at 16:20:32–16:20:43 Bangkok. Actual Google R1–R4 PASS: invalid inputs before writes; missing Cost before writes then same-ID DONE; unique SKU reuse returns historical committed snapshot; dropped marketplace formula gives ERROR and blocks retry. Fresh test Sheet exports 29,576→30,982 bytes; verifier PASS with only 158 added cells in GGB27–29/journal80–87, all prior values/formulas and MAG unchanged. Request IDs `p1-review-20261003-02-R2/R1/R4`; Cost header and SKUs restored, temporary writer restored, helper removed. Final fresh editor readback matches staged Code `3F906DA2...`, webapp `057840A5...`, Index `271313D0...`; candidate Code `279140CB...`, webapp `057840A5...`, Index `5ECE912B...`.

Expected pre-fix red tests failed then passed after one bounded repair. AX function-dropdown lag was resolved by screenshot/DOM selected-state confirmation before Run; diff exit1/LF warnings were non-failures. Source transfers used checked clipboard edits of sanitized test source. No failed business retry outside intentional QA. Recovery: preserve test GGB29 and journal85–87 ERROR evidence, original IDs and XLSX snapshots; never retry uncertain Add with a new ID. Restore local files from `baseline/` only after checking for newer edits; previous test staging remains in `P1-20261003-01/test-runtime-source/`. No new owner decision; existing issue/model-routing rule retained. Historical document prefix bytes preserved; full event audit is in `changes.csv`.

R1–R4 bounded local/Google acceptance is complete. This does not prove real network outage/new-device lost-ID recovery; manual reconciliation remains required. Shop P1 remains NO-GO: no shop source/schema/data/deploy or Back House LAB change, no shop runtime journal/Orders/reservation claim. One next step: separately review current-shop source rebase/pairing and exact journal migration before any promotion; the older candidate must not overwrite newer Meta/catalog work directly.
'''
for backup, target, heading in [
    ('handoff-history.md','00 Docs/HANDOFF_2026-09-28.md','## Session 33 — focused rereview repairs and isolated Google R1–R4 PASS (2026-10-03)'),
    ('implementation.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','### P1 focused rereview repair and isolated R1–R4 verification — P1-20261003-02 (2026-10-03)'),
]:
    p=root/target
    assert p.read_bytes()==(e/'before'/backup).read_bytes(), 'Documentation changed since backup'
    with p.open('ab') as f: f.write(('\n\n'+heading+'\n\nจัดทำ: '+now+'\n\n'+summary).encode('utf-8'))

state = root/'00 Docs/STATE.md'
text=state.read_text(encoding='utf-8')
text=text.replace('2026-10-03 05:51 +07 — Stream B P1 isolated Google test status updated',now+' — Stream B P1 focused rereview and isolated R1–R4 updated')
start=text.index('- Status: Sessions 31–32')
end=text.index('- Open:',start)
text=text[:start]+'''- Status: Session33 rereview found R1 replay provenance/cache and R3 non-string coercion gaps; repaired locally. Frozen before→after and API/UI failure/retry suites PASS. Actual isolated Google R1–R4 PASS; final helper-free source Save/readback matched exact hashes. Candidate SHA256 Code `279140CB27CF...`, webapp `057840A5F2E9...`, Index `5ECE912BC9AE...`. Shop promotion remains NO-GO.
- Shop untouched this session; schema absence evidence is historical (2026-09-30), not a fresh production check. No source/schema/data/deploy change or installed runtime journal/Orders/reservation claim.
- Next ONE step: separately review current-shop source rebase/pairing plus journal schema migration before a promotion decision; do not overwrite newer Meta/catalog work with this older candidate.
'''+text[end:]
text=text.replace('(Sessions 20–32, tail of file)','(Session 33, tail of file)').replace('evidence `04 Design Tools/logs/P1-20261003-01/`.','evidence `04 Design Tools/logs/P1-20261003-02/review.md` (prior package preserved).').replace('(Sessions through 32, history preserved)','(Sessions through 33, history preserved)')
write(state,text)

plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
text=plan.read_text(encoding='utf-8')
start=text.index('P1 board update 2026-10-03:'); end=text.index('\n',start)
text=text[:start]+'''P1 board update 2026-10-03 Session33: focused rereview found R1 replay provenance/UI-cache and R3 status-type defects; targeted repair + red→green VM regressions **DONE**. Actual isolated Google R1–R4 failure/retry **PASS** at 16:20:32–16:20:43; fresh exports 29,576/30,982 bytes, only GGB27–29/journal80–87 (158 added cells), all prior cells unchanged. Helper removed; saved source reload/readback **PASS**. Exact revised candidate Code `279140CB27CF...`, webapp `057840A5F2E9...`, Index `5ECE912BC9AE...`; evidence `04 Design Tools/logs/P1-20261003-02/review.md`, Change `P1-20261003-02` / Request `P1-R1-R4-REREVIEW-001`. Bounded R1–R4 acceptance **DONE**; shop promotion **NO-GO** pending separate current-source rebase/pairing and journal migration review. Test `/exec`, shop and Back House LAB unchanged.'''+text[end:]
write(plan,text)

write(root/'00 Docs/HANDOFF_2026-10-03.md',f'''# HANDOFF — 2026-10-03 — Stream B P1 Session33

จัดทำ: {now}. Master context §§2,5,6,9; Change `P1-20261003-02`, Request `P1-R1-R4-REREVIEW-001`; one writer.

1. **Done / before→after:** Focused rereview found R1 unmarked Add replay/cache/booking and R3 malformed-status coercion gaps; targeted repair and failure/retry regressions PASS. Candidate/test files under `{c}`; backups/diffs and full exact SHA256 tuple in `{e / 'review.md'}`. Candidate Code `279140CB27CFC193BF591E56667CFB179B16B46D9646936AA8E73C275AC354EF`, webapp `057840A5F2E9675121FA0CB8E03EEE7F0B4593750CB7EB4A4C83E3E204E0B621`, Index `5ECE912BC9AE2F7D7FBB9662C2E417B125F78930C68C0D9A03619DE44EB69AEB`.
2. **Data / evidence:** Actual isolated Google R1–R4 QA 2026-10-03 16:20:32–16:20:43 PASS. Fresh exports 29,576→30,982 bytes; only GGB27–29/journal80–87 added (158 cells), previous values/formulas and MAG unchanged. Cost header/SKUs restored; helper removed; all three saved test source hashes verified after fresh reload (`source-readback.json`). Row29 remains intentionally partial/ERROR; retry did not duplicate it.
3. **Decisions / logs:** Existing owner rule requires every issue/fix/retry/recovery logged and unresolved Sol / High repairs routed to Astra / High; no new decision/model switch/agent/chat. `changes.csv` and Implementation log record expected red tests, repairs, runtime actions and recovery. Historical HANDOFF now appends Session33 with original bytes preserved; STATE/plan/current summary updated.
4. **Not done / risk:** No shop source/schema/data/deploy, test `/exec`, or Back House LAB edit; no shop journal/Orders/reservation installation claim. R1–R4 bounded acceptance is complete, but shop promotion remains NO-GO pending a separate current-source rebase and schema decision. Real network outage/new-device lost-ID recovery remains unproven/manual.
5. **One next step / recovery:** Review current-shop source pairing/rebase and exact journal migration as a separate phase before promotion; use this exact hash tuple for further focused review. Preserve R4 Request `p1-review-20261003-02-R4`, row29 and ERROR journal; reconcile before any repair, never retry uncertain Add with a fresh ID. Restore from `baseline/` or prior test staging only after checking for newer edits.
''')

for backup,target in [('STATE.md','00 Docs/STATE.md'),('plan.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'),('handoff-today.md','00 Docs/HANDOFF_2026-10-03.md'),('handoff-history.md','00 Docs/HANDOFF_2026-09-28.md'),('implementation.md','00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md')]:
    old=e/'before'/backup; new=root/target
    write(e/('docs-'+backup+'.diff'),''.join(difflib.unified_diff(old.read_text(encoding='utf-8').splitlines(True),new.read_text(encoding='utf-8').splitlines(True),fromfile=str(old),tofile=str(new))))
for name in staged:
    old=e.parent/'P1-20261003-01/test-runtime-source'/name;new=e/'test-runtime-source'/name
    write(e/('test-runtime-'+name+'.diff'),''.join(difflib.unified_diff(old.read_text(encoding='utf-8').splitlines(True),new.read_text(encoding='utf-8').splitlines(True),fromfile=str(old),tofile=str(new))))

paths=[c/k for k in current]+[e/'test-runtime-source'/k for k in staged]
paths += [p for p in e.rglob('*') if p.is_file() and p.name not in ['manifest.json','package-output.txt']]
paths += [root/'00 Docs'/n for n in ['STATE.md','HANDOFF_2026-09-28.md','HANDOFF_2026-10-03.md','PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md']]
manifest={str(p.relative_to(root)).replace('\\','/'):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(paths))}
write(e/'manifest.json',json.dumps(manifest,indent=2)+'\n')
print(f'WROTE: {len(events)} CSV events; review/exact hashes; Session33 history/implementation appends; STATE/plan/handoff; diffs; {len(manifest)} artifact hashes')
