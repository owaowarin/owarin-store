# ข้อเสนอระบบ Sheet → Facebook / Catalog / Ads

วันที่ 2026-09-28 · Stream B · สถานะ: ออกแบบเพื่อประเมิน ยังไม่อนุมัติติดตั้งหรือเปลี่ยนข้อมูล production

## 1. ข้อเสนอและขอบเขต

ต่อยอด Google Sheet + Apps Script + R2 เดิม โดยเพิ่มทะเบียนรหัสคงที่ การจับคู่ช่องทาง คิวซิงก์ และการตรวจผลกลับ; ยังไม่ย้ายฐานข้อมูลหรือสร้างหลังบ้านใหม่ทั้งระบบ

Sheet เป็นผู้กำหนดสต็อก ราคา และสภาพ; Facebook ส่งกลับเฉพาะ ID สถานะเผยแพร่ ผลการทำงาน และความแตกต่างที่ตรวจพบ การลบรูป/แก้ข้อความบนเพจไม่ใช่หลักฐานว่าขายแล้ว และข้อความลูกค้าไม่ใช่คำสั่งตัดสต็อกอัตโนมัติ

แยกผลลัพธ์ 3 อย่าง: (1) Catalog ถูกต้อง (2) อัลบั้ม/โพสต์ถูกต้อง (3) สิ่งที่โฆษณาแสดงถูกต้อง ต้องตรวจแต่ละอย่างแยกกัน ห้ามใช้ผลสำเร็จข้อหนึ่งแทนอีกสองข้อ

## 2. หลักฐานและขอบเขตความแน่นอน

- ตรวจโค้ด local: `03 Apps Script/Web App/Code_v27.gs`, `WebApp_v25.gs`, `03 Apps Script/FbAlbum.gs`, snapshot `Live Source/Current-2026-09-10/FbAlbum.gs` และ README
- README และ HANDOFF 2026-09-25 บันทึกว่ามี v27 และ v25 ใช้ร่วมกัน แต่ยังไม่ได้ดึง deployment สดมาเทียบในรอบนี้; ห้ามถือว่าไฟล์ local ทุกไฟล์ตรง production
- `_recalcRow` เปลี่ยน Product ID ตามชื่อ/สำนักพิมพ์/สภาพได้ และมี PID CHANGES; เจ้าของเคยเลือกให้ PID เปลี่ยนได้ จึงเสนอเพิ่มรหัสภายในโดยไม่กลับคำตัดสินนั้น
- ตัวโพสต์เลือก Instock และกันปกซ้ำ; ไม่มีการซิงก์ Sold ย้อนกลับไปจัดการรูปเก่า `buildAlbumCaptions` สร้างเฉพาะ Instock จึงไม่เหมาะเป็นทะเบียน Photo ID ถาวร
- มีการเขียนสถานะหลายทาง: `onEdit`, `_apiInvUpdate`, `_apiMarkSold`, `_apiSalesConfirm`; onEdit ปัจจุบันอ่านแถว/คอลัมน์เริ่มต้น จึงไม่ควรใช้เป็นกลไกตรวจ bulk paste เพียงอย่างเดียว
- `_apiMarkSold` บันทึก Sold ก่อนเขียน SALES และคืนข้อผิดพลาด SALES แยก; `_apiSalesConfirm` เขียนทีละรายการภายใต้ lock ซึ่งไม่ได้ทำให้หลายชีตเป็น transaction
- `META_ONLY_STATUS=["Instock"]` ตัด Sold ออกจาก export; บันทึก feed เดิมเป็น REPLACE และเปิด deletion ต้องเปลี่ยนสัญญานี้ก่อนหวังรักษา Catalog item ID/การอ้างอิงเดิม
- แผนโฆษณาวันที่ 2026-09-25 อธิบายการใช้ existing Page posts แบบหมวดสินค้า → Messenger; ยังไม่ได้ตรวจ ad/creative ที่เปิดอยู่วันนี้ และไม่ใช้ตัวเลขสต็อกหรือผลโฆษณาย้อนหลังเป็นข้อมูลปัจจุบัน

