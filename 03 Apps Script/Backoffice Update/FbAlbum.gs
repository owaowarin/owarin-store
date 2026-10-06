// ============================================================================
// [FB ALBUM AUTOPOST] v3 - post product photos into Page albums with captions
// ============================================================================
// Add-on file. Do NOT paste this into Code.gs.
//
// v2: queue is ordered smallest album first; an album with active = FALSE in
//     the FB ALBUMS sheet is held back (counted separately, not "unmapped").
// v3: one photo per cover. Rows sharing Type + base title + Publisher + Original
//     are the same cover (RESTOCK copies) - only one is posted, the rest get
//     "DUPLICATE of <pid>" in the Posted column so they never queue again.
//
// Reuses what the project already provides - nothing is redeclared here:
//   _metaInvIndex() / _resolveColumns() / _val() / _getBaseTitle()
//   ALBUM_SHEET / ALBUM_HEADERS / _fbFindCol() / _withLock()
//   _tryWrite() / _sp2ResetWriteErrors() / _sp2WriteErrMsg()
//
// One-time setup:
//   Project Settings -> Script Properties -> PAGE_TOKEN = <Page Access Token>
// ============================================================================

// --- CONFIG -----------------------------------------------------------------
var FBA_PAGE_ID = '676297058896868';   // OWA - OWARIN's STORE
var FBA_API = 'https://graph.facebook.com/v23.0';
var FBA_SHEET = 'FB ALBUMS';
var FBA_BATCH = 40;                  // photos per run
var FBA_SLEEP_MS = 1500;                // pause between photos
var FBA_USAGE_STOP = 75;                  // stop the run above this % of quota
var FBA_TZ = 'Asia/Bangkok';
// ----------------------------------------------------------------------------

function _fbaToken() {
  throw new Error('LAB: Facebook network actions are disabled; use fbaDryRun or fbaAudit');
  var t = PropertiesService.getScriptProperties().getProperty('PAGE_TOKEN');
  if (!t) throw new Error('Script Property PAGE_TOKEN is not set');
  return t;
}

/** Strip the leading bracket prefix from an album name -> the Type value */
function _fbaAlbumKey(name) {
  return String(name == null ? '' : name).split('】').pop().trim();
}

/** Locate the columns of ALBUM CAPTION by header text */
function _fbaCaptionCols(sh) {
  var head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  var c = {
    pid: _fbFindCol(head, 'Product ID'),
    url: _fbFindCol(head, 'Image URL'),
    caption: _fbFindCol(head, 'Caption'),
    posted: _fbFindCol(head, 'Posted')
  };
  if (!c.pid || !c.url || !c.caption || !c.posted) {
    throw new Error('Missing headers in ' + ALBUM_SHEET + ' - expected ' + ALBUM_HEADERS.join(' | '));
  }
  return c;
}

/* === 1) fbaSyncAlbums === */
function fbaSyncAlbums() {
  var ui = SpreadsheetApp.getUi();
  var albums = [], guard = 0;
  var next = FBA_API + '/' + FBA_PAGE_ID + '/albums?fields=id,name,count&limit=100'
    + '&access_token=' + encodeURIComponent(_fbaToken());

  while (next && guard++ < 10) {
    var res = UrlFetchApp.fetch(next, { muteHttpExceptions: true });
    var body = JSON.parse(res.getContentText());
    if (body.error) { ui.alert('Graph API error ' + body.error.code, body.error.message, ui.ButtonSet.OK); return; }
    albums = albums.concat(body.data || []);
    next = (body.paging && body.paging.next) ? body.paging.next : null;
  }

  var ss = _owaSpreadsheet();
  var sh = ss.getSheetByName(FBA_SHEET) || ss.insertSheet(FBA_SHEET);

  var prevActive = {};
  if (sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
      if (r[0]) prevActive[String(r[0]).trim()] = r[4];
    });
  }

  var rows = [['album_key (Type)', 'album_id', 'Album name on Page', 'Photos', 'active']];
  albums.forEach(function (a) {
    var k = _fbaAlbumKey(a.name);
    rows.push([k, "'" + a.id, a.name, a.count || 0,
      prevActive.hasOwnProperty(k) ? prevActive[k] : true]);
  });

  _sp2ResetWriteErrors();
  _tryWrite(FBA_SHEET, function () {
    sh.clear();
    sh.getRange(1, 1, rows.length, 5).setValues(rows);
    sh.getRange(1, 1, 1, 5).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('G1:G7').setValues([['Last run'], ['unmapped (must be 0)'],
    ['Posted OK last run'], ['Errors last run'],
    ['Still queued'], ['On hold (active FALSE)'],
    ['Duplicate covers skipped']]).setFontWeight('bold');
    sh.autoResizeColumns(1, 8);
  });

  ui.alert('Done', 'Found ' + albums.length + ' albums on the Page.\nWritten to the '
    + FBA_SHEET + ' sheet.' + _sp2WriteErrMsg(), ui.ButtonSet.OK);
}

