# แผน Deep Dive Ads — chubbygirlbkk · Shopee + Meta

วันที่จัดทำ: 14 กันยายน 2026 · สาย A — Ads Optimizer · สถานะ: วางแผนจากเอกสาร ยังไม่ได้วิเคราะห์ข้อมูลสดหรือเปลี่ยนแคมเปญ

ผู้ใช้ยืนยันขอบเขต Shopee + Meta แบบเต็มในแชทนี้; ยังไม่ได้ระบุช่วงวันที่ เป้าหมายของงวด งบจริงที่ยอมรับได้ และขอบเขตช่องทางที่ทีมมีสิทธิ์จัดการ
ใช้ master context §2–§4 และ §9; สเปกต้นทางมีอำนาจเหนือสำเนา master และ runbook
เอกสารนี้เก็บใน workspace ปัจจุบันเพื่อส่งต่องานสาย A เท่านั้น ไม่ใช่ข้อมูลหรือแผนธุรกิจของ OWARIN STORE; เมื่อเลือกงวดแล้ว ให้อ้างเอกสารนี้จาก runbook ของงวดในโปรเจกต์ Ads

## ผลจากการอ่านไฟล์

- สเปกต้นทางปัจจุบันที่ตรวจพบคือ Core v1.8, Deep-Dive v6.9, Meta Export v1.2; ตรวจพบไฟล์บังคับตาม orchestrator §1 ครบ รวม design ground truth แต่ยังไม่ได้ตรวจภาพหรือทดสอบ build
- STATUS ของงวด `Weekly/2026 01AUG-07SEP2026 (rotation)` ระบุว่าเป็น Rotation-only; ส่วน ABC, Orphan, keywords และ Meta ไม่ได้ทำในงวดนั้น จึงใช้เป็นประวัติแผนสำหรับตรวจการลงมือ ไม่ใช้แทน Deep Dive เต็ม
- STATUS ของ MoM JUL–AUG มีประเด็น target ROAS, UTM และการติดตามรายสินค้าให้นำมาตรวจซ้ำ ความเห็นและตัวเลขใน STATUS เป็นข้อมูลประวัติ ไม่ใช่ข้อค้นพบปัจจุบัน
- ยังไม่ได้ export ข้อมูลใหม่ อ่านหน้าจอ Seller Centre/Ads Manager หรือยืนยันว่าแผนเดิมถูกนำไปทำแล้ว; ยังไม่มีตัวเลขประสิทธิภาพปัจจุบันในแผนนี้

## ข้อขัดแย้งในเอกสารที่ต้องกันก่อนใช้

| จุดที่พบ | วิธีใช้ในงานนี้ |
|---|---|
| master ยังอ้าง Core v1.7 / DD v6.8 บางแห่ง; Weekly runbook ยังอ้าง DD v6.7 และ ground truth เก่า | ยึดไฟล์ต้นทาง v1.8/v6.9 และ design ground truth ตาม overview/orchestrator |
| DD INPUT ระบุสมาชิกมาจาก File 5 และ snapshot จาก ads_list/trait_list แต่ DD STATE ห้ามใช้เป็น V/P | ยึด Core §9.22–§9.24 และ DD STATE: V จากปุ่ม ลบ/เพิ่ม ของ vehicle ที่ ongoing; P จาก F6; S จาก export งวดจริง |
| orchestrator C4 และข้อความบางบรรทัดใน DD FRESH ยังเขียน 4 กลุ่ม | ยึด Core §9.31 และตาราง FRESH: G1, G2, G3, G4 TESTER, GNEW และ GMV Max |
| บางส่วนยังกล่าวถึงเพดานเคลื่อนย้าย 20% และการรื้อกลุ่มทุกสัปดาห์ | ยึด Core §9.31 ซึ่งถอนเพดานดังกล่าว; แผนรายสัปดาห์ไม่ใช่คำสั่งรื้อทั้งชุดทุกสัปดาห์ |
| STATUS เก่ามีข้อเสนอและค่าตั้งแคมเปญหลายช่วงเวลา | เปิดตรวจจริงและทำ verification register ก่อนยกเข้า checklist ใหม่ |

รอบนี้บันทึกข้อขัดแย้งเพื่อวางแผน ยังไม่ได้แก้สเปกต้นทาง; หากแก้ ต้อง propagate ตาม master §4.9 ครบทั้งสาย ห้ามแก้เฉพาะสำเนาหรือ HTML

## ลำดับงานและเกณฑ์ผ่าน

