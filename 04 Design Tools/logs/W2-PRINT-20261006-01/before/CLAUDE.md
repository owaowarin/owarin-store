# OWARIN STORE — กฎถาวรสำหรับ Claude

## วันที่

- ห้ามใช้วันที่จากความจำของโมเดล ทุกครั้งที่จะเขียนวันที่ลงไฟล์ ต้องรัน
  `Get-Date -Format 'yyyy-MM-dd (dddd)'` ก่อน แล้วใช้ค่าที่ได้
- เอกสารทุกฉบับใช้วันที่แบบ ISO (2026-09-12) และ ค.ศ. เสมอ ห้ามปน พ.ศ.
- ไฟล์สรุป/รายงานต้องมีบรรทัด "จัดทำ: <วันที่จากเครื่อง>" ที่หัวไฟล์
- เลขอายุไฟล์ ("เก่าไป N วัน") คำนวณจากวันที่เครื่อง ณ ตอนเขียน และเขียนกำกับว่านับจากวันไหน

## การทำงาน

- แก้แบบ targeted ห้ามเขียนไฟล์ใหม่ทั้งไฟล์เพื่อแก้จุดเดียว
- อ่านไฟล์จริงก่อนสรุปเสมอ ห้ามเดาจากชื่อไฟล์
- อ่านแบบประหยัด: ดูชื่อ+ขนาด+วันที่ก่อน อ่านเต็มเฉพาะที่จำเป็น ไฟล์เกิน 50 KB ใช้ grep หาหัวข้อ
- ไฟล์อยู่บน OneDrive เขียนเสร็จต้องอ่านกลับมายืนยันทุกครั้ง
- ก่อนลบหรือเขียนทับ ต้องเตือนเป็นบรรทัดแรก
- **ทุกงานที่แก้ เพิ่ม ลบ ย้าย หรืออัปโหลดข้อมูล ต้องเขียน log CSV ลง `04 Design Tools/logs/` ทุกครั้ง**
  ทั้งรอบ dry-run และรอบ commit · คอลัมน์อย่างน้อย: ต้นทาง → ปลายทาง, ก่อน → หลัง
  **ไม่มี log = ถือว่างานยังไม่เสร็จ**
- **Issue and model handoff rule (owner decision 2026-10-03):** Record every issue, failed attempt, fix, retry, result, and recovery reference in the task CSV and Implementation log. If GPT-5.6 Sol / High cannot resolve a reproducible issue, record the remaining problem and exact revision, then hand the repair to GPT-6 Astra / High. Do not claim a switch or create an agent/chat automatically; keep one writer per change.
- การตัดสินใจของเจ้าของงานที่ปิดแล้ว ให้บันทึกลง `04 Design Tools/logs/decisions_<วันที่>.csv`
  และลงเอกสารที่เกี่ยวข้องทันทีในรอบเดียวกัน
- **อ่าน `decisions_*.csv` ทุกไฟล์ก่อนเสนอทางเลือกใด ๆ** ถ้าเรื่องนั้นมีสถานะ CLOSED อยู่แล้ว
  ห้ามเสนอทางเลือกอื่นและห้ามถามทวน
- จบทุกรอบงานต้อง append หัวข้อลง `00 Docs/HANDOFF_<วันที่>.md` (สั้น ไม่เกินหนึ่งหน้า รายละเอียดยาวไปไว้ใน log) และอัปเดตเอกสารที่เกี่ยวข้องในรอบเดียวกัน

## Delivery priorities and lessons — owner update 2026-10-03

- Apply the six ordered priorities in master §5.2.1; AGENTS is the router. For this project keep one writer and no new agents/chats unless explicitly authorized separately.
- When the owner asks for progress, report delivered user actions, verified environment/revision and remaining outcomes; do not equate code edits or documentation volume with a completed workflow.
- When an old plan/prompt says a completed phase is unstarted, update active guidance from dated evidence; preserve historical logs and do not rerun the old phase merely to match stale wording.
- When a relevant gate has passed and the next edit adds no related risk, proceed; rerun checks only for affected behavior or a required release gate. Never omit stock/money failure/retry tests to save effort.
- When a business rule is closed (Shipping Cost=subsidy, Auction unavailable, CLIENT reuse), propagate it to schema/UI/test contracts in the same pass; do not ask the owner again.
- Keep current status in STATE, requirements/priorities/QA in PLAN, operational steps in HANDBOOK, and detailed attempts/results/recovery in the task CSV plus a linked Implementation summary. Update only affected references; no repeated full reports.

