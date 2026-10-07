# OWARIN STORE Web App — Plan v4.1 (Operative, EN)

> **Decisions locked:** OWARIN storefront website is **on hold** · Current focus = **Google Sheets + Apps Script web app** only · `src` (the React storefront) serves as a **pattern library** for the parts Sheets doesn't cover · End goal = a **brand-new website** built later from this data.
>
> **Document status:** v4.1 = the only operative plan · v2 merged in · v3 (Supabase path) shelved — its assets are preserved, see §8. · **P1 delivered** (Code.gs v16 + WebApp.gs + Index.html).

---

## 0. What changed in v4.1 (vs v4)

1. **SALES convention finalized** (was the last blocker for P3) — see §6.
2. `{{items}}` in customer-facing messages aligned with the same rule: **base title only, no RESTOCK tag**. The RESTOCK tag exists for stock management and copy identification; copy identity in records is carried by the SKU (which embeds `Rxx`).
3. Plan translated to English; P1 status updated to *delivered*.

## 1. Architecture (Apps Script)

### 1.1 Project files (existing bound script)
```
Code.gs        ← v16 (delivered): original v14/v15 logic + P1 blocker fixes only
WebApp.gs      ← new (delivered): doGet(e) + api(action, payload) dispatcher
Index.html     ← new (delivered): SPA shell + Inventory module
Sidebar.html   ← unchanged, still works
```

### 1.2 Core rules
- Client talks to the server through a **single entry point**: `google.script.run.api(action, payload)` → JSON string `{ok, data | error}`. The future new website only swaps the transport (`fetch()`); page logic survives.
- **Inventory index loads once** at app start (both sheets, one round trip); all search/filter runs client-side (avoids the 1–2 s per-call latency). Refresh button re-fetches. No server-side CacheService in P1 (value-size limits make it not worth it at this scale).
- **LockService wraps every write** — prevents SKU races when phone + desktop submit simultaneously.
- Deploy: Execute as **Me** · Access **Only myself** · use `/dev` during development; `/exec` requires *Manage deployments → Edit → New version* on every release.
- Mobile-first; viewport meta tag set in `doGet`.

### 1.3 Code.gs v16 — what was changed (and nothing else)
1. `getTitleList(sheetName)` / `getPublisherList(sheetName)` / `_activeInventorySheet(sheetName)` / `addEntryFromSidebar({sheetName, …})` now accept an explicit sheet name (web app context has no active sheet). Called without it → original behavior, so the Sidebar keeps working.
2. `_withLock(fn)` — LockService wrapper; `addEntryFromSidebar` runs inside it.
3. `_recalcRow(sheet, row, COL, sheetName, changed)` — the shared per-row pipeline (autoformat → restock detect → SKU → suggested price → derived formulas). `onEdit` now delegates to it; P2's `updateEntry` will reuse it.
4. **Sold Date**: `"sold date"` added to `HEADER_MAP`; `onEdit` auto-fills the date when Status is set to `Sold` (only if empty — never overwrites); `addEntryFromSidebar` fills it when an entry is added already-Sold. → **Action required once: add a `Sold Date` header column to GGB and MAGAZINE (any position, header-driven).**
5. All pricing/SKU/sort logic is byte-identical to v14.2–v15.

## 2. Patterns lifted from `src` (what the storefront contributes)

| Gap in Sheets | Source in `src` | Use in the web app |
|---|---|---|
| Cart engine | `useCartStore` + `calcShipping` | Client-side cart, `localStorage` key `owarin-qcart`, same shipping formula `50 + 10×(n−1)`, cap 100, overridable |
| Order ID | `Checkout`: `OWA-YYYYMMDD-NN` | Same format in SALES `Order` column |
| Copy-to-clipboard | `ThankYou` / `copyAddress` | Quotation / price-notify copy buttons (`navigator.clipboard` + `execCommand` fallback for iOS-in-iframe) |
| Bulk select | `ProductsTab` | Inventory multi-select → NEW ARRIVAL post generator |
| Cancel order → restore stock | `OrdersTab.deleteOrder` | Cancel an FB sale → Status back to Instock + remove that order's SALES rows |
| Order status vocabulary | `Pending / Paid / Shipped` | Same words in SALES — future site imports without mapping |
| Condition descriptions | `GradingModal` / `settings.conditionGrades` | S/A/B/C/D tooltips in add/edit forms |
| Design system | `index.css` tokens | Implemented in `Index.html` (§2.1) — the back-office already looks like the future site |

