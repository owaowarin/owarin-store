# LESSONS — OWARIN STORE (topic rules; read ONLY the section whose trigger matches the task)

Prepared: 2026-10-07 — moved verbatim from CLAUDE.md in Session55 (S55-RULES-1). Full pre-move copy: `00 Docs/_archive/rules/CLAUDE_2026-10-07_pre-S55.md`. Each section keeps its original date label.

Find a section with: `grep -n "^## L" "00 Docs/LESSONS.md"`, then read only that range.

## L1 — Delivery priorities (owner 2026-10-03)
- Apply the six ordered priorities in master §5.2.1; AGENTS is the router. For this project keep one writer and no new agents/chats unless explicitly authorized separately.
- When the owner asks for progress, report delivered user actions, verified environment/revision and remaining outcomes; do not equate code edits or documentation volume with a completed workflow.
- When an old plan/prompt says a completed phase is unstarted, update active guidance from dated evidence; preserve historical logs and do not rerun the old phase merely to match stale wording.
- When a relevant gate has passed and the next edit adds no related risk, proceed; rerun checks only for affected behavior or a required release gate. Never omit stock/money failure/retry tests to save effort.
- When a business rule is closed (Shipping Cost=subsidy, Auction unavailable, CLIENT reuse), propagate it to schema/UI/test contracts in the same pass; do not ask the owner again.
- Keep current status in STATE, requirements/priorities/QA in PLAN, operational steps in HANDBOOK, and detailed attempts/results/recovery in the task CSV plus a linked Implementation summary. Update only affected references; no repeated full reports.

## L2 — Issue and model handoff rule (owner 2026-10-03)
- **Issue and model handoff rule (owner decision 2026-10-03):** Record every issue, failed attempt, fix, retry, result, and recovery reference in the task CSV and Implementation log. If GPT-5.6 Sol / High cannot resolve a reproducible issue, record the remaining problem and exact revision, then hand the repair to GPT-6 Astra / High. Do not claim a switch or create an agent/chat automatically; keep one writer per change.

## L3 — Apps Script integrity hashes
For new request or proof hashes containing user text, pass `Utilities.Charset.UTF_8` explicitly to `Utilities.computeDigest`. The default charset in the isolated test project replaced Thai characters with `?`, causing both a false journal-proof mismatch and colliding payload hashes. Never rewrite historical hashes/events; keep a versioned legacy verifier and compare the exact original payload on same-ID replay. Test two distinct Unicode payloads and an old unfinished request before accepting a hash migration.

## L4 — Browser / Apps Script editor safety
- In the Apps Script code editor never press keys (Enter, typing, shortcuts) unless the cursor is deliberately placed there; a stray click + Enter edits live code (happened 2026-10-02, undone before saving). Select functions only by clicking the dropdown option, and confirm the dropdown is open (screenshot) before clicking an item.
- After any editor session confirm the title bar reads "Saved to Drive" with no unsaved edit, and that line 2 still shows the intended `Code.gs vNN` header.
- Google's OAuth consent window opens as a separate Chrome window the browser tool cannot see: the owner clicks Allow.

## L5 — Meta feed / R2 image publish chain (v27–v30)
New arrival or edited product:
1. Edit the row in GAME GUIDE BOOKS or MAGAZINE as usual — if Product ID changes, a toast confirms it was logged in the **PID CHANGES** tab; nothing else to do.
2. Sort photos with `new-arrivals-to-folders.ps1` (unchanged).
3. PowerShell at `04 Design Tools`: `.\upload-missing-r2.ps1` (dry-run) → `.\upload-missing-r2.ps1 -Commit` — finishes the whole R2 side in one command; the last line must read `read-back identical: True`.
4. **Automatic since 2026-10-02 (Code v28):** a nightly Apps Script trigger runs `refreshMetaFeedAuto` between 04:00 and 05:00 (Asia/Bangkok), before Meta's ~05:50 pull. Check the **REFRESH LOG** tab: the newest row must be `OK` (Ready = Instock count). `GUARD` = Ready fell below 80% of the current META EXPORT (tab left untouched), `ERROR` / `BUSY` = failed; each of these also sends an e-mail. Manual click is only for same-day changes: **📦 Inventory Tools → 🚀 Refresh Meta feed** — the popup's first line must read `✅ Every Instock product is in the feed (N)`; a `⚠️ … NOT in the feed` line names which product and what to fix.
5. Meta pulls the published feed on its own (~05:50 Bangkok, daily).

Sold: change Status to Sold → it leaves the feed at the next nightly refresh (or click **🚀 Refresh Meta feed** for same-day) — Meta then removes it automatically at its pull.

