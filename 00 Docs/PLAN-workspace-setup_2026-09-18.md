# PLAN — workspace setup after the move to `etc\OWARIN`

จัดทำ: 2026-09-18 · สถานะ: เฟส 1 บางส่วนทำแล้ว · เฟส 1 ที่เหลือ + เฟส 2–3 ยังไม่ทำ
ต้นทางของแผนนี้: การสำรวจโฟลเดอร์จริงเมื่อ 2026-09-18 (ไม่ได้อ่านจากเอกสารเก่า)

## 0 · โครงจริงของ workspace

```
C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\
├─ ADS OPTIMIZER\
│  └─ Chubbygirlbkk - Shopee\          ← Stream A · เปิด Claude Code ที่นี่
│     ├─ .claude\  _specs\  _engine\  _archive\  _clients-other\
│     ├─ _setup-claude-commands\  install-claude-commands.ps1
│     ├─ Weekly\  MoM\  Claude outputs\
│     └─ README.md  RUNBOOK_TOKEN-EFFICIENT_v1.0.md
└─ OWARIN STORE\                        ← กลุ่ม Stream B (ไม่ใช่โปรเจกต์)
   ├─ OWARIN STORE\                     ← Stream B หลัก · เปิด Claude Code ที่นี่
   ├─ OWARIN Back House LAB\            ← โปรเจกต์อิสระ มี .git + AGENTS.md ของตัวเอง
   ├─ OWARIN WEB\owarin-retro-guides_1\
   └─ OWARIN AFFILIATE\
```

**เปิด VS Code / Claude Code ที่โฟลเดอร์ stream เสมอ ไม่ใช่ที่ `etc\OWARIN`** — Claude Code อ่าน `.claude/settings.json` จาก working directory หลัก ถ้าเปิดที่ root โมเดลรายโฟลเดอร์ (opusplan / sonnet) และ deny rule จะไม่ทำงาน

## 1 · การตัดสินใจที่ปิดแล้ว (2026-09-18)

| # | เรื่อง | ผล |
|---|---|---|
| 1 | โฟลเดอร์ซ้อน `OWARIN STORE\OWARIN STORE` | **ปล่อยไว้** แก้เอกสารให้ตรงแทน — path ฝังอยู่ใน `settings.local.json`, `.ps1` หลายตัว, `build_shopee_upload.py` และเอกสาร การแบนโฟลเดอร์ได้แค่ชื่อสวยขึ้นแต่ต้องไล่แก้ทุกจุด · **CLOSED ห้ามรื้อซ้ำ** |
| 2 | โมเดลโฟลเดอร์ Ads | **`opusplan`** (Opus ตอนวางแผน Sonnet ตอนลงมือ) — คำสั่ง slash ล็อก model ต่อ phase อยู่แล้ว |

## 2 · สิ่งที่พบตอนสำรวจ

| # | เรื่อง | สถานะก่อนแก้ |
|---|---|---|
| 1 | path ใน `AGENTS.md` ของ Stream B | Stream A ชี้ `Desktop\Chubbygirlbkk - Shopee` (ตายแล้ว) · Stream B ชี้โฟลเดอร์กลุ่ม ไม่ใช่โปรเจกต์จริง |
| 2 | โฟลเดอร์ Ads | ไม่มี `CLAUDE.md` / `AGENTS.md` · `.claude\settings.json` = `{"model":"opus"}` |
| 3 | slash command 11 ตัว | ค้างใน `_setup-claude-commands\` · `.claude\commands\` ไม่มีอยู่จริง |
| 4 | `skills\` ที่ `AGENTS.md` อ้าง | ไม่มีโฟลเดอร์นี้ · สกิน diagram-design เหลือแค่ zip ใน `Claude outputs\` · `shopee-report-rules` ไม่มีสำเนาออฟไลน์ |
| 5 | credential | `OWARIN AFFILIATE\owarin-store-api-1c2ccbfce5a8.json` = service-account key วางเปลือยบน OneDrive |
| 6 | `00 Docs\` | HANDOFF 4 ไฟล์ (`HANDOFF.md` + 12/13/14) · JSON ครั้งเดียวจบ ~2.5 MB |

## 3 · เฟส 1 — ชั้นตั้งค่า

### ทำแล้ว 2026-09-18 (log: `04 Design Tools\logs\workspace-setup_20260918.csv`)

- `OWARIN STORE\OWARIN STORE\AGENTS.md` — แก้ path Stream A และ Stream B ให้ตรงของจริง · ตาราง `skills/` ชี้ไป `_skills\` · เพิ่มหัวข้อ Token discipline
- `ADS OPTIMIZER\Chubbygirlbkk - Shopee\AGENTS.md` — สร้างใหม่ (router ของ Stream A)
- `ADS OPTIMIZER\Chubbygirlbkk - Shopee\CLAUDE.md` — สร้างใหม่ (กฎประจำโฟลเดอร์)
- `etc\OWARIN\_skills\shopee-report-rules\SKILL.md` — สำเนาออฟไลน์ชุดแรก

### ยังไม่ทำ — ต้องรันในเครื่อง (remote tool เขียน `.claude` ไม่ได้)

**1.1 ติดตั้ง slash command + แก้โมเดลโฟลเดอร์ Ads**

```powershell
cd "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\ADS OPTIMIZER\Chubbygirlbkk - Shopee"
powershell -ExecutionPolicy Bypass -File .\install-claude-commands.ps1
Get-ChildItem .claude\commands   # ต้องได้ 11 ไฟล์
```

แล้วแก้ `.claude\settings.json` จาก `{ "model": "opus" }` เป็น `{ "model": "opusplan" }`

**1.2 ชั้น user-level** — ⚠️ แก้ `C:\Users\JIN\.claude\settings.json` จริง สำรองก่อนทุกครั้ง

- `C:\Users\JIN\.claude\CLAUDE.md` → ต่อท้ายหัวข้อ `## Token discipline`
- `C:\Users\JIN\.claude\settings.json` → เพิ่ม `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = "75"` และ `permissions.deny` ของโฟลเดอร์ขยะ (`node_modules`, `dist`, `build`, `.venv`, lock files, `_archive/`, `_specs/_archive/`) โดยคงคีย์เดิมทุกตัว เขียนเป็น UTF-8 ไม่มี BOM
- ทางเลือก: รัน `00 Docs\setup-token-harness.ps1` ซึ่งทำข้อนี้ให้พร้อมสำรอง ตรวจซ้ำ และเขียน log