SDK ทางการยืนยันโครงคำสั่งอ่านอัลบั้ม เพิ่มรูป ลบ Photo แก้ message ของ Post และแก้ Catalog; ไม่ยืนยันสิทธิ์ของบัญชีนี้ และยังไม่ยืนยันการแก้ caption ของ Photo หรือ product tagging บน Facebook Album การมี endpoint ใน SDK ไม่รับประกันการใช้งานทุกประเภทโพสต์/API version

## 3. ทางเลือก

| ทางเลือก | ผลต่อร้าน | ข้อจำกัด | ข้อเสนอ |
|---|---|---|---|
| เพิ่มตัวซิงก์บนระบบเดิม | รักษาวิธีขาย ชีต รูป และ ID ของโพสต์ที่ยังใช้ได้ | ต้องจัดระเบียบ mapping และพิสูจน์ API | เริ่มที่นี่ |
| ระบบเดิม + ทดลอง Catalog-driven ads | ให้โฆษณาที่รองรับใช้สินค้าจาก Catalog; อัลบั้มเดิมยังเป็นหน้าร้าน | ไม่เท่ากับโฆษณาอัลบั้มเดิม ต้องตรวจ objective, Messenger destination, eligibility และผลจริง | ทดลองภายหลัง ไม่ย้ายงบทั้งหมด |
| เขียนหลังบ้าน/ฐานข้อมูลใหม่ | เพิ่มความสามารถด้านธุรกรรม/ผู้ใช้พร้อมกันได้ | งานย้ายข้อมูลสูง และไม่ปลดข้อจำกัด Facebook API | เลื่อนจนมีความจำเป็นที่วัดได้ |

ถ้าเงื่อนไขคือ “ภาพสินค้าที่ขายแล้วต้องหายจากโฆษณาแน่นอน โดยไม่ต้องทำมือ” และโฆษณาอัลบั้มเดิมแก้ไม่ได้ ระบบต้องเปลี่ยนวิธีโฆษณา หรือพักโฆษณาที่ได้รับผลกระทบตามนโยบายที่เจ้าของยอมรับ ไม่มีซอฟต์แวร์กลางที่รับประกันทั้งภาพสดตลอดเวลาและรักษาโฆษณาเก่าทุกชิ้นได้โดยไม่พิสูจน์พฤติกรรม Meta

## 4. การทำงานประจำ

1. เจ้าของขายผ่าน Mark Sold/Confirm Sold เดิม หรือแก้คอลัมน์ Status ที่อนุญาตในชีต
2. บันทึกสถานะและ revision ของสินค้า พร้อมงานที่ต้องซิงก์; หน้าใช้งานแสดง “บันทึกขายแล้ว / รอซิงก์ Facebook” แยกจากสถานะบันทึก SALES
3. worker บน Apps Script อ่านข้อมูลล่าสุดและประมวลผลคิวเป็นชุดเล็ก ให้รายการเปลี่ยนเป็นไม่พร้อมขายก่อนรายการเผยแพร่ใหม่
4. ส่ง Catalog → ตรวจอ่านกลับ; ส่ง Page เฉพาะความสามารถที่ทดสอบผ่าน; ประเมินผลต่อ Ads แยกออกมา
5. แสดงผลรายช่องทาง เช่น “Catalog ยืนยันแล้ว · อัลบั้มต้องตรวจ · โฆษณาต้องตรวจ” ห้ามขึ้นสีเขียวทั้งหมดเมื่อสำเร็จเพียง Catalog
6. ตัวตรวจตามเวลาเก็บงานที่ตกหล่นจากการแก้ชีต/import/API และตรวจว่าข้อมูลภายนอกยังตรงกัน

