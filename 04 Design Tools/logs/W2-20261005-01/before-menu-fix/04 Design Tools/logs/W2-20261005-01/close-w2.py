import csv, difflib, hashlib, json, shutil
from datetime import datetime
from pathlib import Path

p=Path(__file__).parent
root=p.parents[2]
stamp=datetime.now().astimezone().isoformat(timespec='seconds')
date=stamp[:10]
assert date=='2026-10-06', ('Confirm machine date',stamp)
rev=json.loads((p/'revision.json').read_text())['revision']
a=json.loads((p/'google-assertions.json').read_text())
n=json.loads((p/'google-native.json').read_text())
assert a['result']=='PASS' and a['sameIdReplays']==6
assert n['replay']['result']=='PASS'
hashfile=lambda f: hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else 'ABSENT'
bc=p/'before-close'; bc.mkdir(exist_ok=True)
log=p/'changes.csv'
if not (bc/'changes.csv').exists(): shutil.copy2(log,bc/'changes.csv')
with log.open(newline='',encoding='utf-8-sig') as f: history=list(csv.reader(f))
assert all(len(r)==6 for r in history)
records=[]
def record(action,before,after,result,change='W2-20261005-01'):
    records.append([stamp,change,action,str(before),str(after),result])
def write(f,text):
    f=Path(f)
    assert f.is_relative_to(root)
    old=hashfile(f)
    record('WRITE-DRYRUN',str(f)+' '+old,'scoped overwrite/new file','Backup exists for overwrite')
    if f.exists():
        backup=bc/f.relative_to(root)
        backup.parent.mkdir(parents=True,exist_ok=True)
        if not backup.exists(): shutil.copy2(f,backup)
    f.parent.mkdir(parents=True,exist_ok=True)
    f.write_text(text,encoding='utf-8',newline='\n')
    assert f.read_text(encoding='utf-8')==text
    record('WRITE-READBACK',str(f)+' '+old,str(f)+' '+hashfile(f),'PASS exact readback')
def append(f,text): write(f,f.read_text(encoding='utf-8').rstrip()+'\n\n'+text+'\n')

for action,before,after,result,change in [
 ('GOOGLE-SOURCE-SAVE','Fresh six-file v38 source backed up via UI clipboard','12 complete staged files saved/read back at google-source-readback/','PASS LF exact; unchanged manifest/W1Qa; attempts01–04 retained','W2-SOURCE'),
 ('GOOGLE-DATA-PREPARE','google-before.xlsx; CLIENT absent; original prefixes saved','Test CLIENT eight headers; fixed fixture MAG1351–1353; two Pending orders','2026-10-05 actual QA Prepare once; no real data or numbered deployment','W2-PREPARE'),
 ('CRM-AFTER-EFFECT','Original04 confirm and child CRM intent','SOLD04 + recipient saved; first client write failed after effect','Failure observed in UI/native proof; no repeated confirm','W2-F05'),
 ('CRM-BOUNDED-REPAIR','google-coercion.xlsx and native values/formulas','Original CRM textRepair snapshot + escaped literals; same-ID UI retry DONE attempt3','PASS native string phone/postal; no second SALE; prior journal retained','W2-F05'),
 ('SHEETS-LABEL-SAVE','SOLD04 revision2; original buyer selected; update unchecked','Same order revision3 label-only via existing Labels menu dialog','PASS saved snapshot; original SALES/stock untouched','W2-SHEETS'),
 ('GOOGLE-NEW-CLIENT-LABEL','SOLD05 Label later revision2 MISSING','Original labels.save + deterministic CRM child; revision3 READY, second CLIENT','PASS native new literal write, phone0890000003/postal00124; SALES count remains2','W2-LABEL'),
 ('ORDER-UI-FIX','Stale Orders result could restore old Pending cards','Shared response epoch + clear Loading state; before-orders-ui-race.html backup','PASS runnable stale result/error test and latest native Sold filter','W2-F08'),
 ('VERIFIER-FIX','Assumed W1 revision .hashes; actual format .files','Read verified .files[file,sha256LF]','PASS nine candidate files/12 saved sources/W1 frozen','W2-F09'),
 ('EXPORT-VERIFIER-FIX','Incorrect MAG used-row delta +3 assumption; fixture begins1351','Preserve old prefix; exactly three nonempty appended rows at1351–1353','PASS 47 blank capacity rows retained; no native data correction','W2-F10'),
 ('EXPORT-METADATA-FIX','Verifier output Action/Attempt mapped to wrong columns','Use actual journal Action index4 / Attempt index3','PASS corrected metadata; invariant checks unchanged','W2-F11'),
 ('NATIVE-REPLAY','Final native proof before replay','Six original confirm/CLIENT/label IDs all replayed; proof exactly unchanged','PASS journal1295 data rows/hash b146cc23d1c921931e08a2167dcf70ceea9bffc9420773cceb083a78cb499d1b; SALES2/CLIENT2','W2-REPLAY'),
 ('NATIVE-REPRINT-READ','Reopened SOLD05 original buyer/recipient; update unchecked','Preview / Print / Reprint dispatch; Back; fresh Read native proof','PASS exact entire proof unchanged; journal1295/hash retained SALES2/CLIENT2; popup/PDF/physical output unexposed','W2-REPRINT'),
 ('EXPORT','Fresh isolated Sheet UI export to temp','google-final.xlsx '+hashfile(p/'google-final.xlsx'),'PASS '+str(a['xlsxBytes'])+' bytes; every original cell/formula and1209-row journal prefix preserved','W2-EXPORT'),
 ('PRINT-LIMIT','Native Sheets100x150 ready preview; Print/Save as PDF invoked','Print input timed out; invisible print surface; temporary Sheet tab closed','PDF/physical print OPEN; no success claim; screenshot google-print.png','W2-F07'),
 ('SCREENSHOT-NORMALIZE','Original screenshot JPEG bytes retained in before-close/','Real PNG local-ui/google-ui/google-print with verified pixel dimensions','PASS PNG magic/decoder; image-verification.json','W2-IMAGES'),
]: record(action,before,after,result,change)

