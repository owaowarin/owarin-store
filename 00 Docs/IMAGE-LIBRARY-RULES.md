# OWARIN — product image library rules (Downloads → All Products)

**Prepared:** 2026-09-12 (Saturday), from the owner's machine date. **English rewrite:** 2026-10-07 (S55-RULES-1); Thai original kept verbatim at `00 Docs/_archive/rules/IMAGE-LIBRARY-RULES_TH_2026-09-13_pre-S55.md`.
**Source:** the real folders (4 categories), `C:\Users\JIN\Downloads` and the live GAME GUIDE BOOKS sheet were read; nothing guessed from file names.
**S55 corrections (checked against code 2026-10-07):** the library roots are `All - GGB` and `All - MAGAZINE` (`image-library.ps1`, `new-arrivals-to-folders.ps1`), not `GGB-All` / `Magazine` as the 2026-09 text said; since B1 the library lives in `C:\Users\JIN\OWARIN-DATA\All Products` (same as `C:\Users\JIN\owarin-store\All Products`, junction); R2 upload = `upload-missing-r2.ps1` (never `rclone sync` on `library/`).

---

## 1. Image path

```
C:\Users\JIN\Downloads                                  ← temporary inbox; new photos land here first
        ↓ new-arrivals-to-folders.ps1 (by category)
C:\Users\JIN\OWARIN-DATA\All Products\All - GGB\<category>\   ← the real library (magazines: All - MAGAZINE)
        ↓ upload-missing-r2.ps1 (dry-run, then -Commit)
Cloudflare R2 bucket owarin-images (library/<Product ID>/<n>.<ext>)
```

**Downloads is not a destination** — `new-arrivals-to-folders.ps1` moves files from Downloads into `All - GGB` **directly in one step**; it does not stage a structure inside Downloads.

**Limitation:** the script only picks up **loose files** in Downloads. Hand-made folders left in Downloads are not touched; move them separately.

---

## 2. The 4 categories — verified against the real folders

The category comes from the **sheet `Type` column**, never from the file name or the number of photos.

| Sheet `Type` | Destination folder | Structure | Real example |
|---|---|---|---|
| `GAME GUIDE BOOKS` | `GGB - GAME GUIDE BOOKS` | **one folder per book** | `Dino Crisis (RESTOCK-03)\Dino Crisis (RESTOCK-03) (1).png` |
| `GAMEMAG TOP SECRET` | `GGB - GAMEMAG TOP SECRET` | **flat**, no subfolders | `GAMEMAG TOP SECRET - Chrono Trigger (RESTOCK-01) (1).jpg` |
| `GAMEMAG SPECIAL` | `GGB - GAMEMAG SPECIAL` | **flat** | `GAMEMAG SPECIAL vol 05 (RESTOCK-01) (1).jpg` |
| `GAMEMAG CHEATS & CODE` | `GGB - CHEAT & CODE` | **flat** (folder name differs from Type — careful) | `GAMEMAG ฉบับสูตรเกม vol 6 (RESTOCK-02) (1).jpg` |

**Sheet count (2026-09-12, Instock only):** GAME GUIDE BOOKS 450 · GAMEMAG SPECIAL 64 · GAMEMAG CHEATS & CODE 25 · GAMEMAG TOP SECRET 20 = 559.

`POCKET BOOK`, once used in Type, **has no folder in `All - GGB`**; ask the owner first, never create one.

### ⚠️ `MEGA MONTH` is not `GAMEMAG SPECIAL` — different tab, different destination, never mix

`Type` = `MEGA MONTH` belongs to the **MAGAZINE tab** (real magazines; a different line from the GAME GUIDE BOOKS tab that owns the 4 categories above). Its destination is **only `All Products\All - MAGAZINE\…\MEGA MONTH\`**. **Never put a `MEGA MONTH ...` file in `All - GGB`**, even if the name looks like the GAMEMAG pattern. See lesson §6 (2026-09-13): 156 files were mixed once.

---

## 3. Naming rules

1. **File/folder name = the sheet `Item name` value, letter for letter.** The sheet is the source of truth.
2. Every file ends with ` (1)` = front cover, ` (2)` = back cover. **Flat categories also keep ` (1)`; never drop it.**
3. `GAME GUIDE BOOKS`: folder name = file name without the trailing ` (1)` / ` (2)`. **Never touch the file names inside.**
4. **Never convert full-width characters to ASCII** — `：` `／` `×` `⨯` `・` `｜` `–` `＋`. Windows forbids `:` `/` `|` in file names, so the system uses full-width forms everywhere.
5. A single photo (no `(2)`) **does not mean a flat category** — older GAME GUIDE BOOKS items have only a front cover, e.g. `Dino Crisis (RESTOCK-03)`.

### Easy-to-confuse example
Two items in different categories with near-identical names:
- `Final Fantasy X-2 (RESTOCK-05)` → Type `GAME GUIDE BOOKS` → make a folder
- `GAMEMAG TOP SECRET - Final Fantasy X-2 (RESTOCK-01)` → Type `GAMEMAG TOP SECRET` → place flat

---

## 4. Procedure, every time

1. **Export/read the live sheet** first; never use an old export.
2. Compare every file name in Downloads with the sheet `Item name` — must match **100%** before touching files.
3. Run the script as **dry-run** and read the plan table.
4. Check the table by eye; fix every row that is not `NEW`.
5. Run for real with `-Commit` (files go straight into `All - GGB`).
6. Check for hand-made folders left in Downloads; move them separately.
7. Upload to R2: `cd "C:\Users\JIN\owarin-store\04 Design Tools"; .\upload-missing-r2.ps1` (dry-run) → `.\upload-missing-r2.ps1 -Commit` → last line `read-back identical: True` (chain: `00 Docs/LESSONS.md` L5).
8. Update the related documents in the same pass.

Script: `04 Design Tools\new-arrivals-to-folders.ps1`

---

## 5. Safety rules (never skip)

| Rule | Why |
|---|---|
| **Dry-run is the default**; only `-Commit` moves files | Photos are assets; a wrong move is hard to trace |
| **Destination name clash = `CONFLICT`, not moved; never overwrite in any case** | The only layer that truly prevents loss; the rest only helps finding |
| Name not in the sheet = `NOT-IN-SHEET`, stop, do not guess | A wrong name flows into Shopee/FB everywhere |
| Near-duplicates are checked across **Downloads ↔ all 4 categories in `All - GGB`** | The destination is elsewhere from the work folder |
| Write a source → destination CSV log every run | Makes undo possible |

### Dry-run table statuses
`NEW` new · `MERGE` folder exists, files do not clash · `CONFLICT` file clash, not moved · `DUP?` close to an existing name · `NOT-IN-SHEET` not in the sheet · `SKIP` not a product file

### Normalisation for near-duplicate search
lowercase → remove all spaces → remove `：／｜×⨯・,.'-–—_&+()` → treat `RESTOCK-1` and `RESTOCK-01` as the same.

