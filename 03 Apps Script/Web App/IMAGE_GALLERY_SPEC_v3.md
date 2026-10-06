# OWARIN STORE — Book Image Gallery · Build Spec v3

**Replaces v2.** Change: image sources narrowed to **`All Products/GGB-All` + `All Products/Magazine`** only. Everything else on disk (`NA - GGB`, `Main Post New`, `New Arrival List`) is retired design and is not read.
Companion to `owarin-webapp-plan_v4.1-EN.md` (P1 delivered). No pricing/SKU logic is touched.

**Locked scope:** extend `Index.html` (Apps Script) · **Instock only** · **all photos per book** · buttons = **copy whole set** + **download**.

---

## 1. Verdict on the 2-folder restriction

**It costs nothing.** Measured both ways against the same matcher:

| Source set | Instock covered | Images |
|---|---|---|
| GGB-All only | 443 / 465 (95.3%) | 801 |
| **GGB-All + Magazine** | **453 / 465 (97.4%)** | **809** |
| + `NA - GGB` + `Main Post New` | 453 / 465 (97.4%) | 808 |

Adding the retired folders back rescues **zero** additional books — every book they could serve is already served by `GGB-All` or `Magazine`. Drop them.

`GGB-All/OLD PRESET` was also tested in isolation: **0 books**, 0 images used. It is excluded by default (`RETIRED_SUBDIRS`), flippable in one line if that ever changes.

---

## 2. Corrections v2 → v3

| v2 | v3 | Why it mattered |
|---|---|---|
| 9 hand-listed source dirs | **2 roots**, walked recursively | Simpler, and the hand-list was already drifting from disk |
| Walker keyed on a fixed priority-dir list | **Leaf-detection walker** (§4.1) | v2's walker named loose files in a category folder after the *category* — `GGB - GAMEMAG SPECIAL/x (1).jpg` became item `GGB - GAMEMAG SPECIAL`. Silent, and it inflated/deflated counts unpredictably |
| `canon()` = pad RESTOCK, then normalise dashes | **normalise dashes first, pad RESTOCK last** | The v2 order rewrote `restock-01` → `restock - 01`, which broke the tier-B regex. Tier B silently scored **0 instead of 8**, and 8 books were reported as "no photo" when their base copy had photos |
| coverage 453/465 · 12 no-photo · ~815 imgs | 453/465 · 12 no-photo · **809 imgs** | numbers now reproduce exactly under one walker |
| paths `All Products/GGB All/…` | `All Products/GGB-All/…`; `Magazine - Gundam` now lives **inside** `Magazine/` | disk was renamed since v2 |

---

## 3. Ground truth (15 Aug 2026, `GAME GUIDE BOOKS.csv.csv` + live disk scan)

Sheet: 1,298 rows — Instock **465** · Auction 400 · Sold 422 · Retake 8 · Hold 1. Product IDs unique, never blank.

Scan of the 2 roots: **2,291 images**, 903 item directories, 23 category directories.

```
Tier A  canonical exact ................ 441
Tier B  RESTOCK ↔ base copy ............   8   (flagged, §4.3)
Tier D  fuzzy + digit guard, confirmed ..   4
                                        ─────
        covered ....................... 453  (97.4%)
        no photo anywhere .............  12
        images to publish ............. 809
        served from GGB-All 440 books · Magazine 13 books
```

**Tier D — the 4 proposals** (all genuine typos in the folder name):

| Sheet | Folder |
|---|---|
| `GAMEMAG SPECIAL vol 27 - Final Fantasy VII × … (RESTOCK-01)` | `… Final Fant**a**y VII × … (RESTOCK-01)` |
| `GAMEMAG SPECIAL vol 27 - Final Fantasy VII × … (RESTOCK-02)` | `… Final Fant**a**y VII × … (RESTOCK-02)` |
| `GAMEMAG SPECIAL vol 55 - Final Fantasy VII × Final Fantasy VIII` | `… Final Fant**a**y VII × Final Fantasy VIII` |
| `Pokémon Crystal Encyclopedia` | `Pokémon Crystal **-** Encyclopedia` |

