# PLAN — nightly auto-run of 🚀 Refresh Meta feed (Apps Script time trigger)

จัดทำ: 2026-10-02 (Friday) · Stream B · Sonnet (plan only — NO code, Sheet, Meta or trigger was changed)
Status: **A0–A4 DONE 2026-10-02 (v28 live, first manual run OK, trigger installed). Only A5 (next-morning verification) remains.**
Builds on: `PLAN-META-PIPELINE-HARDENING_2026-09-25.md` (v27 live), `STATE.md` stream 2 item (a).
Evidence read 2026-10-02 in `03 Apps Script/Web App/Code_v27.gs` (166,437 bytes): `refreshMetaFeed` L2687, `buildFbCatalogue` L2694, `exportMetaCsv` L3092, `_withLock` L249, `onOpen` L3469.

## 0. Status board — the ONLY place to tick progress
| Step | What | Who | Status | Evidence |
|---|---|---|---|---|
| A0 | OWARI decides D-A..D-C (§3) and says "go" | OWARI | DONE 2026-10-02 | `decisions_20261002b.csv` (D-A/B/C) |
| A1 | Write Code_v28 (+ paired WebApp_v26 stub bump) with the 4 edits of §2; node tests incl. mutation checks | Sonnet · medium | DONE 2026-10-02 | `Code_v28.gs` 170,668 B; meta-pipeline/fb-catalogue/image-url tests pass; 5 of 6 mutations killed (survivor: `setActiveSheet` skip in headless — mock no-op, harmless); `metaauto_a1_20261002.csv` |
| A2 | Deploy v28 to live Apps Script (hash-guarded, same route as v27 S1) | Sonnet via Chrome / OWARI pastes | DONE 2026-10-02 (owner pasted v28 + saved; header read as v28 in editor) | `metaauto_a2_deploy_<ts>.csv` |
| A3 | Manual run of `refreshMetaFeedAuto` from the editor; check REFRESH LOG row, META EXPORT count, run time | OWARI clicks, Sonnet reads | DONE 2026-10-02 02:10 — Run OK in 24 s; REFRESH LOG row: OK, Ready 1337, Wrong status 1128, Incomplete 0, no error; MailApp authorised | `metaauto_a3_<ts>.csv` |
| A4 | Install the trigger (`installMetaRefreshTrigger`) + set failure e-mail | OWARI clicks | DONE 2026-10-02 02:12 — trigger refreshMetaFeedAuto, Day timer 4am–5am GMT+07:00, failure notification = Notify me immediately | screenshot / log |
| A5 | Next morning: REFRESH LOG row ~04:30, then Meta pull ~05:50 detected = Ready; docs (CLAUDE.md, README, STATE.md) | Sonnet | TODO (v30: expect ~1,162 rows, ~175 deleted) | `metaauto_a5_<ts>.csv` |

## 1. Why a trigger is possible but not free
Today the refresh is a menu click. `refreshMetaFeed()` calls `buildFbCatalogue({silent:true})` then `exportMetaCsv()`. Both start with `SpreadsheetApp.getUi()` (L2696, L3093) and `exportMetaCsv` ends with `ui.alert(...)` (L3197). A time-driven trigger has no UI, so `getUi()` throws and nothing runs. Also `exportMetaCsv` does `ex.clear()` then writes (L3157-3160): if a headless run died between the two, Meta would pull an empty tab at 05:50 and REPLACE would delete the whole catalogue. So the trigger needs a headless path **and** a guard — not just `ScriptApp.newTrigger`.