**1.3 `OWARIN Back House LAB\AGENTS.md`** → เพิ่มบรรทัดเดียวชี้ token-harness (โปรเจกต์นี้มีกฎของตัวเองอยู่แล้ว ห้ามแก้อย่างอื่น)

## 4 · เฟส 2 — จัดไฟล์เข้าระบบ

กฎของเฟสนี้: **ย้ายอย่างเดียว ห้ามลบ** · ทุกการย้ายเขียน CSV log ลง `04 Design Tools\logs\` ทั้งรอบ dry-run และรอบ commit · ปลายทางที่ยังไม่มีให้สร้างก่อน

| # | ทำอะไร | จาก | ไป |
|---|---|---|---|
| 2.1 | แตก zip สกิน diagram-design | `OWARIN STORE\OWARIN STORE\Claude outputs\diagram-design-owarin-v2.zip` | `etc\OWARIN\_skills\diagram-design-OWARIN-skin\` |
| 2.2 | สำเนาออฟไลน์สกิลบัญชี | สกิล `token-harness`, `grill-with-docs` | `etc\OWARIN\_skills\<ชื่อ>\SKILL.md` |
| 2.3 | ⚠️ ย้าย credential | `OWARIN AFFILIATE\owarin-store-api-1c2ccbfce5a8.json` | `OWARIN STORE\OWARIN STORE\_archive\secrets\` |
| 2.4 | เก็บ HANDOFF เก่า (คงไว้ 13, 14) | `00 Docs\HANDOFF.md`, `HANDOFF_2026-09-12.md` | `00 Docs\_archive\` |
| 2.5 | เก็บ JSON ครั้งเดียวจบ | `FILE-INVENTORY-2026-09-08.json` (2.1 MB), `AUDIT-ISSUES-2026-09-08.json`, `LAB-ITEM-MAPPING.json` | `00 Docs\_archive\` |
| 2.6 | เก็บ output เก่า | `Claude outputs\` ทั้งสอง stream | `_archive\claude-outputs\` ของ stream นั้น |
| 2.7 | เก็บ log ก้อนยักษ์ | `logs\new-arrivals_dryrun_20260912-184927.csv` (7.4 MB) และ `.log` ที่เกิน 500 KB | `04 Design Tools\logs\_archive\` |

**2.3 ไม่ใช่การแก้ความปลอดภัย** — ถ้าไฟล์ key นี้เคยถูกแชร์ลิงก์ OneDrive หรือหลุดออกไป ต้องเข้า Google Cloud Console → IAM & Admin → Service Accounts → บัญชี `owarin-store-api` → แท็บ Keys → ลบ key เดิมแล้วสร้างใหม่ การย้ายไฟล์ไม่ทำให้ key ที่รั่วปลอดภัยขึ้น

## 5 · เฟส 3 — ตรวจและปิดงาน

1. ไล่ `Test-Path` ทุก path ที่ `AGENTS.md`, `CLAUDE.md` และ `README.md` ของทั้งสอง stream อ้างถึง — ต้องมีจริงครบ
2. เปิด Claude Code ที่แต่ละ stream แล้วรัน `/context` จดตัวเลขฐานไว้เทียบกับก่อนหน้า
3. เขียน `00 Docs\HANDOFF_2026-09-18.md`
4. อัปเดตไฟล์นี้: ทำอะไรไปแล้ว เหลืออะไร

## 6 · จุดที่ต้องระวังในโฟลเดอร์นี้

- `.claude\settings.local.json` ของ Stream B มี allow-list ที่ใช้งานจริง (`rclone ls/lsf/size/check`, สคริปต์ `.ps1`, `curl` ชีต) — **ห้ามเขียนทับ ให้เติมอย่างเดียว**
- `.claude\settings.json` ของ Stream B มี deny `rclone sync/delete/purge` — ห้ามถอด
- `OWARI-MASTER-CONTEXT_*.md` (44 KB EN + 72 KB TH) เป็น **สำเนา** ลงวันที่ 2026-09-13 ไม่ใช่ต้นฉบับ · กฎเปลี่ยนที่ต้นทางเมื่อไร ต้องไหลมาที่นี่ในรอบเดียวกัน ไม่งั้น workspace จะรันบนกฎเก่า
- `Chubbygirlbkk - Shopee` อยู่บน OneDrive และเคยเขียนสำเร็จ (exit 0) แต่เนื้อหาหาย — อ่านกลับยืนยันทุกครั้ง
- `OWARIN Back House LAB` เป็น Stream B แยกต่างหาก มี `.git` และ `REQUIREMENTS.md` ของตัวเอง ห้ามคัดโค้ด/สคีมา/ID จากร้านเก่าเข้าไป
