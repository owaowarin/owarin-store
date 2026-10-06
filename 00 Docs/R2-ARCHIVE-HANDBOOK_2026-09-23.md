# คู่มือ R2 Archive — OWARIN STORE

## สรุป

- ใช้ bucket ส่วนตัว `owarin-images-archive` เป็น **สำเนาสำรอง** ไม่ใช่ที่เสิร์ฟรูปให้ลูกค้า/Meta
- สำเนา baseline อยู่ที่ `baseline/20260923T0718Z-3b229f4a/remote/` โดยคง key path เดิมทั้งหมดไว้ใต้ prefix นี้
- สำรองจาก bucket `owarin-images` จำนวน **2,708 objects / 796,426,890 bytes**; `rclone check --download` ยืนยัน **0 differences, 2,708 matching files** เมื่อ 2026-09-23
- ต้นทาง `owarin-images` ไม่ถูกแก้ ลบ หรือเขียนทับ และไม่มีการเปิด public access ให้ archive

## ทำไมแยกชื่อ Archive

`owarin-images` คือ bucket ใช้งานจริงที่ URL รูปสาธารณะและระบบเดิมอ้างถึง ส่วน `owarin-images-archive` แยกไว้รักษาสำเนา snapshot โดยไม่เสี่ยงเปลี่ยน URL หรือทำให้ไฟล์สำรองปรากฏสาธารณะ คำว่า Archive จึงสื่อหน้าที่ของ bucket นี้ ไม่ใช่สถานะสินค้า และไม่ใช่ที่เก็บที่เชื่อมกับ Google Sheet อัตโนมัติ

## เปิดดูและดาวน์โหลดจาก Cloudflare

1. เข้า Cloudflare Dashboard → **R2 Object Storage** → bucket **`owarin-images-archive`**
2. เปิด folder/prefix `baseline/20260923T0718Z-3b229f4a/remote/` เพื่อดูสำเนา baseline; path ย่อยข้างในตรงกับ key เดิม เช่น `library/...`, `meta/...` และ `_to_delete/...`
3. เลือก object ที่ต้องการแล้วใช้คำสั่งดาวน์โหลดของหน้า R2

Bucket นี้เป็น private: URL สาธารณะเดิมของ `owarin-images` ใช้กับ archive ไม่ได้ และไม่ควรเปิด Public Access เพื่อให้เข้าถึงง่าย หากต้องกู้ไฟล์จำนวนมาก ให้ใช้ R2 API/rclone ด้วย credential ที่จำกัดสิทธิ์และทดสอบ dry-run ก่อน

## กู้คืนหรือทำสำเนารอบใหม่

- ก่อนคัดลอกจาก archive กลับ `owarin-images` ให้กำหนด key ปลายทางให้ชัด ตรวจ dry-run และรายการที่จะชนกับไฟล์เดิมก่อน; ห้ามใช้ `rclone sync`, delete หรือ overwrite โดยไม่ตรวจและอนุมัติ
- ก่อนทำ baseline รอบใหม่ ให้สร้าง prefix ใหม่ที่มี run ID/วันเวลา ห้ามเขียนทับ prefix เดิม; สร้าง inventory/manifest และ CSV log, คัดลอกแบบไม่เขียนทับ แล้วตรวจจำนวนและเนื้อหาไฟล์หลังคัดลอก
- สำเนานี้รวมทุก object ที่อยู่ใน source ตอนเก็บ snapshot รวมถึง key ใต้ `_to_delete/`; อย่าลบออกจาก archive เพียงเพราะชื่อมี `_to_delete`
- การเก็บ snapshot นี้เป็นการคัดลอก ไม่ใช่ lifecycle/retention policy; ยังไม่มีการตั้งอายุลบอัตโนมัติ

## Token และความปลอดภัย

token `owarin-archive-copy-20260923` ถูกสร้างด้วย Object Read & Write จำกัด bucket `owarin-images-archive` และหมดอายุ 2026-10-23 แต่ credential ถูกใช้ชั่วคราวระหว่างงานและไม่ได้เก็บใน workspace/clipboard หลังจบงาน จึงอย่าคาดว่าจะดึง secret เดิมกลับมาใช้ได้; หากต้องทำงาน R2 ในอนาคต ให้สร้าง credential ใหม่เฉพาะงาน จำกัด bucket/permission/อายุ และเก็บใน secret store ที่เหมาะสม ห้ามใส่ secret ใน Apps Script source, CSV, handoff หรือ Git

token เดิมยัง Active จนกว่าจะหมดอายุหรือถูกเพิกถอน แม้ไม่มีการเก็บ secret ไว้ในไฟล์ แนะนำให้เจ้าของพิจารณาเพิกถอน token ที่เลิกใช้แล้วจาก Cloudflare Dashboard; การเพิกถอนยังไม่ได้ทำในงานนี้

## เชื่อม Apps Script / New Arrival

เอกสารนี้บันทึกเฉพาะ baseline archive ที่ทำเสร็จ ยังไม่มี Apps Script command สำหรับส่งภาพเข้า archive หรือ workflow New Arrival ที่เชื่อมกับ bucket นี้ โดย `03 Apps Script/Web App/R2Upload.gs` ปัจจุบันมีคำสั่ง export/queue Instock snapshot ไปให้ Windows worker; อย่าถือว่าการกดคำสั่งนั้นจะอัปโหลดหรือ archive รูปให้เอง ก่อนเปิด workflow ใหม่ ต้องกำหนดว่าจะอัปโหลดไป live bucket หรือ archive, prefix/key, การจัดการชื่อซ้ำ, credential storage, retry และ audit log แล้วค่อยทดสอบ dry-run

## บันทึกหลักฐาน

- Inventory: `04 Design Tools/logs/r2_archive_baseline_20260923T0718Z-3b229f4a/source-inventory.csv`
- Copy plan: `04 Design Tools/logs/r2_archive_baseline_20260923T0718Z-3b229f4a/copy-plan.csv`
- Operation/access logs: `04 Design Tools/logs/cloudflare_archive_prepare_20260923.csv`, `cloudflare_archive_access_20260923.csv`
- Session handoff: `00 Docs/HANDOFF_2026-09-23.md`
