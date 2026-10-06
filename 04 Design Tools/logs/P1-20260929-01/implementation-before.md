# OWARIN — Implementation log: Add / Cart / Orders / Label

Created 2026-09-28 · timezone Asia/Bangkok · Stream B

## Current status

**P0 read-only audit recorded; implementation not started.** ตรวจ source จริงและผูก /dev กับ project/sheet แล้ว รัน diagnostic ใน Node VM ด้วยข้อมูลจำลอง; ยังไม่ผ่าน Google staging/runtime reproduction และยังไม่ยืนยันต้นเหตุเหตุการณ์ Add ที่ผู้ใช้พบ ดู Change P0-20260928-01 ท้ายไฟล์ ไม่มีการ Save item, แก้ CLIENT, เปลี่ยน stock, บันทึก SALES หรือ deploy

| Phase | Status | Evidence / next action |
|---|---|---|
| Planning | DONE | PLAN + HANDBOOK + log นี้; ตรวจ source จุดเชื่อมที่เกี่ยวข้อง |
| P0 baseline/reproduction | AUDITED — exit gates open | Source/schema/hash + offline reproduction ตรวจแล้ว; Google test copy/runtime และ access decision ยังค้าง ดู P0-20260928-01 |
| P1 Add item | NOT STARTED | QA-A |
| P2 Inventory/Cart/caution | NOT STARTED | QA-B/I |
| P3 Transactions | NOT STARTED | QA-C/D/E/F/G/K |
| P4 Focused review | NOT STARTED | exact P3 diff + failure tests |
| P5 Orders/CRM/Label | NOT STARTED | QA-H/I/J/K |
| P6 Acceptance/release | NOT STARTED | staging/runtime/print/regression/owner release |

## Decision log

| ID | Decision | Authority / state |
|---|---|---|
| D01 | Target คือเว็บ BACK-OFFICE /dev เดิม + sheet 16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0 | ผู้ใช้ตอบยืนยัน 2026-09-28 |
| D02 | Create order → Pending ต้องกันสินค้า | ผู้ใช้ตอบยืนยัน 2026-09-28 |
| D03 | Confirm sold เปิด review/Label แล้ว commit ที่ Save & confirm sold; มี Label later | Assistant recommendation ตามที่ผู้ใช้ขอให้ประเมิน ยังไม่ใช่ production approval |
| D04 | Cart primary เปลี่ยน Create order → Confirm sold เมื่อ channel Shopee; รวม 4 ปุ่ม | ข้อเสนอเพื่อรองรับคำขอทั้งสองส่วน |
| D05 | ใช้ CLIENT เดิม ไม่สร้าง CUSTOMERS ซ้ำ | live metadata + user requirement |
| D06 | Facebook Account อยู่ CRM/search เท่านั้น ไม่เข้า printable payload | user requirement |
| D07 | Cancel คืนสถานะเดิมเฉพาะ claim ของ order; conflict ไม่ overwrite | proposed implementation invariant |
| D08 | ไม่เพิ่ม payments/refunds/tracking/automatic external sync | scope control; แบบร่างเก่าไม่ใช่คำขอใหม่ |
| D09 | มีหลาย Pending orders ได้; technical request pending ไม่ใช่ business Pending | proposed transaction invariant |

## Findings log

