# AI Usage Widget — Project brief สำหรับส่งต่อให้ Claude

ตรวจสถานะล่าสุด: 13 กันยายน 2026 · Windows · Asia/Bangkok

## 1. ข้อสรุปก่อนอ่าน

โครงการนี้มี Windows widget แบบ local และ installer อยู่แล้ว ไม่จำเป็นต้องสร้างแอปใหม่เพื่อให้เป็น local แต่ยังไม่จบด้านการเชื่อม Claude และการแจกให้ผู้อื่นติดตั้งได้อย่างเชื่อถือได้

**สถานะที่สำคัญที่สุด:** source ของ Chrome Connector แก้เป็น **2.0.1** แล้ว แต่ release และไฟล์ connector ใน installation directory ยังเป็น **2.0.0**; อย่านำ README ที่อธิบาย source ล่าสุดไปใช้ยืนยันว่ารุ่นที่ติดตั้งแก้บั๊กแล้ว

**ตรวจรอบนี้ไม่พบ `claude-v2.json` และไม่พบ process `AIUsageWidget` ทำงาน** แม้ executable กับ Desktop shortcut ยังมีอยู่; จึงไม่ควรบอกผู้ใช้ว่า widget กำลังทำงานหรือ Claude เชื่อมสำเร็จ

ฝั่ง OpenAI ที่พัฒนาอยู่เป็น **Codex quota ของบัญชีที่ล็อกอินผ่าน Codex** ไม่ใช่โควตาการแชททั่วไปใน ChatGPT; นี่คือความต่างจากคำขอเริ่มต้นที่ต้องอธิบาย ไม่ใช่เปลี่ยนป้ายชื่อให้ดูเหมือนรองรับแล้ว

## 2. ความต้องการของเจ้าของโครงการ

### เป้าหมายเริ่มต้น

- Widget บน Windows Desktop แสดง usage ของแผน Claude และ ChatGPT แบบดูได้รวดเร็ว
- Minimal design: พื้นหลังเข้ม การ์ดเล็ก แถบเปอร์เซ็นต์ เวลาที่จะรีเซ็ต
- ลากไปมุมไหนก็ได้ จำตำแหน่ง และไม่หายไปนอกจอ
- เป็นโปรแกรม `.exe` เปิดด้วย shortcut ไม่ต้องเปิด PowerShell ทิ้งไว้
- ส่งให้คนอื่นนำไปติดตั้งบนเครื่องอื่นได้ โดยเชื่อมบัญชีของแต่ละคน
- ใช้ข้อมูลจริง ห้ามแสดง demo เหมือนเป็นข้อมูลจริง
- เมื่อเชื่อมไม่ได้ ต้องบอกสาเหตุและขั้นตอนแก้ ไม่ปล่อยให้ตัวเลขค้างโดยไม่มีคำเตือน

### ความต้องการเพิ่มเติมล่าสุด

เจ้าของงานถามว่า หากเชื่อมกับ Claude Desktop / Codex / ChatGPT Desktop ในเครื่องโดยตรง จะง่าย เสถียร หรือเร็วกว่า Chrome Connector หรือไม่

ยังไม่ได้ตกลงเปลี่ยน architecture เป็น desktop-only; ต้องพิสูจน์ช่องทางข้อมูลก่อน การมี desktop app ไม่ได้แปลว่า app นั้นเปิด API ให้โปรแกรมภายนอกอ่านโควตา และการเป็น local ไม่ได้ทำให้โควตาบัญชีบนเซิร์ฟเวอร์กลายเป็นข้อมูล offline

## 3. ปัญหาที่เคยเกิดและการเปลี่ยนแปลง

| ปัญหาเดิมจากผู้ใช้ | สิ่งที่ทำแล้ว | สิ่งที่ยังต้องพิสูจน์ |
|---|---|---|
| ตัวอักษรเพี้ยน | เปลี่ยนเป็น WinForms; จัดการ Unicode/UTF-8 และใช้ Segoe UI | ตรวจบนเครื่องใหม่และ DPI/ภาษาที่ต่างกัน |
| เหมือนตำแหน่งถูก fix | ใช้ native drag hit testing, จำตำแหน่ง, clamp กลับหน้าจอ | ลากจริงข้ามจอและถอดจอในเครื่องอื่น |
| ต้องเปิด PowerShell ค้าง | สร้าง GUI `.exe` และ installer | ประสบการณ์ติดตั้ง/เปิดใช้ด้วยตัวเองบนเครื่องใหม่ |
| ตัวเลขไม่ตรง | V2 ไม่อ่าน demo `usage.json`; แยก source/state; ทุกแถบแสดง remaining | Claude end-to-end และการเลือกบัญชี |
| ป้าย ChatGPT ชวนเข้าใจผิด | เปลี่ยนเป็น Codex ตามข้อมูลที่อ่านจริง | ช่องทาง ChatGPT chat quota ยังไม่ถูกทำ |
| Widget หาย/หาไม่เจอ | Tray restore, reopen shortcut คืน instance เดิม, Reset position | รอบนี้ process ไม่ได้รัน; ยังไม่ได้ตรวจสาเหตุว่าปิดไปเมื่อใด |
| Claude ส่งล้มเหลวแล้วค้าง | แก้ acknowledgment และ retry ใน source connector 2.0.1 | ยังไม่ rebuild/install และไม่ผ่านการทดสอบกับ Chrome จริง |

