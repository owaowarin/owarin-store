// ============================================================================
// [FB ALBUM AUTOPOST] v4 - post product photos into Page albums with captions
// ============================================================================
// Add-on file. Do NOT paste this into Code.gs.
//
// v2: queue is ordered smallest album first; an album with active = FALSE in
//     the FB ALBUMS sheet is held back (counted separately, not "unmapped").
// v3: one photo per cover. Rows sharing Type + base title + Publisher + Original
//     are the same cover (RESTOCK copies) - only one is posted, the rest get
//     "DUPLICATE of <pid>" in the Posted column so they never queue again.
// v4 (2026-10-04):
//   - Duplicate key (v4.2) = Type + base title + Condition (_fbaDupKey) - Copy Flags,
//     Publisher and Original are ignored. Posting order inside an album: natural Z -> A
//     so the Page shows A -> Z (Facebook lists the newest upload first).
//   - Reconcile before posting: photos in a product album that no Instock row
//     owns (sold, PID changed, wrong album, uploaded by hand) are deleted; Posted
//     ids whose photo is gone from the Page are cleared so the item is posted again.
//     The album cover is never deleted. Guard: one run never deletes more than
//     FBA_GUARD_PCT % of an album (album skipped + logged as GUARD instead).
//   - Only product albums are touched: album_key must be a Type that exists in
//     the inventory and not a Facebook system album (Photos, Mobile uploads...).
//   - fbaPurgeAll(): one-off reset - deletes every photo except the cover in all
//     product albums (click until COMPLETE), then clears Posted.
//   - New Instock items are appended to the caption sheet automatically; caption
//     and image URL are built live at post time (_buildCaption / _imageUrl).
//   - Every delete is logged to FB ALBUM LOG (photo id, album, product id, caption, reason).
//
// Reuses what the project already provides - nothing is redeclared here:
//   _metaInvIndex() / _metaDupKey() / _imageUrl() / _buildCaption()
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
var FBA_TRIGGER_HOURS = 1;              // backfill speed; switch to "every 4 hours" when Still queued = 0
var FBA_GUARD_PCT = 30;                 // reconcile never deletes more than this % of one album per run
var FBA_TIME_BUDGET_MS = 5 * 60 * 1000; // stop new work after 5 min (Apps Script hard limit is 6)
var FBA_LOG_SHEET = 'FB ALBUM LOG';
var FBA_SYSTEM_ALBUMS = ['Photos', 'Cover photos', 'Mobile uploads', 'Profile pictures', 'Timeline photos'];
// ----------------------------------------------------------------------------

function _fbaToken() {
  var t = PropertiesService.getScriptProperties().getProperty('PAGE_TOKEN');
  if (!t) throw new Error('Script Property PAGE_TOKEN is not set');
  return t;
}

/** Strip the leading bracket prefix from an album name -> the Type value */
function _fbaAlbumKey(name) {
  return String(name == null ? '' : name).split('】').pop().trim();
}

/** The caption tab, found by name. Tries the Code.gs constant first, then the known spellings, so a
 *  different Code.gs version (or a renamed tab) cannot silently break posting. */
function _fbaCaptionSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = [ALBUM_SHEET, 'FB: ALBUM CAPTION', 'FB ALBUM CAPTION', 'ALBUM CAPTION'];
  for (var i = 0; i < names.length; i++) {
    var sh = ss.getSheetByName(names[i]);
    if (sh) return sh;
  }
  return null;
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

  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    sh.getRange('G1:G9').setValues([['Last run'], ['unmapped (must be 0)'],
    ['Posted OK last run'], ['Errors last run'],
    ['Still queued'], ['On hold (active FALSE)'],
    ['Duplicate covers skipped'], ['Deleted last run'], ['Guard / skipped albums']]).setFontWeight('bold');
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
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FBA_SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('No ' + FBA_SHEET + ' sheet yet - run Sync albums first');
  var map = {}, held = {}, seen = {}, dups = [];
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
    var k = String(r[0]).trim();
    var id = String(r[1]).replace(/^'/, '').trim();
    if (!k || !id) return;
    if (seen[k] && dups.indexOf(k) < 0) dups.push(k);
    seen[k] = true;
    if (r[4] === false) held[k] = true; else map[k] = id;
  });
  // Two Page albums with the same name = the script cannot know which one is meant. Stop instead of guessing.
  if (dups.length) throw new Error('Duplicate album on the Page for: ' + dups.join(', ')
    + ' - delete the extra album, then run Sync albums');
  return { map: map, held: held };
}

