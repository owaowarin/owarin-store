"""Session51 documentation close; immutable evidence and LF source verification."""
import csv, hashlib, json, shutil
from datetime import datetime
from pathlib import Path

p = Path(__file__).resolve().parent
root = p.parents[2]
app = root / '03 Apps Script/Web App'
now = datetime.now().astimezone().isoformat()
rev = json.loads((p / 'revision.json').read_text(encoding='utf-8'))
revision = rev['revision']
packet = '04 Design Tools/logs/' + p.name
backup_url = 'https://docs.google.com/spreadsheets/d/1OegftlJuM0glHqymOcMU0G3KhiF_AoYlNR3m1tDoZgY/edit'
live_url = 'https://script.google.com/macros/s/AKfycbxk-2PAuL3asvDlF0VmftrF7pwkMuQr3qUnTtej0j9MfxLaG1l4Mb39oQ1Q-2CkSYOn/exec'
next_step = 'สังเกตออเดอร์จริงแรกตามการใช้งานของเจ้าของ; ไม่สร้างธุรกรรมจำลองในร้านจริงและไม่เริ่ม P0/P1 ใหม่'
changed = {}

def sha(data):
    return hashlib.sha256(data).hexdigest().upper()

def log(action, before, after, note):
    with (p / 'changes.csv').open('a', encoding='utf-8', newline='') as f:
        csv.writer(f).writerow([now, p.name, action, before, after, note])

def read(rel):
    return (root / rel).read_text(encoding='utf-8-sig')

def write(rel, text):
    f = root / rel
    old = f.read_bytes() if f.exists() else b''
    data = text.replace('\r\n', '\n').encode('utf-8')
    assert old != data, rel
    log('CLOSE-DRYRUN', sha(old) if old else 'ABSENT', sha(data), rel)
    if old:
        dst = p / 'before/close' / rel
        assert not dst.exists(), dst
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dst)
    f.write_bytes(data)
    assert f.read_bytes() == data
    changed[rel] = sha(data)
    log('CLOSE', sha(old) if old else 'ABSENT', sha(data), 'PASS readback ' + rel)

def replace_once(s, a, b):
    assert s.count(a) == 1, a[:120]
    return s.replace(a, b, 1)

for name, h in rev['hashes'].items():
    assert sha((p / 'candidate' / name).read_bytes()) == h
    assert sha((app / name).read_bytes()) == h
for file in ['source-verification-final.json', 'migration-verification.json', 'replay-verification.json', 'root-regressions.json']:
    assert json.loads((p / file).read_text(encoding='utf-8'))['result'] == 'PASS'
ui = json.loads((p / 'ui-smoke.json').read_text(encoding='utf-8'))
assert 'No ALL orders' in ui['orders'] and 'Cart is empty' in ui['cart']
assert 'OWA · Label Tool' in ui['label']

log('P1-REGRESSION-RESULT', 'Raw HTML include / former inline loader failed', 'PASS both original assertion suites', 'Actual W2Suggest include resolved; runtime/P1 behavior unchanged; root-regressions.json')
log('HOUSEKEEPING-ISSUES', 'Nonexistent root README / wrong transfer workdir / verifier max_column side effect', 'Correct mirrored Web App README / corrected nested workdir / fixed filled-header bounds', 'Read-only diagnostics corrected; no business data change; retained earlier migration and source failures')

# Correct the historical generator to reflect the final guarded source; never rerun it.
rel = packet + '/fix-native-table.py'
s = read(rel).replace('../../backup/v40/', '../backup/v40/')
s = replace_once(s, "(!rows||sh.getRange(2,7,rows,2).getValues().every(function(r){return r.every(function(v){return v==='';});}));", "(!rows||sh.getRange(2,7,rows,2).getValues().every(function(r){return r.every(function(v){return v==='';});})&&sh.getRange(2,7,rows,2).getFormulas().every(function(r){return r.every(function(v){return v==='';});}));")
write(rel, s)

