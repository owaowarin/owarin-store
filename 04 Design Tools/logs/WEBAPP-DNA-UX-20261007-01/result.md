# Result — WEBAPP-DNA-UX-20261007-01 (v43, UI only)

จัดทำ: 2026-10-07 (plan date; container clock read 2026-10-06) · Revision `WEBAPP-DNA-UX-20261007-01/v43@4F23D01DBD71B5D5E363AD48678E27C2E59B284CA9013848DD67B484D47C3F52` · base W1-SUBSIDY0-20261006-01/v42@AD586F22…1263

- S1 preflight 10/10 SHA256 = v42; backup `03 Apps Script/Web App/backup/pre-v43-20261007/`; v42 pair stubs; v43 headers.
- A1/A2/B1–B6 applied from plan; one deviation: `.bad` outline needs `!important` (fix1.py) — computed outline now 1px solid rgb(207,48,48).
- Tests PASS: Index, R2Upload, fb-catalogue, image-url, meta-pipeline, p1-add, p1-ui, dna-ux, subsidy (re-pointed copy; blank-subsidy assertion now matches new message), regression (re-pointed, 2 PASS blocks, see regression-output.txt).
- Harness 390×844 and 1366: 0 JS errors; brand 28 px, count 14 px; phone buttons <36: none; inputs/selects <40: none; REFRESH/ALL SHEETS/GUIDE BOOKS/MAGAZINE = 36; nav `more` true at load, false at end; TOOLS click scrolls into view; blank subsidy → outline on #cShipShop + toast "Shipping Subsidy — ใส่ตัวเลข (0 ได้)"; toast hidden after opening Add form. LabelDialog standalone: panel rgb(21,21,21), text rgb(238,238,238), input rgb(34,34,34) (fallbacks work). Screenshots in ux/.
- Note: first harness run used relative paths → ERR_INVALID_URL; re-run with absolute paths (INCIDENTS).
- Open: Cart ✕ (.cl-rm) 23 px on phone (outside plan scope). C1 (owner paste + Deploy Version 7) NOT done — live remains v42 / Version6.

## Opus pre-release review (2026-10-07)
- Fix2: `w1Saved` showed the order-saved toast (order ID / Missing label) BEFORE `showView('orders')`, and B3 hides the toast in showView → owner would never see it. Now showView first, then okToast (dna-ux test 7 asserts order view→toast→load).
- Fix3: `scrollIntoView nearest` left the nav 16 px end padding unscrolled, so the fade mask still covered the selected TOOLS tab. Selected tab is now pushed out of the fade zone; TOOLS → max scroll, mask off (navcheck: all 8 tabs).
- Re-checked: Code/WebApp v43 differ from v42 only in header lines; other 6 files byte-identical to v42; all 6 tokens exist in Index :root; only programmatic showView call is w1Saved; showModal(open) calls are all user-initiated; cart index ↔ `.cl-price[data-idx]` mapping identical; desktop 1366 screenshots v42 vs v43 identical except the LOADED clock; all tests PASS again.
- Harness Orders tab shows "Cannot read properties of undefined (reading 'map')" in BOTH v42 and v43 = mock data gap, not a release issue.
