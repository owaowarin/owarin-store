# PLAN — Web app design DNA + UX cleanup (v43)

จัดทำ: 2026-10-07 (Wednesday) · planner: Opus · executor: Sonnet · rules 2026-10-07 · D41
Stream B (Add / Cart / Orders / Label). One writer. No new agent/chat. No P0/P1 restart, no LAB.

## 0. Status board

| Step | What | Owner OK needed | Status | Evidence |
|---|---|---|---|---|
| A0 | Preflight: live = repo v42 | no | DONE 2026-10-07 | `04 Design Tools/logs/webapp-sync-audit_20261007.csv` (10/10 SHA256 match, Drive modifiedTime 2026-10-06T13:16:45Z) |
| A1 | W2LabelUI colours → tokens with fallbacks | yes (code) | TODO | |
| A2 | LabelDialog Arial → documented exception | no (docs only) | TODO | |
| A3 | STATE + HANDOFF + logs for this stream | no | TODO | |
| B1 | Mobile nav: show that more tabs exist | yes (code) | TODO (optional) | |
| B2 | Cart money error names the field + focuses it | yes (code) | TODO (optional) | |
| B3 | Toast hides when a modal/tab changes | yes (code) | TODO (optional) | |
| B4 | Mobile header: count/title do not wrap | yes (code) | TODO (optional) | |
| C1 | Pair bump v43, tests, owner paste + deploy | owner clicks | TODO | |

Ship A1 (+ any approved B items) as ONE release v43. A2/A3 are docs-only and can land without a release.

## 1. Facts the executor must not re-derive

- Live project `webapp` (1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp) = repo `03 Apps Script/Web App` revision `W1-SUBSIDY0-20261006-01/v42@AD586F22…1263`; /exec = deployment Version6. No ChatGPT edit after that (checked 2026-10-07).
- The cloud session cannot read or write Apps Script. The owner pastes files and deploys; the executor gives click-level steps.
- DNA (`03 Apps Script/Web App/owarin-webapp-plan_v4.1-EN.md` §2.1): bg hsl(0 0% 5%), fg 95%, card 8%, input 15%, border 18%, gold 43 76% 52% (muted 43 40% 35%), radius 0, Outfit 300 + Shippori Mincho, hairline borders, 2-px scrollbar.
- **Trap:** `W2LabelUI.html` is included in BOTH `Index.html` (has `:root` tokens) AND `LabelDialog.html` (Sheets dialog, NO tokens). Every `var(--x)` must carry a fallback: `var(--card,#151515)`. Without it the Sheets Label Tool turns transparent/black-on-black.
- UX test harness (mock data, no Sheet access): `04 Design Tools/webapp-ux-harness.cjs` (render + screenshots) then `04 Design Tools/webapp-ux-flow.cjs` (Cart/Add flow); output to `04 Design Tools/logs/WEBAPP-DNA-UX-20261007-01/ux/`. Baseline result: 0 JS errors, 7/7 test suites PASS, Cart default 0 PASS, blank subsidy blocked PASS.

## 2. Step A1 — W2LabelUI colours (owner OK first)

File: `03 Apps Script/Web App/W2LabelUI.html`, line 2 `<style>` only. No JS change.

| Now | Replace with | Why |
|---|---|---|
| `#000b` (overlay) | `hsl(0 0% 0% / .73)` | same colour, no token exists |
| `#151515` | `var(--card,#151515)` | panel |
| `#eee` (×2) | `var(--fg,#eee)` | text |
| `#ad914d` | `var(--gold-muted,#ad914d)` | panel hairline |
| `#222` (×2) | `var(--input,#222)` | inputs, suggest list |
| `#555` | `var(--border,#555)` | input hairline |
| `#63532e` | `var(--gold-muted,#63532e)` | suggest hover |
| `#ddd` (`#w2Preview`) | keep | paper preview of the label, must stay light |

Rules: targeted string replacement with count asserts (pattern = `04 Design Tools/logs/W1-SUBSIDY0-20261006-01/build.py`); radius stays 0; no other line changes.
Accept: every hex left in the `<style>` sits inside a `var(--x,#hex)` fallback except `#w2Preview` `#ddd`; harness screenshots of Orders → label modal in Index before/after; LabelDialog rendered standalone (no tokens) still shows dark panel + light text (fallback proof).

## 3. Step A2 — LabelDialog font (docs only)

Keep `LabelDialog.html` Arial: it is a small Google Sheets dialog, Google fonts there add load time for no gain. Add one line to §2.1 of `owarin-webapp-plan_v4.1-EN.md`: "Exception: LabelDialog.html (Sheets dialog) uses Arial by design, 2026-10-07." Append a CLOSED row to `04 Design Tools/logs/decisions_2026-10-07.csv` ONLY after the owner agrees (default = keep Arial).