summary = f'''## Session51 — W1/W2 production LIVE; release CLOSED

จัดทำ: {now} · Stream B §§2/5/5.2.1/9 · one writer · `{revision}`.

Owner authorized production start with backup for undo, then explicitly restricted the new copy to owner only. The writer operated native Google UI: fresh original Sheet/export/source/settings/trigger/deployment backup, native copy and sharing readback, saved source installation, guarded migration, original-ID retry/replay, and existing deployment promotion. Version5 created **2026-10-06 07:34 +07**, same /exec URL and owner/Only myself access. Print/PDF/physical acceptance remains Session50 PASS — owner-confirmed, without agent output inspection. No model switch or model-specific sign-off claimed.

Fresh pre-release Head was Code v32/webapp v31, with later FB Album changes absent from the old local pair. v40 rebased accepted v39 and preserved those changes. Production CLIENT native Table automatically expanded A1:F1000 to A1:H1000 and named new headers Column 7/Column 8: first migration stopped NEEDS_REVIEW CLIENT_SCHEMA_CONFLICT after schema capacity effects. v41 fixes the shared root helper, accepting only those exact placeholders while headers are ARMED, original A:F matches the durable snapshot, and new G:H values **and formulas** remain empty. Unexpected headers/metadata/formulas still fail closed. The original request `prod-w1w2-schema-20261006-v40` remains fixed: attempt2 DONE with the same six allocated IDs/time; no reset or recreated IDs. Native execution/readiness/replay at03:26–03:29 +07 and fresh exports prove original22tabs stored cells/formulas preserved except exact appended identity metadata, CLIENT A:F untouched, zero orders/lines and nine journal events at that checkpoint; subsequent DONE replay changes zero cells across25tabs. These are timestamped migration results, not new current business counts after scheduled Meta runs.

Full saved/reloaded Google13-file LF hash readback matches v41; FbAlbum/R2Upload/P1Journal remain exact before sources, manifest untouched and its display preference restored. The first manifest capture had stale P1Journal content; correct203-character manifest capture is authoritative. The first LabelRenderer DOM-value capture was truncated near200KB; full clipboard transfer/reload/hash verification repaired it without treating truncation as success. Original public-view Sheet sharing and existing triggers/properties were not changed. Copy is Restricted/one owner; copy-derived R2 IMAGES recalculation differs, so exact original `shop-before.xlsx` is retained alongside the native copy and bound script.

Checks actually completed: release.test.cjs PASS13 groups (five after-effect boundaries, wrong actor/Sheet/schema, changed data, native auto headers and formula rejection); frozen W2 regression adapter PASS14 CRM/failure/retry groups, six renderer checks and Orders stale-response check; all six root impact regressions PASS. Old P1 test loaders initially read raw template/removed inline suggestion; loaders now resolve the actual W2Suggest partial with original assertions retained, no P1 runtime change. Root10sources match revision; previous root31 pair archived/stubbed, Index/tests backed before sync. Read-only live /exec smoke loaded Inventory, empty Orders ALL and Cart; native Sheets Labels > Open Label Tool loaded and was closed without Save/Print. No synthetic production Add/order/sale/client edit, no P0/P1 reopening, no LAB, no QA fixture installed.

Approval failures: copy restriction initially lacked explicit authorization; later owner permission resolved it. A reviewer initially rejected export handling as payload output; safe local-path-only export succeeded. Review usage limit stopped deployment selection before execution; later owner continue and ordinary approval-checked retry succeeded, no bypass. Diagnostic ArrayFormula object identity and mutable openpyxl max_column caused comparison false positives; typed formula comparison and frozen last-filled headers corrected them. Failed patches/path lookups/helper workdir were corrected before dependent work; all issues are retained in changes.csv.

Evidence: `{packet}/` revision, source-verification-final.json, migration-verification.json, replay-verification.json, root-regressions.json, ui-smoke.json, native JSON, deployment-after.json, shop-before/pre-migration/migration-failed/migrated/replayed.xlsx, backup.png and smoke.png. Private settings remain local and must never be printed. Undo distinguishes Version4 runtime rollback from data reconciliation; never restore an old workbook over later history. Next ONE: {next_step}.
'''
write(packet + '/implementation.md', '# Session51 implementation and recovery evidence\n\n' + summary)
write(packet + '/review.md', f'''# v41 focused review — current writer — PASS

Exact revision: `{revision}`. This is current-writer review; no Astra-specific execution/switch claimed. The earlier v40 review is preserved under before/close.

Fresh Code v32 FB Album behavior is preserved in paired v41; old accepted money/stock/recovery logic is reused. Test entrypoints retain exact isolated guards. Production schema entrypoints require effective/active owner, exact original Sheet, existing valid ADD REQUESTS and shared lock; they initialize only missing/empty technical tables/appended metadata and never manufacture orders/sales. Partial nonempty headers stop reconciliation.

Native Table capacity root fix permits exact Column 7/8 placeholders only with ARMED header step, matching original A:F and blank G:H values AND formulas. Surprise names/metadata/formulas stop. Native same-ID retry retains original IDs/time and journal; DONE replay is inert. Review and failure checks found no remaining blocker for this bounded release.

PASS13 migration/failure groups + PASS14 W2 CRM/retry groups + six renderer checks + Orders async guard + six original impact regressions. Saved Google13sources LF hashes/auxiliaries and root10revision hashes PASS; migration original22tabs/A:F preservation and25tab DONE replay PASS; Version5 native deploy and read-only live Orders/Cart/Label smoke recorded. Production transaction smoke was intentionally not synthesized; first real owner order is operational observation. PDF/physical print PASS is owner-confirmed Session50, not agent-inspected.
''')
s = read(packet + '/UNDO.md')
s = replace_once(s, '# Production undo — W1/W2 v40', '# Production undo — W1/W2 v41 / live Version5')
s += f'''\nCurrent release: `{revision}`; deployment5, same existing /exec URL, created2026-10-06 07:34 +07. Original durable migration request retains the v40 suffix and is DONE; do not change its ID or rerun with a new request. Version4 rollback remains a separate owner-only runtime choice and does not remove migrated metadata/history. See result.md and migration/replay verification for the completed native retry.\n'''
write(packet + '/UNDO.md', s)
write(packet + '/result.md', f'''# Session51 — production release CLOSED

W1/W2 v41 is LIVE as native deployment **Version5**, 2026-10-06 07:34 +07, existing [production URL]({live_url}). Exact `{revision}`.

[Native backup]({backup_url}) is Restricted/owner only with bound script; original exact stored-cell/source/settings/deployment/trigger snapshots are retained locally. Original sharing unchanged. Native copy R2 derived recalculation is not an exact frozen original export; use both evidence sets and UNDO.md.

PASS: release13 failure/retry groups; W2 fourteen CRM/retry groups; renderer six; Orders stale response; six root regressions; saved/reloaded13source hashes and root10hashes; native same migration ID/allocated identities attempt2DONE and25tab inert DONE replay; live read-only Orders/Cart/Sheets Label Tool. No synthetic production transaction. Print/PDF/physical PASS remains owner-confirmed Session50.

The native Table placeholder failure and large-source truncation were repaired and independently verified; details/failed attempts remain in implementation.md, changes.csv and before/close/review.md. No pending release blocker or new authorization needed; no P0/P1 restart, LAB or agent/model switch. Next ONE: {next_step}.
''')
write(packet + '/CONTINUE.md', f'''# Session51 CLOSED — current production v41 / Version5

Read 00 Docs/STATE.md first, then AGENTS/master §§2/5/5.2.1/9 and this packet. Production release/backup/migration/retry/replay/smoke complete; exact `{revision}`. One writer; preserve Meta/R2/FbAlbum/P1/history; never reopen old tests/fixtures automatically.

Next ONE: {next_step}. Do not initiate a fake Add/sale/order merely for monitoring. For a reported reproducible issue capture fresh source/export and original Request ID first, reconcile same intent, then make the smallest backed-up fix; no new ID/reset. Schema migration `prod-w1w2-schema-20261006-v40` is DONE and must remain intact.

Undo: UNDO.md; backup private native copy plus exact original shop-before.xlsx/source/settings. Never restore old data over later orders/SALES/CLIENT/stock/journal. Print/PDF/physical owner-confirmed Session50; no supplied artifact inspected. Full trace: result.md, review.md, implementation.md, verification.json and changes.csv.\n''')