ช่วงเวลาเสนอ: worker ทุก 1–5 นาทีตาม quota ที่วัดได้ และ reconciliation สต็อกทุก 5 นาที; งานสำรวจรูป/Ads ใช้รอบช้ากว่าหรือตาม ID ที่กระทบ เป้าหมาย pilot คือยืนยัน Catalog ภายใน 5 นาทีในภาวะปกติ ไม่ใช่ SLA หรือคำรับรองการหยุดแสดงโฆษณาทันที

การขายและซิงก์ Catalog/Page ทำงานบน cloud แม้ปิด PC; การรับรูปใหม่ที่ยังอยู่ในเครื่องต้องรอ R2 pipeline เดิมอัปโหลดและตรวจรูปผ่านก่อนเผยแพร่

## 5. ข้อมูลเพิ่มขั้นต่ำ

| ที่เก็บ | หน้าที่ |
|---|---|
| คอลัมน์ Item UID ในชีตสินค้าเดิม | รหัสถาวรต่อเล่ม สร้างครั้งเดียว ไม่ใช้เลขแถว/ชื่อ/รหัสที่คำนวณใหม่เป็นตัวตน |
| FB LINKS | mapping แบบหนึ่งแถวต่อความสัมพันธ์: Item UID, current PID, stable listing key, page/catalog ID, remote object kind+ID, album/photo/post ID ตามชนิด, role, verification state, last verified time |
| FB SYNC | คิวพร้อม event ID, item/listing key, revision, desired hash, target, state, attempt, next attempt, receipt และ error |
| FB SYNC LOG | before/after, actor/source, event ID, remote ID, result และ timestamp; ไม่เก็บ token/ข้อมูลลูกค้าที่ไม่จำเป็น |

FB ALBUMS และ PID CHANGES ใช้ต่อ; ALBUM CAPTION เป็นข้อมูลสำหรับแสดง/เตรียมเผยแพร่ ไม่ใช่ทะเบียนกลาง และห้ามลบ mapping เมื่อสินค้า Sold

Catalog แยก `retailer_id` ของร้านจาก Meta object ID; ของเก่าคง retailer_id ที่ตรวจจับคู่ได้ และผูกกับ Item UID แม้ PID เปลี่ยน ของใหม่ใช้ listing key คงที่ ห้ามเปลี่ยน retailer_id ของทั้งหมดแบบยกชุดหรือย้าย mapping ด้วยชื่อใกล้เคียง

ภาพหนึ่งอาจเชื่อมหลายเล่ม และโพสต์หนึ่งเชื่อมหลายภาพ ใช้หลายแถวใน FB LINKS รองรับความสัมพันธ์นี้ ไม่เก็บแค่ Photo ID เดียวต่อ Product ID

ภาพที่แสดงตำหนิ/สภาพของเล่ม A ต้องไม่ถูกใช้เป็นหลักฐานของเล่ม B แม้ปกเหมือนกัน ปกที่เจ้าของระบุว่าเป็นภาพตัวอย่างระดับชื่อเรื่องเก็บไว้ได้เมื่อยังมีเล่มพร้อมขาย; หากยังไม่ระบุบทบาทให้ขึ้น Needs review ก่อนดำเนินการ

## 6. กฎสถานะที่เสนอ

| สถานะต้นทาง | Catalog ของเล่มนั้น | Page/Album | Ads |
|---|---|---|---|
| Instock + รูป/ข้อมูลตรวจผ่าน | in stock | เพิ่มได้ถ้ายังไม่มี; แก้เฉพาะส่วนที่ระบบดูแลและ API ผ่านทดสอบ | มีสิทธิ์เข้าชุดสินค้าที่พร้อมขาย |
| Sold หรือ Auction | out of stock; เก็บ ID | ปรับข้อความของโพสต์เมื่อทำได้; รูปเฉพาะเล่มเข้าคิวจัดการตามสิทธิ์/นโยบาย | Catalog-driven ตรวจ eligibility ใหม่; existing-post ตรวจผลกระทบแยก |
| Hold | ไม่พร้อมขาย; ไม่ลบถาวร | ระบุจอง/พักเมื่อทำได้ | ไม่นำเข้า candidate พร้อมขาย |
| New Arrival/Retake | ไม่เผยแพร่ใหม่; หากเคยเผยแพร่ให้ทำไม่พร้อมขายจนตรวจรูปผ่าน | รอรูป/ข้อมูล | ยังไม่ใช้เป็น candidate |
| ยกเลิกขาย → Instock | ใช้ ID เดิมหลังเจ้าของยืนยันรับกลับและตรวจสภาพ | ตรวจ object เดิมก่อนเพิ่มรูปใหม่ | ไม่เปิดโฆษณาที่พักกลับเองในรุ่นแรก |
| แถวหาย/อ่านชีตไม่ครบ/UID ซ้ำ | Data error | หยุดคำสั่งที่อาศัยข้อมูลนั้น ไม่ตีความเป็น Sold | แจ้ง risk ไม่เดาสถานะ |

