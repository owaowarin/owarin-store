# แผน — Facebook Album Auto-Post (OWARIN STORE)

สถานะ: **blueprint · ยังไม่เริ่มเขียนโค้ด** · ร่าง 2026-08-29 · แก้ครั้งที่ 4 · **ตัวเลขทั้งหมดอ่านสดจากชีต 30 ส.ค.**
ต่อจาก `_r2_upload/PLAN-images-cleanup.md` → STEP 6

---

## 0. สรุปสั้น (อ่านแค่นี้ก็ตัดสินใจได้)

| คำถาม | คำตอบ |
|---|---|
| จัดกลุ่มอัลบั้มยังไง | **คอลัมน์ `Type` ในชีต** 1 Type = 1 อัลบั้ม · เจ้าของเติมครบแล้วทั้งสองแท็บ · ไม่ใช้ regex ไม่อ่านโฟลเดอร์ |
| แล้วยิงแอดจากอะไร | **product set ใน Catalog ที่มีอยู่แล้ว** ตั้งชื่อให้ตรงกับอัลบั้ม 1:1 — ยิงแอดจากอัลบั้มโดยตรง **ทำไม่ได้** |
| รันที่ไหน | **Google Apps Script** อย่างเดียว (ยืนยันแล้ว) — ดูข้อ 1.3–1.4 |
| ขอบเขต | `Status = Instock` → **1,076 รูป** ใน **16 อัลบั้ม** (ข้อ 3.3) |
| ค่าใช้จ่าย | 0 บาท · ไม่มี LLM ในลูป (caption มาจากสูตรในชีตอยู่แล้ว) |
| Token ที่ใช้ | ครั้งเดียวตอนเขียนสคริปต์ · หลังจากนั้น 0 |

---

## 1. ข้อเท็จจริงที่บังคับดีไซน์ (พร้อมอ้างอิง)

### 1.1 Graph API **สร้างอัลบั้มไม่ได้**

`POST /{page-id}/albums` — เอกสาร Meta ระบุตรง ๆ ใต้หัวข้อ Creating ว่า
"You can't perform this operation on this endpoint"
→ **อัลบั้มต้องสร้างด้วยมือใน Page ครั้งเดียว** แล้วสคริปต์ยิงรูปเข้า `POST /{album-id}/photos`

ผลดี: จำนวนอัลบั้มคงที่ 9–10 อัน สร้างครั้งเดียวจบ สคริปต์แค่เติมรูปตลอดไป
ผลเสีย: ถ้าจะเพิ่มหมวดใหม่ ต้องไปสร้างอัลบั้มเองก่อน แล้วแปะ album_id ลงชีต

พารามิเตอร์ที่ใช้: `url` (ให้ FB ไปดึงจาก R2 เอง — ไม่ต้องอัปโหลดไฟล์), `caption`, `published`
หมายเหตุ: `message` / `name` ถูก deprecate แล้ว **ให้ใช้ `caption`**
รูปต้อง < 10 MB (ของเรา 1080×1080 ผ่านสบาย)

### 1.2 **ยิงแอดจากอัลบั้มไม่ได้** — นี่คือประเด็นที่อยากแย้ง

Meta ไม่มี ad object ชนิด "album" ตัวสร้างสรรค์ของแอดมีได้แค่ 2 ทางที่เกี่ยวกับเรา:

1. **`object_story_id`** = `<page_id>_<post_id>` → ต้องชี้ไปที่ **โพสต์** หนึ่งโพสต์
2. **Advantage+ catalog ads (DPA)** → ดึงสินค้าจาก **catalog / product set** ไม่ใช่จากอัลบั้ม

รูปที่ยิงเข้าอัลบั้มแต่ละใบ **ได้ post id ของตัวเอง** จึง boost ทีละรูปได้จริง
แต่ 1,078 รูป = 1,078 โพสต์ → boost ทีละอันไม่ใช่กลยุทธ์ที่รันไหว

**ข้อเสนอ:** ใช้สองระบบคู่กัน ชื่อเดียวกัน
- **อัลบั้ม** = หน้าร้าน organic · ลูกค้าเลื่อนดูทั้งหมวดในหน้าเดียว · แปะลิงก์อัลบั้มตอบแชทได้
- **product set** (ในแคตตาล็อกที่ทำไว้ใน `Facebook - Catalouge Project`) = ตัวยิงแอด
  ตั้งชื่อ set ให้ตรงกับชื่ออัลบั้มเป๊ะ ๆ → อยากดันหมวดไหน ก็มีทั้งอัลบั้มให้คนดูและ set ให้ยิง
- ถ้าอยากได้แอดจากโพสต์จริง ๆ: เลือก **best seller 5–10 ตัว/เดือน** จากรูปที่โพสต์ไปแล้ว
  เอา post id มาใส่ `object_story_id` — สอดคล้องกับที่เคยพบว่า ฿100/วัน Messaging ทำผลดีสุด

> ถ้าไม่เห็นด้วย ประเด็นที่ต้องเถียงคือ "อัลบั้มมีคุณค่าเชิง organic พอไหม" — ส่วนเรื่อง
> "ยิงแอดจากอัลบั้มโดยตรง" นั้นปิดไปเลย เพราะ API ไม่มีทางให้ทำ

### 1.3 คอขวดจริงคือ Facebook ไม่ใช่ตัวรัน

Page-level rate limit: **`Calls within 24 hours = 4800 × Number of Engaged Users`**
(อ่าน header `X-Business-Use-Case-Usage` เพื่อดู % ที่ใช้ไป + `estimated_time_to_regain_access`)

เพจที่ engaged users ยังน้อย โควตาจะเล็กกว่าที่คิดมาก และการยิง 1,078 รูปรวดเดียว
ยังเสี่ยงโดนมองว่าเป็น spam อีกด้วย → **ต้องทยอยอยู่ดี**

**นี่คือเหตุผลที่ตัวเลือก 3 (สคริปต์บนเครื่อง) ไม่ได้เปรียบ**
ข้อดีของมันคือ "ไม่มี time limit" ซึ่งจะมีประโยชน์ก็ต่อเมื่อเราอยากยิงรวดเดียวจบ —
แต่เราทำแบบนั้นไม่ได้เพราะฝั่ง FB เอง แถมยังต้องเปิดเครื่องค้างไว้

### 1.4 โควตา Apps Script (บัญชี gmail.com = consumer tier)

| รายการ | Consumer | Workspace |
|---|---|---|
| Runtime ต่อการรัน 1 ครั้ง | **6 นาที** | 6 นาที |
| Trigger runtime รวมต่อวัน | **90 นาที** | 6 ชม. |
| UrlFetch ต่อวัน | **20,000 ครั้ง** | 100,000 |

