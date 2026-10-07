# 4 photos to R2 → v44 deploy — handoff (written 2026-10-07 by Opus, Session55)
- **Branch:** `claude/peaceful-brown-1o4cc8`
- **Model to start:** Sonnet · medium for the photo steps — switch to Opus · high at step 3 (v44 review)
- **Read first:** `CLAUDE.md` § Session protocol, `00 Docs/STATE.md`, `00 Docs/HANDOFF_2026-10-07.md` § Session55

## Known facts (do NOT ask the owner again)
| Fact | Source file | Date of evidence |
|---|---|---|
| v43 live = Version 7 (owner PASS); v44 built + tested, NOT deployed | STATE.md, `04 Design Tools/logs/V44-ADD-PERF-20261007-01/` | 2026-10-07 |
| AUDIT §8 Step A items 3–7 done (tabs, `R2 IMAGES`!A2, named range) | owner reply "1-6 เป็นตามที่บอก" | 2026-10-07 |
| Add duration after Step A: 11.796 s (cold) / 3.852 s vs 3.588 s before → no gain; speed fix = v44 | `04 Design Tools/logs/step-a-add-duration_20261007.csv` | 2026-10-07 |
| Refresh Meta feed: 1,129 ready; 4 Instock PIDs have no R2 photo: OWA-GGBB026INBR01, OWA-GGBY025YKAN00, OWA-GGBY025YKAR01, OWA-MAGH075AMAR01 | HANDOFF_2026-10-07 | 2026-10-07 |
| Local photos existed: `GGB - GAME GUIDE BOOKS\Breath of Fire V：Dragon Quarter (RESTOCK-01)\` (2 jpg); `Hobby\Hobby Model\HOBBY SEXY 1999 - 01 (RESTOCK-01) (1).jpg`; Yu-Gi-Oh has two folders `Yu-Gi-Oh! GX：Tag Force Evolution` and mis-spaced `Yu-Gi-Oh! GX ：Tag Force Evolution`, and NO `(RESTOCK-01)` folder | `04 Design Tools/logs/image-inventory-cache.json` | 2026-09-25 (may be stale; owner says names may have been edited) |
| Photo library moved in B1: `C:\Users\JIN\OWARIN-DATA\All Products` (= `C:\Users\JIN\owarin-store\All Products`) | `_logs/B1_moves_2026-10-07_024209.csv` #5, #30 | 2026-10-07 |

## Unknown — cloud cannot see it
- Which of the 4 PIDs the uploader can bind to a folder now → owner runs the dry-run below; read the `=== Plan ===` block and the plan CSV path it prints (owner commits that CSV if detail is needed).

## First owner action (exactly one)
```
cd "C:\Users\JIN\owarin-store\04 Design Tools"; .\upload-missing-r2.ps1
```
Owner pastes the lines under `=== Plan ===`.

## Then, in order
1. If the plan lists UPLOAD for all 4 → `.\upload-missing-r2.ps1 -Commit` → last line must read `read-back identical: True`.
2. If a PID shows SKIP / BINDING-ERROR → fix the folder name to equal the sheet `Item name` letter for letter (likely Yu-Gi-Oh `GX ：` → `GX：`, and a `(RESTOCK-01)` folder) — give the owner one rename at a time, never overwrite; re-run the dry-run. Done when the dry-run lists the 4 as UPLOAD.
3. 📦 Inventory Tools → 🚀 Refresh Meta feed → first popup line `✅ Every Instock product is in the feed (1133)`.
4. Switch to Opus · high → `prompts/v44-review-and-deploy.md` → owner pastes Code.gs + webapp.gs → Deploy → Version 8 → owner adds 1 item, reports `api` Duration vs 3.588 s.
5. Then AUDIT §8 Step B/C (backup file first).

## Do not
- Delete `R2 JOBS` / `IMAGE UPLOADS` before v44 is live.
- Touch FB Album autopost (FBA-PARK-1, parked).
- Send the owner to the Desktop or ask them to "look for" files the cache or a dry-run can show.

## Paths (post-B1)
- Repo `C:\Users\JIN\owarin-store` · photos `C:\Users\JIN\OWARIN-DATA\All Products` · tools `C:\Users\JIN\owarin-store\04 Design Tools` · Desktop\etc path is dead.
