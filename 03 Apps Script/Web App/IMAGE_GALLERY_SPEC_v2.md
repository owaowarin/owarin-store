# OWARIN STORE — Book Image Gallery · Build Spec v2

**Supersedes** `owarin-image-gallery-plan_I1-I5.md` (v1). v1's matcher scope and photo-gap counts were wrong; corrections in §1.
**Companion to** `owarin-webapp-plan_v4.1-EN.md` (P1 delivered). Touches no pricing/SKU logic.

**Locked scope:** extend existing `Index.html` (Apps Script) · **Instock only** · **all photos per book** · buttons = **copy whole set** + **download**.

---

## 1. What v2 corrects in v1

| Claim in v1 | Verified reality | Impact |
|---|---|---|
| 5 image source dirs | **9** — v1 missed `Magazine/GAMEMAG CHEAT`, `Magazine/GAMEMAG SPECIAL`, `NA - GGB`, `Main Post New` (929 more images) | +13 books matched |
| "26 books need photographing" | **12** | 14 books already had photos in the missed dirs |
| Coverage 439/465 (94.4%) | **453/465 (97.4%)** with a 4th tier | — |
| 780 images to publish | **~815** | +5 MB |
| ~120 MB new storage | **~121 MB** (measured, not estimated) | confirmed |
| Fuzzy matching not considered | **Fuzzy alone is dangerous** — naive `difflib ≥0.86` proposes `vol 2→vol 9`, `vol 12→vol 1`, `Yu-Gi-Oh! II→III`: **8 of 12 proposals were wrong** | §3 adds a mandatory digit/roman guard |
| CSV freshness "may be slightly stale" | **Definitely stale** — `Type` column is empty in all 1,298 rows but populated in the live sheet | re-export is a hard gate, not advice |

Also verified: **Product IDs are unique and never blank** across all 1,296 named rows → safe as the primary key and as an R2 path segment.

---

## 2. Ground truth (measured 15 Aug 2026)

**Sheet** `GAME GUIDE BOOKS` — 1,298 rows: Instock **465** · Auction 400 · Sold 422 · Retake 8 · Hold 1

**Image sources on disk**, in match priority order (1 = most trusted raw photo, 5 = last resort composed post art):

| P | Path under `All Products/` | Layout | Imgs | Instock books served |
|---|---|---|---|---|
| 1 | `GGB All/GGB - POCKET BOOK` | `<title>/<title> (N).jpg` | 1,586 | 363 |
| 1 | `GGB All/GGB - GAMEMAG SPECIAL` | **mixed** — flat `(N).jpg` + subdirs | 100 | 60 |
| 1 | `GGB All/GGB - GAMEMAG TOP SECRET` | subdirs | 37 | 10 |
| 1 | `GGB All/GGB - CHEAT & CODE` | subdirs | 3 | 1 |
| 2 | `Magazine/GAMEMAG CHEAT` | flat | ~40 | 13 |
| 2 | `Magazine/GAMEMAG SPECIAL` | flat | ~60 | 0 |
| 3 | `NA - GGB` | flat | 23 | 1 |
| 4 | `GGB All/OLD PRESET` | subdirs | 74 | 0 |
| 5 | `Main Post New` | flat, some composed art | 440 | 1 |

**Match outcome** — 1,000 distinct item-names / 2,296 images → Instock:

```
Tier A  canonical exact ......... 443
Tier B  RESTOCK base fallback ...   6
Tier C  fuzzy + guard (confirm) ..   4
                                  ────
        covered ................. 453  (97.4%)
        need photographing ......  12
        images to publish ....... ~815
```

**The 12 with no photo anywhere:** `Dragon Ball Z - Attack of the Saiyans` · `GAMEMAG BIG SPECIAL vol 1` · `GAMEMAG SPECIAL vol 45 - Street Fighter` · `GAMEMAG TOP SECRET - Final Fantasy X-2` · `GAMEMAG TOP SECRET - Castlevania - Curse of Darkness` · `GAMEMAG ฉบับสูตรเกม vol 2, 3, 4, 7, 8, 12` · `Yu-Gi-Oh! II (RESTOCK-01)`
→ 6 of 12 are one `GAMEMAG ฉบับสูตรเกม` shoot.

**53 orphan folders / 359 images** have photos but no matching sheet row — several are sheet-side or folder-side typos (`Final Fantay VII`, `resotck-1`, `restock-1` vs `RESTOCK-01`). Tier C recovers 4 of these; the rest go to `qc_orphan.csv` for a human pass.

**Measured encode sizes** (14-image sample, PIL 12.2, LANCZOS):