# Current plan board, preserving all dated history.
rel = '00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md'
s = read(rel)
s = replace_once(s, '**P1 Add ติดตั้งแล้ว; งานที่เหลือจัดเป็น W1 → W2 → W3**', '**Session51: P1 + W1/W2 production LIVE v41 / Version5; W3 release CLOSED**')
lines = s.splitlines()
for i, line in enumerate(lines):
    if line.startswith('| P1 — LIVE ตาม Session34'):
        lines[i] = '| P1 — LIVE retained | Add ต่อเนื่อง/default New Arrival/retry เดิม | Paired v41 + Index/P1Journal; ADD REQUESTS preserved | Six root regressions PASS; no P1 runtime repair/restart or fake Add; first real Add observation remains operational |'
    elif line.startswith('| **1 - W1 CLOSED'):
        lines[i] = '| **1 · W1 LIVE production / CLOSED** | Cart → Pending → Cancel/Confirm sold; Orders | v41 includes accepted v38 guards/recovery; fresh Code v32 FB Album changes retained | Session51 full saved-source hashes/native schema/read-only live smoke PASS; prior isolated transaction evidence retained |'
    elif line.startswith('| **2 · W2 CLOSED'):
        lines[i] = '| **2 · W2 LIVE production / CLOSED** | CLIENT search/save, recipient, web/Sheets Label Print/Reprint | v41 shared native-table guard; same-ID legacy CLIENT migration DONE | Native A:F preservation/allocated ID retry/replay PASS; print checklist PASS owner-confirmed Session50 |'
    elif line.startswith('| **3 · W3 CLOSED'):
        lines[i] = '| **3 · W3 release CLOSED / Version5 LIVE** | Private backup + undo + installed workflows | Owner authorized production then owner-only backup; original /exec/access retained | W3-PROD-20261006-01/source-verification-final.json (13files), migration/replay verification, root regressions, ui-smoke.json, backup.png/smoke.png |'