Auction = ขายแล้วตามนิยามร้าน; ไม่อนุมานชำระเงินจากสถานะ Sold การแก้ชีตด้วยมือจะซิงก์ความพร้อมขายได้ แต่ไม่ได้สร้างหลักฐานรับเงิน/ยอดขายย้อนหลังให้ครบโดยอัตโนมัติ

## 7. อัลบั้มกับโฆษณา: วิธีรักษาของเดิม

- สำรวจ Album ID → Photo ID → Post ID → ad/creative ที่อ้างถึง โดยอ่านทั้ง `object_story_id`, `effective_object_story_id` และ `photo_album_source_object_story_id` เมื่อมี; แยก fixed creative กับ product-set creative ไม่ใช้ชื่อแคมเปญเดาว่าเป็นแบบใด
- เก็บรายชื่อโฆษณาที่ได้รับผลกระทบ; อย่าคิดว่าลบรูปจากอัลบั้มแล้ว creative จะเปลี่ยนตาม หรือว่า out of stock ใน Catalog จะเอารูปออกจาก existing-post ad
- เริ่มอัตโนมัติที่ Catalog และข้อความในโพสต์ที่พิสูจน์ว่าแก้ได้ ไม่ลบรูปที่เกี่ยวกับ Ads จนทดสอบการแสดงผลครบทั้งโพสต์/อัลบั้ม/preview ของ Ads
- ข้อความที่ระบบแก้ต้องเป็นส่วนที่เจ้าของมอบให้ระบบดูแล หรือเป็นโพสต์ที่สร้างโดยระบบ; หากข้อความจริงไม่ตรง revision ล่าสุดให้หยุดและรายงาน manual edit ไม่ทับข้อความเจ้าของ
- หากข้อความโพสต์แก้ไม่ได้ ให้สร้างรายการงานพร้อมลิงก์และข้อความที่ต้องแก้; คอมเมนต์ “ขายแล้ว” เป็นทางเลือกเสริมเมื่อสิทธิ์รองรับ แต่ไม่ถือว่าแก้ข้อมูลหลักหรือโฆษณาสำเร็จ
- ไม่ลบแล้วสร้างโพสต์ใหม่ทุกครั้งที่ขาย เพราะ ID และ engagement เดิมไม่ใช่สิ่งที่ระบบคืนให้ได้; การสำรองรูปไม่ทำให้การลบ Facebook ย้อนกลับได้
- เมื่อสร้างรอบโฆษณาใหม่ อาจใช้โพสต์หมวดที่ข้อมูลเปลี่ยนน้อยร่วมกับ Catalog-driven creative ที่รองรับจริง; ยังต้องทดลองผลทางธุรกิจก่อนเปลี่ยนแนวทางเดิม
- การ auto-pause Ads เป็นตัวเลือกสำหรับความเสี่ยงข้อมูลค้าง ไม่ใช่ค่าเริ่มต้น: ต้องกำหนด ad allowlist, เหตุที่จะพัก, เวลารอ, การแจ้ง และห้าม auto-resume; การอนุมัติแบบนี้ยังไม่ได้เกิดขึ้น

