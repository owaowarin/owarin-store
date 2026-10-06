# Focused changed-diff review

จัดทำ: 2026-10-05 +07

Exact candidate: W1-20261005-01/v38@3E7CF8A86790DF274D2EEC0D01EFD09DB65C8BBCCB224A07F895F7F7069F0C42. Base: W1-20261004-05/v37@4495CECEB8821B2CFF4B04482B7395A922E371766F0A1E650A956C953B9DE38E. Current-writer review: no further concrete blocker in the small R7 diff; formal named Astra/High review remains OPEN because active model variant/effort is not exposed.

Initial unchanged-v37 review flagged strict-double money equality using an adapter plus XLSX cache values. Native correction: the XLSX export rounds cached numeric results; actual Apps Script getValues returns280.03000000000003 (same as V8) for390.10−100.05−10.02. The initial adapter repro is a cent-readback compatibility counterexample, NOT proof of a native v37 transaction failure. Native subtotal roundtrip of the old unrounded candidate was not tested. v38 is scoped cent-total/readback hardening; the original native-failure claim is withdrawn.

Reviewed changes: integer-cent accumulation is exact under100items×10000000baht (at most100000000000cents, safely below2^53); historical snapshots/payload hashes remain immutable and only materialized subtotal/total are canonicalized. Batch and legacy SALES share a typed finite numeric comparison against cent-exact profit, tolerance0.0000001baht (far below1cent), while exact formula verification is retained. New totals never alter the Shopee round(entered×.7−50) rule or shipping/customer distinction. Journal order, ARMED/DONE, allocated rows, owner/UID/claim guards and replay paths are unchanged.21 targeted tests and real Google decimal flows/replays confirm these boundaries; no independent reviewer or model-specific sign-off is claimed.

Native failure of the initial profit example is not established; do not cite it as such. The final JSON/XLSX comparison explicitly shows native/export representations. Prior v37 F05/Unicode/batch/recovery acceptance is historical package05 evidence, preserved.
