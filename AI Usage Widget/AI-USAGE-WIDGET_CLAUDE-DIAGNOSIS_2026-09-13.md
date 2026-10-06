# AI Usage Widget — Diagnosis รอบที่ 1 (ฝั่ง Claude)

ตรวจจริง: 13 กันยายน 2026 · อ่าน source + ไฟล์ที่ติดตั้งจริงบนเครื่อง JIN · ไม่ได้ build / ไม่ได้ install / ไม่ได้แก้โค้ด / ไม่ได้เรียก live quota

---

## 1. Root cause — แยกสิ่งที่ยืนยันแล้ว ออกจากสมมติฐาน

### A. ยืนยันด้วยหลักฐานไฟล์ (ตรวจใหม่วันนี้ ไม่ใช่ค่าจากเอกสารเดิม)

| # | ข้อเท็จจริง | หลักฐาน |
|---|---|---|
| A1 | **Patch 2.0.1 ยังไม่เคยถูก build** | `Chrome Connector/content.js` ใน source = 2,002 bytes / manifest `"version": "2.0.1"` / mtime หลังการ build. ไฟล์ที่ติดตั้ง `...\Programs\AIUsageWidget\2.0.0\Chrome Connector\content.js` = 1,169 bytes / manifest `"version": "2.0.0"` → ตัวที่ Chrome โหลดคือโค้ดก่อนแก้ ACK/retry |
| A2 | **ไม่เคยมี Claude snapshot เขียนสำเร็จบนเครื่องนี้** | `C:\Users\JIN\AppData\Local\AIUsageWidget` มีไฟล์เดียวคือ `window.json` (33 bytes) — ไม่มี `claude-v2.json` และไม่มีไฟล์ `.tmp` ค้าง |
| A3 | Native host ฝั่งไฟล์ครบและถูกต้อง | `native-host.json` ชี้ path สัมบูรณ์ไปยัง `AIUsageBridge.exe` (มีจริง 44,032 bytes) และ `allowed_origins` = `chrome-extension://nbfbbnnagaajnbhbdljbpncfdgnhfabe/` ตรงกับ `NativeHost.cs` |
| A4 | Registry key ถูกเขียนถูกที่ตามโค้ด | `Setup.cs` เขียน `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.aiusage.widget` ทั้ง Registry32/64 — และ `HKCU\Software` **ไม่มี WOW64 redirection** (มีเฉพาะ `HKCU\Software\Classes`) ทั้งสอง view จึงเขียนคีย์เดียวกัน → การ "ไม่พบคีย์" ในเอกสารเดิมเป็นเรื่อง **user context ของเครื่องมือตรวจ** ไม่ใช่ installer พลาด |
| A5 | **Setup.cs hardcode โฟลเดอร์ปลายทางเป็น `2.0.0`** | บรรทัด `Path.Combine(..., "Programs","AIUsageWidget","2.0.0")` — rebuild 2.0.1 จะทับไฟล์ในโฟลเดอร์ `2.0.0` เดิม |
| A6 | Chrome ไม่ reload extension เองเมื่อไฟล์ unpacked ถูกทับ | ผลจาก A5: ต่อให้ติดตั้งใหม่สำเร็จ Chrome ยังรัน 2.0.0 ในหน่วยความจำจนกว่าจะกด **Reload** หรือรีสตาร์ต Chrome |

**สรุป root cause ที่พิสูจน์ได้:** สาเหตุที่ Claude ยังไม่ครบวงจร **ไม่ใช่บั๊ก ACK/retry** (นั่นแก้ไปแล้วใน source) แต่คือ **โค้ดที่แก้ยังไม่ถูกส่งไปถึง Chrome** — และไม่มีหลักฐานเลยว่า bridge เคยเขียน cache สำเร็จสักครั้ง (A2)

### B. สมมติฐานที่ยังต้องทดสอบ (ห้ามสรุปตอนนี้)

