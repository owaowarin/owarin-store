

## Session 21 — malformed DONE replay guard prepared locally (2026-09-30)

Change/Request `P1-20260930-02` / `P1-ADD-DONE-RESULT-001`. Local test first failed as expected on malformed prior DONE Result: old replay wrote another DONE before JSON.parse raised SyntaxError. Candidate and sanitized test Code now validate success/row/SKU/sheet before replay write; corrupt result fails closed without another event. Add/UI Node suites pass after the fix. Before→after hashes, exact diffs, expected red failure, backup and recovery references: `04 Design Tools/logs/P1-20260930-02/result.md` and `changes.csv`. No Google source/Sheet/deploy or Back House LAB write, and P1-16 timeout plus this guard remain **uninstalled**. Shop still lacks ADD REQUESTS. Next: supported install/readback in the separate test Apps Script and live bounded QA, then focused integrity review/migration gate before any shop promotion. Sol / High for implementation/tests, Astra / High for consequential design review.