| Variant | avg | ×815 | verdict |
|---|---|---|---|
| 1024 JPEG q82 | 148 KB | **118 MB** | ✅ full image — universally shareable |
| 1024 WebP q80 | 83 KB | 65 MB | optional `--webp-full`, not default |
| 192 WebP q72 | ~6 KB | **2.7 MB** (453 thumbs) | ✅ list thumbnail |
| 256 JPEG q78 | 14 KB | 6.5 MB | rejected — 2.3× the WebP for no benefit |

New R2 usage **~121 MB**; with existing `catalog/` (60 MB) + `library/` (308 MB) → **~490 MB = 4.8% of the 10 GB free tier.**

---

## 3. Matcher — `image_match.py` (new file, does not replace `prepare_r2_upload.py`)

### 3.1 Normalisation

```python
norm(s)  = collapse whitespace, strip, casefold
canon(s) = norm(s)
           + restock[-\s]*0*(\d+)  →  restock-%02d      # RESTOCK-1 ≡ RESTOCK-01
           + [_:：] → space ; strip 「」『』"'
base(s)  = canon(s) minus trailing (…RESTOCK-nn) and ・RESTOCK-nn
sig(s)   = ( sorted(digit runs in base(s)), sorted(roman numerals in base(s)) )
```

### 3.2 Four tiers — stop at the first hit

| Tier | Rule | Auto-apply? |
|---|---|---|
| **A** | `canon(sheet) == canon(folder)` | yes |
| **B** | `base(sheet) == base(folder)` — RESTOCK copy reuses the base book's photos | yes |
| **C** | `image_overrides.csv` (`Product ID, source path`) — hand-written, wins over A/B | yes |
| **D** | `difflib.get_close_matches(canon, cutoff=0.86)` **AND `sig(candidate) == sig(sheet)`** | **NO — write to `qc_fuzzy_review.csv` only** |

> **The `sig` guard is not optional.** Without it, tier D proposed 12 matches of which **8 were the wrong book** — `GAMEMAG ฉบับสูตรเกม vol 2 → vol 9`, `vol 12 → vol 1`, `Yu-Gi-Oh! II → Yu-Gi-Oh! III`, `BIG SPECIAL vol 1 → vol 6`. With the guard: 4 proposals, all genuine typos, 8 correctly blocked. **A wrong photo shown to a customer is worse than no photo.** Tier D never writes to the manifest; the operator promotes an accepted row into `image_overrides.csv`, making every fuzzy decision an auditable one-line diff.

### 3.3 Source walk

- Iterate the 9 dirs in the §2 priority order; **first priority that yields any image wins** — never mix a book's photos across two source dirs.
- Subdir layout → item name = directory basename; page index from ` (N)` in filename, default 1.
- Flat layout → item name = filename stem **with a trailing ` (N)` stripped** (v1 bug: `GAMEMAG SPECIAL vol 03 (1)` never matched anything).
- Sort a book's images by page index, then by filename; emit as `01.jpg, 02.jpg, …`.

### 3.4 Outputs (all under `_r2_upload/`)

```
gallery/<PID>/01.jpg …           1024 max-side, JPEG q82, EXIF stripped
gallery/thumb/<PID>.webp         192  max-side, WebP q72   (page 01 only)
index/gallery.json               manifest (§4)
g/index.html                     standalone viewer (§6)
qc_summary.txt                   tier counts, deltas vs previous run
qc_missing_photo.csv             Instock, zero images        → shoot list
qc_fuzzy_review.csv              tier-D proposals            → human decision
qc_orphan.csv                    folders with no sheet row
qc_low_confidence.csv            books served from priority ≥3
```

### 3.5 Flags & guards

- `--resume` (default): skip an output that already exists and is newer than its source.
- `--dry-run`: QC CSVs only, no encoding.
- `--limit N`, `--only match|encode|manifest`.
- **Hard fail** if the newest of `_r2_upload/Update.csv` / `GAME GUIDE BOOKS.csv` is > 7 days old — override with `--stale-ok`. (Direct consequence of §1: a stale export silently hides new stock.)
- **Never writes inside `All Products/`.** Assert this on the resolved output path before any write.
- Deterministic: identical inputs → byte-identical `gallery.json` (sorted keys, no timestamps in item entries).

---

## 4. `gallery.json` — compact schema

```json
{
  "v": "2026-08-15T21:40:00+07:00",
  "b": "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/gallery/",
  "n": { "OWA-GGBF027YKAR01": 4, "OWA-GGBA013YKAR02": 1 },
  "w": ["OWA-GGBB013YKAN00"]
}
```

- `n` = Product ID → image count. **That is the whole index.**
- `w` = IDs matched by tier B/C/D or served from priority ≥3 → UI shows a subtle "verify" marker.
- Client derives everything else — no per-image URLs, no filenames stored:
  - full `` `${b}${pid}/${String(i+1).padStart(2,'0')}.jpg` ``
  - thumb `` `${b}thumb/${pid}.webp` ``
  - download name `` `${itemName} (${i+1}).jpg` `` — from the sheet's Item name, which is what the customer should see, not the folder name.
