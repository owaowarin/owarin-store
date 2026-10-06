# Web App LAB — model and harness plan

Adopted model policy · 13 September 2026 · Stream B

LAB is an independent new project. The old shop is workflow reference only. This plan covers AI-assisted development, not adding an AI model to the shop's runtime. The owner subsequently authorized applying the model policy to future chats; the installation status below records exactly what changed.

## Starting model policy

Use **GPT-5.6 Sol / Medium** for ordinary implementation and **GPT-6 Astra / High** for high-consequence design decisions and focused critical review. This is a proposed allocation to evaluate on LAB tasks, not a benchmark proving these settings are optimal.

| Work | Starting model / reasoning | Required output |
|---|---|---|
| Resolve requirements, item/order identities, sale/payment/shipping states and failure recovery | Astra / High | Compact accepted contract and acceptance cases before implementation |
| Build customer forms, inventory views, order cards and ordinary CRUD | Sol / Medium | One bounded change with appropriate functional evidence |
| Confirm sales, receive/reverse payments, cancel orders, prevent duplicate saves and double-selling | Sol / High; Astra / High review after checks | Correct state transitions plus failure/retry/concurrency tests; reviewer checks the exact changed revision |
| Labels, responsive layout, printable address overflow | Sol / Medium | Browser/print-preview evidence at the relevant sizes; text checks alone do not prove physical layout |
| Isolated English wording, help text, formatting a supplied factual summary | Luna / Low, optional | Narrow text-only diff; no authority to change IDs, formulas, validation, amounts, permissions or status logic |
| Routine tests and clear bug fixes | Sol / Medium | Failure reproduced, cause identified and relevant check passing |

Do not involve another model just to produce a summary the active worker can write cheaply. Start without a dedicated Terra role: too many handoffs can consume the savings. Consider Terra / Medium for well-specified routine implementation only if recorded LAB results show acceptable quality with lower total usage/time.

Higher reasoning settings are not defaults. Do not use Max/Ultra for routine work, open a Council automatically, or create parallel writers. A second review turn reduces shared-context bias but is not statistically independent assurance, even when the model differs.