| ID | Finding | Confidence / action |
|---|---|---|
| F01 | Live Add dialog เปิดใหม่เป็น New Arrival | OBSERVED ที่ /dev วันที่ 28 ก.ย.; ยังไม่ทดสอบหลัง save ซ้ำ |
| F02 | local Add success มี reset แต่ reset อยู่หลัง cache/render/banner | VERIFIED SOURCE; exception เป็น hypothesis ของ bug ไม่ใช่ root cause ที่ reproduce แล้ว |
| F03 | _apiInvAdd/addInventoryRow fallback Instock | VERIFIED LOCAL; verify installed version แล้วแก้ default ทุก Add entry |
| F04 | _tryWrite swallow error และคืน false | VERIFIED LOCAL; critical mutation ต้องตรวจ false/readback |
| F05 | current numbered WebApp ไม่มี durable sale request journal | VERIFIED LOCAL; ต้องอ่าน deployed source ก่อนสรุป production |
| F06 | candidate SalesService มี replay journal | VERIFIED LOCAL REFERENCE ONLY; ราคา/ค่าส่ง/Runtime ต่างจาก current |
| F07 | current _nextOrderId scan SALES อย่างเดียว | VERIFIED LOCAL; เพิ่ม ORDERS/intent ใน allocator |
| F08 | footer padding .7mm 0 และ source caution เก่าสะกด COUTION | VERIFIED SOURCE + user image; v2 asset มีให้ใช้ต่อ |
| F09 | CLIENT มี A:F ตาม spec; ไม่มี ORDERS ใน metadata รอบอ่าน | LIVE SCHEMA READ; ไม่อ่าน customer records มาเก็บใน docs |
| F10 | SALES G2 เป็น ARRAYFORMULA | LIVE FORMULA READ; ห้ามเขียนทับ spill โดยไม่ออกแบบ |
| F11 | Code_v27/WebApp_v25 ไม่ตรงกฎ paired version | VERIFIED LOCAL/README; reconcile P0 |
| F12 | คำอธิบาย Shopee UI กับ server สูตรคนละแบบ | VERIFIED LOCAL; decision gate ก่อน money changes |

## Baseline hashes — local files only

อ่าน SHA256 วันที่ 2026-09-28 เวลา 20:03 +07:00; hashes ไม่ใช่หลักฐานว่า source เหล่านี้ติดตั้งครบใน Apps Script

