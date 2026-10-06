# P1-18 malformed DONE replay guard — local only

Change/Request: P1-20260930-02 / P1-ADD-DONE-RESULT-001. One writer. Before changes, backed up candidate Code.gs, sanitized test Code.gs, Add test and Implementation/HANDOFF. Candidate SHA256 01EE565A6798E6B354D1499B5CFE71957ED2C2FA5EE5335CE33F452C2F34EA27; test source D1D4DEE32188B35807DD8B3C5A0F6DEAEE7EF14C4C8A1B14769E4844E0A090AD; test 095A47BB93388F3B120EA1C01D57FBEBB3D79924C4960022A7838F1F26E18DEF.

Trigger: a prior journal event says DONE but its Result column is malformed. The old replay path appended another DONE event before JSON.parse failed. The new regression test changed only the local in-memory fixture Result to `{`; it failed before the fix with SyntaxError at the replay path, as expected. No Google journal row was changed for the test.

Fix: parse and validate DONE Result success/row/SKU/sheet against the prior journal event **before** appending the replay event. An invalid result now raises `Add DONE result requires recovery` with no new journal event or business row; a valid replay still returns the same item. Candidate Code SHA256 C977093F40C6D2244B12C730D2F298310BCD0014DD49C051328A4CB92C46A8F5; prepared sanitized test Code SHA256 6006FE13F41F4C156E1FC623C9D77FCF2A219EC02D1703AE13F1C55807A9C3F8. The P1-16 prepared Index timeout change remains local and uninstalled.

Verification: `node p1-add.test.cjs` PASS, including the malformed DONE no-write test, 20 Adds, status, replay and failure cases; `node p1-ui.test.cjs` PASS, including simulated timeout/late-callback cases. Exact source/test diffs are in this folder. No Apps Script editor, Sheet, deployment, shop or Back House LAB write occurred; no live Google corruption test is claimed.

Prepared test-source syntax check: Node `vm.Script` parsed `runtime-source/Code.gs`, `webapp.gs` and all nonempty `Index.html` script blocks; PASS.

Error/retry/recovery: the intentional red test failed once with SyntaxError before the source fix; after the fix both tests passed. A corrupted real DONE event must be reconciled manually against the inventory row and previous journal events; do not replay or edit the journal blindly. To discard the local change, restore Code-before.gs, Code-test-before.gs and p1-add-before.test.cjs. Test Sheet needs no rollback.
