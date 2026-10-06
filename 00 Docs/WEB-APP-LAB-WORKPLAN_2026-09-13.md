# Web App LAB — independent project plan

Planning review · 13 September 2026 · Stream B / OWARIN STORE

## Governing clarification

The owner's latest instruction is authoritative: **LAB is a new, independent project. Review the old shop only to understand its workflow. Do not merge the old project into LAB.**

Do not copy or adapt old application modules, treat the old sheet schema as mandatory, import legacy stock/customer/sales records, or connect the new app to the old shop. The older compatibility-first design in ORDERS-CRM-LABEL-DESIGN.md and Backoffice Update describes a different approach and is not this project's implementation plan.

The existing shop remains separate. No production rollout or replacement of its Apps Script is implied. The former LAB spreadsheet/project IDs are not automatically adopted as this new project's destinations; establish its own project folder, Apps Script project and dedicated spreadsheet before implementation.

## Relevant instructions and discrepancies

Use master context §§2–3 (workflow and evidence), §5.1 (data safety), §5.2 (shop process reference), §5.6 (public storefront remains parked), §6 (minimal implementation), §7 (design), §9 (handoff), §10 (opt-in skills) and §12 (source authority).

| Existing text | Treatment for this new project |
|---|---|
| §5.2: add-on only, never edit Code.gs, reuse legacy helpers, write through _tryWrite | Constraints for the existing shop. Do not force its modules or architecture into the independent LAB. Implement equivalent validation, safe writes and retry handling appropriate to the new project. |
| §5.2: P3 not started; §12: _v20 files are live | Historical assertions, not verified current deployment facts. They do not define the new LAB's starting point. |
| Web App README names Code.gs/WebApp.gs; Backoffice Update README contains successive, conflicting status notes | Consult only as historical process documentation. Do not pick a new-project source base from these filenames or old installation instructions. |
| §8 capability table and §10 advice to keep diagram-design only in Claude | Environment-specific guidance is stale for this session: local file tools and an installed OWARIN diagram-design skill are available. No live business-data access was exercised in this review. |
| §7 vermilion diagram palette versus existing app's gold accent | Use the uploaded palette for planning diagrams. Do not silently turn it into an approved app theme. Label output stays monochrome for printing. |
| §2 plan → confirm → edit | This request authorizes review and a concrete design proposal, not implementation of the app. Present the implementation boundary before code work. |

Do not rewrite the global master context's old-shop rules to describe the new project. Add a project-specific router once the new project location is selected; preserve the rules for the old shop. Any later correction to shared rules must keep English/Thai copies consistent and distinguish historical evidence from live verification.

## How the uploaded skills fit

| Skill | Useful application | Boundary |
|---|---|---|
| diagram-design — OWARIN skin | Architecture, customer/order relationships, and payment/shipping state diagrams. The companion architecture diagram demonstrates the installed washi/sumi/vermilion palette and font roles. | Documents the system; does not generate or deploy the operational app. |
| ponytail — full | Keep the new app small: native forms, one clear write path per operation, explicit validation, recoverable saves and minimal dependencies. | Does not mean importing the old code; retain safety and accessibility. |
| google-drive / google-sheets | Inspect and provision the dedicated LAB spreadsheet after its destination is fixed; validate field constraints and test writes. | Do not copy the old workbook or claim live counts from old exports. |
| visualize | Explore proposed Cart, order-card and recipient form interactions with fictional data. | A prototype is not proof of persistence, transaction safety or print accuracy. |
| council / grill-me | Optional decision review or a focused requirements interview, only if explicitly requested by name. | Not invoked by this generic skills review. |
| shopee-report-rules | Stream A reporting. | Not applied to the store's LAB architecture. |

The actual diagram-design SKILL.md and style-guide.md contain the OWARIN skin. Its bundled template-dark.html and some examples still contain older generic fonts/colours; use the current style guide rather than copying the example skin verbatim.

## Workflow requirements carried forward

These are owner requirements and design proposals, not measured facts about current stock.

