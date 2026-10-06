# Next work — local/test release preparation

จัดทำ: 2026-10-06T01:02:10+07:00 · exact `W2-20261005-01/v39@7043D1B05E52DEAA3272C4AB3986790592081BD1C2688C5E3867A4D4FBC88D51`

| Item | State / scope |
|---|---|
| Exact source and evidence packet | PREPARED; nine candidate LF hashes and twelve recorded test-source files freshly match; manifest/QA exclusions remain recorded in original verification.json |
| Legacy CLIENT A:F → ID/revision migration | NEXT local synthetic dry-run; use original six-header contract; preserve every A:F value/formula, unique stable IDs even for equal names, blank rows, same-ID retry and expected revision; do not read/migrate real shop data |
| Full isolated non-print E2E / recovery | Later bounded check against this exact revision; reuse existing contracts and original IDs; any new fixture/mutation needs fresh isolated export and before→after CSV; never repeat one-shot old Prepare/repair blindly |
| Undo and installation packet | Original W2 UNDO/source backups retained; assemble only local/test instructions; real schema/source reconciliation and production release remain a separate scope |
| PDF page/content and physical Print/Reprint | **DEFERRED — ยังไม่ได้ทดสอบ; NOT PASS**, owner decision2026-10-06. Keep visible through W3; do not silently close or retry browser setup while doing independent work |
| Production / numbered deployment / LAB | Excluded; owner print deferral is not production approval |

ONE next step: local synthetic legacy CLIENT migration dry-run and same-ID/revision preservation check, with no live-store change. No runtime edit is needed to start; use existing W2 schema helpers and test harness. Implement only a reproduced defect, then affected tests and focused review. Do not add another renderer, CRM table, automation, router or agent. Native PDF/printer evidence stays separate and untested until actual output can be inspected.
