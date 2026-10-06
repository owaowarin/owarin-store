# อัปรูปสินค้าขึ้น Supabase Storage → ใช้เป็น `image_link` ของ Meta Catalog

เป้าหมาย: ให้ทุกสินค้ามี URL รูปสาธารณะที่ Facebook/Meta ดึงไปแสดงในแค็ตตาล็อกได้
ผลลัพธ์สุดท้าย: คอลัมน์ `image_link` ใน FB CATALOGUE เต็มทุกแถว

---

## 0. ตัวเลขจริงจากเครื่องคุณ (สแกนแล้ว)

| รายการ | ค่า |
|---|---|
| ไฟล์รูปทั้งหมด | **3,974 ไฟล์ · 3.70 GB** |
| ชื่อสินค้าที่ไม่ซ้ำ (GGB All + Magazine) | **1,393 รายการ** (จาก 2,282 ไฟล์) |
| ขนาดเฉลี่ยหลังย่อเหลือ 1024px | **~166 KB / รูป** |
| ประเมินพื้นที่ถ้าอัปรูปหลัก 1 รูป/สินค้า | **~230 MB** |

**สรุป:** อัปทั้ง 3.7 GB ไม่ได้ (free tier ให้ 1 GB) แต่ถ้าเอาแค่**รูปหลัก 1 รูปต่อสินค้า + ย่อขนาด** จะเหลือ ~230 MB ซึ่งพอสบาย ๆ

Meta ใช้รูปเดียวต่อสินค้าอยู่แล้ว (`image_link`) รูปที่เหลือเก็บไว้ใช้โพสต์ FB เหมือนเดิม ไม่ต้องอัป

---

## 1. เตรียม Supabase (ทำครั้งเดียว ~5 นาที)

1. สมัคร/เข้า https://supabase.com → **New project**
   - Name: `owarin-store`
   - Region: **Southeast Asia (Singapore)** — ใกล้ไทยสุด รูปโหลดเร็ว
   - Database password: ตั้งแล้วเก็บไว้ (ไม่ได้ใช้ในงานนี้ แต่จำเป็นตอนสร้าง)
2. รอสร้างเสร็จ (~2 นาที) → เมนูซ้าย **Storage** → **New bucket**
   - Name: `product-images`
   - เปิดสวิตช์ **Public bucket** ✅ ← สำคัญมาก ถ้าไม่เปิด Meta จะดึงรูปไม่ได้
   - **Create bucket**
3. ไปที่ **Project Settings → API** เก็บ 2 ค่านี้:
   - **Project URL** → หน้าตาแบบ `https://abcdefghijk.supabase.co`
   - **service_role** key (อยู่ใต้ Project API keys กด reveal)

> ⚠️ **service_role key ให้สิทธิ์เต็ม** ใช้บนเครื่องตัวเองเท่านั้น
> ห้ามใส่ใน Index.html ห้ามแชร์ ห้ามอัปขึ้น GitHub
> (ตัว `anon` key เอาไว้ใช้ฝั่งเว็บ แต่งานนี้ไม่ต้องใช้เลย)

---

## 2. เตรียมข้อมูลสินค้า

สคริปต์ต้องรู้ว่า "ชื่อสินค้า" ไหน = "Product ID" อะไร จึงต้อง export จากชีต

1. เปิด Google Sheet → แท็บ **GAME GUIDE BOOKS**
2. **File → Download → Comma-separated values (.csv)**
3. เปลี่ยนชื่อไฟล์เป็น `GAME GUIDE BOOKS.csv`
4. ทำซ้ำกับแท็บ **MAGAZINE** → `MAGAZINE.csv`
5. วางไฟล์ทั้งสองไว้ใน **โฟลเดอร์ OWARIN STORE** (โฟลเดอร์เดียวกับ `GGB All`, `Magazine`)

---

## 3. เตรียมสคริปต์

คัดลอก `supabase_upload_images.py` (อยู่ในโฟลเดอร์ Web App) ไปวางที่ **โฟลเดอร์ OWARIN STORE**
เพราะสคริปต์อ้างโฟลเดอร์รูปแบบ relative (`GGB All`, `Magazine`, …)