## 8. ป้องกัน human error และระบบผิดพลาด

| ความเสี่ยง | ระดับก่อนป้องกัน | วิธีควบคุม / ความเสี่ยงคงเหลือ |
|---|---|---|
| อัปเดตผิดเล่มเพราะ PID เปลี่ยนหรือซ้ำ | วิกฤต | Item UID + mapping ที่ตรวจแล้ว + uniqueness checks; กำกวมให้หยุด ไม่เดาจากชื่อ |
| ภาพที่ขายแล้วค้างใน Ads แม้ Catalog ตรง | สูง | สถานะแยก Catalog/Page/Ads; ตรวจ creative; pilot รูปแบบใหม่หรือ policy พัก Ads ตามที่ตกลง |
| ลบรูปแล้วกระทบ Ads/engagement | สูง | ปิด auto-delete รุ่นแรก; ตรวจรายการอ้างอิง; ไม่มีคำรับรอง rollback การลบ |
| ปกเหมือนกันแต่ราคา/สภาพต่างกัน | สูง | Catalog ต่อเล่ม; ภาพตัวอย่าง/ภาพเฉพาะเล่มแยกบทบาท; ไม่เลือกเล่มทดแทนเอง |
| feed รอบเก่าเขียนทับสถานะจาก API | สูง | ผู้เขียนข้อมูลต่อ listing/field เพียงหนึ่งระบบ; cutover feed/API ให้ชัดและทดสอบข้ามรอบ feed |
| Facebook สำเร็จแต่ timeout/บันทึก receipt ไม่ทัน | สูง | งานสร้างรูปเป็น UNKNOWN รอตรวจค้น object ก่อน retry; ห้ามโพสต์ซ้ำแบบเดาสุ่ม |
| Sold → ยกเลิก → Sold ระหว่างงานค้าง | สูง | revision+desired hash; อ่านใหม่ก่อนส่ง; ผลเก่าห้ามปิดงาน revision ใหม่; reconciler แก้ผลลัพธ์ที่มาช้า |
| บันทึกขายบางส่วนสำเร็จ | สูง | ตรวจและซ่อม failure/retry ของทางขายที่เลือกใช้ก่อน pilot; request ID และ recovery ตรวจแต่ละขั้น ไม่สร้าง SALES ซ้ำ; ถ้า stock Sold แล้วให้ปิดขายภายนอกและแสดง ledger error แยก |
| onEdit ไม่ทำงานเมื่อเขียนจาก web app/API หรือ paste หลายแถว | สูง | ผูกคิวในทุก write path + range-aware handler + polling ตรวจข้อมูลจริง |
| อ่านชีตไม่ครบแล้วคิดว่าทุกเล่มขายแล้ว | สูง | validation snapshot ครบ; missing ≠ Sold; ปิด mass mutation เมื่อ input ผิดปกติ |
| token หมดสิทธิ์/Meta rate limit/Google quota | กลาง–สูง | เก็บ credentials ใน Script Properties จำกัดผู้แก้โครงการ; retry แบบเว้นระยะ; แสดงเวลาซิงก์ล่าสุดและแจ้งงานค้าง |
| แก้ Facebook ด้วยมือแล้วระบบทับ | กลาง | ตรวจ revision/hash ของส่วนที่ระบบดูแล; แจ้ง conflict; ไม่ให้ข้อมูล Facebook ตัดสต็อกในชีต |
| ระบบหยุดและไม่มีใครเห็นสีแดง | กลาง–สูง | worker heartbeat + การแจ้งจาก failure ของ trigger/ช่องทางที่ตกลง; หน้า health เพียงอย่างเดียวตรวจจับ worker ที่ตายเองไม่ได้ ต้องทดสอบการแจ้งจริง |

worker ใช้ lock เฉพาะ claim/update คิว แล้วปล่อยก่อนเรียกเครือข่าย; มี lease/recovery กันงานซ้อนและไม่อ้าง exactly-once ข้าม Google/Meta การเขียนหลายชีตใช้บันทึก+ตรวจกลับและ reconcile ไม่สมมติว่าเป็น transaction