Base: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/`

| Relative path | SHA256 |
|---|---|
| 03 Apps Script/Web App/Code_v27.gs | EF8C6D347E7EC4235AEFFDB6EED2925C4BFA7F1E36726E60D61F2466F58A6832 |
| 03 Apps Script/Web App/WebApp_v25.gs | 2CEE59212CC5DB464330EE91E476E35D8DAF89700D1CE3D056C61BC2099E3D0A |
| 03 Apps Script/Web App/Index.html | 0F7C099C761DCE35DFC27D562AA98D3A34EF4B6A0A6224670BB18ED61E384FD3 |
| 03 Apps Script/Web App/Index.test.js | 3BAAC3C2181C044E9976C22AB79E1326F4963FF45910855B6DE9D31EABE1AB99 |
| 03 Apps Script/Backoffice Update/SalesService.gs | B10991C01FFC22C25E3B89C008A814162883F7BF389647632A33950971C1F28C |
| 04 Design Tools/OWARIN — LABEL TOOL.html | A16290A405015B6EA3966C084B87AE6AF345A79B3AF109B62A6DDD60896A4DB7 |
| 04 Design Tools/caution-v2.png | C1F7F89A3513D72D05AD34152C8554ED346CD6F75F82308302E9B1A50C4200DB |

## Evidence boundaries

- Live spreadsheet metadata และ targeted headers/formulas อ่านวันที่ 2026-09-28 ผ่าน Google Drive/Sheets connector; ไม่ใช่ full inventory/customer export
- เว็บผู้ใช้เปิดสำเร็จ → + Add item → Status New Arrival → Close โดยไม่ Save; ไม่ยืนยัน root cause หรือ sequential-save behavior
- รูปผู้ใช้: caution spelling/spacing และ collapsed inventory ที่ราคาไม่มีปุ่ม cart
- เปิด caution-v2.png ตรวจแล้ว; ไม่ได้แก้ asset หรือยืนยัน physical print
- อ่าน source references ใน plan §2; เอกสารเก่าเป็น historical proposal ไม่ใช่สิทธิ์ขยายงาน
- ไม่มี runtime regression test รอบนี้ เพราะไม่มี source change; ตรวจเอกสาร/readback/hash แบบสัดส่วนกับงาน
- ไม่มี subagents, new chats, model switch, automation หรือ global config changes

## Documentation change log

Dry-run ก่อนเขียน: ยืนยันชื่อ PLAN/HANDBOOK ใหม่ยังไม่มี; preserve HANDOFF_2026-09-28 เดิมและ append session ใหม่; reference search พบ ORDERS design เดิมยังมีผู้ใช้ จึงไม่มี archive move

| Before | After |
|---|---|
| ไม่มีแผนที่รวมคำขอ 28 ก.ย. | PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md |
| ไม่มีคู่มือส่งต่องานชุดนี้ | HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md |
| ไม่มี log งานชุดนี้ | IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md |
| HANDOFF วันนี้มี session Sheet/Facebook design | เพิ่ม session Add/Cart/Orders/Label ท้ายไฟล์โดยไม่ลบของเดิม |
| ไม่มี CSV log งานชุดนี้ | 04 Design Tools/logs/add_cart_orders_label_plan_20260928.csv |

## Append template for the next implementer

Documentation verification 2026-09-28: readback ทั้งสามเอกสารสำเร็จ ไม่มี Unicode replacement character, requirement map R01–R13 ครบ, HANDOFF session แรกยังอยู่และมี session ใหม่, CSV parse สำเร็จ; SHA256 ของ Code_v27.gs, WebApp_v25.gs, Index.html, Label Tool และ caution-v2.png ตรง baseline ทุกไฟล์ ยืนยันว่า source/asset เหล่านี้ไม่ได้ถูกแก้ในงานวางแผนนี้

```text
Timestamp (+07:00):
Phase / writer / actual model if verifiable:
User-authorized scope:
Baseline revision → final revision:
Files changed (absolute paths):
Before → after:
Migration dry-run / target sheet ID:
Tests executed / exact command / result / evidence:
Failures injected / retry outcomes:
Review revision / findings resolved:
Live writes / deployment:
Open decisions or limitations:
One next step / recommended model:
```

ห้ามเปลี่ยน NOT STARTED เป็น DONE จากการมี code/เอกสารเท่านั้น ต้องแนบผล verification ตาม gate และห้ามเปลี่ยน status business เพียงเพื่อให้ tests ผ่าน

## Change DOC-20260928-02 — mandatory logging clarification

- Authority: ผู้ใช้ย้ำให้ทำ log ทุกครั้งที่ update/แก้ไขเพื่อย้อนตรวจข้อผิดพลาด
- Scope: documentation only; Live mutations: none; implementation phases ยัง NOT STARTED
- Before → after: แผนมี journal/phase log กระจายอยู่ → เพิ่ม R14, QA-L และ §15 ที่บังคับ development + runtime audit พร้อม error/retry/recovery
- Files: PLAN เพิ่ม logging contract; HANDBOOK เพิ่ม §9 runbook/prompt; log นี้เพิ่มรายการ; HANDOFF append คำสั่งเจ้าของ; CSV append before→after โดยคงประวัติเดิม
- Recovery: เป็น additive documentation change; หากปรับข้อกำหนดภายหลังให้เพิ่ม revision/event เชื่อม DOC-20260928-02 ไม่ลบคำสั่งเจ้าของหรือรายการนี้
- Required runtime fields: event/request/change ID, time, actor เมื่อระบุได้, action/entity, before→after หรือ restricted snapshot reference, result, error/stage, attempt, app version, recovery reference
- Runtime logging ยังไม่ได้ติดตั้ง; ไม่มี code/Sheet writes/deployment และไม่มี runtime tests ในรอบนี้

## Change P0-20260928-01 — installed-source / schema / offline reproduction audit

Recorded 2026-09-28, Asia/Bangkok. Stream B; master context §§2,5,6,9; one writer (Codex). Actual model/effort: Unknown from available session controls; recommended P0 model: GPT-6 Astra / High. No agents/chats created. Scope: read shop source/data; create local diagnostic evidence; update documents only.

### 1. Authority, baseline and evidence

- User-authorized scope: P0 only; no application-source/schema/business-data edits or deployment. Runtime Request ID: N/A — no live mutation request created. Change ID is a development/audit ID, not a runtime request ID.
- Target /dev: https://script.google.com/macros/s/AKfycbwncq04Ab1-ZvB_Q293w49qctLABh_JLQ_vSCLdChlR/dev
- Verified script ID: `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp` (`webapp`). Opened Sheet → Extensions → Apps Script; the resulting tab and Project Overview both identify the main sheet. Deploy → Test deployments explicitly shows the exact Head deployment ID and /dev above. Merely seeing the same project title was not used as proof.
- Verified container: `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. Project settings: Bangkok timezone; V8 enabled. Hidden manifest was not enabled/edited; Script Properties were not changed or included in final evidence.
- Captured all five editor-visible files using Select All → Copy; no Save/Run clicked. Saved verbatim clipboard text as UTF-8. Clipboard changes line endings to CRLF: compare both raw capture SHA256 and LF-normalized SHA256, not raw hash alone.
- Evidence directory E = `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/04 Design Tools/logs/P0-20260928-01/`. `source-comparison.json` contains exact hashes; `live-source/` contains recoverable source copies; `deployment-link.txt`, `project-overview.txt`, `project-settings-safe.txt`, `triggers.txt` ground the project and configuration.
- Fresh full XLSX export via Google Drive connector, refreshed and downloaded 2026-09-28 around 21:13 +07. Local restricted-to-user temp location: `C:/Users/JIN/AppData/Local/Temp/OWARIN-P0-20260928-01-latest.xlsx`; SHA256 `31B1435D3A3DDAD05380E29009D0D7E9435EEA2560A3C6C6D584BF7FA15A7DE2`. It is not copied into project evidence because it may contain customer data; preserve/re-export before a future migration because temp retention is not guaranteed. No customer records are printed in this report.
- Live metadata + bounded headers/formulas/status reads are saved in E, with XLSX structural summaries. Export conversion does not preserve every native Google Table constraint; it is not a substitute for staging writes/readback.
- No Git repository at the task root; use SHA256 instead of inventing a commit. Archive preflight: older design remains referenced by the plan/status documents; no file demonstrated obsolete for this audit, so no moves/deletions. Independent OWARIN Back House LAB was not opened or modified.