**Single-catalogue rule (decided 2026-10-02):** keep exactly ONE Meta catalogue — currently `OWARIN STORE` (1993212747992458, feed 1048143251023664). Facebook requires the commerce account (`OWA — OWARIN's STORE`, 1342667447501637) to keep at least one catalogue, so the last catalogue cannot be deleted (Meta greys it out). Routine updates go through the existing daily feed; never create a second catalogue for them. Only when a catalogue truly must be replaced: (1) create the new one with its creation date (YYYY-MM-DD) in the name; (2) recreate its feed from META EXPORT (gid 355347627) with the daily 06:00 REPLACE schedule; (3) connect it to the commerce account and re-point any ads / product sets; (4) verify the first pull (detected = persisted, 0 invalid); (5) only then delete the old catalogue. Log every step. Any new feed or manual upload also carries its date in its name.

**Feed content rules (Code v30, 2026-10-02):** (1) Identical copies are listed ONCE: same base title + Publisher + Original (cover price) + Condition + Copy Flags → one row (first complete copy), `quantity_to_sell_on_facebook` = number of copies; any difference in those fields = separate rows. When the listed copy sells, the next one takes over at the next refresh. (2) Titles never carry `(RESTOCK-NN)` (stripped at the v20b write and again at export). (3) A title with no lowercase Latin letter is exported Capitalised (GAMEMAG → Gamemag; PS2/RPG/VII untouched); the sheet name is not changed. (4) FB CATALOGUE `Price` / `Description` columns ARE the Meta price/description fields by design (header match is case-insensitive); the `price (Meta format)` columns are legacy and unused. The 80% drop guard compares rows, so a change that merges many copies must be checked against it (first v30 run: 1,337 → 1,162 expected, guard minimum 1,070).

PID changes are logged in **PID CHANGES**; never delete that tab. Orphaned FB CATALOGUE rows (old PID no longer in inventory) are auto-archived to **FB CATALOGUE ARCHIVE**; never delete that tab either. Plan: `00 Docs/PLAN-META-PIPELINE-HARDENING_2026-09-25.md`.

## L6 — Session41 lessons (journal / locks / hashes)
- google.script.run may reorder object keys; exact-payload hash recovery must use stored original intent server-side, owner-only and ID-only, with durable client recovery mode. Never substitute a normalized payload/hash.
- Read mutable transaction/journal/capacity metadata only after acquiring its shared lock, including recovery and QA helpers. Duplicate isolated helper executions are real evidence; server cache mechanism remains inference until native proof establishes it.
- A rejected reconciliation hash is a stop before writes. Compare fresh native values with export, diagnose server hash/serialization, preserve every original event/position, and append explicit proven gap notes only. Never skip blank journal rows to declare success.

## L7 — Monetary readback
For cent-valued W1 totals use integer-cent addition. Keep the exact formula and typed finite-number guard, with a tightly bounded tolerance only for floating representation noise; reject one-cent discrepancies and preserve historical intent/hash. Verify actual Apps Script getValues before attributing a rounded XLSX cache difference to the transaction engine: export and native values can differ even when native equals V8. A cent-readback mock is a compatibility test, not evidence of a native failure. Exercise affected legacy/fixed-ID retry paths and an actual isolated decimal flow before sign-off.

## L8 — CLIENT / label native verification
- Do not trust a mock or RichText API to preserve identifiers or literal formula prefixes. Native Sheets coerced zero-prefixed phone/postal code and evaluated an equal prefix. For CLIENT writes use escaped plain-text values and require exact typed value plus empty-formula readback, including after-effect retry. Retain observed before values/formulas and original durable intent; never silently repair an unknown row or rewrite old events.
- Apps Script HTML partials must be valid HTML. For shared JavaScript use a valid script wrapper with bounded include extraction. Source transfers must compare the complete saved bytes/LF hashes, not a truncated DOM read; test generated child print-document JavaScript as well as its outer template.
- Keep W2 browser recovery records to Request IDs, not customer contact payloads. A CLIENT failure after sale is a separate original-intent retry. Preserve SOLD and the committed recipient; never create a second sale to repair a customer record.
- Guard shared async Orders/search results with a request generation; clear old actionable cards while loading and discard stale successes/errors.
- READY preview and a print invocation do not prove exported PDF page size or physical output. Record the browser/driver limitation and keep that gate OPEN until actual PDF/printer evidence is inspected. Do not rerun transactions or fixtures to test printing.

