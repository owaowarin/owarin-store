# HANDOFF — 2026-09-28 — Sheet / Facebook synchronization design

## 1. Stream and rules
Stream B — OWARIN STORE. Applied master context §§2, 5, 6, 9 and ponytail: reuse the existing Sheet, Apps Script and R2 pipeline; design/review scope only.

## 2. Files touched (before → after)
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/DESIGN-SHEET-FACEBOOK-SYNC_2026-09-28.md`: absent → proposed architecture, options, risk assessment, staged validation and open policy choices.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/HANDOFF_2026-09-28.md`: absent → this handoff.
Only new documentation files; no source/business data/credentials were changed. No archive moves: reference files remain in use and moving them is outside this design request.

## 3. Evidence / dates
Read local Code_v27.gs, WebApp_v25.gs, FbAlbum.gs and dated live-source snapshot, README, HANDOFF_2026-09-25, BACKOFFICE-REDESIGN-v0.1, PLAN-OWA-META-ADS_2026-09-25. These are implementation/history evidence, not a fresh deployment audit. No live inventory counts or current ad performance claimed. Official Meta SDK and Google trigger/quota documentation checked in this chat on 2026-09-28; links in design §12.

## 4. Not done / limitations
No Google Sheet or Meta writes, no deployment/triggers, no photo deletion, no ads changes, no automated monitoring created. No live sheet export or current ad/creative audit: this is a preliminary design based on inspected source and stated workflow, with fresh baseline explicitly required before implementation. Direct Meta Developer documentation fetches returned 429; SDK method presence does not prove permissions or behavior for this Page. No test run needed for documentation-only changes; verify saved files by reading back.

## 5. One next step
Run design phase 0: read the current deployed code, sheet identity/status structure, album/photo/post/catalog mappings, and ads referencing them; prepare a small explicitly scoped capability test on approved test objects. Preserve the user's prior allowance for mutable PIDs by proposing an additional stable Item UID. Do not treat the design as authorization to publish, delete or change ads. Existing-post ads and Catalog availability require separate verification.

---

# Session 2 — Add Item / Cart / Orders / Client / Label plan

## 1. Stream and rules
Stream B; master context §§2,5,6,9; Ponytail full. User requested detailed planning and handoff for another model, not implementation. Applied Google Drive/Sheets skills for read-only schema verification and OpenAI Docs for model guidance. No subagents or new chats.

## 2. Files touched — before → after
Base absolute path: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/`.

- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/PLAN-ADD-CART-ORDERS-LABEL_2026-09-28.md`: absent → detailed scope, evidence, workflows, proposed schema/API, safeguards, model phases and acceptance gates.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/HANDBOOK-ADD-CART-ORDERS-LABEL_2026-09-28.md`: absent → phase runbook, target user handbook, deployment/rollback, prompts and handoff template.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md`: absent → decisions/findings/status/baseline hashes; implementation NOT STARTED.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/HANDOFF_2026-09-28.md`: preserved previous session → appended this session.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/04 Design Tools/logs/add_cart_orders_label_plan_20260928.csv`: absent → documentation before/after log.

No source, business data or credentials changed. No archive moves: older design is still referenced; scoped supersession is stated in the new plan.

