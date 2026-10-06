# W2 — CLIENT + Label result

จัดทำ: 2026-10-06T00:30:33+07:00 · Stream B · Session45 · one writer · local candidate / exact isolated test only

**Implementation, native CLIENT failure/retry, label preview and original-ID replay PASS. W2 acceptance remains OPEN for exported label PDF and physical Print/Reprint.**

Exact revision: `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`. Nine candidate files, twelve complete isolated source readbacks; manifest and frozen W1 revision unchanged (`verification.json`). No production /exec deployment, real CLIENT migration, P0/P1 restart or Back House LAB action.

CLIENT search/selection retains stable ID and revision; existing selection defaults to order-only. Explicit new/update saves are separate from the recipient snapshot committed on ORDERS. A client save failure leaves the sale and recipient saved; Retry client save resumes its original intent, never sells again. Completing a Label later order only updates its label; reprint reads the saved recipient. Printable payload excludes Facebook, internal note and prices.

| Evidence | Verified result |
|---|---|
| `w2-results.json` | 14 targeted groups: after-effect/PREPARED/DONE/partial CLIENT failures, same-ID recovery, lost response, original payload, revisions/access/input, old recipient immutability and no extra sale |
| `label-results.json`, `stage.cjs` | 6 renderer checks; 15 expanded scripts; child print syntax; canonical standalone parity |
| `orders-ui.test.cjs` | Latest Orders response wins; stale success/error cannot restore actionable cards |
| `google-native.json` | Actual UI failure → explicit bounded original-intent text repair → original retry; native CLIENT strings preserve zeros and formula prefixes; 6 original-ID replays unchanged |
| `google-assertions.json`, `google-final.xlsx` | 1374889 bytes; all original tabs/cells/formulas and 1209 old journal rows preserved; +2 orders/+2 lines/+2 SALES/+87 events; 2 synthetic clients; all latest requests DONE; 111 unique SALES line IDs |
| `google-print.png`, `google-ui.png` | Actual Sheets dialog and web label READY100×150mm; Thai name/address, long title, zero-prefixed postal code and existing CAUTION asset visible |

Native CLIENT RichText coercion was a real failure that the earlier mock missed. `google-coercion.xlsx` and `beforeRetry` preserve it; eight empty native formulas/string phone/postal after bounded repair and a fresh second native client verify the corrected escaped writer. No old journal event/hash was rewritten. Native preview success and dispatch of Print do not establish PDF/printer success. The IAB print surface is inaccessible and its popup is not exposed as a managed tab; that gate needs the normal browser/printer using `CONTINUE.md`.

Focused review: `REVIEW.md`; recovery: `UNDO.md`; attempts: `implementation.md`/`changes.csv`; saved source attempts remain retained. Machine date crossed midnight: data/source actions are dated2026-10-05; replay/export/session close2026-10-06. Do not repeat fixtures, repair or completed sale requests. W3 release/migration remains a separate authorized task.