## 4. Step B — UX quick wins found 2026-10-07 (each optional, owner picks)

Measured on 390×844 (phone) and 1366×850 with mock data:

- **B1 (medium)** Phone shows INVENTORY…REVIEW; BOOKING/CONTENTS/TOOLS are off-screen and the nav scrollbar is hidden (`nav{scrollbar-width:none}` + `nav::-webkit-scrollbar{display:none}`). Fix: add a right-edge fade `nav{mask-image:linear-gradient(90deg,#000 85%,transparent)}` only under `@media (max-width:600px)`, and on tab click `btn.scrollIntoView({inline:'center',block:'nearest'})`. No layout change on desktop.
- **B2 (medium)** Blank/invalid money gives a generic toast "Enter valid prices, Customer Shipping and Shipping Subsidy (0 is allowed)". Fix: in the existing validation, find the FIRST invalid input, add class `bad` (`outline:1px solid var(--destructive)`), `focus()` it, and name it in the toast (e.g. "Shipping Subsidy ต้องเป็นตัวเลข (0 ได้)"). Must not change what is accepted/rejected: blank still rejects, 0 still accepted, Customer Shipping never substitutes subsidy. Re-run subsidy/regression tests.
- **B3 (low)** Toast (4.2 s) stays on top of the newly opened Add form/Save button. Fix: hide `#toast` in the tab switch and modal-open functions.
- **B4 (low)** Phone header wraps "BACK-OFFICE" and "48 / 48". Fix: under `@media (max-width:420px)` shrink brand letter-spacing and `white-space:nowrap` on the counter.
- Not in scope (recorded only): chips are 30 px tall (< 44 px touch guideline); FAB covers part of a mid-list "Add to cart" while scrolling (list already has 90 px bottom padding, so the last row is reachable). Raise later only if the owner reports mis-taps.

## 5. Step C1 — release v43 (copy the Session53 pattern exactly)

Packet: `04 Design Tools/logs/WEBAPP-DNA-UX-20261007-01/` with build.py, candidate/, before/, changes.csv, revision.json, result.md, UNDO.md.
1. Preflight: SHA256 of repo files = `W1-SUBSIDY0-20261006-01/revision.json` hashes. If not equal STOP and report.
2. Copy full v42 pair to `backup/pre-v43-20261007/`; `Code_v42.gs` / `WebApp_v42.gs` become 1-line stubs (like the v41 stubs); new `Code_v43.gs` / `WebApp_v43.gs` = header `v42`→`v43` only (assert count == 2 each).
3. Apply A1 (+ approved B items) to candidate files; log EDIT-DRYRUN then EDIT rows (source → destination, before → after hash).
4. Re-point tests that name v42: `image-url.test.js`, `p1-add.test.cjs`, `fb-catalogue.test.js`, `meta-pipeline.test.js`; update `README.md` table. Run all 7 suites + `W1-SUBSIDY0-20261006-01/subsidy.test.cjs` + `regression.cjs` (re-pointed). All PASS or STOP.
5. Harness screenshots before/after (phone + desktop): Inventory, Cart, label modal, LabelDialog standalone. Attach to result.md.
6. Owner steps (give in Thai, click-level): open Apps Script `webapp` → for each changed file (Code.gs, webapp.gs, W2LabelUI.html, + Index.html if B items) select all → paste repo text → Ctrl+S → title bar shows "Saved to Drive" → Deploy → Manage deployments → ✏️ → Version: New version → Description `v43 DNA/UX 2026-10-07` → Deploy. Owner sends back: the Version number and one phone screenshot committed to the repo (commit id only).
7. After owner reports: record PASS — owner-confirmed with their exact message; never claim agent-verified live.
UNDO: Manage deployments → Version 6; data unaffected (UI-only change).

## 6. Step A3 — session close (every time)

Log CSV, decisions CSV (only owner-closed items), this board ticked with evidence, `00 Docs/STATE.md` overwrite (≤ 80 lines, Stream 1 next step), `00 Docs/HANDOFF_2026-10-07.md` (one page), `_logs/INCIDENTS.csv` for any failed step, commit via `C:\Users\JIN\ads-optimizer\tools\pc\b1-store-commit.ps1` on PC or git push in cloud on the assigned branch.

## 7. Risks

- Missing fallback in A1 → Sheets Label Tool unreadable. Guard: standalone LabelDialog screenshot.
- B2 touches the money-validation path → only presentation may change; any change in accept/reject = STOP.
- Owner pastes partial file (DOM truncation ~200 KB lesson) → compare saved LF SHA256 with candidate before deploy if a capture route exists; otherwise owner-confirmed only.