| ขั้น | งาน | ผลลัพธ์ / เกณฑ์ก่อนเดินต่อ |
|---|---|---|
| 1. ล็อกโจทย์ | ระบุวันเริ่ม–สิ้นสุดงวดเดียว, เป้าหมาย, งบฐาน/งบเพิ่ม, ผู้ดูแลแต่ละช่องทาง, รอบของเข้าและวันที่หมุนจริง; จะเทียบ PoP ต่อเมื่อระบุขอบเขตเพิ่ม | Scope และ data request; ไม่เดางบธุรกิจจาก daily cap และไม่ตีความเจตนาที่เจ้าของยังไม่ให้ |
| 2. เก็บข้อมูลใหม่ | Export ชุดที่ตรงช่วงวันเดียวกัน, ตรวจบัญชี/เขตเวลา/attribution; เก็บ raw และเวลา export; ทำ dry run และ log ก่อนคัดลอก | Manifest: path, slot จาก headers, window, rows/columns, hash; ไฟล์ซ้ำระบุชัด, ไฟล์จับ slot ไม่ได้ถามพร้อม 10 headers แรก |
| 3. Phase A | ทำ V/P/S, ตรวจ parent/variant, reconcile, cause map พร้อม rotation stamp, ABC และ flags, Meta attribution register | PARSE-PACK.json + parse/reconciliation log + CHECKPOINTS.md; parent GMV ต้องตรง F4 และไม่มี checkpoint FAIL |
| 4. วิเคราะห์เต็ม | ตรวจแผนเดิมและวิเคราะห์ Shopee/Meta ตามรายการด้านล่าง; แยกหลักฐาน ข้อสังเกต และสิ่งที่ยังตรวจไม่ได้ | Evidence tables และ verification register; ไม่สรุปเหตุเป็นผลจากความสัมพันธ์อย่างเดียว |
| 5. สร้างแผนลงมือ | Actions A1–A5 ตามกฎปัจจุบัน, roster รอบถัดไป, งบ/target ที่กรอกได้จริง, Meta audience/placement/creative และแผนปิดช่องวัด | ทุกแถวมีที่อยู่ปัจจุบัน→ปลายทาง, หลักฐาน, ค่าใหม่, วันอ่านผล, เกณฑ์สำเร็จ/ถอย; ตัดงานที่ทำแล้วและงานที่ปลายทางเท่าเดิม |
| 6. สร้างและตรวจเด็ค | ใช้ assembler เดิม; FULL internal HTML + PDF; ตรวจ build gates, QA, render และ cross-check | G1–G14 → qa_sweep → render_check → Phase D เมื่อมี client deck งวดเดียวกัน; checkpoint verify ครบก่อนส่ง |
| 7. ส่งต่องาน | สรุปสิ่งที่พร้อมลงมือ/รอข้อมูล พร้อม runbook และ before→after log | ส่งมอบเด็คและไฟล์หลักฐาน; การเปลี่ยนแคมเปญเป็นงานถัดไป ไม่รวมในคำขอวางแผนครั้งนี้ |

เส้นทางเฉพาะคำขอนี้คือ S1/Phase A → S3/Deep Dive FULL; ไม่สร้าง client deck เพิ่มโดยอัตโนมัติ หากมี client deck งวดเดียวกันต้องใช้ PARSE-PACK ชุดเดียวและทำ Phase D เทียบกัน
ถ้า raw เปลี่ยน ต้องรัน Phase A ใหม่และสร้างผลลัพธ์ที่เกี่ยวข้องใหม่; ห้ามแก้ตัวเลขใน PARSE-PACK ด้วยมือหรือใช้ pack เก่าแทน fresh export

## ข้อมูลที่จะขอ/ดึงในขั้นที่ 2

| แหล่ง | ข้อมูลที่ต้องใช้ |
|---|---|
| Shopee Ads | F1 GMV Max Detail, F2 Ads Overview/CPC, F5 Ad Group Data, F3 Keywords/Placement; F7 Live Ads หากมี paid Live |
| Business Insights | F4 Shop Stats และ F6 Parent SKU Detail ช่วงเดียวกัน; F10 Off-platform Traffic เลือกครบช่อง CPAS Sales และ UTM Traffic |
| ข้อมูลสินค้าเสริม | F8 Live Product เพื่อแยก Live-driven; F9 Product Overview สำหรับรายชั่วโมงเมื่อมี; F14 Mass Update สำหรับ stock/DTS; รายชื่อของเข้าใหม่ที่เจ้าของยืนยัน |
| สถานะ Shopee สด | vehicle ที่ ongoing, สมาชิกจากปุ่ม ลบ/เพิ่ม ทุกหน้า, GMV Max list, target, daily cap, Rapid Boost, ROAS Protection, วันสร้าง/หมุน และวันที่ตรวจ |
| Meta | DAILY, PLACEMENT, CREATIVE, CPAS shared-items; account ID, objective, audience/exclusions, destination URL/UTM และ attribution setting; ยอดปิดแชทจากชีตที่ export ใหม่หากต้องวัดผลปลายทางแชท |

