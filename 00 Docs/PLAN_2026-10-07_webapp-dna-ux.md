# PLAN — Web app design DNA + UX cleanup (release v43)

จัดทำ: 2026-10-07 (Wednesday) · planner: Opus · executor: Sonnet · rules 2026-10-07 · D41
Stream B (Add / Cart / Orders / Label). One writer. No new agent/chat. No P0/P1 restart, no LAB, no production data write.
**Owner decision 2026-10-07: fix ALL items (A1–A3, B1–B6) and update every related file.** Do not ask again.

## 0. Status board

| Step | What | Status | Evidence |
|---|---|---|---|
| A0 | Preflight: live = repo v42 | DONE 2026-10-07 | `04 Design Tools/logs/webapp-sync-audit_20261007.csv` (10/10 SHA256, Drive modifiedTime 2026-10-06T13:16:45Z) |
| S1 | Packet + backup + pair bump v43 | TODO | |
| A1 | W2LabelUI colours → tokens with fallbacks | TODO | |
| A2 | LabelDialog Arial = documented exception | TODO | |
| B1 | Phone nav: fade + active tab scrolled into view | TODO | |
| B2 | Money error names + focuses the bad field | TODO | |
| B3 | Toast hides on tab change / modal open | TODO | |
| B4 | Phone header does not wrap | TODO | |
| B5 | Phone touch targets ≥ 36–40 px | TODO | |
| B6 | FAB hides while scrolling on phone | TODO | |
| T1 | Tests: new `dna-ux.test.cjs` + all suites + harness | TODO | |
| D1 | Related docs updated (list §7) | TODO | |
| C1 | Owner paste + deploy Version 7, owner confirms | TODO | |
| A3 | Session close (STATE, HANDOFF, logs) | TODO | |

Order: S1 → A1 → A2 → B1…B6 → T1 → D1 → C1 → A3. Ship everything as ONE release v43.

## 1. Facts — do not re-derive

- Live `webapp` project 1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp = repo revision `W1-SUBSIDY0-20261006-01/v42@AD586F22…1263`; /exec = deployment **Version 6**.
- The cloud session cannot read/write Apps Script. The owner pastes and deploys; give Thai click-level steps.
- DNA = `03 Apps Script/Web App/owarin-webapp-plan_v4.1-EN.md` §2.1 (dark, gold, radius 0, Outfit + Shippori Mincho, hairlines).
- **Trap 1:** `W2LabelUI.html` is included in `Index.html` (has `:root` tokens) AND `LabelDialog.html` (Sheets dialog, NO tokens). Every `var(--x)` in W2LabelUI MUST have a fallback `var(--x,#hex)`.
- **Trap 2:** Sheets "Labels > Open Label Tool" runs the SAVED code immediately (no deployment). The web /exec changes only at the new deployment version. So the owner saves all files in one sitting, then deploys.
- **Trap 3:** B2 touches the money path. Only messages/focus/outline may change. Accept/reject set must stay identical (§5 T1 matrix). Any difference = STOP.
- Harness (mock data, no Sheet): `node "04 Design Tools/webapp-ux-harness.cjs" "03 Apps Script/Web App" <out>` then `node "04 Design Tools/webapp-ux-flow.cjs" <out>`. **Planner dry-run 2026-10-07 (scratch copy, all §3/§5 edits applied verbatim): every anchor matched once; 0 JS errors phone+desktop; all phone buttons ≥ 36 px; `.brand` 28 px, `#count` 14 px; blank subsidy toast = "Shipping Subsidy — ใส่ตัวเลข (0 ได้)"; nav fade visible.** Expect the same numbers. Baseline before edits: 0 JS errors; phone 390×844: chips 25 px, Add-to-cart 29 px, selects 33 px, nav 37 px, `.brand` 45 px tall, `#count` 28 px tall (wrapped).

## 2. S1 — packet, backup, pair bump

