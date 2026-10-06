# PLAN 2026-10-07 — B1: OWARIN STORE repo / data split

Rules version 2026-10-07 · D41 (source: github owaowarin/ads-optimizer `AGENTS.md`). Written by Claude (cloud · Opus) from the inventory below.
**Approval:** this PLAN + the owner's prompt that points to it = approval for every block here (ads-optimizer AGENTS § Plan discipline). Anything not covered here, or any unplanned destructive step → stop and ask.
Scripts live in the ads-optimizer clone: `C:\Users\JIN\ads-optimizer\tools\pc\` (`b1-inventory.ps1`, `b1-split.ps1`, `b1-store-commit.ps1`). Labels: **AI default** = Claude's proposal, the owner may change it.

## 0. Facts (inventory 2026-10-07 02:13, ads-optimizer `_logs/B1_inventory_2026-10-07.csv`, commit `baa72c0`)
Source: `C:\Users\JIN\Desktop\etc\OWARIN\OWARIN STORE` = **47,716 files · 8.03 GB (7.48 GiB) · 10,305 folders · 0 read errors · 0 links**.

| Top level | Files | Size | Newest | What |
|---|---:|---:|---|---|
| `OWARIN STORE\` (inner work folder) | 22,904 | 7.73 GB | 2026-10-06 | live work: docs, Apps Script, design tools, Shopee builder + all media |
| `OWARIN WEB\owarin-retro-guides_1` | 24,748 | 0.27 GB | 2026-07-18 | git repo (web); 24,083 files are `node_modules` |
| `outputs\marketplace-price-check` | 12 | 36 MB | 2026-09-21 | data output |
| `OWARIN AFFILIATE` | 9 | 0.3 MB | 2026-03-23 | small, unknown type |
| `OWARIN Back House LAB` | 31 | 0.2 MB | 2026-09-14 | git repo, **0 commits** |
| `00 Docs` (outer) + 10 root files | 12 | 18 KB | 2026-09-24 | old outer-level docs |

Inner `OWARIN STORE\`: `All Products` 3.08 GB · `_r2_upload` 2.37 GB · `GGB Online Files` 1.48 GB (incl. the only 2 files > 100 MB: a 541 MB `.bin` and a 419 MB `.iso` under `Games\`) · `04 Design Tools` 341 MB (incl. vendored `.r2-worker-deps`) · `_fb_albums` 281 MB · `Supplier` 128 MB · `Facebook - Catalouge Project` 34 MB · `_exports` 6 MB · `03 Apps Script` 6 MB · `00 Docs` 4 MB · `Shopee` 2 MB · `Claude outputs` 1.5 MB · `_archive` 1 MB · `AI Usage Widget` 0.9 MB · `Facebook - Group` · `credential` · `.claude` · 6 root files (incl. live `AGENTS.md`, `CLAUDE.md`).
Extension mix (outside `.git`): 17,074 `.jpg` 4.41 GB · 692 `.png` 1.48 GB · 20 `.pdf` 0.52 GB · then code/deps (`.js` 10,803, `.ts` 4,571, `.map` 3,500, `.py` 805, `.gs` 412, `.md` 1,105).

**Git repos**
- `OWARIN WEB\owarin-retro-guides_1`: branch `main`, remote `github.com/owaowarin/owarin-retro-guides_1`, last commit `4a77ea6` 2026-04-08, 38 commits, clean, 1 untracked, in sync with remote (0/0). **`.env` is tracked and pushed** (in GitHub history).
- `OWARIN Back House LAB`: `git init` only — no commit, no remote, no `.gitignore`, 8 untracked → **no backup of any kind**.

**Secrets (names/sizes only, never opened)** — 3 real, 170 false positives (product names "GAMEMAG TOP SECRET", library files such as `credentials.py`, `cacert.pem`, `node_modules\*token*`):
1. `OWARIN STORE\credential\owarin-store-api-3588e4e975d7.json` (2,380 B, Google service-account key file)
2. `OWARIN WEB\owarin-retro-guides_1\.env` (291 B) — tracked in git, pushed
3. **New:** `OWARIN STORE\_archive\_to_delete\20260913\cloudflare token.txt` (201 B) — plain-text token in a folder named "to delete"

Old OWARIN STORE handoff (2026-09-12, copied to ads-optimizer `_cp/B1_input/`): project rules there are business rules (Shopee listing, sheet) — they move with `CLAUDE.md`/`00 Docs` unchanged; only the path/OneDrive/D36–D41 parts change (B1-D).

## 1. Pipeline chart (design starts here)
```
Google Sheet (GAME GUIDE BOOKS) ──► 03 Apps Script (.gs) ──► sheet fixes / exports ──► _exports
        │
        ▼