/* === 2) fbaAudit === */
function fbaAudit() {
  var ui = SpreadsheetApp.getUi();
  var A = _fbaAlbumMap();
  var inv = _metaInvIndex();

  var counts = {}, missing = {};
  Object.keys(inv).forEach(function (pid) {
    var it = inv[pid];
    if (it.status !== 'Instock') return;
    var t = it.type || '(blank)';
    counts[t] = (counts[t] || 0) + 1;
    if (!A.map[it.type] && !A.held[it.type]) missing[t] = (missing[t] || 0) + 1;
  });

  var order = Object.keys(counts).sort(function (a, b) { return counts[a] - counts[b]; });
  var lines = order.map(function (t) {
    var mark = A.held[t] ? 'HOLD' : (A.map[t] ? 'OK  ' : 'X   ');
    return mark + '  ' + counts[t] + '  ' + t;
  });
  var bad = Object.keys(missing);
  ui.alert('Type -> album mapping (smallest first)',
    lines.join('\n') + '\n\n' +
    (bad.length ? bad.length + ' type(s) have no album - create them on the Page, then run Sync again'
      : 'Every type is covered.') +
    '\n(HOLD = active is FALSE in ' + FBA_SHEET + ')',
    ui.ButtonSet.OK);
}

/** FB ALBUMS -> { map: {Type: album_id}, held: {Type: true} } */
function _fbaAlbumMap() {
  var sh = _owaSpreadsheet().getSheetByName(FBA_SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('No ' + FBA_SHEET + ' sheet yet - run Sync albums first');
  var map = {}, held = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
    var k = String(r[0]).trim();
    var id = String(r[1]).replace(/^'/, '').trim();
    if (!k || !id) return;
    if (r[4] === false) held[k] = true; else map[k] = id;
  });
  return { map: map, held: held };
}

/** Product ID -> Original (tells two printings of the same title apart) */
function _fbaOriginalIndex() {
  var ss = _owaSpreadsheet(), out = {};
  [GGB_SHEET, MAG_SHEET].forEach(function (sn) {
    var sh = ss.getSheetByName(sn);
    if (!sh || sh.getLastRow() < 3) return;
    var COL = _resolveColumns(sh);
    if (!COL.productId || !COL.original) return;
    sh.getRange(3, 1, sh.getLastRow() - 2, sh.getLastColumn()).getValues().forEach(function (r) {
      var pid = String(_val(r, COL, 'productId') || '').trim();
      if (pid) out[pid] = String(_val(r, COL, 'original') || '').trim();
    });
  });
  return out;
}

/* === 3) fbaPostBatch === */
function fbaPostBatch() { _fbaRun(FBA_BATCH, false); }
function fbaTest3() { _fbaRun(3, false); }
function fbaDryRun() { _fbaRun(FBA_BATCH, true); }