ภาพเดิมที่มีเปอร์เซ็นต์ demo เป็นประวัติปัญหาเท่านั้น ไม่ใช่ข้อมูลบัญชีปัจจุบัน

## 4. โครงสร้างปัจจุบัน

### เทคโนโลยี

- C# / .NET Framework 4.8 / Windows Forms
- คอมไพล์ด้วย compiler ที่มากับ .NET Framework; ไม่ใช้ Electron หรือเว็บเซิร์ฟเวอร์
- Desktop app กับ native host เป็น executable คนละตัว
- Chrome Extension Manifest V3 สำหรับอ่านเฉพาะหน้า Claude Usage
- ใช้ Chrome Native Messaging แทน localhost HTTP bridge ของรุ่นแรก
- ไม่ต้องมี Node.js หรือ .NET SDK เพื่อรัน widget; Node.js ใช้เฉพาะชุดทดสอบ JavaScript
- ยังคงต้องมี Codex app/CLI และลงชื่อเข้าใช้สำหรับฝั่ง Codex

### เส้นทางข้อมูล

```text
Codex account service
    ↕ ผ่าน Codex CLI ที่ลงชื่อเข้าใช้ในเครื่อง
codex app-server → account/rateLimits/read
    → CodexSource.cs → snapshot ในหน่วยความจำ → Codex card

Claude Settings > Usage ใน Chrome ที่ลงชื่อเข้าใช้
    → parser.js + content.js
    → background.js
    → Chrome Native Messaging
    → AIUsageBridge.exe
    → %LOCALAPPDATA%\AIUsageWidget\claude-v2.json
    → Widget อ่านไฟล์ → Claude card
```

ไม่มีเส้นทางเชื่อม Claude Desktop โดยตรงใน code ปัจจุบัน และไม่มีเส้นทางอ่านโควตา ChatGPT chat ทั่วไป

### ความหมายข้อมูล

- `version`: schema version 2 — ไม่ใช่เวอร์ชัน extension
- `provider`: `claude` หรือ `codex`
- `source`: ระบุเส้นทางต้นทางที่ยอมรับเท่านั้น
- `observedAt`: เวลาสังเกตข้อมูล ไม่ใช่เวลาส่งซ้ำ
- `rows`: label, `usedPercent`, reset text หรือ reset epoch
- ค่าแสดงผล = `100 - usedPercent`; ทุกแถบใช้ความหมาย “เหลือ” เหมือนกัน
- ข้อมูลเกิน 3 นาทีเป็น STALE ตาม code ปัจจุบัน
- Codex reset ใช้ epoch ที่ต้นทางคืน; Claude ใช้ข้อความ reset จากหน้าเว็บ ไม่สร้าง countdown เดาเอง
- Claude ไม่ได้เก็บ account ID/profile ID ใน snapshot จึงยังแยกหลายบัญชีไม่ได้

## 5. ตำแหน่งไฟล์และสิ่งที่แต่ละไฟล์ทำ

Project root:

`C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\AI Usage Widget`

| ไฟล์ใต้ project root | หน้าที่ |
|---|---|
| `Widget.cs` | Main, single instance, WinForms UI, drag/tray/position, polling, connection dialogs |
| `Data.cs` | Snapshot validation, used→remaining, freshness, reset formatting, atomic cache write |
| `CodexSource.cs` | หา Codex CLI, JSONL app-server handshake, อ่านและ map quota |
| `NativeHost.cs` | Native Messaging origin check, bounded UTF-8 framing, เขียน Claude snapshot |
| `Setup.cs` | Per-user install, ตรวจ .NET, extract package, registry host, Desktop shortcut |
| `app.manifest` | Windows application manifest |
| `Chrome Connector\manifest.json` | Extension ID/key, permissions, scripts, version |
| `Chrome Connector\parser.js` | อ่านเฉพาะ section usage ที่รู้จัก; ปฏิเสธข้อมูลกำกวม |
| `Chrome Connector\content.js` | อ่าน DOM, fingerprint, timestamp, ส่งข้อมูลและ retry |
| `Chrome Connector\background.js` | ตรวจ sender, ส่ง native host, popup status, background-tab refresh |
| `Chrome Connector\popup.html`, `popup.js` | สถานะเชื่อมต่อ, last delivered, เปิด/refresh Usage, auto-refresh option |
| `Tests.cs` | C# self-tests และ render ภาพ UI ด้วยข้อมูลจำลองแยกจากบัญชี |
| `test-parser.cjs` | Parser regression tests |
| `test-connector.cjs` | จำลอง messaging/DOM/timer เพื่อตรวจ recovery |
| `protocol-test.cjs` | ทดสอบ executable native host ด้วย invalid input; ไม่เขียน snapshot จริง |
| `probe-codex.cjs` | Diagnostic สำหรับ Codex app-server |
| `build.ps1` | Build EXE, bridge, ZIP, installer ลง `release` |
| `verify-and-install.ps1` | Live Codex probe ตามด้วยหยุด widget เป้าหมายและติดตั้งทับรุ่นเดิม |
| `README.md` | อธิบายการใช้และข้อจำกัดของ source ล่าสุด; ไม่ใช่ deployment evidence |
| `AIUsageWidget.ps1`, `run-widget.cmd` | Launcher เก่า; ไม่จำเป็นต้องเปิด console ค้างเพื่อใช้ EXE |
| `usage.json` | Demo legacy ที่ยังมีอยู่ แต่ V2 ไม่อ่าน |

