const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname,root=path.resolve(dir,'../../..'),rev=JSON.parse(fs.readFileSync(dir+'/revision.json')).revision,stamp=new Date().toISOString();
const log=(id,action,result,recovery)=>fs.appendFileSync(dir+'/changes.csv',[stamp,'W1-20261005-01',id,action,result,recovery].map(v=>'"'+v.replaceAll('"','""')+'"').join(',')+'\n');
const summary=`Session43 checkpoint ${stamp}: focused v37 review found R7 strict binary decimal readback. Actual fresh isolated scratch export gives profit280.03 and subtotal0.3; v37 deterministic cent-readback adapter leaves NEEDS_REVIEW on first/retry. v38 bounded candidate built (${rev}): integer-cent new totals, canonical materialized historical totals, typed finite profit readback tolerance0.0000001baht in batch and legacy paths; exact formulas and immutable old hashes/payloads retained. Syntax PASS only; v38 behavioral tests and Google save/UI/export are NOT DONE. Google core remains v37, original tabs unchanged in first scratch export; final subtotal scratch export preservation check pending. Resume at CONTINUE.md with Sol/High; no source switch or model-specific sign-off claimed. No P0/P1 restart, production, LAB or W2 action.`;
log('CHECKPOINT-DRYRUN','STATE/plan/handoff/related docs -> current v38-local R7 checkpoint','Backups retained; historical evidence preserved','before/; candidate/backup/v37');
const extras=['00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md','00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md'];
for(const rel of extras){const out=dir+'/before/'+rel;assert(!fs.existsSync(out));fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(root+'/'+rel,out);fs.appendFileSync(root+'/'+rel,'\n\n## Session43 — R7 local checkpoint\n\n'+summary+'\n');}
let plan=fs.readFileSync(root+'/00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','utf8');
plan=plan.replace('**1 · W1 — v37 local/test acceptance PASS; Astra/High sign-off OPEN**','**1 · W1 — R7 decimal readback OPEN; v38 local draft**').replace('QA-B/C/D/E/F/G/K/L + regression ที่กระทบและ Google isolated final export ผ่าน; เหลือ focused Astra/High sign-off ก่อนถือว่า W1 ปิดครบ','v37 historical acceptance ผ่าน; focused review พบ R7 ทศนิยม; v38 syntax ผ่าน แต่ targeted failure/retry + Google decimal UI/export และ changed-diff review ยังไม่ผ่าน');
plan=plan.replace(/^\*\*ถัดไปเพียงหนึ่งงาน:\*\*.*$/m,'**ถัดไปเพียงหนึ่งงาน:** Sol / High ทำ R7 targeted decimal/failure/retry checks ของ local v38 ตาม `04 Design Tools/logs/W1-20261005-01/CONTINUE.md`; ผ่านแล้วจึง save/readback และ decimal UI/export ใน isolated test เดิม ต่อด้วย Astra/High focused changed-diff review. ไม่เริ่ม P0/P1 ใหม่ ไม่แตะร้าน/W2.');
fs.writeFileSync(root+'/00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md',plan+'\n\nSession43 checkpoint: '+summary+'\n');
let state=fs.readFileSync(root+'/00 Docs/STATE.md','utf8');state=state.replace(/จัดทำ: .*\n/,'จัดทำ: 2026-10-05 +07 — Stream B Session43 R7 checkpoint; other streams retain prior snapshots.\n');
const section=`### 1. Add / Cart / Orders / Label (Stream B) — P1 LIVE; W1 R7 OPEN
- Status: focused v37 review CHANGES REQUIRED for R7 decimal readback; v38 local candidate built, syntax PASS only. Google core still v37; no W1 sign-off.
- Next ONE step: Sol / High targeted decimal + failure/retry tests of v38 via \`04 Design Tools/logs/W1-20261005-01/CONTINUE.md\`; then scoped Google decimal UI/export and Astra/High changed-diff review. No P0/P1 restart.
- Local revision: ${rev}; four LF hashes in revision.json; paired Code_v38/WebApp_v38, shared W1Orders/Index. v37 backup retained.
- R7 evidence: review.cjs/review-results.json; fresh google-before.xlsx, google-decimal.xlsx/google-decimal-final.xlsx. Correct280.03 vs JS280.03000000000003; subtotal0.3 vs JS0.30000000000000004. Adapter replay fails v37; native transaction not run this phase.
- v38 change: cent totals and bounded typed profit readback in batch/legacy; formulas unchanged. Behavioral, corruption1cent, legacy intent/retry and real Google acceptance still OPEN.
- Historical Session42: F05 fixed-ID49-gap repair and v37 two-tab/lost-response/Final review/export PASS; \`W1-20261004-05/result.md\`/UNDO.md. Prior journals/hashes immutable.
- Environment: only project1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd / Sheet13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM; new scratch W1 DECIMAL REVIEW. URLs in new CONTINUE.md.
- Scope: one writer, local/test only; no production source/schema/data/save/run/deploy, LAB/W2. Production v31/deployment4 historical Session34.
- Rules: Pending reserves; Cancel own order; Instock only/Auction unavailable; SALES shipping=subsidy distinct customer shipping; CLIENT/Label later, price/Meta/R2 unchanged.
- Recovery: original exact ID/payload/allocated rows and old journals retained. Before backups in new package; never import a stale workbook over later events.
- History: current one-page HANDOFF_2026-10-05.md; Session42 handoff archived as _archive/handoffs_old/HANDOFF_2026-10-05_Session42.md; previous packages frozen.
- Model: active exact variant/effort not exposed; no switch claimed. Sol/High for R7 implementation/tests, Astra/High focused review.

`;
state=state.replace(/### 1\.[\s\S]*?(?=### 2\.)/,section).replace("Session41's 10-04 handoff is archived.","Session41's 10-04 and Session42's 10-05 handoffs are archived.");assert(state.split(/\r?\n/).length<=80);fs.writeFileSync(root+'/00 Docs/STATE.md',state);
fs.appendFileSync(root+'/03 Apps Script/Web App/README.md','\n\n## Session43 — current R7 candidate checkpoint\n\n'+summary+'\n\nCandidate table: `W1-20261005-01/candidate/Code_v38.gs` + `WebApp_v38.gs`, `W1Orders.gs`, shared unchanged `Index.html`; previous complete pair in `candidate/backup/v37/`, v37 stubs point to v38. Production table above remains historical v31.\n');
fs.appendFileSync(root+'/CLAUDE.md','\n\n## Monetary readback (added 2026-10-05, R7)\n\nFor cent-valued W1 totals use integer-cent addition, and compare numeric formula readback with a tightly bounded floating representation tolerance while preserving the exact formula and typed finite-number guard. Never tolerate a one-cent discrepancy or rewrite historical intent/hash. A Sheet mock using the same JS arithmetic as the implementation can hide this failure: test independent cent-exact readback and verify an actual isolated decimal flow before sign-off.\n');
fs.appendFileSync(root+'/04 Design Tools/logs/decisions_2026-10-05.csv',[['Focused v37 review completed CHANGES REQUIRED for R7; supersedes Session42 open review status','CLOSED','review-results.json; actual isolated scratch export; no model-specific sign-off'],['Continue existing one-writer local/test W1 scope; v38 R7 behavior/Google/review gates pending','OPEN','Owner continuation; model recommendation Sol/High then Astra/High']].map(([decision,status,source])=>[stamp,'W1-20261005-01',decision,status,source].map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
fs.writeFileSync(dir+'/implementation.md','# Session43 implementation checkpoint\n\nจัดทำ: 2026-10-05 +07\n\n'+summary+'\n\nScratch probe actions: fresh isolated backup; created W1 DECIMAL REVIEW; pasted Price/Cost/Subsidy/Profit and second subtotal probe. Evidence retained, no original-tab mutation in first export verification. Final export to google-decimal-final.xlsx, secondary preservation verification pending. No runtime Google source edit.\n');
fs.writeFileSync(dir+'/CONTINUE.md',`# CONTINUE — Stream B Session43 R7 checkpoint

จัดทำ: 2026-10-05 +07; one writer, master §§2/5/5.2.1/6/9.

${summary}

ONE NEXT STEP: finish targeted v38 tests using existing harness.cjs (adapted from frozen v37 harness). Test cent-exact formula readback390.10−100.05−10.02=280.03, .10+.20 subtotal=.30, integer control, negative/zero profit, typed errors and 1-cent corruption fail closed. Exercise legacy absent-format intent with historical binary subtotal, fixed-ID after-effect SALES/order failures, preservation of old journal rows, no duplicate SALES and no sibling bypass. Do not rerun unchanged broad batch/100-item timings.

Then stage sanitized test-runtime with current v38 pair/W1Orders, existing unchanged manifest and test-only W1Qa. Fresh source backup from exact editor BEFORE save, full LF readback afterwards. Only exact test project. Use a fresh isolated decimal fixture and normal UI Create/Final review/Confirm once, retain IDs; export fresh workbook and compare previous tabs/history/old Pending08. Focused review the small v37→v38 diff before claiming W1 closed. Historical tests stay dated; do not claim v38 broad tests were run.

- Sheet https://docs.google.com/spreadsheets/d/13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM/edit
- Project https://script.google.com/home/projects/1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd/edit
- /dev https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev
- Browser2 scratch tab7; use inventory/known URL if handle lost. Scratch retained as evidence. CUA docs restored this turn.
- New raw final scratch export google-decimal-final.xlsx: D2=280.03,C5=.3,D5=.3. verify-probe.py currently reads FIRST google-decimal.xlsx; adapt to verify final export too, normalize ArrayFormula as existing verifier does.
- Node C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe; Python analogous dependencies/python/python.exe. Default WindowsApps Python unusable.
- build-v38.cjs is one-shot ALREADY RUN: do not rerun (backup/archive guards). Candidate ${rev}; no Git repository.
- Avoid frozen package05 serve.cjs /proof, which overwrites Session42 evidence. Use distinct new-package readback/proof paths and guard backups. No server active here.

Recovery: new before/ docs; candidate/backup/v37 all four old files, old package05 Google source snapshots and result/UNDO. Local v38 can be reverted from backup before any save; Google still v37, scratch additive only. Never wipe/import old exports or journal rows. Prior F05 repair remains closed.
`);
fs.writeFileSync(root+'/00 Docs/HANDOFF_2026-10-05.md',`# HANDOFF — Session43 R7 checkpoint

จัดทำ: 2026-10-05 +07

1. **Stream/rules:** B W1; master §§2/5/5.2.1/6/9. Local candidate/exact isolated test, one writer; no P0/P1 restart, production, LAB or W2.
2. **Files before → after:** root C:\\Users\\JIN\\OneDrive\\Desktop\\etc\\OWARIN\\OWARIN STORE\\OWARIN STORE. 04 Design Tools/logs/W1-20261005-01/candidate: frozen v37 → v38 paired source with R7 cent totals/profit readback; backups + v37 stubs. Full revision in revision.json. 00 Docs/STATE.md/PLAN/IMPLEMENTATION-LOG/HANDBOOK,03 Apps Script/Web App/README.md,CLAUDE.md,decisions CSV now checkpoint; before/ backups. Session42 handoff moved to 00 Docs/_archive/handoffs_old/HANDOFF_2026-10-05_Session42.md.
3. **Data/evidence:** fresh isolated Google exports2026-10-05 in new package; scratch W1 DECIMAL REVIEW only. Correct profit280.03 and subtotal.30 roundtrip; v37 deterministic readback adapter reproduces NEEDS_REVIEW on same-ID retry. No actual decimal transaction yet. Review source/hash and v38 syntax verified.
4. **Not done/risk:** v38 behavioral/failure/retry checks, Google save/readback/decimal UI/export and final changed-diff review OPEN. Google core stays v37; W1 NOT COMPLETE. No production/LAB/W2 authorization. Model variant/effort not exposed, no switch claimed.
5. **ONE next step:** Sol/High finish targeted v38 R7 tests via new package CONTINUE.md; then scoped isolated Google gates and Astra/High changed-diff review. Preserve exact IDs/events/hashes; no stale workbook restore.
`);
log('CHECKPOINT','Docs/CSV/handbook/README/rules -> R7 current checkpoint','Saved and read back; W1 explicitly OPEN','before/; CONTINUE.md; archived Session42 handoff');
for(const rel of [...extras,'00 Docs/STATE.md','00 Docs/HANDOFF_2026-10-05.md','00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md','03 Apps Script/Web App/README.md','CLAUDE.md'])assert(fs.readFileSync(root+'/'+rel,'utf8').includes('R7'),rel);
console.log('PASS checkpoint readback; STATE '+state.split(/\r?\n/).length+' lines; '+rev);