detail=f'''# W2 — CLIENT + Label result

จัดทำ: {stamp} · Stream B · Session45 · one writer · local candidate / exact isolated test only

**Implementation, native CLIENT failure/retry, label preview and original-ID replay PASS. W2 acceptance remains OPEN for exported label PDF and physical Print/Reprint.**

Exact revision: `{rev}`. Nine candidate files, twelve complete isolated source readbacks; manifest and frozen W1 revision unchanged (`verification.json`). No production /exec deployment, real CLIENT migration, P0/P1 restart or Back House LAB action.

CLIENT search/selection retains stable ID and revision; existing selection defaults to order-only. Explicit new/update saves are separate from the recipient snapshot committed on ORDERS. A client save failure leaves the sale and recipient saved; Retry client save resumes its original intent, never sells again. Completing a Label later order only updates its label; reprint reads the saved recipient. Printable payload excludes Facebook, internal note and prices.

| Evidence | Verified result |
|---|---|
| `w2-results.json` | 14 targeted groups: after-effect/PREPARED/DONE/partial CLIENT failures, same-ID recovery, lost response, original payload, revisions/access/input, old recipient immutability and no extra sale |
| `label-results.json`, `stage.cjs` | 6 renderer checks; 15 expanded scripts; child print syntax; canonical standalone parity |
| `orders-ui.test.cjs` | Latest Orders response wins; stale success/error cannot restore actionable cards |
| `google-native.json` | Actual UI failure → explicit bounded original-intent text repair → original retry; native CLIENT strings preserve zeros and formula prefixes; 6 original-ID replays unchanged |
| `google-assertions.json`, `google-final.xlsx` | {a['xlsxBytes']} bytes; all original tabs/cells/formulas and {a['oldJournalPrefixRows']} old journal rows preserved; +2 orders/+2 lines/+2 SALES/+87 events; 2 synthetic clients; all latest requests DONE; 111 unique SALES line IDs |
| `google-print.png`, `google-ui.png` | Actual Sheets dialog and web label READY100×150mm; Thai name/address, long title, zero-prefixed postal code and existing CAUTION asset visible |

Native CLIENT RichText coercion was a real failure that the earlier mock missed. `google-coercion.xlsx` and `beforeRetry` preserve it; eight empty native formulas/string phone/postal after bounded repair and a fresh second native client verify the corrected escaped writer. No old journal event/hash was rewritten. Native preview success and dispatch of Print do not establish PDF/printer success. The IAB print surface is inaccessible and its popup is not exposed as a managed tab; that gate needs the normal browser/printer using `CONTINUE.md`.

Focused review: `REVIEW.md`; recovery: `UNDO.md`; attempts: `implementation.md`/`changes.csv`; saved source attempts remain retained. Machine date crossed midnight: data/source actions are dated2026-10-05; replay/export/session close2026-10-06. Do not repeat fixtures, repair or completed sale requests. W3 release/migration remains a separate authorized task.
'''
write(p/'result.md',detail)
write(p/'REVIEW.md',f'''# W2 focused changed-flow review

จัดทำ: {stamp} · exact `{rev}`

Current-writer focused review PASS for the implemented local/test flow. Actual model variant/effort is not exposed; no Astra-specific switch or sign-off is claimed. Review reads W2Clients, all API mutation/recovery routes, W1 attachment/report changes, shared form/dialog/search, Orders load guard and generated label document, against frozen v38 and its backups; this is not another broad W1 audit.

No additional reproducible money/stock/access/append-only journal blocker found after the recorded fixes. CLIENT and order writes use the existing owner check/technical gate/shared lock, immutable original payload, allocated ID/row and exact readback. DONE replay checks both hash and exact payload. A client failure after commit has its own deterministic child; original parent recovery preserves canonical SOLD and recipient. Label-only/read/print paths do not invoke SALES or inventory writes. Revision conflict and duplicate identity fail closed; default selection does not silently update CLIENT. Renderer allowlist, escaping, font/image readiness and overflow guard precede print.

Validation: targeted14 groups, renderer6 checks, expanded15 scripts and Orders stale-response check PASS; twelve complete saved sources match; six native same-ID replays preserve the entire proof. Fresh export preserves all old cells/formulas/events and old Pending08. Actual second CLIENT write confirms the native escaped string fix.

OPEN acceptance gate: label PDF page size/content and physical Print/Reprint. IAB exposes no usable native print surface, and the generated popup is not listed as a managed tab. Actual Sheets/web inline previews are READY; native Print dispatch is attempted, not accepted print evidence. No production approval or migration claim. Native owner direct edits and external marketplace consistency retain the W1 limits.
''')
write(p/'UNDO.md',f'''# W2 recovery / undo — isolated only

จัดทำ: {stamp} · `{rev}`

**Do not overwrite the current workbook with a prior export: later history would be lost.** No automatic data rollback is authorized. Keep ORDERS/SALES/CLIENT IDs, allocated rows, recipient snapshots and append-only request events. Export the current isolated Sheet before any corrective write and compare exact values/formulas against original durable intent; unknown changes require reconciliation.

All W2 requests are DONE in final evidence. Do not repeat Prepare W2 fixture, Inject CRM after-effect failure, Repair observed synthetic text coercion or the old F05 repair. The observed first CLIENT correction has already completed under CRM `crm-e25e645597759a0b94bb7618f355e489633d7ac3afcf0556701ab91cbe7b698c`, retaining its textRepair before/formulas/after. Its parent confirm is `w1-1791211286953-0rsaw0nbbhm9`. If a future response is lost, keep its original Request ID and use Check / retry request or Recover original request; do not Confirm sold with a new ID. CLIENT failure after sale uses Retry client save, not a second sale. Existing DONE replays only return the canonical result.

Source rollback is different from data undo: fresh six-file pre-W2 source is in `google-source-before/`, v38 candidate backup under `candidate/backup/v38/`, standalone prior file under `before/04 Design Tools/`. Switching back to v38 hides W2 handling/CLIENT recovery and is inappropriate while any W2 request is unfinished. Keep all new data/events even if restoring source; compare every saved source to its exact backup through the editor. Never install QA helpers or candidate into production, and never restore source just to test print. Source attempts01–04 are evidence, not rollback targets.

No production/LAB undo is needed: neither was changed. `google-before.xlsx` and `google-coercion.xlsx` are private recovery evidence only. Current next step is the print gate in `CONTINUE.md`.
''')
continuation=f'''# Continue W2 — PDF / physical Print/Reprint gate only

จัดทำ: {stamp} · `{rev}` · Session45

Read STATE first, then this file. W1 CLOSED/frozen; W2 implementation/retry/preview/replay/source/export PASS. Do not create new fixtures or sell again. One writer; local candidate and exact isolated project only. No production, numbered deployment, real CLIENT migration, LAB or W3.

1. In a normal browser that exposes its print dialog, open the isolated [test web app](https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev). Click ORDERS → filter Sold → OWA-20261005-04 → Preview / Print label. Wait for saved buyer/recipient to load; do not click Save label or Confirm sold.
2. Click Preview / Print / Reprint → in the label window wait for `Ready · 100 × 150 mm` → Print / Save as PDF. Set Destination=Save as PDF, Paper=100×150mm/custom100×150mm when available, Scale=100%, Margins=None, Headers and footers=off; save one label PDF to this package. If custom paper is unavailable, record the actual PDF page dimensions; do not claim100×150 from CSS alone. Check one page, Thai text/zeros/Contents/CAUTION and no internal note/Facebook/prices/clipping.
3. In the isolated [Sheet](https://docs.google.com/spreadsheets/d/13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM/edit), select ORDERS A18:N19 → OWARIN STORE → Labels → Open Label Tool. Click Preview / Print selection for the two saved labels. Check two pages; record chosen printer/driver/paper settings. Print one synthetic label and reprint the same saved order; inspect the physical100×150mm paper and CAUTION/footer placement. No CLIENT/SALE save is required.
4. After print/reprint, click Read native proof only. Compare with `google-native.json` final proof: SALES2, CLIENT2, revisions3/3, journal1295 data rows/hash b146cc23d1c921931e08a2167dcf70ceea9bffc9420773cceb083a78cb499d1b. Export fresh XLSX and preserve original cells/events. Record print/PDF evidence and attempts in changes.csv; then update acceptance/STATE/HANDOFF. Never use Prepare/repair/replay buttons as a substitute for print evidence.

The IAB attempt opened the actual Sheets dialog and READY preview, but Print input timed out and the native surface was invisible; closing the temporary Sheet tab restored callbacks. A generated popup is not exposed as a managed tab. This is an environment limitation, not a pending transaction or an authorization request. Physical printer access is necessary to close that specific gate. `result.md` and `UNDO.md` contain the completed flow/recovery; no source change is planned.
'''
write(p/'CONTINUE.md',continuation)
append(p/'implementation.md',f'''## Session45 close — {stamp}

8. Orders UI race: fast status changes allowed a prior result/error to restore old actionable cards. One shared load epoch clears the board and discards stale results/errors; `before-orders-ui-race.html` preserves the prior source. Runnable guard check and final native Pending→Sold→Refresh loaded only SOLD cards.
9. Hash verifier assumed a nonexistent W1 `.hashes` field; corrected to its recorded `.files[file,sha256LF]` schema. Export verifier initially counted 47 preallocated blank MAG capacity rows as new records; corrected to exact fixture1351–1353 and three nonempty new rows, while preserving every old cell. Action/Attempt output indices corrected from actual journal headers. These are verification harness errors, not new data fixes.

Second order05 was sold once with Label later, then completed with an explicit second synthetic client. Native apostrophe-escaped writer preserved0890000003/00124 and +/= literal prefixes without formulas. Orders04/05 are SOLD/READY revisions3; native SALES2/CLIENT2. Six original DONE confirm/CLIENT/label requests replayed with entire proof unchanged, journal1295 data rows. Final fresh export {a['xlsxBytes']}bytes preserves all original cells/formulas, old Pending08 and1209-row old journal prefix; adds2orders/2lines/2SALES/87events, all latest requests DONE. `verify-google-w2.py` and google-assertions.json retain reproducible checks.

Nine-file exact revision `{rev}`; twelve full saved sources/manifest/W1 frozen PASS. Focused changed-flow review PASS in current writer; exact model variant unavailable. Native print invocation and reprint popup dispatch do not prove PDF or physical print: W2 acceptance remains OPEN with one next step `CONTINUE.md`. Production/numbered deployments/LAB/W3 unchanged. Result/review/recovery and close docs read back in the same pass.
''')

plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
t=plan.read_text(encoding='utf-8')
old='| **2 · W2 — TODO** | **ค้นหา/บันทึกลูกค้า → Label → Print/Reprint** จากเว็บและ Sheets | CLIENT เดิม, recipient snapshot, renderer เดียวจาก Label Tool, CAUTION asset เดิม; ต่อ final review ของ W1 | QA-H/I/K/L + sale-no-repeat; Google dialog/PDF/print check; ปานกลางถึงสูง |'
assert old in t
t=t.replace(old,'| **2 · W2 — implementation/retry/preview PASS; PDF/physical print OPEN** | **ค้นหา/บันทึกลูกค้า → recipient → Label** จากเว็บและ Sheets; Print/Reprint gate ยังค้าง | Exact candidate v39; CLIENT ID/revision, committed snapshot, canonical renderer/CAUTION; current-writer focused review PASS | Package W2-20261005-01:14groups/6renderer checks/12source readbacks/6native replays; XLSX1,374,889bytes and PNG358,282bytes; ไม่มีขายซ้ำ; PDF/เครื่องพิมพ์จริงต้องตรวจตาม CONTINUE.md |')
oldnext='**Next ONE step:** await separate owner instruction for W2; no W1 work remains. W1 final review PASS at `04 Design Tools/logs/W1-20261005-02/REVIEW.md`; W3 production release is a separate gate.'
assert oldnext in t
t=t.replace(oldnext,'**Next ONE step:** complete the W2 label PDF / physical Print-Reprint gate in `04 Design Tools/logs/W2-20261005-01/CONTINUE.md`; W1 remains CLOSED/frozen and W3 production release stays separate.')
t+=f'\n\nSession45 ({stamp}): W2 local/test implementation and focused current-writer review PASS at `{rev}`; actual CLIENT failure/explicit bounded correction/original-ID retry no duplicate sale, web/Sheets READY preview and6same-ID replays unchanged. Final export preserves all old cells/formulas and1209old journal rows; +2orders/+2lines/+2SALES/+87events; 2synthetic CLIENTs. W2 acceptance OPEN for PDF/physical Print-Reprint because IAB print surface is inaccessible. Result/REVIEW/UNDO/CONTINUE and exact evidence in `04 Design Tools/logs/W2-20261005-01/`. Production/LAB/P0/P1/W3 untouched; no model-specific switch claimed.\n'
write(plan,t)