s = '\n'.join(lines) + '\n'
old = '**Next ONE step:** No remaining work in the authorized local/test scope. Production release and real CLIENT migration are separate and await explicit scoped authorization; do not deploy automatically. See `04 Design Tools/logs/W2-PRINT-20261006-01/CONTINUE.md`.'
s = replace_once(s, old, '**Next ONE step:** ' + next_step + f'. See `{packet}/CONTINUE.md`.')
s = replace_once(s, '## 2. Baseline และหลักฐานที่ใช้ต่อ', '## 2. Historical baseline และหลักฐานที่ใช้ต่อ\n\nCurrent Session51 source v41/Version5 supersedes this dated Session34 baseline; root v31 files are stubs and their full pair is archived. Production tables/identities are installed; do not reuse the old not-installed statement as current status.')
s += '\n' + summary
write(rel, s)

rel = '00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md'
s = read(rel)
s = replace_once(s, 'จัดทำ: 2026-10-03 22:19:06 +0700 · Stream B · **P1 Add LIVE ตาม Session34; W1/W2/W3 ยังไม่ติดตั้ง**', f'จัดทำ: {now} · Stream B · **W1/W2 LIVE v41 / Version5; Session51 release CLOSED**')
s = replace_once(s, 'อ่าน HANDOFF Session35/หลักฐาน Session34 เท่าที่ต้องตรวจ', 'อ่าน HANDOFF Session51/หลักฐาน W3-PROD-20261006-01 เท่าที่ต้องตรวจ')
s = replace_once(s, 'ชุด local v31/v31 + Index/P1Journal. Runtime ร้าน last verified Session34 deployment4; exact hashes/IDs/backup/undo อยู่ `04 Design Tools/logs/P1-20261003-03/`.', f'ชุด local/live v41/v41 + shared helpers/Index; native deployment5 วันที่2026-10-06 07:34 +07. Exact hashes/IDs/private backup/undo อยู่ `{packet}/`; source auxiliariesเดิมไม่เปลี่ยนและlocal R2Uploadยังต่างจากlive.')
s = replace_once(s, '## 2. Runbook ที่เหลือ', '## 2. Acceptance runbook — completed W1/W2/W3\n\nSession51 actual production install/schema/readback/retry/deploy and smoke are CLOSED; table below preserves acceptance criteria. Next operational step is observing the first real owner order, not rerunning fixtures.')
s = replace_once(s, 'Add ด้านล่างอ้าง P1 v31 ที่ติดตั้งแล้ว; SHOP/Shopee/Orders/Client/Label เป็น **target UI ของ W1/W2** จน W3 release ผ่าน จึงยังใช้เป็นคำสั่งร้านปัจจุบันไม่ได้', 'ขั้นตอนด้านล่างใช้กับร้าน v41/Version5 ที่ติดตั้งแล้ว; Add behaviorเดิม retained ส่วน SHOP/Shopee/Orders/Client/Label เปิดใช้ Session51. Print/PDF/physical acceptance เป็น owner-confirmed Session50; ไม่ได้ตรวจ artifact ใหม่โดย agent')
s = replace_once(s, '**P1 v31 ร้าน: ขั้นตอนเมื่อผล Save ไม่ชัดเจน (ติดตั้งตาม Session34; behavior ทดสอบใน isolated project):**', '**P1 behavior retained ใน v41: ขั้นตอนเมื่อผล Save ไม่ชัดเจน (behavior ทดสอบใน isolated project; impact regression Session51 PASS):**')
s += f'''\n## Session51 production release / recovery\n\nNative CLIENT migration completed with the original fixed request and original allocated identities after exact Table-generated Column7/8 recovery. Do not edit CLIENT G:H IDs/revisions or delete technical order/request tables. After SOLD with CLIENT failure, recover the original CLIENT request only; Preview/Print/Reprint uses the committed order and must never Confirm sold again. Backup is owner-only; runtime Version4 rollback does not undo data. Follow `{packet}/UNDO.md` and export fresh before reconciliation; never replace later history with old XLSX. Next ONE: {next_step}.\n'''
write(rel, s)

