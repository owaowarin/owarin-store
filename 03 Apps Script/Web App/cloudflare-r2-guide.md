# อัปรูปขึ้น Cloudflare R2 → ใช้เป็น `image_link` ของ Facebook Catalogue

> **ขอบเขต:** คู่มือนี้เป็นขั้นตอนสำหรับ bucket ใช้งานจริง `owarin-images` และไฟล์รูป public/catalog เท่านั้น ไม่ใช่คู่มือ archive; สำเนาส่วนตัวแยกอยู่ที่ `owarin-images-archive` ดู `00 Docs/R2-ARCHIVE-HANDBOOK_2026-09-23.md` ก่อนจัดการไฟล์ archive. ตัวเลขและ token/URL ในคู่มือนี้เป็นค่าจากคู่มือเดิม ให้ตรวจสถานะปัจจุบันก่อนใช้งานจริง.

**สถานะไฟล์ที่พร้อมอัป** (โฟลเดอร์ `OWARIN STORE\_r2_upload\`)

| โฟลเดอร์ | ไฟล์ | ขนาด | ใช้ทำอะไร |
|---|---|---|---|
| `library/pocket-book/` | 1,653 | 306 MB | ชื่อเดิมครบทุกใบ — ไว้หาปกหน้า/หลังส่งลูกค้า |
| `catalog/` | 357 | 57 MB | ชื่อเป็น Product ID — เฉพาะ **Instock** ให้ Meta ใช้ |
| **รวม** | **2,010** | **373 MB** | ใช้โควตาฟรี R2 ไป 3.6% จาก 10 GB |

> `catalog/` มีเฉพาะสถานะ **Instock** เท่านั้น — Auction / Sold / Retake / Hold ไม่เข้าแค็ตตาล็อก
> แต่ `library/` เก็บรูปครบทุกใบไม่ว่าสถานะไหน

---

## ขั้นที่ 1 — สร้าง bucket บน Cloudflare (ครั้งเดียว ~5 นาที)

1. สมัคร/เข้า https://dash.cloudflare.com → เมนูซ้าย **R2 Object Storage**
   - ครั้งแรกต้องผูกบัตรเพื่อยืนยันตัวตน **แต่ไม่มีการเรียกเก็บเงินถ้าไม่เกินโควตาฟรี** (10 GB, egress ฟรีไม่จำกัด)
2. **Create bucket**
   - Bucket name: `owarin-images`
   - Location: **Asia-Pacific (APAC)**
   - **Create bucket**
3. เข้าไปที่ bucket → แท็บ **Settings** → หัวข้อ **Public access**
   - **R2.dev subdomain** → กด **Allow Access** → พิมพ์ `allow` ยืนยัน
   - จะได้ URL หน้าตาแบบ `https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev` — **จดไว้** ใช้ในขั้นที่ 4

> ทำไมใช้ r2.dev ก่อน: เริ่มได้ทันทีไม่ต้องรอ DNS
> ย้ายไป custom domain ทีหลังได้ โดยแก้สูตร `image_link` ในชีตบรรทัดเดียว ลิงก์เก่าไม่พัง

---

## ขั้นที่ 2 — สร้าง API Token

1. ในหน้า R2 → **API** (มุมขวาบน) → **Manage API tokens** → **Create API token**
2. Token name: `owarin-upload`
3. Permissions: **Object Read & Write**
4. Specify bucket: เลือก `owarin-images` (จำกัดสิทธิ์ไว้เท่าที่จำเป็น)
5. **Create API Token** แล้ว**คัดลอกเก็บไว้ทันที 3 ค่า** (ปิดหน้าแล้วดูซ้ำไม่ได้):
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** (แบบ `https://<account_id>.r2.cloudflarestorage.com`)

> ⚠️ กุญแจชุดนี้เขียนไฟล์ในบัคเก็ตได้ — เก็บบนเครื่องตัวเองเท่านั้น
> ห้ามใส่ใน Index.html ห้ามแชร์ ห้ามอัปขึ้น GitHub

---

## ขั้นที่ 3 — ติดตั้ง rclone แล้วตั้งค่า

**ติดตั้ง** — เปิด PowerShell แล้วรัน:

```
winget install Rclone.Rclone
```

(หรือโหลด .zip จาก https://rclone.org/downloads/ แล้วแตกไฟล์ไว้ที่ `C:\rclone`)

**ตั้งค่า** — พิมพ์ `rclone config` แล้วตอบตามนี้:

```
n)  New remote
name> r2
Storage> s3
provider> Cloudflare
env_auth> 1  (false)
access_key_id> <Access Key ID ที่คัดลอกมา>
secret_access_key> <Secret Access Key>
region> auto
endpoint> https://<account_id>.r2.cloudflarestorage.com
เหลือที่เหลือกด Enter ผ่านหมด → y (yes this is OK) → q (quit)
```

**ทดสอบว่าต่อติด:**

```
rclone lsd r2:
```

ต้องเห็นชื่อ `owarin-images` ขึ้นมา

---

## ขั้นที่ 4 — อัปไฟล์

เปิด PowerShell แล้ว `cd` ไปที่โฟลเดอร์งาน:

```
cd "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\_r2_upload"
```

**ลองอัป catalog ก่อน (เล็กกว่า เห็นผลเร็ว):**

```
rclone copy catalog r2:owarin-images/catalog --progress --transfers=8
```

**แล้วค่อยอัป library:**

```
rclone copy library r2:owarin-images/library --progress --transfers=8
```

ตัวเลือกที่ใช้:
- `--progress` เห็นความคืบหน้าแบบเรียลไทม์
- `--transfers=8` อัปพร้อมกัน 8 ไฟล์ (ถ้าเน็ตช้าลดเป็น 4)
- **ถ้าหลุดกลางคัน** รันคำสั่งเดิมซ้ำได้เลย rclone จะข้ามไฟล์ที่อัปแล้วอัตโนมัติ

**รอบต่อไปที่มีรูปใหม่** ใช้คำสั่งเดิม — จะส่งเฉพาะไฟล์ที่เปลี่ยน/เพิ่มใหม่เท่านั้น

**ตรวจว่าครบ:**

```
rclone size r2:owarin-images
```

ต้องได้ประมาณ **2,010 ไฟล์ · 373 MB**

---

## ขั้นที่ 5 — ทดสอบว่าเปิดรูปได้

เอา Product ID สักตัวจากชีตมาต่อท้าย URL แล้วเปิดในเบราว์เซอร์:

```
https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/catalog/OWA-GGBA013YKAR02.jpg
```

- **เห็นรูป** = เรียบร้อย ไปขั้นที่ 6
- **ขึ้น error** = ยังไม่ได้เปิด Public access ในขั้นที่ 1 ข้อ 3

---

## ขั้นที่ 6 — ใส่สูตร `image_link` ในชีต FB CATALOGUE

เพราะตั้งชื่อไฟล์เป็น Product ID **URL จึงเดาได้จากสูตร** ไม่ต้อง import ทีละแถว

ที่คอลัมน์ `image_link` แถวแรกของข้อมูล ใส่:

```
=IF($A2="","","https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/catalog/"&$A2&".jpg")
```

- เปลี่ยน `pub-xxxxxxxxxxxx` เป็นของจริง
- `$A2` = คอลัมน์ Product ID — ปรับตัวอักษรให้ตรงของจริง
- ลากสูตรลงทั้งคอลัมน์

**ถ้าอยากให้ขึ้นเฉพาะเล่มที่มีรูปจริง** (กัน Meta reject แถวที่รูปยังไม่ได้อัป) ใช้แบบนี้แทน โดย import `catalog_index.csv` มาไว้อีกแท็บชื่อ `IMG`:

```
=IFERROR("https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/catalog/"&VLOOKUP($A2,IMG!A:A,1,FALSE)&".jpg","")
```

---

## ขั้นที่ 7 — ส่งลิงก์รูปให้ลูกค้า (ใช้ library)

รูปในโฟลเดอร์ `library` ใช้ชื่อเดิมทั้งหมด เปิดดูรายการทั้งหมดได้ด้วย:

```
rclone ls r2:owarin-images/library | findstr "Biohazard"
```

แล้วส่งลิงก์ให้ลูกค้าโดยไม่ต้องส่งไฟล์ — เช่น
`https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/library/pocket-book/Biohazard 2/Biohazard 2 (1).jpg`

> ชื่อไฟล์มีเว้นวรรคและอักขระพิเศษ (`｜`, `⨯`, ไทย) — เวลาแปะในแชทส่วนใหญ่จะ encode ให้เอง
> ถ้าลิงก์ไม่ทำงาน ให้คัดลอกจากช่อง address bar หลังเปิดสำเร็จแล้วแทน

---

## ข้อควรรู้

**โควตาฟรี** — 10 GB · เขียน 1 ล้านครั้ง/เดือน · อ่าน 10 ล้านครั้ง/เดือน · **egress ฟรีไม่จำกัด**
ตอนนี้ใช้ 373 MB และอัปครั้งแรก ~2,000 ครั้ง = ไม่ใกล้ลิมิตเลย

**ไม่มีการ pause** ต่างจาก Supabase free tier ที่หยุดโปรเจกต์เมื่อไม่มีการใช้งาน 7 วัน

**r2.dev มีลิมิตการเรียก** เหมาะกับช่วงเริ่มต้นและการใช้ภายใน ถ้าลูกค้าเข้าเยอะขึ้นหรือจะใช้จริงจังกับ Meta ควรผูก custom domain (ฟรี ถ้าโดเมนอยู่ใน Cloudflare อยู่แล้ว) แล้วแก้สูตรในชีตบรรทัดเดียว

**ข้อกำหนดรูปของ Meta** — ขนาดต่ำสุด 500×500 px (ไฟล์ใน `catalog/` ย่อไว้ที่ 1024 = ผ่านสบาย) · ต้องเป็น https และเปิดได้แบบสาธารณะ · ห้ามมีข้อความโปรโมชั่นทับรูป (ลายน้ำร้านเล็ก ๆ ได้)

---

## เวลามีรูปใหม่ทีหลัง

1. ถ่ายรูป → วางในโฟลเดอร์ `GGB All\GGB - POCKET BOOK\<ชื่อตามชีต>\<ชื่อตามชีต> (1).jpg`
2. export ชีตเป็น CSV ทับ `_r2_upload\Update.csv`
3. `python prepare_r2_upload.py` (ข้ามไฟล์ที่ทำแล้วอัตโนมัติ)
4. `rclone copy catalog r2:owarin-images/catalog --progress`
5. สูตรในชีตสร้าง URL ให้เอง ไม่ต้องแก้อะไร