### Always SKIP in Downloads
`desktop.ini` · `.~lock.*#` · `*.zip` · files whose name does not end with ` (1)` / ` (2)` · generic camera photos with numeric names such as `20260121_155442.jpg`

---

## 6. Real lessons

- **Separator drift** — `.hack／／G.U. Vol. 1／Rebirth` (single `／`) vs `.hack／／G.U. Vol. 1／／Rebirth` (`／／`) vs `.hack｜G.U. Vol. 1｜Rebirth` (`｜`) all existed at once. **The correct one is `／／`, per the sheet.**
- **Missing `(1)` tail** — `GAMEMAG TOP SECRET - Final Fantasy X-2 (RESTOCK-01).jpg` in Downloads had no ` (1)` while all 20 files in the real folder had it.
- **Filter left on the sheet** — with a filter on, `gviz/tq` returns only the visible rows, not the whole tab. Check the row count every time before concluding.
- **Wrong RESTOCK number at stock-in** — on 2026-09-12 `Dragon Quest VII (RESTOCK-05)` and `Genso Suikoden III (RESTOCK-01)` were entered although those numbers were taken; correct were `(RESTOCK-06)` and `(RESTOCK-02)`. **A `CONFLICT` in the dry-run is usually a wrong RESTOCK number, not a duplicate file** — check the sheet first, never overwrite.
- **Regex bug in normalise (PowerShell)** — `[regex]::Escape()` **does not escape `-` (ASCII hyphen)**. Put inside a character class `[...]` it becomes a range that eats almost all Unicode; every name normalises to empty and the whole set shows false `DUP?`. **Use alternation `(a|b|c)` instead of a character class** and always test 3 cases: `RESTOCK-1` = `RESTOCK-01` ✓ · `RESTOCK-04` ≠ `RESTOCK-05` ✓ · `.hack／／` = `.hack｜` ✓
- **Script encoding** — save as **UTF-8 with BOM**, otherwise Windows PowerShell 5.1 misreads full-width characters in the source.
- **`MEGA MONTH` mixed into `GGB - GAMEMAG SPECIAL`, 156 files (found 2026-09-13)** — while tracing missing photos of Type `GAMEMAG SPECIAL` (GAME GUIDE BOOKS tab), the `GGB - GAMEMAG SPECIAL` folder held almost only `MEGA MONTH ...` files (156), which are Type `MEGA MONTH` from the **MAGAZINE tab**. SHA-256 matched the existing copies in the magazine `MEGA MONTH` folder 100% (156/156), so the set was moved (not deleted) to `_to_delete\20260913\`. **Never delete real files with rm/del** (SSD + TRIM: deleted files cannot be recovered, proven in another incident); always move to a holding folder and wait for the owner to delete.

---

## 7. Image file extensions

- `library/` keeps the original extension. **Never re-encode, never rename across extensions.**
- Reality on 2026-09-13 (`rclone lsf` over all of `library/`): **jpg only 1,775 PIDs · png only 36 PIDs · mixed 5 PIDs**; no other extension (no jpeg, no upper-case JPG, no webp).
- The index `meta/images.csv` is **`pid,n,ext`** — **every tool that builds an image URL must read the real ext column; never hard-code `.jpg`** (it once made the Shopee builder produce 404 URLs and broke 16 covers in FB Album auto-post — see `04 Design Tools/logs/decisions_20260913.csv`).
- The 5 mixed PIDs:
  - `OWA-GGBS011INAN00` · `OWA-GGBS035SBAN00` · `OWA-GGBS043YKAR02` — different positions, different extensions; normal, no duplicates.
  - `OWA-GGBD045BRBN00` · `OWA-GGBD049FWAN00` — a stray `.png` from 2026-08-29 is an orphan waiting to be moved (not moved yet). **Use `.jpg` only**; byte-identical to the original in the library.