| Captured file | Compared local file | Result after CRLF → LF only |
|---|---|---|
| Code.gs | 03 Apps Script/Web App/Code_v27.gs | Identical; LF SHA256 EF8C6D347E7EC4235AEFFDB6EED2925C4BFA7F1E36726E60D61F2466F58A6832 |
| webapp.gs | 03 Apps Script/Web App/WebApp_v25.gs | Identical; LF SHA256 2CEE59212CC5DB464330EE91E476E35D8DAF89700D1CE3D056C61BC2099E3D0A |
| Index.html | 03 Apps Script/Web App/Index.html | Identical; LF SHA256 0F7C099C761DCE35DFC27D562AA98D3A34EF4B6A0A6224670BB18ED61E384FD3 |
| FbAlbum.gs | 03 Apps Script/FbAlbum.gs | Different; live LF SHA256 EE1DF2BD5B2D55C004091711E7CA2356573F9F100B2701D1E1A8839CC2C3C558; diff saved |
| R2Upload.gs | 03 Apps Script/Web App/R2Upload.gs | Different; live LF SHA256 A19439F5EDF7233CE96012A51FCCAF981FC3FAE5AC5995BD264D876991901D65; diff saved |

The installed pair really is Code v27 / webapp v25; this is not just a README typo. Do not renumber or upload in P0. Installed FbAlbum includes `_fbaOriginalIndex` and other differences; installed R2 is hybrid-v3 with renamed helpers, whereas local is v4 (including batch count/hash and stronger readback). Preserve installed add-ons; do not overwrite with a local whole-project bundle. Existing `_colLetter` declarations collide between Code/webapp but match for valid columns 1..16384 in the diagnostic; R2 repeats GGB/MAG constants with identical values. This is not proof that arbitrary future helper collisions are safe.

### 2. Owner decisions recorded in this P0

