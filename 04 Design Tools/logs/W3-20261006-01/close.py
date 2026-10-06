# One-time Session48 close; do not rerun against later sessions.
import csv,hashlib,json,re
from datetime import datetime
from pathlib import Path
p=Path(__file__).parent;root=p.parents[2]
stamp=datetime.now().astimezone().isoformat(timespec='seconds')
v=json.loads((p/'verification.json').read_text())
assert v['result']=='PASS' and v['freshNativeReplay']['result']=='PASS' and v['afterReplayExport']['allSheetValuesFormulasUnchanged']
assert 'Session48' not in (root/'00 Docs/STATE.md').read_text(encoding='utf-8')
rev=v['revision'];nextstep='Fresh isolated two-channel UI E2E using newly scoped synthetic fixtures and original-ID recovery; export first, never rerun old Prepare/Repair. Native six-column migration fixture remains a separate untested gate.'
def log(action,before,after,result):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerow([stamp,'W3-20261006-01',action,before,after,result])
def write(f,text):
 before=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else 'ABSENT'
 log('WRITE-DRYRUN',str(f)+' '+before,str(f),'Scoped docs; before backups retained')
 f.write_text(text,encoding='utf-8',newline='\n');assert f.read_text(encoding='utf-8')==text
 log('WRITE-READBACK',before,hashlib.sha256(f.read_bytes()).hexdigest(),str(f)+' PASS')
def append(rel,text):
 f=root/rel;write(f,f.read_text(encoding='utf-8').rstrip()+'\n\n'+text+'\n')