- B1 — Chrome ติดตั้ง extension นี้อยู่จริงหรือยัง และเป็น ID/profile ไหน (A2 อธิบายได้ทั้งกรณี "ไม่เคยติดตั้ง extension" และ "ติดตั้งแล้วแต่ deliver ไม่ผ่าน")
- B2 — HKCU key มีอยู่จริงใน context ของ user JIN ที่เปิด Chrome หรือไม่ (A4 บอกได้แค่ว่าโค้ด*ควร*เขียนถูก ไม่ได้ยืนยันว่า Setup รันสำเร็จ)
- B3 — `AIUsageBridge.exe` เขียนไฟล์ลง `%LOCALAPPDATA%` ได้จริงหรือถูก AV/OneDrive/Controlled folder access บล็อก

### C. บั๊กเพิ่มเติมที่เจอจากการอ่านโค้ด (ยืนยันจาก code ทั้งหมด)

| # | อาการ | โค้ด |
|---|---|---|
| C1 | **เปิดแท็บ Usage ค้างไว้เป็นแท็บที่ active → widget ขึ้น STALE แน่นอนภายใน 3 นาที** | `background.js` alarm reload เฉพาะ `if (!tab.active ...)` + `content.js` `if (last === fingerprint) return;` (ไม่ส่งซ้ำถ้า DOM ไม่เปลี่ยน) + `Data.cs IsStale` = 3 นาที → ไม่มีทางต่ออายุ freshness ได้เลยถ้าแท็บอยู่หน้าจอ |
| C2 | **sign-out / native-host error ไม่ถึง widget** | `background.js status()` เขียนแค่ `chrome.storage.local` (popup เห็น) — ไม่มีเส้นทางใดเขียนถึง widget → การ์ดยังโชว์ CONNECTED พร้อมตัวเลขเก่าจนพ้น 3 นาที |
| C3 | ผิดบัญชีได้เงียบ ๆ | `Snapshot` ใน `Data.cs` ไม่มี field บัญชี/profile และ `Store.Save` เขียน path เดียว `claude-v2.json` → หลาย Chrome profile ทับกัน |
| C4 | `verify-and-install.ps1` บังคับ Codex | 8 บรรทัดแรก `throw 'Actual Codex quota read failed; installation not attempted.'` → คนที่ใช้ Claude อย่างเดียวติดตั้งไม่ได้ และสคริปต์ยังไม่อ่านกลับ HKCU key มายืนยัน |

---

## 2. มี interface ที่รองรับให้อ่าน subscription quota ไหม — **มี 1 ทาง และเป็นทางเดียวที่เป็น documented**

### ✅ Claude Code `statusLine` — documented, ไม่ต้องแตะ credential, ไม่ต้องใช้ browser

Claude Code ส่ง JSON เข้า stdin ของ statusLine command ทุกครั้งที่ redraw และในนั้นมี:

```json
"rate_limits": {
  "five_hour":  { "used_percentage": 23.5, "resets_at": 1738425600 },
  "seven_day":  { "used_percentage": 41.2, "resets_at": 1738857600 },
  "spend_limit":{ "used_percentage": 62.8, "resets_at": 1740787200 }
}
```

นี่คือ **โควตาระดับบัญชีจากฝั่งเซิร์ฟเวอร์** (5 ชั่วโมง = Current session, 7 วัน = Weekly all models) ไม่ใช่ token log ของเครื่อง — ตรงกับสิ่งที่ต้องการพอดี

**ข้อจำกัดที่ต้องพูดตรง ๆ (อย่าโฆษณาเกินจริง):**
- ปรากฏ **เฉพาะ Claude.ai Pro/Max** และ **หลัง API response แรกของ session เท่านั้น**
- เป็น **push ตอน Claude Code วาดจอ ไม่ใช่ endpoint ที่ poll ได้** → ปิด Claude Code = ข้อมูลหยุดสด (freshness class เดียวกับแท็บ Chrome แต่ไม่ต้องพึ่งเบราว์เซอร์)
- แต่ละ window หายได้อิสระ และ Claude Code จะตัด window ทิ้งเมื่อเลย `resets_at`
- มีแค่ 2 window — **ไม่มีแถว Sonnet-only** ที่หน้า Usage มี (เท่ากับได้ 2 ใน 3 แถวเดิม)
- `statusLine` ตั้งได้คำสั่งเดียว — ถ้า OWARI ใช้ statusline อยู่แล้ว ต้อง wrap ของเดิมไว้ในสคริปต์เดียวกัน