- Size: 453 entries ≈ **11 KB raw, ~4 KB gzipped**. Loads in one request alongside the existing inventory index.
- Storing counts only is what makes the `files[]` array from v1 unnecessary — the `01.jpg…NN.jpg` normalisation *is* the contract.

---

## 5. R2 — layout, CORS, cache

```
owarin-images/
  gallery/<PID>/NN.jpg        new    ~118 MB
  gallery/thumb/<PID>.webp    new    ~2.7 MB
  index/gallery.json          new    ~11 KB
  g/index.html                new    ~6 KB
  catalog/  library/          existing, untouched
```

New namespace rather than reusing `library/` because: ASCII-only paths (`library/` keys contain spaces, `｜`, `⨯`, `・`, Thai — three-layer encoding, breaks when pasted into chat), Instock-only, `rclone purge gallery/<PID>` when a book sells, and per-book counts are implicit in the layout.

**CORS** — Dashboard → R2 → `owarin-images` → Settings → CORS Policy. Required for download/zip; `<img>` display alone does not need it.

```json
[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],
  "AllowedHeaders":["*"],"ExposeHeaders":["Content-Length","Content-Type"],
  "MaxAgeSeconds":86400}]
```

`*` is required, not lazy: the Apps Script iframe origin is `https://n-<random>.googleusercontent.com`, regenerated per deployment. The bucket is already public; this grants no new read access.

**Upload with cache headers** — images are content-stable per key, the manifest is not:

```powershell
cd "C:\Users\JIN\OneDrive\Desktop\etc\OWARIN\OWARIN STORE\_r2_upload"
rclone copy gallery r2:owarin-images/gallery --progress --transfers=8 `
  --header-upload "Cache-Control: public, max-age=2592000"
rclone copy index   r2:owarin-images/index   --header-upload "Cache-Control: public, max-age=60"
rclone copy g       r2:owarin-images/g       --header-upload "Cache-Control: public, max-age=300"
```

Replacing a photo in place: bump the page number or `rclone purge gallery/<PID>` then re-copy — do not silently overwrite a 30-day-cached key.

**Gate before touching the web app** — all three must pass:
1. `…/gallery/OWA-GGBF027YKAR01/01.jpg` opens on a phone.
2. `…/index/gallery.json` returns JSON.
3. In any browser console: `fetch('…/gallery/OWA-GGBF027YKAR01/01.jpg').then(r=>r.blob()).then(b=>console.log(b.size))` → a number, not a CORS error.

---

## 6. `g/index.html` — standalone viewer on R2

A ~6 KB static page: reads `#<PID>` from the hash, fetches `gallery.json`, renders the gallery.

It exists because it solves three problems with one artifact:

1. **Top-level context** — not inside the Apps Script sandbox, so `navigator.clipboard.write(ClipboardItem)` and right-click → Copy image work natively (§7).
2. **One shareable link per book** — `…/g/#OWA-GGBF027YKAR01` is far better to paste into Messenger than 4 raw image URLs.
3. **Zero deploy coupling** — updating it is an `rclone copy`, never an Apps Script version bump.

Requirements: same design tokens as §2.1 of plan v4.1 · works with no JS framework · lazy `<img>` · keyboard `← → Esc` · a per-image **Copy image** button (PNG re-encode via canvas) and **Download** button · degrades to a plain image list if `gallery.json` is unreachable.

---

## 7. Web app changes

### 7.1 `WebApp.gs` — one new action

`getImageConfig()` → `{ base, manifestUrl, viewerUrl }`, all derived from the existing `R2_PUBLIC_URL` constant (`Code.gs:2724`). Moving to a custom domain later stays a one-line edit in `Code.gs`.

### 7.2 `Index.html`

| Area | Spec |
|---|---|
| Manifest load | one `fetch(manifestUrl, {cache:'no-cache'})` in parallel with the existing inventory index load. **On failure the app runs exactly as today, without images** — never block the list on the network. |
| List row | `<img>` 48×64, `loading="lazy"`, `decoding="async"`, explicit `width`/`height` (no CLS), thumb WebP. Count badge `×4` only when `n > 1`. |
| No image | grey frame + faint 📷 — never a broken-image icon. |
| `w` flagged | thin gold left border + `title="matched by fallback — verify"`. |
| Long list | `content-visibility:auto; contain-intrinsic-size:0 72px` on rows — keeps 465 rows off the layout/paint path without a virtualiser. |
| Detail view | horizontal filmstrip of all pages → tap opens lightbox: swipe, `‹ ›`, `Esc`/backdrop close, `2 / 4` counter. Full JPEGs load **only** on lightbox open; preload neighbour ±1 only. |
| New filter | `Photos: all / has / none` — retires the `pocketbook_need_photo.csv` workflow. |
| Style | plan v4.1 §2.1 tokens · radius 0 · hairline borders · no shadows. |