ชุดข้อมูลปกติห้ามเก็บ access token ในเซลล์/log/URL ที่แสดงผู้ใช้; จำกัด token ต่อทรัพยากรที่ต้องใช้ และไม่เพิ่มสิทธิ์ Ads write ในระยะที่เพียงอ่าน dependency

## 9. Catalog: ผู้เขียนเพียงชุดเดียว

ระยะเริ่มต้นทดสอบ feed path เดิมกับ projection ที่รวมสินค้าซึ่งเคยเผยแพร่แล้วและเปลี่ยนเป็น out of stock โดยไม่ตัดทิ้ง เพื่อรักษา retailer_id; ห้ามเปลี่ยน REPLACE/deletion โดยไม่สำรองและตรวจขอบเขตสินค้าที่ feed เป็นเจ้าของ

เป้าหมายระยะถัดไปคือ incremental API สำหรับเวลาขาย โดยต้องทดสอบว่า data source/item ปัจจุบันยอมรับการแก้และอ่านกลับได้ ก่อน cutover listing ที่กำหนดให้ API เป็นผู้เขียนหลัก ให้หยุด/ปรับ scheduled feed ที่จะเขียนทับ listing/field เดียวกันอย่างมีแผน; หากแบ่งขอบเขตไม่ได้ต้อง cutover ทั้งชุดที่ feed นั้นเป็นเจ้าของพร้อมกัน ไม่เปิด feed เก่ากับ API แข่งกัน

มี export สำหรับตรวจเทียบ/กู้ระบบได้ แต่ไม่เปิดเป็น scheduled writer คู่กัน; หากต้อง rollback ให้สร้าง export จากสถานะชีตล่าสุด ไม่ส่ง snapshot สต็อกเก่าที่ทำให้สินค้าขายแล้วกลับพร้อมขาย

## 10. ลำดับดำเนินการและเกณฑ์ผ่าน

| ระยะ | สิ่งที่จะได้ | เกณฑ์ก่อนขยับต่อ |
|---|---|---|
| 0 — สำรวจสดและพิสูจน์ API | baseline ชีต/deployed source/รูป/โพสต์/catalog/ads, capability matrix ต่อประเภท object และสิทธิ์ | ทุก object ใน pilot จับคู่ชัด; ทดสอบเขียนบนวัตถุทดสอบที่อนุมัติ; รู้ว่าการแก้ Post กระทบ Photo/Ads อย่างไร |
| 1 — Shadow mode | คำนวณสิ่งที่ควรเปลี่ยนเทียบข้อมูลจริง และรายงาน ไม่มี write ไป Meta | ครอบคลุมทุกทางแก้สต็อก; Sold/Auction/Hold/คืนสินค้า/ชื่อซ้ำ/PID เปลี่ยนถูกต้อง; ไม่มี cross-page/catalog mutation |
| 2 — Pilot Catalog | เปิดเฉพาะรายการที่อนุมัติและ single-writer cutover; ตรวจอ่านกลับและงานค้าง | ผ่านรอบ scheduled feed อย่างน้อยหนึ่งรอบโดยไม่มีสถานะย้อนกลับ; retry ไม่สร้างสินค้า/ยอดขายซ้ำ; กู้ token failure ได้ |
| 3 — Pilot Page | เพิ่มรูป/แก้ข้อความเฉพาะประเภทที่ทดสอบผ่าน; งานอื่นเป็น exception | ไม่กระทบภาพของเล่มอื่น/ข้อความทำมือ; mapping อยู่ครบหลัง rebuild; ชุดทดสอบ Ads preview ผ่านก่อนแตะ object ที่ใช้ยิงโฆษณา |
| 4 — ประเมินแนว Ads | เปรียบเทียบวิธีเดิมกับ Catalog-driven ที่บัญชีรองรับภายใต้งบที่เจ้าของอนุมัติ | ดูทั้งเวลางานมือ ความคลาดเคลื่อนสต็อก คำถามสินค้าหมด และผลขาย; ไม่เลือกจากความสะดวกทางเทคนิคอย่างเดียว |