rel = '03 Apps Script/Web App/README.md'
s = read(rel)
cut = s.find('## Session')
assert cut > 0
head, history = s[:cut], s[cut:]
head = head.replace('`Code_v31.gs`', '`Code_v41.gs`').replace('`WebApp_v31.gs`', '`WebApp_v41.gs`').replace('pairs with Code.gs v31', 'pairs with Code.gs v41')
head = replace_once(head, '(ติดตั้งและตรวจ source ร้าน 2026-10-03; deployment เดิม Version 4; คู่ v31/v31)', '(ติดตั้ง/อ่านกลับร้าน Session51 วันที่2026-10-06; deployment Version5; คู่ v41/v41)')
head = head.replace('(v20–v30 ถูกแทนที่แล้วเช่นกัน', '(v20–v31 ถูกแทนที่แล้วเช่นกัน')
head = replace_once(head, 'ตรรกะหลัก (v31 =', 'ตรรกะหลัก (v41 = accepted W1/W2 + fresh Code v32 FB Album changes + guarded native CLIENT metadata migration; v31 =')
rows = '''| `W1Orders.gs` | Cart/Orders/stock guards + durable same-ID transactions | Apps Script → `W1Orders.gs` |
| `W2Clients.gs` | CLIENT identities/search/save + separate CRM retry + committed recipient | Apps Script → `W2Clients.gs` |
| `LabelRenderer.html` | Canonical allowlisted 100×150mm renderer / CAUTION | Apps Script → `LabelRenderer.html` |
| `W2LabelUI.html` / `W2Suggest.html` | Shared label controls/customer suggestions | Apps Script → matching HTML files |
| `LabelDialog.html` | Native Sheets Label Tool | Apps Script → `LabelDialog.html` |
| `ReleaseMigration.gs` | Owner/exact production schema entrypoints; original schema request DONE | Apps Script → `ReleaseMigration.gs`; do not reset/run with new IDs |
'''
head = replace_once(head, '| `Index.test.js` |', rows + '| `Index.test.js` |')
start = head.index('P1 Add v31 พร้อมใช้:')
end = head.index('\n> ⚠️ แก้ไฟล์พวกนี้', start)
head = head[:start] + f'''W1/W2 production **v41 / Version5 LIVE**: full saved/reloaded13file LF hashes match the exact release, original auxiliary sources/manifest retained. Native migration recovered original request/allocated CLIENT IDs, A:F preserved, DONE replay unchanged. Six root impact regressions plus13migration/failure and14CRM/retry groups PASS; root10sources match revision. Previous full root31pair: `backup/pre-v41-20261006/`; root31 files are stubs. Private native backup + exact original exports/source/settings/undo: `../../{packet}/`.

หากผล Save ไม่ชัดเจน ใช้ Request ID เดิมและ `Check / retry request`; อย่าสร้างคำขอใหม่เพื่อเดาแก้. SOLD แล้ว CLIENT saveล้มเหลวให้ retry CRMเดิมเท่านั้น; Print/Reprintใช้orderเดิมไม่ขายซ้ำ. ดู [แผน](../../00%20Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md) และ [คู่มือ](../../00%20Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md). Native Table generated headers/root fix and UI evidence are in the release packet. Print/PDF/physical PASS remains owner-confirmed Session50; first real order is observation only.
''' + head[end:]
head = replace_once(head, '**ขายของ** → เว็บแอป: ใส่ตะกร้า → Confirm Sold (ได้ข้อความสรุปยอด + ลง SALES อัตโนมัติ)\nหรือกด Mark Sold ทีละเล่ม (ลง SALES เหมือนกัน)', '**ขายของ** → SHOP: ใส่ตะกร้า → Create order → ORDERS Pending → Confirm sold → final review/Client/Label; SHOPEE: CART → Confirm sold → final review. พิมพ์ซ้ำจาก orderเดิมโดยไม่ Confirm soldอีก')
s = head + history + f'\n## Session51 — current production v41 / Version5\n\nExact `{revision}`; paired root/local sources match saved native release. All prior Session36–50 claims above are dated history. Native backup owner-only; original URL/access/auxiliaries retained. Source/migration/replay/impact/UI PASS and private undo in `../../{packet}/`. Next ONE: {next_step}.\n'
write(rel, s)

