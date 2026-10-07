# v44 (2026-10-07): Add speed + approved menu cleanup (TOOLS-MENU-1). Server logic, guards and journal semantics unchanged.
from pathlib import Path
import csv,hashlib,shutil
from datetime import datetime
p=Path(__file__).resolve().parent;root=p.parents[2];app=root/'03 Apps Script/Web App'
def sha(b):return hashlib.sha256(b).hexdigest().upper()
def log(a,b,c,d):
 with (p/'changes.csv').open('a',encoding='utf-8',newline='') as f:csv.writer(f).writerow([datetime.now().astimezone().isoformat(),p.name,a,b,c,d])
def rep(s,a,b,n=1):
 assert s.count(a)==n,('anchor',s.count(a),a[:80]);return s.replace(a,b)
bk=app/'backup/pre-v44-20261007';bk.mkdir(parents=True,exist_ok=True)
for n in ['Code_v43.gs','WebApp_v43.gs']:
 shutil.copy2(app/n,bk/n);shutil.copy2(app/n,p/'before'/n) if (p/'before').exists() else (p/'before').mkdir() or shutil.copy2(app/n,p/'before'/n)
 log('BACKUP',n,str((bk/n).relative_to(root)),'sha '+sha((app/n).read_bytes()))
hdr='// v44 (2026-10-07): Add speed (journal lookup reads 2 columns, one formula readback, BOOKING found by name) + menu cleanup (R2 Images submenu, SERIES MAP, Rebuild ALL removed; builders moved to Setup & repair). Guards unchanged.\n'
# ---- Code
s=(app/'Code_v43.gs').read_text(encoding='utf-8');assert s.count('v43')>=2
s=rep(s,'Code.gs v43 (SP-2 pricing/SKU engine, pairs with WebApp.gs v43)','Code.gs v44 (SP-2 pricing/SKU engine, pairs with WebApp.gs v44)')
i=s.index('// v43 (2026-10-07)');s=s[:i]+hdr+s[i:]
s=rep(s,"""    var events = journal.getLastRow() > 1 ? journal.getRange(2, 1, journal.getLastRow() - 1, 17).getValues() : [];
    var prior = null, attempt = 1;
    for (var e = 0; e < events.length; e++) if (String(events[e][2]) === requestId) { prior = events[e]; attempt = Math.max(attempt, Number(events[e][3]) + 1); }
""","""    var found = _addFindPrior(journal, requestId);
    var prior = found.prior, attempt = found.attempt;
""")
s=rep(s,"function _addRequestEvent(sh, id,","""// v44: scan only Request ID + Attempt (cols 3-4) of every event, then read the full 17-column row of the LAST match.
// Same result as the old full read: prior = last matching row, attempt = max(attempt)+1.
function _addFindPrior(journal, requestId) {
  var last = journal.getLastRow();
  if (last < 2) return { prior: null, attempt: 1 };
  var ids = journal.getRange(2, 3, last - 1, 2).getValues();
  var lastIdx = -1, attempt = 1;
  for (var e = 0; e < ids.length; e++) if (String(ids[e][0]) === requestId) { lastIdx = e; attempt = Math.max(attempt, Number(ids[e][1]) + 1); }
  if (lastIdx < 0) return { prior: null, attempt: 1 };
  return { prior: journal.getRange(lastIdx + 2, 1, 1, 17).getValues()[0], attempt: attempt };
}
function _addRequestEvent(sh, id,""")
s=rep(s,"""    Object.keys(formulas).forEach(function (key) {
      if (sheet.getRange(newRow, COL[key]).getFormula() !== formulas[key])
        throw new Error('Add readback mismatch: formula ' + key);
    });""","""    var rowFormulas = sheet.getRange(newRow, 1, 1, lastCol).getFormulas()[0];
    Object.keys(formulas).forEach(function (key) {
      if (rowFormulas[COL[key] - 1] !== formulas[key])
        throw new Error('Add readback mismatch: formula ' + key);
    });""")
# menu
s=rep(s,'    .addItem("🗂️ Build / update SERIES MAP", "sp2BuildSeriesMap")\n','')
s=rep(s,'    .addItem("🧱 SP-2 column setup (current sheet)", "sp2Setup")\n    .addItem("🎨 Lay out sheet — order / hide / dropdowns", "sp2Layout")\n    .addSeparator()\n','')
s=rep(s,'    .addItem("🏷️ Fill Copy Flags from title", "sp2MigrateFlags")\n','')
s=rep(s,'    .addItem("📘 Build FB CATALOGUE (description + Meta fields)", "buildFbCatalogue")\n    .addItem("✍️ Rebuild descriptions from live data", "rebuildDescriptions")\n','')
s=rep(s,'    .addItem("📤 Build META EXPORT sheet (CSV for Meta)", "exportMetaCsv")\n','')
s=rep(s,"""    // ── Request-driven local image jobs ──
    .addSubMenu(ui.createMenu("🖼️ R2 Images")
      .addItem("📁 Export Instock snapshot", "r2ExportInstockSnapshot")
      .addItem("📋 View image job results", "r2ShowUploadResults"))
    .addSeparator()
""","")
s=rep(s,"""      .addItem("⚙️ Install trigger (run once)", "setupInstallableTrigger")
      .addSeparator()
""","""      .addItem("⚙️ Install trigger (run once)", "setupInstallableTrigger")
      .addItem("🧱 SP-2 column setup (current sheet)", "sp2Setup")
      .addItem("🎨 Lay out sheet — order / hide / dropdowns", "sp2Layout")
      .addItem("🏷️ Fill Copy Flags from title", "sp2MigrateFlags")
      .addItem("📘 Build FB CATALOGUE (description + Meta fields)", "buildFbCatalogue")
      .addItem("✍️ Rebuild descriptions from live data", "rebuildDescriptions")
      .addItem("📤 Build META EXPORT sheet (CSV for Meta)", "exportMetaCsv")
      .addSeparator()
""")
s=rep(s,"""      .addItem("🛠️ Renumber RESTOCK tags ⚠️", "fixAllRestockTags")
      .addItem("🔄 Rebuild ALL Product IDs ⚠️ breaks image links", "forceRegenerateAllSKUs"))""","""      .addItem("🛠️ Renumber RESTOCK tags ⚠️", "fixAllRestockTags"))""")
(p/'candidate').mkdir(exist_ok=True)
(p/'candidate/Code_v44.gs').write_text(s,encoding='utf-8',newline='\n')
# ---- WebApp
w=(app/'WebApp_v43.gs').read_text(encoding='utf-8')
w=rep(w,'WebApp.gs v43 (SP-2, pairs with Code.gs v43)','WebApp.gs v44 (SP-2, pairs with Code.gs v44)')
i=w.index('// v43 (2026-10-07)');w=w[:i]+hdr+w[i:]
w=rep(w,"""    var events = journal.getRange(2, 1, last - 1, 17).getValues();
    var prior = null;
    for (var i = 0; i < events.length; i++) if (String(events[i][2]) === id) prior = events[i];
""","""    var prior = _addFindPrior(journal, id).prior;
""")
w=rep(w,"""  var sh = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!sh) return { matches: [] };""","""  // v44: try the tab named BOOKING first (no 25-tab header scan); fall back to the header scan if renamed.
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BOOKING");
  if (sh) { var bc = _resolveColumns(sh); if (!bc.bookingName || !bc.gameTitle) sh = null; }
  if (!sh) sh = _sheetByHeaders(["bookingName", "gameTitle"]);
  if (!sh) return { matches: [] };""")
(p/'candidate/WebApp_v44.gs').write_text(w,encoding='utf-8',newline='\n')
print('built')