| ID | Confirmed rule / effect |
|---|---|
| D10 | User explicitly answered: SALES Shipping Cost = **ส่วนค่าส่งที่ร้านช่วยออก** (shop subsidy), not total carrier expense. Keep customer-charged shipping separate. The plan's proposed Carrier Expense field must not be mapped blindly to SALES Shipping Cost; name/define Shipping Subsidy before P3. |
| D11 | User explicitly answered: Auction = **ขายประมูลจบแล้ว ห้ามขายซ้ำ**. Treat as terminal/unavailable in every sale entry point, even though current Cart offers an override. |
| D12 | Pending reserves stock; Cancel restores prior status only for the same order's owned claim, with conflict detection. User requirement, not installed behavior. |
| D13 | Continue using CLIENT; Facebook Account is search/storage only, excluded from printable payload. Confirm sold → Review/Label → Save & confirm sold plus Label later remains the proposed target flow; no deployment authorization implied. |

### 3. Verified schema, price and status contracts

- CLIENT: native table `CLIENT`, A1:F1000 in export; A:F = Facebook Account, Name, Phone Number, Address, Post Code, Note. No Client ID/Updated At columns in the live grid. No clients/labels/orders routes in installed API. Do not create CUSTOMERS or print internal Note/Facebook.
- Inventory: GGB table `Table1` A1:AF1615, MAG table `Table2` A1:AD854 in export. Product ID is B, Status C; GGB Cost K / Price M / Marketplace O; MAG Cost I / Price K / Marketplace M. Full header reads show no Item UID column. Export scan of named item rows finds no blank/formula/duplicate PID within either source; this does **not** make PID immutable or guarantee future uniqueness.
- Observed status values: GGB Instock/Auction/Sold/Hold; MAG Instock/Sold/Hold. New Arrival exists in UI/source but was not present among named inventory rows in this export. Only Instock is the planned sale-eligible state; legacy/manual Hold must not be claimed or released as if owned by a new order.
- SALES: `REPORT` table A1:I52 with totals row in export; headers Order ID, Item Name Sold, Order date, Cost, Price, Shipping Cost, Net Profit, Note, Product ID. Ledger data/formulas extend beyond that table to row 84 in this snapshot. G2 is live ARRAYFORMULA over E2:E51 / D2:D51 / F2:F51; export marks spill G2:G51; G52:G84 also contain formulas. Current append-after-last-row would be outside that spill; **no current spill write failure was reproduced**. Migration/backfill must not write per-row formulas inside G2:G51, and must account for totals/table bounds.
- Live marketplace formulas: `MAX(60,CEILING((Price+50)/0.7,10))`; server `_priceToBase` and UI `shopeeToBase` both use `round(enteredPrice*0.7-50)`. The Cart hint at Index:358 and webapp header still say `÷1.2−50`: stale wording, not the actual executed formula. Constants are the shop's current code contract, not a claim about Shopee's current external fee schedule.
- Synthetic example: entered Shopee 500 → ledger base 300; with cost 100 and shop subsidy 0, ledger profit is 200. With subsidy 20 it is 180. Whether a Shopee subsidy is additional to the built-in 50 needs explicit labeling to avoid charging it twice; keep current calculation unchanged until implementation policy is reviewed.
- Customer shipping formula: `min(50+10*(n-1),100)` for n>0; 0 for no items. Cart quote uses customer shipping (`cShip`), whereas Confirm submits shop subsidy (`cShipShop`). Single Shopee UI forces subsidy to 0; cart allows it; direct API omitted shipping defaults to customer-style automatic shipping. That API default conflicts with D10 and must be explicit in the new contract.
- Selecting Shopee in Cart changes the channel/hint only; it does not replace SHOP-default line prices with marketplace prices (Index:1540–1565). New UX must expose price basis; e.g. unchanged 300 is converted to ledger 160. This is source-traced, not a shop sale executed by P0.
- Numeric parsing uses parseFloat: diagnostic accepts `390abc` as 390 and maps Shopee 60 to ledger -8. Add's `data.cost || ""` / price/original branches discard numeric zero. Validate at the server boundary before P3; do not silently change money semantics during P1 UI work.
- Protected sheets & ranges UI showed the empty-state prompt; XLSX exports no sheetProtection. Native per-column types are only partially visible through connector/export, so their exact write restrictions remain a Google staging gate. Do not convert Tables to ranges as an audit shortcut.
- **Access finding:** fresh Drive permission metadata confirms `anyone / reader / allowFileDiscovery=false`; Sheets UI says Anyone with the link. CLIENT is in that workbook. No anonymous/unauthorized-user penetration test was performed; existing workbook link visibility itself must be reviewed before adding CRM/PII. No permissions were changed. Evidence: `sharing-metadata.json`, `protection-ui.txt`.