คำนวณจริง: 1 รูป ≈ 1 UrlFetch ≈ 1–2 วินาที
→ รันครั้งละ **50 รูป ใช้ ~1.5 นาที** (ไม่ชน 6 นาที)
→ ต่อให้รันวันละ 24 ครั้งก็ใช้ trigger runtime ~36 นาที (ไม่ชน 90 นาที)
→ UrlFetch วันละ 20,000 เทียบกับที่เราต้องใช้หลักสิบ — ไม่ต้องคิดเลย

**สรุป: Apps Script เหลือเฟือ 10 เท่า** ข้อจำกัด 6 นาทีไม่เคยเป็นปัญหาเพราะเราตั้งใจยิงช้าอยู่แล้ว

---

## 2. สถาปัตยกรรม

```
Google Sheet "OWARIN STORE"
├── GAME GUIDE BOOKS / MAGAZINE   ← ข้อมูลสินค้า (แหล่งความจริง)
├── R2 IMAGES                     ← PID → url_1, url_2 (มีอยู่แล้ว)
├── ALBUM CAPTION                 ← PID | Item name | Sheet | Image URL | Caption | Posted
│                                    caption สร้างจากสูตร = ไม่ใช้ LLM = 0 token
└── FB ALBUMS  ← [ใหม่] album_key | album_id | ชื่ออัลบั้ม | เงื่อนไข | เปิด/ปิด
        │
        ▼  Apps Script (time-driven trigger)
   POST /{album-id}/photos?url=<R2 url>&caption=<Caption>
        │
        ▼
   เขียนกลับ ALBUM CAPTION!Posted = "<photo_id> | <วันที่>"
```

**หัวใจ:** ไม่มี LLM, ไม่มีเซิร์ฟเวอร์, ไม่มีการอัปโหลดไฟล์
FB ไปดึงรูปจาก R2 public URL เอง → Apps Script ส่งแค่ข้อความสั้น ๆ ต่อรูป

---

## 3. โครงอัลบั้ม — **อ่านสดจากชีต 30 ส.ค.** (เจ้าของเติม `Type` เองแล้ว)

สถานะข้อมูลจริง: **คอลัมน์ `Type` เติมครบทั้งสองแท็บ · ไม่มีช่องว่างเหลือ**
→ ไม่ต้องใช้ไฟล์แมป ไม่ต้องใช้ regex ไม่ต้องอ่านโฟลเดอร์อีกแล้ว
`Type` ในชีตคือแหล่งความจริงเดียว จบ

### 3.1 GAME GUIDE BOOKS — Instock 502 · 4 หมวด

| Type | จำนวน |
|---|---|
| GAME GUIDE BOOKS | 388 |
| GAMEMAG SPECIAL | 70 |
| GAMEMAG CHEATS & CODE | 25 |
| GAMEMAG TOP SECRET | 19 |
| **รวม** | **502** |

### 3.2 MAGAZINE — Instock 576 · 12 หมวด

| Type | จำนวน |
|---|---|
| MEGA⨯GAME | 183 |
| MEGA MONTH | 155 |
| HOBBY TOY AND MODEL | 59 |
| HOBBY MODEL | 40 |
| GAMEMAG | 37 |
| HOBBY JAPAN | 32 |
| MEGA MAGAZINE | 27 |
| A・Club | 17 |
| Other | 9 |
| TONBO MAGAZINE | 8 |
| TV MAGAZINE | 5 |
| PLAY | 4 |
| **รวม** | **576** |

### 3.3 สรุป — **16 Type = 16 อัลบั้ม** · 1,078 รูป

หนึ่ง `Type` = หนึ่งอัลบั้ม แบบ 1:1 ไม่ต้องมีตารางจับคู่ซับซ้อน

**`MEGA⨯GAME` = อัลบั้มเดียว 183 รูป** (ตัดสินแล้ว ไม่แยกรายปี)

**ไม่มีข้อค้างตัดสินเหลือแล้ว** — โครงอัลบั้มปิดที่ 16 ใบ

### 3.4 ของที่ยังเสียจริง — นับเฉพาะ `Instock`

**GAME GUIDE BOOKS: ไม่มีปัญหาเหลือเลย** — Instock 502 · Type ครบ 502 · รูปครบ 502

**MAGAZINE: เหลือ 2 แถวที่ไม่มีรูป**

| Product ID | Item name | ทางแก้ |
|---|---|---|
| `OWA-MAGM117VKAN00` | MEGA MONTH 2010 Issue 07 — Keroro RPG… | ชื่อในชีตเป็น `(RESTOCK--01)` ขีดเกินมาหนึ่งตัว ไฟล์จริงคือ `(RESTOCK-01)` → แก้ชื่อแล้วรูปเข้าเอง |
| `OWA-MAGT016AMAN00` | TV Magzine Hero vol 1-28 (Completed Set) | เจ้าของจัดการเอง |

| | Instock | Type ครบ | รูปครบ | ค้าง |
|---|---|---|---|---|
| GAME GUIDE BOOKS | 502 | 502 | 502 | **0** |
| MAGAZINE | 576 | 576 | 574 | **2** |

ไฟล์แมปที่สร้างไว้ก่อนหน้า (`magazine_type_map.csv`, `ggb_type_map.csv`,
`instock_issues.csv`) **ไม่ต้องใช้แล้ว** — ชีตเดินหน้าไปกว่านั้นแล้ว

---

## 3B. กันไม่ให้กลับไปพังอีก

1. **`Type` ในชีตคือแหล่งความจริงเดียว** — สคริปต์อ่านคอลัมน์นี้อย่างเดียว
   ไม่อ่านชื่อสินค้า ไม่อ่านโฟลเดอร์
2. **Data Validation** บนคอลัมน์ `Type` ทั้งสองแท็บ ให้เลือกได้เฉพาะ 16 ค่าที่มีอยู่
   (List from a range → ชี้ไปที่คอลัมน์ชื่ออัลบั้มในแท็บ `FB ALBUMS`)
   → ลงสินค้าใหม่แล้วพิมพ์ผิด/พิมพ์ค่าใหม่มั่ว ๆ ไม่ได้
3. **สคริปต์ไม่มี fallback** — `Type` ไม่ตรงอัลบั้มไหน = ข้าม + นับ `unmapped`
   เขียนตัวเลขลงแท็บ `FB ALBUMS` ทุกรอบ ต้องเป็น 0
