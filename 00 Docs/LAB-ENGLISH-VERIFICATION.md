# LAB English update · 11 September 2026

Spreadsheet: 158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE

- Changed 72 system-description/header cells in START HERE, TAXONOMY, SHIPPING TEST and PROJECT SETTINGS.
- Translated generated Review Note text in ITEMS V2!T2:T2244 (2,243 cells, seven exact phrase combinations).
- Readback matched the 72 translations and found no Thai text in the edited system-text ranges. Shipping formulas were preserved and the native Google view showed PASS for all nine shipping cases.
- Native views checked START HERE, TAXONOMY and PROJECT SETTINGS. The narrow browser viewport could not expose ITEMS V2 Review Notes beyond its frozen columns; those notes were verified by the cell API.
- Existing product names, recipient data, legacy tabs, sales records and Apps Script code were not rewritten by this translation update.
- No Orders/CRM/Labels backend was installed. The English design preview uses fictional data in memory and reuses the existing Label Tool artwork, layout and renderer.
- Run `node "00 Docs/tests/design-preview-check.cjs"` from the workspace to check preview syntax, shipping/totals, payment state, missing-recipient guard, natural sorting and HTML escaping. Checks passed. Physical printing and backend persistence are outside this prototype check.

Before/after translations: LAB-ENGLISH-CHANGES.json. Proposed data and workflow design: ORDERS-CRM-LABEL-DESIGN.md.