Installation directory ที่มีไฟล์อยู่จริง:

`C:\Users\JIN\AppData\Local\Programs\AIUsageWidget\2.0.0`

State directory:

`C:\Users\JIN\AppData\Local\AIUsageWidget`

- `window.json`: preferences ตำแหน่ง/always-on-top
- `claude-v2.json`: Claude usage cache; **ไม่พบในการตรวจครั้งนี้**
- Codex ปกติอยู่ในหน่วยความจำ ไม่ได้บังคับมี `codex-v2.json`; diagnostic report ใน release เป็นคนละสิ่ง

Backup ก่อนแก้ connector ล่าสุด:

`C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\AI Usage Widget\backups\connector-recovery-20260913`

มีสำเนา connector, README และ release ก่อนแก้; อย่าส่งทั้ง backup/release diagnostics ให้คนอื่นโดยไม่ตรวจข้อมูลบัญชีที่อาจอยู่ในรายงานก่อน

## 6. สถานะที่ตรวจใหม่จริงในวันที่ 13 กันยายน 2026

| รายการ | ผลตรวจ | ความหมาย |
|---|---|---|
| Source connector manifest | 2.0.1 | มี source patch แล้ว |
| Release connector manifest | 2.0.0 | ยังไม่รวม patch |
| Installed-directory connector manifest | 2.0.0 | ไฟล์ที่เตรียมให้ Chrome ใช้ยังเป็นรุ่นเก่า |
| Widget EXE: root / release / installed | SHA-256 ตรงกันทั้งสามไฟล์ | เป็น binary ชุดเดียวกัน; ไม่ยืนยัน version ของ JS ที่ Chrome โหลด |
| Installed EXE | มีอยู่ | การติดตั้งไฟล์เดิมยังอยู่ |
| Desktop shortcut | มีอยู่ | ไม่ได้ตรวจ target ใหม่ในรอบนี้ |
| Process `AIUsageWidget` | ไม่พบ | ขณะตรวจไม่มี widget process ชื่อนี้ทำงาน |
| `claude-v2.json` | ไม่พบ | ไม่มีหลักฐาน current cache ของ Claude ที่ตำแหน่งใช้งานจริง |
| `native-host.json` ใน installed directory | มีอยู่; path/origin ตรงกับตัว host ใน code | มี manifest แต่ไม่ได้แปลว่า Chrome พบ registration |
| HKCU native host key: Registry32/64 | ไม่พบจาก process เครื่องมือตรวจ | ต้องอ่านซ้ำใน user context ที่เปิด Chrome; ยังไม่สรุปว่าหายจากทุก context |
| Chrome โหลด extension ใด/เวอร์ชันใด | ยังไม่ยืนยัน | การมี folder ไม่เท่ากับ Chrome ติดตั้ง extension แล้ว |
| Live Codex quota รอบนี้ | ไม่ได้เรียก | ไม่รายงานเปอร์เซ็นต์เก่าจากแชท |

SHA-256 ของ Widget EXE ที่ตรวจตรงกัน:

`6324F49D3860395A24D1F98CCA78620335D325867685F2A2E9BFB68BA478B1C3`

Native host ที่ code คาดหมาย:

```text
Host name: com.aiusage.widget
Extension ID: nbfbbnnagaajnbhbdljbpncfdgnhfabe
Allowed origin: chrome-extension://nbfbbnnagaajnbhbdljbpncfdgnhfabe/
HKCU\Software\Google\Chrome\NativeMessagingHosts\com.aiusage.widget
Default registry value: absolute path to installed native-host.json
```

Extension ID และ native host name ไม่ใช่ secret แต่ไม่ใช่ระบบป้องกัน malicious local program ทุกชนิด; origin restriction มีไว้จำกัด Chrome caller ตามการลงทะเบียน

## 7. สิ่งที่พัฒนาแล้ว แยกจากสิ่งที่ทดสอบแล้ว