**Performance budget (must hold on a mid-range phone over 4G):**

| | budget | how |
|---|---|---|
| Added payload at app start | **< 15 KB** | manifest only (~4 KB gzipped) |
| Added payload, first screen | **< 80 KB** | ~10 lazy thumbs × 6 KB |
| Full-size bytes before a tap | **0** | lightbox-only loading |
| Added main-thread work at start | negligible | one `JSON.parse` of 11 KB |

Loading full 1024 JPEGs in the list would be 118 MB. The thumb tier is the entire reason this feature is viable on mobile.

### 7.3 Copy & download — constraints and design

| Want | In the Apps Script iframe | Approach |
|---|---|---|
| Copy set as text | ✅ reliable | `navigator.clipboard.writeText` + `execCommand('copy')` fallback — the pattern P1 already ships |
| Copy an image file | ⚠️ not reliable | cross-origin iframes need `allow="clipboard-write"`, which HtmlService does not let us set; Chrome has open bugs even when it is set; only one item, PNG only. **Do not build it here** — it lives in `g/index.html` (§6) |
| Download one image | ✅ | `<a download>` is ignored cross-origin → `fetch → blob → createObjectURL → a.download → revokeObjectURL` (needs §5 CORS) |
| Download the set | ✅ | JSZip from cdnjs, sequential fetch with a progress line, `STORE` compression (JPEGs are already compressed — deflate wastes CPU for ~0% gain), filename `<Item name>.zip` |

**Buttons on the detail view:**

```
🔗 Copy gallery link      https://pub-….r2.dev/g/#OWA-GGBF027YKAR01      ← default
📋 Copy all image links   title line + one URL per page                  ← fallback
⬇️ Download .zip          4 files · original naming · ~600 KB
🖼️ Open gallery page      window.open(viewerUrl + '#' + pid, '_blank')
```

Recommend `🔗 Copy gallery link` as the primary customer-facing action: one line in chat, all pages, no per-image paste loop, and no browser-capability surface at all. Bulk-select mode (from P2) emits one block per selected book — directly usable for NEW ARRIVAL posts.

---

## 8. Sheet integration

Add header **`Image Count`** to `GAME GUIDE BOOKS` (header-driven, any position — house rule). An `Code.gs` menu action reads `gallery.json` and fills it. `Image Count = 0` becomes the photography queue, visible in the sheet with no CSV round-trip.

---

## 9. Phases & gates

| # | Deliverable | Gate | Est |
|---|---|---|---|
| **I1** | `image_match.py`, `--dry-run` only | `qc_summary.txt` reproduces **A 443 / B 6 / D-proposed 4 / missing 12** against a *fresh* export | 3 h |
| **I2** | encode + `gallery.json` + `g/index.html` + CORS + upload | the three checks in §5 all pass | 2 h + upload |
| **I3** | `Index.html` thumbs, filmstrip, lightbox, photo filter | perf budget §7.2 met on a real phone; manifest-fetch failure degrades cleanly | 4 h |
| **I4** | copy + download + zip; `g/index.html` copy-image | copied link renders in Messenger; zip extracts with correct names/count | 3 h |
| **I5** | `Image Count` column, README + `cloudflare-r2-guide.md` refresh (357 → real), routine rewrite | operator adds a photo and sees it in the app **without any deploy** | 2 h |

**Start with I1 `--dry-run` alone.** It writes nothing outside `_r2_upload/`, touches no R2 object and no web app file. If the tier counts match this document, every downstream assumption is confirmed; if not, the fix is localised to the matcher before anything else has been built.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Folder name is an implicit contract; renaming a book in the sheet silently orphans its photos | `qc_missing_photo.csv` + `qc_orphan.csv` catch it every run. Long term: rename folders to Product ID with the existing `folder_renamer.py` — kills the class of bug (separate project) |
| Tier D auto-applied by a future contributor | Enforced in code: tier D writes only to CSV; the manifest writer refuses any entry whose tier is `D` |
| `r2.dev` request limits | Fine for shop-internal use. If customer traffic grows, attach a custom domain and edit `R2_PUBLIC_URL` — one line, old links keep working |
| Stale CSV hides new stock | 7-day hard fail in `image_match.py` |
| R2 grows as stock turns over | `gallery/` is Instock-only and regenerated each run; switch `copy`→`sync` in I5 once the pipeline is trusted (`sync` deletes — do not enable earlier) |
| `/exec` needs a new version per code change | Unchanged for code; **adding photos requires no deploy** — that is the point of §4/§5 |
