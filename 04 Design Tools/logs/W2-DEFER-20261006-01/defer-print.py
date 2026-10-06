import csv, hashlib, json, re
from datetime import datetime
from pathlib import Path

p=Path(__file__).parent
root=p.parents[2]
stamp=datetime.now().astimezone().isoformat(timespec='seconds')
assert stamp[:10]=='2026-10-06'
base=root/'04 Design Tools/logs/W2-20261005-01'
revision=json.loads((base/'revision.json').read_text())
rev=revision['revision']
log=p/'changes.csv'
def event(action,before,after,result):
    with log.open('a',encoding='utf-8',newline='') as f:
        csv.writer(f,quoting=csv.QUOTE_ALL).writerow([stamp,'W2-DEFER-20261006-01',action,before,after,result])
def write(f,text):
    old=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else 'ABSENT'
    event('WRITE-DRYRUN',str(f)+' '+old,str(f),'Backups retained; local docs only')
    f.write_text(text,encoding='utf-8',newline='\n')
    assert f.read_text(encoding='utf-8')==text
    event('WRITE-READBACK',old,hashlib.sha256(f.read_bytes()).hexdigest(),str(f)+' PASS')
def append(relative,text):
    f=root/relative
    write(f,f.read_text(encoding='utf-8').rstrip()+'\n\n'+text+'\n')

