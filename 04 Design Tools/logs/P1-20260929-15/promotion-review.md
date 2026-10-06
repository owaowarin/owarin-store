# P1 Add candidate focused source review — 2026-09-29 +07

Change `P1-20260929-15`, review Request `P1-ADD-PROMOTION-REVIEW-001`; read-only source inspection, no promotion.

Fresh shop Apps Script editor full-buffer LF SHA256: `Code.gs` `EF8C6D347E7EC4235AEFFDB6EED2925C4BFA7F1E36726E60D61F2466F58A6832`; `webapp.gs` `2CEE59212CC5DB464330EE91E476E35D8DAF89700D1CE3D056C61BC2099E3D0A`; `Index.html` `0F7C099C761DCE35DFC27D562AA98D3A34EF4B6A0A6224670BB18ED61E384FD3`. All match the P0/local baseline. Fresh separate test editor hashes: Code `D1D4DEE32188B35807DD8B3C5A0F6DEAEE7EF14C4C8A1B14769E4844E0A090AD` (probe absent), Webapp `5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257`, Index `10800D28BFD49723935AC5D90ADD04AFF59F97E8F8DDF6126DACD9A9FF263882`. Candidate vs test source differs only in `ADD_PENDING_KEY` project ID for Index and TEST bank block for Code; Webapp is identical. These are source hashes, not a claim that production runtime journal/schema is installed.

`candidate-vs-shop-baseline.diff` is the exact local candidate delta against the matching shop baseline: Code 5 hunks (+95/−8 lines), Webapp 2 hunks (+60/−16), Index 10 hunks (+114/−29). It covers Add Request journal, request-hash/idempotent replay, `_tryWrite`/readback checks, numeric validation, `inventory.addStatus`, UI draft persistence/reset and suggestion-timer cleanup. The isolated live QA has exercised normal Add, same-ID replay, partial write, status branches and overlapping two-tab Adds; the latest two-tab readback is in `readback.txt`.

Release gates still open:

1. `addInventoryRow` calls `_addRequestSheet` before writing. Candidate Add fails closed unless the destination shop Sheet has an `ADD REQUESTS` tab with the exact 17 headers; the P0 shop schema snapshot lacked it, and a fresh shop schema check is required before any promotion. No schema write was made here.
2. The current UI stores one pending Request ID/payload in per-tab `sessionStorage`. A new tab/device cannot recover an ID that was lost. Journal `Actor` is the literal `Unknown`, and PREPARED stores row/SKU/hash rather than the user-entered title; a lost-ID match can be ambiguous. Never create a fresh ID as a blind retry. Await the owner choice between strict manual reconciliation and a scoped in-app lookup.
3. `callApi` has no client watchdog. A never-returning callback leaves `Saving…` until the same tab is reloaded; then the frozen request can use `inventory.addStatus`. A native transport timeout was not forced by the live tests. Handbook now states the actual P1 operation.
4. The local shop pair is currently named `Code_v27.gs` and `WebApp_v25.gs`. An eventual edit/promotion must satisfy AGENTS.md paired version bump, archive/stub and README update; simply pasting candidate files is not a complete controlled release.

The source diff itself shows no change to order reservation, Shipping Cost or Label paths. This review does not accept P3 Orders/Cart/Label behavior and does not authorize shop deployment. Next: resolve the lost-ID recovery level, test the selected fail-closed behavior and timeout handling in the isolated project, then repeat a focused integrity review before promotion.