## 2. The change (4 small edits, targeted, ponytail)
1. `_ui()` helper (≈12 lines): returns `SpreadsheetApp.getUi()` when interactive; when module flag `_headless` is true returns a stub `{alert: push to _headlessLog, Button:{YES,NO,OK}, ButtonSet:{OK,YES_NO}}`. Replace `SpreadsheetApp.getUi()` with `_ui()` in `buildFbCatalogue` and `exportMetaCsv` only (2 lines). Menu behaviour unchanged.
2. Drop guard in `exportMetaCsv`, before `ex.clear()`: only when `_headless`, if the sheet already holds rows and `new Ready < 80% of current rows` (D-B) **or** Ready = 0 → do NOT touch the sheet; log `⛔ drop guard`. A manual run is never blocked (OWARI can still push a big legitimate drop by hand).
3. `refreshMetaFeedAuto()` (≈25 lines): `_headless = true`; run `refreshMetaFeed` inside `_withLock` (existing; waits 30 s, skips if busy); `try/catch/finally` → always append one row to a new tab **REFRESH LOG** (time, mode=auto, status OK/GUARD/ERROR/BUSY, Ready, Wrong status, Incomplete, first popup line, error text) = the before→after log OWARI's rule requires; reset `_headless` in `finally`.
4. `installMetaRefreshTrigger()` (≈8 lines, run once from the editor): delete any existing trigger for `refreshMetaFeedAuto`, then `ScriptApp.newTrigger("refreshMetaFeedAuto").timeBased().atHour(4).nearMinute(30).everyDays(1).inTimezone("Asia/Bangkok").create()`. (Apps Script fires "between 04:00 and 05:00" — at least ~50 min before Meta's ~05:50 pull, so the ex.clear()→write window cannot overlap the pull.)

Not changed: FB CATALOGUE / META EXPORT layouts, gid 355347627 (the tab is reused, never recreated), feed config on Meta, PID CHANGES / archive logic, safety stop (5% archive cap). If the build log shows `⛔` the existing code already stops before export; REFRESH LOG records it as GUARD.

## 3. Owner decisions (ask once, record CLOSED in `04 Design Tools/logs/decisions_<date>.csv`)
- **D-A** CLOSED 2026-10-02: "same time as Meta export" → implemented as 04:00–05:00 Bangkok (`nearMinute(30)`), just before the ~05:50 pull; the exact same minute was avoided because the refresh rewrites META EXPORT and could collide with the pull.
- **D-B** CLOSED (owner: "whatever is most suitable / least problematic"): abort if Ready < 80% of the rows currently in META EXPORT (1,337 → below 1,070) or Ready = 0; normal sales (a few/day) never trip it, a mass Status error does.
- **D-C** CLOSED: e-mail alerts. `MailApp.sendEmail` to the script owner on GUARD/ERROR/BUSY (needs one extra authorization at A3) + Apps Script "Notify me immediately" for crashes before the code runs (A4).

## 4. Steps
**A1 code/tests (Sonnet · medium).** Read `Code_v27.gs` fresh, apply §2 as anchored replacements (same `apply_*.js` hash-guarded style as v27), `node --check`. Tests (Node VM mocks like `meta-pipeline.test.js`): (a) headless run never calls `getUi` (mock throws if called); (b) drop guard leaves META EXPORT untouched when Ready < 80%; (c) REFRESH LOG gets exactly one row per run incl. error path; (d) busy lock → BUSY row, no export; (e) menu path still shows the popup. Mutation checks: remove guard → (b) must fail; call `getUi` in headless → (a) must fail. Version rule (AGENTS.md): new `Code_v28.gs` + `WebApp_v26.gs` pair, previous pair → `backup/` with stubs, README table updated.
**A2 deploy.** ⚠️ replaces the live Code.gs; rollback = `backup/Code_v27_superseded_<date>.gs`. Same hash-guarded procedure as v27 S1.
**A3 first run (OWARI, click-level).** Apps Script editor → function dropdown → `refreshMetaFeedAuto` → **Run**. First time: Review permissions → allow. Then open tab **REFRESH LOG** → last row must read `OK`, Ready ≈ the current Instock count, and tab **META EXPORT** row count = Ready + 1. Note the run time (limit is 6 min; refresh took well under that when run by hand — confirm).
**A4 trigger (OWARI).** Editor → function dropdown → `installMetaRefreshTrigger` → Run. Then left menu **Triggers** (clock icon) → the new row `refreshMetaFeedAuto · Time-driven · Day timer 3am to 4am` → **⋮ → Edit trigger → Failure notification settings → Notify me immediately → Save**.
**A5 verify.** Next morning: REFRESH LOG row dated ~04:30 with `OK`; Meta upload session of ~05:50 shows detected = persisted = that Ready, 0 invalid. Then update CLAUDE.md (step 4 of the owner workflow becomes "automatic; manual click only for same-day changes"), README, STATE.md, HANDOFF.

## 5. Rollback
Triggers page → `refreshMetaFeedAuto` → ⋮ → **Delete trigger** (stops it at once, no code change needed). Full rollback = also restore `Code_v27.gs` from `backup/`. REFRESH LOG tab can stay (append-only log).

## 6. Risks / limits (honest)
- Same-day changes after 04:30 still need a manual 🚀 Refresh (or wait a day) — the trigger fixes forgetting, not timing.
- Time triggers can occasionally skip or run late; REFRESH LOG makes a missing row visible, and Meta keeps yesterday's feed (not empty) in that case.
- A bad edit in the inventory sheet (e.g. mass Status change) is carried into the feed; the 80% guard catches big drops only.
- Not verified yet: project time zone = Asia/Bangkok (`inTimezone` makes the trigger independent of it, REFRESH LOG timestamps are not), run time under the 6-min limit, and that no other function in the call chain touches `getUi()` — A1 test (a) proves the last one.
- Model: Sonnet · medium is enough; escalate to Opus only if A1 finds `getUi()` deeper in the chain than the two lines above.

## 7. A1 result (2026-10-02)
Files: `Code_v28.gs` (live candidate), `WebApp_v26.gs` (header bump), `backup/Code_v27_superseded_2026-10-02.gs`, `backup/WebApp_v25_superseded_2026-10-02.gs`, stubs for v27/v25, README table updated, tests re-pointed to v28 (+8 headless scenarios in `meta-pipeline.test.js`). Not deployed: the live Apps Script still runs v27 until A2.
New vs plan: lock-busy is detected by message (`/lock/i`) → BUSY; headless skips `setActiveSheet`; installer is run from the editor (no menu item added).

## 8. A2–A4 result (2026-10-02 ~02:10)
Done by Claude via Claude in Chrome with OWARI's go: ran `refreshMetaFeedAuto` (MailApp consent granted by OWARI in Google's popup), ran `installMetaRefreshTrigger`, set Notify me immediately. Triggers page now lists 3: fbaPostBatch (Time-based, **Error rate 100%** — unrelated, album autopost, needs a look), onEdit, refreshMetaFeedAuto. Editor shows an advisory "project contains functions with the same name" on the trigger dialog — not investigated; the run itself worked. One accidental edit in the editor (Enter key in Code.gs) was undone before saving; code = v28 as delivered.
A5 TODO (2026-10-03): after ~05:00 newest REFRESH LOG row must be OK with Ready ≈ 1,162 (v30 live; NOT GUARD); after ~05:50 Meta pull detected ≈ Ready, deleted ≈ 175 merged + sold. Write result to metaauto_a5_<ts>.csv.
