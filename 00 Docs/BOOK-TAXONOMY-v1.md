# OWARIN — โครงสร้างประเภทหนังสือ v1
8 กันยายน 2026 · ข้อเสนอจากรายการจริงในชีตและคำตอบเจ้าของ · ยังไม่เขียนทับข้อมูลจริง

## คำตอบ
ควรออกแบบประเภทใหม่ เพราะ Type ปัจจุบันรวมหมวดเนื้อหา รูปแบบสิ่งพิมพ์ และชื่อชุดไว้ในช่องเดียว
แต่ไม่ควรย้ายหรือเปลี่ยนสินค้าทุกแถวทันที: เพิ่ม fields ใหม่, ทำ mapping, ตรวจข้อกำกวม แล้วค่อยเปลี่ยนหน้าจอและแหล่งข้อมูลหลัก

## หลักฐานจาก snapshot ชีต 8 ก.ย.
- GAME GUIDE BOOKS มี Type = GAME GUIDE BOOKS, POCKET BOOK, GAMEMAG SPECIAL, GAMEMAG CHEATS & CODE, GAMEMAG TOP SECRET
- MAGAZINE มี Type = HOBBY JAPAN แต่ตัวอย่างสินค้ารวม Danball Senki LBX Perfect Modeling Book, Dengeki Hobby และ Gundam Weapons
- Type = HOBBY MODEL มีตัวอย่างชื่อ HOBBY GAME vol 1/2/5 จึงไม่ควรเติมชื่อชุด HOBBY MODEL ทับทุกรายการ
- Other มีทั้ง Art Work of Saint Seiya, GAMECOM 2000 vol 08 และ Handbook of Gunpla Modeling ซึ่งน่าจะต้องอยู่คนละรูปแบบ/หัวข้อ แต่ต้องตรวจเล่มก่อนยืนยัน
- ชื่อชุดกับ Publisher ต้องเป็นคนละ field; คำว่า HOBBY JAPAN เดิมไม่ใช่หลักฐานเพียงพอสำหรับทั้งสองช่อง
- การมีคำว่า vol/Issue ไม่ได้พิสูจน์ว่าเป็นนิตยสารรายงวด; หนังสือบทสรุปและฉบับพิเศษมีเลขเล่มได้เช่นกัน

## โครงสร้างข้อมูลต่อฉบับ
| มิติ | Field | ค่าหรือหลักการ |
|---|---|---|
| หมวดเนื้อหาหลัก | subject_group | GAME / HOBBY_MODEL / ANIME_TOKUSATSU / MIXED / UNCLASSIFIED |
| รูปแบบสิ่งพิมพ์ | publication_form | STRATEGY_GUIDE / PERIODICAL / SPECIAL_MOOK / ARTBOOK / REFERENCE / UNCLASSIFIED |
| ชื่อชุดสิ่งพิมพ์ | publication_series | เช่น MEGA MONTH, GAMEMAG SPECIAL, HOBBY TOY & MODEL; แยกจากชื่อเกม |
| ชื่อเล่ม | title | ชื่ออ่านได้ ไม่ใส่ข้อมูลสภาพหรือ RESTOCK เป็นส่วนระบุฉบับ |
| สำนักพิมพ์ | publisher_id | ผู้จัดพิมพ์ของฉบับจริง |
| เกม/ผลงานที่เกี่ยวข้อง | subject_titles / franchise | รองรับหลายเกมต่อฉบับ เช่นหน้าปกที่มีสองเกม |
| ระบบเกม | platforms | รองรับหลายเครื่องและเว้นว่างสำหรับสิ่งพิมพ์ที่ไม่เกี่ยวกับเกม |
| เลขฉบับและวันที่พิมพ์ | issue_no / volume / year / month | แยกช่อง ไม่ต้อง parse ชื่อใหม่ทุกครั้ง; ไม่ทราบให้เว้นว่าง |
| รุ่นพิมพ์และปก | edition / cover_variant | ปกคนละแบบจริงหรือคนละรุ่นพิมพ์เป็นความต่างระดับฉบับ |
| ภาษา | language | ตามเล่มจริง ไม่อนุมานจากชื่อภาษาอังกฤษ |
| รูปเล่ม | physical_format / dimensions / binding | POCKET BOOK อาจเป็นป้ายรูปเล่มเดิม แต่ต้องตรวจขนาดจริงก่อนเติมอัตโนมัติ |
| เนื้อหาหรือของประกอบ | content_tags / expected_supplements | เช่น walkthrough, cheats, art, modeling tutorial, expected map/poster |
| ตัวระบุเสริม | isbn / jan / publisher_code | ไม่บังคับว่าหนังสือเก่าทุกเล่มต้องมี |