### A. Desktop UI — มี code และ binary แล้ว

- Borderless/minimal dark window, Claude + Codex cards
- Native dragging บนตัว widget และ Ctrl+arrow movement
- Save/restore position, screen bounds clamp, DPI-change handling
- Tray hide/restore, reopen shortcut restore single instance
- เมนู Connect Claude, Refresh Codex, Always on top, Reset position, Connection details, Exit
- แยกสถานะ provider ไม่ให้ Codex เชื่อมแล้วทำให้ Claude ดูเหมือนเชื่อมด้วย
- ยังไม่มี autostart with Windows ใน code ที่ตรวจ
- เป็น floating desktop window ไม่ใช่ Windows Widgets board integration และไม่มีการปักลง desktop layer แบบพิเศษ

### B. Codex — มี integration จริงอยู่แล้ว

- หา `codex.exe` จากตำแหน่งติดตั้งที่กำหนดไว้ก่อน แล้ว fallback ไป PATH
- เปิด app-server ผ่าน stdio แบบไม่แสดง console
- initialize → initialized → account/rateLimits/read
- เลือก `rateLimitsByLimitId.codex` ก่อน legacy bucket; ไม่เดาค่าที่หายเป็นศูนย์
- Poll ทุก 60 วินาที; timeout 20 วินาที; child process ถูกปิดหลังอ่าน
- เคยมีการทดสอบ live ใน session วันที่ 11 กันยายน และมี report อยู่ แต่รอบนี้ไม่ได้อ่านบัญชีสดซ้ำ จึงไม่อ้างตัวเลขเดิมว่าเป็นปัจจุบัน
- ยังไม่รับรองการค้นหา CLI ทุกวิธีติดตั้ง เช่น launcher ที่ไม่ใช่ `codex.exe` หรือการเปลี่ยน package path

### C. Claude connector — implementation มี แต่ end-to-end ยังไม่ผ่าน

- อ่านเฉพาะ `https://claude.ai/settings/usage` และ section ที่มี `Plan usage limits`
- ใช้ English UI; รู้จัก Current session, All models และ Sonnet/Sonnet only
- ค่า usage ต้องมีหน่วย `% used` ตามรูปแบบที่ parser รองรับ
- ไม่อ่านบทสนทนา ไม่อ่าน cookie/token/password
- แถวกำกวม ขาดแถวหลัก หรือเปอร์เซ็นต์ไม่ถูกต้อง → ไม่ส่งค่าเดา
- Auto-refresh หน้า Usage ทุกนาทีเฉพาะแท็บ background; active tab หรือปิด Chrome ไม่ได้รับการ refresh แบบเดียวกัน
- Native host ตรวจ source/schema/ขนาด/UTF-8 ก่อนเขียน cache

### D. Installer — มีตัวติดตั้ง แต่ยังไม่ใช่ release สำหรับคนทั่วไป

- Per-user install ไม่ต้องขอ admin ตามโค้ดปกติ
- ตรวจ .NET Framework 4.8
- สร้าง shortcut และ register native host ทั้ง registry views
- Chrome extension ยังต้อง Load unpacked เอง
- Portable EXE ไม่ทำให้ Claude connector portable ตามอัตโนมัติ; ต้อง register host ในแต่ละเครื่อง/Windows account
- ยังไม่ลงนาม code, ไม่ publish Chrome Web Store, ไม่มี auto-update/uninstaller/rollback transaction ใน installer

## 8. บั๊ก connector ที่แก้แล้วใน SOURCE 2.0.1 แต่ยังไม่ deploy

### สาเหตุเดิม

1. `content.js` บันทึก fingerprint ว่าเคยส่ง ก่อนรู้ว่าตัวรับเขียนข้อมูลสำเร็จหรือไม่
2. `background.js` จับ error จาก native host แล้วไม่ส่งผลล้มเหลวกลับตามจริง
3. Listener ตอบ `{ok:true}` ได้แม้ deliver ล้มเหลว
4. เมื่อข้อมูลบน DOM ไม่เปลี่ยน content script ไม่ส่งข้อมูลเดิมใหม่ ทำให้ดูเหมือนค้างจน reload หน้า

### Patch ปัจจุบัน

- `deliver()` คืน `{ok:true}` เฉพาะเมื่อ native host ยืนยัน; error คืน `{ok:false,error}`
- Content script บันทึก successful fingerprint หลังได้รับ `ok:true` เท่านั้น
- เก็บ pending snapshot และตั้ง retry 30 วินาทีหลังการส่งล้มเหลว
- Retry snapshot เดิมต้องคง `observedAt` เดิม ไม่ทำให้ข้อมูลค้างดูสด
- ป้องกันหลาย delivery พร้อมกันใน content script เดียว
- หลังส่งสำเร็จ re-inspect เผื่อ DOM เปลี่ยนระหว่างรอ
- หยุด retry เมื่อออกจาก Usage หรือไม่พบข้อมูล valid