การตรวจหน้าจอให้อ่านการตั้งค่า/สมาชิก ส่วนผลงานใช้ export ของงวด; F6 สถานะปัจจุบันเป็นสถานะ ณ วัน export ไม่ใช่สถานะย้อนหลังตลอดงวด
หาก Business Insights ขอให้เจ้าของปลดล็อก ให้หยุดรอที่หน้าดังกล่าว; ยังไม่ได้ตรวจว่ารอบนี้มีข้อจำกัดการเข้าถึงจริงหรือไม่
ไฟล์เสริมขาดให้ประกาศข้อจำกัดเฉพาะโมดูลและไม่เติมศูนย์; ถ้าขาดฐาน F6/V ที่จำเป็นต่อรายชื่อ ต้องพักคำสั่งราย SKU ที่พิสูจน์ไม่ได้ ไม่ใช้ ads_list/trait_list เป็นทางลัด

## คำถามวิเคราะห์ที่ต้องตอบ

**Shopee**

1. ยอดร้านและออเดอร์ยืนยันสอดคล้องกับผลโฆษณาเพียงใด: GMV, CPO, TACoS, reported/direct ROAS, organic/Live mix และ attribution gap โดยประกาศ authority ของแต่ละ metric
2. งบกระจุกอยู่ที่ใดใน GMV Max/CPC/Live; การใช้เงินน้อยสัมพันธ์กับ target, delivery, สถานะ, สมาชิกหรือจังหวะหมุนอย่างไร; ต้องมีหลักฐานก่อนสรุปสาเหตุ
3. ABC ใช้ยอดร้านจาก parent F6; แยกจากอันดับ direct GMV ที่ใช้จัด G1–G3; ตรวจ Orphan, Live-driven, attribution gap และ % ไม่ยืนยัน
4. Keyword/placement และหน้าสินค้ามีจุดรั่วตรง CTR, conversion, CPO หรือไม่; หากตัวเลือกแก้ถูกระบบควบคุมให้ระบุข้อจำกัดตามหน้าจอจริง
5. รายการที่เคยแนะนำทำไปแล้วหรือยัง และผลอ่านได้หรือยังเมื่อคำนึงถึงอายุแคมเปญ/rotation stamp; ประวัติแผนไม่ใช่หลักฐานว่าได้กดแล้ว

**Meta**

1. แยก CPAS → Shopee, แชท/inbox และ UTM/affiliate; รายงาน CPAS ฝั่ง Meta และฝั่ง Shopee เคียงกัน ไม่บวกกับ GMV ซ้ำ
2. ไล่ objective → spend → click/LPV → ผลปลายทางตามแต่ละขา; คำนวณอัตราส่วนใหม่จากผลรวม ไม่บวก ROAS รายวัน และไม่บวก Reach ข้ามแถว
3. ตรวจ creative, audience/exclusions, platform/placement และ frequency เพื่อออกแผนทดสอบที่มีงบและเกณฑ์หยุดเมื่อข้อมูลรองรับ
4. ตรวจ UTM/landing page และ attribution register จากแหล่งจริงก่อนสรุปปัญหาการวัด; แชทที่ไม่มีข้อมูลยอดปิดให้ระบุว่ายังวัดผลตอบแทนไม่ได้ แยก null จากศูนย์
5. ถ้าไม่มี margin/ต้นทุนครบ ให้เรียกยอดขาย÷ค่าโฆษณาว่าผลตอบแทนจากยอดขาย/ROAS และระบุนิยาม; ไม่อ้างเป็นกำไรสุทธิ

## เงื่อนไขของแผน Rotation และงบ