short=f'''## Session45 — W2 local/test, PDF/physical print acceptance OPEN

จัดทำ: {stamp} · `{rev}`. CLIENT search/save, committed recipient, actual CRM failure/retry without repeat sale, shared web/Sheets preview and six original-ID replays PASS; final XLSX{a['xlsxBytes']}bytes preserves old cells/formulas/history. Current-writer focused review PASS; exact model variant unavailable. Detailed attempts/results/recovery: `04 Design Tools/logs/W2-20261005-01/implementation.md`, result.md, REVIEW.md, UNDO.md and CONTINUE.md. Native PDF/printer gate OPEN; W1 frozen, production v31/numbered deployments/LAB/W3 unchanged.
'''
append(root/'00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md',short)
append(root/'00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md',f'''## Session45 — W2 customer and label in isolated test

จัดทำ: {stamp}. Candidate v39 is local/test only; the installed-shop v31 file table remains unchanged. W1 is CLOSED. W2 saves/searches/preview/retry passed; PDF/physical print still open.

In the isolated /dev: ORDERS → Pending → Confirm sold → Final review → Customer & Label. Type Name or Phone/other CLIENT field, then explicitly click the suggested buyer or choose with Arrow Down + Enter. Identity is the selected Client ID; same names are not merged. Existing selection defaults to order-only; check Update saved client details only to change saved CLIENT. Choose another / New client enables New client — save to CLIENT. Buyer fields Name, Phone, Address, Post Code are required for a new client; Facebook/Internal Note stay private. Use different recipient opens Recipient name/phone/address/postal code for this order; Delivery Note is printable. Save & confirm sold commits once. Label later skips it; later ORDERS → Sold → Complete label → Save label changes only the recipient/client selection.

If the screen says Sale saved; client save needs retry, click Retry client save once and wait for Client recovered. Keep the original Request ID on timeout; use Check / retry request or Recover original request instead of making a new sale. Saved order loading disables Save/Back until its data is read; a read error or pending CRM recovery prevents accidental new CLIENT save. Updating CLIENT later never changes old order recipient snapshots.

For a ready order: Preview / Print label → wait for saved order → Preview / Print / Reprint → label window Ready100×150mm → Print / Save as PDF. Reprint reads ORDERS and creates no sale. Sheets: select one or several ORDERS rows → OWARIN STORE → Labels → Open Label Tool; single selection opens it, multiple selection uses Preview / Print selection. Exact remaining PDF/paper/driver checks are in `04 Design Tools/logs/W2-20261005-01/CONTINUE.md`. IAB cannot expose native print; a preview/dispatch does not count as printed. Do not run Prepare W2 fixture/Inject/Repair again. W3 must dry-run the real CLIENT schema and IDs separately before an authorized release.
''')
table='\n'.join('| '+f+' | '+role+' |' for f,role in [
 ('Code_v39.gs + WebApp_v39.gs','Paired candidate backend/API/menu; prior v38 under candidate/backup/v38'),
 ('W1Orders.gs + W2Clients.gs','Existing order journal/guard plus CLIENT/snapshot/recovery'),
 ('Index.html','Existing back-office with Customer & Label/Orders controls'),
 ('LabelRenderer.html','Canonical renderer, synchronized into existing standalone Label Tool'),
 ('W2LabelUI.html + W2Suggest.html','Shared buyer/recipient form and stable-ID autocomplete'),
 ('LabelDialog.html','Existing Sheets menu selected-order/multiple-order dialog')])
