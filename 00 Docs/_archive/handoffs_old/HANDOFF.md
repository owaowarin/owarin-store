# HANDOFF — FB Album Auto-Post (OWARIN STORE)

> **ผลล่าสุด 10 ก.ย. 2026:** Google authorization ผ่านแล้ว และ LAB /dev พร้อมทดสอบ ผ่าน local tests 19 กรณี + Google runtime 7 กลุ่ม พร้อมตรวจ UI Add reset/suggestion/invalid Add และ Quote sort แล้ว ดู `03 Apps Script/Backoffice Update/LAB-STATUS.md` และ `tests/google-runtime-results.json` เป็นสถานะปัจจุบัน; ข้อความ authorization pending ด้านล่างเป็นประวัติเก่า

> **ล่าสุดหลังลงชื่อ Google 10 ก.ย. 2026:** สำรอง Current source ร้านจริงครบ Code.gs / webapp.gs / Index.html / FbAlbum.gs ใน `03 Apps Script/Live Source/Current-2026-09-10` และพบ `_fbaOriginalIndex` จริงแล้ว ติดตั้งชุด LAB ครบ 7 ไฟล์ใน bound project `1bupxRQ_TdiMQwdCh7UZYyjd42trmCQ_AbXlC8RlBmj1ZUbyCGBfc6Cgz`; ตรวจคัดลอก Editor เทียบ candidate ตรงทุกไฟล์ และผ่าน Node tests 19 กรณี ขณะนี้หยุดที่ Google Authorize access (popup ยังไม่ปรากฏใน CUA tabs) ยังไม่มีผลรัน owaCheckEnvironment/owaLabSmokeTest จริง; ตั้ง Web app ครั้งแรกเป็น Me / Only myself ตามข้อความ Google ที่กำหนดให้ deploy หนึ่งครั้งก่อนมี Test URL ดู `03 Apps Script/Backoffice Update/LAB-STATUS.md` และ manifest.json เป็นสถานะหลักแทนข้อความเก่าด้านล่าง ร้านเดิมยังไม่แก้

> **ยืนยันใหม่จากเจ้าของ 10 ก.ย. 2026 — ใช้แทนข้อสมมติเรื่อง deployment ด้านล่าง:** ร้านเดิมใช้ Test deployment /dev เท่านั้น จึงใช้ source ปัจจุบันที่บันทึกเป็นฐาน ไม่ต้องขอ Deployed version เก่า; เป้าหมาย LAB ต้องใช้งานเหมือนร้านครบทุกฟังก์ชัน ใช้และแก้ข้อมูลที่อยู่ใน LAB เพื่อทดสอบได้ เจ้าของอนุญาต AI ทำงานที่จำเป็นจนทดสอบได้ โดยประหยัด token; ชีตร้านเดิมยังไม่แก้

> **ความคืบหน้า 10 ก.ย.:** เพิ่ม Runtime.gs กำหนด ID เฉพาะ LAB และสร้าง Core.gs จาก local Code_v20 พร้อมเปลี่ยน getActiveSpreadsheet()/getActive() เป็น resolver เดียวทั้ง core/WebApp/SalesService ผ่าน 19 tests รวม active spreadsheet=null และ sample จริงจาก LAB แต่ยังไม่ติดตั้งหรือรัน Apps Script จริง และยังไม่ได้ดึง Current source จาก Editor; connector อ่าน Google Sheets ได้ แต่ CUA มีเฉพาะ in-app browser ซึ่งติด Google Sign in (ไม่มี Chrome ที่เชื่อมต่อ) เปิดแท็บ LAB รอให้เจ้าของลงชื่อแล้ว

> **แถบเหลือง LAB:** ตรวจพบ `R2 IMAGES!E2` เป็น `IMPORTDATA` ดึง https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/meta/images.csv?v=4 เป็น external URL formula; ไม่ใช่ error Apps Script และยังไม่ได้กด Allow access อัตโนมัติ

> **ตรวจเพิ่มขณะอธิบายวิธีติดตั้ง:** candidate และ core v20 มี `getActiveSpreadsheet()` หลายจุด ต้องแก้การเปิดชีตให้ระบุ ID ชัดเจนครบ call chain ก่อนทดสอบ web app /dev; Google ระบุว่า bound-container special methods ไม่พร้อมใช้ใน web app การทดสอบ mock 17 ชุดยังไม่ครอบคลุมข้อจำกัดนี้ จึงยังห้ามสรุปว่า candidate พร้อมติดตั้งจริง ดูหมายเหตุใหม่ใน README ของ Backoffice Update