rel = '00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md'
write(rel, read(rel) + '\n' + summary)
rel = 'CLAUDE.md'
write(rel, read(rel) + '''\n## Production native Table / release evidence lessons (2026-10-06)

- Extending native Sheets Tables may generate Column N headers. Accept only observed exact placeholders in an ARMED durable migration step with original business snapshot unchanged and all new metadata values AND formulas empty. Preserve original request ID/allocated identities/time across after-effect retry; reject surprising metadata/formulas. Keep isolated test guards intact and add exact owner/production guards separately.
- Large DOM value reads can truncate embedded fonts near200KB. Use full editor clipboard copy/save/reload, then independent LF-only SHA256 without trim before source acceptance. Preserve failed capture as diagnostic, not authoritative source.
- Native Sheet copies can inherit public/service-account sharing and recalculate external derived output. Verify sharing explicitly; owner-only restriction follows scoped authorization. Keep exact fresh original exports/source/settings beside the native bound-script copy; do not enable external access/automation on the baseline copy. Never restore old exports over subsequent history.
- Approval review quota failure is not execution. Retry through normal review after the user resumes and the quota is available; never bypass it. Record failed action/checkpoint and eventual native receipt. Test loaders must resolve actual HTML partials rather than weakening behavioral assertions or editing unrelated runtime code.
''')

rel = 'OWARI-MASTER-CONTEXT_EN_2026-09-13.md'
s = read(rel)
s = replace_once(s, 'last verified Session34 (2026-10-03) is Code/WebApp v31 + Index/P1Journal, deployment4.', 'last verified Session51 (2026-10-06) is paired Code/WebApp v41 + W1/W2/shared label helpers, deployment5.')
s = replace_once(s, 'Status for the current Add/Cart/Orders/Label project: P1 Add LIVE; W1 Cart/Orders/transactions, W2 CLIENT/Label, W3 acceptance/release remain.', 'Status for the current Add/Cart/Orders/Label project: P1 retained, W1/W2 LIVE v41, W3 release CLOSED Session51. Observe the first real owner order; do not create synthetic production transactions or rerun DONE schema migration.')
s = replace_once(s, '| Live back-office code | `03 Apps Script\\Web App\\Code_v20.gs` + `WebApp_v20.gs` | |', '| Live back-office code | STATE.md / Web App README; paired Code_v41.gs + WebApp_v41.gs with shared helpers | Session51 native deployment5 |')
write(rel, s)

