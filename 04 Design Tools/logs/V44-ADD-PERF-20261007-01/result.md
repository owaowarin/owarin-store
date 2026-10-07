# Result — V44-ADD-PERF-20261007-01 (candidate, NOT deployed)

จัดทำ: 2026-10-07 · Sonnet · revision `V44-ADD-PERF-20261007-01/v44@332A6767DF81190A1E334B84FDC28B39DFF9A7F0761012072E653EBEA6FE3D65` · base v43 (live Version 7)
- Add speed: (1) journal lookup scans cols 3–4 then reads one full row (`_addFindPrior`, same prior/attempt semantics; tested equal to old algorithm on 300 random journals); (2) one `getFormulas()` row readback instead of 4 `getFormula()`; (3) BOOKING tab by name first, header scan only as fallback. Used by `addInventoryRow` and `_apiInvAddStatus`.
- Menu (TOOLS-MENU-1): removed R2 Images submenu, Build SERIES MAP, Rebuild ALL Product IDs; moved SP-2 setup/layout, Copy Flags, Build FB CATALOGUE, Rebuild descriptions, Build META EXPORT into ⚙️ Setup & repair. Functions are NOT deleted (menu only); FB Album menu untouched (parked).
- Tests PASS: Index, R2Upload, fb-catalogue, image-url, meta-pipeline, p1-add (mock gained `getFormulas`; assertions unchanged), p1-ui, dna-ux, new v44.test.cjs, subsidy + regression (re-pointed). See tests-output.txt.
- NOT done: Opus pre-release review; owner paste + deploy Version 8; before/after Duration from Apps Script Executions; sheet tab/column deletion (Steps A/C).
- Honest expectation: gain comes mostly from Step A (dead cross-tab formulas) + BOOKING lookup; the 3 flush() recalc waits are unchanged.