ข้อจำกัดที่ต้องเข้าใจ: 30 วินาทีคือ retry timer; MutationObserver ยังเรียก inspect ได้ จึงไม่ควรอ้างว่าเป็น global rate limit ที่รับประกันระยะห่างทุก request

**ผลทดสอบ mock ผ่าน ไม่ได้แปลว่า native host registration, Chrome permissions และ DOM จริงผ่านแล้ว**

## 9. ปัญหาค้างที่ต้องแก้ให้ชัด

### P0 — ยังยืนยัน Claude end-to-end ไม่ได้

อาการ: ไม่พบ production cache; รุ่นแก้บั๊กยังไม่อยู่ใน release/installed folder; ไม่ยืนยัน extension ที่ Chrome โหลด; registry key ไม่พบใน process ตรวจล่าสุด

ต้องไล่แยก: Chrome profile/extension ID/version → native host registration ใน Windows user ที่ถูกต้อง → bridge executable → write permission/cache → widget read/render → เทียบ quota บนหน้า Usage สด

ยังระบุ root cause สุดท้ายไม่ได้ ห้ามสรุปว่า parser เป็นสาเหตุเดียวหรือ installer สำเร็จครบวงจรเพียงเพราะมี manifest

### P0 — ขอบเขต ChatGPT กับ Codex ไม่ตรงกัน

สิ่งที่ทำได้ตอนนี้คือ Codex; ถ้าเจ้าของต้องการ ChatGPT chat quota ด้วย ต้องค้นแหล่งข้อมูลที่รองรับแยกต่างหาก ห้ามแทนด้วย API billing, token log, จำนวนข้อความที่นับเอง หรือเปลี่ยนป้าย Codex เป็น ChatGPT

### P1 — ข้อมูลผิดบัญชี/ข้อมูลเก่าหลัง sign-out

Snapshot ไม่มี account/profile identity; หลาย Chrome profiles ใช้ cache path เดียวกันและข้อมูลล่าสุดเขียนทับกันได้

เมื่อ sign-out หรือ parse error connector ส่ง status ไป popup แต่ไม่ส่งสถานะดังกล่าวไป widget โดยตรง; widget อาจแสดงค่าก่อนหน้าเป็น CONNECTED จนพ้น stale threshold แล้วจึงเปลี่ยนเป็น STALE

นี่เป็นข้อจำกัดจาก code ไม่ใช่ผลทดสอบหลายบัญชีจริง; ต้องกำหนดว่าผูกบัญชีเดียวอย่างไร และเมื่อบัญชีเปลี่ยนจะเลิกแสดงข้อมูลเดิมเมื่อใด

### P1 — ความสดยังพึ่งหน้าเว็บ

ปิดแท็บ/Chrome แล้วไม่ refresh; เปิด Usage เป็น active tab ค้างไว้และตัวเลขไม่เปลี่ยนก็ไม่ renew freshness โดยตั้งใจ

Timestamp เป็นเวลาอ่านหน้า ไม่ใช่หลักฐานว่า backend อัปเดตแล้ว; หน้า reload และได้ DOM เก่าก็ยังต้องพิจารณาความหมายนี้

ต้องอธิบายว่า “live” มีเงื่อนไข หรือหาวิธีข้อมูลที่เจ้าของบริการรองรับจริงแทน ไม่แก้ด้วยการอัปเดต timestamp เฉย ๆ

### P1 — Diagnostic แยกคนละที่

Popup รู้ native-host error แต่ desktop card ไม่รู้สาเหตุเดียวกันทันที; ข้อความใน README จึงกว้างกว่าสิ่งที่ widget เองแจ้งได้

ควรทำให้ผู้ใช้เห็นขั้นตอนแก้ที่ตรงจุด และยังต้องไม่แนบ credential/raw private logs ไปใน diagnostic

### P1 — Deployment verification ยังมีช่องว่าง

`verify-and-install.ps1` ตรวจ binary hash และอ่าน native-host.json แต่ไม่ได้อ่านกลับ HKCU key เพื่อพิสูจน์ว่า Chrome user context พบ registration จริง

สคริปต์นี้ยังผูกการติดตั้งกับ Codex live probe: ถ้า Codex ไม่พร้อมจะไม่ติดตั้งต่อ ซึ่งอาจไม่เหมาะกับคนที่ต้องการใช้ Claude อย่างเดียว

อย่ารันสคริปต์นี้โดยเข้าใจว่าเป็น read-only test: มันหยุด widget เป้าหมายและติดตั้งทับไฟล์

### P2 — ยังไม่พร้อมรองรับเครื่องทั่วไป

ยังไม่ตรวจ clean machine, Windows account ใหม่, DPI จริงหลายจอ, ARM hardware, sleep/resume, browser profile separation, long-running recovery และ installation rollback

