from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
p=root/'manifest.json'
m=json.loads(p.read_text(encoding='utf-8'))
m.update(status='LAB_DEV_READY_CORE_WORKFLOWS_VERIFIED',google_runtime_tests_passed=7,
 browser_qa='Google /dev: ALL, SALES, Add success reset, fresh suggestion, invalid Add retained fields, cart quotation natural sort and shipping verified',
 deployment='LAB Version 1 initialized, Execute as Me / Only myself; use current-source /dev for tests',
 dev_url='https://script.google.com/macros/s/AKfycbxKDGZ1LPYZi7xyOZ88nIMNnXkIm7nC_EyM3hVfeu8/dev',
 remaining=['Full legacy maintenance/tools regression and Facebook dry-run not yet executed','New V2 schema is design-only; not migrated','Duplicate MAG SKU and 18 GGB copies missing prices need operator review before use outside LAB'])
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
r=root/'tests'/'google-runtime-results.json'
v=json.loads(r.read_text(encoding='utf-8'))
v['uiChecks']={'ALLLoaded':2246,'SALESDisplayed':True,'AddReset':True,'nextTitleSuggestion':'Final Fantasy suggestions populated','invalidAdd':'Enter the item name first; publisher input retained','quoteInsertionOrder':['Book 10','Book 2'],'quoteOutput':[{'title':'LAB UI 20260910 Book 2','price':70},{'title':'LAB UI 20260910 Book 10','price':110}],'quoteShipping':60,'quoteTotal':240,'addedCopies':['OWA-GGBL022YKAN00','OWA-GGBL023YKBN00']}
r.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
status='''# LAB พร้อมเปิดทดสอบ — 10 ก.ย. 2026

[เปิด LAB /dev](https://script.google.com/macros/s/AKfycbxKDGZ1LPYZi7xyOZ88nIMNnXkIm7nC_EyM3hVfeu8/dev)

Google authorization ผ่านแล้ว; ตั้ง Web app ครั้งแรกเป็น Execute as Me / Only myself และใช้งานทดสอบผ่าน /dev ซึ่งอ่าน source ปัจจุบันที่บันทึกไว้

## ผลที่ตรวจแล้ว

- Local tests 19 กรณี ผ่านหลังเทียบ Current source ร้านจริง
- Google runtime 7 กลุ่มผ่าน: shipping 0/1/2/6/7, อ่านข้อมูลคลังและหลังบ้าน, ขายรวม GGB/MAG พร้อมราคา DIRECT/AUCTION แยกเล่มและวันขาย, ส่งซ้ำไม่เพิ่มรายการ, ปฏิเสธขายซ้ำ, Add/แก้ไข/สูตร/ปฏิเสธชื่อว่าง, Booking CRUD, Contents CRUD, SALES และ journal ไม่มีคำขอค้าง
- /dev แสดง ALL และ SALES; Add ล้างข้อมูลหลังบันทึกสำเร็จ, suggestion ชื่อใหม่ทำงาน, ข้อมูลยังอยู่เมื่อกรอกไม่ครบ
- ใส่ Book 10 ก่อน Book 2 แต่ Quotation เรียง Book 2 ราคา 70 ก่อน Book 10 ราคา 110; ค่าส่ง 60 ยอดรวม 240 ถูกต้อง
- Add ใน Google Sheets จริงเขียนสูตรได้ ไม่มี write warning ในกรณีที่ตรวจ; ไม่ได้ทดสอบทุกคำสั่งจัด layout/dropdown ของ legacy tools

## ข้อมูล LAB ที่เปลี่ยนเพื่อทดสอบ

- Order OWA-20260910-01: Alan Wake OWA-GGBA001YKAR01 ราคา 271 DIRECT และ A・Club vol12 OWA-MAGA005AMAN00 ราคา 83 AUCTION, วันขาย 2026-09-09, ค่าส่งลูกค้า 60, ค่าขนส่งจริงสมมติ 40
- เพิ่ม Lab Smoke 20260910 SKU OWA-GGBL021YKAN00 และ LAB UI Book 10 / Book 2 SKU OWA-GGBL022YKAN00 / OWA-GGBL023YKBN00 รวม inventory 2,246 รายการ
- Booking/Contents ที่สร้างเพื่อทดสอบลบกลับหลังตรวจแล้ว; คงรายการขายและหนังสือทดสอบไว้ใน LAB สำหรับตรวจสอบ

## ข้อที่ยังเหลือ

- MAG มี SKU ซ้ำ OWA-MAGM117VKAR01; ระบบปฏิเสธขาย SKU ที่ซ้ำ ไม่เปลี่ยนรหัสเองเพราะอาจสัมพันธ์กับรูป
- GGB Instock ไม่มี Price 18 รายการ ต้องระบุราคาขายจริงก่อนขาย
- งานนี้ยืนยันเส้นทางหลักของ 5 ข้อที่ขอ ยังไม่ได้รันทุก maintenance tool หรือ Facebook dry run
- Facebook helper ของจริงอยู่ครบแต่ LAB ปิด token access และ posting trigger; ไม่ได้โพสต์จริง
- ITEMS V2/TAXONOMY/ORDERS V2 ยังเป็นการออกแบบ ไม่ได้แทน legacy schema; สถานะรับเงินยังแยกจากการบันทึกขาย และยังไม่ได้พัฒนาระบบรับเงิน V2
- Apps Script และข้อมูลร้านเดิมไม่ถูกแก้ไข

หลักฐาน: tests/google-runtime-results.json และ manifest.json
'''
(root/'LAB-STATUS.md').write_text(status,encoding='utf-8')
for path in [root/'README.md',root.parent.parent/'00 Docs'/'HANDOFF.md']:
 text=path.read_text(encoding='utf-8-sig'); lines=text.splitlines(True)
 lines.insert(1,'\n> **ผลล่าสุด 10 ก.ย. 2026:** Google authorization ผ่านแล้ว และ LAB /dev พร้อมทดสอบ ผ่าน local tests 19 กรณี + Google runtime 7 กลุ่ม พร้อมตรวจ UI Add reset/suggestion/invalid Add และ Quote sort แล้ว ดู `03 Apps Script/Backoffice Update/LAB-STATUS.md` และ `tests/google-runtime-results.json` เป็นสถานะปัจจุบัน; ข้อความ authorization pending ด้านล่างเป็นประวัติเก่า\n')
 path.write_text(''.join(lines),encoding='utf-8')
print('Recorded verified Google runtime and /dev UI results.')