- ครอบคลุม CPC + GMV Max และ Live/solo หากมี; แยกรายการถอนสมาชิก CPC ออกจาก GMV Max, ถอนสินค้าที่ขายไม่ได้ และเพิ่มม้านั่ง พร้อม ID BLOCK ของแต่ละชั้น
- ใช้ 6 ภาชนะตาม Core §9.31; GNEW เฉพาะของเข้าใหม่ที่เจ้าของยืนยัน ห้ามเอาสินค้าเก่าถมช่อง; จังหวะหมุนเต็มผูกกับของเข้าและห้ามถี่กว่ากฎในสเปก
- ทุกคำสั่งย้ายเข้า/เปิด/เพิ่มงบต้องผ่าน R14: P ปกติ ไม่ใช่ ghost และ % ไม่ยืนยันไม่เกิน 25%; แถวไม่ผ่านต้องแสดง BLOCKED
- หลักฐานต่ำกว่าพื้นใน Core §9.31 ห้ามใช้ ROAS/ดัชนีจัดสรรตัดสิน; ไม่ใช้หน้าต่างสั้นกว่า 30 วันตัดสิน kill/keep/exclusion จากผลงานตาม master §4.10 และตรวจข้อยกเว้นเฉพาะใน Core ก่อนออกคำสั่ง
- งบกลุ่มอิงสูตร Core §9.31 กับงบที่เจ้าของยืนยัน; target ต้องเทียบ achievement rate, ช่วงที่ UI ยอมรับและ ROAS Protection พร้อม daily cap ห้ามเลือกค่าเก่าจาก STATUS
- ทุกแผนต้องมีวันอ่านผลและเกณฑ์ถอย; การตรวจหน้าจอครั้งปัจจุบันไม่ใช่หลักฐานสมาชิกตลอดช่วงย้อนหลัง ต้องใช้วันที่หมุน/ประวัติที่พิสูจน์ได้ประกอบ

## โครงส่งมอบ

FULL deck: Scope/guards → Verification & V/P/S → KPI/reconciliation → GMV Max → CPC → Keyword/placement → Traffic/incrementality → ABC/Orphan/cause map → Budget/targets → Rotation/Fresh rosters + GMS state/risk/do + ID blocks → Meta results/attribution/audience/creative/placement → Priority actions & checklist → QA
ไม่ล็อกจำนวนสไลด์ก่อนเห็นหลักฐาน; ใช้ Prompt/Sarabun และ layout จาก assembler เดิม เนื้อหาล้นให้แยกหน้าไม่ย่อฟอนต์
ไฟล์ของงวด: raw ใน data/, PARSE-PACK.json, CHECKPOINTS.md, deck_dd.json, HTML/PDF ใน out/, QA/Phase D log และ runbook/handoff

## แหล่งอ้างอิงที่อ่าน

ราก Ads: `C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee`

- [Rules overview](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/_specs/00_RULES-OVERVIEW.md>) และ README
- [Core v1.8](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/_specs/REPORT-ENGINE-CORE_v1.8.md>) §1, §2 รวม §2.6–§2.7, §9.21, §9.29, §9.31; อ่านผ่าน spec.py ทีละส่วน
- [Deep-Dive v6.9](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/_specs/Shopee-Ads-DeepDive_PROJECT-INSTRUCTIONS_v6.9.md>) INPUT, STATE, WINDOW, ACTION, FRESH, CAUSE, ABC, §2, §11
- [Orchestrator](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/_specs/PROJECT-INSTRUCTIONS_Weekly+DeepDive_v1.5.md>) §1 และ §3
- [Meta Export](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/_specs/Meta-Export-Standard_v1.2.md>) §3, §5.6, §9
- [Weekly runbook](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/Weekly/RUNBOOK_Weekly+DeepDive_v1.0.md>), RUNBOOK_TOKEN-EFFICIENT และส่วนที่เกี่ยวกับการ export/อ่านสมาชิกใน _engine/HOWTO_FETCH.md
- [Rotation STATUS](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/Weekly/2026 01AUG-07SEP2026 (rotation)/STATUS.md>) และ [MoM STATUS](<C:/Users/JIN/OneDrive/Desktop/Chubbygirlbkk - Shopee/MoM/2026-07_08 JUL-AUG/STATUS.md>) ใช้เฉพาะบริบทประวัติและงานรอตรวจซ้ำ
- [Master context](<C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARI-MASTER-CONTEXT_EN_2026-09-13.md>) และ [shopee-report-rules skill](<C:/Users/JIN/.codex/skills/shopee-report-rules/SKILL.md>)

ก่อนลงมือแต่ละ phase ให้อ่านสเปกเฉพาะส่วนที่จะใช้เพิ่ม โดยเฉพาะ Core §9.22–§9.27, DD §1–§11/QA และ Meta audience/attribution; การอ่านครั้งนี้เป็นการวางแผน ไม่ใช่การรับรองว่าอ่านทุกข้อหรือว่า engine ผ่านการทดสอบแล้ว

**ขั้นถัดไปหนึ่งอย่าง:** ล็อกช่วงวันที่ เป้าหมาย และงบของงวด เพื่อออกคำขอ export ที่ตรงกันทั้ง Shopee และ Meta
