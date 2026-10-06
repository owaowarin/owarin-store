// ============================================================
// SUPERSEDED — 2026-09-18
// This file (Code.gs, unsuffixed) is NOT the live pricing/inventory engine.
// It is an orphaned v17/v19 branch: no doGet()/api() of its own, and its
// former pair WebApp.gs (also archived) still says "pairs with Code.gs v17"
// even though this file's own header claims v19 — the two drifted apart
// and neither matches the live sheet's real column layout.
//
// THE LIVE FILES ARE:
//   Code_v20.gs   (pricing / SKU / SP-2 engine — matches the live sheet's
//                  column order exactly, verified against the actual
//                  "OWARIN STORE" spreadsheet on 2026-09-18)
//   WebApp_v20.gs (API layer — explicitly declares "pairs with Code.gs v20")
//   Index.html    (single front-end file, shared / unversioned)
//
// Do not paste this file into Apps Script. Do not edit it.
// Full original content preserved at:
//   backup/Code_pre-v20_superseded_2026-09-18.gs
// ============================================================