### 2.1 Design tokens (implemented in Index.html)
Background `hsl(0 0% 5%)` · foreground `hsl(0 0% 95%)` · card `hsl(0 0% 8%)` · border `hsl(0 0% 18%)` · gold `hsl(43 76% 52%)` (muted `43 40% 35%`, bright `43 85% 60%`) · **radius 0 everywhere** · fonts: Outfit 300 (UI) + Shippori Mincho (price/serif accents; replaced Cormorant Garamond, as live Index.html v42 loads — doc synced 2026-10-07) · 2-px scrollbar, gold on hover · hairline borders.

Exception: LabelDialog.html (Sheets dialog) keeps Arial by design (2026-10-07, owner).
Rule (2026-10-07): partials shared with LabelDialog (e.g. W2LabelUI) use `var(--x,#fallback)` because the dialog has no `:root` tokens.
Rule (2026-10-07): phone ≤600 px — touch targets ≥ 36 px (inputs/selects 40 px).

## 3. Modules A–F

**A — Inventory (GGB/MAGAZINE)** *(P1 read side delivered)*: list + live search + filters (Status / Publisher / Condition / **Owner**) · tap row → full detail (Cost, Suggested, Market Place, Gross Profit, Sold Date, full name) · P2 adds: Add form (autosuggest from the in-memory index → `addEntryFromSidebar` with `sheetName`), Edit row via `_recalcRow`, per-row `🛒 Add to cart` (Instock only; Auction with warning) and `✓ Mark Sold`, bulk select → NEW ARRIVAL, tools buttons.

**B — Cart & Quotation** *(P3)*: cart drawer on every page · per-line price editing (negotiated deals) · auto shipping + override · three actions: **📋 แจ้งราคา** / **📋 Quotation (สรุปยอด)** / **✅ Confirm Sold** → writes SALES rows + Status=Sold + Sold Date, all inside `_withLock`, re-checking each item's current Status first; any already-sold item rejects the whole cart with the conflicting SKUs listed.

**C — SALES Dashboard** *(P4)*: monthly grouping by Order date — Cost / Price / Shipping / Net Profit + order & item counts, table + chart; rows arrive automatically from cart checkout; manual add/edit stays possible.

**D — BOOKING (waitlist queue)** *(P5; match-alert lands with P3)*: on add/restock → match `Game Title` against queue → "N people waiting" banner + per-person Instock Notification message · queue CRUD / reorder / status (Waiting / Notified / Purchased / Cancelled — new columns added header-driven) · delete the 2 junk SKU cells at the sheet's tail.

**E — CONTENTS** *(P5; the 2 core templates land with P3)*: CRUD + copy + placeholders `{{items}} {{shipping}} {{total}} {{bank_no}} {{bank_name}} {{account_name}} {{date}}` · one-time conversion of the 6 existing templates · rename rows: `Invoice` → `Quotation`, `Quotation` → `แจ้งราคา`.

**F — Tools/Settings** *(P2+)*: shipping constants (base/step/cap), bank details, order-id prefix; bulk actions (validate SKU, fill formulas, publisher check) as web buttons; link to open the sheet.

### Confirmed message templates (verbatim)

**① แจ้งราคา** (price notification):
```
ขออนุญาตแจ้งราคานะคะ
.
{{items}}
:
📦 ค่าส่งเริ่มต้น : 50.- 「เล่มต่อไปเพิ่มเล่มละ 10 บาท | สูงสุดไม่เกิน 100 บาท」
🚫 ไม่มีบริการเก็บเงินปลายทางนะคะ
—————
ขอบคุณค่าาาา (ㅅ´ ˘ `)
```

**② Quotation (สรุปยอด)**:
```
ขออนุญาตสรุปยอดค่าหนังสือนะคะ
.
{{items}}
:
{{bank_no}}
{{bank_name}} | {{account_name}}
ยอด {{total}} (รวมค่าจัดส่งไปรษณีย์ไทย {{shipping}}.- แล้ว)  —  บาทค่ะ
```
`{{items}}` = one line per copy: **`base title — price`** (RESTOCK tag omitted — see §6) · thousands separated with commas · `{{total}}` = subtotal + shipping.

## 4. Main data flow

```
Inventory (Instock) ──add──▶ 🛒 Cart ──┬─▶ แจ้งราคา (copy → FB)
                                       ├─▶ Quotation/สรุปยอด (copy → FB, total + bank)
                                       └─▶ Confirm Sold
                                             ├─ SALES: one row per copy (Order = OWA-YYYYMMDD-NN, shared per order)
                                             ├─ GGB/MAG: Status=Sold + Sold Date
                                             └─ BOOKING: close queue entry if sold to a queued customer (later phase)
