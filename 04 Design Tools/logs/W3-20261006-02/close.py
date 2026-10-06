# One-time Session49 close. Do not rerun after another session has started.
import csv,hashlib,json,re
from pathlib import Path
from datetime import datetime
p=Path(__file__).parent;root=p.parents[2];stamp=datetime.now().astimezone().isoformat(timespec='seconds')
v=json.loads((p/'verification.json').read_text(encoding='utf-8'));src=json.loads((p/'source-verification.json').read_text());qa=json.loads((p/'qa-results.json').read_text())
assert v['result']=='PASS' and v['nativeMigration']['result']=='PASS' and v['nativeReplay']['allSheetValuesFormulasUnchanged'] and src['qa13thFileReadback'] and qa['result']=='PASS'
assert 'Session49' not in (root/'00 Docs/STATE.md').read_text(encoding='utf-8')
rev=src['candidateRevision']['revision'];nextone='Local/test gates are complete except owner-deferred PDF/physical Print-Reprint. Preserve the deferral; do not begin production/real CLIENT migration. When print work is resumed, use the existing saved orders and verify print/reprint without SALES/stock/client writes.'
def log(action,before,after,result):
 with (p/'changes.csv').open('a',newline='',encoding='utf-8') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerow([stamp,p.name,action,before,after,result])
def write(f,t):
 before=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else 'ABSENT';log('WRITE-DRYRUN',str(f)+' '+before,str(f),'Scoped session close; backups retained')
 f.write_text(t,encoding='utf-8',newline='\n');assert f.read_text(encoding='utf-8')==t;log('WRITE-READBACK',before,hashlib.sha256(f.read_bytes()).hexdigest(),str(f)+' PASS')
def append(rel,t):
 f=root/rel;write(f,f.read_text(encoding='utf-8').rstrip()+'\n\n'+t+'\n')