**The 12 with no photo:** `Dragon Ball Z - Attack of the Saiyans` · `GAMEMAG BIG SPECIAL vol 1` · `GAMEMAG SPECIAL vol 45 - Street Fighter` · `GAMEMAG TOP SECRET - Castlevania - Curse of Darkness` · `GAMEMAG TOP SECRET - Final Fantasy X-2` · `GAMEMAG ฉบับสูตรเกม vol 2, 3, 4, 7, 8, 12` · `Yu-Gi-Oh! II (RESTOCK-01)`
→ 6 of 12 are one `GAMEMAG ฉบับสูตรเกม` shoot.

**Measured encode sizes** (14-image sample, PIL 12.2, LANCZOS):

| Variant | avg | total | use |
|---|---|---|---|
| 1024 max-side JPEG q82 | 148 KB | **120 MB** (809) | full image — shareable, downloadable |
| 192 max-side WebP q72 | ~6 KB | **2.7 MB** (453) | list thumbnail |
| *1024 WebP q80* | *83 KB* | *67 MB* | optional `--webp-full`, not default |

New R2 usage **~123 MB**; with existing `catalog/` (60 MB) + `library/` (308 MB) → **~490 MB = 4.8% of the 10 GB free tier**.

---

## 4. Matcher — `image_match.py`

New file; does not replace `prepare_r2_upload.py` (which keeps feeding the Meta catalog).

### 4.1 Walk rule — leaf detection

```
ROOTS           = ["All Products/GGB-All", "All Products/Magazine"]   # priority 1, 2
RETIRED_SUBDIRS = ["OLD PRESET"]

for every directory D under a root that directly contains images:
    stems = { strip_page_suffix(filename) for each image in D }      # "X (3).jpg" -> "X"
    if len(canon(stems)) == 1 and D is not the root itself:
        D is an ITEM dir      -> item name = basename(D)             # folder name wins
    else:
        D is a CATEGORY dir   -> item name = each file's own stem
page index = the (N) in the filename, default 1
```

The discriminator is data, not a hard-coded list, so a new folder shaped either way just works.
**Folder name beats filename inside an item dir** — 49 item dirs have filenames that disagree with the folder (`Dragon Quest IX_ Sentinels…` vs `Dragon Quest IX - Sentinels…`, `Beat Down- Fists…`, and one folder whose file is named with the *wrong* RESTOCK number). The folder name is the one the operator maintains against the sheet.

A book's images never mix roots: take the lowest-priority-number root that yields any image for that item, use only those.

### 4.2 Normalisation — order is load-bearing

```python
def canon(s):
    s = casefold(collapse_ws(s))
    s = sub(r"[_:：]", " ", s)
    s = sub(r"[「」『』\"']", "", s)
    s = sub(r"\s*[-–—]\s*", " - ", s)                                  # 1. dashes
    s = sub(r"restock\s*-\s*0*(\d+)", lambda m: "RESTOCK-%02d" % int(m[1]), s)   # 2. THEN pad
    return collapse_ws(s)

def bse(s):   # strip the copy marker
    s = canon(s)
    s = sub(r"\s*[（(]\s*(?:[^)（）]*?・)?RESTOCK-\d+\s*[)）]", "", s)
    return sub(r"・RESTOCK-\d+", "", s).strip()

def sig(s):   # guard signature
    b = bse(s)
    return (sorted(digit_runs(b)), sorted(roman_numerals(b)))
```

**Required unit test — this exact case is why v2's numbers were wrong:**

```python
assert canon("Final Fantasy XIII (RESTOCK-1)") == "final fantasy xiii (RESTOCK-01)"
assert bse  ("Final Fantasy XIII (RESTOCK-01)") == "final fantasy xiii"
assert bse  ("GAMEMAG SPECIAL vol 27 (สีทั้งเล่ม・RESTOCK-02)") == "gamemag special vol 27"
assert sig("…vol 2") != sig("…vol 9") and sig("Yu-Gi-Oh! II") != sig("Yu-Gi-Oh! III")
```

### 4.3 Tiers — first hit wins