- One physical book/copy has its own item ID, condition, price, images and location. Keep publication identity separate from the sellable physical copy. Model-related publications are in scope.
- Cart combines guide books and magazines. Sale method and actual sale price are recorded per copy, including auction winning prices.
- Order confirmation may be awaiting payment. Once confirmed, prevent that copy from being sold into another active order. Record the sale event once and keep its date distinct from the payment date.
- CRM searches buyer/Facebook name and fills a selected recipient. Save a recipient snapshot with each order; changing a customer default must not rewrite old orders.
- Track payment and shipping independently. Payment status follows received/reversed amounts, not a freely edited status dropdown. Printing alone does not mean shipped.
- Shipping policy supplied by the owner: first book THB 50, each additional book THB 10, capped at THB 100; no COD. This is a policy constant, not a fresh sheet result.
- Sale history shows item, sale date, method and individual price. Quotations sort titles naturally; successful Add clears fields and suggestions, failed Add preserves the entry.
- English interface and system descriptions; keep real book titles, personal names and addresses in their original language.
- Carry forward the approved intent of a compact monochrome shipping label with correct English/Japanese wording. The earlier Label Tool is a visual/process reference, not a dependency to import automatically. Proposed paper size remains 100 × 150 mm.

## Proposed new data model

Start with a small relational model in dedicated LAB tables. These are proposed logical records, not existing tabs or a migration plan.

| Record | Responsibility |
|---|---|
| Publications / Items | Publication metadata plus individual physical-copy identity, condition, price and location; image references belong to the correct copy. |
| Customers / Addresses | Stable customer ID, buyer aliases and saved recipient addresses. |
| Orders / Order lines | Order identity, dates, buyer, recipient snapshot, shipping charge and immutable per-copy sale snapshots. |
| Payments | Actual received/refunded/reversed entries with their own IDs and references. |
| Shipments | Recipient revision, packing/print status, carrier, tracking, shipment date and actual carrier expense. |
| Settings / Save requests | Business constants and the minimal request/recovery record required to prevent duplicate writes. |

Derive outstanding balances and the label queue; do not create duplicate editable sources of truth. Keep unknown carrier expenses distinct from zero. Do not regenerate or map old SKUs: new item identities belong to the new project.

## Sequence before and during implementation

| Step | Concrete result | Exit check |
|---|---|---|
| 1. Fix the boundary | Dedicated new-project location and explicit LAB app/sheet destinations; no links to old operational data. | Owner confirms this independent scope and the intended platform. Apps Script + dedicated Sheets is the current proposal, not a completed setup. |
| 2. Confirm workflow and data | Short field dictionary and state table: Draft, Confirmed, Cancelled; separate payment and shipment states. | Resolve cancellation/refund handling and whether one order always equals one parcel. Keep other preferences defaulted. |
| 3. Build one complete path | Fictional copies → select/create customer → confirm awaiting payment → reload order → receive payment → label preview → mark shipped. | Records survive reload; retry creates no duplicate order/payment; the same copy cannot be sold twice. |
| 4. Complete daily operations | Add/reset, mixed inventory, sale history, quotation sorting, recipient edits and label print controls. | Test successful and failed saves, incomplete address, changed address, unknown shipping expense and print/PDF layout. |
| 5. Test with controlled LAB data | Fresh export/snapshot of the new LAB, explicit dry run and before/after log; use synthetic data first. | Verify totals, partial/full payment, cancellation/refund, simultaneous/repeated saves and Table/formula compatibility where used. |
| 6. Review for actual use | Document limitations and a recoverable release plan for this new project. | Separate authorization to operate with real customer/stock data; do not replace or merge the old project implicitly. |

**Recommended first implementation slice:** customer → confirmed awaiting-payment order → reload → payment. Add label queue and shipment recording after that durable path works. This proves the most consequential behaviour before spending time on theme changes or secondary tools.

## Evidence and work boundary

Read on 13 September 2026: current local AGENTS.md, master context, relevant handbook/status sections, Web App README, Backoffice Update README/manifest and selected sales routing/locking code, the earlier design proposal, and the installed diagram-design/style/type references. The old files were reviewed only for process and documentary consistency.

No Google Sheet export, live Apps Script pull, business counts, current sales totals or current deployment status were obtained or claimed. No app source, existing diagram, spreadsheet, deployment, customer data, stock or image library was modified. The new architecture file is an illustrative target design, not evidence that these components are installed. Google Fonts are external resources and may fall back when offline.

## Adopted model and harness policy — 2026-09-13

Use [WEB-APP-LAB-HARNESS_2026-09-13.md](WEB-APP-LAB-HARNESS_2026-09-13.md): Sol / Medium for ordinary implementation, Sol / High for critical transaction logic, Astra / High for consequential contracts and focused review; Luna / Low is optional for isolated text tasks. The owner authorized applying the compact policy to future local Codex chats. Global AGENTS.md now contains it and config.toml defaults are Sol / Medium, with backups and verification. This does not automatically switch an active chat or configure ChatGPT web/Claude; actual model selection must be verified. New-project implementation and platform setup remain pending their bounded scope decision.