**Source basis:** the active Codex tool schema lists Astra, Sol, Terra and Luna and the selected effort combinations. Official documentation describes their intended roles and recommends the lowest effort that meets the task, raising it when necessary. Availability can vary by account/client. [Official model guidance](https://learn.chatgpt.com/docs/models). Sol's documented reasoning options include medium/high. [Sol model reference](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

## Harness: use the existing development environment

Use Codex's normal workspace, tools, approvals and checks; do not build a custom agent framework or automatic model router for this project.

1. **Dedicated project boundary.** Establish the new project folder and its own source control, app project and data destination. Keep old-shop code/data outside the active project input. In the new app, validate the configured destination before every write; record its identifier in test evidence. A folder convention alone does not enforce access isolation: verify actual tool permissions and runtime destinations during setup.
2. **One writer at a time.** The current implementation owner edits. A reviewer initially reads the exact diff, requirements and evidence without changing files. Pass findings back to the writer; rerun affected checks after fixes. Add concurrent agents only after the user explicitly authorizes an independent, bounded split.
3. **A small task contract.** Every implementation task states its objective, relevant source/inputs, editable paths, exclusions, invariant rules, acceptance checks and authority to write. Review and approve the change boundary before editing under the project instructions. The approval covers that bounded implementation; a new material scope requires a new decision.
4. **Evidence over confidence.** A claim of done must identify the checked revision/files, actual commands and results, and remaining gaps. Syntax checks do not prove data integrity. UI screenshots do not prove persistence. Test failures cannot be hidden by weakening assertions.
5. **Durable handoff.** The project instructions route to the accepted requirements and current task. Keep decisions, test evidence and a dated handoff; do not reload the whole old-store history for every task. Use the existing workplan as the planning record instead of duplicating it across several specifications.
6. **Controlled data writes.** Start with fictional data. Before changing real LAB records, export/read that LAB freshly, preview the intended changes and record a before/after CSV. Do not import old stock/customer records as a shortcut. Failed or partially completed writes need an explicit recovery path.

The old store's add-on-file/helper conventions do not apply as a requirement to copy its implementation. General validation, auditability, non-deletion and approval requirements still apply.

## Task packet

Use a concise packet in the current task; no new framework is needed:

```text
Task: <one observable outcome>
Model / effort: <proposed assignment>
Read: <accepted requirements + relevant current files>
May edit: <exact new-project paths>
Do not touch: <old project, unrelated files, deployment/data outside this task>
Invariants: <money, stock, identity or access rules that must remain true>
Done when: <functional behaviour + failure cases + required evidence>
Authority: <approved scope and any final action still requiring approval>
Handoff: changed files; checks/results; unresolved issue; one next step
```

Keep the old project's source out of the task packet. Carry only the owner's process requirements that have been accepted for the new application.

## Delivery sequence and checkpoints

| Gate | Work owner | Evidence before moving on |
|---|---|---|
| Contract | Astra / High | Agreed physical-copy identity, confirmed-sale rule, independent payment/shipping states, cancellation/refund behaviour and one-order/parcel assumption |
| First durable path | Sol / Medium, High for transaction logic | Customer → awaiting-payment order → reload → payment persists in the new LAB; changed destination is explicit |
| Critical review | Astra / High, read-only review first | Same copy cannot be sold twice; repeated request does not duplicate money/order; conflicting reuse of a request ID is rejected; interrupted save can recover; source records and totals agree |
| Daily-use UI | Sol / Medium | Mixed inventory, individual auction prices, sale history, natural quotation sorting, Add success reset and failed Add retention |
| Labels/shipping | Sol / Medium | Complete address required; phone/postal strings preserved; CRM edits do not silently replace order snapshots; print preview fits; printing does not mark shipped |
| Release readiness | Astra / High for unresolved critical findings; execution by designated writer | Exact candidate tested, limitations documented, rollback/snapshot available and separate authorization for actual deployment or live business use |

Add negative tests for zero/negative/over payments as appropriate to the accepted rules, refund reversals, concurrent requests, unknown carrier expenses and incomplete addresses. Browser checks complement code tests; actual physical printer accuracy remains unverified until printed.

## Escalation and token discipline

- Begin at the assigned effort. Escalate once when a reproducible defect survives two materially different fixes, or immediately when the task reveals a high-consequence contract ambiguity. This is a starting workflow threshold, not a measured optimum.
- Pass the minimal reproducer, exact error, relevant diff and failed checks to Astra. Do not resend the whole chat or ask every model to reread the repository.
- An unknown business rule needs the owner's answer. A permission or network problem needs a permitted tool/environment fix. A stronger model cannot supply missing authority or missing evidence.
- After the difficult decision or defect is resolved, return to Sol for routine implementation. No automatic model switching is claimed or configured by this plan.
- Use targeted searches, bounded file reads and compact tool outputs. Load only the applicable skill. Do not run repeated full audits or regenerate graphics for a wording-only correction when editable text is available.
- Reuse a passing check until code or evidence changes. Re-run relevant checks after changes; do not cut critical tests solely to save tokens.
- At completed feature boundaries, hand off current state rather than repeating historical narration. Use a new task only when explicitly requested; do not create a task for every minor edit.

## Evaluate the allocation on real development work

Use the first customer/order slice as the pilot. Record task category, chosen model/effort, acceptance result, review findings, elapsed time and usage **if actually exposed by the tool**. Missing token data is unknown, not zero.

Judge cost by the whole accepted change, including retries and review. Do not promise a saving percentage before measurement or use API token prices as a proxy for subscription quota. Keep Sol if a lighter option creates more rework; reduce effort on later comparable tasks only when evidence supports it. A small successful pilot does not prove reliability for all future tasks.

The initial practical choice is: **Astra defines and reviews the critical contract; Sol implements the accepted slice; deterministic checks gate completion.**

## Status

The owner authorized adopting this policy for future chats on 13 September 2026. A compact global policy was appended to `C:/Users/JIN/.codex/AGENTS.md`; `C:/Users/JIN/.codex/config.toml` defaults changed from Luna / High to Sol / Medium. Both originals were backed up beside them with suffix `before-model-policy-20260913-162612`. Parsed TOML comparison verified that all other settings are unchanged; existing global guidance is preserved.

This installs persistent guidance and a default, not an automatic runtime router. No available current-chat tool switches its own running model. Future tasks should recommend a material change once, use a supported selection control if available and authorized, and verify the actual result; otherwise the owner selects the named model/effort in the app. Config defaults do not prove the current model. Existing chats may retain their choices; a fresh Codex session loads the global instruction chain. Project settings or explicit selections can override the default.

Scope: future local Codex sessions using this Codex home. ChatGPT web, Claude, other hosts and other CODEX_HOME profiles were not configured. No app source, sheet, background agent, automation or deployment changed. No live business figures, quota readings, costs or speed measurements were used. Shared master-context settings for Claude remain unchanged. See [global instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [configuration precedence](https://learn.chatgpt.com/docs/config-file/config-basic).