short=f'''## Session49 — fresh two-channel UI and native migration PASS

จัดทำ: {stamp} · `{rev}` unchanged · one writer · exact isolated Google test only.

Fresh UI E2E PASS: SHOP Inventory→Cart→Pending→Confirm sold with existing CLIENT explicit selection/default order-only and different recipient; SHOPEE Inventory→Cart→Confirm sold/Label later→Complete label with new CLIENT and different recipient. Both Saved/100×150mm Preview/CAUTION observed. Orders `OWA-20261006-01` and `OWA-20261006-02`: SALES +2 only (SHOP390.10/subsidy10/profit280.10; SHOPEE entered500→ledger300/profit200), CLIENT +1 only with literal formula-like private fields/leading zeros; old prefixes preserved. Inventory changed only MAG W2V39-2 and W1V33CHECK-0 permitted stock/price/date/UID cells. Five original UI requests are DONE and replayed without any workbook values/formulas change.

Native six-column migration PASS on new `W3 LEGACY CLIENT` / `W3 MIGRATION REQUESTS` tabs, reusing actual v39 helper through an execution-local QA adapter that preserves actual Sheet ID/owner/lock; existing original CLIENT8cols and original schema journal untouched. A:F values/formulas/numeric legacy values/leading zeros and blank row preserved; equal-name rows get distinct IDs. Injected after-effect failure→NEEDS_REVIEW attempt1; same allocated IDs/revision retry→DONE attempt2; DONE replay changes no sheet values/formulas. Original nine tabs unchanged throughout migration. QA source/adapter check PASS8; fresh saved13-file readback verifies original12files unchanged plus exact QA-only W3Qa.gs; candidate9hashes unchanged. Main journal now {v['mainJournalRows']} data rows, +59 UI events/+5 fixture initialization events; separate migration journal {v['nativeMigration']['journalEvents']} events.

Evidence: `04 Design Tools/logs/W3-20261006-02/` result/verification/source-verification/native JSON/five fresh XLSX/UI PNG/changes.csv; Session48 and earlier evidence retained. PDF/physical Print-Reprint remains **DEFERRED — ยังไม่ได้ทดสอบ, NOT PASS**. Production/numbered deploy/real CLIENT migration/P0/P1/LAB excluded. Next ONE: {nextone}
'''
write(p/'result.md','# Session49 result — local/test\n\n'+short+'\nNo runtime defect reproduced or candidate version change. Source change is only a test-only QA module; no manifest/security/deployment change. Native execution and deterministic invariants were reviewed by the current writer; no Astra model switch/review is claimed. Original W2 UNDO remains authoritative; never restore historical XLSX over later durable history.\n')
write(p/'review.md',f'''# Focused current-writer review — Session49

PASS for the exercised local/test gates at `{rev}`; no model switch claimed. Reviewed actual helper routing and fresh native results: unique sales/line IDs, channel money rules, default existing-client order-only, literal new CLIENT private fields/leading zeros, separate committed recipient, original intent/allocated ID/revision retry, owner/test ID guard, restoration of service/write bindings, preserved original A:F formulas and original workbook tables. QA initialization refuses unexpected/unsaved partial data rather than overwriting it. Five DONE UI requests plus migration DONE replay leave all exported workbook values/formulas identical. No production runtime/helper changes or validation weakening. Print acceptance remains untested; this is not production release approval.
''')
write(p/'implementation.md',f'''# Implementation / attempts / recovery — Session49

{stamp} · Stream B §§2/5/5.2.1/6/9 · one writer · exact `{rev}`

- Fresh export before UI. Reused two previously unused synthetic Instock items; never reran old Prepare/Repair/F05. SHOP create request w1-1791226216521-t41c39mwrds; confirm w1-1791226531572-5e6mjr9rc27. SHOPEE confirm w1-1791227007644-4ohjasct10r; label w1-1791227196113-gtrc5x72f7n; new CLIENT crm-855e1c85450f74df9846a21e101a1e3bfb8e504c46267636b75ba85178563a4f. Submitted each UI mutation once; waited for actual Saved responses. Uncertain-request status while in flight was retained; no duplicate request/retry click. Preview only, no Print. Modal closed using Back without Save label.
- UI locator attempts: CART became CART1; corrected to observed navCart. Orders board children were ARTICLE rather than DIV; corrected after DOM inspection. Editor filename became W3Qa while typing, so old Untitled option failed; retargeted observed W3Qa before Enter. These are automation locator errors, not runtime fixes.
- New QA local first attempt failed CLIENT_SCHEMA_CONFLICT because the harness range closure still referenced the original rows after replacing sh.rows. Changed only test seeding to splice the existing array; eight invariant checks PASS. Native coercion was explicitly not simulated. Added QA-only W3Qa.gs to exact project after fresh12-file backup; saved/reloaded/read all13files via editor clipboard; LF SHA256 comparison PASS. Original runtime12files/manifest/candidate9files unchanged; no pair bump/deploy.
- Native read-only probe PASS restored service binding. Fixture initialization journal DONE; only new tabs populated. Exact original migration helper after-effect failure observed; same helper retried original fixed request in separate fixture journal with stable allocated IDs/revision. Original A:F/nine-tab proof verified every run. Original ID DONE replay of both UI orders and migration verified against complete before/after XLSX.
- Export diagnostics: new script inspect.py shadowed Python stdlib inspect; retained the file by renaming inspect-ui.py, then corrected blank trailing export rows and journal column mapping using authoritative W1_HEADERS (Event ID differs from Request ID). CLIENT count check initially assumed next physical row; actual append allocated row1101 after existing1051, with49 blank capacity rows. Corrected the assertion to exact old-prefix preservation, blank-only capacity and exactly one nonblank new client; no runtime/data correction. SALES amounts/subsidy/profit and line IDs verified explicitly.
- Screenshots preserved with raw bytes if encoded as JPEG, then converted to actual PNG; final board capture transferred under allowlisted migration.png and renamed ui-final.png (no delete). Avoid AX dumps of filled source/base64 transfer textareas; clear after capture/read only result. Loopback transfer closed after evidence collection.
- Eight original document backups retained, Session48 handoff reference-checked/archived, Session49 handoff recreated. Plan/state/implementation/handbook/README/decisions/CLAUDE updated and read back. PDF/physical Print-Reprint remains owner-deferred/untested; no production/LAB/P0/P1/real CLIENT/numbered deploy/new agents.
''')
write(p/'CONTINUE.md',f'''# Continue after Session49

{stamp} · `{rev}` unchanged · one writer

Read STATE first, then result.md/verification.json here. Fresh two-channel Google UI and native6-column fixture migration/failure-retry PASS; five UI DONE replays + migration replay preserve every workbook value/formula. Original12runtime files unchanged; added13th QA-only W3Qa.gs excluded from candidate/production. Existing original CLIENT8cols not migrated/reinitialized. Current test has two new sold/label-ready orders01/02, one new client, main journal{v['mainJournalRows']}rows and separate native fixture tabs/journal. Do not rerun old/new Prepare, inject failure again, restore old exports, or treat same fixed schema ID as permission to migrate another table.

Next ONE: {nextone}

PDF/physical Print-Reprint: DEFERRED — ยังไม่ได้ทดสอบ, NOT PASS. No production/numbered deployment/real CLIENT/P0/P1/LAB work authorized. Test undo = preserve IDs/events and original W2 UNDO.md; do not delete fixture history. No model switch claimed.
''')
plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md';t=plan.read_text(encoding='utf-8')
t=t.replace('W3 — local migration/backend E2E PASS; native UI/migration OPEN; production TODO','W3 — local/test UI + native migration PASS; print DEFERRED; production TODO',1)
t=t.replace('Session48 local13groups + fresh7native DONE replays/XLSX preservation; TEST-RUNBOOK.md; native UI/migration OPEN → release ที่อนุมัติ → readback','Session49 fresh SHOP/SHOPEE UI + native6migration/failure-retry +5UI/migration DONE replays/export preservation PASS; W3-20261006-02/result.md; print DEFERRED → release ที่อนุมัติ → readback',1)
t=re.sub(r'(?m)^\*\*Next ONE step:\*\*.*$',f'**Next ONE step:** {nextone} See `04 Design Tools/logs/W3-20261006-02/CONTINUE.md`.',t,count=1)
write(plan,t.rstrip()+'\n\n'+short+'\n')
for rel in ['00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md']:append(rel,short)
append('CLAUDE.md','''## Native legacy migration fixture and UI acceptance (added 2026-10-06)

Keep existing eight-column CLIENT and its DONE schema request intact. Test actual helper migration on separately named native fixture/client-journal tabs through a QA-only execution-local adapter with actual owner/Sheet-ID/lock checks and finally-restored service binding; never include the adapter in candidate/production. Export before/after, compare original A:F values AND formulas and every original table, and prove after-effect retry keeps originally allocated IDs/revision. Count nonblank client identities separately from blank append capacity; preserve blank rows rather than assuming contiguous data. Distinguish journal Event ID/Request ID using authoritative headers. Avoid naming Python diagnostics inspect.py (stdlib collision). Clear transfer textareas before AX dumps and show only capture result, never giant source/base64. Full two-channel UI/native migration acceptance still does not prove PDF/physical printing.''')
state=root/'00 Docs/STATE.md';t=state.read_text(encoding='utf-8');t=re.sub(r'(?m)^จัดทำ: .*$',f'จัดทำ: {stamp} — Stream B Session49 local/test gates verified; other streams retain prior snapshots.',t,count=1)
start=t.index('### 1.');end=t.index('### 2.')
block=f'''### 1. Add / Cart / Orders / Label (Stream B) — W1 CLOSED; local/test UI + migration PASS; print DEFERRED
- Status: Session49 fresh SHOP/SHOPEE Google UI E2E + native6-column legacy CLIENT fixture migration/failure-retry PASS. Five original UI requests + migration DONE replay leave every workbook value/formula unchanged.
- Next ONE step: {nextone} See 04 Design Tools/logs/W3-20261006-02/CONTINUE.md.
- Exact revision: {rev}; candidate9hashes unchanged; fresh saved13-file Google readback verifies original12files unchanged/manifest unchanged + exact QA-only W3Qa.gs. No runtime pair bump/deployment.
- Fresh UI: OWA-20261006-01 SHOP390.10/customerShipping50/subsidy10; OWA-20261006-02 SHOPEE entered500/ledger300/shipping0. SALES+2/CLIENT+1 only; original prefixes preserved; only MAG W2V39-2/W1V33CHECK-0 permitted stock/price/date/UID cells change; both SOLD/label-ready/Preview100x150CAUTION.
- Existing CLIENT stable-ID selection/default order-only and separate recipient; new CLIENT literal private fields/phone0890000202/postal00202 preserved. Five original UI requests DONE; fresh before/after export replay unchanged. Main journal{v['mainJournalRows']}data rows (+59UI/+5fixture events).
- Native fixture W3 LEGACY CLIENT/W3 MIGRATION REQUESTS: actualv39 helper, actualtestID/owner/lock; A:F values/formulas/numeric legacy/leading zeros/blank row preserved; equal-name distinct IDs. After-effect NEEDS_REVIEW attempt1→same IDs/revision DONE attempt2; DONE replay unchanged; original9tabs untouched. Alias journal{v['nativeMigration']['journalEvents']}events. Never rerun Prepare/injection or overwrite original CLIENT8cols/DONE schema request.
- Evidence W3-20261006-02: result/review/implementation/CONTINUE/verification/source-verification/QA8checks/native JSON/five fresh XLSX/ui-final.png/changes.csv. Local Session48 migration13groups and previous W2 native CRM failure/retry evidence retained; original W2 UNDO applies.
- PDF/physical Print-Reprint: owner DEFERRED — ยังไม่ได้ทดสอบ, NOT PASS. Local/test remaining gate; production release also remains outside authorized scope. Do not retry printer/browser setup now.
- Historical Session48 reconciliation retained: labels.save w1-1791222331322-mxgbvwmbbv at00:45:53–59+07, +5events/order05revision3→4 with identical recipient/client and no sale/stock change; old Session46/47 no-mutation reports incomplete. Preserve durable history/actor uncertainty; never restore old export.
- W1 CLOSED/frozen W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42; Session44 REVIEW W1-20261005-02; F0549-gap repair closed, never repeat.
- Scope: exact isolated project1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd / Sheet13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM; productionv31/numbered deploy/real CLIENT migration/P0/P1/LAB excluded. Current-writer focused review PASS; no Astra/model switch claimed.
- Current HANDOFF_2026-10-06.md Session49; Session48 archived in _archive/handoffs_old/. All prior W1/W2 evidence retained.

'''
t=t[:start]+block+t[end:];t=t.replace('Session41/42/43/44/45/46/47 handoffs are archived; Session48 is current.','Session41/42/43/44/45/46/47/48 handoffs are archived; Session49 is current.')
assert len(t.splitlines())<=80;write(state,t)
write(root/'00 Docs/HANDOFF_2026-10-06.md',f'''# HANDOFF — Session49 / Stream B

จัดทำ: {stamp} · §§2/5/5.2.1/6/9 · one writer

1. **Done:** Fresh SHOP Pending→sold with existing CLIENT/default order-only/different recipient; SHOPEE sold→later label/new CLIENT/different recipient; Saved/Preview PASS. Native6-column CLIENT migration/after-effect failure/original-ID retry/DONE replay PASS. Five UI original-ID replays and all exported values/formulas unchanged.
2. **Source/data:** `{rev}` unchanged; original12Google files + candidate9hashes unchanged; only QA-only W3Qa.gs added/read back as13thfile, excluded from candidate/production. Original CLIENT8cols and original schema journal untouched. New two orders01/02, SALES+2/CLIENT+1, main journal{v['mainJournalRows']}rows; separate native fixture tabs/journal retained. Do not reinitialize/delete fixture or restore historical exports.
3. **Files/evidence:** `{p}` result/review/verification/source-verification/nativeJSON/five XLSX/3UI PNG/changes.csv/CONTINUE; eight backups retained. Session48 handoff archived; STATE/PLAN/implementation/handbook/README/decisions/CLAUDE updated/read back.
4. **Not done:** PDF/physical Print-Reprint owner DEFERRED — ยังไม่ได้ทดสอบ, not PASS. Production/real CLIENT migration/numbered deployments/P0/P1/LAB outside scope. No model switch claimed; original W2 UNDO preserves IDs/history.
5. **Next ONE:** {nextone}
''')
dec=root/'04 Design Tools/logs/decisions_2026-10-06.csv';prior=dec.read_text(encoding='utf-8-sig');log('DECISIONS-DRYRUN','Prior rows retained','Append Session49 gate outcomes','No release/print approval inferred')
with dec.open('a',newline='',encoding='utf-8') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerows([['2026-10-06',p.name,'Fresh two-channel UI + native6 migration','CLOSED','PASS same-ID/revision recovery; five UI/migration DONE replays export unchanged; candidate unchanged; QA-only separate fixture','User continue authorization + verification.json'],['2026-10-06',p.name,'PDF/physical Print-Reprint','DEFERRED','ยังไม่ได้ทดสอบ; NOT PASS. Only remaining local/test gate; production separate/excluded','Prior owner deferral retained; CONTINUE.md']])
assert dec.read_text(encoding='utf-8-sig').startswith(prior);log('DECISIONS-READBACK','Prior rows preserved','Two outcomes appended','PASS')
log('ATTEMPTS','Locator/mock/Python/CLIENT capacity diagnostic assumptions failed','Corrected only automation/checks using observed DOM and authoritative headers','No runtime defect/data repair; implementation.md retains attempts')
log('UI/NATIVE-OUTCOME','google-before.xlsx; original source12','Two UI orders + one CLIENT + fixture metadata; original native tables preserved through migration','UI/native/replay PASS; print DEFERRED')
log('IMAGE-RENAME','migration.png allowlisted transfer capture','ui-final.png final two-SOLD board evidence','No delete; raw JPEG retained where applicable')
summary={'result':'PASS','session':'Session49','stateLines':len(t.splitlines()),'csv':True,'decisions':True,'plan':True,'handoff':True,'relatedDocs':True,'datedLesson':True,'readback':True,'runtimeVersion':'v39 unchanged','print':'DEFERRED; NOT PASS'}
write(p/'session-close-verification.json',json.dumps(summary,indent=2)+'\n')
for f in p.iterdir():
 if f.is_file() and f.name!='changes.csv':log('ARTIFACT',f.name,str(f),str(f.stat().st_size)+' bytes SHA256 '+hashlib.sha256(f.read_bytes()).hexdigest())
print(json.dumps(summary))
