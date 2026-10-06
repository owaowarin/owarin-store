// ============================================================
// SheetAudit.gs v1 (2026-10-07) — READ-ONLY structure audit of the OWARIN STORE spreadsheet.
// Writes nothing to any sheet, file or property. Output = a dialog with a JSON download.
// JSON holds counts, headers, formula patterns, validation sources, value hashes — never cell values.
// Run: Apps Script editor → function dropdown → sheetAuditRun → Run (keep the Sheet open in another tab).
// Remove this file after the audit (it is not part of the paired Code/WebApp release).
// ============================================================
function sheetAuditRun() {
  var t0 = Date.now();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var FN = /\b(IMPORTRANGE|IMPORTXML|IMPORTHTML|IMPORTDATA|IMAGE|QUERY|FILTER|ARRAYFORMULA|VLOOKUP|HLOOKUP|XLOOKUP|INDEX|MATCH|INDIRECT|OFFSET|NOW|TODAY|RAND|RANDBETWEEN|SUMIFS?|COUNTIFS?|REGEXMATCH|REGEXREPLACE|REGEXEXTRACT|TEXTJOIN|UNIQUE|SORT|LAMBDA|MAP|BYROW|GOOGLEFINANCE)\s*\(/gi;
  var REF = /(?:'([^']+)'|([A-Za-z][A-Za-z0-9_ ]*?))!/g;
  function hash(v) {
    var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(v), Utilities.Charset.UTF_8);
    return d.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 16);
  }
  function blank(x) { return x === '' || x === null; }
  var names = ss.getSheets().map(function (s) { return s.getName(); });
  var out = { audit: 'SheetAudit v1', spreadsheetId: ss.getId(), at: new Date().toISOString(),
    timeZone: ss.getSpreadsheetTimeZone(), locale: ss.getSpreadsheetLocale(),
    recalculation: String(ss.getRecalculationInterval()), sheetCount: names.length, totalCells: 0,
    namedRanges: ss.getNamedRanges().map(function (n) { var r = n.getRange(); return { name: n.getName(), range: r.getSheet().getName() + '!' + r.getA1Notation() }; }),
    triggers: [], sheets: [], errors: [] };
  try { out.triggers = ScriptApp.getProjectTriggers().map(function (t) { return { handler: t.getHandlerFunction(), event: String(t.getEventType()), source: String(t.getTriggerSource()) }; }); }
  catch (e) { out.errors.push('triggers: ' + e.message); }
  ss.getSheets().forEach(function (sh, si) {
    var s = { name: sh.getName(), index: si + 1, hidden: sh.isSheetHidden(), maxRows: sh.getMaxRows(), maxCols: sh.getMaxColumns(),
      lastRow: sh.getLastRow(), lastCol: sh.getLastColumn(), frozenRows: sh.getFrozenRows() };
    out.totalCells += s.maxRows * s.maxCols;
    try {
      s.conditionalFormats = sh.getConditionalFormatRules().length;
      s.protections = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).length + sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length;
      s.charts = sh.getCharts().length;
      s.bandings = sh.getBandings().length;
      s.hasFilter = !!sh.getFilter();
      if (s.lastRow < 1 || s.lastCol < 1) { out.sheets.push(s); return; }
      var rng = sh.getRange(1, 1, s.lastRow, s.lastCol);
      var vals = rng.getValues(), fr = rng.getFormulasR1C1();
      s.headers = vals[0].map(function (h) { return String(h).slice(0, 60); });
      s.valuesHash = hash(vals); s.bodyHash = hash(vals.slice(1));
      var nonBlankRows = 0, refs = {}, cols = [];
      for (var c = 0; c < s.lastCol; c++) cols.push({ col: c + 1, nonBlank: 0, formulas: 0, patterns: {}, fns: {} });
      for (var r = 1; r < vals.length; r++) {
        var any = false;
        for (c = 0; c < s.lastCol; c++) {
          var f = fr[r][c], col = cols[c];
          if (!blank(vals[r][c]) || f) { any = true; col.nonBlank++; }
          if (f) {
            col.formulas++;
            var p = f.length > 220 ? f.slice(0, 220) + '…' : f;
            col.patterns[p] = (col.patterns[p] || 0) + 1;
            var m; FN.lastIndex = 0;
            while ((m = FN.exec(f))) { var k = m[1].toUpperCase(); col.fns[k] = (col.fns[k] || 0) + 1; }
            REF.lastIndex = 0;
            while ((m = REF.exec(f))) { var n = (m[1] || m[2] || '').trim(); if (n && names.indexOf(n) !== -1 && n !== s.name) refs[n] = (refs[n] || 0) + 1; }
          }
        }
        if (any) nonBlankRows++;
      }
      // a header-row formula (ARRAYFORMULA in row 1) counts too
      for (c = 0; c < s.lastCol; c++) if (fr[0][c]) { cols[c].headerFormula = fr[0][c].slice(0, 220); FN.lastIndex = 0; var hm; while ((hm = FN.exec(fr[0][c]))) cols[c].fns[hm[1].toUpperCase()] = (cols[c].fns[hm[1].toUpperCase()] || 0) + 1; REF.lastIndex = 0; while ((hm = REF.exec(fr[0][c]))) { var hn = (hm[1] || hm[2] || '').trim(); if (hn && names.indexOf(hn) !== -1 && hn !== s.name) refs[hn] = (refs[hn] || 0) + 1; } }
      s.dataRows = nonBlankRows; s.formulaCells = 0; s.refsTo = refs;
      s.columns = cols.map(function (col) {
        s.formulaCells += col.formulas;
        var top = Object.keys(col.patterns).sort(function (a, b) { return col.patterns[b] - col.patterns[a]; }).slice(0, 3)
          .map(function (k) { return { n: col.patterns[k], r1c1: k }; });
        var o = { col: col.col, header: s.headers[col.col - 1], nonBlank: col.nonBlank, formulas: col.formulas, distinctPatterns: Object.keys(col.patterns).length, top: top, fns: col.fns };
        if (col.headerFormula) o.headerFormula = col.headerFormula;
        return o;
      });
      var probe = Math.min(3, s.lastRow);
      if (s.lastRow >= 2) {
        s.validation = sh.getRange(probe, 1, 1, s.lastCol).getDataValidations()[0].map(function (dv, i) {
          if (!dv) return null;
          var cv = dv.getCriteriaValues(), src = '';
          if (cv && cv[0] && cv[0].getA1Notation) src = cv[0].getSheet().getName() + '!' + cv[0].getA1Notation();
          else if (cv && cv[0] && cv[0].length) src = 'list:' + cv[0].length;
          return { col: i + 1, type: String(dv.getCriteriaType()), source: src };
        }).filter(function (x) { return x; });
      }
    } catch (e) { out.errors.push(s.name + ': ' + e.message); }
    out.sheets.push(s);
  });
  out.seconds = Math.round((Date.now() - t0) / 100) / 10;
  var json = JSON.stringify(out), file = 'sheet-audit_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd_HHmm') + '.json';
  var html = '<div style="font:14px Arial;padding:8px">Read-only audit done in ' + out.seconds + ' s · ' + out.sheetCount + ' tabs · ' + Math.round(json.length / 1024) + ' KB' +
    (out.errors.length ? '<br>Errors: ' + out.errors.length : '') +
    '<br><br><a id="d" download="' + file + '" style="font-size:16px">⬇ Download ' + file + '</a></div>' +
    '<script>var j=' + JSON.stringify(json).replace(/</g, '\\u003c') + ';document.getElementById("d").href=URL.createObjectURL(new Blob([j],{type:"application/json"}));</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(170), 'Sheet audit (read-only)');
  return file;
}