Packet folder `04 Design Tools/logs/WEBAPP-DNA-UX-20261007-01/` holding `build.py` (copy the pattern of `W1-SUBSIDY0-20261006-01/build.py`: sha helper, `log()` to `changes.csv`, `replace()` with `count==1` assert), `before/`, `candidate/`, `revision.json`, `result.md`, `UNDO.md`, `ux/`.
1. Assert SHA256 of the 10 repo files = `W1-SUBSIDY0-20261006-01/revision.json` hashes. Not equal → STOP, report.
2. Copy the 10 files to `before/`; full `Code_v42.gs` + `WebApp_v42.gs` to `03 Apps Script/Web App/backup/pre-v43-20261007/`.
3. Create `Code_v43.gs` / `WebApp_v43.gs`: only the header text `v42` → `v43` (assert exactly 2 hits per file, as build.py did for v41→v42). Add one header line under the title in each: `// v43 (2026-10-07): UI only — DNA tokens in W2LabelUI, phone nav/header/touch/FAB, field-specific money errors. Server unchanged.`
4. Replace `Code_v42.gs` / `WebApp_v42.gs` with 1-line stubs, same wording as the current `Code_v41.gs` stub: `// Full source archived: backup/pre-v43-20261007/Code_v42.gs; active paired source is v43.`
5. Log every write as DRYRUN row then result row (source → destination, before hash → after hash).

## 3. A1 — W2LabelUI.html (line 2 `<style>` only)

| Find (exact) | Replace | Count |
|---|---|---|
| `background:#000b` | `background:hsl(0 0% 0% / .73)` | 1 |
| `background:#151515` | `background:var(--card,#151515)` | 1 |
| `color:#eee` | `color:var(--fg,#eee)` | 2 |
| `border:1px solid #ad914d` | `border:1px solid var(--gold-muted,#ad914d)` | 1 |
| `background:#222` | `background:var(--input,#222)` | 2 |
| `border:1px solid #555` | `border:1px solid var(--border,#555)` | 1 |
| `background:#63532e` | `background:var(--gold-muted,#63532e)` | 1 |
| `#w2Preview{…background:#ddd` | keep (label paper preview) | — |

Before editing, assert each count. No `border-radius` may be added.

## 4. A2 — LabelDialog font

No code change. In `owarin-webapp-plan_v4.1-EN.md` §2.1 append: `Exception: LabelDialog.html (Sheets dialog) keeps Arial by design (2026-10-07, owner).` Add decision row `WEB-DNA-1` CLOSED to `04 Design Tools/logs/decisions_2026-10-07.csv` (owner chose "fix all"; default keep Arial accepted by the plan). Same CSV quoting/BOM as the existing rows.

## 5. B1–B6 — Index.html (exact edits)

**CSS** — insert one block right after line `@media(min-width:700px){ .modal-bg{align-items:center} html,body{font-size:15px} }`:
```css
/* v43 phone UX (2026-10-07) */
nav.more{-webkit-mask-image:linear-gradient(90deg,#000 82%,transparent);mask-image:linear-gradient(90deg,#000 82%,transparent)}
.bad{outline:1px solid var(--destructive);outline-offset:-1px}
.fab{transition:opacity .15s}.fab.hide{opacity:0;pointer-events:none}
@media(max-width:600px){
  nav button{padding:14px 12px 12px}
  .chip{min-height:36px}
  .btn,.btn.small,.seg button{min-height:36px}
  select,input:not([type=checkbox]){min-height:40px}
}
@media(max-width:420px){
  .brand{letter-spacing:.2em;font-size:12px}
  .brand .g,#count{white-space:nowrap}
}
```

**B1 + B3 — `showView(v)`**: before its closing `}` (after `if (v === 'contents') loadContents(false);`) add:
```js
  $('toast').style.display = 'none';
  var navOn = document.querySelector('nav button.on');
  if (navOn && navOn.scrollIntoView) navOn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  navFade();
```
**B3 — `showModal`**: replace `function showModal(id, on){ $(id).classList.toggle('open', !!on); }` with
`function showModal(id, on){ if (on) $('toast').style.display = 'none'; $(id).classList.toggle('open', !!on); }`
(hide only on OPEN — success toasts are shown after modals close and must survive.)

**B1 + B6 + B2 helpers** — add right after the line `$('fab').addEventListener('click', openAdd);`:
```js
function navFade(){ var n = document.querySelector('nav'); n.classList.toggle('more', n.scrollLeft + n.clientWidth < n.scrollWidth - 4); }
document.querySelector('nav').addEventListener('scroll', navFade, { passive: true });
window.addEventListener('resize', navFade);
navFade();
var fabTimer = null;
window.addEventListener('scroll', function(){
  var f = $('fab'); if (window.innerWidth > 600 || f.style.display === 'none') return;
  f.classList.add('hide'); clearTimeout(fabTimer);
  fabTimer = setTimeout(function(){ f.classList.remove('hide'); }, 700);
}, { passive: true });
document.addEventListener('input', function(e){ if (e.target.classList && e.target.classList.contains('bad')) e.target.classList.remove('bad'); });
function markBad(el, msg){
  var old = document.querySelectorAll('.bad'); for (var i = 0; i < old.length; i++) old[i].classList.remove('bad');
  if (el) { el.classList.add('bad'); el.focus(); }
  toast(msg);
}
```

