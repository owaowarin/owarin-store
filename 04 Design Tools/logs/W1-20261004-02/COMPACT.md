# Compact — Stream B / Session38 / 2026-10-04

## ขอบเขตและจุดเริ่ม
- ผู้ใช้ให้วิเคราะห์งานค้าง วางแผนสั้น แล้ว compact; รอบนี้วิเคราะห์/จำลองเฉพาะจุด ไม่แก้ business candidate หรือ Google
- One writer; ห้ามสร้าง agent/chat, dependency, refactor นอกงาน; local candidate + isolated Google test เท่านั้น; ร้านจริง/LAB/W2 ไม่อยู่ในรอบนี้
- ใช้ master §§2,5,6,9 +§5.2.1; Ponytail full. ไม่เปิด P0/P1 หรือคำตัดสินธุรกิจใหม่
- Candidate: `../W1-20261004-01/candidate/`; exact `W1-20261004-01/v32@AECC03651A1CD7EC62650EF1611582E4B77580EB8629F68B4A6ABE17D18AC2D3`
- Session36/37 implementation + tests เป็นหลักฐานเดิมที่ใช้ต่อได้ ไม่ใช่ตรวจ Google/ร้านสดรอบนี้; ดู `../W1-20261004-01/result.md` เฉพาะเมื่อต้องใช้
- Pending ต้องกันสินค้า; Cancel เฉพาะเจ้าของจอง; Instock เท่านั้น; Auction ขายซ้ำไม่ได้; SALES Shipping Cost=ร้านช่วยออก แยกค่าส่งลูกค้า; CLIENT เดิม/Facebook ไม่ลง Label; สูตร/Meta/R2 คงเดิม

## ผลวิเคราะห์ที่ต้องปิดจริง
1. **R1 — audit event ถูกเขียนทับ (ยืนยันด้วย deterministic interleaving).** `W1Orders.gs:29–32` เลือก journal row ก่อนเขียน; `_w1ExternalEdit_` ที่เรียกจาก `Code_v32.gs:329` ไม่ใช้ transaction lock จึงแทรกเขียน row เดียวกันได้. Repro เห็น EXTERNAL_EDIT DONE แล้วถูก PREPARED ของคำขออื่นทับ; เป็น QA-L blocker ไม่ใช่หลักฐานขายซ้ำ
2. **R2 — audit พลาด multi-row/UID deletion (ยืนยันใน harness).** `_w1ExternalEdit_` ตรวจเฉพาะ UID ปัจจุบันของแถวแรก: edit เริ่มแถวไม่มี claim แล้วครอบแถวมี claim → ไม่บันทึก; ลบ managed UID → ไม่บันทึก. Technical gate ยัง reject MANAGED_IDENTITY_CONFLICT; ห้ามกล่าวว่าลบ UID แล้วขายซ้ำได้
3. **R3 — journal ขนาด/ความจุยังไม่มีขอบเขตที่พิสูจน์.** Accepted cart 100 รายการ ชื่อจำลอง 200 ตัว ได้ PREPARED Snapshot **77,743 characters ในเซลล์เดียว**. `_w1Event_` และ `_w1Record_` ไม่มี grid-capacity extension. นี่เป็น source/size finding; ยังไม่จำลอง Google limit หรือยืนยัน runtime quota. ต้องตรวจ preflight + พื้นที่ตาราง + progress/retry ที่ขอบเขตจริง ไม่แก้ด้วย optimization/refactor ทั้งระบบ
4. **R4 — touched maintenance audit ยังไม่ครบ (source finding).** `_toolsSort` (`WebApp_v32.gs:488–518`) มี gate/lock/readback แต่ไม่มี durable Request ID/before→after journal; SKU/restock/menu writers ต้องตรวจเฉพาะรายการที่ diff แตะ. §10 W1.3 และ QA-L ยังปิดไม่ได้ด้วย guard อย่างเดียว; ไม่ขยาย audit ไปทั้งร้าน

`repro.cjs` ยืนยัน R1/R2 และวัด R3; `repro-result.txt` = exit 0. ไม่ใช่ whole-suite rerun; R4 ยังไม่ใช่ runtime reproduction. ยังไม่ใช่ completed Astra/High review และไม่มีการอ้างสลับโมเดล

