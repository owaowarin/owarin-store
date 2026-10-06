# One-time Session50: record human acceptance; no service or runtime changes.
import csv,hashlib,json,re
from pathlib import Path
from datetime import datetime
p=Path(__file__).parent;root=p.parents[2];stamp=datetime.now().astimezone().isoformat(timespec='seconds')
state=root/'00 Docs/STATE.md';original=state.read_text(encoding='utf-8');assert 'Session49' in original and 'Session50' not in original
base=p.parent/'W2-20261005-01';revision=json.loads((base/'revision.json').read_text());rev=revision['revision']
for name,h in revision['hashes'].items():
 content=(base/'candidate'/name).read_text(encoding='utf-8').replace('\r\n','\n')
 assert hashlib.sha256(content.encode()).hexdigest().upper()==h,name
def log(action,before,after,result):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerow([stamp,p.name,action,before,after,result])
def write(f,t):
 before=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else 'ABSENT';log('WRITE-DRYRUN',str(f)+' '+before,str(f),'Docs only; eight backups verified')
 f.write_text(t,encoding='utf-8',newline='\n');assert f.read_text(encoding='utf-8')==t
 log('WRITE-READBACK',before,hashlib.sha256(f.read_bytes()).hexdigest(),str(f)+' PASS')
def append(rel,t):
 f=root/rel;write(f,f.read_text(encoding='utf-8').rstrip()+'\n\n'+t+'\n')