| Tier | Rule | Auto-apply | Flagged in manifest |
|---|---|---|---|
| **C** | `image_overrides.csv` (`Product ID, source path`) — hand-written, checked first | yes | yes |
| **A** | `canon(sheet) == canon(folder)` | yes | no |
| **B** | `bse(sheet) == bse(folder)` — a RESTOCK copy borrows the base copy's photos | yes | **yes** |
| **D** | `difflib ≥ 0.86` **AND `sig(candidate) == sig(sheet)`** | **no — CSV only** | — |

**Tier B must be flagged.** It borrows another physical copy's photos, and copies are graded S/A/B/C/D independently — the photo may not represent the condition being sold. It earns its place (8 books, including a reverse case where the base book `Radiata Stories` borrows from `Radiata Stories (RESTOCK-01)`), but the UI shows a "verify" marker and the operator can override it away.

**Tier D never writes to the manifest.** Without the `sig` guard, naive fuzzy proposed 12 matches of which **8 were the wrong book** — `ฉบับสูตรเกม vol 2 → vol 9`, `vol 12 → vol 1`, `Yu-Gi-Oh! II → III`, `BIG SPECIAL vol 1 → vol 6`. With the guard: 4 proposals, all correct, 8 blocked. A wrong cover shown to a customer is worse than no cover. The operator promotes an accepted row into `image_overrides.csv`, so every fuzzy decision is a one-line auditable diff.

### 4.4 Outputs — all under `_r2_upload/`

```
gallery/<PID>/01.jpg …       1024 max-side JPEG q82, EXIF stripped
gallery/thumb/<PID>.webp     192 max-side WebP q72 (page 01 only)
index/gallery.json           manifest (§5)
g/index.html                 standalone viewer (§7)
qc_summary.txt               tier counts + delta vs previous run
qc_missing_photo.csv         Instock with zero images  -> shoot list
qc_fuzzy_review.csv          tier-D proposals          -> human decision
qc_orphan.csv                image folders with no sheet row
qc_flagged.csv               tier B/C matches          -> spot-check list
```

### 4.5 Guards

- `--resume` default: skip an output newer than its source. `--dry-run`: QC CSVs only. `--limit N`.
- **Hard fail** if the newest of `_r2_upload/Update.csv` / `GAME GUIDE BOOKS.csv` is > 7 days old (`--stale-ok` to override). Not advice — the current export has `Type` empty in all 1,298 rows while the live sheet has it populated, i.e. a stale CSV silently hides stock.
- Assert every resolved output path is inside `_r2_upload/` before any write. **Never writes inside `All Products/`.**
- Deterministic: same inputs → byte-identical `gallery.json` (sorted keys; the only timestamp is the top-level `v`).

---

## 5. `gallery.json`

```json
{
  "v": "2026-08-15T22:10:00+07:00",
  "b": "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/gallery/",
  "n": { "OWA-GGBF027YKAR01": 4, "OWA-GGBA013YKAR02": 1 },
  "w": ["OWA-GGBF027YKAR01"]
}
```

`n` = Product ID → image count. `w` = IDs matched by tier B or C. That is the entire index — **453 entries ≈ 11 KB raw, ~4 KB gzipped.**

The client derives everything; no URLs or filenames are stored:

```js
full  = `${b}${pid}/${String(i+1).padStart(2,'0')}.jpg`
thumb = `${b}thumb/${pid}.webp`
name  = `${itemName} (${i+1}).jpg`      // itemName from the sheet — what the customer should see
```

Normalising uploads to `01.jpg … NN.jpg` *is* the contract; that is what removes the need for a `files[]` array.

---

## 6. R2 — layout, CORS, cache

```
owarin-images/
  gallery/<PID>/NN.jpg      new   ~120 MB
  gallery/thumb/<PID>.webp  new   ~2.7 MB
  index/gallery.json        new   ~11 KB
  g/index.html              new   ~6 KB
  catalog/  library/        existing, untouched
```

A new namespace rather than reusing `library/`: ASCII-only keys (library keys hold spaces, `｜`, `⨯`, `・`, Thai — three-layer encoding that breaks when pasted into chat), Instock-only, `rclone purge gallery/<PID>` on sale, and per-book counts implicit in the layout.

**CORS** (Dashboard → R2 → `owarin-images` → Settings → CORS Policy). Needed for download/zip; plain `<img>` display does not need it.

