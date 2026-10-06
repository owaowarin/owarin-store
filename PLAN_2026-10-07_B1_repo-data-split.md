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
| `C:\Users\JIN\owarin-back-house-lab\` | Back House LAB, moved whole (its `.git` kept); separate project — anything LAB-related goes in this repo (owner 2026-10-07) | **owaowarin/owarin-back-house-lab** (private, created by owner 2026-10-07; `.gitignore` pushed `1f657e0`) |
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
| Back House LAB | none | GitHub private (Block C `-Name owarin-back-house-lab`) ✅ |
| OWARIN-DATA (≈ 7.5 GB) + ignored files inside the repo folder | owner: "probably in R2" — not verified | B1-G checks what R2 really holds; gaps → decision |
| secrets (3 files) | none | none — owner accepts for now (one-person setup), noted |

## 4. Steps
| Step | Who · model | What | Done when |
|---|---|---|---|
| **B1-A** | owner (PowerShell) | `b1-split.ps1` (no switch) = **dry-run**: every planned operation with files/bytes/top extensions and status (READY/DONE/COLLISION/MISSING/REVIEW), files that mention old paths/secret files (file + line numbers only), scheduled tasks that point at OWARIN → `ads-optimizer\_logs\B1_dryrun_<stamp>.csv`, commit + push | owner pastes the commit id; Claude checks: 0 not-ready, every top-level entry has a home, path-ref list read |
| **B1-B** | owner (PowerShell) | close Claude Desktop, VS Code, Explorer windows on the folder → `b1-split.ps1 -Apply`. Order: tag `cp/B1-start` → **secrets first** → clone owarin-store → media → inner `_archive` → code/docs into the clone → junctions → the 2 repos (moved whole; HEAD + changed-count compared before/after) → outer leftovers → empty shell to `_archive`. Each move = same-volume rename; per-step files/bytes before = after, `Test-Path` source gone / destination present; stops at the first FAIL; re-run skips DONE steps. Log `B1_moves_<stamp>.csv` → ads-optimizer `_logs`, `OWARIN-DATA\_logs`, `_archive\_logs`, `owarin-store\_logs`; push | log all PASS, moved files = 47,716 (or the dry-run total), old folder gone |
| **B1-C** | owner (PowerShell) | `b1-store-commit.ps1` (owarin-store), then `b1-store-commit.ps1 -Name owarin-back-house-lab` (adopts GitHub `main` without touching local files, restores only missing GitHub files such as `.gitignore`): `git add -A`; stops (unstages, pushes nothing) on any file > 5 MB, total > 200 MB, a secret-looking file name, or a secret-looking value in a staged file; else commit + push | both logs PASS, GitHub shows the files |
| **B1-D** | Claude cloud · Opus | bring `AGENTS.md` / `CLAUDE.md` of owarin-store to **Rules version 2026-10-07 · D41**: new paths (repo / OWARIN-DATA / secrets), remove OneDrive (D37), D36 routing line, D38 Thai chat, D39 PC output via a commit to this repo, D40/D41 close-out, plain Thai with full PC paths, `prompts/<task>.md`, `_logs/INCIDENTS.csv`; owner-wide rules stay in `C:\Users\JIN\.claude\CLAUDE.md` (rules-sync block) — project files keep only project rules + the label. Never touch `04 Design Tools\logs\…\before*` | label present once; grep `OneDrive` = 0 outside `logs\…\before*`; owner pulls |
| **B1-E** | Claude Code · Sonnet (this PLAN = approval) | fix every path-ref row from B1-A: absolute old paths → repo-relative or env `OWARIN_DATA` / `OWARIN_SECRETS`; key-file paths → `C:\Users\JIN\Documents\OWARIN-secrets\…`; re-point scheduled tasks; syntax check each file; commit | each listed file re-grepped clean; each tool's smoke run named in the commit |
| **B1-F** | owner (clicks) | re-add the project folder `C:\Users\JIN\owarin-store` in Claude Desktop/Cowork and VS Code; delete stale shortcuts only after checking them | owner confirms |
| **B1-G** | Claude cloud · Opus, then owner | R2 coverage: after B1-C, read the R2 uploader in `04 Design Tools` (bucket, key source) → read-only PC script lists R2 object names/sizes and compares them with OWARIN-DATA (names, counts, bytes only) → CSV via commit. Expectation to verify: R2 holds the web images (`_r2_upload`), not raw `All Products` snapshots, `Supplier` or the `GGB Online Files` ISOs | coverage CSV read; owner decides backup for what R2 lacks |
| **B1-H** | owner (PowerShell) | dedupe (owner: "do it", 2026-10-07): `b1-dedupe.ps1` = read-only report (size groups → SHA256; full list stays in `OWARIN-DATA\_logs\`, summary committed) → Claude reviews → `b1-dedupe.ps1 -Apply` turns every extra copy into an NTFS **hard link** to one kept copy: every path and folder snapshot still works, the disk keeps one copy. Per file: re-hash, rename, link, re-hash, then remove the renamed duplicate (identical bytes stay at both paths). Side effects: linked copies share one modified date; an in-place edit of one path changes all (normal "save as new file" breaks the link safely) | apply log PASS, space won = report figure ± skipped |

**B1-A result (2026-10-07 02:39, ads-optimizer `dd13b3f`, `_logs/B1_dryrun_2026-10-07_023901.csv`):** 50 operations all READY · 47,716 files / 8,034,226,548 B = inventory · 0 scheduled tasks · 70 files mention old paths/secret files. Review:
- Code to fix in B1-E (they read the key file from the old `credential\` folder or an old OneDrive path): `04 Design Tools\audit-image-baseline.py`, `fbcat-image-check.py`, `r2-queue-worker.py`, `sheet-peek.py`, `03 Apps Script\Backoffice Update\tests\source-transfer.cjs`, root `fix_r2_renamed_pids.ps1` (already broken since OneDrive left). Web repo hits are on hold with the project.
- Docs: live ones are updated in B1-D (`AGENTS.md`, `CLAUDE.md`, `00 Docs\STATUS_OWARIN-STORE.md`, `00 Docs\STATE.md`, `OWARI-MASTER-CONTEXT_EN/TH_2026-09-13.md`); dated plans, handoffs and `_archive` stay as history.
- Added after review: junction `owarin-store\_from-outer-root\outputs` → `OWARIN-DATA\outputs` (the outer `.mjs` scripts read `./outputs`); Block C also stops on "token/key/secret/password = <24+ chars>" because several docs mention the Cloudflare token.
- `.claude\settings.local.json` holds the old path; it is git-ignored, Claude Code asks for permissions again once.
- Before Block B: stop `r2-queue-worker.py` and anything else running from the folder.

**B1-B result (2026-10-07 02:42, ads-optimizer `4c7df04`):** 52/52 PASS, 47,716 files / 8,034,226,548 B moved, old folder gone; both repos HEAD unchanged. **B1-C:** owarin-back-house-lab PASS (`75b833e`); owarin-store stopped by its guards (`016822f`, nothing pushed): 5 tool-log JSON dumps > 5 MB → now git-ignored (`04 Design Tools/logs/**/evidence*.json`, `**/*journal*.json`); 130 files matched the secret-value check → script now writes a masked explain CSV (kind, length, first 4 chars, short hash) and the `sk-`-style patterns need a word boundary (they hit CSS names like `task-…`). B1-H report: commit made on the PC, push rejected by GitHub — retried with the next run.

**B1-C rerun (ads-optimizer `3178dea`):** 1,995 files / 84 MB staged; 2 files held: `04 Design Tools\logs\W2-20261005-01\before\…\OWARIN — LABEL TOOL.html` (2 Meta-token-shaped values, 127 + 63 chars) and `04 Design Tools\logs\W3-PROD-20261006-01\project-settings.json` (one, 197 chars). Pure letter/digit runs that long are unlikely to be base64 by chance → treated as real tokens: both files git-ignored (kept on the PC, not edited). Note for the owner: a Facebook/Meta access token sits in plain text in those two log files.
**B1-H report (`c9d915f`):** 3,236 groups · 11,891 extra copies · 3.73 GB to win; 3.38 GB of it involves `_r2_upload` (a working/staging folder). Hard links are unsafe where a tool rewrites a file in place (all linked paths would change) → before `-Apply`, read the R2 worker and image tools (B1-G) and exclude `_r2_upload` unless they never rewrite in place.

**B1-C done (ads-optimizer `9ff9458`):** owarin-store pushed `8c09bd5` (1,993 files, 84 MB).
**Tool check for B1-E/B1-G/B1-H (read in `04 Design Tools`, 2026-10-07):** the 4 Python tools take the key file as `--credentials <path>` (nothing hardcoded) → pass `C:\Users\JIN\Documents\OWARIN-secrets\owarin-store\credential\owarin-store-api-3588e4e975d7.json`; only `fix_r2_renamed_pids.ps1` had a hardcoded OneDrive path → fixed to `$PSScriptRoot`. B1-E therefore needs no Sonnet step. No tool rewrites an image in place (copies go to new files only when the target is absent, moves are whole items, JSON state uses temp + atomic replace) and `upload-missing-r2.ps1` itself stages hard links into `_r2_upload` → **B1-H `-Apply` is safe for every folder**. R2 = rclone remote `r2:owarin-images` (`library/<PID>/<n>.<ext>` + `meta/images.csv`) → B1-G = `tools/pc/b1-r2-coverage.ps1` (MD5 + size match, read-only).
**B1-D done (`_logs/B1-D_2026-10-07.csv`):** `AGENTS.md` (label, Stream B only, owner-wide D36–D41 summary, new layout, junction/hard-link/backup warnings, skills source), `CLAUDE.md` (label + layout, OneDrive line), `00 Docs/STATE.md` environment line, both `OWARI-MASTER-CONTEXT_*` path lines; every remaining "OneDrive" mention says it was removed. Owner decisions → `04 Design Tools/logs/decisions_2026-10-07.csv`; `_logs/INCIDENTS.csv` created. `.gitignore`: only the root `/_archive/` is ignored now, so archived docs inside `00 Docs/_archive/` etc. are committed by the next guarded commit.

**B1-H done (ads-optimizer `ea89e9c`):** 11,891 copies → hard links, 0 skipped, 3,731,357,881 B won (PASS). **Nested `_archive` docs committed** (`689ad72`, 33 files, guards PASS).
**B1-G result (ads-optimizer `fbbbb9b`, by path; hard-linked copies count once per path):** R2 `r2:owarin-images` = 3,147 objects / 0.92 GB. On R2: `_fb_albums` 856/857 · `All Products` 6,941/7,909 (2.06 of 3.08 GB) · `_r2_upload` 6,593/8,715. **Not on R2 at all:** `GGB Online Files` 1.48 GB · `Supplier` 128 MB · `outputs` 36 MB · `Facebook - Catalouge Project` 34 MB · `_exports` 6 MB · `OWARIN AFFILIATE` 0.3 MB; plus 968 `All Products` and 2,122 `_r2_upload` files. Full list: `C:\Users\JIN\OWARIN-DATA\_logs\B1_r2-missing_2026-10-07_030445.csv` (PC only). → Media backup is NOT covered by R2; owner decision pending (close-out).

**B1 backup done (ads-optimizer `caaada3`, 2026-10-07 04:53):** `tools/pc/b1-backup-r2.ps1 -Apply` → private bucket `r2:owarin-backup/OWARIN-DATA`, 9,125 files / 5,045,037,499 B, copy + read-back check PASS, count and bytes equal to local. Excluded `_r2_upload`, `_logs`. Re-run the same command to refresh (copy only, never deletes; the free tier is 10 GB-month). Secrets are NOT in the backup (single copy, accepted). Remaining for the owner: B1-F (switch VS Code / Claude Desktop to `C:\Users\JIN\owarin-store`).

Rollback: every move is a rename listed in `B1_moves_<stamp>.csv` (source → destination); reverse = move each destination back in reverse order. No step deletes anything.

## 5. Owner decisions 2026-10-07 (answers to the first open list)
1. `.env` in owarin-retro-guides_1 history — **web project on hold**: no action now. Block B still copies the `.env` into the secrets folder; revisit (host env vars, untrack, rotate) when the project restarts.
2. `cloudflare token.txt` — owner: discard if unused; single-owner repo, so no rotation now. Block B moves it to the secrets folder (never deleted locally); if B1-A/B1-G show nothing uses it, owner may delete the token in the Cloudflare dashboard (My Profile → API Tokens → ⋯ → Delete).
3. Media backup — owner: "probably in R2" → verify in B1-G before deciding.
4. Back House LAB — repo created by owner; separate project, LAB material goes there; B1 only moves it and makes its first commit.
5. Secrets single copy — accepted for now, noted.
6. `All Products` duplicates — do it → B1-H.
7. `OWARIN AFFILIATE` → OWARIN-DATA and `*.csv`/`*.xlsx` out of git stay AI defaults until the owner says otherwise.