### 4. Installed write paths / reservation bypass map

All paths below refer to E/live-source unless stated otherwise. No installed shared reservation owner guard or sale request journal was found across all captured files; PID CHANGES and R2 queue/request IDs are unrelated to a durable sale/add audit trail. No runtime AUDIT LOG claim is made; QA-L has not passed.

| Entry/path | Verified behavior and consequence |
|---|---|
| Index mSave → api inventory.add → `_apiInvAdd` (webapp:172) → `addInventoryRow` (Code:2041) | Server defaults Instock; accepts explicit statuses. Core locks its append but ignores `_tryWrite=false` and returns success. Extra Type write/readback occur after core lock and use returned row number; concurrent sort/mutation risk remains a hypothesis, not a race reproduced here. `subGenre` sent by UI is not forwarded/written by this Add path. |
| Cart → sales.confirm (webapp:596) | Script lock; resolves by unique source+SKU; only Sold is rejected. Hold/Auction/New Arrival pass. Duplicate lines are not rejected. Writes ledger before inventory status; no durable intent/replay. |
| Single Mark Sold → inventory.markSold (webapp:277) | Only Sold rejected; writes Price/Status/Sold Date first, catches ledger error into `sales.error`. A partial sale can look sold while ledger is missing. |
| Edit/revert → inventory.update (webapp:229; Index:1241) | Accepts status/identity changes directly, including releasing Hold or editing to Sold without ledger/owner check. Revert sets Instock and clears Sold Date, not an order-aware cancellation. |
| Direct callable `addInventoryRow` | Public function independent of api route; a future guard only in `_route` would leave this Add entry unprotected. Internal underscore helpers are not assumed directly callable from client, but editor/menu/trigger callers still need review. |
| Manual Sheet edit → onEdit (Code:298) | Handles top-left row/column, stamps Sold Date and recalculates SKU; no sale journal or reservation owner check, no common script lock. Does not log complete before/after or create SALES. Reverting status directly does not apply the same date behavior as web update. Multi-cell edits/external API edits are not fully audited. |
| tools.suspectAuction / sp2FlagSuspectAuction → `_sp2SuspectAuctionCore` (Code:1528) | Converts selected Sold rows to Auction and clears Sold Date. Rewrites whole status/date ranges from a snapshot; must coordinate with reservation/transaction writes. Auction remains terminal under D11. |
| tools.sortInventory / `sortInventory` (webapp:497 / Code:2005) | Rewrites full rows; web wrapper locks but Sheet menu does not use the same wrapper. Row number cannot be identity; full-range rewrites need conflict/readback protection. |
| `_recalcRow`, regenerateAllSKUs, forceRegenerateAllSKUs (Code:367,2129,2194) | Name/publisher/condition can change PID; fill-missing helper differs from forced regeneration. PID CHANGES is best-effort and not a stable physical-copy ID. Shared source+SKU lookup rejects duplicates but requires refresh after identity edits. |
| BOOKING save/match | Queue of customer/title requests; not a physical-item reservation. Its Status column is not inventory ownership; no stock claim is made. |
| FbAlbum `_fbaRun`; `_metaInScope`/catalogue/export; R2 snapshot | Select Instock for relevant publication/export paths. Existing posts/listings are not withdrawn by a Hold, and this audit sent no Meta/Shopee/R2 mutations. External oversell prevention is not installed by changing inventory alone. |