```json
[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],
  "AllowedHeaders":["*"],"ExposeHeaders":["Content-Length","Content-Type"],
  "MaxAgeSeconds":86400}]
```

`*` is required, not lazy: the Apps Script iframe origin is `https://n-<random>.googleusercontent.com`, regenerated per deployment. The bucket is already public; this grants no new read access.

**Upload**

```powershell
cd "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\_r2_upload"
rclone copy gallery r2:owarin-images/gallery --progress --transfers=8 `
  --header-upload "Cache-Control: public, max-age=2592000"
rclone copy index   r2:owarin-images/index --header-upload "Cache-Control: public, max-age=60"
rclone copy g       r2:owarin-images/g     --header-upload "Cache-Control: public, max-age=300"
```

Replacing a photo in place: `rclone purge gallery/<PID>` then re-copy — never silently overwrite a 30-day-cached key.

**Gate before touching the web app** — all three must pass:
1. `…/gallery/OWA-GGBF027YKAR01/01.jpg` opens on a phone.
2. `…/index/gallery.json` returns JSON.
3. Console: `fetch('…/gallery/OWA-GGBF027YKAR01/01.jpg').then(r=>r.blob()).then(b=>console.log(b.size))` → a number, not a CORS error.

---

## 7. `g/index.html` — standalone viewer on R2

~6 KB static page; reads `#<PID>` from the hash, fetches `gallery.json`, renders the gallery. One artifact, three problems solved:

1. **Top-level context** — outside the Apps Script sandbox, so `navigator.clipboard.write(ClipboardItem)` and right-click → Copy image work natively (§8.3).
2. **One shareable link per book** — `…/g/#OWA-GGBF027YKAR01` beats pasting 4 raw image URLs into Messenger.
3. **No deploy coupling** — updating it is an `rclone copy`, never an Apps Script version bump.

Requirements: plan v4.1 §2.1 design tokens · no framework · lazy `<img>` · `← → Esc` · per-image **Copy image** (canvas → PNG) and **Download** · degrades to a plain image list if `gallery.json` is unreachable.

---

## 8. Web app changes

### 8.1 `WebApp.gs`
One new action `getImageConfig()` → `{base, manifestUrl, viewerUrl}`, all derived from the existing `R2_PUBLIC_URL` (`Code.gs:2724`). Moving to a custom domain later stays a one-line edit.

### 8.2 `Index.html`

| Area | Spec |
|---|---|
| Manifest load | one `fetch(manifestUrl, {cache:'no-cache'})` in parallel with the existing inventory index. **On failure the app behaves exactly as today, minus images** — never block the list on the network |
| List row | `<img>` 48×64, `loading="lazy"`, `decoding="async"`, explicit `width`/`height` (no CLS), WebP thumb. Count badge `×4` only when `n > 1` |
| No image | grey frame + faint 📷 — never a broken-image icon |
| `w` flagged | thin gold left border, `title="matched by fallback — verify"` |
| Long list | `content-visibility:auto; contain-intrinsic-size:0 72px` on rows — keeps 465 rows off layout/paint without a virtualiser |
| Detail | horizontal filmstrip of all pages → lightbox: swipe, `‹ ›`, `Esc`/backdrop close, `2 / 4` counter. Full JPEGs load **only** on lightbox open; preload neighbour ±1 |
| New filter | `Photos: all / has / none` — retires the `pocketbook_need_photo.csv` workflow |
| Style | plan v4.1 §2.1 tokens · radius 0 · hairline borders · no shadows |

**Performance budget — must hold on a mid-range phone over 4G:**

| | budget | mechanism |
|---|---|---|
| added payload at app start | **< 15 KB** | manifest only (~4 KB gzipped) |
| added payload, first screen | **< 80 KB** | ~10 lazy thumbs × 6 KB |
| full-size bytes before a tap | **0** | lightbox-only loading |
| added main-thread work | negligible | one `JSON.parse` of 11 KB |

Putting full 1024 JPEGs in the list would be 120 MB. The thumb tier is the entire reason this ships on mobile.

### 8.3 Copy & download

