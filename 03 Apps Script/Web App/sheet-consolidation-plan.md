# OWARIN STORE — Sheet Consolidation Plan

**Goal:** 10 sheets → 7 · remove duplicated columns · all headers in English · no data loss
**Status:** PLAN ONLY — nothing changed yet.

---

## 1. Current state (surveyed live)

| # | Sheet | Rows | What it holds | Verdict |
|---|---|---|---|---|
| 1 | Monthly Sales | 2 | Order, Product, Order date, Cost, Price, Shiping Cost, Net Profit, Note | **Rename** → `SALES` (name is misleading; it is a transaction ledger, not a monthly summary) |
| 2 | GAME GUIDE BOOKS | ~1,193 | Master inventory, 24 cols | **Keep** (add `Type`) |
| 3 | SYNOPSIS | 599 | Base Title, เรื่องย่อ | **Rename** → `GAME INFO` (+ absorb Series) |
| 4 | DESCRIPTION | 467 | Product ID, Item name, Condition, description, Publisher, Platform, Genre, Copy Flags, Base Title | **Merge into FB CATALOGUE** — 8 of 9 columns are copies of inventory |
| 5 | FB CATALOGUE | 768 | Product ID, FB Title, ของแถม, เรื่องย่อ, Price, MP Price, Meta-format prices, 2 helpers | **Keep** (becomes the single Facebook sheet) |
| 6 | SERIES MAP | 68 | Match, Series, Note | **Fold into GAME INFO** as a `Series` column |
| 7 | MAGAZINE | 556 | Inventory, 22 cols (no Platform/Genre) | **Keep** (add `Type`) |
| 8 | BOOKING | 37 | Booking Name, Game Title, Queue | **Keep** (+ `Status`) |
| 9 | CONTENTS | 7 | TItle, Contents, Contents 2 | **Rename** → `TEMPLATES` (also fixes the `TItle` typo) |
| 10 | Worksheet | 3 | Meta catalog spec text (instructions only, no data) | **Delete** — keep the spec as a file, not a tab |

### The actual duplication

- **DESCRIPTION vs GAME GUIDE BOOKS** — `Item name`, `Condition`, `Publisher`, `Platform`, `Genre`, `Copy Flags`, `Base Title` all already exist in inventory, keyed by the same `Product ID`. Only the generated description text is unique.
- **FB CATALOGUE vs GAME GUIDE BOOKS** — `Price`, `Market Place Price` are copies.
- **FB CATALOGUE vs SYNOPSIS** — `เรื่องย่อ` is a copy.
- **DESCRIPTION vs FB CATALOGUE** — same grain (one row per copy, keyed by Product ID) → these are two halves of one table.

**Rule going forward:** a value is typed in exactly one sheet. Everywhere else it is a lookup on `Product ID` (per copy) or `Base Title` (per game).

---

## 2. Target structure — 7 sheets

### 2.1 `GAME GUIDE BOOKS` — inventory, one row per physical copy
Headers unchanged, plus `Type`.

`Item name` · `Product ID` · `Status` · `Condition` · `Copy Flags` · `Rarity` · `Publisher` · `Platform` · `Genre` · **`Type`** · `Original` · `Cost` · `Price Range` · `Price` · `Gross Profit` · `Market Place Price` · `Gross Profit MP` · `Market Ref` · `Ref Note` · `Listed Date` · `Sold Date` · `Suggested Price` · `Price Content Lists` · `Max G Ref` · `Shopee Upload`

`Type` = physical format / product line: `POCKET BOOK`, `GAMEMAG SPECIAL`, `GAMEMAG TOP SECRET`, `STANDARD`, …

### 2.2 `MAGAZINE` — same shape, no Platform/Genre, plus `Type`

### 2.3 `SALES` — one row per sold copy
| Header | Note |
|---|---|
| `Order ID` | `OWA-YYYYMMDD-NN`, shared by all rows of one order |
| `Order Date` | |
| `Product ID` | **new** — SKU gets its own column instead of hiding in `Note` |
| `Item Name` | base title, no RESTOCK tag |
| `Cost` | |
| `Price` | |
| `Shipping Cost` | **spelling fixed** (was `Shiping Cost`); full amount on first row, 0 on the rest |
| `Net Profit` | formula |
| `Note` | free text only |

### 2.4 `BOOKING` — waitlist
`Customer Name` · `Game Title` · `Queue` · `Status` · `Note`
`Status` ∈ `Waiting` / `Notified` / `Purchased` / `Cancelled`

### 2.5 `TEMPLATES` — message templates
`Template Name` · `Content` · `Content Alt`
Rename rows to English keys: `PRICE NOTIFY`, `QUOTATION`, `NEW ARRIVAL`, `INSTOCK NOTIFY`, `BIDDING`, `BUY OFFER`.

### 2.6 `GAME INFO` — one row per game (not per copy)
`Base Title` · `Series` · `Synopsis`

- Absorbs SYNOPSIS (599 rows) and replaces SERIES MAP.
- `Series` is filled by the existing auto-builder; you only edit exceptions.
- **Trade-off:** SERIES MAP covers ~600 titles with 68 pattern rules. Moving to one row per title is more rows but exact and self-documenting — no "why did this match?" surprises.
- *Alternative if you prefer fewer rows:* keep the rules sheet, rename it `SERIES RULES`, and this becomes an 8-sheet layout instead of 7.