function _fbaRun(limit, dryRun) {
  return _withLock(function () {
    var ss = _owaSpreadsheet();
    var shC = ss.getSheetByName(ALBUM_SHEET);
    if (!shC || shC.getLastRow() < 2) throw new Error('No data in ' + ALBUM_SHEET);

    var C = _fbaCaptionCols(shC);
    var A = _fbaAlbumMap();
    var inv = _metaInvIndex();
    var orig = _fbaOriginalIndex();

    var n = shC.getLastRow() - 1;
    var vals = shC.getRange(2, 1, n, shC.getLastColumn()).getValues();

    var ok = 0, err = 0, stopped = '', writes = [], dupWrites = [], dupes = 0;

    // Pass 1 - group every eligible row by "same cover"
    var groups = {}, claimed = {}, keyOrder = [];
    for (var i = 0; i < n; i++) {
      var pid = String(vals[i][C.pid - 1]).trim();
      var url = String(vals[i][C.url - 1]).trim();
      if (!pid || !url) continue;

      var it = inv[pid];
      if (!it || it.status !== 'Instock') continue;

      var key = it.type + '|' + _getBaseTitle(it.name) + '|' + (it.publisher || '') + '|' + (orig[pid] || '');
      var pv = String(vals[i][C.posted - 1]).trim();
      var done = pv !== '' && pv.indexOf('ERROR') !== 0;

      if (done) { claimed[key] = pid; continue; }
      if (!groups[key]) { groups[key] = []; keyOrder.push(key); }
      groups[key].push({
        row: i + 2, pid: pid, url: url, it: it,
        caption: String(vals[i][C.caption - 1]),
        restock: /\(RESTOCK/i.test(it.name)
      });
    }

    // Pass 2 - keep one row per cover, mark the others as duplicates
    var byType = {}, unmapped = 0, heldCount = 0, remaining = 0;
    keyOrder.forEach(function (key) {
      var g = groups[key];

      if (claimed[key]) {
        g.forEach(function (r) { dupWrites.push([r.row, 'DUPLICATE of ' + claimed[key]]); dupes++; });
        return;
      }

      var pick = 0;
      for (var j = 0; j < g.length; j++) { if (!g[j].restock) { pick = j; break; } }
      var win = g[pick];
      g.forEach(function (r, j) {
        if (j !== pick) { dupWrites.push([r.row, 'DUPLICATE of ' + win.pid]); dupes++; }
      });

      var t = win.it.type;
      if (A.held[t]) { heldCount++; return; }

      var albumId = A.map[t];
      if (!albumId) { unmapped++; return; }

      remaining++;
      if (!byType[t]) byType[t] = [];
      byType[t].push({
        row: win.row, pid: win.pid, url: win.url,
        albumId: albumId, type: t, caption: win.caption
      });
    });

    if (!dryRun) writes = writes.concat(dupWrites);

    // Smallest album first
    var order = Object.keys(byType).sort(function (a, b) {
      return byType[a].length - byType[b].length || (a < b ? -1 : 1);
    });
    var queue = [];
    for (var oi = 0; oi < order.length && queue.length < limit; oi++) {
      var arr = byType[order[oi]];
      for (var ai = 0; ai < arr.length && queue.length < limit; ai++) queue.push(arr[ai]);
    }

    for (var k = 0; k < queue.length; k++) {
      var q = queue[k];

      if (dryRun) { Logger.log('[DRY] ' + q.type + ' <- ' + q.pid + ' ' + q.url); ok++; continue; }

      var res = UrlFetchApp.fetch(FBA_API + '/' + q.albumId + '/photos', {
        method: 'post',
        muteHttpExceptions: true,
        payload: { url: q.url, caption: q.caption, access_token: _fbaToken() }
      });

      var body = {};
      try { body = JSON.parse(res.getContentText()); } catch (e) { }

      // Some covers are stored on R2 as .png while the sheet always builds a .jpg URL.
      // Error 324 = image missing, so retry the same photo once with the .png extension.
      if (res.getResponseCode() !== 200 && (body.error || {}).code === 324 && /\.jpg$/i.test(q.url)) {
        Utilities.sleep(500);
        res = UrlFetchApp.fetch(FBA_API + '/' + q.albumId + '/photos', {
          method: 'post',
          muteHttpExceptions: true,
          payload: { url: q.url.replace(/\.jpg$/i, '.png'), caption: q.caption, access_token: _fbaToken() }
        });
        body = {};
        try { body = JSON.parse(res.getContentText()); } catch (e2) {}
      }

      if (res.getResponseCode() === 200 && body.id) {
        writes.push([q.row, body.id + ' | ' + Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd HH:mm')]);
        ok++;
      } else {
        var e2 = body.error || {};
        var code = e2.code || res.getResponseCode();
        writes.push([q.row, 'ERROR ' + code + ': ' + String(e2.message || '').slice(0, 150)]);
        err++;
        if (code === 190) { stopped = 'token expired or revoked (190)'; break; }
        if ([4, 17, 32, 341, 613].indexOf(code) >= 0) { stopped = 'rate limited (' + code + ')'; break; }
      }

      if (_fbaUsageTooHigh(res)) { stopped = 'quota above ' + FBA_USAGE_STOP + '%'; break; }
      Utilities.sleep(FBA_SLEEP_MS);
    }

    if (writes.length) {
      _sp2ResetWriteErrors();
      _tryWrite(ALBUM_SHEET + ' - Posted', function () {
        var rg = shC.getRange(2, C.posted, n, 1);
        var cur = rg.getValues();
        writes.forEach(function (w) { cur[w[0] - 2][0] = w[1]; });
        rg.setValues(cur);
      });
    }

    var shA = ss.getSheetByName(FBA_SHEET);
    _tryWrite(FBA_SHEET + ' - summary', function () {
      shA.getRange('H1:H7').setValues([
        [Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd HH:mm')],
        [unmapped],
        [ok],
        [err + (stopped ? ' - stopped: ' + stopped : '')],
        [Math.max(0, remaining - ok)],
        [heldCount],
        [dupes]
      ]);
    });

    var msg = 'Queued this run: ' + queue.length + (queue.length ? '  (' + queue[0].type + ' first)' : '') + '\n'
      + 'Posted OK: ' + ok + ' - errors: ' + err + '\n'
      + 'Still queued: ' + Math.max(0, remaining - ok) + '\n'
      + 'On hold (active FALSE): ' + heldCount + '\n'
      + 'Duplicate covers skipped: ' + dupes + '\n'
      + 'unmapped: ' + unmapped + (unmapped ? '  (must be 0)' : '')
      + (stopped ? '\n\nStopped early: ' + stopped : '')
      + (dryRun ? '\n\n(DRY RUN - nothing posted, no duplicate marks written)' : '');
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert('FB Album Auto-Post', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { }
    return msg;
  });
}

function _fbaUsageTooHigh(res) {
  try {
    var h = res.getAllHeaders();
    var raw = h['x-business-use-case-usage'] || h['X-Business-Use-Case-Usage'];
    if (!raw) return false;
    var u = JSON.parse(raw);
    for (var id in u) {
      var a = (u[id] && u[id][0]) || {};
      if (a.call_count >= FBA_USAGE_STOP || a.total_cputime >= FBA_USAGE_STOP || a.total_time >= FBA_USAGE_STOP) return true;
    }
  } catch (e) { }
  return false;
}

/* === 4) Helpers === */
function fbaCheckToken() {
  var res = UrlFetchApp.fetch(FBA_API + '/me?fields=id,name&access_token=' + encodeURIComponent(_fbaToken()),
    { muteHttpExceptions: true });
  SpreadsheetApp.getUi().alert('Token check', res.getContentText(), SpreadsheetApp.getUi().ButtonSet.OK);
}

function fbaInstallTrigger() {
  throw new Error('LAB: automatic posting triggers are disabled');
  fbaRemoveTrigger();
  ScriptApp.newTrigger('fbaPostBatch').timeBased().everyHours(4).create();
  SpreadsheetApp.getUi().alert('Trigger installed',
    'Every 4 hours x ' + FBA_BATCH + ' photos = about ' + (FBA_BATCH * 6) + ' photos/day',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function fbaRemoveTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'fbaPostBatch') ScriptApp.deleteTrigger(t);
  });
}

function fbaRetryErrors() {
  var sh = _owaSpreadsheet().getSheetByName(ALBUM_SHEET);
  var C = _fbaCaptionCols(sh);
  var rg = sh.getRange(2, C.posted, sh.getLastRow() - 1, 1);
  var v = rg.getValues(), cnt = 0;
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]).indexOf('ERROR') === 0) { v[i][0] = ''; cnt++; }
  }
  _sp2ResetWriteErrors();
  _tryWrite(ALBUM_SHEET + ' - retry', function () { rg.setValues(v); });
  SpreadsheetApp.getUi().alert('Cleared ' + cnt + ' error row(s)' + _sp2WriteErrMsg());
}