ติดตั้งไลบรารีครั้งเดียว — เปิด Command Prompt:

```
pip install pillow requests
```

---

## 4. ลองรันแบบไม่อัปจริง (dry-run)

เปิด Command Prompt แล้ว `cd` ไปที่โฟลเดอร์ OWARIN STORE:

```
cd "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE"
python supabase_upload_images.py --dry-run
```

จะได้รายงานแบบนี้:

```
สินค้าในชีต: 1180 | ชื่อรูปที่เจอ: 1393
จับคู่ได้: 1050 | สินค้าที่ไม่มีรูป: 130 | รูปที่ไม่มีในชีต: 343
[DRY-RUN] สำเร็จ 1050 ไฟล์ (พลาด 0) รวม 174 MB
```

**อ่านตัวเลขนี้ให้ดี** — ถ้า "จับคู่ได้" น้อยผิดปกติ แปลว่าชื่อไฟล์กับชื่อในชีตไม่ตรงกัน
ดูรายการตัวอย่างท้ายรายงานว่าชื่อเพี้ยนตรงไหน แล้วแก้ชื่อไฟล์หรือชื่อในชีตให้ตรงกันก่อน

**กติกาการจับคู่:** ชื่อไฟล์ต้องเป็น `<ชื่อสินค้าในชีต> (N).jpg`
เช่นในชีตชื่อ `GAMEMAG SPECIAL vol 05 (RESTOCK-01)` → ไฟล์ต้องชื่อ
`GAMEMAG SPECIAL vol 05 (RESTOCK-01) (1).jpg` (ตัวเลข `(1)` คือรูปแรก = รูปหลัก)

---

## 5. อัปจริง

ตั้งค่ากุญแจก่อน (ทำทุกครั้งที่เปิด Command Prompt ใหม่):

```
set SUPABASE_URL=https://abcdefghijk.supabase.co
set SUPABASE_KEY=eyJhbGci...ยาว ๆ...
python supabase_upload_images.py
```

ลองแค่ 10 ไฟล์ก่อนก็ได้:

```
python supabase_upload_images.py --limit 10
```

เสร็จแล้วจะได้ไฟล์ **`image_links.csv`** หน้าตา:

```
Product ID,image_link
OWA-GGBA013YKAR02,https://abcdefghijk.supabase.co/storage/v1/object/public/product-images/OWA-GGBA013YKAR02.jpg
```

ลองเอา URL ไปเปิดในเบราว์เซอร์ — ต้องเห็นรูป ถ้าขึ้น error ให้กลับไปเช็กว่า bucket เป็น **Public** แล้วหรือยัง

---

## 6. เอา URL เข้าชีต FB CATALOGUE

เพราะเราตั้งชื่อไฟล์เป็น Product ID **URL จึงเดาได้จากสูตร** ไม่ต้อง import ทีละแถว

ในชีต FB CATALOGUE ที่คอลัมน์ `image_link` แถว 2 ใส่:

```
=IF($A2="","","https://abcdefghijk.supabase.co/storage/v1/object/public/product-images/"&$A2&".jpg")
```

(`$A2` = คอลัมน์ Product ID — ปรับตัวอักษรคอลัมน์ให้ตรงของจริง)
แล้วลากสูตรลงทั้งคอลัมน์

> ถ้าอยากได้เป็นค่านิ่งแทนสูตร ให้ import `image_links.csv` มาแปะแล้ว VLOOKUP ก็ได้
> แต่วิธีสูตรง่ายกว่าและอัปเดตเองอัตโนมัติเมื่อเพิ่มสินค้าใหม่

**ระวัง:** สินค้าที่ยังไม่ได้อัปรูป สูตรจะสร้าง URL ที่เปิดไม่ได้ → Meta จะ reject แถวนั้น
ถ้าอยากกันไว้ ให้ใช้สูตรที่เช็กกับ `image_links.csv` ที่ import มาแทน

---

## 7. ข้อกำหนดรูปของ Meta (เช็กก่อนอัปแค็ตตาล็อก)