| Want | In the Apps Script iframe | Approach |
|---|---|---|
| Copy set as text | ✅ reliable | `navigator.clipboard.writeText` + `execCommand('copy')` fallback — the pattern P1 already ships |
| Copy an image file | ⚠️ not reliable | cross-origin iframes need `allow="clipboard-write"`, which HtmlService cannot set; one item only, PNG only. **Not built here** — it lives in `g/index.html` (§7) |
| Download one image | ✅ | `<a download>` is ignored cross-origin → `fetch → blob → createObjectURL → a.download → revokeObjectURL` (needs §6 CORS) |
| Download the set | ✅ | JSZip from cdnjs, sequential fetch + progress line, **`STORE`** compression (JPEG is already compressed; deflate burns CPU for ~0%), filename `<Item name>.zip` |

Buttons on the detail view:

```
🔗 Copy gallery link      …/g/#OWA-GGBF027YKAR01           ← primary
📋 Copy all image links   title line + one URL per page    ← fallback
⬇️ Download .zip          4 files · original naming
🖼️ Open gallery page      window.open(viewerUrl+'#'+pid,'_blank')
```

`🔗 Copy gallery link` is the recommended customer-facing action: one line in chat, all pages, no per-image paste loop, zero browser-capability surface. Bulk-select mode (P2) emits one block per selected book — directly usable for NEW ARRIVAL posts.

---

## 9. Sheet integration

Add header **`Image Count`** to `GAME GUIDE BOOKS` (header-driven, any position — house rule). A `Code.gs` menu action reads `gallery.json` and fills it. `Image Count = 0` becomes the photography queue, visible in the sheet with no CSV round-trip.

*Forward note:* the `Magazine` root also covers the separate **MAGAZINE** inventory sheet. Nothing in this pipeline is GGB-specific — pointing the matcher at that sheet later needs no code change, only a config line.

---

## 10. Phases & gates

| # | Deliverable | Gate | Est |
|---|---|---|---|
| **I1** | `image_match.py`, `--dry-run` only | `qc_summary.txt` reproduces **A 441 / B 8 / D 4 / no-photo 12** on a *fresh* export, and §4.2's unit tests pass | 3 h |
| **I2** | encode + `gallery.json` + `g/index.html` + CORS + upload | the three checks in §6 pass | 2 h + upload |
| **I3** | `Index.html` thumbs, filmstrip, lightbox, photo filter | §8.2 budget met on a real phone; manifest-fetch failure degrades cleanly | 4 h |
| **I4** | copy + download + zip; copy-image in `g/index.html` | copied link renders in Messenger; zip extracts with correct names/count | 3 h |
| **I5** | `Image Count` column; refresh README + `cloudflare-r2-guide.md` (357 → real); rewrite the routine | operator adds a photo and sees it in the app **with no deploy** | 2 h |

**Start with I1 `--dry-run` alone.** It writes nothing outside `_r2_upload/`, touches no R2 object and no web app file. If the tier counts match this document, every downstream assumption is confirmed; if not, the fix is localised to the matcher before anything else exists.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Folder name is an implicit contract; renaming a book in the sheet silently orphans its photos | `qc_missing_photo.csv` + `qc_orphan.csv` every run. Long term: rename folders to Product ID via the existing `folder_renamer.py` — kills the class of bug (separate project) |
| Tier D auto-applied by a future edit | Enforced in code: tier D writes only to CSV; the manifest writer rejects any entry whose tier is `D` |
| Tier B shows another copy's condition | Flagged in `w`, surfaced in the UI, listed in `qc_flagged.csv`, overridable |
| A `canon()` edit silently breaks a tier again | §4.2 unit tests run at the top of every invocation, not just in CI |
| `r2.dev` request limits | Fine for shop-internal use; attach a custom domain and edit `R2_PUBLIC_URL` — one line, old links keep working |
| Stale CSV hides new stock | 7-day hard fail |
| R2 grows as stock turns over | `gallery/` is Instock-only and regenerated each run; switch `copy`→`sync` in I5 once trusted (`sync` deletes — not before) |
| Code changes need a new `/exec` version | Unchanged for code; **adding photos needs no deploy** — the point of §5/§6 |