ชุดตรวจรับขั้นต่ำ: ขายปกติ, ขายหลายเล่ม, กดซ้ำ, SALES เขียนไม่สำเร็จกลางทาง, เปลี่ยนหลายเซลล์, เขียนจาก API, UID/PID ซ้ำ, เปลี่ยนชื่อ/PID, สองเล่มปกเดียวแต่สภาพต่าง, Sold แล้วคืน, token revoked, 429, timeout หลัง Meta สร้างรูปแล้ว, feed เก่า overwrite, partial sheet read, manual Facebook edit, พัก worker แล้วเปิดใหม่

วัดแยก: เวลาจากแก้ชีตถึง Catalog read-back, Page read-back, ad preview/eligibility; งานค้างและอายุงาน; wrong-item mutation/duplicate creation ต้องเป็นศูนย์ในชุดตรวจรับ; ไม่แปลง API success เป็นคำรับรองว่าผู้ชมทุกคนเห็นข้อมูลใหม่แล้ว

Kill switch หยุด external writes โดยยังขายในชีตได้; หยุด trigger เก่าที่ซ้ำหน้าที่เมื่อ cutover และอย่าเปิดกลับโดย replay คิวเก่า; ขั้นตอนย้อนกลับรักษา IDs/receipts/งานที่สำเร็จแล้ว

## 11. เรื่องที่ต้องตัดสินก่อนเปิดใช้ ไม่ขวางการออกแบบ

1. ขายแล้วอยากคงรูปพร้อมข้อความ หรือให้หายจากอัลบั้ม: ข้อเสนอเริ่มจากคงรูป และอนุญาตลบภายหลังเฉพาะรูปที่ไม่พัวพัน Ads/สินค้าหลายเล่ม
2. เมื่อโฆษณาเก่ายังแสดงสินค้าหมดและแก้ไม่ได้ ยอมให้ระบบพัก ad นั้นหรือรับคิวแก้ด้วยคน: ต้องตกลงขอบเขตก่อนเปิด auto-pause
3. ถ้าต้องการตัดงานแก้มือแทบทั้งหมด ยอมทดสอบ Catalog-driven ads ที่อาจต่างจากวิธีโฆษณาเดิมหรือไม่; product tagging ไม่ใช่ dependency ของระบบสต็อกนี้

ยังไม่เสนอเปลี่ยนงบ เปลี่ยน objective สร้างโพสต์/โฆษณา ลบรูป ย้าย Catalog หรือ deploy ในรอบออกแบบนี้

## 12. แหล่งอ้างอิงทางการ

- Meta [Album SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/album.py): อ่านและเพิ่มรูปในอัลบั้ม
- Meta [Photo SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/photo.py): Photo ID, page_story_id และ delete; ไม่พบ photo update โดยตรงในไฟล์ที่ตรวจ
- Meta [Post SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/post.py): update message ของ Post
- Meta [ProductItem SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/productitem.py): availability, price, image, inventory และ retailer_id
- Meta [ProductFeed SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/productfeed.py): schedule และ uploads
- Meta [AdCreative SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adcreative.py): IDs ของโพสต์ต้นทางและ product set; ไม่รับรอง automatic propagation ของภาพใน Ads
- Google [Installable triggers](https://developers.google.com/apps-script/guides/triggers/installable): script/API writes ไม่เรียก edit trigger และ time-driven trigger มีเวลาไม่ตายตัว
- Google [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas): ข้อจำกัด runtime/บริการ ต้องวัด batch และความถี่จริง

ตรวจแหล่งทางการในแชตวันที่ 2026-09-28; Developer reference ของ Meta หลายหน้าตอบ 429 จึงใช้ SDK ประกอบและเก็บการทดสอบสิทธิ์จริงเป็น gate แทนการฟันธงจากชื่อ method