Add item / restock ──match──▶ BOOKING queue ──▶ Instock Notification (copy → FB)
```

## 5. Phases

| Phase | Work | Gate | Status |
|---|---|---|---|
| **P1** | Code.gs v16 blocker fixes + WebApp.gs + Index.html + Inventory read/search/filter | Opens on mobile; search is instant after index load; Sidebar still works | ✅ **Delivered** |
| **P2** | Add + Edit row + single Mark Sold + `Sold Date` column live + Tools buttons | Daily shop work done entirely in the web app | next |
| **P3** | Cart → แจ้งราคา / Quotation / Confirm Sold → SALES + booking match on add | Multi-item FB order closed end-to-end; SALES writes itself | |
| **P4** | SALES monthly dashboard | Monthly summary + chart from P3 data | |
| **P5** | Full BOOKING + CONTENTS CRUD | Queue + templates fully managed from the web | |
| **P6** | *(future)* the new website — §8 | — | |

## 6. Confirmed rules (single source)

- **SALES convention (✅ confirmed):**
  - `Order` = `OWA-YYYYMMDD-NN` (shared by all rows of one order; NN = daily running number)
  - `Product` = **base title only — no RESTOCK tag.** The RESTOCK tag stays in inventory for stock management / telling copies apart; the exact copy is still identifiable because `Note` carries the SKU, which embeds `Rxx`.
  - `Note` = SKU
  - `Shiping Cost` = full amount on the order's first row, `0` on the rest → per-row `Net Profit = Price − Cost − Shiping Cost` (sheet's existing formula), and order totals stay correct.
- Shipping: `50 + 10×(n−1)`, cap 100, overridable.
- Templates ①② above, character-exact · bank details live in Settings/CONTENTS, never hardcoded.
- `{{items}}` lines use base titles (consistent with SALES.Product and the Price Content Lists formula).
- Sold Date: live from P2 (auto-filled on Status→Sold; never overwrites an existing date).
- Suggested Price recency filter: postponed until Sold Date data accumulates.
- CONTENTS renames at P3: `Invoice` → `Quotation`, `Quotation` → `แจ้งราคา`.
- Cart accepts Instock items; Auction allowed with a warning.

## 7. Still open (non-blocking)

1. Owner=KK consignment payout — badge + filter first; payout fields later if needed.
2. Biding (auction) flow — out of scope for now (`Auction` status already supported).

## 8. Path to the new website + v3 asset disposition

- **Portability principles:** `api(action, payload)` JSON contract as the stable seam · field names = the logical keys of `HEADER_MAP` · fixed status vocabularies (`Instock/Auction/Sold`, `Pending/Paid/Shipped`, `Waiting/Notified/Purchased/Cancelled`) · one Order-ID / SKU convention end-to-end → the future import needs no data transformation.
- **Ready-made assets from the v3 detour (keep, don't run):** `src/lib/inventory/` — the full v14/v15 logic as TypeScript (strict-checked, smoke 34/34) · `scripts/golden-test.ts` — validates any future implementation against a sheet export · design tokens §2.1. Building the new site = export sheets + this lib + a new frontend; no formula reverse-engineering ever again.
- **The v3 SQL** (`20260718_backoffice_p0.sql`): do **not** run. If it was already run: harmless (empty tables + two defaulted columns); leave it, or clean up with:
```sql
drop function if exists confirm_fb_sale(text,jsonb,numeric,numeric,numeric,jsonb);
drop table if exists product_ops; drop table if exists bookings; drop table if exists templates;
alter table orders drop column if exists channel;
alter table orders drop column if exists shipping_cost;
```

## 9. Known risks / limits

- `google.script.run` latency ~1–2 s per call → everything interactive is client-side; the server is touched only for loads and writes.
- Editing code does **not** update `/exec` until a new deployment version is published — develop on `/dev`.
- The `/exec` URL is the key to the shop — Access must stay *Only myself*.
- The one-time index load stays comfortable up to several thousand rows (< 1–2 MB JSON); paginate only if the sheet grows past that.