**B2 — `confirmSold()`**: replace the single validation line
`if(w1StrictMoney(p.customerShipping)===null||w1StrictMoney(p.shippingSubsidy)===null||p.items.some(function(i){return w1StrictMoney(i.price)===null;})){toast('Enter valid prices, Customer Shipping and Shipping Subsidy (0 is allowed)');return;}`
with
```js
 var badIdx=-1;p.items.some(function(i,k){if(w1StrictMoney(i.price)===null){badIdx=k;return true;}return false;});
 if(badIdx>=0){markBad(document.querySelector('.cl-price[data-idx="'+badIdx+'"]'),'Price of item '+(badIdx+1)+' — ใส่ตัวเลข เช่น 450');return;}
 if(w1StrictMoney(p.customerShipping)===null){markBad($('cShip'),'Customer Shipping — ใส่ตัวเลข (0 ได้)');return;}
 if(w1StrictMoney(p.shippingSubsidy)===null){markBad($('cShipShop'),'Shipping Subsidy — ใส่ตัวเลข (0 ได้)');return;}
```
**B2 — single sold form** (line with `toast('Valid price/subsidy required')`): replace that `toast(...)` call with
`markBad(w1StrictMoney(price)===null?$('soldPrice'):$('soldShip'),w1StrictMoney(price)===null?'Price — ใส่ตัวเลข เช่น 450':'Shipping Subsidy — ใส่ตัวเลข (0 ได้)')`
Keep the surrounding `if(...)` condition byte-identical.

Every find string must match exactly once (assert); if any anchor is missing STOP and report — do not improvise a different location.

## 6. T1 — tests (all must PASS; never weaken an assertion)

1. Re-point v42 → v43 in `image-url.test.js`, `p1-add.test.cjs`, `fb-catalogue.test.js`, `meta-pipeline.test.js` (filename strings only).
2. New `03 Apps Script/Web App/dna-ux.test.cjs` (node, no deps):
   - W2LabelUI: every hex in `<style>` is inside `var(--…,#hex)` except `#w2Preview` `#ddd`; no `border-radius` other than 0.
   - Money matrix through the real `w1StrictMoney` extracted from Index.html (same regex extraction style as `Index.test.js`): `'0'`,`'12.50'`,`'450'` accepted; `''`,`' '`,`'-1'`,`'1.234'`,`'abc'`,`'1e3'` rejected — identical results to the v42 function in `backup/pre-v43-20261007/`… (Index v42 lives in packet `before/Index.html`; compare both).
   - `confirmSold` order: run the extracted function in a VM with stubbed `$`, `toast`, `markBad`, `w1Run`, `w1OpenReview`; cases: bad item price → markBad on `.cl-price[data-idx="0"]` and no `w1Run`; bad customer → `cShip`; blank subsidy → `cShipShop`; all valid SHOP → `w1Run('orders.create')` called once with payload unchanged vs v42.
3. Run: `Index.test.js`, `R2Upload.test.js`, `fb-catalogue.test.js`, `image-url.test.js`, `meta-pipeline.test.js`, `p1-add.test.cjs`, `p1-ui.test.cjs`, `dna-ux.test.cjs`, plus `04 Design Tools/logs/W1-SUBSIDY0-20261006-01/subsidy.test.cjs` and its `regression.cjs` re-pointed copies placed in the new packet (do not edit the old packet).
4. Harness on phone + desktop, save screenshots in packet `ux/`; record in `result.md`: 0 JS errors; every phone button ≥ 36 px (REFRESH, ALL SHEETS/GUIDE BOOKS/MAGAZINE included), selects/inputs ≥ 40, `.brand` ≤ 32 px, `#count` ≤ 16 px; nav has class `more` at load and not after scrolling to the end; TOOLS click scrolls it into view; blank subsidy → outline on `#cShipShop` + toast names it; toast hidden after opening Add form; desktop 1366 screenshots unchanged except colours/size (compare visually).
5. LabelDialog standalone render (strip `<?!= … ?>` like the harness, no tokens): panel dark, text light (fallback proof) — screenshot in `ux/`.