4. **ตรวจก่อนเปิด trigger:** count ต่อ `Type` ในชีต ต้องเท่ากับจำนวนรูปที่โพสต์เข้าแต่ละอัลบั้ม

---

## 4. สิ่งที่ต้องเพิ่มในชีต

### 4.1 แท็บใหม่ `FB ALBUMS` — จับคู่ `Type` → อัลบั้ม

| A album_key | B album_id | C ชื่ออัลบั้ม | D sheet | E Type ที่รับ | F active |
|---|---|---|---|---|---|
| GGB_MAIN | 1234567890 | GAME GUIDE BOOKS | GAME GUIDE BOOKS | GAME GUIDE BOOKS | TRUE |
| MAG_HOBBYJP | 1234567891 | Hobby Japan | MAGAZINE | HOBBY JAPAN | TRUE |
| MAG_MEGAOTHER | 1234567892 | MEGA MAGAZINE OTHER | MAGAZINE | MEGA MAGAZINE, MEGA⨯GAME 2016 | TRUE |
| MAG_OTHER | 1234567893 | Other Magazine | MAGAZINE | GAMER EXTREAM, MAST CULTURE, PLAY, TV MAGAZINE, GAMECOM, TRICKS MASTER, OTHER | TRUE |

- **หนึ่งอัลบั้มรับได้หลาย `Type`** (คั่นด้วย comma) → เปลี่ยนการจัดกลุ่มทีหลังแก้ที่นี่จุดเดียว
  ไม่ต้องไปยุ่งกับข้อมูล 837 แถว
- `album_id` เอามาจาก URL ของอัลบั้มหลังสร้างด้วยมือ หรือ `GET /{page-id}/albums?fields=id,name`
- `active=FALSE` = หยุดอัลบั้มนั้นชั่วคราวโดยไม่ต้องแก้โค้ด
- เซลล์สรุป `unmapped` = จำนวนแถวที่ `Type` ไม่ตรงกับอัลบั้มไหนเลยในรอบล่าสุด · **ต้องเป็น 0**

### 4.2 `ALBUM CAPTION` — **ไม่ต้องเพิ่มคอลัมน์อะไรเลย**

สคริปต์อ่าน `Status` กับ `Type` จากแท็บต้นทาง (`GAME GUIDE BOOKS` / `MAGAZINE`) เองใน memory
โดยใช้ `Product ID` เป็นคีย์ — ไม่ต้องมีสูตร VLOOKUP ค้างในชีตให้ช้าและพังตอนเรียงแถวใหม่

โครงที่ใช้จริงคงเดิม: `Product ID | Item name | Sheet | Image URL | Caption | Posted`

`Posted` = คีย์กันโพสต์ซ้ำ · ว่าง = ยังไม่โพสต์ · มีค่า = `<photo_id> | <ISO date>`

### 4.3 กติกาที่ห้ามพลาด — ของที่ไม่เข้าอัลบั้มไหนเลย

สคริปต์ต้องนับแถวที่ match ไม่ได้ทุกรอบ แล้วเขียนลงเซลล์สรุปในแท็บ `FB ALBUMS`
ถ้าตัวเลขไม่ใช่ 0 แปลว่ามีสินค้าหายไปจากระบบเงียบ ๆ — เคสนี้เกิดแล้วกับ `BIG SIZE` 32 เล่ม

---

## 5. ตัวสคริปต์ (โครง)