Installed trigger UI shows Head `fbaPostBatch` (time-based) and Head `onEdit` (spreadsheet edit). Simple onEdit also exists; do not assume the installable-trigger list exhausts manual/other-owner/external writers. Trigger error summaries were visible but not diagnosed in this P0; no trigger was run, installed, or disabled.

Order IDs: `_nextOrderId` (webapp:567) reads SALES from row 3 using script timezone, formats OWA-YYYYMMDD-NN, and supports >99. It does not reserve the number, inspect ORDERS/intents, or strictly validate suffixes (`parseInt`). `_appendSalesRows` and cart call it inside their caller's script lock, which serializes those paths but does not prevent a failed intent/manual edit from reusing/skipping numbers. New Pending needs allocation recorded durably under the same transaction lock. No ORDERS / ORDER LINES / ORDER REQUESTS tabs were present in live metadata.

### 5. Reproduction executed safely

Environment: Node v24.14.0; immutable captured source loaded in Node VM; minimal fake DOM + in-memory Sheets, synthetic names/SKUs only, no network/Google services. No separate Apps Script test deployment was created because this round excludes deployment. The test checks baseline behavior; a PASS here can confirm a defect, **not** certify acceptance.

Exact commands from the project root:

```powershell
node '04 Design Tools\logs\P0-20260928-01\checks\p0-repro.cjs'
node '03 Apps Script\Web App\Index.test.js'
& 'C:\Users\JIN\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' '04 Design Tools\logs\P0-20260928-01\checks\inspect-export.py'
```

- 17 diagnostic checks pass on attempt 2; results in `checks/p0-repro-results.json` and `checks/attempt-2.txt`. Existing Index smoke passes. Four .gs files load, inline Index scripts compile. No new dependency/framework installed.
- ADD-01/02: 20 sequential successful callbacks, alternating GGB/MAG, reset fields to blank/New Arrival; rejected server response keeps input and enables Save.
- ADD-03: injected render error after server success prevents reset and displays generic error. **Mechanism reproduced; actual production exception/root cause not established.**
- ADD-04: suggestion closure survives `fillForm`; keyboard submission without blur followed by Down/Enter restores a previous title in the DOM mock. Needs real browser test-copy confirmation for focus/timer behavior.
- ADD-05: double-click in-flight is blocked, but closing/reopening Add and entering a new draft before old response lets the old callback erase the new draft. Inputs/source/close remain usable while Saving; timer cleanup is not part of reset.
- ADD-06/07: injected Status write failure leaves partial row yet core returns success; omitted status defaults Instock. No safe timeout replay ID exists for Add.
- RES-01/02: captured sales paths consume Hold/Auction/New Arrival and edit can release Hold without ownership; confirmed against synthetic Sheets.
- SALE-01/02/03: duplicate cart payload writes duplicate ledger lines; failure at Status after SALES leaves a line and retry creates another Order ID/line; single sale can return Sold plus ledger error.
- ID-01/02: >99 works; allocations without an intervening SALES row return the same ID; duplicate SKU lookup rejects ambiguous rows.
- MONEY-01/SOURCE-01/02: money examples and syntax/collision checks above. No real concurrency, Google Table failure, physical print, access-denial test, or full QA-A/QA-C–L acceptance is claimed.

Google test-copy reproduction to execute next (not performed): use a separate synthetic spreadsheet + separate bound script with this captured five-file baseline; record both IDs and assert neither equals shop IDs. Replace/omit actual account/bank/Meta configuration, do not install external-post triggers, and verify all mutation targets are the test sheet before any Add. Run 20 Add sequences with source switches, keyboard/mouse suggestions, blur timers, empty/zero price, and close/reopen during Saving; inject render error and lost-response/partial-write conditions; capture browser console and sheet readback. Never paste test items into the shop or use independent Back House LAB. Any required test deployment must be separately within the next authorized phase.

### 6. Error / retry / recovery record