SPECIAL_MOOK เป็นค่าเสนอสำหรับสิ่งพิมพ์พิเศษที่ต้องตรวจ ไม่ได้กำหนดว่าทุกชื่อ SPECIAL เป็น mook
content_tags แยกจากของที่มาพร้อมเล่มจริง: ฉบับคาดว่ามีแผนที่ แต่ item อาจแผนที่หาย
กลุ่มอนิเมะ/โทคุซัตสึมาจากตัวอย่าง Saint Seiya/TV Magazine และเป็นหมวดเสนอ ไม่ใช่การยืนยันเนื้อหาทุกเล่ม

## โครงสร้างต่อเล่มจริง
item_id / title_id / legacy_sku / condition_grade / condition_notes / actual_supplements / cost / asking_price / location_id / item_images / received_at / stock_status

เกรด S/A/B/C/D ยังใช้ร่วมกับคำอธิบายตำหนิได้; ปกยับ สีซีด สันแตก หน้าหลุด หรือปกหายอยู่ที่ item
ปก variant จากการผลิตต่างกันอยู่ที่ title/edition; ถ้าตรวจไม่ชัดให้เก็บรูปและหมายเหตุไว้โดยยังไม่รวมฉบับ
จำนวนพร้อมขายของฉบับคำนวณจาก item ที่พร้อมขาย; ไม่ใช้ quantity ร่วมแทนสภาพ/รูป/ราคาทุกเล่ม
การเปลี่ยนตำแหน่งชั้นหรือสภาพไม่เปลี่ยน SKU หรือทำให้รูปหลุด

## เมนูค้นหาที่ผู้ใช้เห็น
ALL รวมหนังสือทุกเล่ม ข้างกันมี saved views:
- บทสรุปเกม: subject GAME + form STRATEGY_GUIDE
- นิตยสารเกม: subject GAME + form PERIODICAL
- สิ่งพิมพ์โมเดล: subject HOBBY_MODEL ครอบคลุมนิตยสาร/คู่มือ/ฉบับพิเศษ
- ฉบับพิเศษและภาพสะสม: SPECIAL_MOOK / ARTBOOK
- ยังไม่จัดหมวด: fields สำคัญไม่ครบ

View อาจซ้อนกันโดยตั้งใจ เช่น คู่มือโมเดลฉบับพิเศษอยู่ได้สอง view; ALL และยอดรวมต้อง dedupe ด้วย item_id เสมอ
บนหน้าเดียวกันมี filter รูปแบบ, ชื่อชุด, Publisher, Platform, สภาพ, ราคา, ชั้น และสถานะ
ไม่ต้องโชว์ทุก filter ตลอดเวลา; เริ่มค้นชื่อ + view + สถานะ และรวมส่วนอื่นใน “ตัวกรองเพิ่มเติม”
ไม่บังคับให้ผู้ใช้เลือกหลายหมวดทุกครั้งที่ Add: เลือกฉบับเดิมแล้วเติม metadata ที่เป็นของฉบับได้ แต่ fields ของเล่มจริงเริ่มว่าง

