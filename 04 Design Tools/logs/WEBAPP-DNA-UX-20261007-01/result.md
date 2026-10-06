# Result — WEBAPP-DNA-UX-20261007-01 (v43, UI only)

จัดทำ: 2026-10-07 (plan date; container clock read 2026-10-06) · Revision `WEBAPP-DNA-UX-20261007-01/v43@E9668B552D3E04DCED84F38A3AB3764E4676E8E4D99F8DB5F2521EE6A2C88D98` · base W1-SUBSIDY0-20261006-01/v42@AD586F22…1263

- S1 preflight 10/10 SHA256 = v42; backup `03 Apps Script/Web App/backup/pre-v43-20261007/`; v42 pair stubs; v43 headers.
- A1/A2/B1–B6 applied from plan; one deviation: `.bad` outline needs `!important` (fix1.py) — computed outline now 1px solid rgb(207,48,48).
- Tests PASS: Index, R2Upload, fb-catalogue, image-url, meta-pipeline, p1-add, p1-ui, dna-ux, subsidy (re-pointed copy; blank-subsidy assertion now matches new message), regression (re-pointed, 2 PASS blocks, see regression-output.txt).
- Harness 390×844 and 1366: 0 JS errors; brand 28 px, count 14 px; phone buttons <36: none; inputs/selects <40: none; REFRESH/ALL SHEETS/GUIDE BOOKS/MAGAZINE = 36; nav `more` true at load, false at end; TOOLS click scrolls into view; blank subsidy → outline on #cShipShop + toast "Shipping Subsidy — ใส่ตัวเลข (0 ได้)"; toast hidden after opening Add form. LabelDialog standalone: panel rgb(21,21,21), text rgb(238,238,238), input rgb(34,34,34) (fallbacks work). Screenshots in ux/.
- Note: first harness run used relative paths → ERR_INVALID_URL; re-run with absolute paths (INCIDENTS).
- Open: Cart ✕ (.cl-rm) 23 px on phone (outside plan scope). C1 (owner paste + Deploy Version 7) NOT done — live remains v42 / Version6.