> **Apps Script candidate 9 ก.ย. 2026:** แก้ 5 ข้อแยกใน `03 Apps Script/Backoffice Update/` แล้ว: ALL รวมคลัง, SALES รายเล่ม, ประมูล/ราคาต่อเล่ม/วันขาย, Add reset, Quotation เรียงชื่อ; เพิ่ม journal กันการขายซ้ำและทำต่อจากจุดค้าง ผ่านการทดสอบในเครื่องและ UI ข้อมูลสมมติ ยังไม่ติดตั้งใน LAB หรือ production และยังต้องเทียบ source ที่ใช้งานจริง อ่าน `03 Apps Script/Backoffice Update/README.md` ก่อนทำต่อ

> **สร้าง LAB แล้ว 9 ก.ย. 2026:** [OWARIN — BACKOFFICE LAB v2 — TEST ONLY](https://docs.google.com/spreadsheets/d/158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE/edit) เป็นคนละไฟล์กับร้านจริง; สำเนาเดิม 12 แท็บซ่อนไว้ + 8 แท็บใหม่, ITEMS V2 2,243 แถวพร้อมรหัสทดสอบและคิวตรวจประเภท, ORDERS/ORDER LINES/PAYMENTS เป็นแม่แบบว่าง, ค่าส่ง 0–8 เล่มตรวจผ่านทั้งหมด, FB ALBUMS active=FALSE เฉพาะ LAB รายละเอียด [BACKOFFICE-LAB.json](BACKOFFICE-LAB.json) และ [LAB-ITEM-MAPPING.json](LAB-ITEM-MAPPING.json) ต้องรักษารหัสทดสอบเดิมเมื่อจัดเรียง ข้อมูลนี้เป็น snapshot ไม่ใช่ live sync; ยังไม่แก้หรือ deploy Apps Script ในร้านจริง

> **กติกาเจ้าของล่าสุด:** ซื้อหลายเล่มแต่คิดต้นทุนต่อเล่ม, Price คือราคาสินค้าจริงไม่รวมค่าส่งถึงลูกค้า, คง Cost เดิมไม่บวกซ้ำ; ค่าส่ง 50 + 10 ต่อเล่มถัดไป สูงสุด 100 บาท ไม่มี COD โครงการออกแบบใน LAB แต่ Apps Script ที่เสร็จจะนำไปใช้กับชีตเก่า จึงต้องรองรับ schema เดิมและแยกขั้นตอน migration ออกจากการ deploy

> **ขอบเขตล่าสุด:** พักเว็บไซต์ ออกแบบหลังบ้านใหม่ ดู [BACKOFFICE-REDESIGN-v0.1.md](BACKOFFICE-REDESIGN-v0.1.md) (เนื้อหา v0.2) และ [BOOK-TAXONOMY-v1.md](BOOK-TAXONOMY-v1.md) รวม Apps Script update 5 ข้อ; เจ้าของยืนยัน Auction = ขายผ่านประมูลแล้ว ราคาชนะรายเล่ม, ใช้งานคนเดียว, ขายทาง Messenger ทั้งรับเงินทันที/รอโอน, Model คือ Magazine Model และแต่ละเล่มแยก condition/ราคา/รูป/ชั้น ห้ามถามสามข้อเดิมซ้ำหรือถือ Auction ว่าพร้อมขาย ยังไม่ได้แก้โค้ด production หรือย้ายข้อมูล

> **ผลตรวจสด 8 ก.ย. 2026:** อ่าน [OVERVIEW-2026-09-08.md](OVERVIEW-2026-09-08.md) ก่อนใช้ตัวเลข/ลำดับงานด้านล่าง ซึ่งเป็นประวัติรอบก่อน: สต็อก 2,243 แถว, Instock 1,077, PID ซ้ำ 1 รหัส; Facebook log ล่าสุด 20:43 มี error 40 และ META EXPORT มีข้อมูลไม่ตรง inventory ปัจจุบัน รายละเอียดระบุแถวอยู่ใน [AUDIT-ISSUES-2026-09-08.json](AUDIT-ISSUES-2026-09-08.json) รอบนี้สำรวจเท่านั้น ไม่แก้ชีต/trigger/โพสต์หรือ deploy; ยังต้องเทียบ Apps Script source ที่ใช้งานจริงก่อนอัปโค้ดในเครื่อง

> อ่านไฟล์นี้เป็นไฟล์แรกในแชทใหม่ แล้วอ่าน `PLAN-fb-album-autopost.md` ต่อถ้าต้องการรายละเอียดเชิงลึก
> ภาพรวมทุกโปรเจกต์ + ลำดับงาน + กติกาประหยัด token: `00 Docs/REVIEW-2026-09-05.md`
> อัปเดตล่าสุด: 1 ก.ย. 2026 ~02:00 — แก้ PID/R2 จบ, อัลบั้ม 108 รูป, ไฟล์ Shopee/Meta พร้อมอัป

---

## 0) วิธีเริ่มแชทใหม่ให้ประหยัด token

พิมพ์ประโยคนี้ในแชทใหม่:

```
อ่าน C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\HANDOFF.md
ก่อนทำอะไรทั้งหมด แล้วเช็คข้อมูลจริงจาก Google Sheet ทุกครั้งก่อนสรุปตัวเลข
```

โฟลเดอร์ที่ต้อง connect ในแชทใหม่: `C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE`

---

## 1) ระบบนี้คืออะไร

Google Apps Script อ่านสต๊อกจาก Google Sheet -> ดึงรูปจาก Cloudflare R2 -> โพสต์ลง Facebook Page Album อัตโนมัติ ผ่าน Graph API v23.0 ทุก 4 ชั่วโมง ครั้งละ 40 รูป ค่าใช้จ่าย 0 บาท

## 2) ค่าคงที่ / ID ที่ต้องใช้

| อย่าง | ค่า |
|---|---|
| Facebook Page | OWA - OWARIN's STORE, ID `676297058896868` |
| Meta App ที่ใช้ mint token | `OWARIN-Auto-Post` ID `938363492003898` (ห้ามใช้ app `OWARIN STORE` 2279430239580154 เพราะไม่มี pages_manage_posts) |
| Graph API | `https://graph.facebook.com/v23.0` |
| Apps Script project | bound project ชื่อ `webapp` ID `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp` |
| ไฟล์สคริปต์ | `FbAlbum.gs` (แยกไฟล์ ห้ามแปะทับ `Code.gs` เด็ดขาด) |
| Page token | เก็บใน Script Properties key `FB_PAGE_TOKEN` (expires_at = 0 ไม่หมดอายุ) |
| R2 base URL | `https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/` path `library/<Product ID>/n.jpg` |
| Timezone | Asia/Bangkok |

## 3) ชีตที่เกี่ยวข้อง

- `GAME GUIDE BOOKS` และ `MAGAZINE` — สต๊อกจริง ข้อมูลเริ่มแถว 3 มีคอลัมน์ `Type` เป็นตัวแยกอัลบั้ม
- `ALBUM CAPTION` — หัวตาราง `Product ID | Item name | Sheet | Image URL | Caption | Posted` สร้างโดยเมนู `🖼️ Build ALBUM CAPTION (GGB + MAG)` ปัจจุบัน 1,078 แถว
- `FB ALBUMS` — A=album_key B=album_id C=ชื่ออัลบั้ม D=จำนวนรูป E=active (FALSE = HOLD ไม่โพสต์) G/H = สรุปผลรัน
- `TYPE LIST` — A = สูตรดึง Type ทั้งหมด, B = ชื่ออัลบั้มเต็มพร้อม prefix

**ชีตทั้งหมดเป็น Google Sheets Tables (typed columns)** -> Apps Script เขียนตรงไม่ได้ ต้องผ่าน `_tryWrite()` เท่านั้น

## 4) เมนูใน Spreadsheet

`📦 Inventory Tools` > `📷 FB Album Auto-Post`

| เมนู | ฟังก์ชัน | ทำอะไร |
|---|---|---|
| 🔑 Check Page token | `fbaCheckToken` | เช็ค token ยังใช้ได้มั้ย |
| 🔄 Sync albums from the Page | `fbaSyncAlbums` | ดึงรายชื่ออัลบั้มจากเพจมาลง `FB ALBUMS` |
| 🔍 Audit Type -> album mapping | `fbaAudit` | เช็คว่า Type ไหนยังไม่มีอัลบั้มรองรับ |
| 🧪 Post 3 photos (test) | `fbaTest3` | ทดสอบ 3 รูป |
| ▶️ Post one batch | `fbaPostBatch` | ยิง 1 รอบ 40 รูป |
| ⏱️ Run every 4 hours | `fbaInstallTrigger` | เปิดตารางอัตโนมัติ |
| ⏹️ Stop the schedule | `fbaRemoveTrigger` | หยุด |
| ♻️ Retry ERROR rows only | `fbaRetryErrors` | ลองใหม่เฉพาะแถว ERROR |
| 🗑️ Clear Posted column ⚠️ | `fbaResetPosted` | ล้าง Posted ทั้งคอลัมน์ (อันตราย) |

**ต้องรันจากเมนูใน Spreadsheet เท่านั้น** รันจากหน้า Apps Script editor จะพัง เพราะ `SpreadsheetApp.getUi()` throw

## 5) กฎการทำงานของสคริปต์ (v3)

1. อ่านเฉพาะ `Status = Instock`
2. จับคู่ Type -> อัลบั้ม โดยตัด prefix `【INSTOCK dd/mm/yyyy】` ออกก่อนเทียบ
3. **ลำดับการโพสต์: อัลบั้มที่มีรูปน้อยสุดก่อน**
4. **Dedupe RESTOCK**: key = `Type | ชื่อฐาน | Publisher | Original` — key ซ้ำ = ปกเดียวกัน โพสต์เล่มเดียว (เลือกเล่มที่ไม่ใช่ RESTOCK ก่อน) เล่มที่เหลือเขียน `DUPLICATE of <PID>` ลงคอลัมน์ Posted / คนละ Publisher หรือคนละ Original = โพสต์ทั้งคู่
5. `active = FALSE` ใน `FB ALBUMS` = HOLD ข้ามอัลบั้มนั้น
6. Posted มีค่าแล้วและไม่ขึ้นต้นด้วย `ERROR` = ข้าม (idempotent)
7. หยุดเองเมื่อ usage ถึง 75%

## 6) สถานะปัจจุบัน (1 ก.ย. 2026 เวลา ~02:00)

**Trigger: เปิดอยู่ ▶️ ทุก 4 ชม. × 40 รูป** · ยิงเฉพาะ `GAME GUIDE BOOKS` · album_id `122195741756903319`
`FB ALBUMS` (เรียงหลัง sync): GAME GUIDE BOOKS = **แถว 4** active TRUE · MEGA⨯GAME แถว 16 · MEGA MONTH แถว 17 (FALSE ทั้งคู่)
⚠️ ลำดับแถวเปลี่ยนทุกครั้งที่ `🔄 Sync albums` อย่ายึดเลขแถวเดิม

| | |
|---|---|
| อัลบั้มบนเพจ | **108 รูป** |
| ALBUM CAPTION · GGB รอโพสต์ | **165** |
| ALBUM CAPTION · MAGAZINE รอโพสต์ | 277 (HOLD) |
| ERROR ค้าง | **1 แถว** — `OWA-MAGT016AMAN00` (ไม่มีรูปจริงบน R2 ผู้ใช้จัดการเอง) |

รอบล่าสุด (manual 01 ก.ย. ~01:5x): queued 40 · **Posted OK 39 · errors 1** · still queued 166 · duplicate 0 · unmapped 0

**ปัญหา PID เปลี่ยนเลข — แก้จบแล้ว ✅**
รัน `fix_r2_renamed_pids.ps1` บนเครื่อง copy โฟลเดอร์รูป 4 คู่บน R2 + rebuild `meta/images.csv` (1,728 → **1,732 รายการ / 2,523 รูป**) + bump `?v=3` → `?v=4` ใน `R2 IMAGES!E2`
ยืนยันแล้ว: `library/<PID ใหม่>/1.jpg` ทั้ง 4 ตัวคืน HTTP 200 · index ในชีตมีครบ · และ 3 ใน 4 ตัวโพสต์ขึ้นอัลบั้มสำเร็จในรอบล่าสุด (ตัวที่ 4 คือ vol 41 ถูก dedupe เป็น DUPLICATE ของ `OWA-GGBG045GMSAR01`)

**Shopee — rebuild ล่าสุดหลังแก้ R2**
`Shopee\out\mass_upload_2026-08-31.xlsx` — **447 listings / 934 rows / held_back 140 / missing_images 2**
(ก่อนแก้ R2: 445 / 930 / 140 / 6 → 4 เล่มที่รูปหายกลับเข้าไฟล์ครบ)
missing_images ที่เหลือ 2 ตัวคือ `OWA-MAGM117VKAR01` และ `OWA-MAGT016AMAN00` — ไม่มีรูปจริงบน R2 ทั้งคู่

**อัปเดตราคา 31/08 — รีบิลด์ครบแล้ว** ราคาเปลี่ยน 6 แถว ทั้งหมดเป็น GAMEMAG SPECIAL:
vol 18 (220→430 / MP 390→690) · vol 25 Rockman ×3 (400→470, 340→410, 400→470) · vol 55 FF VII (570→670) · vol 66 FF I-X (760→850)
อย่างอื่น: `OWA-MAGH186AMAR01` / `OWA-MAGH187AMAR01` → Sold (Instock 1078→1076)

ลำดับรีบิลด์ที่รันแล้ว: `Rebuild descriptions` 2,172 → `Build FB CATALOGUE` 2,174 → `Build ALBUM CAPTION` 1,076 → `Build META EXPORT` **พร้อมอัป 770**

ไฟล์พร้อมใช้: `_exports\` (4 CSV สด · สำรองไว้ที่ `prev-20260830\` และ `prev-20260831-1407\`) · `Shopee\out\mass_upload_2026-08-31.xlsx` · `_exports\META EXPORT.csv`

## 7) งานค้าง (ต้องทำต่อ)

1. **ยังไม่ได้อัปโหลดจริงทั้ง Shopee และ Meta** — ไฟล์สร้างเสร็จแล้ว รอผู้ใช้สั่ง
   ⚠️ ก่อนอัป Shopee ไฟล์เต็ม ต้องลบ draft ทดสอบ 10 ตัวจากรอบ 30/08 ก่อน ไม่งั้นได้ SKU ซ้ำ (ดู PLAN-shopee-relisting §10d)
   Shopee mass upload ลงเป็น **draft** เท่านั้น ต้องไปกด `เผยแพร่` ที่ ยังไม่ลงขาย → แบบร่าง อีกที

2. ~~PID เปลี่ยนเลข 4 ตัว รูปบน R2 อยู่ใต้ PID เก่า~~ **แก้แล้ว 1 ก.ย. 2026** ด้วย `fix_r2_renamed_pids.ps1`
   (สคริปต์อยู่ในโฟลเดอร์นี้ ใช้ซ้ำได้ทุกครั้งที่ PID ถูก regenerate — แก้ตาราง `$Pairs` ด้านบนของไฟล์ให้เป็นคู่ใหม่แล้วรัน)

3. **ERROR 324 เหลือ 1 แถว** — `OWA-MAGT016AMAN00` TV Magzine Hero vol 1-28 (ไม่มีรูปจริงบน R2 ทั้ง jpg/png)
   อีก 1 ตัวที่ไม่มีรูปคือ `OWA-MAGM117VKAR01` อยู่ในอัลบั้ม HOLD ยังไม่ถึงคิว — ทั้งคู่คือ missing_images 2 ตัวในไฟล์ Shopee ด้วย

4. **caption บนเฟซของ 6 เล่ม GAMEMAG SPECIAL ยังเป็นราคาเก่า** — รูปถูกโพสต์ไปก่อนขึ้นราคา สคริปต์จะไม่โพสต์ซ้ำเพราะ Posted มีค่าแล้ว
   ทางเลือก: (ก) แก้ caption ด้วยมือบนเพจ 6 รูป (ข) ลบ 6 รูปนั้นบนเพจ แล้วล้าง Posted เฉพาะ 6 PID นี้ให้ยิงใหม่
   **ยังไม่ตัดสินใจ**

5. **META EXPORT ยังขาดข้อมูล 307 แถว** — `title` ว่าง 306 แถว (ส่วนใหญ่เป็น `OWA-MAGM09xVKAN00` กลุ่ม MEGA) และ `condition` ว่าง 1 แถว (`OWA-GGBH015CTR09`) แถวพวกนี้จะไม่ขึ้น catalog

6. **image_link ของ FB CATALOGUE ก็ฮาร์ดโค้ด `/1.jpg`** เหมือนกัน — 16 เล่มที่เป็น .png (ดูข้อ 8) จะไม่มีรูปใน Meta catalog ถึงแม้ FB album จะแก้ด้วย fallback แล้ว ยังไม่ได้แก้ฝั่ง catalog

7. **vol 41 ซ้ำ** — `OWA-GGBG045GMSCN00` (Original=40) กับ `OWA-GGBG045GMSAR01` (Original=35) คนละ Original → โพสต์ทั้งคู่ **ยังไม่ตัดสินใจ**: (ก) แก้ Original ให้ตรงกัน (ข) ตัด Original ออกจาก dedupe key

8. **ป้ายเมนูเพี้ยน (cosmetic)** — เมนูเขียน `▶️ Post one batch (25)` แต่ `FBA_BATCH = 40` ยิงจริง 40 รูป/รอบ

9. ทางเลือกที่เสนอไว้ยังไม่ตอบรับ: เรียงคิวในอัลบั้มตามชื่อ (natural sort), เพิ่ม `fbaRemoveSold()` ลบรูปของที่ขายแล้ว

## 8) กฎเหล็ก / บทเรียนที่เจ็บมาแล้ว

- **`fbaClearPostedByType('<Type>')` มีแล้วใน `FbAlbum.gs`** — ล้าง Posted เฉพาะ Type เดียว (รวม DUPLICATE/ERROR ของ Type นั้น) ใช้แทน `🗑️ Clear Posted column` ที่ล้างทั้งคอลัมน์
  ยังไม่มีเมนู ต้องรันจากหน้า Apps Script (ไม่มี `getUi()` จึงรันจาก editor ได้) — วิธีเลือกฟังก์ชันในดรอปดาวน์ข้าง Run: ดรอปดาวน์เลื่อนยาก ให้แทรกฟังก์ชัน wrapper ชั่วคราวไว้บนสุดของไฟล์ มันจะถูกเลือกอัตโนมัติ แล้วลบทิ้งหลังรันเสร็จ
- **`_fbaRun` มี fallback `.png` แล้ว** — เจอ error 324 กับ URL `.jpg` จะยิงซ้ำด้วย `.png` อัตโนมัติ (แก้เคส 16 เล่มที่ต้นฉบับเป็น png)
- **ลำดับรีบิลด์หลังแก้ราคาที่ถูกต้อง**: Rebuild descriptions → Build FB CATALOGUE → Build ALBUM CAPTION → Build META EXPORT (ถ้าข้าม Rebuild descriptions จะเหลือของพร้อมอัป Meta แค่ 514 จาก 770)
- **URL รูปฮาร์ดโค้ด `.jpg` ทั้งระบบ แต่บน R2 มีไฟล์ `.png` ปนอยู่** เช็ค `_r2_upload\_v4\manifest.csv` คอลัมน์ `r2_key` ก่อนสรุปว่า "R2 ไม่มีรูป" — error 324 มักแปลว่านามสกุลไม่ตรง ไม่ใช่ไม่มีไฟล์
- **หลังแก้ราคาทุกครั้ง ต้องรัน `🖼️ Build ALBUM CAPTION` ใหม่ก่อนโพสต์รอบถัดไป** เพราะ Caption เป็นค่านิ่ง ไม่ใช่สูตร
- **ห้ามแปะโค้ดทับ `Code.gs`** โปรเจ็กต์หลักยาว 3,275 บรรทัด เคยโดนทับจนเมนูหายมาแล้ว โค้ดใหม่ต้องเป็นไฟล์แยกเสมอ
- โค้ดหลักที่ live คือ `Code_v20.gs` / `WebApp_v20.gs` **เขียนเป็นภาษาอังกฤษล้วน** ห้ามเขียนคอมเมนต์ไทย
- เขียนชีตต้องผ่าน `_tryWrite()` เท่านั้น
- ก่อนเขียนโค้ดใหม่ ต้องอ่านไฟล์เดิมของโปรเจ็กต์ก่อนและ reuse ของที่มีอยู่ (`_metaInvIndex`, `_fbFindCol`, `_withLock`, `_resolveColumns`, `_val`, `_getBaseTitle`)
- Facebook Graph API **สร้างอัลบั้มไม่ได้ / แก้ไขอัลบั้มไม่ได้** ต้องสร้างมือบนเพจ แล้วค่อย sync
- Page token ต้อง Extend user token เป็น 60 วันก่อน แล้วค่อยเรียก `/me/accounts` ไม่งั้นได้ token อายุสั้น (error 190)
- Error code: 4/17/32/341/613 = rate limit, 190 = token, 324 = รูปไม่มี/พัง, 200 = permission
- Apps Script quota: 6 นาที/execution, 90 นาที/วัน สำหรับ trigger, UrlFetch 20,000/วัน
- ปิดคอมได้ trigger รันบนเซิร์ฟเวอร์ Google

## 9) เรื่อง FB Shop (แยกเรื่อง ยังไม่แก้)

Shop tab ไม่ขึ้นบนเพจ เพราะ `Checkout: Not configured` — Meta ปิด in-app checkout ไปกลางปี 2025 เหลือแต่ website checkout ไทยยังเป็นประเทศที่รองรับ Shops อยู่ ปัญหาคือยังไม่มีเว็บไซต์สำหรับ checkout ไม่ใช่เรื่องประเทศหรือ catalog

Catalog ปัจจุบันเก่า มี 364 รายการจาก feed วันที่ 08/08/2026 ขณะที่สต๊อกจริง 1,078 รายการ

## 10) วิธีการทำงานที่ต้องการ (บันทึกไว้แล้วใน memory)

- เช็คข้อมูลจริงจากชีตทุกครั้งก่อนสรุปตัวเลข ห้ามตอบจากความจำในแชท
- บอกตัวเลขต้องแนบรายการแถวจริงด้วยเสมอ
- คำสั่งต้องละเอียดระดับคลิก: บอกชื่อปุ่ม ชื่อช่อง ค่าที่ต้องกรอก
- คำเตือนเรื่องอันตราย/ลบข้อมูล ต้องอยู่บรรทัดแรก ไม่ใช่ในคอมเมนต์หรือท้ายไฟล์
- ตอบภาษาไทย ตรงประเด็น ไม่ต้องเกริ่น

## 11) ไฟล์ในโฟลเดอร์นี้ (จัดหมวดใหม่ 5 ก.ย. 2026)

| path | คืออะไร |
|---|---|
| `00 Docs/HANDOFF.md` | ไฟล์นี้ — สรุปสำหรับเริ่มแชทใหม่ |
| `00 Docs/PLAN-fb-album-autopost.md` | แผนงานฉบับเต็ม 18 หัวข้อ |
| `00 Docs/PLAN-shopee-relisting.md` | คนละเรื่อง (Shopee) |
| `00 Docs/OWARIN — Card Spec.md` · `OWARIN — Ad Visual Style Guide.md` | สเปกงานการ์ด/ภาพโฆษณา |
| `03 Apps Script/FbAlbum.gs` | สำเนาโค้ดที่ deploy อยู่ (v3) |
| `03 Apps Script/RESTORE_Code.gs` | สำเนา Code.gs ไว้กู้คืน |
| `03 Apps Script/Web App/` | โค้ดตัวจริง `Code_v20.gs` / `WebApp_v20.gs` / `Index.html` + คู่มือชีต |
| `04 Design Tools/` | studio HTML ทั้งหมด + `owarin_covers.js` / `owarin_logo.js` / `owarin_card_test.mjs` |
| `fix_r2_renamed_pids.ps1` (root) | สคริปต์แก้ PID ที่ถูก regenerate — path ในไฟล์เป็น absolute จึงย้ายได้อิสระ |
| `_exports/` · `_r2_upload/` · `_fb_albums/` · `Shopee/` | pipeline — **ห้ามย้าย** `Shopee/build_shopee_upload.py` อ่าน `../_exports` |
| `_archive/secrets/` | `r2-setup.bat` (มี Secret Key) + `cloudflare token.txt` — ย้ายออกจาก root แล้ว |
| `Shopee/out/_old/` | ไฟล์ `_TEST` + `mass_upload_2026-08-30.xlsx` รอบเก่า · ตัวจริงคือ `mass_upload_2026-08-31.xlsx` |