rel = '04 Design Tools/logs/decisions_2026-10-06.csv'
s = read(rel)
import io
buf = io.StringIO(newline='')
w = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n')
for topic, status, decision, evidence in [
    ('Production authorization', 'CLOSED', 'Owner start with backup for undo authorizes bounded W1/W2 install/migration/deploy; local-only limit superseded for this release', 'User message + result.md'),
    ('Private native backup', 'CLOSED', 'Restricted owner only; copied service editors removed only from backup; original sharing unchanged', 'User explicit approval + backup-copy.json + backup.png'),
    ('Native CLIENT Table migration/retry', 'CLOSED', 'v41 exact native placeholder guard; original request-v40/allocated identities retained attempt2DONE; A:F preserved; DONE replay inert', 'migration-verification.json + replay-verification.json'),
    ('W3 production release', 'CLOSED', 'Paired41 deployed existing URL Version5 owner Only myself; source/impact/schema/live UI gates PASS; print PASS owner-confirmed', 'deployment-after.json + source-verification-final.json + root-regressions.json + ui-smoke.json'),
    ('First real owner order observation', 'OPEN', 'Operational observation only; no synthetic production sale or automatic task/monitor; no release blocker', 'CONTINUE.md + STATE.md')]:
    w.writerow(['2026-10-06', p.name, topic, status, decision, packet + '/' + evidence])
write(rel, s.rstrip() + '\n' + buf.getvalue())

rel = '00 Docs/STATE.md'
s = read(rel)
a = s.index('### 1. Add / Cart / Orders / Label')
b = s.index('### 2. Meta catalog feed', a)
section = f'''### 1. Add / Cart / Orders / Label (Stream B) — W1/W2 production LIVE; W3 release CLOSED
- Status: Session51 owner-authorized production backup/install/migration/retry/deploy complete. Paired v41, existing /exec Version5 created2026-10-06 07:34+07; owner/Only myself unchanged. One writer; no model switch/Astra-specific execution claim.
- Exact release: {revision}; root10files and native saved/reloaded13sources LF hashes PASS. Fresh pre-release Code v32 FB Album changes preserved; live FbAlbum/R2Upload/P1Journal and manifest unchanged; root31 full pair archived/stubbed.
- Backup: native OWARIN STORE — BACKUP before W1-W2 — 2026-10-06 / Sheet1OegftlJuM0glHqymOcMU0G3KhiF_AoYlNR3m1tDoZgY; Restricted owner-only after explicit approval. Exact original shop-before.xlsx/source/settings/triggers/deployment retained; nativecopy R2 derived recalculation differs. Original Sheet public-view unchanged; never enable backup external access/automation.
- Native migration03:26–03:29+07: prod-w1w2-schema-20261006-v40 attempt2DONE, same6allocated CLIENT IDs/time; original22tabs cells/formulas intact except precise metadata and CLIENT A:F unchanged. At checkpoint0orders/0lines/9events; subsequent25tab DONE replay zero changed cells. Historical migration counts only; do not carry them forward as current business counts.
- Root fix: native CLIENT Table creates Column7/8 on capacity extension; exact placeholders allowed only while headers ARMED, originalA:F matches and G:H values/formulas empty. Preserve request-v40/IDs/history; never reset/rerun with new ID or weaken test guards.
- Checks: release13failure groups, W2 fourteenCRM/retry + renderer6/Ordersstale checks, six root impact regressions PASS. P1 test loaders adapted to actual W2Suggest partial; runtime/P1 unchanged. Live read-only Inventory/OrdersALL/Cart and native Labels > Open Label Tool PASS; no fake production Add/order/sale/client mutation.
- Print/PDF/physical Print-Reprint: PASS — owner-confirmed Session50 “ผ่านหมดแล้ว”; prior deferral closed. No supplied PDF/photo/printer details or agent artifact inspection. W1 F05 repair/review CLOSED, never repeat; all dated W1/W2/local/test acceptance evidence retained.
- Next ONE: {next_step}. No background monitor/new chat/agent authorized; report/reproduce a real issue before reopening work.
- Scope: original project1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp / Sheet16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0. No P0/P1 restart or Back House LAB. Other streams remain prior snapshots.
- Evidence/undo: {packet}/ result/review/implementation/CONTINUE/verification/UNDO, source-verification-final/migration/replay/root-regressions/ui-smoke/native JSON/fresh XLSX/backup.png/smoke.png/changes.csv. Private settings stay local; rollback Version4 runtime is separate from data; never overwrite later history with old XLSX.
- Current HANDOFF_2026-10-06.md Session51; Session50 archived in _archive/handoffs_old/. Earlier Session48 labels.save reconciliation remains dated history; actor uncertainty retained, no old export restore.

'''
s = s[:a] + section + s[b:]
lines = s.splitlines()
lines[2] = f'จัดทำ: {now} — Stream B Session51 production release CLOSED v41/Version5; other streams retain prior snapshots.'
s = '\n'.join(lines) + '\n'
s = replace_once(s, 'Session41/42/43/44/45/46/47/48/49 handoffs are archived; Session50 is current.', 'Session41/42/43/44/45/46/47/48/49/50 handoffs are archived; Session51 is current.')
assert len(s.splitlines()) <= 80
write(rel, s)