## L9 — Print environment distinction
An empty IAB native-app inventory does not prove the Windows computer-use plugin is unavailable: its list_apps/list_windows may still work. Check the purpose-built plugin before making that claim. If its browser URL verification stops capture, stop UI inputs for that turn; do not bypass it or repeat the unchanged attempt without a changed verified target. A separate browser connection may be unavailable even while Chrome is running. Missing browser/printer access is an environment issue; a larger model, duplicate renderer or fabricated substitute PDF cannot close native print acceptance.

## L10 — Owner-deferred verification
An explicit owner deferral changes scheduling, not evidence. While deferred, mark PDF/physical Print-Reprint as untested, never PASS or fully accepted. Continue independent authorized local/test work and retain the gap in STATE/PLAN/release checklist; do not repeatedly block that work on printer/browser setup. When the owner subsequently reports completed tests, record PASS — owner-confirmed with the exact message and checklist context, and close the active deferral; never recast human confirmation as agent-inspected PDF/physical output or invent printer settings/artifacts. Keep prior deferred logs as dated history. Keep money, stock, access and recovery validation intact. Neither deferral nor completed test acceptance authorizes production or migration of real CLIENT data. Updated 2026-10-06.

## L11 — Migration and fresh replay evidence
For legacy CLIENT migration, prove original A:F values/formulas remain intact and original allocated IDs/revision survive retry; do not infer or repair legacy leading zeroes. The existing isolated schema request is fixed and DONE: never replace its eight-column CLIENT with a new six-column fixture. W2_SCHEMA recovers with its original helper, not generic UI requests.resume. Before native replay, export fresh and reconcile every delta against durable intent; enumerate actual DONE requests instead of assuming historical counts/revisions. A cleared QA textarea must receive a new response before parsing/claiming proof. Local VM checks, native DONE replay and full native UI/migration are distinct acceptance gates.

## L12 — Native legacy migration fixture and UI acceptance
Keep existing eight-column CLIENT and its DONE schema request intact. Test actual helper migration on separately named native fixture/client-journal tabs through a QA-only execution-local adapter with actual owner/Sheet-ID/lock checks and finally-restored service binding; never include the adapter in candidate/production. Export before/after, compare original A:F values AND formulas and every original table, and prove after-effect retry keeps originally allocated IDs/revision. Count nonblank client identities separately from blank append capacity; preserve blank rows rather than assuming contiguous data. Distinguish journal Event ID/Request ID using authoritative headers. Avoid naming Python diagnostics inspect.py (stdlib collision). Clear transfer textareas before AX dumps and show only capture result, never giant source/base64. Full two-channel UI/native migration acceptance still does not prove PDF/physical printing.

## L13 — Production native Table / release evidence
- Extending native Sheets Tables may generate Column N headers. Accept only observed exact placeholders in an ARMED durable migration step with original business snapshot unchanged and all new metadata values AND formulas empty. Preserve original request ID/allocated identities/time across after-effect retry; reject surprising metadata/formulas. Keep isolated test guards intact and add exact owner/production guards separately.
- Large DOM value reads can truncate embedded fonts near200KB. Use full editor clipboard copy/save/reload, then independent LF-only SHA256 without trim before source acceptance. Preserve failed capture as diagnostic, not authoritative source.
- Native Sheet copies can inherit public/service-account sharing and recalculate external derived output. Verify sharing explicitly; owner-only restriction follows scoped authorization. Keep exact fresh original exports/source/settings beside the native bound-script copy; do not enable external access/automation on the baseline copy. Never restore old exports over subsequent history.
- Approval review quota failure is not execution. Retry through normal review after the user resumes and the quota is available; never bypass it. Record failed action/checkpoint and eventual native receipt. Test loaders must resolve actual HTML partials rather than weakening behavioral assertions or editing unrelated runtime code.

## L14 — Cart validation diagnosis
When the Cart money-validation toast appears, inspect price, Customer Shipping and Shipping Subsidy separately. Owner Session53 explicitly approved UI default0 (normal shipping covers costs), superseding manual entry on every new Cart/sold form. Preserve edited contribution and original pending/retry intent; blank/invalid entries still reject and Customer Shipping must never be substituted for subsidy.

## L15 — Local UI evidence transport
For UTF-8 evidence transfers, concatenate raw network Buffers then decode once; decoding each chunk can introduce replacement characters at multibyte boundaries. Reject mismatched complete LF hashes, recheck native clipboard and retain failed evidence; never attribute transport corruption to live source or weaken equality to proceed.

## L16 — Shared partials and LabelDialog
Partials included by both Index.html and LabelDialog.html (e.g. W2LabelUI.html) must use `var(--token,#fallback)` for every colour; LabelDialog has no `:root` tokens. Phone (≤600 px) touch targets are ≥ 36 px (inputs 40). A new UI state class must be checked by computed style, not only by class presence (input rules carry `outline:none`).