short=f'''## Session48 — local migration / non-print readiness

จัดทำ: {stamp}. Local synthetic legacy CLIENT migration and combined SHOP/SHOPEE backend flow PASS13groups at unchanged `{rev}`. A:F values/formulas, blank rows, equal-name distinct IDs, numeric legacy values, stable original IDs/revisions, owner/test-ID/schema guards and failure/retry preserved; migrated-client selection/default order-only and recipient snapshots never add a second sale. Syntax PASS. Fresh isolated Google regression: seven DONE original confirm/CLIENT/label replays PASS with identical native proof and complete before/after XLSX values/formulas. Nine candidate hashes/twelve recorded source readbacks unchanged; no fresh source upload/readback claimed. Test installation/recovery packet: `04 Design Tools/logs/W3-20261006-01/TEST-RUNBOOK.md`; results/verification/CSV in that package.

Fresh export reconciles a prior-session `labels.save` request `w1-1791222331322-mxgbvwmbbv` (2026-10-06 00:45:53–59 +07): order05 revision3→4, +5 append-only events, identical recipient/client/other order fields and all seven other sheets. Current W2 proof SALES2/CLIENT2/journal1300 rows; prior Session46/47 statements of no service mutation were incomplete historical reports, not the current baseline. No sale/stock/client change or repair was needed; actor provenance is not inferred. Complete evidence `fresh-export-delta.json` and `verification.json`.

PDF/physical Print-Reprint remains **DEFERRED — ยังไม่ได้ทดสอบ (not PASS)**. Native six-column migration and a fresh complete two-channel Google UI flow remain untested; local VM and DONE replay do not close them. Production/numbered deployments/real CLIENT migration/P0/P1/LAB excluded. Next ONE: {nextstep}
'''
write(p/'result.md',f'''# W3 local/test preparation result — Session48

{short}

No runtime defect reproduced and no runtime/source/schema installation performed. Current-writer review of the exercised helpers found no blocker for these local checks; no model switch or Astra-specific review is claimed. Existing W1/W2 code and dated evidence are retained. `TEST-RUNBOOK.md` supplements original W2 `UNDO.md`, never replaces original recovery intent or authorizes data rollback.
''')
write(p/'implementation.md',f'''# Implementation / issues / recovery — Session48

{stamp} · Stream B §§2/5/5.2.1/6/9 · one writer · exact `{rev}`

- Created local assertion script using existing W1/W2 fixtures and actual candidate functions, not a parallel implementation. Attempt01 failed because the new test assumed Sales API included channel; traced `_apiSalesList()` and selected the existing order field instead. Attempt01 source/result retained; retry PASS13groups. Node syntax PASS. Failure simulations and synthetic before/after identities are retained in migration-results.json. No business/runtime fix was necessary.
- Fresh export assertion against dated final initially failed. Diagnosis found one earlier DONE labels.save request and five events. Verified append-only prefix, exact durable before/after/payload, same recipient/default order-only, revision3→4 and seven other unchanged sheets; retained delta instead of restoring the old export. A diagnostic assumed gzip for plain JSON; used the existing prefix-aware decode contract. Native empty-string vs XLSX None blank caused the intent assertion mismatch; normalization is restricted to that boundary while workbook values/formulas are still compared exactly. Reconciliation verification PASS; no data correction or silent rebaseline.
- Native read result was pending after clearing old textarea; early JSON parse/binding reads failed without sending a mutation. Reloaded exact /dev, waited for the actual fresh response, then invoked reviewed DONE-only replay. Latency/cached-session root cause is not proven; no runtime code was changed to mask it. Seven same-ID replays PASS with identical full native proof; fresh before/after workbook values/formulas unchanged. Log all attempts/results in changes.csv.
- Kept PDF/physical print deferred. Existing isolated CLIENT has eight columns and fixed migration request is already DONE: do not replace it with a six-column fixture or use generic requests.resume for W2_SCHEMA. Local migration retry uses the same w2PrepareTestSchema helper; real/native migration requires separate schema/fixture work.
- Archived Session47 handoff after reference check, retained eight document backups, updated plan/state/handbook/README/decisions/CLAUDE and read back. Version pair remains v39 because runtime source is unchanged. No live source upload, numbered deploy, production/LAB/P0/P1 work or new agents.
''')
write(p/'CONTINUE.md',f'''# Continue after Session48

{stamp} · `{rev}` · one writer · local/test only

Read STATE first, then result.md and TEST-RUNBOOK.md here. Local six-column CLIENT migration / failure-retry / combined two-channel backend checks PASS13groups; fresh native seven DONE replays and before/after XLSX preservation PASS. No runtime changes. Current isolated baseline includes the earlier labels.save request, order05 revision4, 1300 journal data rows. Do not restore dated exports or replay old fixture/repair helpers.

Next ONE: {nextstep}

PDF/physical Print-Reprint stays DEFERRED/ยังไม่ได้ทดสอบ, not PASS. No real migration/deployment/numbered deployment/P0/P1/LAB/new agents. Before any live claim/write, fresh export/native read and CSV; source backups/readback if installing. Do not replace existing eight-column CLIENT or reuse a DONE schema request for a new migration. Original W2 UNDO remains authoritative.
''')
plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md';t=plan.read_text(encoding='utf-8')
t=t.replace('**3 · W3 — local/test preparation NEXT; production TODO**','**3 · W3 — local migration/backend E2E PASS; native UI/migration OPEN; production TODO**',1)
t=t.replace('exact reviewed revision + migration dry-run + isolated E2E → release ที่อนุมัติ → readback','Session48 local13groups + fresh7native DONE replays/XLSX preservation; TEST-RUNBOOK.md; native UI/migration OPEN → release ที่อนุมัติ → readback',1)
t=re.sub(r'(?m)^\*\*Next ONE step:\*\*.*$',f'**Next ONE step:** {nextstep} See `04 Design Tools/logs/W3-20261006-01/CONTINUE.md`; PDF/physical Print-Reprint remains owner-deferred and untested.',t,count=1)
write(plan,t.rstrip()+'\n\n'+short+'\n')
for rel in ['00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md']:append(rel,short)
append('CLAUDE.md','''## Migration and fresh replay evidence (added 2026-10-06)

For legacy CLIENT migration, prove original A:F values/formulas remain intact and original allocated IDs/revision survive retry; do not infer or repair legacy leading zeroes. The existing isolated schema request is fixed and DONE: never replace its eight-column CLIENT with a new six-column fixture. W2_SCHEMA recovers with its original helper, not generic UI requests.resume. Before native replay, export fresh and reconcile every delta against durable intent; enumerate actual DONE requests instead of assuming historical counts/revisions. A cleared QA textarea must receive a new response before parsing/claiming proof. Local VM checks, native DONE replay and full native UI/migration are distinct acceptance gates.''')
state=root/'00 Docs/STATE.md';t=state.read_text(encoding='utf-8')
t=re.sub(r'(?m)^จัดทำ: .*$',f'จัดทำ: {stamp} — Stream B Session48 local/test readiness verified; other streams retain prior snapshots.',t,count=1)
start=t.index('### 1.');end=t.index('### 2.')
block=f'''### 1. Add / Cart / Orders / Label (Stream B) — W1 CLOSED; local W3 checks PASS; print DEFERRED
- Status: Session48 local synthetic legacy CLIENT migration/backend two-channel E2E PASS13groups; fresh isolated Google7DONE replays + complete before/after XLSX preservation PASS. No runtime/source/data change in this phase.
- Next ONE step: {nextstep} See 04 Design Tools/logs/W3-20261006-01/CONTINUE.md.
- Exact revision: {rev}; nine candidate hashes/twelve recorded source readbacks freshly match; manifest unchanged. No new Google source readback/upload claimed.
- Current isolated evidence2026-10-06: W3-20261006-01/google-before-replay.xlsx + google-after-replay.xlsx; native-replay-summary.json/verification.json. W2 SALES2/CLIENT2, journal1300 data rows; order04revision3/order05revision4. Journal hash3712f62fe7a3924d8f829746b37e8361bccf602ab5f6faaea3e99962352becdf unchanged by7replays.
- Prior delta reconciled: labels.save w1-1791222331322-mxgbvwmbbv at2026-10-06 00:45:53–59+07; +5events/order05revision3→4, original recipient/client/other order fields unchanged; seven other sheets unchanged. Earlier Session46/47 no-mutation reports incomplete; preserve historical evidence, no rollback/actor inference. fresh-export-delta.json.
- Local migration preserves A:F values/formulas/numeric legacy entries, blanks/equal-name distinct IDs; same-ID/revision retry and owner/testID/schema guards PASS. TEST-RUNBOOK.md supplements original W2 UNDO.md; native legacy migration NOT TESTED. Existing Google CLIENT8cols + schema request DONE: never overwrite/reinitialize.
- PDF/physical Print-Reprint: owner DEFERRED — ยังไม่ได้ทดสอบ, NOT PASS. Deferral is scheduling only; print acceptance and production release remain open. Do not retry browser/printer setup now.
- Closed choices: reuse CLIENT A:F + ID/Updated At; explicit stable-ID selection; default order-only/explicit update; recipient snapshot separate; canonical renderer/CAUTION; private fields/prices excluded; original-ID recovery. W2-20261005-01 dated implementation/native failure/retry/preview evidence retained.
- W1 CLOSED/frozen W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42; Session44 REVIEW W1-20261005-02. F0549-gap repair closed; never repeat.
- Scope: exact isolated project1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd / Sheet13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM. Production v31/numbered deployments/LAB/P0/P1/real CLIENT migration excluded. No model switch claimed.
- Current HANDOFF_2026-10-06.md Session48; Session47 archived under _archive/handoffs_old/. Logs/result/implementation/TEST-RUNBOOK/CONTINUE/verification in W3-20261006-01; prior W2 evidence immutable.

'''
t=t[:start]+block+t[end:];t=t.replace('Session41/42/43/44/45/46 handoffs are archived; Session47 is current.','Session41/42/43/44/45/46/47 handoffs are archived; Session48 is current.')
assert len(t.splitlines())<=80;write(state,t)
write(root/'00 Docs/HANDOFF_2026-10-06.md',f'''# HANDOFF — Session48 / Stream B

จัดทำ: {stamp} · §§2/5/5.2.1/6/9 · one writer

1. **Done:** Actual v39 local legacy CLIENT migration/backend SHOP+SHOPEE/retry PASS13groups, syntax PASS; fresh Google7DONE replays/native proof and full before/after XLSX preservation PASS. No runtime change/model switch claimed.
2. **Files/state:** `{rev}` unchanged. Full touched paths and before→after hashes in `{p}/changes.csv`; eight backups in before/, Session47 handoff archived. TEST-RUNBOOK/result/implementation/CONTINUE/verification prepared; STATE/PLAN/HANDBOOK/README/decisions/CLAUDE updated/read back.
3. **Data/source:** Fresh isolated exports2026-10-06; candidate9hashes/recorded12source readbacks unchanged. Reconciled earlier labels.save00:45:53–59+07: +5events/order05rev3→4 with identical recipient/client and no SALES/stock change. Current proof SALES2/CLIENT2/journal1300; seven replays unchanged. Actor provenance not inferred; prior source readbacks explicitly historical.
4. **Not done:** PDF/physical Print-Reprint DEFERRED — ยังไม่ได้ทดสอบ, not PASS; native six-column migration and full fresh two-channel UI E2E open. No real migration/source install/production/numbered deployment/P0/P1/LAB/new agents. Keep IDs/events and original W2 UNDO; never restore old XLSX over later history.
5. **Next ONE:** {nextstep}
''')
decision=root/'04 Design Tools/logs/decisions_2026-10-06.csv';before=decision.read_text(encoding='utf-8-sig')
log('DECISIONS-DRYRUN','Prior rows retained','Append Session48 local/test outcome','No owner release decision inferred')
with decision.open('a',encoding='utf-8',newline='') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerows([['2026-10-06','W3-20261006-01','Authorized independent local/test work','CLOSED','Local CLIENT migration/backend E2E PASS13; fresh7DONE replay/export unchanged; test installation/undo packet ready','User authorization + result.md + verification.json'],['2026-10-06','W3-20261006-01','Remaining native/release gates','OPEN','Native legacy6 migration/full fresh two-channel UI still open; PDFphysical DEFERRED untested; no production approval','CONTINUE.md + TEST-RUNBOOK.md']])
assert decision.read_text(encoding='utf-8-sig').startswith(before)
log('DECISIONS-READBACK',before[-100:],decision.read_text(encoding='utf-8-sig')[-100:],'PASS prior decisions preserved')
v['sessionClose']={'stateLines':len(t.splitlines()),'csv':True,'decisions':True,'plan':True,'handoff':True,'relatedDocs':True,'datedLesson':True,'readback':True,'runtimeVersionUnchanged':'v39'}
write(p/'session-close-verification.json',json.dumps(v,indent=2)+'\n')
for f in p.iterdir():
 if f.is_file() and f.name!='changes.csv':log('ARTIFACT',f.name,str(f),f'{f.stat().st_size} bytes SHA256 '+hashlib.sha256(f.read_bytes()).hexdigest())
print(json.dumps(v['sessionClose']))