## 3. Evidence and user decisions
User confirmed target /dev URL `https://script.google.com/macros/s/AKfycbwncq04Ab1-ZvB_Q293w49qctLABh_JLQ_vSCLdChlR/dev` and main spreadsheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`. Read live metadata + CLIENT A1:F1, SALES A1:Z2, GGB A1:AF2, MAG A1:AD2 on 2026-09-28; CLIENT already exists and SALES G2 is an array formula. No customer rows exported or inventory/sales totals claimed.

Opened /dev → Add item: observed Status New Arrival; closed without Save. User confirms Pending must reserve stock. User requested advice on sale commit timing: recommended review/Label before final Save & confirm sold, with Confirm sold • Label later when address unavailable. This is a recommendation, not deployment approval.

Source review: local Index has reset and New Arrival but server fallbacks remain Instock; reset follows render work, so a post-save UI exception is a hypothesis requiring reproduction. Current numbered WebApp has no durable sales journal; candidate Backoffice Update does but uses different money/runtime contracts. Existing caution-v2 asset reviewed; original tool footer has .7mm vertical padding. Code_v27/WebApp_v25 mismatch requires baseline reconciliation.

## 4. Not done / limitations
No Add repetition against real shop, no source export from deployed Apps Script, no backend change, no CLIENT write, no reservation/sale, no migration, no test deployment, no print, no marketplace API changes. No claim that bug root cause is confirmed. Read-only UI and targeted live schema inspection are preliminary P0 evidence, not full P0 completion. Source/runtime tests are specified for the implementer, not claimed run this session.

## 5. One next step
Select GPT-6 Astra / High for P0 and use the handbook's handoff prompt to verify installed source/price and status semantics, capture a test-copy reproduction, and lock the baseline before implementation. Use GPT-5.6 Sol / Medium for ordinary implementation, Sol / High for transaction logic, then Astra / High for focused stock/money/security review. Do not start a new chat or switch models automatically. This work extends the old shop, not the independent OWARIN Back House LAB.

### Follow-up — DOC-20260928-02: mandatory logs

Stream B, same rules and scope. User explicitly requires a log for every update/fix so errors can be traced later. Updated PLAN §15/R14/QA-L, HANDBOOK §9, IMPLEMENTATION-LOG and documentation CSV; all paths are those listed in Session 2 §2. Before: distributed journal/log guidance → after: mandatory development and runtime audit contracts, before/after evidence, error stage, retry history, recovery linkage and log-failure behavior. Source: this follow-up user message, no new business-data read. No code/Sheet/deployment change; runtime audit not installed. Next step: include this requirement in P0 and all implementation gates; do not mark changes complete without verified logs.

---

# Session 3 — P0 installed baseline / offline diagnostic — P0-20260928-01

## 1. Stream / authority / decisions
Stream B; master context §§2,5,6,9; Ponytail full; one writer. Actual model/effort Unknown from available controls; recommended P0 GPT-6 Astra / High. User authorized read-only P0 plus local evidence/document updates, no shop source/schema/data changes or deployment. No extra agent/chat and no access to independent OWARIN Back House LAB.

Owner answered during audit: **SALES Shipping Cost = shop-paid subsidy (ส่วนค่าส่งที่ร้านช่วยออก)**; **Auction = already sold through auction, cannot sell again**. Pending reserves; Cancel restores prior status only for that order's claim. Keep CLIENT; Facebook/internal Note excluded from Label. Review/Label before Save & confirm sold plus Label later remains target proposal, not deployed UI.

## 2. Files touched — before → after / recovery
Base: `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/`.

- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/IMPLEMENTATION-LOG-ADD-CART-ORDERS-LABEL_2026-09-28.md`: planning-only current status → P0 AUDITED, gates open; append verified findings, assumptions, owner decisions, entry-point map, reproduction/results and errors/retries.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/00 Docs/HANDOFF_2026-09-28.md`: previous content retained → append this Session 3.
- `C:/Users/JIN/OneDrive/Desktop/etc/OWARIN/OWARIN STORE/OWARIN STORE/04 Design Tools/logs/P0-20260928-01/`: absent → source snapshots, hashes/diffs, safe metadata, offline checks/results, CSV change log and document backups. Full listing/hash in manifest.json.
- Full latest workbook export is at `C:/Users/JIN/AppData/Local/Temp/OWARIN-P0-20260928-01-latest.xlsx`, not duplicated in the project evidence (may contain CLIENT records). Temp retention is not a migration-backup guarantee.

Change ID: P0-20260928-01. Runtime audit/request IDs: N/A; Live mutations: none. Backup/diff: evidence `before/`, `source-comparison.json`, add-on diffs and docs.diff. Recovery: use these to reverse only this doc change, preserving future sessions; no shop recovery/rollback was attempted. Archive dry-run found still-referenced material, so no archive move/deletion.

## 3. Evidence and conclusions
- Project ID `1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp`, bound to main sheet `16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0`; Test deployments shows the exact user /dev Head ID `AKfycbwncq04Ab1-ZvB_Q293w49qctLABh_JLQ_vSCLdChlR`. Bangkok timezone/V8 enabled. Captured all five visible source files without Save/Run.
- Code.gs v27, webapp.gs v25 and Index.html equal local after only LF normalization; installed version mismatch is real. Installed FbAlbum/R2 differ from local; do not upload a local whole-project bundle. Exact raw/LF SHA256 and recoverable copies are in evidence.
- Fresh Google Drive XLSX export 2026-09-28 ~21:13 +07; SHA256 `31B1435D3A3DDAD05380E29009D0D7E9435EEA2560A3C6C6D584BF7FA15A7DE2`. Also read live headers/formulas/status columns/permissions. No customer records copied into handoff/test fixtures.
- CLIENT A:F exists; no Client ID or inventory Item UID. No ORDERS/ORDER LINES/ORDER REQUESTS tabs, no installed transaction journal or AUDIT LOG for this workflow. PID CHANGES and R2 queue are not that journal.
- Shopee execution uses round(price*0.7-50), matching sheet pricing basis; Cart help text still says /1.2-50. Customer shipping and shop subsidy differ. Cart channel switching leaves entered prices unchanged. Preserve owner subsidy rule; proposed Carrier Expense must not silently become SALES Shipping Cost.
- SALES G2 spills through G51; table REPORT ends at row 52 with totals while ledger extends beyond. Current appends are outside the spill in this export; do not claim the current sale path failed on this array without reproduction.
- Cart, single sold and direct status edit bypass Hold ownership; Auction is currently saleable despite owner's clarified rule. Duplicate payload creates duplicate SALES; injected failure after ledger write plus retry creates another order/line. Stable UID + shared guard/journal are required before new Pending workflow.
- Access: fresh permission metadata confirms anyone-with-link reader for the main workbook including CLIENT; protection UI shows empty-state. Owner access decision needed before CRM; no permission changed.
- `node "04 Design Tools/logs/P0-20260928-01/checks/p0-repro.cjs"`: 17 offline diagnostic checks pass, including 20 successful Add callbacks. `node "03 Apps Script/Web App/Index.test.js"`: pass. The checks reproduce defects, not product acceptance. Attempt 1 collision assertion failed; `_colLetter` implementations inspected and equivalence tested, attempt 2 passed; both outputs retained.
- Add root cause boundary: injected rendering failure blocks reset; stale callback clears a newer draft; suggestion state can refill old title in mock DOM. Real production event and Google test-copy browser timing remain unconfirmed.

## 4. Not done / failures / limitations
No source/schema/business-data write, no installation/deploy, no real Add test, no order/client/reservation/sale mutation, no external listing changes, no physical print. No Google test deployment was created. No QA-A/C–L acceptance claim and no claim runtime audit is installed. Full manifest/native Table column types and unauthorized-access behavior were not established by exported metadata.

Errors/retries retained: wrong browser tab identifier corrected; export download socket restriction then expired URL resolved by fresh export; diagnostic collision assumption corrected after reading both definitions; ArrayFormula serialization corrected to text/ref; settings evidence filter narrowed to exclude property values. No auto-review rejection. Runtime recovery: none; synthetic retry outcomes in checks. See Implementation log for exact stage/results and changes.csv for before→after.

## 5. One next step / model
Run the prepared Add reproduction in a separate synthetic Google Sheet + bound script using the captured baseline, explicitly checking IDs differ from the shop and disabling any external-post behavior; do not use independent Back House LAB. Then P1 with **GPT-5.6 Sol / Medium**, **High** for append/retry/partial-write work; unresolved consequential diagnosis uses **GPT-6 Astra / High**. Before P3, settle main-workbook/CLIENT access and label Shipping Subsidy clearly; Auction/subsidy decisions above are already answered. P3 uses Sol / High and focused stock/money review uses Astra / High, one writer, no automatic model/chat switch.

Log verification: current source hash/readback and historical-document preservation are checked in `P0-20260928-01/verification.json`; final evidence hashes are in manifest.json. These local artifacts are development evidence, not runtime audit installation.

---

# Session 4 continuation — P1 isolated Add status check, P1-20260929-13 (2026-09-29 15:53 +07)

One writer; synthetic test assets only. Local candidate and separate Apps Script Head now contain `inventory.addStatus`; the Add UI checks a stored Request ID before retry. DONE returns the existing item without a new write; NOT_FOUND retries the same ID/payload; any other state or lookup failure keeps the draft frozen. Test Webapp/Index LF SHA256 are `5A818FC25701205910362E739967879B3644199FDEE7020381B3BC44AA74A257` / `10800D28BFD49723935AC5D90ADD04AFF59F97E8F8DDF6126DACD9A9FF263882`; Code.gs remains `D1D4DEE32188B35807DD8B3C5A0F6DEAEE7EF14C4C8A1B14769E4844E0A090AD`. Editor full-copy hashes matched local sanitized files and showed Saved to Drive. Test `/dev` Head was refreshed; owner-only `/exec` version 2 and production shop were not deployed or changed.

Live Request `add-1790671871715-48yh8n9gtrn`: A27 submitted then page reloaded before response; opening Add restored the frozen ID; status check returned `OWA-GGBS017SN00` and reset the form. Separate Sheet export confirms one A27 at GGB row 19, row 20 empty, PREPARED/DONE at journal rows 61–62 both attempt 1, row 63 empty; 27 synthetic items and 61 events. Both local Add/UI tests pass, including simulated NOT_FOUND and ERROR branches; those branches are **not yet live Google verified**. Detailed before→after/error/retry/recovery, backups, exact diffs and XLSX snapshot are in `04 Design Tools/logs/P1-20260929-13/changes.csv` and the same folder; Implementation log has the full section. A failed system Python launcher was replaced with the bundled runtime for read-only XLSX inspection; no data recovery write was needed.

Next: in the same isolated Sheet/script, verify live NOT_FOUND/non-DONE and real timeout behavior without creating a second item, define bounded manual and cross-tab/new-device recovery, then review the exact promotion diff. GPT-5.6 Sol / High fits failure/retry implementation; GPT-6 Astra / High fits focused stock/money/data-integrity review or consequential ambiguity. No model switch is claimed. Do not edit the shop or deploy without its separate promotion gate. Keep Pending reservation, order-owned Cancel release, existing CLIENT, Shipping Cost = shop-paid subsidy, Auction sold/unavailable, Facebook Account excluded from Labels, and no production runtime journal claim.