### ❌ ทางที่ตรวจแล้วว่า "ไม่มี"

| ทาง | ผล |
|---|---|
| Claude Desktop local API | ไม่มี documented interface ให้โปรแกรมภายนอกอ่านโควตา |
| MCP / desktop extension | เป็นทางที่ **Claude เรียกเครื่องมือของเรา** ไม่ใช่ทางที่เราอ่าน internal account quota ของ Claude — ใช้แทนกันไม่ได้ |
| Claude Code OpenTelemetry | export แค่ `claude_code.cost.usage` / `claude_code.token.usage` = token+cost ต่อเครื่อง **ไม่มี metric ของ rate limit** |
| Admin API `/v1/organizations/.../usage_report` | เป็นการใช้งาน **API organization** ไม่ใช่โควตา subscription ของ Pro/Max |
| `claude usage` CLI / `GET /usage/subscription` | เป็น feature request ที่ยัง**ปิดเป็น duplicate** — ยังไม่มีจริง |

### ⚠️ ทางที่ "ทำได้ทางเทคนิค" แต่ **ไม่รองรับ** — ไม่แนะนำ

tray app ตัวที่มีคนทำ (`jens-duttke/usage-monitor-for-claude`) ได้ตัวเลขมาโดย **อ่าน OAuth token จาก `~/.claude/.credentials.json` แล้วยิง `api.anthropic.com` เอง** — เป็น endpoint ที่ไม่มีเอกสาร พังได้ทุกเมื่อ และเข้าข่าย "ดึง credential" ที่ในบรีฟระบุว่าห้ามทำโดยไม่ตกลงกันก่อน → **ผมไม่เสนอทางนี้ ยกเว้น OWARI สั่งชัดเจน**

---

## 3. ควรคงเส้นทาง Chrome ไหม

**คงไว้เป็น fallback แต่ให้ statusLine เป็นแหล่งหลัก** และ **พิสูจน์ statusLine ก่อนลงแรงกับ Chrome ต่อ**

เหตุผล (ตามหลัก YAGNI/diff สั้นสุด):
- เส้นทาง statusLine ตัดทั้ง extension + Native Messaging + registry + Load unpacked + code signing + Chrome Web Store ออกทั้งก้อน — ปัญหา P0/P1/P2 ในบรีฟข้อ 9 หายไปเกินครึ่งโดยไม่ต้องแก้อะไรเลย
- โค้ดที่ต้องเพิ่มคือสคริปต์เดียวที่เขียน `claude-v2.json` ด้วย schema ที่ `Data.cs` รับอยู่แล้ว — **ไม่ต้องแตะ Widget.cs / Data.cs / NativeHost.cs**
- แต่ยังทิ้ง Chrome ไม่ได้: statusLine ต้องมี Claude Code + Pro/Max; คนที่ใช้ claude.ai บนเว็บอย่างเดียวยังต้องพึ่งเส้นทางเดิม และแถว Sonnet-only มีเฉพาะบนหน้า Usage

**ไม่ต้อง** ย้ายไป Electron / backend / cloud DB / framework ใหม่ — ไม่มีปัญหาข้อไหนที่ต้องใช้สิ่งเหล่านั้น

---

## 4. Targeted patch + test ขั้นต่ำ

### Stage 0 — พิสูจน์ statusLine (30 นาที, ทำก่อนอย่างอื่นทั้งหมด)

ดูขั้นตอนคลิกจริงในหัวข้อ 5 ข้อ 1 — เกณฑ์ผ่าน: ไฟล์ dump มีคีย์ `rate_limits`