append(root/'03 Apps Script/Web App/README.md',f'''## Session45 — active candidate v39; W2 print gate OPEN

จัดทำ: {stamp}. Candidate folder `04 Design Tools/logs/W2-20261005-01/candidate/`; exact `{rev}`. Production file table at the top remains v31; no /exec deployment or shop/LAB source was changed. Frozen W1 package/review remains acceptance history. The v38 candidate full source is backed up here and old v38 pair stubs point to v39.

| Candidate files (nine total) | Purpose |
|---|---|
{table}

Twelve complete isolated saved sources match staged bytes; W1Qa and appsscript manifest unchanged. `W2Qa.gs` and QA additions in test-runtime/Index are isolated-only helpers, excluded from the nine-file candidate and any release. No real CLIENT migration. Local/retry/native preview/original-ID replay PASS; PDF/physical Print/Reprint remains OPEN. Source/evidence/result/recovery/one next step are in the package's result.md, UNDO.md and CONTINUE.md; never install QA helpers or use earlier source attempts as a release. The existing standalone `04 Design Tools/OWARIN — LABEL TOOL.html` now shares the canonical renderer; its original backup is retained.
''')
append(root/'CLAUDE.md',f'''## CLIENT / label native verification lessons (added {date})

- Do not trust a mock or RichText API to preserve identifiers or literal formula prefixes. Native Sheets coerced zero-prefixed phone/postal code and evaluated an equal prefix. For CLIENT writes use escaped plain-text values and require exact typed value plus empty-formula readback, including after-effect retry. Retain observed before values/formulas and original durable intent; never silently repair an unknown row or rewrite old events.
- Apps Script HTML partials must be valid HTML. For shared JavaScript use a valid script wrapper with bounded include extraction. Source transfers must compare the complete saved bytes/LF hashes, not a truncated DOM read; test generated child print-document JavaScript as well as its outer template.
- Keep W2 browser recovery records to Request IDs, not customer contact payloads. A CLIENT failure after sale is a separate original-intent retry. Preserve SOLD and the committed recipient; never create a second sale to repair a customer record.
- Guard shared async Orders/search results with a request generation; clear old actionable cards while loading and discard stale successes/errors.
- READY preview and a print invocation do not prove exported PDF page size or physical output. Record the browser/driver limitation and keep that gate OPEN until actual PDF/printer evidence is inspected. Do not rerun transactions or fixtures to test printing.
''')