```javascript
function postBatch() {
  const LIMIT = 40;                        // รูปต่อรอบ
  const token = PropertiesService.getScriptProperties().getProperty('PAGE_TOKEN');
  const albums = readAlbums_();            // FB ALBUMS → {album_key: album_id}
  const rows   = readQueue_(LIMIT);        // Posted ว่าง + Status=Instock + มี Image URL

  const updates = [];
  for (const r of rows) {
    const res = UrlFetchApp.fetch(
      `https://graph.facebook.com/v23.0/${albums[r.album_key]}/photos`,
      { method:'post', muteHttpExceptions:true, payload:{
          url: r.imageUrl, caption: r.caption, access_token: token } });
    const body = JSON.parse(res.getContentText());
    updates.push([ res.getResponseCode()===200
        ? `${body.id} | ${new Date().toISOString().slice(0,10)}`
        : `ERROR ${body.error && body.error.code}: ${(body.error||{}).message}` ]);
    Utilities.sleep(1500);                 // เว้นจังหวะ กัน rate limit
    if (usageTooHigh_(res)) break;         // อ่าน X-Business-Use-Case-Usage
  }
  writeBackPosted_(rows, updates);         // เขียนกลับครั้งเดียว ไม่เขียนทีละแถว
}
```

**กฎที่ต้องมี**
1. อ่านชีตครั้งเดียว / เขียนกลับครั้งเดียว (`getValues` / `setValues` เป็นก้อน) — อย่าวนเขียนทีละเซลล์
2. `muteHttpExceptions:true` เสมอ แล้วเก็บ error ลงคอลัมน์ `Posted` — จะได้เห็นว่าพังตรงไหนโดยไม่ต้องเปิด log
3. `LockService` กันรอบซ้อนกัน
4. เช็ก `X-Business-Use-Case-Usage` ถ้า `call_count` > 75% ให้หยุดรอบนั้นทันที
5. `Utilities.sleep(1500)` ระหว่างรูป — 40 รูป ≈ 90 วินาที ปลอดภัยจากลิมิต 6 นาที
6. ไม่ต้องมี `no_story:true` — เราอยากได้ story ในฟีดเพื่อให้มี post id ไว้ boost ทีหลัง
   (ถ้าไม่อยากให้ฟีดรก ค่อยเปิด `no_story` เฉพาะรอบ backfill)

---

## 6. จังหวะเวลา

| ช่วง | ทำอะไร | ตั้งค่า |
|---|---|---|
| **Backfill** (~1,078 รูป) | ทยอยลง | trigger ทุก 2 ชม. × 40 รูป = 480/วัน → **~3 วัน** |
| | ถ้าอยากเนียนกว่านั้น | ทุก 4 ชม. × 25 รูป = 150/วัน → **~7 วัน** ← แนะนำ |
| **หลัง backfill** | ของเข้าใหม่เท่านั้น | วันละครั้ง เวลา 20:00 (ตรงกับ workflow เดิม) |

รอบ backfill ให้เริ่มจากอัลบั้มเล็กก่อน (Tonbo 8 → TOP SECRET 15 → A・Club 17 → CHEATS & CODE 20)
จะได้เห็นว่า caption/รูป/ลำดับออกมาหน้าตาถูกไหม ก่อนปล่อยชุด 344 (Pocket Book) กับ 155 (MEGA MONTH)

---

## 7. ทำไมถึงประหยัด token ที่สุด

| จุดที่คนอื่นมักเผา token | ของเรา |
|---|---|
| ให้ LLM เขียน caption ทุกชิ้น | สูตรในชีตสร้างให้แล้ว — **0** |
| ให้ LLM ตัดสินใจว่าโพสต์อะไรต่อ | คอลัมน์ `Posted` ว่าง/ไม่ว่าง — **0** |
| ดึงตารางเข้าแชทเพื่อตรวจ | สคริปต์เขียน error ลงคอลัมน์ `Posted` เอง เปิดชีตดูเอง — **0** |
| เรนเดอร์ภาพ (Puppeteer/hcti แบบ workflow เดิม) | ใช้รูปสินค้าจริงจาก R2 ตรง ๆ — **0** และตัดค่า Railway ทิ้งได้ด้วย |

**token ที่ใช้ทั้งโปรเจกต์ = ครั้งเดียวตอนให้เขียนสคริปต์ ~200 บรรทัด**

---

## 8. Checklist ก่อนลงมือ

### ทำด้วยมือ — **มีแค่ 2 อย่าง และเป็นครั้งเดียวจบ**

- [ ] **สร้างอัลบั้ม 16 ใบบนเพจ owarinstore** ตั้งชื่อให้ตรงกับค่า `Type` เป๊ะ ๆ
      *ทำไมออโต้ไม่ได้:* Graph API ไม่เปิดให้สร้างอัลบั้ม — เอกสารระบุใต้หัวข้อ Creating ว่า
      "You can't perform this operation on this endpoint" (ข้อ 1.1) · ~10 นาที ทำครั้งเดียวตลอดชีพ
- [ ] **ออก Page Access Token** แบบ long-lived (`pages_manage_posts`, `pages_read_engagement`,
      `pages_show_list`) แล้วใส่ใน Script Properties ชื่อ `PAGE_TOKEN` ด้วยตัวเอง
      *ทำไมออโต้ไม่ได้:* เป็นการยืนยันตัวตนของเจ้าของบัญชี และไม่ควรผ่านมือใครหรือค้างในแชท

### ที่เหลือสคริปต์ทำเอง — ไม่ต้องแตะ

| งาน | สคริปต์ทำยังไง |
|---|---|
| เก็บ `album_id` ลงแท็บ `FB ALBUMS` | `GET /{page-id}/albums?fields=id,name` แล้วจับคู่ชื่ออัลบั้มกับค่า `Type` เติมให้เอง ครั้งแรกที่รัน |
| อ่าน `Status` / `Type` | อ่านจากแท็บต้นทางตรง ๆ ด้วย `Product ID` — ไม่ต้องเพิ่มคอลัมน์ในชีต (ข้อ 4.2) |
| ทดลองยิง 3 รูป | ตั้ง `LIMIT = 3` + `DRY_RUN` รันมือครั้งเดียว ดูผล แล้วค่อยเปิด trigger |
| เลือกว่าจะโพสต์อะไรต่อ | คอลัมน์ `Posted` ว่าง = ยังไม่โพสต์ |
| กันโพสต์ซ้ำ / rate limit / error | เขียนกลับ `Posted` เป็นก้อน + อ่าน `X-Business-Use-Case-Usage` (ข้อ 5) |

### เสร็จแล้ว

- [x] โครงอัลบั้ม 16 ใบ = 16 ค่าของคอลัมน์ `Type` (ข้อ 3.3)
- [x] เติมคอลัมน์ `Type` ครบทั้งสองแท็บ
- [x] Data Validation บนคอลัมน์ `Type`
- [x] แก้ชื่อ `(RESTOCK--01)` → `(RESTOCK-01)` ที่ `OWA-MAGM117VKAN00`

## 9. ความเสี่ยงที่ต้องเฝ้า

| เรื่อง | อาการ | ทางแก้ |
|---|---|---|
| Page rate limit | error 4 / 32, `estimated_time_to_regain_access` | ลด LIMIT ต่อรอบ ยืดช่วง trigger |
| Token หมดอายุ | error 190 ทุกแถว | ต่ออายุ / ใช้ System User token ที่ไม่หมดอายุ |
| รูป R2 404 | error 1 หรือ 324 | เช็กกับแท็บ `R2 IMAGES` ก่อนยิง |
| สินค้าขายไปแล้ว | รูปยังค้างในอัลบั้ม | รอบเดือนละครั้ง: ลบรูปที่ `Status=Sold` ด้วย `DELETE /{photo-id}` |
| โพสต์ซ้ำ | `Posted` ไม่ถูกเขียนกลับเพราะสคริปต์ตายกลางทาง | เขียนกลับเป็นก้อนหลังจบลูป + `LockService` |

---

## 10. สิ่งที่ยังไม่ตัดสิน

1. จะแยกอัลบั้มเป็น "พร้อมส่ง" vs "ประมูล" ด้วยไหม (ตอนนี้เอาแค่ Instock)
2. รอบเก็บกวาด Sold — ลบรูปออกจากอัลบั้ม หรือปล่อยไว้แล้วแก้ caption เป็น "ขายแล้ว"
3. product set ในแคตตาล็อกจะสร้างด้วยมือหรือให้สคริปต์สร้างผ่าน Marketing API

---

## 11. วิธีเอา Page Access Token (ทำเองครั้งเดียว)

เป้าหมาย: ได้ token ของเพจ **owarinstore** ที่ไม่หมดอายุ แล้วเอาไปใส่ Script Properties
ชื่อ `PAGE_TOKEN` — **อย่าวางค่า token ในแชท ในโค้ด หรือในเซลล์ชีต**

### วิธี A — Graph API Explorer (เร็วสุด ~5 นาที)

1. เปิด https://developers.facebook.com/apps → **Create App** → ประเภท **Business**
   (ถ้ามีแอปอยู่แล้วข้ามขั้นนี้) ไม่ต้องส่งรีวิว ไม่ต้องเผยแพร่ ใช้โหมด Development ได้เลย
   เพราะเราจัดการเพจของตัวเอง
2. เปิด https://developers.facebook.com/tools/explorer
3. มุมขวาบน เลือกแอปที่เพิ่งสร้าง → **User or Page** เลือก **Get Page Access Token**
4. ติ๊ก permission 3 ตัว: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
5. กด **Generate Access Token** → เลือกเพจ **owarinstore** → อนุญาต
6. ได้ token มาแล้ว **แต่ยังเป็นแบบสั้น (~1 ชม.)** ต้องแปลงต่อในข้อถัดไป

### แปลงเป็น token ไม่หมดอายุ

1. เอา token สั้นจากข้อ 6 ไปวางใน https://developers.facebook.com/tools/debug/accesstoken
   กด **Debug** → ปุ่ม **Extend Access Token** → ได้ **User token อายุ 60 วัน**
2. เอา User token 60 วันนั้นยิง:
   ```
   GET https://graph.facebook.com/v23.0/me/accounts?access_token=<USER_TOKEN_60วัน>
   ```
   (วางใน address bar ได้เลย)
3. ในผลลัพธ์ หาเพจ `owarinstore` แล้วก๊อป `access_token` ของเพจนั้น
   **Page token ที่ออกจาก User token 60 วัน = ไม่มีวันหมดอายุ** ตราบใดที่ไม่เปลี่ยนรหัสผ่าน
   ไม่ถอนสิทธิ์แอป และไม่โดน Meta บังคับ re-auth
4. เอาค่านั้นไปใส่ Apps Script → ⚙️ **Project Settings** → **Script Properties** →
   Add property · ชื่อ `PAGE_TOKEN` · ค่า = token ที่ได้

### วิธี B — System User (ทนกว่า เหมาะถ้าจะรันยาว ๆ)

Business Settings → **Users → System Users** → Add → กำหนดสิทธิ์เพจ owarinstore
→ **Generate New Token** เลือกแอป + 3 permission เดิม → เลือก **Never expires**
ข้อดี: ไม่ผูกกับบัญชีคนใดคนหนึ่ง เปลี่ยนรหัสผ่านแล้ว token ไม่ตาย

### เช็กว่าใช้ได้จริง

```
GET https://graph.facebook.com/v23.0/me?access_token=<PAGE_TOKEN>
```
ต้องคืนชื่อเพจ `owarinstore` ไม่ใช่ชื่อคน · ถ้าคืนชื่อคนแปลว่ายังเป็น User token ไม่ใช่ Page token

```
GET https://graph.facebook.com/v23.0/me/albums?fields=id,name&access_token=<PAGE_TOKEN>
```
ต้องเห็นอัลบั้ม 16 ใบที่สร้างไว้ → ถ้าเห็นครบ แปลว่าพร้อมให้สคริปต์ทำงาน

**ถ้าเจอ error 190** = token หมดอายุหรือถูกถอนสิทธิ์ → ออกใหม่ตามขั้นตอนเดิม

---

## 12. ข้อจำกัดที่เพิ่งเจอ — **caption แก้ทีหลังไม่ได้**

ทดสอบกับเอกสาร Meta แล้ว: `POST /{photo-id}` เพื่อแก้ caption **ทำไม่ได้**
หน้า Photo reference ระบุใต้หัวข้อ Updating ว่า "You can't perform this operation on this endpoint"

**แปลว่าแผน "อัปรูปเองทั้งหมดก่อน แล้วให้สคริปต์ตามไปใส่ des" ใช้ไม่ได้**
`caption` ต้องส่งไปพร้อมตอนอัปโหลด (`POST /{album-id}/photos?url=…&caption=…`) เท่านั้น

และต่อให้แก้ได้ ก็ยังมีปัญหาที่สอง: รูปที่อัปด้วยมือไม่มีอะไรผูกกับ `Product ID` เลย
API ไม่คืนชื่อไฟล์ต้นทาง → สคริปต์จะไม่มีทางรู้ว่ารูปไหนคือสินค้าตัวไหน

### วิธีที่ใช้ได้

| ขั้น | ใคร | ทำอะไร |
|---|---|---|
| 1 | มือ | อัปรูป **1 รูปต่ออัลบั้ม** เพื่อให้อัลบั้มเกิด — ใช้โลโก้ OWARIN เป็นรูป seed ทั้ง 16 ใบ (จะได้ไม่กินโควตาสินค้า และใช้เป็นปกอัลบั้มไปในตัว) |
| 2 | มือ | ตั้งชื่ออัลบั้มให้ตรงกับค่า `Type` เป๊ะ ๆ |
| 3 | สคริปต์ | ดึง `/me/albums` มาจับคู่ชื่อ → เติม `album_id` ลง `FB ALBUMS` |
| 4 | สคริปต์ | ยิงรูปสินค้าที่เหลือเข้าอัลบั้มพร้อม `caption` ทีละรูป ตามจังหวะข้อ 6 |

รูปสินค้าที่ copy ไว้ที่ `_fb_albums\` จึงมีไว้ **ดูเทียบตอนตรวจ** ไม่ใช่ไว้อัปเอง
(ถ้าอัปเองทั้งหมด จะได้อัลบั้มที่ไม่มี caption สักรูปและแก้ทีหลังไม่ได้)

---

## 13. ชื่ออัลบั้มจริงบนเพจ (ยืนยัน 30 ส.ค.)

รูปแบบ: `【INSTOCK <วันที่>】 <Type>`

```
【INSTOCK 30/08/2026】 GAME GUIDE BOOKS        【INSTOCK 30/08/2026】 GAMEMAG SPECIAL
【INSTOCK 30/08/2026】 GAMEMAG TOP SECRET      【INSTOCK 30/08/2026】 GAMEMAG CHEATS & CODE
【INSTOCK 30/08/2026】 GAMEMAG MAGAZINE        【INSTOCK 30/08/2026】 MEGA MONTH
【INSTOCK 30/08/2026】 MEGA⨯GAME               【INSTOCK 30/08/2026】 MEGA MAGAZINE
【INSTOCK 30/08/2026】 HOBBY TOY AND MODEL     【INSTOCK 30/08/2026】 HOBBY MODEL
【INSTOCK 30/08/2026】 HOBBY JAPAN             【INSTOCK 30/08/2026】 A・Club
【INSTOCK 30/08/2026】 TONBO MAGAZINE          【INSTOCK 30/08/2026】 TV MAGAZINE
【INSTOCK 30/08/2026】 PLAY                    【INSTOCK 30/08/2026】 Other
```

### กฎการจับคู่ในสคริปต์

ชื่ออัลบั้มไม่เท่ากับค่า `Type` แล้ว → สคริปต์ต้องตัดหัวออกก่อนเทียบ

```javascript
const key = name.split('】').pop().trim();   // "【INSTOCK 30/08/2026】 MEGA MONTH" → "MEGA MONTH"
```

ข้อดี: เปลี่ยนวันที่ในชื่ออัลบั้มเมื่อไหร่ก็ได้ การจับคู่ไม่พัง
เทียบแบบ **trim + ตรงตัวพิมพ์เป๊ะ ๆ** ไม่ lowercase (เพราะ `A・Club` กับ `Other` เป็นตัวเล็กปน)

⚠️ วันที่ในชื่อจะค้างอยู่อย่างนั้นจนกว่าจะไปแก้เองในหน้าเพจ — API แก้ชื่ออัลบั้มให้ไม่ได้
ถ้าตั้งใจจะเติมของใหม่เข้าอัลบั้มเดิมเรื่อย ๆ วันที่จะกลายเป็นข้อมูลเก่าหลอกลูกค้า
ทางเลือก: ตัดวันที่ออกเหลือ `【INSTOCK】 <Type>` หรือยอมเข้าไปแก้ชื่อเองเดือนละครั้ง

### ต้องแก้ในชีตก่อน: `GAMEMAG` → `GAMEMAG MAGAZINE` (37 แถว)

1. เปิดแท็บ `MAGAZINE` → เลือกทั้งคอลัมน์ `W` (Type)
2. Ctrl+H → Find `GAMEMAG` · Replace `GAMEMAG MAGAZINE`
3. **Search: Specific range = `W:W`** และติ๊ก **Match entire cell contents** (สำคัญมาก
   ไม่งั้นจะไปโดนชื่อสินค้าที่มีคำว่า GAMEMAG อยู่ด้วย)
4. แก้ Data Validation ของคอลัมน์ `W` ให้ค่าใหม่อยู่ในลิสต์

หลังแก้แล้ว 16 ค่าของ `Type` = 16 อัลบั้ม ตรงกัน 1:1

---

## 14. งานในชีตที่ทำให้แล้ว (30 ส.ค.)

### แท็บใหม่ `TYPE LIST`

| | A `Type` | B `Album name` |
|---|---|---|
| สูตร | `=SORT(UNIQUE({FILTER('GAME GUIDE BOOKS'!Y2:Y,…);FILTER(MAGAZINE!W2:W,…)}))` | `=ARRAYFORMULA(IF(A2:A="","","【INSTOCK 30/08/2026】 "&A2:A))` |

- คอลัมน์ A ดึงค่า `Type` ที่ใช้จริงจากทั้งสองแท็บมาเรียงและตัดซ้ำ — **live** เพิ่ม/เปลี่ยน Type
  เมื่อไหร่ ลิสต์นี้ขยับตาม ไม่ต้องมาแก้มือ
- คอลัมน์ B ต่อหัว `【INSTOCK …】` ให้พร้อม **ก๊อปไปวางเป็นชื่ออัลบั้มบนเพจได้เลย** ทั้ง 16 บรรทัด
- อยากเปลี่ยนวันที่ในชื่ออัลบั้ม แก้ที่สูตร B2 จุดเดียว

ปัจจุบันมี 16 ค่า = 16 อัลบั้ม

### Data Validation — **ตรวจแล้วไม่ต้องแก้**

คอลัมน์ `Type` ทั้งสองแท็บเป็น **Table column แบบ Dropdown** (ไม่ใช่ data-validation rule ธรรมดา)
เปิดดรอปดาวน์จริงแล้วมี `GAMEMAG MAGAZINE` กับค่าอื่นครบ ไม่มีเซลล์ไหนติดธงค่าไม่ถูกต้อง
→ Find & Replace อัปเดตลิสต์ให้เองตอนแก้ ไม่ต้องไปยุ่งอีก

**ไม่ผูก validation เข้ากับ `TYPE LIST`** เพราะจะไปทับ column type ของ Table แล้วเสี่ยงพัง
ของเดิมทำงานถูกอยู่แล้ว — `TYPE LIST` มีไว้ใช้เป็นแหล่งชื่ออัลบั้มและให้สคริปต์อ่านแทน

### เหลืองานมือของเจ้าของอย่างเดียว

**สร้างอัลบั้ม 16 ใบบนเพจ `OWA ― OWARIN's STORE` (676297058896868)**
ใช้ `owarin-logo-no-bg.png` เป็นรูป seed ทุกใบ · ชื่อก๊อปจาก `TYPE LIST!B2:B17`