ถ้าผ่าน → Stage 1A / ถ้าไม่ผ่าน (ไม่มี `rate_limits`) → ข้ามไป Stage 1B ทันที

### Stage 1A — เพิ่ม source ที่สอง (ถ้า Stage 0 ผ่าน)

1. `Chrome Connector/statusline-claude.js` (ไฟล์ใหม่ ~20 บรรทัด, ไม่มี dependency): อ่าน stdin → map `five_hour`→`Current session`, `seven_day`→`Weekly - all models` → เขียน `%LOCALAPPDATA%\AIUsageWidget\claude-v2.json` → พิมพ์ statusline เดิมกลับ stdout
2. `Data.cs` — เพิ่ม `"claude-code/statusline"` เป็น source ที่ยอมรับสำหรับ provider `claude` (**แก้จุดเดียว 1 บรรทัดใน `Snapshot.Parse`**) และ map `resets_at` → `resetsAt` ซึ่ง `Store.Reset()` รองรับอยู่แล้ว
3. `Widget.cs` — เมนู "Connect Claude" เพิ่มปุ่มที่ 2 "Use Claude Code statusline" ที่ copy คำสั่ง settings.json ให้

### Stage 1B — ปิด deployment gap ของเส้นทาง Chrome

> ⚠️ **คำเตือน: `build.ps1` เขียนทับโฟลเดอร์ `release` ทั้งก้อน และ `verify-and-install.ps1` kill process widget + ทับไฟล์ที่ติดตั้ง + แก้ registry/shortcut — สำรอง `release\` และ `2.0.0\` ก่อนรันทุกครั้ง**

1. `Setup.cs` — เปลี่ยน `"2.0.0"` ที่ hardcode ให้อ่านจาก manifest version หรือ constant เดียวกับ build (แก้ 1 บรรทัด)
2. `verify-and-install.ps1` — เพิ่ม `-SkipCodex` switch (ไม่บังคับ Codex สำหรับ Claude-only user) + อ่านกลับ HKCU key ทั้งสอง view แล้วเทียบกับ path ของ `native-host.json` (เพิ่ม ~6 บรรทัด)
3. หลังติดตั้ง **ต้องกด Reload ที่ chrome://extensions เสมอ** (ผลจาก A5/A6) — ใส่เป็นข้อความในกล่องท้าย Setup

### Stage 2 — แก้บั๊ก C1/C2 (diff เล็ก)

- **C1:** ใน `background.js` ลบเงื่อนไข `!tab.active` ออกจาก loop reload (การ reload ให้ observation ใหม่จริง จึงถือว่า fresh ได้) — 1 บรรทัด
- **C2:** ให้ `background.js` ส่ง `{version:2,provider:'claude',source:'claude.ai/settings/usage',observedAt,rows:[]}` แบบ error marker ไม่ได้ เพราะ `Data.cs` reject `rows` ว่าง → ทางที่สั้นกว่าคือ `NativeHost.cs` รับ message ชนิด `{kind:"status",error}` แล้วเขียน `claude-status-v2.json` และ `Widget.cs` อ่านไฟล์นี้มาแสดงแทน "Connect Chrome → Claude Usage" (~15 บรรทัดรวม)
- **C3 (P1):** เพิ่ม `accountLabel` (อีเมลบนหน้า Usage) ลง snapshot + แสดงบนการ์ด และไม่แสดงค่าถ้า label เปลี่ยน — ทำหลัง Stage 1

### Test matrix ขั้นต่ำก่อนบอกว่า "Claude ใช้ได้จริง"

| # | ทดสอบ | เกณฑ์ผ่าน |
|---|---|---|
| T1 | `chrome://extensions` | เห็น ID `nbfbbnnagaajnbhbdljbpncfdgnhfabe` **version 2.0.1** |
| T2 | เปิด `claude.ai/settings/usage` แล้วสลับไปแท็บอื่น รอ 90 วิ | `%LOCALAPPDATA%\AIUsageWidget\claude-v2.json` เกิดขึ้น `observedAt` ไม่เกิน 3 นาที |
| T3 | เทียบตัวเลข | ทุกแถวบนการ์ด = `100 − used%` บนหน้า Usage และข้อความ reset ตรงกัน |
| T4 | ปิดแท็บ Usage รอ 4 นาที | การ์ดเปลี่ยนเป็น STALE (ไม่ค้าง CONNECTED) |
| T5 | เปิดแท็บ Usage ค้างเป็นแท็บ active รอ 4 นาที | **ยังต้อง CONNECTED** (ข้อนี้จะ fail ก่อนแก้ C1 — เป็นตัวพิสูจน์ C1) |
| T6 | Sign out จาก claude.ai | ไม่โชว์ตัวเลขบัญชีเดิมเป็น CONNECTED (จะ fail ก่อนแก้ C2) |
| T7 | Stage 1A: ปิด Chrome ทั้งหมด เปิด Claude Code แล้วส่ง 1 ข้อความ | การ์ด Claude มีค่าจาก statusLine โดยไม่ต้องเปิด Chrome |

