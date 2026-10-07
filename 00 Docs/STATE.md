# STATE — OWARIN STORE (read FIRST; only the stream you work on)

Prepared: 2026-10-07 — Session55 compact rewrite (S55-RULES-1). Full previous detail, verbatim: `00 Docs/_archive/STATE_2026-10-07_pre-S55.md`.
Rule: OVERWRITE at tier-L close; ≤ 80 short lines; per stream = status, ONE next step, pointers.

## 1. Add / Cart / Orders / Label web app (Stream B) — LIVE
- Live: v43 DNA/UX = Version 7 (owner PASS "เวอร์ชัน 7 ผ่าน", 2026-10-07 6:39). W1/W2 production + Subsidy default0 live since Version 6; release/migration CLOSED; Print PASS owner-confirmed.
- Repo: v44 candidate (Add speed + menu cleanup) built + tests PASS, NOT deployed — packet `04 Design Tools/logs/V44-ADD-PERF-20261007-01/`, revision `V44-ADD-PERF-20261007-01/v44@332A6767…3D65`.
- Add speed: 3.588 s before Step A → 3.852 s after (cold 11.796 s); no gain until v44 (`04 Design Tools/logs/step-a-add-duration_20261007.csv`).
- Next ONE: Opus · high review `prompts/v44-review-and-deploy.md` → owner pastes Code.gs + webapp.gs → Deploy Version 8 → owner reports `api` Duration.
- Never: fake production transactions, reset/rerun migration requests, P0/P1 restart. Evidence/undo history: archive STATE above + `04 Design Tools/logs/W3-PROD-20261006-01/`, `W1-SUBSIDY0-20261006-01/`, `WEBAPP-DNA-UX-20261007-01/`.

## 2. Meta feed / R2 images — v30 pipeline LIVE
- Nightly `refreshMetaFeedAuto` 04:00–05:00 +07 → REFRESH LOG; Meta pulls ~05:50. One catalogue `OWARIN STORE` (1993212747992458, feed 1048143251023664). Procedure: LESSONS L5.
- 2026-10-07 4 photos DONE (owner dry-run + -Commit): the 4 PIDs were PID changes, so R2 folders were copied from the old PIDs (`rclone` verified 4/4; index 2060 PIDs, read-back identical True). Refresh Meta feed popup (owner): "Every Instock product is in the feed (1131)" — handoff expected 1133; Instock count drifts, difference of 2 unexplained (OPEN, small). Log `04 Design Tools/logs/r2-pid-copy_20261007.csv`.
- Next ONE: none for R2 photos; nightly refresh continues. Optional: compare 1131 vs 1133 in REFRESH LOG.
- Old open smalls (catalog count lag, all-caps titles): archive STATE §2.

## 3. Shopee relisting — 584 listings LIVE (2026-10-02)
- Next ONE: reconcile 64 old listings vs build (needs owner's Mass Update Sales Info export). Other opens: archive STATE §3; plan `00 Docs/PLAN-shopee-relisting.md`.

## 4. OWA Facebook ads — PARKED
- Resume only on owner "go" after D1 budget, D2 posts, D3 break-even. Plan `00 Docs/PLAN-OWA-META-ADS_2026-09-25.md`.

## 4b. Sheet compaction — Step A DONE (owner, 2026-10-07)
- Step A tabs/A2/named range removed (owner reply). Next ONE: after v44 live → AUDIT §8 Step B/C with backup first; do NOT delete `R2 JOBS` / `IMAGE UPLOADS` before v44. `00 Docs/AUDIT-SHEET-STRUCTURE_2026-10-07.md`.

## 5. Other — FB album autopost PARKED (FBA-PARK-1); storefront on hold; rest unreviewed (`STATUS_OWARIN-STORE.md`, 2026-09-13).

## Rules / housekeeping
- Rules restructured 2026-10-07 S55: `CLAUDE.md` (how to work) + `00 Docs/LESSONS.md` (by trigger) + `prompts/_TEMPLATE_handoff.md`.
- PENDING: B1-F folder switch (AGENTS.md item 0); ads-optimizer global rules sync to S55 = `prompts/ads-optimizer-rules-sync.md` (cloud session here could not attach that repo).