write('00 Docs/HANDOFF_2026-10-06.md', f'''# HANDOFF — Session51 / Stream B — production release CLOSED

1. **Stream/rules:** B; master §§2/5/5.2.1/9. Owner authorized production with backup and owner-only copy; one writer, no agents/model switch/P0/P1 restart/LAB.
2. **Files / before → after:** `{app}` pair31/shared Index → exact paired41 + W1/W2/Label/ReleaseMigration helpers; old pair in backup/pre-v41-20261006, stubs retained. Native fresh Code32/webapp31 → v41 preserving FbAlbum changes/auxiliaries. Docs under `{root / '00 Docs'}`, Web App README, CLAUDE/master and decisions updated. Full paths/hash trace: `{p / 'changes.csv'}`.
3. **Source/data evidence:** Fresh original22tab exports and7before sources/settings/trigger/deploy captures2026-10-06. Native attempt2DONE03:26–03:29+07 preserves original6IDs/CLIENTA:F;25tab DONE replay unchanged. Saved13sources LF hashes PASS; deployment5 native receipt07:34+07 and read-only Orders/Cart/SheetsLabel smoke. Exact `{revision}`; source/export numbers are dated checkpoints. `{p / 'verification.json'}`.
4. **Decisions/limits:** Release LIVE same URL/ownerOnlymyself; [backup]({backup_url}) Restricted owner-only with bound script, plus exact original XLSX/source locally because copyR2derived values recalculate. No fake production transaction or new PDF/physical inspection; print PASS owner-confirmed Session50. NativeTable/large-source/test-loader issues repaired and recorded. Undo: `{p / 'UNDO.md'}`; Version4 runtime rollback does not undo data, never restore old workbook over later history.
5. **Next ONE:** {next_step}. No pending release blocker; preserve original DONE migration ID-v40, identities and request history. Full result `{p / 'result.md'}`; Session50 handoff archived.
''')

verification = {'result': 'PASS', 'closedAt': now, 'revision': revision,
                'deployment': 5, 'nativeDeploymentTime': '2026-10-06T07:34:00+07:00',
                'sourceFilesNative': 13, 'sourceFilesRoot': 10,
                'migration': 'original request-v40 attempt2DONE; same allocated IDs; CLIENT A:F unchanged',
                'doneReplay': '25 tabs zero changed stored cells/formulas',
                'tests': ['release13groups', 'W2 CRM14groups', 'renderer6checks', 'Orders stale response', 'six root impact regressions'],
                'uiSmoke': 'read-only live Inventory/Orders ALL/Cart/native Sheet Label Tool',
                'print': 'PASS owner-confirmed Session50; no agent output inspection',
                'backup': {'url': backup_url, 'access': 'Restricted one owner', 'limitation': 'copy R2 derived recalculation differs; exact original XLSX retained'},
                'documents': changed, 'stateLines': len(read('00 Docs/STATE.md').splitlines()),
                'nextOne': next_step}
write(packet + '/verification.json', json.dumps(verification, ensure_ascii=False, indent=2) + '\n')
assert all(sha((root / f).read_bytes()) == h for f, h in verification['documents'].items())
assert all(sha((app / name).read_bytes()) == h for name, h in rev['hashes'].items())
for f in ['backup.png', 'smoke.png', 'ui-smoke.json', 'shop-before.xlsx', 'shop-migrated.xlsx', 'shop-replayed.xlsx', 'deployment-after.json']:
    assert (p / f).is_file() and (p / f).stat().st_size > 0
assert (root / '00 Docs/_archive/handoffs_old/HANDOFF_2026-10-06_Session50.md').is_file()
log('SESSION-CLOSE-READBACK', revision, 'PASS', 'All required docs/decisions/board/STATE/HANDOFF/README/rules/source hashes verified; prior history/backups retained; evidence references exist')
print(json.dumps({'result': 'PASS', 'documents': len(changed), 'stateLines': verification['stateLines'], 'revision': revision}, ensure_ascii=False))