---

## 5. สิ่งที่ OWARI ต้องทำเอง (ผมทำแทนไม่ได้)

1. **Stage 0 — ทดสอบ statusLine** (⚠️ สำรอง `C:\Users\JIN\.claude\settings.json` ก่อน เพราะ `statusLine` ที่ตั้งอยู่เดิมจะถูกแทนที่)
   1. สร้างไฟล์ `C:\Users\JIN\.claude\statusline-probe.js` ใส่:
      ```js
      let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
        require('fs').writeFileSync(process.env.USERPROFILE+'\\.claude\\statusline-dump.json',s);
        process.stdout.write('probe');});
      ```
   2. เปิด `C:\Users\JIN\.claude\settings.json` → เพิ่มคีย์ระดับบนสุด:
      ```json
      "statusLine": { "type": "command", "command": "node \"C:\\Users\\JIN\\.claude\\statusline-probe.js\"" }
      ```
   3. เปิด Claude Code ในโฟลเดอร์ไหนก็ได้ → พิมพ์ข้อความอะไรก็ได้ 1 ครั้ง → รอให้ตอบเสร็จ
   4. เปิด `C:\Users\JIN\.claude\statusline-dump.json` → **ค้นหาคำว่า `rate_limits`** แล้วส่งผลมาให้ผม
2. **ล็อกอิน claude.ai ใน Chrome profile ที่จะใช้จริง** และบอกผมว่าเป็น profile ไหน
3. **Load unpacked / Reload extension ที่ `chrome://extensions`** — Chrome ไม่ยอมให้โปรแกรมภายนอกทำแทน
4. **อนุมัติให้รัน `build.ps1` + `verify-and-install.ps1`** (มีผลทับไฟล์/แก้ registry) — ผมจะไม่รันจนกว่าจะสั่ง
5. **ตัดสินใจขอบเขต ChatGPT:** ยังไม่พบแหล่งที่รองรับสำหรับ ChatGPT chat quota (แยกจาก Codex) — ยืนยันว่าจะคงป้าย "Codex" ตามที่วัดได้จริงใช่ไหม
6. **ตอบว่าจะเอาทางที่ไม่รองรับหรือไม่** — ถ้าไม่ ผมจะไม่แตะ `.credentials.json` เลย (ค่าเริ่มต้นของผมคือ: ไม่แตะ)

---

## แหล่งอ้างอิงที่เปิดตรวจในรอบนี้

- Claude Code statusLine (ฟิลด์ `rate_limits`) — https://code.claude.com/docs/en/statusline
- Claude Code OpenTelemetry monitoring — https://code.claude.com/docs/en/monitoring-usage
- Feature request `claude usage` / usage endpoint (ปิดเป็น duplicate) — https://github.com/anthropics/claude-code/issues/44328
- ตัวอย่าง tray app ที่ใช้ทาง **ไม่รองรับ** (อ่าน `.credentials.json`) — https://github.com/jens-duttke/usage-monitor-for-claude