nextone='No remaining work in the authorized local/test scope. Production release and real CLIENT migration are separate and await explicit scoped authorization; do not deploy automatically.'
evidence={'result':'PASS','basis':'OWNER_CONFIRMED','ownerMessage':'ผ่านหมดแล้ว','recordedAt':stamp,'testExecutionTime':None,'context':'Reply to Print/PDF, physical Print/Reprint, label content/private-field exclusion and no additional business-write checklist for web/Sheets test entry points','candidateRevision':rev,'agentInspectedPdf':False,'agentInspectedPhysicalOutput':False,'pdfArtifactProvided':False,'printerDriverPaperDetails':'Not supplied','freshGoogleReadOrExportThisPhase':False,'productionReleaseAuthorized':False}
write(p/'owner-confirmation.json',json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
summary=f'''## Session50 — owner confirms Print/Reprint PASS; local/test CLOSED

จัดทำ: {stamp} · Stream B §§2/5/9 · one writer · `{rev}`.

Owner replied **“ผ่านหมดแล้ว”** to the Print/PDF/physical Print-Reprint checklist, including correct saved recipient/leading zeros, private fields/prices excluded, 100×150mm/page/content/CAUTION layout, identical reprint and no new SALES/stock/client change. Record **PASS — owner-confirmed**, replacing the active print deferral and closing W2/W3 acceptance in the authorized local/test scope. This is a human-reported outcome, not a new agent-observed native print/PDF run. No PDF/photo/printer settings or exact execution time were supplied; no artifact inspection, fresh Google read/export or current data counts are claimed.

Earlier Session45/46 print-control limitation and Session47–49 DEFERRED evidence remain dated history. Session49 actual UI/native migration/retry/export/source readback evidence remains unchanged. Nine local candidate hashes freshly match the exact revision; no runtime pair/source/manifest/deployment/Google data/permission changes, and no new agents/chats. Production/real CLIENT migration/numbered deployment/P0/P1/LAB remains excluded. Evidence: `04 Design Tools/logs/W2-PRINT-20261006-01/owner-confirmation.json`, result/implementation/CONTINUE/changes.csv. Next ONE: {nextone}
'''
write(p/'result.md','# Print/Reprint acceptance — Session50\n\n'+summary+'\n')
write(p/'implementation.md',f'''# Acceptance / provenance / session close — Session50

{stamp} · docs only · one writer

User “ผ่านหมดแล้ว” is authoritative human completion evidence for the remaining Print/Reprint checklist. Recorded PASS/OWNER_CONFIRMED without inventing a PDF, physical output, printer settings, execution time, fresh export, transaction count or agent observation. No defect/retry/fix was needed in this phase. Do not rerun passed transactions or old fixture/repair helpers to manufacture print evidence. Original W2 UNDO/IDs/events and every prior dated packet retained.

Read STATE first, project AGENTS/master §§2/5/9, current plan/handoff and relevant CLAUDE close/deferral rules. Reference-check active handoff, verify eight backups, archive Session49 by bounded native Move-Item, recreate one-page Session50 handoff, update plan/status/decisions/related README/handbook/log and conditional owner-deferral guidance. Freshly compare nine local candidate SHA256 hashes; runtime v39 unchanged, so version pair/production tests need no bump/rerun. Read back every written file and preserve decision/history prefixes. No Google/browser/physical printer operation this phase.
''')
write(p/'CONTINUE.md',f'''# Continue after Session50

{stamp} · `{rev}` · one writer

W1/W2 and W3 local/test acceptance CLOSED. Owner confirmed all Print/PDF/physical Print-Reprint checklist items with “ผ่านหมดแล้ว”; provenance is OWNER_CONFIRMED, not agent-observed output. Session49 UI/native migration/retry/export evidence remains dated and unchanged. Do not treat old DEFERRED logs as current status, reopen passed work without a reproduced defect or claim a new inspected artifact.

Next ONE: {nextone}

Before any future live claim/action, fresh source/export and scope/backup/readback rules apply. No production/real CLIENT migration/numbered deploy/P0/P1/LAB authorization follows from this test result.
''')
plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md';t=plan.read_text(encoding='utf-8')
t=re.sub(r'(?m)^\| \*\*2 · W2.*$', '| **2 · W2 CLOSED local/test; Print/Reprint PASS — owner-confirmed** | **ค้นหา/บันทึกลูกค้า → recipient → Label → Print/Reprint** จากเว็บและ Sheets | Exact candidate v39; stable CLIENT ID/revision, committed recipient, canonical renderer/CAUTION | Previous local/native/retry evidence retained; owner2026-10-06 “ผ่านหมดแล้ว” closes print checklist. W2-PRINT-20261006-01/owner-confirmation.json; no new agent PDF/physical inspection claimed |', t,count=1)
t=re.sub(r'(?m)^\| \*\*3 · W3.*$', '| **3 · W3 CLOSED local/test acceptance; production TODO** | **Workflow ผ่านเกณฑ์ในโปรเจกต์ทดสอบ พร้อม undo/คู่มือ** | Session49 fresh two-channel UI/native6migration/failure-retry/replay/export PASS; Session50 print PASS owner-confirmed | Authorized local/test scope complete; production release/real CLIENT migration separate, not started or authorized by test completion |',t,count=1)
t=re.sub(r'(?m)^\*\*Next ONE step:\*\*.*$',f'**Next ONE step:** {nextone} See `04 Design Tools/logs/W2-PRINT-20261006-01/CONTINUE.md`.',t,count=1)
write(plan,t.rstrip()+'\n\n'+summary+'\n')
for rel in ['00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md']:append(rel,summary)
rules=root/'CLAUDE.md';t=rules.read_text(encoding='utf-8')
old='An explicit owner deferral changes scheduling, not evidence. Mark deferred PDF/physical Print-Reprint as untested, never PASS or fully accepted. Continue independent authorized local/test work and retain the gap in STATE/PLAN/release checklist; do not repeatedly block that work on printer/browser setup. Keep money, stock, access and recovery validation intact. Deferral alone does not authorize production, migration of real CLIENT data or a release waiver.'
new='An explicit owner deferral changes scheduling, not evidence. While deferred, mark PDF/physical Print-Reprint as untested, never PASS or fully accepted. Continue independent authorized local/test work and retain the gap in STATE/PLAN/release checklist; do not repeatedly block that work on printer/browser setup. When the owner subsequently reports completed tests, record PASS — owner-confirmed with the exact message and checklist context, and close the active deferral; never recast human confirmation as agent-inspected PDF/physical output or invent printer settings/artifacts. Keep prior deferred logs as dated history. Keep money, stock, access and recovery validation intact. Neither deferral nor completed test acceptance authorizes production or migration of real CLIENT data. Updated 2026-10-06.'
assert old in t;write(rules,t.replace(old,new,1))
t=original;t=re.sub(r'(?m)^จัดทำ: .*$',f'จัดทำ: {stamp} — Stream B Session50 local/test CLOSED; Print/Reprint PASS owner-confirmed; other streams retain prior snapshots.',t,count=1)
t=t.replace('### 1. Add / Cart / Orders / Label (Stream B) — W1 CLOSED; local/test UI + migration PASS; print DEFERRED','### 1. Add / Cart / Orders / Label (Stream B) — W1/W2 + local/test acceptance CLOSED',1)
t=re.sub(r'(?m)^- Status: Session49.*$', '- Status: Session50 closes remaining Print/PDF/physical Print-Reprint gate as PASS — owner-confirmed (“ผ่านหมดแล้ว”). Session49 agent-observed UI/native migration/retry/replay evidence retained; all authorized local/test work CLOSED.',t,count=1)
t=re.sub(r'(?m)^- Next ONE step:.*$',f'- Next ONE step: {nextone} See 04 Design Tools/logs/W2-PRINT-20261006-01/CONTINUE.md.',t,count=1)
t=t.replace('- Exact revision:','- Session49 verified source revision:',1).replace('candidate9hashes unchanged; fresh saved13-file Google readback','candidate9local hashes freshly match Session50; Session49 saved13-file Google readback',1)
t=t.replace('- Fresh UI:','- Session49 UI evidence:',1).replace('- Existing CLIENT stable-ID selection','- Session49 CLIENT evidence: stable-ID selection',1)
t=re.sub(r'(?m)^- PDF/physical Print-Reprint:.*$', '- Print/PDF/physical Print-Reprint: PASS — owner-confirmed2026-10-06 “ผ่านหมดแล้ว” in response to web/Sheets checklist. W2-PRINT-20261006-01/owner-confirmation.json. No supplied PDF/photo/printer details or agent output inspection; no fresh Google/data count claim this phase. Prior deferral superseded, history retained.',t,count=1)
t=t.replace('- Current HANDOFF_2026-10-06.md Session49; Session48 archived in _archive/handoffs_old/. All prior W1/W2 evidence retained.','- Current HANDOFF_2026-10-06.md Session50; Session49 archived in _archive/handoffs_old/. Owner-acceptance packet W2-PRINT-20261006-01; all prior W1/W2 evidence retained.',1)
t=t.replace('Session41/42/43/44/45/46/47/48 handoffs are archived; Session49 is current.','Session41/42/43/44/45/46/47/48/49 handoffs are archived; Session50 is current.')
assert len(t.splitlines())<=80 and 'print DEFERRED' not in t;write(state,t)
write(root/'00 Docs/HANDOFF_2026-10-06.md',f'''# HANDOFF — Session50 / Stream B

จัดทำ: {stamp} · §§2/5/9 · one writer

1. **Done/decision:** Owner “ผ่านหมดแล้ว” closes Print/PDF/physical Print-Reprint checklist as PASS — owner-confirmed; W1/W2 and W3 authorized local/test acceptance CLOSED. Prior Session49 UI/native migration/retry/replay evidence retained.
2. **Files touched:** `{root}` STATE/PLAN/HANDOFF, implementation/handbook/README/CLAUDE/decisions, and `{p}` owner-confirmation/result/implementation/CONTINUE/verification/CSV. Before→after paths/hashes in changes.csv; eight backups in before/. Session49 handoff archived.
3. **Evidence/data:** Human confirmation in this chat, recorded {stamp}; exact test time/PDF/photo/printer details not supplied. No Google read/write/export or agent output inspection this phase. Nine local hashes match exact `{rev}`; original runtime/source/version pair unchanged.
4. **Not done:** Production release/real CLIENT migration/numbered deployments/P0/P1/LAB remain outside scope. No new model switch/agents/chats. Preserve all dated test/deferral logs and original UNDO/IDs/events.
5. **Next ONE:** {nextone}
''')
dec=root/'04 Design Tools/logs/decisions_2026-10-06.csv';before=dec.read_bytes();log('DECISIONS-DRYRUN','Old decision prefix retained','Append owner-confirmed print PASS','Prior DEFERRED row stays historical')
with dec.open('a',encoding='utf-8',newline='') as f:csv.writer(f,quoting=csv.QUOTE_ALL).writerow(['2026-10-06',p.name,'Print/PDF/physical Print-Reprint checklist','CLOSED','PASS — owner-confirmed; local/test acceptance complete; no production authorization or agent artifact inspection','Owner: ผ่านหมดแล้ว; owner-confirmation.json'])
assert dec.read_bytes().startswith(before);log('DECISIONS-READBACK','Prior bytes retained','CLOSED row appended','PASS')
result={'result':'PASS','session':'Session50','scope':'Local/test CLOSED','printBasis':'OWNER_CONFIRMED','agentNativePrintInspection':False,'localCandidateHashes':len(revision['hashes']),'runtimeChanged':False,'remoteAction':False,'stateLines':len(t.splitlines()),'closeChecklist':['CSV','decisions','plan','STATE','one-page HANDOFF','related docs/README','conditional owner-confirmation rule','readback']}
write(p/'verification.json',json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for f in p.iterdir():
 if f.is_file() and f.name!='changes.csv':log('ARTIFACT',f.name,str(f),str(f.stat().st_size)+' bytes SHA256 '+hashlib.sha256(f.read_bytes()).hexdigest())
print(json.dumps(result,ensure_ascii=False))