/** Clear only the DUPLICATE marks - use after fixing Publisher / Original data */
function fbaClearDuplicateMarks() {
  var sh = _owaSpreadsheet().getSheetByName(ALBUM_SHEET);
  var C = _fbaCaptionCols(sh);
  var rg = sh.getRange(2, C.posted, sh.getLastRow() - 1, 1);
  var v = rg.getValues(), cnt = 0;
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]).indexOf('DUPLICATE') === 0) { v[i][0] = ''; cnt++; }
  }
  _sp2ResetWriteErrors();
  _tryWrite(ALBUM_SHEET + ' - clear dupes', function () { rg.setValues(v); });
  SpreadsheetApp.getUi().alert('Cleared ' + cnt + ' duplicate mark(s)' + _sp2WriteErrMsg());
}

/**
 * Clear the Posted column for one Type only, leaving every other album untouched.
 * Use after an album is deleted and recreated on the Page: the old photo ids are dead.
 * Clears DUPLICATE and ERROR marks of that Type as well, otherwise the dedupe pass
 * would treat the cover as already claimed and skip it forever.
 * Safe to run from the Apps Script editor - it uses no SpreadsheetApp.getUi().
 */
function fbaClearPostedByType(typeWanted) {
  var sh = _owaSpreadsheet().getSheetByName(ALBUM_SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('No data in ' + ALBUM_SHEET);
  var C    = _fbaCaptionCols(sh);
  var inv  = _metaInvIndex();
  var n    = sh.getLastRow() - 1;
  var pids = sh.getRange(2, C.pid, n, 1).getValues();
  var rg   = sh.getRange(2, C.posted, n, 1);
  var v    = rg.getValues();
  var cnt  = 0;

  for (var i = 0; i < n; i++) {
    var it = inv[String(pids[i][0]).trim()];
    if (!it || it.type !== typeWanted) continue;
    if (String(v[i][0]).trim() !== '') { v[i][0] = ''; cnt++; }
  }

  _sp2ResetWriteErrors();
  _tryWrite(ALBUM_SHEET + ' - clear by type', function () { rg.setValues(v); });
  Logger.log('Cleared ' + cnt + ' Posted cell(s) for type: ' + typeWanted + _sp2WriteErrMsg());
  return cnt;
}

/** One-click wrapper - run after recreating the GAME GUIDE BOOKS album */
function fbaClearPostedGameGuideBooks() {
  return fbaClearPostedByType('GAME GUIDE BOOKS');
}

/** One-click wrapper - run after recreating the GAMEMAG SPECIAL album */
function fbaClearPostedGamemagSpecial() {
  return fbaClearPostedByType('GAMEMAG SPECIAL');
}

function fbaResetPosted() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Clear the whole Posted column',
    'Photos already posted will be posted again on the next run. Continue?',
    ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var sh = _owaSpreadsheet().getSheetByName(ALBUM_SHEET);
  var C = _fbaCaptionCols(sh);
  _tryWrite(ALBUM_SHEET + ' - reset', function () {
    sh.getRange(2, C.posted, sh.getLastRow() - 1, 1).clearContent();
  });
}
