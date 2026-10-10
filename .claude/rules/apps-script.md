---
paths:
  - "03 Apps Script/**"
---
# apps-script path rules (L3)
- Change a Product ID by typing over column B; never edit Publisher / Item name / Condition to trigger onEdit. (R252)
- Web App versioning (added 2026-09-18): `03 Apps Script/Web App/Code_vNN.gs` and `WebApp_vNN.gs` are a paired, numbered set (`WebApp_vNN.gs`'s header comment declares "pairs with Code.gs vNN"). Every code edit to either file, however small, bumps `NN` on both. In the same pass: copy the previous pair into `backup/` and replace the root copy with a short stub pointing at the new version (this folder cannot delete files, only add/overwrite); update the file table and any `_vNN.gs` filename in `Web App/README.md`; log the change in `00 Docs/HANDOFF_<date>.md`. `Index.html` has no version suffix — shared by every `Code_vNN.gs`. (R264)
