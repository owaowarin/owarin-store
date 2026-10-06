# OWARIN STORE — Shopee re-listing (new design)

Source of truth for this project. Last updated 2026-08-30. Everything below is decided unless it
sits under "Still open".

---

## 1. What this round does

Relist the catalogue on Shopee with the new design: new images, new prices, new product detail.

**Scope of THIS round: ready-to-sell items only.** Concretely a row ships only if ALL of these hold:

1. `Status = Instock` in the sheet
2. it survives dedup (see §5) — i.e. it is the copy chosen to be listed
3. it has at least one image in R2

Anything else waits: held-back duplicate copies, Sold / Auction / Hold rows, rows with no image,
and anything not in the sheet at all (= sold or gone). Nothing is deleted; the leftovers are
written to `held_back.csv` and `missing_images.csv` so the next round starts from them.

## 2. Route: relist, do not edit in place

Shopee **Mass Update** has four templates — Basic Info (name + description), Sales Info
(price + stock), Shipping Info, DTS Info. **None of them can change product images.**
Shopee **Mass Upload** (new listings) *can*: `ps_item_cover_image` + `ps_item_image_1..8` take URLs.

So the new images are free to apply on the relist route and cost ~146 manual UI edits on the
edit-in-place route. ~~Relisting loses per-listing sold count and reviews; the shop rating is
unaffected, and each book is effectively qty 1, so that history carries little value.~~ **MOOT —
decided 2026-09-13: the owner wiped every old listing already, so this is no longer a trade-off
being weighed, it already happened in full.** See `04 Design Tools/logs/decisions_20260913.csv`.

~~This also sidesteps a blocker: `เลข SKU` is empty on all 407 current listings, and item names
cannot be matched back to the sheet reliably (243/344 fuzzy matches, 132 of them ambiguous).~~ **MOOT
— decided 2026-09-13: there are no old listings left to match SKUs back to, so this blocker no
longer exists.** The new listings carry `SKU = OWA Product ID` from birth, so every future round is
a straight join.

## 3. Files and how to refresh them

**Rule: export the sheet fresh before drawing any conclusion. Never reuse an old export.**