## Session-close checklist — MANDATORY every session, every time (added 2026-10-02)

"Done" means all of these are done in the same pass. A task with any unticked item is NOT finished; say which one is missing instead of closing the task.
1. **Log CSV** in `04 Design Tools/logs/` for every edit / upload / delete / move / deploy / trigger change (source → destination, before → after). Name: `<task>_<YYYYMMDD>.csv`.
2. **Decisions** the owner closed → `decisions_<date>.csv` (CLOSED/OPEN rows). Read all `decisions_*.csv` before proposing options.
3. **Plan board** (the plan file's status table): tick the step, add the evidence (file, byte size, row count, screenshot).
4. **STATE.md** overwritten (≤ 80 lines): per stream = status, ONE next step, pointers.
5. **HANDOFF** `00 Docs/HANDOFF_<date>.md`: one page (done / state / decisions / next step / risks). Detail goes in the log, not here.
6. **Related files in the same pass**: README tables, CLAUDE.md / AGENTS.md rules, version pairs (`Code_vNN` + `WebApp_vNN`, previous pair → `backup/` + stub), tests re-pointed to the live version.
7. **Rules**: if the session taught a new rule or invalidated one, edit CLAUDE.md / AGENTS.md now, in English, dated.
8. **Verify** by reading back the changed artifact. For a docs-only change check files/links/history/source hashes; do not re-open live services just to close the checklist. Before a live action or fresh live claim re-read that service; date historical evidence explicitly.
9. **Live-system actions** (Apps Script, Sheet, Meta) are recorded with time + result: who clicked, what was observed.

## Apps Script integrity hashes (added 2026-10-05)

For new request or proof hashes containing user text, pass `Utilities.Charset.UTF_8` explicitly to `Utilities.computeDigest`. The default charset in the isolated test project replaced Thai characters with `?`, causing both a false journal-proof mismatch and colliding payload hashes. Never rewrite historical hashes/events; keep a versioned legacy verifier and compare the exact original payload on same-ID replay. Test two distinct Unicode payloads and an old unfinished request before accepting a hash migration.

## Browser / Apps Script editor safety (added 2026-10-02)

- In the Apps Script code editor never press keys (Enter, typing, shortcuts) unless the cursor is deliberately placed there; a stray click + Enter edits live code (happened 2026-10-02, undone before saving). Select functions only by clicking the dropdown option, and confirm the dropdown is open (screenshot) before clicking an item.
- After any editor session confirm the title bar reads "Saved to Drive" with no unsaved edit, and that line 2 still shows the intended `Code.gs vNN` header.
- Google's OAuth consent window opens as a separate Chrome window the browser tool cannot see: the owner clicks Allow.

## STATE.md — read first, token-saving rules (added 2026-10-01)

- Read `00 Docs/STATE.md` FIRST in every session; open any other file only when a STATE.md line points to it. Do not browse the folder.
- At the end of every session OVERWRITE `00 Docs/STATE.md` (never append; keep it under 80 lines): per stream = current status, ONE next step, closed decisions, pointers to detail files.
- Before starting work in a project folder, archive superseded material (old handoffs, closed plans) into `_archive/` by move, never delete; STATE.md lists what is pending.
- Dated HANDOFF/IMPLEMENTATION logs are evidence for lookup only; read just the last section when STATE.md points to them.

## รูปสินค้า / คลังรูป

- กฎคลังรูปทั้งหมดอยู่ที่ `00 Docs/IMAGE-LIBRARY-RULES.md` อ่านก่อนแตะไฟล์รูปทุกครั้ง
- ชื่อไฟล์/โฟลเดอร์ต้องตรงกับคอลัมน์ `Item name` ในชีตแบบตรงตัวอักษรต่ออักษร
  ห้ามแปลงอักขระเต็มความกว้าง `：／×⨯・｜` เป็น ASCII
- จัดรูปด้วย `04 Design Tools/new-arrivals-to-folders.ps1` เท่านั้น
  **ต้อง dry-run ดูตารางก่อนเสมอ** ห้ามเขียนทับไฟล์ปลายทางทุกกรณี

## เครื่องมือ/สคริปต์

- งานตรวจที่ต้องรันซ้ำได้ ให้เขียนเป็นไฟล์สคริปต์ใน `04 Design Tools/` แล้วเรียกด้วย argument
  ห้ามเขียน `python3 -c` / `powershell -Command` แบบ inline ยาว ๆ เพราะ whitelist ไม่ได้ ต้องกดอนุมัติทุกครั้ง
- ห้ามกดเมนู **"🔄 Rebuild ALL Product IDs"** (`forceRegenerateAllSKUs`) เด็ดขาดทุกกรณี ใช้ได้แค่
  **"🆕 Fill missing Product IDs (safe)"** (`regenerateAllSKUs`)
- แก้ Product ID ให้พิมพ์ทับคอลัมน์ B ตรง ๆ ห้ามแก้ Publisher/Item name/Condition เพื่อหวังให้ onEdit คำนวณให้
  (แถวที่ไม่มีพี่น้อง RESTOCK ร่วม base title จะได้เลข 3 หลักใหม่ทันทีจาก `_buildSKU` ไม่ใช่เลขเดิม)

## Meta feed / R2 image publish chain (v27, 2026-09-25 — replaces the earlier chain)

New arrival or edited product:
1. Edit the row in GAME GUIDE BOOKS or MAGAZINE as usual — if Product ID changes, a toast confirms it was logged in the **PID CHANGES** tab; nothing else to do.
2. Sort photos with `new-arrivals-to-folders.ps1` (unchanged).
3. PowerShell at `04 Design Tools`: `.\upload-missing-r2.ps1` (dry-run) → `.\upload-missing-r2.ps1 -Commit` — finishes the whole R2 side in one command; the last line must read `read-back identical: True`.
4. **Automatic since 2026-10-02 (Code v28):** a nightly Apps Script trigger runs `refreshMetaFeedAuto` between 04:00 and 05:00 (Asia/Bangkok), before Meta's ~05:50 pull. Check the **REFRESH LOG** tab: the newest row must be `OK` (Ready = Instock count). `GUARD` = Ready fell below 80% of the current META EXPORT (tab left untouched), `ERROR` / `BUSY` = failed; each of these also sends an e-mail. Manual click is only for same-day changes: **📦 Inventory Tools → 🚀 Refresh Meta feed** — the popup's first line must read `✅ Every Instock product is in the feed (N)`; a `⚠️ … NOT in the feed` line names which product and what to fix.
5. Meta pulls the published feed on its own (~05:50 Bangkok, daily).

Sold: change Status to Sold → it leaves the feed at the next nightly refresh (or click **🚀 Refresh Meta feed** for same-day) — Meta then removes it automatically at its pull.

**Single-catalogue rule (decided 2026-10-02):** keep exactly ONE Meta catalogue — currently `OWARIN STORE` (1993212747992458, feed 1048143251023664). Facebook requires the commerce account (`OWA — OWARIN's STORE`, 1342667447501637) to keep at least one catalogue, so the last catalogue cannot be deleted (Meta greys it out). Routine updates go through the existing daily feed; never create a second catalogue for them. Only when a catalogue truly must be replaced: (1) create the new one with its creation date (YYYY-MM-DD) in the name; (2) recreate its feed from META EXPORT (gid 355347627) with the daily 06:00 REPLACE schedule; (3) connect it to the commerce account and re-point any ads / product sets; (4) verify the first pull (detected = persisted, 0 invalid); (5) only then delete the old catalogue. Log every step. Any new feed or manual upload also carries its date in its name.

**Feed content rules (Code v30, 2026-10-02):** (1) Identical copies are listed ONCE: same base title + Publisher + Original (cover price) + Condition + Copy Flags → one row (first complete copy), `quantity_to_sell_on_facebook` = number of copies; any difference in those fields = separate rows. When the listed copy sells, the next one takes over at the next refresh. (2) Titles never carry `(RESTOCK-NN)` (stripped at the v20b write and again at export). (3) A title with no lowercase Latin letter is exported Capitalised (GAMEMAG → Gamemag; PS2/RPG/VII untouched); the sheet name is not changed. (4) FB CATALOGUE `Price` / `Description` columns ARE the Meta price/description fields by design (header match is case-insensitive); the `price (Meta format)` columns are legacy and unused. The 80% drop guard compares rows, so a change that merges many copies must be checked against it (first v30 run: 1,337 → 1,162 expected, guard minimum 1,070).

PID changes are logged in **PID CHANGES**; never delete that tab. Orphaned FB CATALOGUE rows (old PID no longer in inventory) are auto-archived to **FB CATALOGUE ARCHIVE**; never delete that tab either. Plan: `00 Docs/PLAN-META-PIPELINE-HARDENING_2026-09-25.md`.


## Session41 lessons — 2026-10-04

- google.script.run may reorder object keys; exact-payload hash recovery must use stored original intent server-side, owner-only and ID-only, with durable client recovery mode. Never substitute a normalized payload/hash.
- Read mutable transaction/journal/capacity metadata only after acquiring its shared lock, including recovery and QA helpers. Duplicate isolated helper executions are real evidence; server cache mechanism remains inference until native proof establishes it.
- A rejected reconciliation hash is a stop before writes. Compare fresh native values with export, diagnose server hash/serialization, preserve every original event/position, and append explicit proven gap notes only. Never skip blank journal rows to declare success.


## Monetary readback (added 2026-10-05, R7)

For cent-valued W1 totals use integer-cent addition. Keep the exact formula and typed finite-number guard, with a tightly bounded tolerance only for floating representation noise; reject one-cent discrepancies and preserve historical intent/hash. Verify actual Apps Script getValues before attributing a rounded XLSX cache difference to the transaction engine: export and native values can differ even when native equals V8. A cent-readback mock is a compatibility test, not evidence of a native failure. Exercise affected legacy/fixed-ID retry paths and an actual isolated decimal flow before sign-off.

## CLIENT / label native verification lessons (added 2026-10-06)

- Do not trust a mock or RichText API to preserve identifiers or literal formula prefixes. Native Sheets coerced zero-prefixed phone/postal code and evaluated an equal prefix. For CLIENT writes use escaped plain-text values and require exact typed value plus empty-formula readback, including after-effect retry. Retain observed before values/formulas and original durable intent; never silently repair an unknown row or rewrite old events.
- Apps Script HTML partials must be valid HTML. For shared JavaScript use a valid script wrapper with bounded include extraction. Source transfers must compare the complete saved bytes/LF hashes, not a truncated DOM read; test generated child print-document JavaScript as well as its outer template.
- Keep W2 browser recovery records to Request IDs, not customer contact payloads. A CLIENT failure after sale is a separate original-intent retry. Preserve SOLD and the committed recipient; never create a second sale to repair a customer record.
- Guard shared async Orders/search results with a request generation; clear old actionable cards while loading and discard stale successes/errors.
- READY preview and a print invocation do not prove exported PDF page size or physical output. Record the browser/driver limitation and keep that gate OPEN until actual PDF/printer evidence is inspected. Do not rerun transactions or fixtures to test printing.

## Print environment distinction (added 2026-10-06)

An empty IAB native-app inventory does not prove the Windows computer-use plugin is unavailable: its list_apps/list_windows may still work. Check the purpose-built plugin before making that claim. If its browser URL verification stops capture, stop UI inputs for that turn; do not bypass it or repeat the unchanged attempt without a changed verified target. A separate browser connection may be unavailable even while Chrome is running. Missing browser/printer access is an environment issue; a larger model, duplicate renderer or fabricated substitute PDF cannot close native print acceptance.

## Owner-deferred verification (added 2026-10-06)

An explicit owner deferral changes scheduling, not evidence. Mark deferred PDF/physical Print-Reprint as untested, never PASS or fully accepted. Continue independent authorized local/test work and retain the gap in STATE/PLAN/release checklist; do not repeatedly block that work on printer/browser setup. Keep money, stock, access and recovery validation intact. Deferral alone does not authorize production, migration of real CLIENT data or a release waiver.

## Migration and fresh replay evidence (added 2026-10-06)

For legacy CLIENT migration, prove original A:F values/formulas remain intact and original allocated IDs/revision survive retry; do not infer or repair legacy leading zeroes. The existing isolated schema request is fixed and DONE: never replace its eight-column CLIENT with a new six-column fixture. W2_SCHEMA recovers with its original helper, not generic UI requests.resume. Before native replay, export fresh and reconcile every delta against durable intent; enumerate actual DONE requests instead of assuming historical counts/revisions. A cleared QA textarea must receive a new response before parsing/claiming proof. Local VM checks, native DONE replay and full native UI/migration are distinct acceptance gates.

## Native legacy migration fixture and UI acceptance (added 2026-10-06)

Keep existing eight-column CLIENT and its DONE schema request intact. Test actual helper migration on separately named native fixture/client-journal tabs through a QA-only execution-local adapter with actual owner/Sheet-ID/lock checks and finally-restored service binding; never include the adapter in candidate/production. Export before/after, compare original A:F values AND formulas and every original table, and prove after-effect retry keeps originally allocated IDs/revision. Count nonblank client identities separately from blank append capacity; preserve blank rows rather than assuming contiguous data. Distinguish journal Event ID/Request ID using authoritative headers. Avoid naming Python diagnostics inspect.py (stdlib collision). Clear transfer textareas before AX dumps and show only capture result, never giant source/base64. Full two-channel UI/native migration acceptance still does not prove PDF/physical printing.
