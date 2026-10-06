# OWARIN — Implementation log: Add / Cart / Orders / Label

Created 2026-09-28 · timezone Asia/Bangkok · Stream B

## Current status

**Planning complete. Implementation not started.** มีการอ่าน source/local images, เว็บ /dev และหัวตาราง live เท่านั้น ไม่มีการ Save item, แก้ CLIENT, เปลี่ยน stock, บันทึก SALES หรือ deploy

| Phase | Status | Evidence / next action |
|---|---|---|
| Planning | DONE | PLAN + HANDBOOK + log นี้; ตรวจ source จุดเชื่อมที่เกี่ยวข้อง |
| P0 baseline/reproduction | NOT STARTED (มี preliminary evidence) | ต้อง export deployed source + test-copy reproduce; live UI default ถูกตรวจแล้ว |
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