for name,h in revision['hashes'].items():
    actual=hashlib.sha256((base/'candidate'/name).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest().upper()
    assert actual==h
for f in (base/'test-runtime').iterdir():
    if f.is_file(): assert f.read_text(encoding='utf-8')==(base/'google-source-readback'/f.name).read_text(encoding='utf-8')
short=f'''## Session47 — owner defers untested PDF / physical print

จัดทำ: {stamp}. Owner chose to skip the PDF/physical Print-Reprint test for now and explicitly record it as **DEFERRED — ยังไม่ได้ทดสอบ (not PASS)**. Existing W2 implementation/retry/preview evidence remains valid at `{rev}`; this does not finish print acceptance or authorize production. Independent local/test release preparation, migration dry-run and E2E may proceed. Actual paper size/page breaks, Thai font/clipping, driver/scaling and physical output remain unverified. Detail/next bounded task: `04 Design Tools/logs/W2-DEFER-20261006-01/READINESS.md`. No source/data/service/deployment/LAB change; no new model or test execution claimed.
'''
write(p/'result.md',f'''# W2 print deferral / local-test readiness

จัดทำ: {stamp} · Stream B §§2/5/5.2.1/6/9 · Session47 · one writer

Owner-authorized deferral: **PDF export page/content and physical Print/Reprint are ยังไม่ได้ทดสอบ / DEFERRED, not PASS.** Preview and prior native transaction/CLIENT/retry/replay acceptance remain dated evidence in W2-20261005-01. Native print dispatch was attempted but produced no inspected PDF or physical acceptance. Production release and W2 print acceptance remain open.

The deferral does not change transaction logic, stock, SALES, CLIENT or recipient snapshots. Printing/reprinting reads saved orders, so local/test migration/readiness/E2E work need not wait for printer access. Remaining risk is unverified output size, pagination/clipping, fonts, margins/scaling and driver/printer behavior. A defect found later may require a scoped renderer fix and affected checks; no claim that physical output is safe has been made.

Prepared a bounded local/test readiness packet in READINESS.md. Fresh local hash comparison verifies nine candidate files and twelve recorded test-source files unchanged at `{rev}`. This is not a fresh Google data claim. No production/schema deployment, real CLIENT migration, P0/P1 restart or LAB action is authorized by the deferral. Closed choices and money/stock/recovery/access tests are retained, not waived. Original failure/recovery/export evidence remains immutable.
''')
write(p/'READINESS.md',f'''# Next work — local/test release preparation

จัดทำ: {stamp} · exact `{rev}`

| Item | State / scope |
|---|---|
| Exact source and evidence packet | PREPARED; nine candidate LF hashes and twelve recorded test-source files freshly match; manifest/QA exclusions remain recorded in original verification.json |
| Legacy CLIENT A:F → ID/revision migration | NEXT local synthetic dry-run; use original six-header contract; preserve every A:F value/formula, unique stable IDs even for equal names, blank rows, same-ID retry and expected revision; do not read/migrate real shop data |
| Full isolated non-print E2E / recovery | Later bounded check against this exact revision; reuse existing contracts and original IDs; any new fixture/mutation needs fresh isolated export and before→after CSV; never repeat one-shot old Prepare/repair blindly |
| Undo and installation packet | Original W2 UNDO/source backups retained; assemble only local/test instructions; real schema/source reconciliation and production release remain a separate scope |
| PDF page/content and physical Print/Reprint | **DEFERRED — ยังไม่ได้ทดสอบ; NOT PASS**, owner decision2026-10-06. Keep visible through W3; do not silently close or retry browser setup while doing independent work |
| Production / numbered deployment / LAB | Excluded; owner print deferral is not production approval |

ONE next step: local synthetic legacy CLIENT migration dry-run and same-ID/revision preservation check, with no live-store change. No runtime edit is needed to start; use existing W2 schema helpers and test harness. Implement only a reproduced defect, then affected tests and focused review. Do not add another renderer, CRM table, automation, router or agent. Native PDF/printer evidence stays separate and untested until actual output can be inspected.
''')
write(p/'CONTINUE.md',f'''# Continue after owner print deferral

จัดทำ: {stamp} · Session47 · `{rev}`

Read STATE first, then READINESS.md here. Owner explicitly deferred PDF/physical Print-Reprint as **ยังไม่ได้ทดสอบ, not PASS**; do not spend the next work phase repeating browser setup/print failures. W2 implementation/retry/preview is accepted as dated local/test evidence; full print acceptance remains open.

NEXT ONE step: local synthetic legacy CLIENT six-column migration dry-run with original A:F preservation, stable IDs/revisions and same-ID retry. Reuse original candidate/harness; one writer, local/test only. Real shop, production deployment, real CLIENT migration, P0/P1 restart, LAB and new agents remain excluded. The recorded old Google requests are DONE; no old Prepare/repair/sale should be repeated. Other independent local/test release-readiness checks can follow, retaining the print item as untested.

If printing is resumed later, exact saved-order instructions/evidence/recovery remain in ../W2-20261005-01/CONTINUE.md and UNDO.md; environment attempts in ../W2-20261006-01/ are historical. Nothing in the deferral proves PDF/physical paper size/content or grants a release waiver.
''')

plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
t=plan.read_text(encoding='utf-8')
t=t.replace('**2 · W2 — implementation/retry/preview PASS; PDF/physical print OPEN**','**2 · W2 — implementation/retry/preview PASS; PDF/physical print DEFERRED — ยังไม่ได้ทดสอบ**',1)
t=t.replace('PDF/เครื่องพิมพ์จริง OPEN; Session46 Chrome tool unavailable/native URL guard; checkpoint W2-20261006-01/CONTINUE.md','Owner2026-10-06 defer PDF/พิมพ์จริง: ยังไม่ได้ทดสอบ, ไม่ใช่ PASS; ทำ local/test readiness ต่อได้; W2-DEFER-20261006-01/READINESS.md',1)
t=t.replace('**3 · W3 — TODO**','**3 · W3 — local/test preparation NEXT; production TODO**',1)
t=re.sub(r'(?m)^\*\*Next ONE step:\*\*.*$', '**Next ONE step:** local synthetic legacy CLIENT migration dry-run / preservation checks in `04 Design Tools/logs/W2-DEFER-20261006-01/READINESS.md`; PDF/physical Print-Reprint is owner-deferred and explicitly untested. Production release remains separate.',t,count=1)
write(plan,t.rstrip()+'\n\n'+short+'\n')

for f in ['00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md']:
    append(f,short)
append('CLAUDE.md','''## Owner-deferred verification (added 2026-10-06)

An explicit owner deferral changes scheduling, not evidence. Mark deferred PDF/physical Print-Reprint as untested, never PASS or fully accepted. Continue independent authorized local/test work and retain the gap in STATE/PLAN/release checklist; do not repeatedly block that work on printer/browser setup. Keep money, stock, access and recovery validation intact. Deferral alone does not authorize production, migration of real CLIENT data or a release waiver.''')

state=root/'00 Docs/STATE.md'
t=state.read_text(encoding='utf-8')
t=re.sub(r'(?m)^จัดทำ: .*$',f'จัดทำ: {stamp} — Stream B Session47 owner-deferred untested print; independent local/test readiness next; other streams retain prior snapshots.',t,count=1)
t=t.replace('W1 CLOSED; W2 acceptance OPEN print gate','W1 CLOSED; W2 print DEFERRED / ยังไม่ได้ทดสอบ',1)
t=re.sub(r'(?m)^- Status: Session46.*$', '- Status: Session47 owner deferred PDF/physical Print-Reprint: ยังไม่ได้ทดสอบ, not PASS; full print acceptance remains open. Dated W2 implementation/retry/preview/replay PASS retained. Independent local/test work may proceed.',t,count=1)
t=re.sub(r'(?m)^- Next ONE step:.*$', '- Next ONE step: local synthetic legacy CLIENT migration dry-run / A:F and stable-ID/revision/retry preservation, per 04 Design Tools/logs/W2-DEFER-20261006-01/READINESS.md. No real migration/deploy. Do not retry deferred print setup now.',t,count=1)
t=re.sub(r'(?m)^- Current HANDOFF_2026-10-06.md Session46.*$', '- Current HANDOFF_2026-10-06.md Session47; Session46 archived to _archive/handoffs_old/HANDOFF_2026-10-06_Session46.md. Owner deferral/impact/readiness: 04 Design Tools/logs/W2-DEFER-20261006-01/. Original v39 evidence and environment attempts preserved.',t,count=1)
t=t.replace('Session41/42/43/44/45 handoffs are archived; Session46 is current.','Session41/42/43/44/45/46 handoffs are archived; Session47 is current.')
assert len(t.splitlines())<=80
write(state,t)
write(root/'00 Docs/HANDOFF_2026-10-06.md',f'''# HANDOFF — Session47 / Stream B

จัดทำ: {stamp} · §§2/5/5.2.1/6/9 · one writer

1. **Done:** Owner print deferral recorded explicitly as ยังไม่ได้ทดสอบ / DEFERRED, not PASS; impact and independent local/test readiness packet prepared. Nine candidate hashes/twelve recorded test-source files freshly match; no runtime/data/service change or new E2E execution.
2. **State:** `{rev}` unchanged; W2 implementation/retry/preview remains dated PASS; PDF/physical Print-Reprint acceptance still open. Source/evidence/undo retained. Current packet W2-DEFER-20261006-01/result.md, READINESS.md, CONTINUE.md, changes.csv.
3. **Closed decision:** Owner chose to skip print testing for now and continue independent local/test work; no need to ask again or repeat browser setup. This is scheduling deferral, not acceptance/release approval. Stock/money/access/retry checks remain mandatory.
4. **Next ONE step:** Local synthetic legacy CLIENT A:F migration dry-run with stable ID/revision/retry and before→after preservation. Real migration/production/numbered deploy/P0/P1/LAB/new agents excluded.
5. **Risks/recovery:** PDF page size, clipping/pagination, Thai fonts/scaling/driver and physical output unverified; later renderer/printer fixes may be needed. Reprint remains read-only by existing tests, but physical acceptance not claimed. Original W2 UNDO.md stays authoritative; Session46 handoff archived and active docs read back. Other stream snapshots unchanged.
''')

decision=root/'04 Design Tools/logs/decisions_2026-10-06.csv'
original=decision.read_text(encoding='utf-8-sig')
newrows=[['2026-10-06','W2-DEFER-20261006-01','Owner print-test deferral','CLOSED','Skip PDF/physical Print-Reprint now; explicitly untested/DEFERRED not PASS; independent local/test work can continue','User request + PLAN §0 + W2-DEFER-20261006-01/result.md'],['2026-10-06','W2-DEFER-20261006-01','Print acceptance after scheduling deferral','OPEN','Actual PDF/physical output remains untested; deferral is not production/release approval','READINESS.md + CONTINUE.md']]
with decision.open('a',encoding='utf-8',newline='') as f: csv.writer(f,quoting=csv.QUOTE_ALL).writerows(newrows)
assert decision.read_text(encoding='utf-8-sig').startswith(original)
event('DECISION-APPEND','Prior decisions preserved','Owner deferral CLOSED / print acceptance OPEN','PASS readback')
verification={'result':'PASS','verifiedAt':stamp,'revision':rev,'candidateFilesUnchanged':9,'recordedSourceFilesUnchanged':12,'stateLines':len(t.splitlines()),'ownerDeferralRecorded':True,'pdfPhysicalPrint':'DEFERRED_UNTESTED_NOT_PASS','readinessPacketPrepared':True,'migrationDryRunExecuted':False,'newRuntimeOrBusinessMutation':False,'sessionClose':['CSV','decisions','plan','STATE','HANDOFF','related docs','dated rule','readback']}
write(p/'verification.json',json.dumps(verification,indent=2)+'\n')
event('ARTIFACT', 'defer-print.py created from absent',hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'Local docs builder; no runtime changes')
print(json.dumps(verification))