## แผนปิดงาน — ทำตามลำดับสามชุด
**A — แก้ audit ที่ต้นเหตุ (next ONE step).** ให้ external-edit audit ใช้ lock เดียวกัน โดยไม่ nested-lock transaction; ตรวจ range ที่กระทบทั้งหมดและกรณี UID หายโดยไม่เดาค่าเก่า; บันทึก Unknown เมื่อไม่ทราบ actor/old value. รวม audit ของ touched sort/menu ที่มีอยู่ให้ครบในขอบเขตเดิม. ก่อนแก้ R4 ทำ repro ของ caller นั้นหนึ่งกรณี
- จบ A: R1 interleaving ไม่ทับ event; multi-row/UID-deletion มี trace/issue ชัด; managed mutation ยังคง fail closed; touched caller success/failure/readback เชื่อม Request ID ได้. รันทดสอบ failing cases เดิม + transaction recovery ที่ได้รับผลกระทบเท่านั้น

**B — ปิดขอบเขต journal.** ทดสอบ accepted maximum/long title และแถว journal ใกล้สุด grid; เลือก minimum fix จากผลจริง (preflight ที่ไม่ทิ้ง partial write, capacity growth ที่อ่านกลับได้, หรือเก็บ snapshot ด้วยโครงสร้างเดิมที่รองรับ). ห้ามลด cart limit เงียบ ๆ เพื่อให้ test ผ่าน; ค่า 100 เป็น implementation ceiling ไม่ใช่คำตัดสินธุรกิจที่ผู้ใช้สั่ง
- จบ B: ทุก payload ที่ระบบยอมรับเก็บ intent/progress/result และ retry ได้; payload ที่ไม่รองรับถูกปฏิเสธก่อนแก้ stock/SALES; interrupted capacity/write ไม่เกิด duplicate. ใช้ exact test project เดิม ไม่สร้าง fixture ใหม่ทั้งชุด

**C — focused close เพียงรอบเดียว.** Review critical diff เงิน/สต็อก/security รวม A/B และ caller ของมัน; actual Google UI test เฉพาะเปลี่ยนแปลง + failure/retry; อ่านผลแล้วปิด W1 ถ้าไม่มี blocker
- จบ C: R1–R4 มีผลปิดที่ตรวจย้อนกลับได้, critical review ไม่มี unresolved blocker, revision/test-runtime ตรงกัน, docs/logs อัปเดตหนึ่งครั้ง. W2/production release ยังอยู่งานถัดไปตามขอบเขต

## กติกาคุมเวลาและไม่วนซ้ำ
- แต่ละ issue = reproduce → minimal fix → same test + impacted checks → เดินหน้าทันทีเมื่อผ่าน; ไม่เพิ่ม audit/doc/test phase เพื่อความมั่นใจซ้ำ
- ใช้ผลทดสอบ Session36/37 ต่อเมื่อ diff ไม่กระทบ; อย่ารันทุกรอบหรือ export workbook ซ้ำโดยไม่มีคำถามใหม่
- UI tooling ล้มหนึ่งครั้งให้ดู state; ล้มแบบเดิมครั้งที่สองเปลี่ยนวิธีที่ได้รับอนุญาต/สรุป blocker อย่าวน selector/dialog. ไม่เอาปัญหา automation ไปเปลี่ยน UX โดยไม่มีเหตุใช้งาน
- Code/WebApp แตะตัวใดต้อง bump pair ตาม repo; backup ก่อน overwrite; Change/Request ID + diff/result/recovery อยู่ชุดเดียว; log สั้นพร้อมลิงก์ ไม่คัดรายงานหลายไฟล์
- Critical issue แก้สองวิธีแล้วยังไม่ผ่าน: เก็บ exact revision/repro/ผล แล้ว handoff ตาม model policy; ไม่เปิด agent/chat และไม่อ้างสลับเอง

## Environment / recovery
- Test project `1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd`; Sheet `13WC54eKp6kLnE05XCey38q7aZHYrnrs6bpBQP5J3QtM`
- /dev HEAD ที่ Session37 ทดสอบ: `https://script.google.com/macros/s/AKfycbwx5zAX0pyIEt-Ui11Aj3trTEneG1rmuV9YSkDu9D0D/dev`; /exec เก่าไม่ใช่ W1 ปัจจุบัน
- ห้ามรัน fixture/recovery helper แบบ blind: มี ORDERS แล้ว; รักษา Request ID/claims/SALES ของ partial operation; ดู `../W1-20261004-01/UNDO.md`
- Frozen W1-20261003-01/04-01 ห้ามรัน close/freeze/seal scripts เดิมซ้ำ. แก้ใน candidate ชุดใหม่เมื่อเริ่ม A; package นี้เป็น analysis/repro เท่านั้น
- หลักฐานดั้งเดิม current four-file hashes อยู่ revision.json; local transfer server เดิมหยุดแล้ว. No Google session claim ใน Session38
- ไม่มี callable tool สำหรับบังคับ compact context ในเซสชันนี้; ไฟล์นี้คือ compact handoff ที่บันทึกจริง ไม่อ้างว่าระบบย่อ context แล้ว