---

## 15. สคริปต์จริง — `OWARIN_FB_Album_AutoPost.gs`

ไฟล์อยู่ที่ `OWARIN STORE\OWARIN_FB_Album_AutoPost.gs` (345 บรรทัด · ผ่าน syntax check)

### ⚠️ เป็นไฟล์ *เสริม* ของโปรเจกต์เดิม ไม่ใช่ไฟล์เดี่ยว

โปรเจกต์ Apps Script ที่ผูกกับชีตนี้มีอยู่แล้ว: `Code.gs` (3,845 บรรทัด) + `WebApp.gs` (863)
สคริปต์ใหม่จึง **เรียกใช้ของเดิม ไม่สร้างซ้ำ**

| ของเดิมที่ใช้ | ทำอะไร |
|---|---|
| `_metaInvIndex()` | Product ID → `{status, type, sheet, name}` อ่านจาก 2 แท็บให้เสร็จสรรพ |
| `ALBUM_SHEET` / `ALBUM_HEADERS` | ชื่อชีต `ALBUM CAPTION` + หัวคอลัมน์ |
| `_fbFindCol(headerRow, ชื่อคอลัมน์)` | หาคอลัมน์จากหัวตาราง — ไม่ hardcode เลขคอลัมน์ |
| `_withLock(fn)` | กันรอบซ้อน (ตัวเดียวกับที่ทั้งโปรเจกต์ใช้) |
| `_tryWrite()` · `_sp2ResetWriteErrors()` · `_sp2WriteErrMsg()` | เขียนชีตแบบปลอดภัยกับ Google Sheets **Table** (typed column เขียนทับไม่ได้ จะข้ามแล้วรายงาน) |