### 2.7 `FB CATALOGUE` — Facebook/Meta catalog build sheet
Two zones in one sheet.

**Zone A — working columns (typed or looked up)**
`Product ID` · `Item Name` *(lookup)* · `Base Title` *(lookup)* · `Condition` *(lookup)* · `Publisher` *(lookup)* · `Platform` *(lookup)* · `Genre` *(lookup)* · `Copy Flags` *(lookup)* · `FB Title` *(typed)* · `Freebies` *(typed, was ของแถม)* · `Synopsis` *(lookup from GAME INFO)* · `Description` *(generated, from DESCRIPTION)* · `Price` *(lookup)* · `Marketplace Price` *(lookup)*

**Zone B — Meta export block (exact Meta field names, ready to download as CSV)**
`id` · `title` · `description` · `availability` · `condition` · `price` · `link` · `image_link` · `brand`

- Zone B uses Meta's required field names verbatim, so the sheet exports straight to a catalog feed without renaming — this is what the `Worksheet` tab was documenting.
- `availability` maps from inventory `Status`: `Instock` → `in stock`, `Sold` → `out of stock`.
- `condition` maps S/A → `new`-ish wording per your grading; B/C/D → `used`.
- `price` uses Meta format (`390.00 THB`), which the existing Meta-format columns already produce.

---

## 3. Naming rules (important — the code matches headers by name)

1. **Headers are matched case-insensitively across every sheet.** A new header that reuses an existing logical name will silently map to that field. Before adding a header, check it is not already in `HEADER_MAP`.
2. **`Series` is reserved for SP-2 pricing.** Do not use it as a column in inventory. Product line/format = `Type`.
3. **`Type` is reserved for the product line.** Do not reuse it for anything else (file type, media type…).
4. **`Note` appears in several sheets** — that is fine (resolution is per sheet), but keep the meaning "free text for humans" everywhere.
5. **One noun per concept.** `Item Name` (never Product/Title/Name for the same thing), `Product ID` (never SKU/Code in headers), `Marketplace Price` (never MP Price/Market Place Price mixed).
6. **Sheet names:** UPPERCASE with spaces, matching what the code expects. Avoid renaming inventory sheets — the constants and all SKU history assume them.
7. **Meta field names in Zone B stay lowercase** (`id`, `title`, `image_link`) because Meta requires the exact strings. This is the one intentional exception to the naming style.
8. Typos to fix at migration: `Shiping Cost` → `Shipping Cost`, `TItle` → `Template Name`.

---

## 4. What breaks in the code (and the fix)

| Change | Code touchpoint | Fix |
|---|---|---|
| `Monthly Sales` → `SALES` | `_getSalesSheet()` auto-detects by headers | Works as-is; optionally set `SALES_SHEET = "SALES"` |
| `Shiping` → `Shipping` | `HEADER_MAP` | Already accepts both spellings — no change |
| `CONTENTS` → `TEMPLATES` | `_contentsSheetOrThrow()` detects by headers `Title`+`Contents` | Update the header aliases to `Template Name` / `Content` |
| `SYNOPSIS`+`SERIES MAP` → `GAME INFO` | `SP2_SERIES_SHEET`, `_sp2LoadSeriesMap()` | Point to `GAME INFO`, read `Base Title` → `Series` as exact match |
| `DESCRIPTION` merged | whatever generates descriptions | Retarget writes to FB CATALOGUE columns |
| `Type` column added | done already (`HEADER_MAP`, web app filter + field) | Run the menu item to create the column |
| `BOOKING.Booking Name` → `Customer Name` | `HEADER_MAP` `booking name` | Add `customer name` as an alias |

---

## 5. Migration order (safe, reversible)

1. **Back up** — File → Make a copy, name it `OWARIN STORE — backup YYYY-MM-DD`. Do not skip.
2. Add `Type` to `GAME GUIDE BOOKS` and `MAGAZINE` (menu item already built), fill values gradually.
3. Rename `Monthly Sales` → `SALES`; fix `Shiping Cost`; add `Product ID` column.
4. Rename `CONTENTS` → `TEMPLATES`, fix `TItle`, rename template rows to English keys; update code aliases.
5. Rename `SYNOPSIS` → `GAME INFO`, add `Series` column, auto-fill it, verify SP-2 prices are unchanged on a sample of ~20 items, then delete `SERIES MAP`.
6. Add the missing lookup columns to `FB CATALOGUE`, verify they match `DESCRIPTION` row for row, then delete `DESCRIPTION`.
7. Add Meta export Zone B to `FB CATALOGUE`; test-export one CSV and validate in Meta Commerce Manager.
8. Delete `Worksheet` once the spec is saved as a file.

Each step is independently reversible, and steps 5–6 keep the old sheet until the new one is verified.

---

## 6. Deliberately NOT merged

- **GAME GUIDE BOOKS + MAGAZINE** — different columns (no Platform/Genre for magazines) and separate SKU sequences. Merging would break SKU history.
- **SALES into inventory** — one is an event log (append-only), the other is current state. Keeping them apart is what makes profit reporting correct.
- **GAME INFO into inventory** — per game vs per copy. Merging would duplicate a synopsis across every restock.