## 7. D1 — related files to update in the same pass

| File | Change |
|---|---|
| `03 Apps Script/Web App/README.md` | rows Code/WebApp v42 → v43, describe v43 UI-only, backup path, add `dna-ux.test.cjs` row |
| `03 Apps Script/Web App/owarin-webapp-plan_v4.1-EN.md` §2.1 | A2 exception + 2 rules: "partials shared with LabelDialog use `var(--x,#fallback)`"; "phone ≤600 px: touch targets ≥ 36 px (inputs 40)" |
| `00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md` | header line → v43 / Version 7; one Thai line: error now names the field and outlines it red |
| `00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md` | status lines v42/Version6 → v43/Version7 (targeted) |
| `00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md` | append "Session54 — DNA/UX v43" (≤ 15 lines; >50 KB file: append with targeted edit, do not rewrite) |
| `OWARI-MASTER-CONTEXT_EN_2026-09-13.md` | lines 272/278/536: v42 → v43, deployment 6 → 7 |
| `CLAUDE.md` | new dated rule (English): "Partials included by both Index.html and LabelDialog.html must use `var(--token,#fallback)`; LabelDialog has no tokens. (2026-10-07)" |
| `00 Docs/STATE.md` | overwrite ≤ 80 lines (A3) |
| `00 Docs/HANDOFF_2026-10-07.md` | append Session54 section, ≤ 1 page |
| `04 Design Tools/logs/decisions_2026-10-07.csv` | WEB-DNA-1 (Arial) + WEB-DNA-2 "fix all A1–B6" CLOSED |
| `_logs/INCIDENTS.csv` | any failed step/retry, 7-column layout |
| `prompts/webapp-design-dna.md` | replace with next-step prompt after release |
| this plan | tick board with evidence |

Leave historical logs/handoffs as they are (dated evidence).

## 8. C1 — owner paste + deploy (give in Thai, click-level)

Files the owner pastes into Apps Script `webapp`: `Code.gs` ← `Code_v43.gs`, `webapp.gs` ← `WebApp_v43.gs`, `Index.html`, `W2LabelUI.html`. Others unchanged.
Steps per file: open file in left list → click into code → Ctrl+A → Delete → paste repo text (owner opens the repo file on PC: `C:\Users\JIN\owarin-store\03 Apps Script\Web App\<file>` → Ctrl+A → Ctrl+C) → Ctrl+S → title bar "Saved to Drive"; line 2 of Code.gs shows `Code.gs v43`.
Then Deploy → Manage deployments → pencil icon → Version: **New version** → Description `v43 DNA/UX 2026-10-07` → Deploy → note the Version number (expect 7).
Owner check on phone: open web app, refresh, see nav fade, put an item in Cart, clear the Subsidy box, press Create order → red outline + toast naming Shipping Subsidy; then type 0 again. Do NOT complete an order for testing.
Owner sends back: Version number + "ผ่าน"/problem. Record as PASS — owner-confirmed with the exact message. Never claim agent-verified live.
UNDO: Manage deployments → pencil → Version 6 → Deploy (web). For the Sheets Label Tool, paste back `before/W2LabelUI.html` (and the v42 trio) and save. UI-only: no data to restore.

## 9. A3 — session close

CLAUDE.md checklist 1–9: log CSV (packet `changes.csv` + `logs/WEBAPP-DNA-UX-20261007-01.csv` summary), decisions, this board, STATE overwrite, HANDOFF, related files (§7), rules (CLAUDE.md line), verify by read-back, live actions with time + who clicked. Commit + push on the assigned branch (cloud) or `C:\Users\JIN\ads-optimizer\tools\pc\b1-store-commit.ps1` (PC).

## 10. Risks

| Risk | Guard |
|---|---|
| Missing fallback → Sheets Label Tool unreadable | T1.2 hex check + T1.5 standalone screenshot |
| B2 changes money accept/reject | T1.2 matrix vs v42 function; STOP on diff |
| Owner pastes partial file (~200 KB DOM truncation lesson) | Paste from the PC file via Ctrl+A/Ctrl+C, not from a browser view; check line 2 header and that the file ends with `</html>` / last function |
| Sheets dialog live before /exec deploy | Owner saves all 4 files in one sitting, then deploys immediately |
| `min-height` on inputs breaks a dense desktop layout | rules sit inside `max-width:600px` only; desktop screenshot compare |