/* === 3) fbaPostBatch === */
/** v4.2 album cover key: Type + base title + Condition only (Copy Flags / Publisher / Original ignored). */
function _fbaDupKey(it) {
  return [_getBaseTitle(it.name).toLowerCase().replace(/\s+/g, ' ').trim(), String(it.condition || '').toUpperCase()].join('|');
}
function _fbaSortName(n) { return _getBaseTitle(String(n || '')).toLowerCase().replace(/\s+/g, ' ').trim(); }
/** Natural compare: digit runs compare as numbers (vol 2 < vol 10). */
function _fbaNatCmp(a, b) {
  var x = String(a).match(/\d+|\D+/g) || [], y = String(b).match(/\d+|\D+/g) || [];
  for (var i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    var nx = /^\d/.test(x[i]), ny = /^\d/.test(y[i]);
    if (nx && ny) { var d = parseInt(x[i], 10) - parseInt(y[i], 10); if (d) return d; }
    else return x[i] < y[i] ? -1 : 1;
  }
  return x.length - y.length;
}

function fbaPostBatch() { _fbaRun(FBA_BATCH, false); }
function fbaTest3() { _fbaRun(3, false); }
function fbaDryRun() { _fbaRun(FBA_BATCH, true); }

function _fbaRun(limit, dryRun) {
  return _withLock(function () {
    var t0 = Date.now();
    if (_fbaPurgeState() === 'running') {
      var pm = 'Posting is paused: the purge is not finished yet (menu: PURGE auto). Nothing posted or deleted.';
      Logger.log(pm);
      try { SpreadsheetApp.getUi().alert('FB Album Auto-Post', pm, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e0) { }
      return pm;
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shC = _fbaCaptionSheet();
    if (!shC || shC.getLastRow() < 2) throw new Error('No data in ' + ALBUM_SHEET);

    var C = _fbaCaptionCols(shC);
    var A = _fbaAlbumMap();
    var inv = _metaInvIndex();
    if (!Object.keys(inv).length) throw new Error('Inventory read returned 0 rows - stopped, nothing posted or deleted');

    _sp2ResetWriteErrors();
    var added = dryRun ? 0 : _fbaAppendNew(shC, C, inv);

    var n = shC.getLastRow() - 1;
    var vals = shC.getRange(2, 1, n, shC.getLastColumn()).getValues();
    var pcol = vals.map(function (r) { return [r[C.posted - 1]]; });   // working copy of Posted
    var now = Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd HH:mm');

    // Step 1 - reconcile the Page with the sheet (delete sold/orphan photos, clear dead ids)
    var rec = _fbaReconcile(vals, C, inv, A, false, dryRun, t0);
    if (!dryRun) {
      rec.cleared.forEach(function (i) { pcol[i][0] = ''; vals[i][C.posted - 1] = ''; });
      rec.deletedRows.forEach(function (d) { pcol[d[0]][0] = 'DELETED ' + d[1] + ' | ' + now; vals[d[0]][C.posted - 1] = pcol[d[0]][0]; });
    }

    var ok = 0, err = 0, stopped = rec.stopped, dupes = 0;

    // Step 2 - group every Instock row by cover (same rule as the Meta feed, per Type)
    var groups = {}, claimed = {}, keyOrder = [];
    for (var i = 0; i < n; i++) {
      var pid = String(vals[i][C.pid - 1]).trim();
      var it = inv[pid];
      if (!pid || !it || it.status !== 'Instock') continue;

      var key = it.type + '|' + _fbaDupKey(it);
      var pv = String(vals[i][C.posted - 1]).trim();
      if (/^\d+ \|/.test(pv)) { claimed[key] = pid; continue; }   // has a live photo id
      if (!groups[key]) { groups[key] = []; keyOrder.push(key); }
      groups[key].push({ i: i, pid: pid, it: it, restock: /\(RESTOCK/i.test(it.name) });
    }

    // Step 3 - keep one row per cover, mark the others as duplicates
    var byType = {}, unmapped = 0, heldCount = 0, remaining = 0, noImg = 0;
    keyOrder.forEach(function (key) {
      var g = groups[key];
      if (claimed[key]) {
        g.forEach(function (r) { pcol[r.i][0] = 'DUPLICATE of ' + claimed[key]; dupes++; });
        return;
      }
      var pick = 0;
      for (var j = 0; j < g.length; j++) { if (!g[j].restock) { pick = j; break; } }
      var win = g[pick];
      g.forEach(function (r, j) { if (j !== pick) { pcol[r.i][0] = 'DUPLICATE of ' + win.pid; dupes++; } });

      var t = win.it.type;
      if (A.held[t]) { heldCount++; return; }
      var albumId = A.map[t];
      if (!albumId) { unmapped++; return; }
      var url = _imageUrl(win.pid);
      if (!url) { noImg++; return; }

      remaining++;
      (byType[t] = byType[t] || []).push({
        i: win.i, pid: win.pid, url: url, albumId: albumId, type: t, name: win.it.name,
        caption: _buildCaption(win.it, { price: true })
      });
    });

    // v4.2: inside an album, post Z -> A (natural order, vol 2 before vol 10) because
    // Facebook shows the newest upload first, so the album reads A -> Z on the Page.
    Object.keys(byType).forEach(function (t) {
      byType[t].sort(function (a, b) { return -_fbaNatCmp(_fbaSortName(a.name), _fbaSortName(b.name)) || (a.pid < b.pid ? 1 : -1); });
    });

    // Step 4 - post, smallest album first
    var order = Object.keys(byType).sort(function (a, b) {
      return byType[a].length - byType[b].length || (a < b ? -1 : 1);
    });
    var queue = [];
    for (var oi = 0; oi < order.length && queue.length < limit; oi++) {
      var arr = byType[order[oi]];
      for (var ai = 0; ai < arr.length && queue.length < limit; ai++) queue.push(arr[ai]);
    }
    if (stopped) queue = [];   // token / rate-limit stop during reconcile: do not post either

    for (var k = 0; k < queue.length; k++) {
      var q = queue[k];
      if (Date.now() - t0 > FBA_TIME_BUDGET_MS) { stopped = 'time budget'; break; }
      if (dryRun) { Logger.log('[DRY] ' + q.type + ' <- ' + q.pid + ' ' + q.url); ok++; continue; }

      var res = UrlFetchApp.fetch(FBA_API + '/' + q.albumId + '/photos', {
        method: 'post',
        muteHttpExceptions: true,
        payload: { url: q.url, caption: q.caption, access_token: _fbaToken() }
      });
      var body = {};
      try { body = JSON.parse(res.getContentText()); } catch (e) { }

      if (res.getResponseCode() === 200 && body.id) {
        pcol[q.i][0] = body.id + ' | ' + Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd HH:mm');
        ok++;
      } else {
        var e2 = body.error || {};
        var code = e2.code || res.getResponseCode();
        pcol[q.i][0] = 'ERROR ' + code + ': ' + String(e2.message || '').slice(0, 150);
        err++;
        if (code === 190) { stopped = 'token expired or revoked (190)'; break; }
        if ([4, 17, 32, 341, 613].indexOf(code) >= 0) { stopped = 'rate limited (' + code + ')'; break; }
      }
      if (_fbaUsageTooHigh(res)) { stopped = 'quota above ' + FBA_USAGE_STOP + '%'; break; }
      Utilities.sleep(FBA_SLEEP_MS);
    }

    // Write back once (Posted column) - only when not a dry run
    if (!dryRun) {
      _tryWrite(ALBUM_SHEET + ' - Posted', function () { shC.getRange(2, C.posted, n, 1).setValues(pcol); });
    }

    var shA = ss.getSheetByName(FBA_SHEET);
    if (!dryRun) _tryWrite(FBA_SHEET + ' - summary', function () {
      shA.getRange('G8:G9').setValues([['Deleted last run'], ['Guard / skipped albums']]);
      shA.getRange('H1:H9').setValues([
        [now], [unmapped], [ok],
        [err + (stopped ? ' - stopped: ' + stopped : '')],
        [Math.max(0, remaining - ok)], [heldCount], [dupes],
        [rec.deleted + (rec.cleared.length ? ' (+' + rec.cleared.length + ' dead ids cleared)' : '')],
        [rec.guard.join(' · ') || 0]
      ]);
    });

    var msg = 'New Instock rows added: ' + added + '\n'
      + 'Deleted from Page: ' + rec.deleted + (rec.cleared.length ? ' · dead ids cleared: ' + rec.cleared.length : '') + '\n'
      + (rec.guard.length ? 'GUARD (albums skipped): ' + rec.guard.join(' · ') + '\n' : '')
      + 'Queued this run: ' + queue.length + (queue.length ? '  (' + queue[0].type + ' first)' : '') + '\n'
      + 'Posted OK: ' + ok + ' - errors: ' + err + '\n'
      + 'Still queued: ' + Math.max(0, remaining - ok) + '\n'
      + 'On hold (active FALSE): ' + heldCount + '\n'
      + 'Duplicate covers skipped: ' + dupes + '\n'
      + 'No image on R2: ' + noImg + '\n'
      + 'unmapped: ' + unmapped + (unmapped ? '  (must be 0 - create the album, then Sync)' : '')
      + (stopped ? '\n\nStopped early: ' + stopped : '')
      + (dryRun ? '\n\n(DRY RUN - nothing posted or deleted; planned deletes are listed in FB ALBUM LOG as DRY-DELETE)' : '')
      + _sp2WriteErrMsg();
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert('FB Album Auto-Post', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { }
    return msg;
  });
}

/**
 * Compare every product album on the Page with the sheet.
 *   keep   = photo ids in Posted of rows that are Instock AND whose Type maps to this album
 *   delete = album photos not in keep (sold, PID changed, wrong album, uploaded by hand) - never the cover
 *   cleared = Instock rows whose photo id is no longer in their album (re-posted later this run)
 * purge = true: keep nothing (one-off reset), no guard.
 * Returns { deleted, deletedRows:[[rowIndex, photoId]], cleared:[rowIndex], guard:[text], stopped, remaining }
 */
function _fbaReconcile(vals, C, inv, A, purge, dryRun, t0) {
  var out = { deleted: 0, deletedRows: [], cleared: [], guard: [], stopped: '', remaining: 0 };
  var now = Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd HH:mm');

  var types = {};
  Object.keys(inv).forEach(function (p) { if (inv[p].type) types[inv[p].type] = true; });

  var keep = {}, byId = {};
  for (var i = 0; i < vals.length; i++) {
    var m = String(vals[i][C.posted - 1]).match(/^(\d+) \|/);
    if (!m) continue;
    byId[m[1]] = i;
    var it = inv[String(vals[i][C.pid - 1]).trim()];
    if (purge || !it || it.status !== 'Instock' || !A.map[it.type]) continue;
    (keep[A.map[it.type]] = keep[A.map[it.type]] || {})[m[1]] = i;
  }

  var log = [], keys = Object.keys(A.map);
  for (var k = 0; k < keys.length && !out.stopped; k++) {
    var key = keys[k], aid = A.map[key];
    if (!types[key] || FBA_SYSTEM_ALBUMS.indexOf(key) >= 0) continue;   // product albums only

    var list = _fbaAlbumPhotos(aid);
    if (!list.ok) { out.guard.push(key + ': read failed'); continue; }

    var have = {};
    list.photos.forEach(function (p) { have[p.id] = true; });
    // Purge keeps the cover. Normal runs delete any non-owned photo (a sold item may be the cover),
    // but never the last photo - an empty album can disappear and the API cannot recreate it.
    var protect = '';
    if (purge && list.photos.length) {
      protect = list.photos[list.photos.length - 1].id;                       // fallback: oldest listed photo
      list.photos.forEach(function (p) { if (p.id === list.cover) protect = p.id; });   // cover wins when it still exists
    }
    var kp = keep[aid] || {};

    // Instock rows whose photo is gone from this album -> post again
    Object.keys(kp).forEach(function (id) { if (!have[id]) out.cleared.push(kp[id]); });

    var del = list.photos.filter(function (p) { return p.id !== protect && !kp[p.id]; });
    if (!purge && del.length && del.length >= list.photos.length) {
      var lastKeep = list.cover && del.some(function (p) { return p.id === list.cover; }) ? list.cover : del[0].id;
      del = del.filter(function (p) { return p.id !== lastKeep; });   // keep one photo so the album survives
    }
    if (!purge && list.photos.length >= 10 && del.length > list.photos.length * FBA_GUARD_PCT / 100) {
      out.guard.push(key + ' ' + del.length + '/' + list.photos.length);
      log.push([now, 'GUARD', key, '', '', '', 'would delete ' + del.length + ' of ' + list.photos.length + ' - skipped']);
      continue;
    }

    for (var d = 0; d < del.length; d++) {
      if (Date.now() - t0 > FBA_TIME_BUDGET_MS) { out.stopped = 'time budget'; out.remaining += del.length - d; break; }
      var ph = del[d], ri = byId[ph.id];
      var pidRow = ri == null ? '' : String(vals[ri][C.pid - 1]);
      var why = purge ? 'purge' : (ri == null ? 'orphan - not in sheet' : 'not Instock or wrong album');
      var cap = String(ph.name || '').slice(0, 300);

      if (dryRun) { log.push([now, 'DRY-DELETE', key, "'" + ph.id, pidRow, cap, why]); out.deleted++; continue; }

      var res = UrlFetchApp.fetch(FBA_API + '/' + ph.id + '?access_token=' + encodeURIComponent(_fbaToken()),
        { method: 'delete', muteHttpExceptions: true });
      var body = {};
      try { body = JSON.parse(res.getContentText()); } catch (e) { }

      if (res.getResponseCode() === 200 && !body.error) {
        out.deleted++;
        if (ri != null) out.deletedRows.push([ri, ph.id]);
        log.push([now, 'DELETED', key, "'" + ph.id, pidRow, cap, why]);
      } else {
        var code = (body.error || {}).code || res.getResponseCode();
        log.push([now, 'DELETE ERROR ' + code, key, "'" + ph.id, pidRow, cap, String((body.error || {}).message || '').slice(0, 150)]);
        if (code === 190) { out.stopped = 'token expired or revoked (190)'; break; }
        if ([4, 17, 32, 341, 613].indexOf(code) >= 0) { out.stopped = 'rate limited (' + code + ')'; break; }
      }
      if (_fbaUsageTooHigh(res)) { out.stopped = 'quota above ' + FBA_USAGE_STOP + '%'; break; }
      Utilities.sleep(300);
    }
  }
  if (log.length) _fbaLog(log);
  return out;
}

/** Every photo id + caption in one album, and its cover. ok = false when any page failed (then nothing is deleted). */
function _fbaAlbumPhotos(aid) {
  var tok = encodeURIComponent(_fbaToken());
  var info = _fbaGetJson(FBA_API + '/' + aid + '?fields=cover_photo&access_token=' + tok);
  if (!info || info.error) return { ok: false };
  var photos = [], guard = 0;
  var next = FBA_API + '/' + aid + '/photos?fields=id,name&limit=100&access_token=' + tok;
  while (next && guard++ < 50) {
    var b = _fbaGetJson(next);
    if (!b || b.error) return { ok: false };
    photos = photos.concat(b.data || []);
    next = (b.paging && b.paging.next) ? b.paging.next : null;
  }
  if (next) return { ok: false };
  return { ok: true, photos: photos, cover: info.cover_photo ? String(info.cover_photo.id) : '' };
}

function _fbaGetJson(url) {
  try { return JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText()); }
  catch (e) { return null; }
}

/** Append Instock items that are not in the caption sheet yet (never removes rows - sold rows are the delete registry) */
function _fbaAppendNew(sh, C, inv) {
  var w = sh.getLastColumn(), n = sh.getLastRow() - 1;
  var head = sh.getRange(1, 1, 1, w).getValues()[0];
  var cName = _fbFindCol(head, 'Item name'), cSheet = _fbFindCol(head, 'Sheet');
  var have = {};
  if (n > 0) sh.getRange(2, C.pid, n, 1).getValues().forEach(function (r) { have[String(r[0]).trim()] = true; });

  var rows = [];
  Object.keys(inv).sort().forEach(function (pid) {
    var it = inv[pid];
    if (it.status !== 'Instock' || have[pid]) return;
    var r = [];
    for (var x = 0; x < w; x++) r.push('');
    r[C.pid - 1] = pid;
    r[C.url - 1] = _imageUrl(pid);
    r[C.caption - 1] = _buildCaption(it, { price: true });
    if (cName) r[cName - 1] = it.name;
    if (cSheet) r[cSheet - 1] = it.sheet;
    rows.push(r);
  });
  if (rows.length) {
    _tryWrite(ALBUM_SHEET + ' - append new', function () {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, w).setValues(rows);
    });
  }
  return rows.length;
}

/** Append rows to FB ALBUM LOG: Time | Action | Album | Photo ID | Product ID | Caption | Reason */
function _fbaLog(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(FBA_LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(FBA_LOG_SHEET);
    sh.getRange(1, 1, 1, 7).setValues([['Time', 'Action', 'Album', 'Photo ID', 'Product ID', 'Caption', 'Reason']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  _tryWrite(FBA_LOG_SHEET, function () { sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows); });
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

function fbaInstallTrigger() { _fbaInstallTrigger(FBA_TRIGGER_HOURS); }   // backfill: every hour
function fbaInstallTriggerNormal() { _fbaInstallTrigger(4); }               // after backfill: every 4 hours

function _fbaInstallTrigger(hours) {
  fbaRemoveTrigger();
  ScriptApp.newTrigger('fbaPostBatch').timeBased().everyHours(hours).create();
  SpreadsheetApp.getUi().alert('Trigger installed',
    'Every ' + hours + ' hour(s) x ' + FBA_BATCH + ' photos = about ' + Math.round(FBA_BATCH * 24 / hours) + ' photos/day',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function fbaRemoveTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'fbaPostBatch' || h === 'fbaPurgeStep') ScriptApp.deleteTrigger(t);
  });
}

function fbaRetryErrors() {
  var sh = _fbaCaptionSheet();
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
  var sh = _fbaCaptionSheet();
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
  var sh = _fbaCaptionSheet();
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
  var sh = _fbaCaptionSheet();
  var C = _fbaCaptionCols(sh);
  _tryWrite(ALBUM_SHEET + ' - reset', function () {
    sh.getRange(2, C.posted, sh.getLastRow() - 1, 1).clearContent();
  });
}

/* === 5) One-off reset (v4) === */
/**
 * Deletes every photo except the cover in all product albums, then clears Posted
 * so everything is posted again with captions. Switches the auto-run off first.
 * Each click works for up to 5 minutes - click again until it says COMPLETE.
 * Backup: the caption sheet is copied to "<sheet> BACKUP <date>" before the first delete.
 */
function fbaPurgeAll() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('⚠️ Delete every photo in all product albums',
    'Likes and comments on those photos are lost permanently.\n'
    + 'The album cover is kept. Captions and images are re-posted from the sheet and R2.\n'
    + 'Auto-run is switched off first. Click this again until it says COMPLETE.\n\nContinue?',
    ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  fbaRemoveTrigger();
  PropertiesService.getScriptProperties().setProperty('FBA_PURGE', 'running');
  var res = _fbaPurgeCore();
  ui.alert(res.done ? 'Purge COMPLETE' : 'Purge not finished - click again', res.text, ui.ButtonSet.OK);
}

/**
 * Hands-off purge: click once, an hourly trigger keeps deleting until every product album is down to its
 * cover, then clears Posted and starts the hourly posting trigger. Stop = "Stop auto-run" (state stays
 * 'running', so clicking this again resumes exactly where it left off - nothing is lost or repeated).
 */
function fbaPurgeAuto() {
  var ui = SpreadsheetApp.getUi();
  var st = _fbaPurgeState();
  if (st === 'done') {
    if (ui.alert('Purge already done',
      'The albums were already purged and posting has started. Running the purge again deletes every posted photo.\nStart a NEW purge?',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  } else if (st !== 'running') {
    if (ui.alert('⚠️ Delete every photo in all product albums',
      'Likes and comments on those photos are lost permanently.\n'
      + 'Covers are kept. Runs by itself every hour until finished, then starts the hourly posting.\n'
      + 'Stop any time with "Stop auto-run"; clicking this again resumes.\n\nContinue?',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }
  fbaRemoveTrigger();
  PropertiesService.getScriptProperties().setProperty('FBA_PURGE', 'running');
  ScriptApp.newTrigger('fbaPurgeStep').timeBased().everyHours(1).create();
  var res = _fbaPurgeCore();
  ui.alert(res.done ? 'Purge COMPLETE - posting started' : 'Purge running (hourly)',
    res.text + (res.done ? '' : '\nThe next steps run by themselves every hour. Progress: FB ALBUMS!H9 and FB ALBUM LOG.'),
    ui.ButtonSet.OK);
}

/** Trigger handler - no UI. */
function fbaPurgeStep() {
  if (_fbaPurgeState() !== 'running') { fbaRemoveTrigger(); return; }
  var res = _fbaPurgeCore();
  Logger.log(res.text);
}

function _fbaPurgeState() {
  return PropertiesService.getScriptProperties().getProperty('FBA_PURGE') || '';
}

/** One purge pass (up to ~5 min). Returns { done, text }. Marks state 'done' and starts posting when finished. */
function _fbaPurgeCore() {
  return _withLock(function () {
    var t0 = Date.now();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shC = _fbaCaptionSheet();
    if (!shC || shC.getLastRow() < 2) throw new Error('No data in ' + ALBUM_SHEET);
    var C = _fbaCaptionCols(shC);
    var A = _fbaAlbumMap();            // throws on duplicate albums
    var inv = _metaInvIndex();
    if (!Object.keys(inv).length) throw new Error('Inventory read returned 0 rows - stopped');

    var bk = shC.getName() + ' BACKUP ' + Utilities.formatDate(new Date(), FBA_TZ, 'yyyy-MM-dd');
    if (!ss.getSheetByName(bk)) shC.copyTo(ss).setName(bk);

    var n = shC.getLastRow() - 1;
    var vals = shC.getRange(2, 1, n, shC.getLastColumn()).getValues();
    var r = _fbaReconcile(vals, C, inv, A, true, false, t0);
    var done = !r.stopped && !r.guard.length;

    _sp2ResetWriteErrors();
    if (done) {
      _tryWrite(ALBUM_SHEET + ' - purge reset', function () { shC.getRange(2, C.posted, n, 1).clearContent(); });
      PropertiesService.getScriptProperties().setProperty('FBA_PURGE', 'done');
      ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === 'fbaPurgeStep') ScriptApp.deleteTrigger(t);
      });
      if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'fbaPostBatch'; })) {
        ScriptApp.newTrigger('fbaPostBatch').timeBased().everyHours(FBA_TRIGGER_HOURS).create();
      }
    }
    var status = done ? 'Purge COMPLETE ' + Utilities.formatDate(new Date(), FBA_TZ, 'MM-dd HH:mm') + ' - posting every ' + FBA_TRIGGER_HOURS + 'h'
      : 'Purge running - deleted ' + r.deleted + (r.stopped ? ', stopped: ' + r.stopped : '') + (r.guard.length ? ', not read: ' + r.guard.join('/') : '');
    var shA = ss.getSheetByName(FBA_SHEET);
    if (shA) _tryWrite(FBA_SHEET + ' - status', function () { shA.getRange('H9').setValue(status); });

    return { done: done, text: 'Deleted this pass: ' + r.deleted + '\n'
      + (r.guard.length ? 'Albums not read: ' + r.guard.join(' · ') + '\n' : '')
      + (r.stopped ? 'Stopped: ' + r.stopped + (r.remaining ? ' (' + r.remaining + ' left in the current album)' : '') + '\n' : '')
      + (done ? '\nPosted column cleared. Backup sheet: ' + bk + '\nPosting trigger is on (every ' + FBA_TRIGGER_HOURS + ' hour).' : '')
      + _sp2WriteErrMsg() };
  });
}

/** Submenu, added to the Inventory Tools menu by Code.gs onOpen() */
function fbaMenu_(ui) {
  return ui.createMenu('📷 FB Album Auto-Post')
    .addItem('🔑 Check Page token', 'fbaCheckToken')
    .addItem('🔄 Sync albums from Page', 'fbaSyncAlbums')
    .addItem('🔍 Audit Type → album', 'fbaAudit')
    .addSeparator()
    .addItem('🧪 Dry run (nothing posted or deleted)', 'fbaDryRun')
    .addItem('🧹 PURGE auto (hourly until done, then starts posting) ⚠️', 'fbaPurgeAuto')
    .addItem('🧹 PURGE once (manual, click until COMPLETE) ⚠️', 'fbaPurgeAll')
    .addItem('🧪 Post 3 photos (test)', 'fbaTest3')
    .addSeparator()
    .addItem('⏱️ Auto-run every hour (backfill)', 'fbaInstallTrigger')
    .addItem('⏱️ Auto-run every 4 hours (normal)', 'fbaInstallTriggerNormal')
    .addItem('⏹️ Stop auto-run (purge + posting; resume by clicking the same item again)', 'fbaRemoveTrigger')
    .addSeparator()
    .addItem('♻️ Retry ERROR rows', 'fbaRetryErrors');
}