ไม่มี uninstaller, autostart option, signed package หรือ public extension distribution; ไม่ควรใช้คำว่า “ทุกเครื่อง” หรือ “แก้ถาวรไม่มีวันพัง”

### เครื่องมือตรวจ UI ถูกหยุด — ไม่ใช่หลักฐานว่า widget เสีย

Computer Use หยุดด้วยข้อความ:

> Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.

จึงหยุด automation ตามข้อจำกัดเครื่องมือ ไม่ได้บังคับข้ามการตรวจ URL หรือแก้ security settings; ผลคือขั้นติดตั้ง/ตรวจ Chrome จริงยังค้าง ไม่ใช่เหตุผลพอที่จะย้าย architecture ทั้งหมด

## 10. ผลทดสอบและขอบเขตหลักฐาน

### รันซ้ำในรอบจัดทำเอกสารนี้: PASS

- `node --check` สำหรับ content.js, background.js, parser.js และ test-connector.cjs
- `node test-parser.cjs`: zero usage, แยก boost percentage, row/reset boundaries, missing/ambiguous data, ไม่อ่าน chat text
- `node test-connector.cjs`: failure/rejected/missing ACK, retry โดยไม่ต้องมี DOM change, timestamp เดิม, single-flight, page changes ระหว่างส่ง, sign-out/navigation stop, ตรวจ sender scope
- `node protocol-test.cjs`: compiled bridge ปฏิเสธ invalid payload/wrong extension origin และ response framing ถูกต้อง; ไม่ทดสอบ success write ไป production cache

### มีหลักฐานทดสอบเดิม แต่ไม่ได้รันใหม่ครั้งนี้

- `release\test-results.txt`: PASS ของ C# validation, used→remaining, stale, bucket mapping, UTF-8 frame, native drag hit test, monitor clamp, rendered UI states
- ภาพ render เป็น fixture จำลอง ไม่ใช่ screenshot ของข้อมูลบัญชีจริง
- Live Codex เคยผ่านใน session ก่อน; ไม่รับรองสถานะ login/เปอร์เซ็นต์ปัจจุบันจากหลักฐานเดิม
- Single-instance restore เคยตรวจใน session ก่อน; รอบนี้ไม่ได้เปิดโปรแกรมทดสอบซ้ำ

### ยังไม่มีหลักฐานผ่าน

- Claude Usage จริง → extension จริง → host จริง → cache → widget เทียบตรงกัน
- Fresh live Codex test รอบวันที่จัดทำเอกสาร
- Chrome installation/profile/account selection ที่ใช้อยู่จริง
- Clean-machine / machine-to-machine test
- เปรียบเทียบ latency/resource usage ระหว่าง browser connector กับ desktop integration

## 11. แผนดำเนินโครงการต่อและเกณฑ์จบแต่ละช่วง

| ช่วง | งาน | เกณฑ์ผ่าน |
|---|---|---|
| A — ยืนยันขอบเขต | ระบุ Claude + Codex หรือเพิ่ม ChatGPT chat quota แยก; นิยาม fresh/stale/account | ชื่อการ์ดและแหล่งข้อมูลตรงกับสิ่งที่วัด ไม่มีการใช้ quota คนละประเภทแทนกัน |
| B — ตรวจทางเลือก Claude | ตรวจ documented API/CLI/SDK/desktop integration ที่อ่าน subscription quota; แยก official/unsupported/ไม่ทราบ | มีหลักฐานเรียกใช้งานจริงโดยไม่ต้องคัดลอก secret; ถ้ายังไม่มีให้คง Chrome route เป็น baseline |
| C — ปิด deployment gap | สำรอง build artifacts, rebuild source 2.0.1, ตรวจ version ใน ZIP/installed folder และ registration ใน user context | Chrome โหลด extension ID/version ที่ถูกต้องและเรียก host ได้ |
| D — Claude end-to-end | อ่านหน้า Usage สด เทียบ snapshot และ Connection details โดยไม่ส่ง prompt ที่สิ้นเปลืองโควตา | ค่า used/remaining และ reset ตรงต้นทาง, schema valid, timestamp มีที่มา |
| E — Recovery/account correctness | ทดสอบ disconnect/reconnect, sign-out, profile switch, native-host failure, malformed DOM, closed tab | ไม่แสดงบัญชีเก่าเหมือนข้อมูลใหม่, แจ้ง disconnected/stale/error ตามจริง, recovery ไม่ต้อง restart ทุกชิ้น |
| F — UX/desktop | ตรวจ shortcut, tray, drag, position restore, DPI, unplug monitor, sleep/resume; ออกแบบ diagnostic ที่ผู้ใช้แก้เองได้ | ผู้ใช้เปิด/หา/เชื่อม/กู้ widget ได้โดยไม่เปิด PowerShell |
| G — Compatibility/release | Windows account ใหม่และเครื่องอื่น; ตรวจ prerequisites, CLI detection, install/update/uninstall/rollback | ระบุ support matrix ตามผลทดสอบจริง ไม่ใช่ตามความคาดหวัง |
| H — แจกทั่วไป | เตรียม signing, Chrome Web Store และคู่มือ privacy/permissions เมื่อจะเผยแพร่ | เจ้าของอนุมัติการเผยแพร่/ค่าใช้จ่าย และ installation experience ผ่าน |