state=root/'00 Docs/STATE.md'
t=state.read_text(encoding='utf-8')
start=t.index('### 1. Add / Cart / Orders / Label')
end=t.index('### 2. Meta catalog')
stream=f'''### 1. Add / Cart / Orders / Label (Stream B) — W1 CLOSED; W2 acceptance OPEN print gate
- Status: Session45 W2 implementation/CLIENT failure-retry/preview/original-ID replay and current-writer focused review PASS in local/isolated test. Label PDF and physical Print/Reprint remain OPEN; IAB cannot expose native print.
- Next ONE step: complete the existing saved-order PDF/printer gate in 04 Design Tools/logs/W2-20261005-01/CONTINUE.md. Do not sell/save/prepare fixtures again; W3 is separate.
- Exact revision: {rev}; nine candidate files, twelve complete test-source readbacks, manifest and W1Qa unchanged; verification.json PASS.
- Evidence2026-10-05/06: w2-results.json14groups, label-results.json6checks, expanded15scripts and Orders stale-response check; google-native.json6same-ID replays with no new effect.
- Final isolated export2026-10-06: google-final.xlsx{a['xlsxBytes']}bytes; google-assertions.json preserves all old cells/formulas/Pending08 and1209old journal rows; +2orders/+2lines/+2SALES/+87events; all latest requests DONE;2synthetic CLIENTs. PNGgoogle-print358282bytes and google-ui233069bytes show actual ready previews.
- Actual CLIENT RichText coercion retained in google-coercion.xlsx/beforeRetry. Escaped literal writer fixed; explicit bounded original-intent repair + retry completed; new second CLIENT confirms strings/zeros/empty formulas. No repeated sale or old event rewrite.
- Closed choices: reuse CLIENT A:F plus Client ID/Updated At; stable-ID explicit selection; default order-only, explicit update; recipient snapshot separate; one canonical renderer/CAUTION; private fields/prices excluded from print; recovery keeps original IDs.
- Environment: exact isolated project1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd / Sheet13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM. Only /dev HEAD changed; numbered deployments/production v31/LAB unchanged.
- Recovery/review: package result.md, REVIEW.md, UNDO.md, implementation.md and changes.csv; backup/v38 and complete google-source-before retained. Never restore old XLSX over later history.
- W1 remains CLOSED/frozen at W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42; Session44 review W1-20261005-02/REVIEW.md. F0549-gap repair closed; never repeat it.
- Limits: direct owner edits/external marketplace sync retain W1 limits; real CLIENT migration/release is W3. Native print is an environment blocker; exact model/effort unavailable, no switch claimed.
- Current HANDOFF_2026-10-06.md Session45; Session44 archived to _archive/handoffs_old/HANDOFF_2026-10-05_Session44.md. Other streams below retain prior snapshots.

'''
t=t[:start]+stream+t[end:]
t=t.replace('จัดทำ: 2026-10-05 +07 — Stream B Session44 W1 final review PASS / local-test CLOSED; other streams retain prior snapshots.',f'จัดทำ: {stamp} — Stream B Session45 W2 local/test PASS; PDF/physical print gate OPEN; other streams retain prior snapshots.')
t=t.replace('`HANDOFF_2026-10-05.md`; Session41/42/43 handoffs are archived; Session44 is current.','`HANDOFF_2026-10-06.md`; Session41/42/43/44 handoffs are archived; Session45 is current.')
assert len(t.splitlines())<=80
write(state,t)
write(root/f'00 Docs/HANDOFF_{date}.md',f'''# HANDOFF — Session45 / Stream B

จัดทำ: {stamp} · one writer · master §§2/5/5.2.1/6/9

1. **Done:** W2 CLIENT search/save → committed recipient → web/Sheets ready preview; actual CRM after-effect failure/explicit bounded original-intent repair/retry without duplicate sale.14targeted groups,6renderer checks,15expanded scripts, Orders stale-response check,12complete source readbacks and6native original-ID replays PASS. Fresh XLSX{a['xlsxBytes']}bytes preserves all old cells/formulas/journal/Pending08; +2orders/+2lines/+2SALES,2synthetic clients.
2. **State:** `{rev}` in `04 Design Tools/logs/W2-20261005-01/candidate/`. Implementation/current-writer review PASS; W2 acceptance OPEN for PDF/physical Print-Reprint. W1 CLOSED/frozen. Production v31, numbered deployments, P0/P1 and LAB unchanged. Current authoritative STATE/PLAN updated; result/review/attempts/CSV/verification in package.
3. **Closed decisions:** CLIENT reused A:F+stable ID/revision; explicit selection/new/update, existing defaults order-only; buyer separate from order recipient; single canonical renderer/CAUTION; no Facebook/internal note/prices on label; client repair retains original Request ID and does not repeat sale. No new model session/agent or model-switch claim.
4. **Next ONE step:** `04 Design Tools/logs/W2-20261005-01/CONTINUE.md`: normal browser saved orders04/05 → Preview/Print → PDF page/content and physical100×150mm print/reprint. No Save/Confirm/fixture needed. W3 release/migration remains separate.
5. **Risks/recovery:** IAB native print/popup inaccessible, so no PDF/printer success claimed. Keep all original IDs/events and current data; never restore old XLSX over later history. UNDO.md + backup/v38 + google-source-before contain recovery evidence. Native CLIENT mock miss corrected and preserved; real CLIENT dry-run required in W3. Session44 HANDOFF archived, other streams retain older snapshots.
''')

