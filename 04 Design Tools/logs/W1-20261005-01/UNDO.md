# Recovery — v38 isolated candidate

จัดทำ: 2026-10-05 +07

Code backup: candidate/backup/v37 (all four original files); Google source-before/ is full fresh pre-v38 source, source-readback/ full saved v38. Restore only the exact paired source plus W1Orders/Index after checking active source and backing up any later changes; helpers stay isolated-only and manifest remains unchanged. Do not restore source without first checking whether any unfinished request needs the current engine.

Data is retained evidence: scratch W1 DECIMAL REVIEW, three appended MAG copies1301–1303, Sold orders02/03, SALES1107–1109, and58 appended journal events. Never erase/reorder/re-hash old or new events, issue a replacement ID, or import a stale XLSX over newer data. Completed effects replay with original IDs; a true partial write requires compare/readback and original intent. No automatic data rollback is authorized or needed. Baseline google-before-v38.xlsx and final/native assertions allow exact comparison; old Pending08 must remain.

Docs backup before/ is original Session42; before-close/ is the intermediate Session43 checkpoint. Archived Session42 handoff remains under00 Docs/_archive/handoffs_old/. All one-shot build/checkpoint/close scripts have run; do not rerun. No production or LAB source/data was touched.