## ตาราง mapping ที่ควรทำ
| ค่า Type เดิม | การนำไปใช้ | สิ่งที่ยังต้องตรวจ |
|---|---|---|
| GAME GUIDE BOOKS | candidate GAME / STRATEGY_GUIDE | หนังสือรวมหรือฉบับอ้างอิงที่ต่างรูปแบบ |
| POCKET BOOK | preserve legacy_type; รูปเล่มเป็น candidate | ไม่แปลเป็นเนื้อหาหรือชื่อชุด; ดูเล่มจริง |
| GAMEMAG SPECIAL | publication_series candidate | แยกบทสรุปเฉพาะเกม vs พิเศษ/ภาพสะสมรายฉบับ |
| GAMEMAG CHEATS & CODE | series bucket เดิม; ตรวจชื่อบนปก | ชื่อจริงมี BIG SPECIAL และ ฉบับสูตรเกม ไม่ควรรวม title series ทับ |
| GAMEMAG TOP SECRET | publication_series candidate | form ตามเนื้อหา ไม่ตามชื่อ bucket |
| GAMEMAG MAGAZINE / MEGA MAGAZINE / MEGA MONTH / MEGA×GAME / PLAY / TONBO MAGAZINE | candidate GAME/PERIODICAL พร้อม series | ฉบับพิเศษที่อาจแฝงอยู่และ normalization เครื่องหมาย ×/⨯ |
| HOBBY JAPAN | candidate subject HOBBY_MODEL | ต้องแยก Dengeki Hobby, Gundam Weapons, modeling books ตามชื่อชุด/รูปแบบจริง |
| HOBBY MODEL | preserve legacy bucket | มีชื่อ HOBBY GAME; ตรวจ subject และ series ไม่ map ทั้งก้อน |
| HOBBY TOY AND MODEL | series candidate HOBBY TOY & MODEL | normalize ชื่อแบบแสดงผล; subject/form ยืนยันจากฉบับ |
| A・Club / TV MAGAZINE | publication_series candidate | เนื้อหาผสมและฉบับ photo album/special |
| Other / ว่าง | UNCLASSIFIED | คิวจัดหมวดรายฉบับ ห้ามเดาเพื่อให้ช่องครบ |

ทุก mapping มี rule_version / confidence / reviewed_by / reviewed_at / source_record
legacy_type และ legacy_sheet คงไว้เพื่อย้อนกลับ; mapping ไม่แก้ PID และไม่เปลี่ยนราคา
Facebook album ใช้ channel_album_group แยกจาก taxonomy; เปลี่ยน category ไม่ย้าย/สร้าง/ลบอัลบั้มอัตโนมัติ
Pricing engine อ่าน subject/form/series ที่กำหนดให้ชัด โดย game_franchise ไม่ปะปนกับ publication_series
ข้อมูลขายผ่านประมูลเก็บแยก sale_method เพื่อเลือกเปรียบเทียบราคาได้ ไม่รวมเข้ากับ direct-sale comps อัตโนมัติ

## ลำดับทำจริง
1. ยืนยัน source Apps Script ปัจจุบันและ snapshot ข้อมูล
2. สร้าง mapping preview รายฉบับจากชื่อ/Type เดิม; ใช้คนตรวจกลุ่มกำกวมก่อน commit
3. เพิ่ม fields/lookup table ใหม่ข้างข้อมูลเดิมโดยรักษา formulas/tables; ยังไม่ยุบชีต
4. เปลี่ยน ALL และ filter ให้ใช้ schema ใหม่; SKU/image/ราคาเดิมต้องยังเชื่อมได้
5. ย้าย inventory เป็นโครงสร้างกลางเมื่อรวมข้อมูลผ่านการตรวจ; ชีต GGB/MAG เดิมเป็น view หรือ archive ตามแผน cutover
6. ตรวจยอด item และสถานะรวมก่อน/หลังเท่ากัน รวม Auction ในกลุ่มขายแล้ว; วันที่/เงินที่ไม่ทราบต้องไม่ถูกสร้างใหม่

## การขายตามคำตอบเจ้าของ
Quotation ผ่าน Messenger → ลูกค้ายืนยัน → เจ้าของบันทึกขายพร้อม direct/auction และราคาจริงรายเล่ม → รอโอนหรือรับเงินแล้ว → ส่งของ
เสนอให้วันที่ขายกับวันที่รับเงินเป็นคนละช่อง; รายงานแยกยอดที่ตกลงขายและยอดรับจริง
Auction เดิม = ขายแล้ว: ต้องไม่ให้ addToCart หรือ sales.confirm ขายซ้ำ และต้องรวมในประวัติขาย
ถ้าลูกค้ายังไม่ยืนยัน การแจ้งราคายังเป็น quotation; กดจองแยกเมื่อเจ้าของต้องการกันเล่ม
ตัวอย่างนี้เป็นแบบ workflow ที่เสนอ ไม่ใช่การเปลี่ยนข้อมูลย้อนหลัง