Product photos ── All Products (by snapshot date) ──► 04 Design Tools (Python) ──► _r2_upload ──► Cloudflare R2 ──► OWARIN WEB site (owarin-retro-guides_1)
        │                                                    └──► _fb_albums / Facebook - Catalouge Project ──► Facebook
        └──► Shopee\build_shopee_upload.py ──► Shopee\out\*.xlsx ──► Shopee Mass Upload
Supplier / GGB Online Files = reference media · outputs\marketplace-price-check = price research
Keys: credential\*.json (Google API) · cloudflare token (R2) · .env (web)
```
Split rule read off the chart: **code + docs** (the arrows) → git; **media + data** (the boxes they read/write) → `OWARIN-DATA`; **keys** → secrets folder; the tools keep working because each media folder stays reachable at its old name inside the repo folder through a **junction** (AI default).

## 2. Target layout
| Where (PC) | What | Git / GitHub |
|---|---|---|
| `C:\Users\JIN\owarin-store\` | inner `OWARIN STORE\` code + docs: `00 Docs`, `03 Apps Script`, `04 Design Tools`, `Shopee`, `Claude outputs`, `AI Usage Widget`, `Facebook - Group`, `.claude`, root files (`AGENTS.md`, `CLAUDE.md`, …); outer `00 Docs` + root files → `_from-outer-root\` | **owaowarin/owarin-store** (private, created 2026-10-07); `.gitignore` in this repo |
| `C:\Users\JIN\owarin-store\<media name>` | **junctions** → `C:\Users\JIN\OWARIN-DATA\<media name>` (7 folders below) — relative paths in tools keep working | ignored |
| `C:\Users\JIN\owarin-retro-guides_1\` | web repo, moved whole (history + `node_modules` intact) | owaowarin/owarin-retro-guides_1 (exists, private) |
| `C:\Users\JIN\owarin-back-house-lab\` | Back House LAB, moved whole (its `.git` kept) | none yet → open item 3 |
| `C:\Users\JIN\OWARIN-DATA\` | `All Products`, `_r2_upload`, `GGB Online Files`, `_fb_albums`, `Supplier`, `_exports`, `Facebook - Catalouge Project`, `outputs`, `OWARIN AFFILIATE`, `_logs\` | never in git |
| `C:\Users\JIN\Documents\OWARIN-secrets\` | `owarin-store\credential\owarin-store-api-….json` (moved) · `owarin-store\cloudflare token.txt` (moved) · `owarin-retro-guides_1\.env` (copy; the live `.env` stays in the web repo so the site still builds) | never in git |
| `C:\Users\JIN\_archive\` | `OWARIN STORE-inner-archive_<stamp>\` (old inner `_archive`, minus the token) · `OWARIN STORE-shell_<stamp>\` (the emptied old folder tree) · `_logs\` | never deleted |

`.gitignore` (this repo): the 7 junction names (no trailing `/`), secrets (`.env*`, `credential/`, `*credential*.json`, `*.key`, `*.pem`, `*token*.txt`, `*secret*.json`), media/binaries (`*.jpg … *.node`), data (`*.xlsx`, `*.csv`, `*.ndjson` — AI default: stay on the PC), deps/caches (`node_modules/`, `.r2-worker-deps/`, `__pycache__/`, `*.log`, `*.bak*`, `out/`, `_archive/`), `desktop.ini`, `*.lnk`; `_logs/*.csv` is kept.
`04 Design Tools\logs\…\before*` snapshots are committed as they are and **never edited**.

## 3. Backup needs (no cloud backup exists — D37)
| Item | Today | After B1 |
|---|---|---|
| owarin-store code + docs | none | GitHub private (Block C) ✅ |
| owarin-retro-guides_1 | GitHub ✅ | unchanged |
| Back House LAB | none | **still none** → open item 3 |
| OWARIN-DATA (≈ 7.5 GB) + ignored files inside the repo folder | none | **still none** → open item 4 |
| secrets (3 files) | none | **still none** → open item 5 |

## 4. Steps
| Step | Who · model | What | Done when |
|---|---|---|---|
| **B1-A** | owner (PowerShell) | `b1-split.ps1` (no switch) = **dry-run**: every planned operation with files/bytes/top extensions and status (READY/DONE/COLLISION/MISSING/REVIEW), files that mention old paths/secret files (file + line numbers only), scheduled tasks that point at OWARIN → `ads-optimizer\_logs\B1_dryrun_<stamp>.csv`, commit + push | owner pastes the commit id; Claude checks: 0 not-ready, every top-level entry has a home, path-ref list read |
| **B1-B** | owner (PowerShell) | close Claude Desktop, VS Code, Explorer windows on the folder → `b1-split.ps1 -Apply`. Order: tag `cp/B1-start` → **secrets first** → clone owarin-store → media → inner `_archive` → code/docs into the clone → junctions → the 2 repos (moved whole; HEAD + changed-count compared before/after) → outer leftovers → empty shell to `_archive`. Each move = same-volume rename; per-step files/bytes before = after, `Test-Path` source gone / destination present; stops at the first FAIL; re-run skips DONE steps. Log `B1_moves_<stamp>.csv` → ads-optimizer `_logs`, `OWARIN-DATA\_logs`, `_archive\_logs`, `owarin-store\_logs`; push | log all PASS, moved files = 47,716 (or the dry-run total), old folder gone |
| **B1-C** | owner (PowerShell) | `b1-store-commit.ps1`: `git add -A` in owarin-store; stops (unstages, pushes nothing) on any file > 5 MB, total > 200 MB, a secret-looking file name, or a secret-looking value in a staged file; else commit + push | log PASS, GitHub shows the files |
| **B1-D** | Claude cloud · Opus | bring `AGENTS.md` / `CLAUDE.md` of owarin-store to **Rules version 2026-10-07 · D41**: new paths (repo / OWARIN-DATA / secrets), remove OneDrive (D37), D36 routing line, D38 Thai chat, D39 PC output via a commit to this repo, D40/D41 close-out, plain Thai with full PC paths, `prompts/<task>.md`, `_logs/INCIDENTS.csv`; owner-wide rules stay in `C:\Users\JIN\.claude\CLAUDE.md` (rules-sync block) — project files keep only project rules + the label. Never touch `04 Design Tools\logs\…\before*` | label present once; grep `OneDrive` = 0 outside `logs\…\before*`; owner pulls |
| **B1-E** | Claude Code · Sonnet (this PLAN = approval) | fix every path-ref row from B1-A: absolute old paths → repo-relative or env `OWARIN_DATA` / `OWARIN_SECRETS`; key-file paths → `C:\Users\JIN\Documents\OWARIN-secrets\…`; re-point scheduled tasks; syntax check each file; commit | each listed file re-grepped clean; each tool's smoke run named in the commit |
| **B1-F** | owner (clicks) | re-add the project folder `C:\Users\JIN\owarin-store` in Claude Desktop/Cowork and VS Code; delete stale shortcuts only after checking them | owner confirms |

Rollback: every move is a rename listed in `B1_moves_<stamp>.csv` (source → destination); reverse = move each destination back in reverse order. No step deletes anything.

## 5. Open decisions (owner) — importance · impact · exact action
1. **High · secret exposure:** `.env` of owarin-retro-guides_1 is in GitHub history. Action: tell Claude where the site is hosted; then (a) set the same variables in the host's settings, (b) `git rm --cached .env` + push, (c) rotate every key in it at its provider. AI default: do it right after B1-B.
2. **High · secret exposure:** `cloudflare token.txt` sat in plain text in a "to delete" folder. Action: Cloudflare dashboard → My Profile → API Tokens → find the token → Roll (or Delete if unused); B1-B already moves the file to the secrets folder.
3. **Medium · no backup:** Back House LAB has 0 commits. Action: create private repo `owarin-back-house-lab` at https://github.com/new (Private, no README) → Claude writes a first-commit script with the same guards as Block C. Or say "fold into owarin-store".
4. **High · data loss risk:** OWARIN-DATA (≈ 7.5 GB, single copy). Options: external drive + weekly `robocopy /E` script (AI default), or Cloudflare R2 bucket (already used for `_r2_upload`), or Google Drive (needs ≥ 8 GB free). Owner picks; Claude writes the script.
5. **Medium · lock-out risk:** the 3 secrets have no second copy. AI default: store them in a password manager (Bitwarden free), not on a cloud drive in plain text.
6. **Low · disk:** `All Products` keeps dated snapshot folders (`Instock - 22-09-2026`, `Instock - 05-10-2026`, `All - GGB`) with the same images; dedupe could save GBs. Backlog — separate task after B1.
7. **Low:** `OWARIN AFFILIATE` (9 files) goes to OWARIN-DATA (AI default); `*.csv`/`*.xlsx` stay out of git (AI default) — say if any CSV is a config table the tools need in git.