`buildAlbumCaptions()` ของเดิมเก็บคอลัมน์ `Posted` ไว้ตอนสร้างชีตใหม่อยู่แล้ว
→ สร้าง caption ใหม่กี่รอบก็ไม่ทำให้โพสต์ซ้ำ

ตัวแปร/ฟังก์ชันใหม่ขึ้นต้น `FBA_` / `fba` / `_fba` ทั้งหมด **ตรวจแล้วไม่ชนกับของเดิมสักตัว**

### ติดตั้ง

1. เปิดชีต → **Extensions → Apps Script**
2. กด **+ → Script** สร้างไฟล์ใหม่ชื่อ `FbAlbum` → วางเนื้อไฟล์นี้ทั้งหมด
   **ห้ามวางทับ `Code.gs`**
3. ⚙️ **Project Settings → Script Properties** → `PAGE_TOKEN` = Page token ของเพจ
4. เปิด `Code.gs` ไปที่ `onOpen()` (ราวบรรทัด 3801) แล้ววางบล็อกเมนูที่อยู่ท้ายไฟล์
   **ก่อนบรรทัด `.addToUi();`** → เมนู `📷 FB Album Auto-Post` จะไปอยู่ใต้ `📦 Inventory Tools`

### ลำดับการรัน (จากเมนูในชีต)