- Source capture attempt used provider tab ID with the tabs API → `Expected a positive integer`; retry used observed tab ID 4 and succeeded. No editor mutation.
- Local export download attempt 1 → socket access restricted. Read-only escalation allowed, attempt 2 → signed export URL expired; generated a fresh export and downloaded immediately, attempt 3 succeeded. No automatic approval rejection, no source/data write. Signed URLs are not retained in docs.
- Diagnostic attempt 1 failed the assumption “zero helper collisions”: found `_colLetter` in Code/webapp. Read both implementations; attempt 2 records the collision and compares output for columns 1..16384. Application source unchanged. `checks/attempt-1.txt` retains the failure; harness correction is recorded as an evidence-only change.
- Export extraction attempt 1 could not JSON-serialize openpyxl ArrayFormula. Retry extracts `.text`/`.ref` and succeeds; no workbook save. The original Google ARRAYFORMULA is preserved separately in sheet-headers-formulas.json.
- Settings snapshot initial broad filter matched a property-value line; narrowed immediately to explicit timezone/runtime/manifest/ID fields. Final project-settings-safe.txt excludes property values. No secrets are retained in final evidence/CSV or repeated in this report.
- Runtime recovery attempted: none (no shop mutation). Synthetic retries and their unsafe outcomes are in the diagnostic. Do not interpret a diagnostic success as recovery of any real order.

### 7. Before → after, recovery and next gate

Before: planning-only log + prior two HANDOFF sessions. After: this audit, owner decisions, exact source mapping, schema/permission evidence and offline checks; P0 status AUDITED with gates open. Application source hashes remain unchanged; deployment version unchanged. Old sessions remain intact.

Backups: E/before contains the pre-update Implementation log and HANDOFF; local-baseline.json identifies their SHA256. Recovery for docs: compare current file with that backup and remove/revise only this Change ID's sections/status edits; do not blindly restore over later sessions. Every evidence file is new under E; changes.csv records attempts/outcomes and final manifest.json records hashes. Do not use a source-only rollback to pretend it restores business state; no such rollback is needed here.

Open gates / decisions:

1. Actual Add production trigger is still unconfirmed. Finish browser + Google runtime reproduction in an isolated test copy; mocks do not prove Google Tables, timers, script concurrency or network behavior.
2. Before CRM implementation, owner must decide the appropriate restricted access for the main workbook/CLIENT. Existing anyone-reader sharing cannot satisfy the planned privacy gate by application code alone; no sharing change authorized/executed in P0.
3. Before P3, make Shipping Subsidy explicit in schema/API and define Shopee additional subsidy behavior; D10/D11 are resolved and must not be asked again. Confirm manual-Hold/conflict recovery and managed-field protection policy; preserve only-Instock availability and order-owned cancel.
4. Native Table column types, exact live permission-denial behavior and hidden manifest scopes require staging/native verification; exported metadata alone is insufficient. No runtime journal/AUDIT LOG is installed or accepted.

One next step: isolated Google test-copy reproduction against these hashes, then P1 Add/reset (GPT-5.6 Sol / Medium; use High for append/retry/partial-write logic). Use GPT-6 Astra / High only if consequential diagnosis/design uncertainty remains; P3 transaction implementation uses GPT-5.6 Sol / High followed by focused Astra / High review. One writer; no agents/new chats/global model changes. P1–P6 and deployment still require their intended authorized scope; this P0 did not start them.

### Close verification — P0-20260928-01-CLOSE-20260929

2026-09-29 02:02 +07:00: resumed P0 only. Verified all 31 files in the 28 Sep evidence manifest, five local application-source hashes, final document hashes and byte-preservation of the original HANDOFF history; all passed before this closing append. No new live-data conclusions, no need to rerun unchanged diagnostics, and no P1/source/schema/deployment work. The 28 Sep manifest remains the immutable audit baseline; closing artifacts and updated document hashes are in `04 Design Tools/logs/P0-20260928-01/close-20260929/`. Added dated `HANDOFF_2026-09-29.md` to direct the next session to the verified findings and remaining runtime/access gates. Runtime Request ID: N/A; Live mutations: none. Recovery: use closing document backup/diff for this append only, preserving the original P0 report and future history.