ไม่จำเป็นต้องทำ backend, cloud database, Electron migration หรือ framework ใหม่ก่อนพิสูจน์ช่องทาง Claude; ให้แก้จากโค้ดเดิมเฉพาะจุด

## 12. คำถามที่ต้องการให้ Claude ตอบโดยตรง

1. Claude Desktop หรือ Claude Code มี documented interface ใดให้ third-party local app อ่าน current session/weekly subscription quota และ reset time ได้จริงบ้าง? ขอชื่อ method, schema, auth requirements และเอกสารต้นทาง
2. หากไม่มี interface ที่รองรับ ควรคง Chrome Native Messaging หรือมีทางเลือกที่เล็กและเสถียรกว่า? กรุณาแยก “ทำได้ทางเทคนิค” ออกจาก “รองรับอย่างเป็นทางการ”
3. ถ้าเสนอ MCP/desktop extension โปรดอธิบายว่า quota มาจากไหนจริง ไม่ใช่เพียงเชื่อมเครื่องมือให้ Claude เรียกได้แล้วสรุปว่าอ่าน internal account quota ได้
4. หากเสนอ local logs โปรดพิสูจน์ว่าข้อมูลครอบคลุม quota ทั้งบัญชีและการใช้บนอุปกรณ์อื่น; token totals ของเครื่องเดียวใช้แทน subscription remaining ไม่ได้โดยไม่มีหลักฐาน
5. การเชื่อมโดยไม่พึ่ง Chrome ต้องอ่าน/คัดลอก OAuth token, browser cookie หรือ internal credential หรือไม่? หากต้องใช้ ให้เสนอ supported consent flow ก่อน ห้ามดึง secret อัตโนมัติ
6. Patch 2.0.1 มีช่องโหว่ด้าน retry, async ordering, stale data, timer/background throttling หรือ account switch อย่างไร? แยก code finding ที่ยืนยันได้จากสมมติฐานที่ต้องทดสอบ
7. จะแก้ให้ widget รับสถานะ sign-out/native-host failure ได้อย่างตรงไปตรงมาโดยไม่เพิ่มโครงสร้างเกินจำเป็นอย่างไร?
8. จะแก้การติดตั้งให้ตรวจ registry ทั้งสอง views ใน Windows user ที่ Chrome ใช้จริง และไม่บังคับมี Codex สำหรับ Claude-only user อย่างไร?
9. หากต้องรองรับ ChatGPT chat quota นอกเหนือ Codex มีแหล่งที่รองรับใด? ถ้าไม่พบให้ระบุว่าไม่พบ ไม่ใช้ Codex/API billing มาทดแทน
10. Minimum reliable release ต้องผ่าน test matrix อะไร และข้อใดต้องมีเจ้าของกด login/install/permission เอง?

## 13. Prompt พร้อมส่งให้ Claude

> ช่วย review และวางแผนปิดโครงการ AI Usage Widget ตามเอกสารนี้ โดยเริ่มจากอ่าน source ปัจจุบันถ้าคุณเข้าถึงไฟล์ได้ อย่าสร้างแอปคู่ขนานหรือเปลี่ยน framework ก่อนพิสูจน์ความจำเป็น
>
> เป้าหมายคือ Windows local widget ที่ลาก/จำตำแหน่งได้ ไม่ต้องเปิด PowerShell ใช้ข้อมูลจริงและนำไปใช้บนเครื่องอื่นได้ ปัจจุบันเป็น WinForms + Codex app-server + Chrome Native Messaging สำหรับ Claude แต่ยังไม่จบ Claude end-to-end
>
> จุดสำคัญ: source connector 2.0.1 แก้ ACK/retry แล้วและ mock tests ผ่าน แต่ release/installed files ยังเป็น 2.0.0; ตรวจล่าสุดไม่พบ Claude cache และไม่พบ native-host registry key จาก context ของเครื่องมือตรวจ จึงต้องตรวจ user context จริงก่อนสรุปสาเหตุ ฝั่ง OpenAI วัด Codex ไม่ใช่ ChatGPT chat quota
>
> ขอให้ตอบก่อนว่า (1) root cause ที่มีหลักฐานกับสมมติฐานแยกกันคืออะไร (2) มีช่องทาง Claude Desktop/Claude Code ที่รองรับให้โปรแกรมภายนอกอ่าน subscription quota จริงหรือไม่ พร้อมเอกสาร (3) ควรคง Chrome route หรือเปลี่ยน และเพราะอะไร (4) targeted patch และ end-to-end test ขั้นต่ำมีอะไรบ้าง (5) มีขั้นตอนไหนต้องให้ผมทำเอง
>
> อย่าอ้างว่าเชื่อมได้เพียงเพราะมี MCP หรือเปิด desktop app อยู่ อย่านำ demo/local token logs/API billing มาแทน plan quota และอย่าดึง cookie/token/password โดยไม่ได้ตกลงช่องทางและสิทธิ์กันก่อน ถ้าเข้าถึงไฟล์ไม่ได้ ให้บอกว่าต้องการไฟล์ใด ห้ามอ้างว่าอ่านหรือทดสอบแล้ว
>
> รอบแรกขอ diagnosis และแผนก่อนแก้โค้ด ไม่เผยแพร่โปรแกรมหรือ extension ไม่เปลี่ยน security settings ไม่ลบไฟล์ และไม่แสดงค่า usage เก่าจากแชทเหมือนเป็นค่าปัจจุบัน