| # | เมนู | ทำอะไร |
|---|---|---|
| 1 | 🔑 ตรวจ Page Token | ต้องคืนชื่อเพจ ไม่ใช่ชื่อคน |
| 2 | 🔄 Sync อัลบั้มจากเพจ | สร้าง/อัปเดตชีต `FB ALBUMS` · `album_key` = ชื่ออัลบั้มที่ตัด 【…】 ออก |
| 3 | 🔍 ตรวจการจับคู่ | ลิสต์ทุก Type พร้อม ✅/❌ ว่ามีอัลบั้มรองรับไหม |
| 4 | 🧪 ยิงทดลอง 3 รูป | ยิงจริง 3 รูป ไปดูบนเพจด้วยตา |
| 5 | ⏱️ เปิดรันอัตโนมัติทุก 4 ชม. | 25 รูป/รอบ = 150 รูป/วัน → ครบ 1,078 รูปใน ~7 วัน |

รอบแรกจะขอ OAuth (Sheets + External requests) — กด Allow

### ซ่อมบำรุง

`♻️ ลองใหม่เฉพาะแถว ERROR` · `⏹️ ปิดรันอัตโนมัติ` · `🗑️ ล้าง Posted ทั้งหมด ⚠️` (มี confirm)

### ค่าปรับได้บนหัวไฟล์

`FBA_BATCH` 25 · `FBA_SLEEP_MS` 1500 · `FBA_USAGE_STOP` 75 · `FBA_PAGE_ID`

### กลไกกันพัง

- คีย์เดียวที่ตัดสินว่าจะโพสต์อะไร = คอลัมน์ `Posted` ว่าง/ไม่ว่าง ไม่มี state ที่อื่น
- ข้ามแถวที่ `_metaInvIndex()` บอกว่าไม่ใช่ `Instock` แล้ว — ขายไประหว่างทางก็ไม่โพสต์
- `Type` ไม่ตรงอัลบั้มไหน = ข้าม + นับ `unmapped` ลง `FB ALBUMS!H2` **ต้องเป็น 0**
- error เขียนลงคอลัมน์ `Posted` เลย (`ERROR <code>: <ข้อความ>`) ไม่ต้องเปิด log
- เจอ 190 (token) หรือ 4/17/32/341/613 (rate limit) → **หยุดรอบทันที**
- อ่าน `X-Business-Use-Case-Usage` ทุกครั้ง เกิน 75% หยุด
- เขียนกลับครั้งเดียวตอนจบรอบ ผ่าน `_tryWrite` (รองรับชีตที่เป็น Table)
- `active = FALSE` ในชีต `FB ALBUMS` = ปิดอัลบั้มนั้นชั่วคราว · Sync รอบใหม่ไม่ทับค่านี้

### สรุปผลรันล่าสุด — ชีต `FB ALBUMS` คอลัมน์ G:H

รันล่าสุด · unmapped · โพสต์สำเร็จ · error · เหลือรอโพสต์

---

## 16. สถานะจริง — ระบบเดินแล้ว (30 ส.ค. 06:01)

| ขั้น | ผล |
|---|---|
| `FbAlbum.gs` ในโปรเจกต์ Apps Script | ติดตั้งแล้ว · ฟังก์ชันครบ 10 ตัว |
| เมนู `📷 FB Album Auto-Post` ใต้ `📦 Inventory Tools` | ใช้งานได้ |
| OAuth | อนุมัติแล้ว |
| `PAGE_TOKEN` | Page token ของแอป `OWARIN-Auto-Post` · `expires_at: 0` (ไม่หมดอายุ) · มี `pages_manage_posts` |
| **Sync albums** | เจอ 20 อัลบั้มบนเพจ (ของเรา 16 + ระบบ FB 4) เขียนลงชีต `FB ALBUMS` แล้ว |
| **Audit** | **ทุก Type ขึ้น OK ครบ — "Every type is covered. Ready to post."** |
| **Post 3 photos (test)** | **สำเร็จ 3 · error 0 · unmapped 0 · เหลือ 1,074** |

3 รูปแรกที่ยิงไป: `Alan Wake (RESTOCK-01)` · `Armored Core：Master of Arena` · `Assassin's Creed II (RESTOCK-01)`
คอลัมน์ `Posted` เขียนกลับเป็น `<photo_id> | 2026-08-30 06:01` เรียบร้อย

### บทเรียนเรื่อง token (กันพลาดซ้ำ)

1. **Page token สืบอายุจาก User token ที่ใช้สร้าง** — ต้อง **Extend เป็น 60 วันก่อน** แล้วค่อยยิง
   `/me/accounts` ไม่งั้นได้ Page token ที่ตายใน 1-2 ชม. (เคยพลาดแล้ว → error 190)
2. **ต้องออกจากแอปที่มีสิทธิ์ `pages_manage_posts`** — ครั้งหนึ่งได้ token จากแอป `OWARIN STORE`
   ซึ่งไม่มีสิทธิ์นี้ ถ้าใช้ต่อจะเด้ง error 200 ตอนโพสต์
3. **ตรวจก่อนใช้เสมอ** ด้วย
   `https://graph.facebook.com/v23.0/debug_token?input_token=<PAGE_TOKEN>&access_token=<USER_TOKEN>`
   ต้องได้ `type: PAGE` · `expires_at: 0` · `profile_id: 676297058896868` · มี `pages_manage_posts`

### ขั้นต่อไป

ดูรูปที่โพสต์ไป 3 รูปบนเพจว่า caption/รูป/อัลบั้มถูกต้อง แล้วค่อยเปิด
`⏱️ Run every 4 hours` → 25 รูป/รอบ = 150 รูป/วัน → ครบ 1,074 รูปใน ~7 วัน

---

## 17. v2 — ยิงอัลบั้มเล็กก่อน + พักอัลบั้มใหญ่ไว้ (30 ส.ค. 06:23)

### เปลี่ยนอะไรในสคริปต์