decision=root/f'04 Design Tools/logs/decisions_{date}.csv'
assert not decision.exists(), 'Preserve existing decisions; append explicitly instead'
decision_rows=[['date','change_id','topic','status','decision','evidence'],
 [date,'W2-20261005-01','Owner W2 authorization','CLOSED','CLIENT/search/save/recipient/preview/Print-Reprint in local candidate and isolated test; one writer; no production/LAB','User request + result.md'],
 [date,'W2-20261005-01','Implementation/retry/native data','CLOSED','SOLD survives CLIENT failure; original-ID retry/replay does not sell again; label-only preserves ledger/stock','google-native.json + google-assertions.json'],
 [date,'W2-20261005-01','PDF / physical print acceptance','OPEN','Normal browser PDF and100x150mm physical Print/Reprint evidence still required; IAB native surface inaccessible','CONTINUE.md + google-print.png'],
 [date,'W2-20261005-01','W3 production/migration','OPEN','Separate authorization/release/migration dry-run; not performed in W2','PLAN §0 + STATE.md']]
import io
s=io.StringIO(newline='');csv.writer(s,quoting=csv.QUOTE_ALL).writerows(decision_rows);write(decision,s.getvalue().replace('\r\n','\n'))

diff=p/'diff';diff.mkdir(exist_ok=True)
mapping={'Code_v39.gs':'Code_v38.gs','WebApp_v39.gs':'WebApp_v38.gs','W1Orders.gs':'W1Orders.gs','Index.html':'Index.html'}
for name in json.loads((p/'revision.json').read_text())['hashes']:
    before=p/'candidate/backup/v38'/mapping.get(name,'_ABSENT_')
    after=p/'candidate'/name
    lines=list(difflib.unified_diff(before.read_text(encoding='utf-8').splitlines(True) if before.exists() else [],after.read_text(encoding='utf-8').splitlines(True),fromfile='v38/'+mapping.get(name,'ABSENT'),tofile='v39/'+name))
    write(diff/(name+'.diff'),''.join(lines))

# Record every persisted package artifact; backups/source attempts remain immutable evidence.
for f in sorted(p.rglob('*')):
    if not f.is_file() or f==log or f.is_relative_to(bc) or f.is_relative_to(p/'before'): continue
    rel=f.relative_to(p)
    if rel.parts[0]=='candidate' and len(rel.parts)>1 and rel.parts[1]=='backup': continue
    record('ARTIFACT-MANIFEST',rel,str(rel)+' '+hashfile(f),'Readback '+str(f.stat().st_size)+' bytes; prior history/attempt files preserved')
with log.open('w',newline='',encoding='utf-8') as f: csv.writer(f,quoting=csv.QUOTE_ALL).writerows(history+records)
with log.open(newline='',encoding='utf-8') as f: assert list(csv.reader(f))==history+records
print(json.dumps({'result':'PASS','revision':rev,'stateLines':len(t.splitlines()),'logRows':len(history+records)-1,'timestamp':stamp,'handoff':str(root/f'00 Docs/HANDOFF_{date}.md')}))