| หัวข้อ | ค่าที่ต้องผ่าน |
|---|---|
| ขนาดต่ำสุด | 500 × 500 px (สคริปต์ย่อเป็น 1024 = ผ่านสบาย) |
| แนะนำ | 1024 × 1024 px ขึ้นไป |
| ไฟล์ | JPEG หรือ PNG (สคริปต์แปลงเป็น JPEG ให้หมด) |
| URL | ต้องเป็น **https** และเปิดได้แบบสาธารณะ ไม่ต้องล็อกอิน |
| ห้าม | ใส่ข้อความ/โลโก้/ลายน้ำทับจนเกินไป, ภาพซ้อนหลายชิ้นในรูปเดียว |

⚠️ ถ้าใช้ลายน้ำจาก `owarin_watermark_studio.html` อยู่ — Meta ยอมให้มีลายน้ำเล็ก ๆ ได้
แต่ถ้าลายน้ำใหญ่คลุมทั้งรูปหรือมีข้อความโปรโมชั่น (เช่น "ลด 50%") จะโดนปฏิเสธ

---

## 8. ข้อจำกัดและความเสี่ยงที่ต้องรู้ (สำคัญ)

**Free tier ให้:** พื้นที่ 1 GB · อัปได้ไฟล์ละไม่เกิน 50 MB · egress 5 GB/เดือน · โปรเจกต์ได้ 2 อัน
**ไม่ได้:** image transformation และ Smart CDN (เลยต้องย่อรูปเองก่อนอัป — สคริปต์ทำให้แล้ว)

⚠️ **ข้อที่ต้องระวังที่สุด: โปรเจกต์ฟรีจะถูก _pause_ ถ้าไม่มีการใช้งาน 7 วัน**
เมื่อถูก pause รูปทั้งหมดจะเปิดไม่ได้ → แค็ตตาล็อก Facebook พังทันที ต้องเข้าไปกด restore เอง

ทางแก้:
- **จ่าย Pro ($25/เดือน)** — ไม่มี pause, พื้นที่ 100 GB
- **หรือย้ายไป Cloudflare R2** — ฟรี 10 GB, **egress ฟรีไม่จำกัด**, ไม่มี pause
  เหมาะกับงาน "โฮสต์รูปอย่างเดียว" มากกว่า Supabase ด้วยซ้ำ
  (Supabase เด่นเรื่อง database + auth ซึ่งงานนี้ยังไม่ได้ใช้เลย)

ถ้าเป้าหมายตอนนี้คือ **แค่มี URL รูปให้ Meta** — R2 คุ้มกว่าและปลอดภัยกว่าในระยะยาว
แต่ถ้าตั้งใจจะทำเว็บใหม่ (P6 ในแผน) ที่ต้องใช้ database/auth ด้วย → อยู่กับ Supabase แล้วอัปเป็น Pro ตอนนั้นก็สมเหตุสมผล

---

## 9. เวลาเพิ่มสินค้าใหม่ทีหลัง

1. ถ่ายรูป → ตั้งชื่อไฟล์ `<ชื่อสินค้าตามชีต> (1).jpg` วางในโฟลเดอร์เดิม
2. export CSV จากชีตใหม่ (ทับไฟล์เดิม)
3. รัน `python supabase_upload_images.py` อีกครั้ง
   สคริปต์ตั้ง `x-upsert: true` ไว้ = อัปทับของเดิมได้ ไม่ error และไฟล์ที่มีอยู่แล้วก็อัปซ้ำได้ไม่เสียหาย
4. สูตรใน FB CATALOGUE สร้าง URL ให้เอง ไม่ต้องแก้อะไร

---

## Sources

- [Serving assets from Storage — Supabase Docs](https://supabase.com/docs/guides/storage/serving/downloads)
- [Storage Buckets Fundamentals — Supabase Docs](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [JavaScript: Retrieve public URL — Supabase Docs](https://supabase.com/docs/reference/javascript/storage-from-getpublicurl)
- [Supabase Pricing 2026: Free Tier Limits](https://uibakery.io/blog/supabase-pricing)
- [Supabase Free Tier Limits 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