| เดิม | v2 |
|---|---|
| ไล่ตามลำดับแถวใน `ALBUM CAPTION` (เรียงตาม Product ID) → ยิงเข้า GAME GUIDE BOOKS รัวเป็นพัน | **จัดคิวตามขนาดอัลบั้ม เล็กไปใหญ่** ทุกหมวดได้ขึ้นเร็ว และไม่ยิงอัลบั้มเดียวรัว ๆ (ลดโอกาสโดน spam detection) |
| `active = FALSE` → นับเป็น `unmapped` ทำให้ตัวเลขเตือนผิด | แยกเป็น **`On hold`** ต่างหาก · `unmapped` ยังต้องเป็น 0 เสมอ |
| สรุปผล 5 บรรทัด | 6 บรรทัด เพิ่ม `On hold (active FALSE)` ที่ `FB ALBUMS!H6` |

### สถานะการยิงตอนนี้

**เปิด 13 อัลบั้ม · พัก 3 อัลบั้ม** (ตั้ง `active = FALSE` ที่ `FB ALBUMS!E6, E7, E17`)

| ลำดับยิง | อัลบั้ม | รูป |
|---|---|---|
| 1 | PLAY | 4 |
| 2 | TV MAGAZINE | 5 |
| 3 | TONBO MAGAZINE | 8 |
| 4 | Other | 9 |
| 5 | A・Club | 17 |
| 6 | GAMEMAG TOP SECRET | 19 |
| 7 | GAMEMAG CHEATS & CODE | 25 |
| 8 | MEGA MAGAZINE | 27 |
| 9 | HOBBY JAPAN | 32 |
| 10 | GAMEMAG MAGAZINE | 37 |
| 11 | HOBBY MODEL | 40 |
| 12 | HOBBY TOY AND MODEL | 59 |
| 13 | GAMEMAG SPECIAL | 70 |
| | **รวมที่จะยิงรอบนี้** | **352** |
| ⏸ HOLD | MEGA MONTH | 155 |
| ⏸ HOLD | MEGA⨯GAME | 183 |
| ⏸ HOLD | GAME GUIDE BOOKS | 388 |
| | **พักไว้** | **722** |

### ผลรันจริง

- `Audit` → 13 บรรทัดขึ้น `OK`, 3 บรรทัดขึ้น `HOLD`, "Every type is covered."
- `Post 3 photos (test)` → **Queued: 3 (PLAY first) · Posted OK: 3 · errors: 0 · Still queued: 349 · On hold: 722 · unmapped: 0**
- **เปิด trigger แล้ว: ทุก 4 ชม. × 40 รูป ≈ 240 รูป/วัน → 349 รูปที่เหลือจบใน ~1.5 วัน**
  (ปรับ `FBA_BATCH` จาก 25 → 40 เมื่อ 06:30 · 40 รูป × 1.5 วิ ≈ 2 นาที/รอบ ยังห่างเพดาน 6 นาทีของ Apps Script มาก)

### เปิด 3 อัลบั้มที่พักไว้ทีหลังยังไง

แก้ `FB ALBUMS!E` ของแถวนั้นจาก `FALSE` เป็น `TRUE` — ไม่ต้องแตะโค้ด รอบถัดไปมันเข้าคิวเอง
(ถ้าอยากพักอัลบั้มไหนก็ตั้ง `FALSE` ได้เหมือนกัน · `Sync albums` รอบใหม่ไม่ทับค่านี้)

---

## 18. v3 — หนึ่งปกหนึ่งรูป (RESTOCK dedupe) · ⚠️ หยุด trigger ไว้ก่อน

### กติกา dedupe

คีย์ = `Type | base title (ตัด RESTOCK ออก) | Publisher | Original`
- คีย์ซ้ำ = ปกเดียวกัน → โพสต์ใบเดียว ที่เหลือเขียน `DUPLICATE of <pid>` ลงคอลัมน์ `Posted`
- เลือกใบที่ **ไม่ใช่ RESTOCK** ก่อนเสมอ ถ้าไม่มีก็เอาแถวแรก
- คนละ Publisher หรือคนละ Original = คนละปก → ขึ้นทั้งคู่ (ตามที่สั่ง)
- ถ้ามีใบหนึ่งโพสต์ไปแล้ว ใบที่เหลือถูก mark เป็น DUPLICATE ทันที
- **ใส่ base title ในคีย์ด้วย** เพราะสำนักพิมพ์เดียวกัน + ราคาเท่ากัน แต่คนละเรื่อง = คนละปก
- ฟังก์ชันใหม่ `fbaClearDuplicateMarks()` ล้างเฉพาะ mark DUPLICATE ถ้าแก้ข้อมูล Publisher/Original แล้วอยากให้คิดใหม่

### ผลทดสอบ (Post 3 photos)

```
Queued this run: 3  (TV MAGAZINE first)
Posted OK: 2 - errors: 1
Still queued: 51
On hold (active FALSE): 625
Duplicate covers skipped: 114
unmapped: 0
```

error เดียวคือ `OWA-MAGT016AMAN00` TV Magzine Hero vol 1-28 → `ERROR 324 Missing or invalid image file`
= รูปไม่มีบน R2 จริง (เคสที่รู้อยู่แล้วตั้งแต่ข้อ 3.4) ไม่ใช่บั๊กของโค้ด

### ⚠️ ปิด trigger ไว้ก่อน — ตัวเลขยังไม่ลงตัว

- คิวของ 13 อัลบั้มลดจาก 349 → 53 ปกไม่ซ้ำ แต่ `dupes` นับได้แค่ 114
- `On hold` เปลี่ยนจาก 722 (นับ**แถว**) เป็น 625 (นับ**ปก**) → เทียบกับตัวเลขเดิมตรง ๆ ไม่ได้
- รวมแล้วมีราว 280 แถวที่หายไปจากการนับ ยังหาไม่เจอว่าตกที่เงื่อนไขไหน
  (`!inv[pid]` / `status !== Instock` / ไม่มี url)

### ✅ คลี่คลายแล้ว — ไม่ใช่บั๊ก

280 แถวที่ "หายไป" คือ **รูปที่ถูกโพสต์สำเร็จไปแล้ว** ตั้งแต่ 30 ส.ค. trigger เดินมาตลอด:

| เวลา | โพสต์ |
|---|---|
| 30 ส.ค. 06:00 | 6 |
| 30 ส.ค. 08:00 | 39 |
| 30 ส.ค. 12:00 / 16:00 / 20:00 | 40 / 40 / 40 |
| 31 ส.ค. 00:00 / 04:00 / 08:00 | 40 / 40 / 40 |
| 31 ส.ค. 10:00 | 2 |
| **รวม** | **287 รูป** |

ยอดลงตัวพอดี: 1,078 แถว = โพสต์แล้ว 287 + DUPLICATE 114 + ERROR 1 + ว่าง 676
**เปิด trigger กลับแล้ว** (ทุก 4 ชม. × 40 รูป)