## 14. วิธีส่งเอกสารและชุดไฟล์ขั้นต่ำ

ใน Claude เปิดแชทใหม่ → คลิก **+** ข้างช่องข้อความ → เลือกเมนูแนบไฟล์ที่แอปแสดง → เลือก `AI-USAGE-WIDGET_CLAUDE-BRIEF_2026-09-13.md` → วาง prompt ใน §13 → ส่ง

ถ้า Claude ไม่มีสิทธิ์อ่าน workspace ให้แนบเพิ่มจาก project root:

- `README.md`, `Widget.cs`, `Data.cs`, `CodexSource.cs`, `NativeHost.cs`, `Setup.cs`
- `Chrome Connector\manifest.json`, `parser.js`, `content.js`, `background.js`, `popup.js`, `popup.html`
- `test-parser.cjs`, `test-connector.cjs`, `protocol-test.cjs`, `Tests.cs`, `build.ps1`, `verify-and-install.ps1`

ไม่ต้องแนบ browser profile, session cookies, credential files หรือ account diagnostic JSON เพื่อเริ่ม review; ไม่ต้องส่งทั้ง workspace ร้านค้า

ถ้า Claude มี filesystem access อยู่แล้ว ให้เริ่มที่ project root ที่ระบุใน §5 และอ่านกฎ workspace ก่อนทำงาน

## 15. คำสั่งตรวจที่มีอยู่ — สำหรับผู้รับงานที่รันบนเครื่องได้

คำสั่งต่อไปนี้เป็น syntax/mock/invalid-payload tests ไม่มีการเขียน Claude production snapshot:

```powershell
Set-Location -LiteralPath 'C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\AI Usage Widget'
node --check 'Chrome Connector/content.js'
node --check 'Chrome Connector/background.js'
node --check 'Chrome Connector/parser.js'
node --check test-connector.cjs
node test-parser.cjs
node test-connector.cjs
node protocol-test.cjs
```

**คำเตือน: `build.ps1` เขียนทับ release และ `verify-and-install.ps1` หยุด widget เป้าหมาย/ติดตั้งทับไฟล์/แก้ registry และ shortcut — ต้องสำรอง, dry-run/log และยืนยันก่อนรัน ไม่ใช่คำสั่งอ่านสถานะอย่างเดียว**

`--self-test <report-path>` เขียนรายงานและภาพ fixture; `--probe-codex <report-path>` อ่านบัญชีจริงแล้วเขียน diagnostic JSON ต้องเลือก path ใหม่และระวังการนำรายงานไปแชร์

## 16. เอกสารอ้างอิงสำหรับตรวจต่อ

- Codex App Server: https://developers.openai.com/codex/app-server (redirect ไป https://learn.chatgpt.com/docs/app-server)
- Claude usage/length limits: https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- Chrome extension distribution: https://developer.chrome.com/docs/extensions/how-to/distribute

เอกสารเหล่านี้เคยตรวจใน session วันที่ 13 กันยายน; ให้ Claude เปิดตรวจฉบับปัจจุบันอีกครั้งก่อนใช้ตัดสินใจเรื่อง interface/policy การมี link ไม่ได้ยืนยันว่า Claude Desktop เปิด quota API ให้ third party

## 17. ขอบเขตการจัดทำ brief นี้

อ่าน source, ตรวจ file/version/hash/process/registry ในบริบทเครื่องมือ และรัน syntax/parser/connector/protocol tests ซ้ำเท่านั้น ไม่ได้ build/install/open widget ไม่ได้ติดตั้ง extension ไม่ได้เรียก live quota ใหม่ และไม่ได้แก้โค้ดโปรแกรมในรอบจัดทำเอกสารนี้

บริบท workspace สาย B: master §§2, 5.1, 6, 9; ponytail full; targeted edits; backup/dry-run/log ก่อนเปลี่ยนข้อมูล; ไม่ลบไฟล์จริง; ไม่แตะข้อมูลร้านค้า, Sheets หรือ R2 ในงาน widget นี้