Sheet `OWARIN STORE` id `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. Export a tab with
`https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>` in Chrome, then move the
file from Downloads into `_exports\`.

| tab | gid |
|---|---|
| GAME GUIDE BOOKS | 286842017 |
| MAGAZINE | 2075440050 |
| R2 IMAGES | 350046975 |

- `_exports\` — the dated CSV exports the scripts read. **Added 2026-09-13: `R2 IMAGES.csv` must have
  a 7th column = `ext` (sheet cols E=pid, F=n, G=ext, pulled from `meta/images.csv`'s `pid,n,ext`
  format) — if that column is missing or blank on a row, `build_shopee_upload.py` falls back to
  `.jpg` and prints a WARNING for that PID instead of failing silently.**
- `Shopee\Shopee_mass_upload_2026-08-30_basic_template.xlsx` — Mass Upload template (new listings)
- `Shopee\mass_update_sales_info_1369014507_20260830153215.xlsx` — Sales Info export, 407 live rows
- `Shopee\Shopee Details.txt` — the description block

`R2 IMAGES` layout: col A `Product ID`, B/C image URLs, and **cols E/F are the real index**
(`pid`, `n` = how many images exist). Use E/F. R2 itself has no egress from either shell.

Images live at `https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/library/<Product ID>/<n>.jpg`.
R2 holds **at most 2 per book** (937 books have 1, 791 have 2). Accepted: list cover + 1. Shopee
allows 9 — a known gap, not an oversight.

## 4. Constants (read from live listing 58155948810, 2026-08-30)

| field | value |
|---|---|
| category | `หนังสือและนิตยสาร > หนังสือ > หนังสืออื่นๆ` — leaf **101573** (path 100643 / 100777 / 101573) |
| weight | **0.5 kg** |
| dimensions | blank |
| brand | `No brand(ไม่มียี่ห้อ)` |
| days to ship | 2 |
| shipping | AI `channel_id.7000` Standard Delivery + AJ `channel_id.70036` SPX Express — both เปิด |

Shop-level channels enabled: 7000, 70036, 70018 EMS, 70020 DHL, 70027 Flash, 70066 SPX.
The shop already uses a variation tier named `Publisher`.

Seller Centre reads cheaply from the browser:
`fetch('/api/v3/product/get_product_info?product_id=<id>&is_draft=false')` and
`/api/v3/logistics/get_channel_list`. The product-list endpoints refuse scripted calls (csrf).

## 5. Rules

**Price** = the sheet's **`Market Place Price`** column. NOT `Price` — that is the Facebook/direct
price. MP is filled on 100% of Instock rows.

**Dedup.** Group key = base item name (RESTOCK suffix stripped) + `Publisher` + `Original`. Where a
group holds several copies, list only the **worst-condition** copy, ties broken by lowest MP price.
Condition ranking S (best) > A > B > C > D (worst). Deliberate: clear the weak copies first.
Instock 1078 -> 946 listable, 132 held back.

**Shopee variation limits** (from the template, not guessed): max **100 options** per listing,
variation name **1-14 chars**, option value **1-20 chars**, every tier-1 option needs its own image,
prices inside one listing within **5x**.

**Grouping.** Driven by the sheet's `Type` column — the same taxonomy as the Facebook albums, so
both channels stay in sync. Two shapes:

- *Issue-numbered series* — option = `vol 948`, always short, so everything groups. The full
  `vol - game title` list goes in the description to keep titles searchable.
- *Game-titled series* — the option must be the game name. Over 20 chars, it becomes its own
  listing rather than being truncated to `Castlevania：Curse of`.
- *Same game, several publishers* — one listing, tier = `Publisher`.
- **Governing principle: an issue that is a guide to one named game gets its own listing.** Burying
  a game name in a dropdown makes it unfindable, and search is how these books get found.

## 6. Structure

| Type | items | individual | grouped | note |
|---|---|---|---|---|
| GAME GUIDE BOOKS | 328 | 245 | **37** | 83 items are one game from several publishers; 0 groups break 5x, 0 publisher names over 20 chars |
| MEGA MONTH | 123 | 123 | 0 | every issue is `Issue NN - <game>` |
| GAMEMAG SPECIAL | 54 | 23 | 1 | 18 at >=500฿ MP + 5 long names |
| GAMEMAG TOP SECRET | 16 | 7 | 1 | no vol numbers at all; 7 names too long |
| MEGA⨯GAME (MxG) | 183 | 0 | 4 | 2010 / 2011 / 2012 each own listing; 2009+2013+2016 pooled (part-years) |
| HOBBY TOY AND MODEL | 52 | 0 | 1 | |
| HOBBY MODEL | 37 | 2 | 1 | |
| GAMEMAG MAGAZINE | 35 | 0 | 1 | |
| HOBBY JAPAN | 30 | 4 | 1 | 4 have no vol number |
| MEGA MAGAZINE | 27 | 0 | 1 | |
| GAMEMAG CHEATS & CODE | 19 | 2 | 1 | named `GAMEMAG ฉบับสูตรเกม vol N` |
| A・Club | 17 | 0 | 1 | 17 distinct vols, verified |
| TONBO MAGAZINE | 8 | 0 | 1 | |
| Other | 8 | 0 | 1 | |
| TV MAGAZINE | 5 | 0 | 2 | `TV Magzine Hero vol 1-28 (Completed Set)` 4,220฿ split off |
| PLAY | 4 | 0 | 1 | |

**946 items -> 461 listings (406 individual + 55 grouped).**

On MP price no group sits near the 5x limit (worst grouped case 2.9x). The only splits forced by a
limit are MEGA⨯GAME (100-option cap) and the one TV MAGAZINE outlier.

GAMEMAG SPECIAL cut is **>= 500฿ MP -> 18 individual**. Alternatives: >=400฿ -> 27, >=450฿ -> 19,
>=550฿ -> 16. (An earlier "300฿" figure was on the `Price` column and does not transfer — the
cheapest issue is already 250฿ on MP.)

## 7. Row shape

Individual listing, one row:

```
A  หมวดหมู่      101573
B  ชื่อสินค้า    <Item name> | หนังสือบทสรุปเกมส์ เฉลยเกมส์ คู่มือเกมส์
C  รายละเอียด    Shopee Details.txt block + house spec block + 🔴 CONDITION (see below)
P  ราคา          <Market Place Price>
Q  คลังสินค้า    1
I  Parent SKU    <OWA Product ID> for a single listing; `OWA-GRP-<TITLE-SLUG>` for a grouped one
R  เลข SKU       <OWA Product ID>  (always the physical copy)
V  ภาพปก         <r2>/library/<Product ID>/1.jpg
W  รูปภาพ 1      <r2>/library/<Product ID>/2.jpg   (if it exists)
AE น้ำหนัก 0.5 | AF-AH blank | AI + AJ เปิด
```

Grouped listing: same constants on every row, plus one shared `J เลขอ้างอิงตัวเลือกสินค้า`,
`K ชื่อตัวเลือก 1` (e.g. `เล่ม` or `Publisher`), and per row `L ตัวเลือก 1`, `P ราคา`, `Q 1`,
`R SKU`, `M ภาพตัวเลือก`.

## 8. Steps

0. Export the three tabs fresh into `_exports\` (§3).
1. Run the builder — `python3 Shopee/build_shopee_upload.py` (add `--limit=10` for a test file).
   **Added 2026-09-13:** `--pids=PID1,PID2` builds only the listing(s) containing those exact
   Product IDs (a matched group keeps every sibling row, not just the requested PID) — use this for
   a targeted D0 proof instead of `--limit`, which just takes whichever listings come first. The two
   flags cannot be combined; passing both exits with an error.
   Outputs into `Shopee\out\`: `mass_upload_<date>.xlsx`, `listing_index.csv` (every listing and
   every option, with SKU — this is the map to paste Shopee item IDs back against), `held_back.csv`,
   `missing_images.csv`.
2. **Upload a first batch of 10 rows**, confirm it lands clean, then run the rest.
   Seller Centre -> สินค้าของฉัน -> **ทำแบบชุด -> เพิ่มสินค้าแบบชุด** -> tab **อัปโหลด**
   (`/portal/product-mass/import/upload`; max 3.0 MB, .xlsx). The result appears under
   **ประวัติการอัปโหลด** on that same page.
3. **PUBLISH — mass upload does NOT publish.** Successful rows land as **drafts**, not live
   listings: สินค้าของฉัน -> **ยังไม่ลงขาย** -> **แบบร่าง**. Tick the header checkbox
   (`เลือกทั้งหมด`) and press **เผยแพร่** at the bottom to publish them in bulk.
   This is why nothing appeared in the shop after the first test upload — the upload was fine.
4. ~~Retire the old listings — set `คลัง` = 0 via Mass Update -> Sales Info, excluding any listing
   that already has sales. Those are left alone and edited by hand; the script writes
   `keep_manual.csv`.~~ **MOOT — decided 2026-09-13: the owner wiped every old Shopee listing already
   (fresh start, review/sales-history loss accepted). Nothing to retire, no `keep_manual.csv` step,
   no manual edit-later path. See `04 Design Tools/logs/decisions_20260913.csv`.**
5. Verify: re-download the Sales Info export and diff against the fresh sheet — SKU filled, price
   matches MP, no Instock row without a listing, no duplicate SKU (there are no old listings left to
   check against zero stock).
6. Paste the new Shopee item IDs back into the sheet (`Shopee Item ID` column) so the link is
   permanent in both directions.

## 9. Still open

- ~~**Sold-count per listing.** Not in any export, and the Seller Centre list API refuses scripted
  calls (csrf). Needs a Business Insights product export, a page-by-page browser read, or OWARI
  naming the listings to spare. Note most sold books already sit at stock 0 (287 of 407), so the
  real set is small — listings with sales that still have stock.~~ **CLOSED — moot as of 2026-09-13:
  the owner wiped all old listings and accepted the loss of their sold-count/review history, so
  there is nothing left to preserve or reconcile here.**
- Whether the other year-series in MAGAZINE (`MEGA` 150 / 21 years, `HOBBY` 115 / 13 years,
  `GAMEMAG` 27 / 13 years) should also be grouped by year.

## 10. Built output (2026-08-30)

`Shopee\build_shopee_upload.py` implements everything above. Run produced:

- **468 listings — 415 individual + 53 grouped — 944 rows**
- 132 held back, 2 with no image (`MEGA MONTH 2010 Issue 07 ...`, `TV Magzine Hero vol 1-28`)
- `mass_upload_2026-08-30.xlsx` (full) and `mass_upload_2026-08-30_TEST.xlsx` (10 listings / 12 rows)

The xlsx is built by injecting rows straight into the template's `sheet2.xml`, so Shopee's own
header rows 1-6, hidden sheets, sheet protection and data validations survive untouched. Data
starts at **row 7**. openpyxl cannot open Shopee's files — they write `activePane="bottom_left"`
where the spec demands `bottomLeft`; the builder fixes that on the way out.

Validated after the build, all clean: name 47-120 chars (limit 20-120), description 480-4180
(limit 60-5000), option <=20, variation name <=14, every grouped row carries its own
`ภาพตัวเลือก`, every row has a cover image + SKU + numeric price, no duplicate SKU, no duplicate
option inside a group, no group over 100 options or 5x price.

Long group descriptions are trimmed to fit 5000 chars and end with `• …และอีก N เล่ม`.

## 10b. Test upload result (2026-08-30 22:56)

`mass_upload_2026-08-30_TEST.xlsx` -> **สำเร็จ 10/10**. Verified on the draft detail page:
images pulled from the R2 URLs correctly (cover + 1, "1/2" in the preview), price, stock 1 and the
product name all landed as built, and the listing shows **ผ่านเกณฑ์** on Shopee's own quality meter.

The only surprise: the products sit in **แบบร่าง** awaiting **เผยแพร่**. Nothing was wrong with
the file.

## 10c. Rebuild after the MEGA MONTH price change (2026-08-30 16:20)

Re-exported all three tabs. 18 MAGAZINE rows changed price (MEGA MONTH, MP 430->490, 480->580 etc);
no rows added or removed. Rebuilt: still **468 listings / 944 rows / 132 held back**.

MEGA MONTH is and always was **individual — 122 listings, zero grouped**. The series that carries
the "the name does not fit" problem is **MEGA⨯GAME**, whose dropdown labels are bare `vol 948`.
Checked: no group description had to drop any title, so every game name IS present in the listing
description and stays searchable — only the dropdown label is bare.

## 10d. Before uploading the full file

~~DESTRUCTIVE-RISK NOTE: delete the 10 test drafts first. All 12 test SKUs are also in the full
file, so uploading it while those drafts exist creates duplicates. สินค้าของฉัน -> ยังไม่ลงขาย ->
แบบร่าง -> `เลือกทั้งหมด` -> ลบ. They are drafts, never published, so nothing is lost.~~ **MOOT —
decided 2026-09-13: the owner wiped every old Shopee listing already (fresh start from 0), so there
are no leftover test drafts to collide with a full upload.** See
`04 Design Tools/logs/decisions_20260913.csv`. D0 (see `STATUS_OWARIN-STORE.md`) replaces this
10-draft/full-file sequence with a 2-item proof before the full batch.

Then upload `out/mass_upload_2026-08-30.xlsx` (0.21 MB, limit 3.0 MB) and publish the drafts it
creates with the bulk เผยแพร่ button.

MxG stays grouped — decided: it is not a full magazine, so the volume-number dropdown is the right
shape for it, and the game names live in the description.

## 10e. Description format — house style

The spec block follows OWARI's own format, not a Claude-invented one:

```
「Alan Wake」
■ Platform：Xbox 360
■ Publisher：YK GROUP
■ Genre：Action / RPG
■ Condition：A
```

Full-width `：`, `■` bullets, English labels, title in 「」. A line is omitted when the sheet has no
value for it. The condition legend under 🔴 CONDITION is in English:

```
🔴 CONDITION GRADE
■ S = Mint　■ A = Good
■ B = Visible wear　■ C = Heavy wear
■ D = Damaged
```

Reference, if the wording is ever revisited — neither Japanese shop uses this exact scale:
**AmiAmi** grades A (sealed / looks unopened), A− (no seal by design), B+ (opened, no damage,
complete), B (opened, some dirt or damage, complete), C (damage noticeable or a minor accessory
missing), J (junk — heavy damage, major part missing, or non-functional); there is no S.
**Mandarake** moved to a 10-point numeric scale in May 2024: 10 Mint, 9 Excellent, 8 Great,
7 Good, 6 Average, 5 Decent, 4 Fair, 3 Acceptable, 2 Mediocre, 1 Poor.
The Japanese used-book/auction vocabulary is 美品 / 良品 / 並品 / 難あり / ジャンク.

Grouped listings take one of two shapes:
- publisher tier — one title, shared `Platform` / `Genre` lines, then `■ <publisher>：สภาพ A`
- volume tier — `■ vol 974：Nanashi no Game (NDS)  [A]`, series prefix stripped so the game name
  leads. This is what keeps the game names searchable even though the dropdown label is bare.

## 10f. Fixes after the first real upload (2026-08-31)

Four defects found by OWARI on the live drafts, all mine:

1. **RESTOCK not stripped when other text shared the parenthesis.** The regex only matched
   `(RESTOCK-xx)` at the start of the bracket, so `(Incl. 1 Map・RESTOCK-03)` and
   `(สีทั้งเล่ม・RESTOCK-01)` slipped through. Two consequences: the marker showed in the public
   product name, and dedup saw each copy as a different book — `Biohazard 3：Last Escape` went up
   3 times, `Final Fantasy X International` 3 times, `GAMEMAG SPECIAL vol 27` twice. Now the
   `・RESTOCK-xx` fragment is removed from inside the bracket and the meaningful part is kept
   (`Biohazard 3：Last Escape (Incl. 1 Map)`), so all three collapse to the worst-condition copy.
2. **Option-label collisions ejected rows from their group.** `GAMEMAG BIG SPECIAL vol 1` claimed
   the label `vol 1` and pushed `GAMEMAG ฉบับสูตรเกม vol 1` out to its own listing; same for vol 9.
   GAMEMAG CHEATS & CODE ended up as 5 listings. Labels are now made unique instead: different
   books get their distinguishing name (`BIG SPECIAL vol 1` / `ฉบับสูตรเกม vol 1`), two copies of
   the same book get the condition letter (`vol 9 A` / `vol 9 B`). It is now **one group of 19**.
3. **Series items with no `vol` number were dropped to individual listings** (`GAMEMAG สูตรเกม 1`,
   `GAMEMAG สูตรเกม 1999`). Everything of a Type now stays in its group; the label falls back to
   the distinguishing part of the name.
4. **The ⚠️ 5-line intro block is gone.** The description is now only the spec block, the condition
   grade, and the closing line.

Duplicate listings seen in Shopee for `Pokémon Gold × Silver 250+1` were NOT a build defect — the
file appears once; the same file was uploaded twice. Delete all drafts before re-uploading.

Result: **446 listings — 392 individual + 54 grouped — 937 rows**, 139 held back, 2 without images.

## 11. Changelog

- 2026-10-02 — D-S1..S3 (owner): dedup key title+Publisher+Original+Condition+Copy Flags, identical copies = one row; stock = 1 per row/option; same title with different condition/publisher = options inside ONE grouped listing. Builder adopted them (576 → uploaded 509 new after skip list).
- 2026-10-02 — skip list `Shopee/skip_skus.txt` (parent SKUs already live; regenerated to all 584 live SKUs at 07:4x) so a rebuild never re-uploads live items
- 2026-10-02 — SPX rule: column AJ (SPX Express) = ปิด when the top price > 2000 THB (3 items were blocked at publish)
- 2026-10-02 — condition rule: grade S (all members) = ของใหม่ (condition 1); every other grade, and any group that is not all-S = ของมือสอง (4). Applied live to 587 listings via update_product_info (582 used / 5 new)
- 2026-10-02 — spelling: "เกม เฉลยเกม คู่มือเกม" (no ส์). SUFFIX in builder line 21; 510 live names renamed via update_product_info {name}
- 2026-10-02 — 3 duplicate SKUs (Chaos Legion / Crusaders / Alan Wake): new copies hidden, old kept (sales 0)
- 2026-10-02 — CORRECTION: §2/§10d "owner wiped all old listings" is outdated — 75 old listings existed (64 skipped by the build + 11 re-uploaded/duplicated); the shop now holds 584 live listings
- 2026-08-31 — condition grade compacted to 3 lines (kept vertical: a single line wraps unpredictably on mobile)
- 2026-08-31 — fixed RESTOCK stripping, option-label collisions, no-vol items, and removed the intro block
- 2026-08-31 — condition legend finalised in English, one grade per line
- 2026-08-31 — REMOVED the line `※ หนังสือมีกาวเสื่อมจากสัน แต่หน้ายังอยู่ครบค่ะ`. It came from
  `Shopee Details.txt` but is a note about ONE specific book, not a shop-wide statement; copying it
  onto all 468 listings would have claimed every book has spine glue damage. Never reuse a
  per-item note as template text
- 2026-08-31 — description switched to the house 「」/■ format; Parent SKU now filled
- 2026-08-30 — MxG confirmed grouped; full file rebuilt on refreshed prices and re-validated clean
- 2026-08-30 — MEGA MONTH prices changed in the sheet; re-exported and rebuilt, totals unchanged
- 2026-08-30 — test upload 10/10 succeeded; learned that mass upload lands products as drafts
- 2026-08-30 — builder written and run, output validated
- 2026-08-30 — plan created; route decided (relist, not edit-in-place); grouping bound to the `Type`
  column; price source corrected to `Market Place Price`; constants read from live listing
  58155948810; scope of this round fixed to ready-to-sell only.
