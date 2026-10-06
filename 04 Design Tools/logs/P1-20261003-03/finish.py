from pathlib import Path
from datetime import datetime
import csv,json,hashlib,difflib,shutil
e=Path(__file__).resolve().parent;root=e.parents[2];live=root/'03 Apps Script/Web App'
stamp=datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')
assert stamp.startswith('2026-10-03')
def read(p):return p.read_text(encoding='utf-8-sig')
def write(p,s):p.write_text(s,encoding='utf-8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def log(action,before,after,outcome,error,recovery):
    with (e/'changes.csv').open(encoding='utf-8-sig',newline='') as f:
        r=csv.DictReader(f);fields=r.fieldnames;rows=list(r)
    row=dict(zip(fields,[f'P1-34-{len(rows)+1:03}',stamp,'P1-20261003-03','P1-PRODUCTION-READY-001',action,before,after,outcome,error,recovery]))
    with (e/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.DictWriter(f,fieldnames=fields).writerow(row)
assert '17 original tabs and 195246 values/formulas unchanged' in read(e/'shop-readback-output.txt')
assert not (live/'Code_v31.gs').exists(),'Local commit already run'

for n in ['image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js']:
    shutil.copy2(live/n,e/'before'/n)
for old in ['Code_v30.gs','WebApp_v28.gs']:
    assert (live/old).read_bytes()==(e/'before'/old).read_bytes(),'Source changed since backup'
    backup=live/'backup'/(old[:-3]+'_superseded_2026-10-03.gs')
    assert not backup.exists();shutil.copy2(live/old,backup)
for n in ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs']:
    shutil.copy2(e/'stage'/n,live/n)
for old,new in [('Code_v30.gs','Code_v31.gs'),('WebApp_v28.gs','WebApp_v31.gs')]:
    write(live/old,'// SUPERSEDED 2026-10-03 — use '+new+' paired with '+('WebApp_v31.gs' if new.startswith('Code') else 'Code_v31.gs')+'.\n// Full previous source: backup/'+old[:-3]+'_superseded_2026-10-03.gs\n')
for n in ['image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js']:
    write(live/n,read(live/n).replace('Code_v30.gs','Code_v31.gs'))
write(live/'p1-add.test.cjs',read(e/'p1-add.test.cjs').replace("path.join(__dirname, 'stage')","__dirname"))
write(live/'p1-ui.test.cjs',read(e/'p1-ui.test.cjs').replace("__dirname+'/stage/Index.html'","__dirname+'/Index.html'"))
text=read(live/'README.md').replace('Code_v30.gs','Code_v31.gs').replace('WebApp_v28.gs','WebApp_v31.gs')
text=text.replace('(ณ 2026-10-02; v30 พร้อม deploy รอ owner วางใน Apps Script — จนกว่าจะวาง ตัวที่รันอยู่คือ v29 ใน `backup/`)','(ติดตั้งและตรวจ source ร้าน 2026-10-03; deployment เดิม Version 4; คู่ v31/v31)')
text=text.replace('v20–v29 ถูกแทนที่แล้ว','v20–v30 ถูกแทนที่แล้ว')
text=text.replace('ตรรกะหลัก (v30 =','ตรรกะหลัก (v31 = v30 + durable Add journal, same-ID recovery, R1–R4 validation/readback · v30 =',1)
text=text.replace('"pairs with Code.gs v30"','"pairs with Code.gs v31"',1)
marker='| `Index.html` |'
i=text.index(marker)
text=text[:i]+'| `P1Journal.gs` | guarded ADD REQUESTS migration + read-only production readiness; no trigger installed | Apps Script → `P1Journal.gs` |\n'+text[i:]
marker='> ⚠️ แก้ไฟล์พวกนี้แล้วต้อง'
i=text.index(marker)
text=text[:i]+'''P1 Add v31 พร้อมใช้: headers 17 ช่องใน ADD REQUESTS ติดตั้งแล้ว; source ทั้ง4ไฟล์อ่านกลับหลัง Save/reloadตรง SHA256; deployment Version4 URLเดิม access Only myself. ทดสอบ normal/failure/retry ในโปรเจกต์แยกและ regression PASS; ร้านผ่าน readiness + เปิด Add modal New Arrival โดยไม่เพิ่มสินค้าปลอม. `node p1-add.test.cjs` / `node p1-ui.test.cjs` โหลด source คู่ v31 ในโฟลเดอร์นี้. Backup, undo และ exact hashes: `../../04 Design Tools/logs/P1-20261003-03/`.

หาก Save ไม่แน่ชัด ให้ใช้ Request ID เดิมและ `Check / retry request`; ERROR ต้อง reconcile journal↔inventory ก่อนแก้. IDหาย/new deviceใช้ manual recovery ห้ามเพิ่มซ้ำด้วย IDใหม่. Orders/reservation/Label P2 ยังไม่ติดตั้งในรอบนี้.

'''+text[i:]
write(live/'README.md',text)
log('Local authoritative pair/version/README/test commit','v30/v28 and old Add UI','v31/v31 + current Index/P1Journal; previous pair copied to backup and root stubs; tests re-pointed','COMMITTED','No source rewrite outside bounded Add/version regions; no production business write','before/; stage/; backup/*superseded_2026-10-03.gs; UNDO.md')

hashes=json.loads(read(e/'stage-hashes.json'))
hashes={n:hashes[n] for n in ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs']}
write(e/'source-readback.json',json.dumps({'recorded_at':stamp,'project_id':'1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp','saved_to_drive_observed':True,'method':'Fresh editor reload and exact full clipboard string comparison; LF normalized','sha256':hashes,'deployment':{'id':'AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn','before_version':3,'after_version':4,'success_ui_time':'2026-10-03 21:44 Bangkok','execute_as':'owner','access':'Only myself','url':'https://script.google.com/macros/s/AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn/exec'},'journal_sheet_id':1424987581},indent=2)+'\n')
write(e/'runtime-output.txt','''Production Apps Script UI execution logs observed 2026-10-03 Bangkok:
21:38:10 Notice Execution started (p1PrepareAddJournal)
21:38:11 Info P1 journal ready: sheetId=1424987581; eventRows=0
21:38:12 Notice Execution completed
21:42:16 Notice Execution started (p1CheckAddReady)
21:42:15 Info PASS header resolution: GAME GUIDE BOOKS
21:42:16 Info PASS header resolution: MAGAZINE
21:42:16 Info PASS P1 readiness: Code v31 / WebApp v31; exact schema; both inventories; invalid input rejected; no inventory/SALES/journal events written; existing events=0
21:42:17 Notice Execution completed
The UI's first readiness Info precedes its Notice timestamp by one second; preserved as observed.
Deployment UI: Deployment successfully updated. Version 4 on Oct3 2026 21:44.
Production /exec loaded and Add modal opened: default New Arrival; blank Cost/Price; Save available. Closed without submission. No synthetic business row created in shop.
''')
log('Production export verification and /exec modal smoke','Before full workbook; deployment3','17 prior tabs/195246 stored cells unchanged; only exact17 journal headers; no events; v4 app loads and Add defaults New Arrival','PASS','Verifier first assumed new-tab-last; fixed to preserve original relative order. Next compared ArrayFormula object identity; four object-only differences diagnosed, exact text/ref comparison passed. UI G2 is hidden and selection advanced; read-only navigation only; one stale grid-index key failed without input','verify-shop.py; shop-readback-output.txt; before/shop-sheet.xlsx; shop-sheet-after.xlsx; runtime-output.txt')

hash_table='\n'.join('| `'+n+'` | `'+v+'` |' for n,v in hashes.items())
export_table='\n'.join(f'| `{n}` | {(e/n).stat().st_size:,} | `{sha(e/n)}` |' for n in ['before/shop-sheet.xlsx','shop-sheet-after.xlsx'])
write(e/'result.md',f'''# P1 production installation — Session34

จัดทำ: {stamp}. Stream B §§2,5,6,9. Change `P1-20261003-03`; Request `P1-PRODUCTION-READY-001`; one writer; no agents/chats. Owner explicitly approved source/schema/deploy after requiring backups for undo.

P1 **Add is installed and ready on the existing production endpoint**: Code/WebApp v31 pair, reviewed UI and guarded P1Journal add-on; ADD REQUESTS sheet ID1424987581 with exact17 headers; deployment Version4 (previous3), unchanged URL/owner-only access. This completes the bounded P1 promotion. Orders, reservation, shared sales transaction and Label P2 remain separate uninstalled work.

## Rebase and validation

Fresh production editor full readback matched local v30/v28/Index before any mutation. Reviewed Session33 P1 helpers/Add/API/UI/formula-readback were moved onto current v30 to retain Meta dedup/title/nightly-refresh/PID changes. `readiness.test.cjs` proves all existing Code regions outside Add/formula/version unchanged, resolves actual fresh GGB/MAG headers, and rejects invalid input without business delegation. Production journal event writes additionally use existing `_tryWrite` as project rules require; failures preserve the diagnostic in the exception. App Version journal field now records `Code v31 / WebApp v31`.

P1 Add/UI failures/retries, wrong-Sheet/idempotent/failed-header/mismatched-existing-journal guards, Index inventory, image URL, FB catalogue and Meta pipeline suites PASS. Outputs are `*-output.txt`; runnable source/tests are in `stage/`. Current production code path differs from the isolated QA candidate only by bounded rebase, version labels and checked journal wrapper. Session33 actual isolated R1–R4 fault-injection evidence remains in `P1-20261003-02/`; this session did not create fake stock/sales in the shop.

Actual production readiness at21:42 checks both header mappings, exact journal schema, read-only NOT_FOUND lookup and invalid source/non-string status rejection; event count stays0. New source readback after completed Save and fresh reload exactly matches all4 staged hashes. Existing deployment was updated to Version4 at21:44; `/exec` loads, inventory is rendered, Add modal opens with New Arrival, then closes without Save. No production normal Add/DONE event is claimed yet; first real owner transaction must retain Request ID and verify one row plus PREPARED→DONE. Local/isolated tests prove normal/failure/retry paths. New-tab/lost-ID recovery remains manual; actual network outage remains unproven.

## Exact installed source

Project `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp`; Sheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. Source files: `{live}`. LF SHA256 after fresh live readback:

| File | SHA256 |
|---|---|
{hash_table}

[Production web app](https://script.google.com/macros/s/AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn/exec). Version3 pinned deployment is the /exec rollback; before/Code_v30.gs and before/WebApp_v28.gs are the separate pre-install saved-head rollback. Access remains Only myself. FbAlbum/R2Upload source and triggers were not edited; Back House LAB was not touched.

## Before → after Sheet evidence

Fresh full exports taken before mutation and after deployment, 2026-10-03. Contains private shop data: retain locally; public notes contain schema/hash/result only.

| Snapshot | Bytes | SHA256 |
|---|---:|---|
{export_table}

`verify-shop.py` PASS: all17 original tabs and195246 stored cells have identical values/formulas (ArrayFormula text+ref compared); original tab relative order unchanged. Only ADD REQUESTS was inserted after active SALES, with17 exact header values and no journal events. Existing inventory/SALES/CLIENT/Meta values/formulas unchanged. GGB/MAG header sets differ by design; readiness checks their common columns plus GGB-only Platform/Genre/Sub Genre.

## Issues, retries and recovery

Every attempt is in changes.csv and Implementation log. Automatic approval review initially rejected the production action twice, retaining the original no-production restriction and treating backup-first reply as preparation only. No workaround was used; owner then explicitly approved source/schema/deploy. A reload was deferred by auto-review until Save completion; screenshot/DOM cloud_done established completed Save and the permitted retry succeeded. One stale function-selector target failed before action; semantic DOM+ screenshot selection prevented an unintended Run.

Local Add test initially expected INJECTED but journal wrapper discarded the detailed cause; `_sp2WriteErrMsg` was added and retry passed. PowerShell LiteralPath wildcard and rg glob-path errors were corrected using proper wildcard/-g; no data changes. Export verifier first assumed new tab last, then compared ArrayFormula instances by identity; corrected relative-order/content checks passed. Four apparent formula differences were only separate object instances; actual formula text/ranges match. Formula cell G2 is hidden in SALES, so navigation advanced to visible rows; no edit was sent, one stale-grid attempt sent no input. Earlier guessed action timestamps in CSV were corrected to recorded timestamps; exact runtime UI times preserved.

Full undo instructions: `{e/'UNDO.md'}`. Preserve current data/events before any rollback; never restore the entire old workbook over newer edits. Use original Request ID for uncertain Save; ERROR/partial row requires manual reconciliation, never a new ID. Source backups/diffs, version pair archives/stubs, README/test updates and docs are in this package's before/, *.diff and current Web App/backup/. No new source/schema migration creates Orders or stock reservations.

## One next step

Use the deployed P1 Add for the next real stock addition and reconcile its first Request ID/DONE; continue P2 transaction/reservation/Orders/Label as a separate bounded change. Do not treat the P1 journal as covering legacy sales/order paths.
''')

summary=f'''Stream B §§2,5,6,9; Change `P1-20261003-03`, Request `P1-PRODUCTION-READY-001`; one writer. Owner explicitly approved production source/schema/deploy with backup-first undo condition after two automatic approval-review rejections; no workaround/agent/chat. Before: fresh production source matched Code v30/WebApp v28/Index; fresh Sheet17 tabs/no journal; active deployment3. After: reviewed P1 rebased to v31/v31 without changing existing Meta/SKU regions outside Add/formula/version; ADD REQUESTS sheet1424987581 exact17 headers installed; four source Save/reload readbacks match hashes; existing deployment updated to Version4 at21:44, same URL and Only myself access. Production readiness PASS21:42; /exec opens and Add defaults New Arrival, closed without creating fake stock.

All P1 Add/UI, guarded schema/readiness, Index/image/FB/Meta tests PASS. Fresh workbook backup1,535,818 bytes SHA256 `D9989BA034C1744819C78870A53B1EE45039FF4673544EB98A63FCC203C733C2`; after export and verifier prove all17 original tabs/195246 stored values/formulas unchanged, only new journal headers and no events. Full paths/hashes/backup/diffs/error/retry/undo are in `{e/'result.md'}`, changes.csv, UNDO.md. Initial journal wrapper diagnostic test repaired once; Save-state deferred reload completed safely; literal/glob, stale AX and export ArrayFormula/tab-position assertions corrected without business mutation. Full runtime timestamps and details in runtime-output.txt. Historical logs/HANDOFF prefix bytes preserved; authoritative local pair archived with stubs and README/tests re-pointed to v31.

P1 Add ready; first real production Add/DONE has not been performed by the agent. Retain Request ID; ERROR/uncertain/lost ID requires journal↔inventory reconciliation before retry, never a fresh ID. Actual network outage/new-device auto-recovery remains unproven/manual. No Orders/reservations/Label P2 installed, no SALES/CLIENT data or Back House LAB change. Undo: deployment3 for previous pinned /exec; before/v30/v28/Index for pre-install saved head; preserve journal/newer business edits rather than blind full-workbook restore. One next step: use P1 on the next real Add and reconcile its first DONE; P2 remains a separate bounded phase.
'''
for target,heading in [('HANDOFF_2026-09-28.md','## Session 34 — P1 v31 production promotion with undo backup (2026-10-03)'),('IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','### P1 v31 production installation — P1-20261003-03 (2026-10-03)')]:
    p=root/'00 Docs'/target
    assert p.read_bytes()==(e/'before'/target).read_bytes(),'History changed since backup'
    with p.open('ab') as f:f.write(('\n\n'+heading+'\n\nจัดทำ: '+stamp+'\n\n'+summary).encode('utf-8'))

state=root/'00 Docs/STATE.md';text=read(state)
lines=text.splitlines();lines[2]='จัดทำ: '+stamp+' — Stream B P1 v31 production installed; other streams retain prior verified snapshots. Re-verify live sources before acting on numbers.';text='\n'.join(lines)+'\n'
start=text.index('### 1.');end=text.index('### 2.',start)
text=text[:start]+'''### 1. Add / Cart / Orders / Label (Stream B) — P1 Add LIVE; P2 pending
- Status: Session34 production Code/WebApp v31 + Index/P1Journal saved and full readbacks match SHA256. ADD REQUESTS exact17 headers installed (sheetId1424987581); existing /exec deployment Version4 at2026-10-03 21:44, owner-only access. P1/Meta regressions and production readiness/modal smoke PASS; no synthetic stock/sale created in shop.
- Evidence: fresh before/after full exports; all17 prior tabs/195246 values/formulas unchanged; only new journal headers, events0. Installed source Code `6EF098CD39F5...`, WebApp `7102CC7FA473...`, Index `5ECE912BC9AE...`, P1Journal `FDF4B656488E...`.
- Next ONE step: next real P1 Add must retain its Request ID and verify one inventory row/PREPARED→DONE; proceed to P2 Orders/reservation/Label only as a separate change.
- Open: actual production normal Add/DONE not yet performed; lost-ID/new-device recovery manual; actual network outage unproven. P2 stable identity/shared reservation/order-owned Cancel/idempotent SALES remains uninstalled.
- Owner rules: backup affected source/Sheet/deployment before shop tests; explicit source/schema/deploy approved2026-10-03. Shipping Cost=shop subsidy; Auction unavailable; Pending reserves; Cancel only own reservation; reuse CLIENT; Facebook Account never on Label.
- Detail: `04 Design Tools/logs/P1-20261003-03/result.md`, `UNDO.md`, `changes.csv`; `00 Docs/HANDOFF_2026-09-28.md` Session34 tail; `00 Docs/HANDOFF_2026-10-03.md`; Implementation log. v31 includes all existing Meta v30 behavior; legacy sales are outside P1 journal.

'''+text[end:]
text=text.replace('(Sessions through 33, history preserved)','(Sessions through 34, history preserved)')
write(state,text)
plan=root/'00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md';text=read(plan);i=text.index('P1 board update');j=text.index('\n',i)
text=text[:i]+'''P1 board update 2026-10-03 Session34: R1–R4 integrity acceptance **DONE**; rebase onto current production v30 Meta source **DONE**; source pair v31/v31 + reviewed UI/P1Journal Save/readback **DONE**; exact17-header ADD REQUESTS migration **DONE**; existing /exec deployment Version4 at21:44 **LIVE** (owner Only myself). All P1/Meta tests and production read-only readiness/modal smoke **PASS**. Fresh backup1,535,818 bytes + after export verify17 prior tabs/195246 values/formulas unchanged; only new journal headers, events0. Change `P1-20261003-03`, Request `P1-PRODUCTION-READY-001`, evidence `04 Design Tools/logs/P1-20261003-03/result.md`/`UNDO.md`. First real production Add/DONE **NOT YET RUN**; no fake stock/sale/customer writes. Orders/reservation/Label P2 remains **TODO**; P1 does not cover legacy sales.'''+text[j:];write(plan,text)
write(root/'00 Docs/HANDOFF_2026-10-03.md',f'''# HANDOFF — 2026-10-03 — Stream B P1 Session34

จัดทำ: {stamp}. §§2,5,6,9; Change `P1-20261003-03`; Request `P1-PRODUCTION-READY-001`; one writer.

1. **Done:** P1 Add promoted onto current shop source, Code/WebApp v31 + Index/P1Journal saved/read back; exact17-header ADD REQUESTS installed; existing deployment3→4 at21:44, same URL/owner-only access. Local files `{live}`; previous pair copied to backup with stubs; README/tests updated. Full hashes/diffs: `{e/'result.md'}`.
2. **Data / tests:** Fresh shop exports before/after; backup1,535,818 bytes; verifier PASS17 prior tabs/195246 stored values/formulas unchanged, only new journal headers/events0. P1 Add/UI/schema/readiness and Meta/image/FB suites PASS. Production readiness and Add modal New Arrival PASS; form closed without fake inventory/sale.
3. **Decisions / issues:** Owner explicitly approved source/schema/deploy and required backup before real-shop tests for undo; decisions_20261003.csv updated. Two initial production approval rejections and Save-state deferred reload, journal-wrapper diagnostic repair and export tab-order/ArrayFormula-object comparison corrections logged in changes.csv/Implementation log. No workaround/model switch/agent/chat.
4. **Risks / not done:** First real production Add/DONE not yet performed; normal and failure/retry proven locally/in isolated Google test. Lost-ID/new-device recovery remains manual; actual network outage unproven. Orders/reservation/Label P2 remains uninstalled; no SALES/CLIENT or Back House LAB edit.
5. **Next / undo:** Use next real P1 Add with its original Request ID and confirm one row/PREPARED→DONE; P2 separate phase. `{e/'UNDO.md'}`: deployment3 restores old pinned /exec; before/v30/v28/Index restores previous saved head. Preserve journal/newer data; never full-workbook overwrite or uncertain retry with fresh ID.
''')
log('Session-close documents and audit','Session33 P1 NO-GO shop state','Session34 P1 Add LIVE; history/implementation appended; STATE/board/current summary updated; owner backup+production approvals recorded','COMPLETE','No broad P2 completion claim; exact production normal Add remains first-owner-use check','before/; docs-*.diff; result.md; UNDO.md; verify-package.py')
for p in [live/'README.md',live/'Code_v30.gs',live/'WebApp_v28.gs',live/'Index.html']+[live/n for n in ['image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js']]+[root/'00 Docs'/n for n in ['STATE.md','PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','HANDOFF_2026-10-03.md','HANDOFF_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md']]:
    before=e/'before'/p.name
    write(e/('docs-'+p.name+'.diff'),''.join(difflib.unified_diff(read(before).splitlines(True),read(p).splitlines(True),fromfile=str(before),tofile=str(p))))
paths=[p for p in e.rglob('*') if p.is_file() and p.name not in ['manifest.json','package-output.txt']]
paths += [live/n for n in ['Code_v31.gs','WebApp_v31.gs','Index.html','P1Journal.gs','README.md','Code_v30.gs','WebApp_v28.gs','p1-add.test.cjs','p1-ui.test.cjs','meta-pipeline.test.js','fb-catalogue.test.js','image-url.test.js']]
paths += [root/'00 Docs'/n for n in ['STATE.md','PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','HANDOFF_2026-10-03.md','HANDOFF_2026-09-28.md','IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md']]
paths += [root/'04 Design Tools/logs/decisions_20261003.csv']
write(e/'manifest.json',json.dumps({str(p.relative_to(root)).replace('\\','/'):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths},indent=2)+'\n')
print('Local v31 pair/add-on/README/tests committed; backups/stubs/history verified; session34 documents and exact hash manifest written')
