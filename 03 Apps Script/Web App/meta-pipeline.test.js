// v27/v28 regression test: PID CHANGES ledger, FB CATALOGUE follow/archive, description template,
// live R2 index, Refresh Meta feed health check. Loads Code_v44.gs then R2Upload.gs (as in the project).
// Run: node meta-pipeline.test.js
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

let _sid = 0;
function mkSheet(ss, name, rows) {
  const id = ++_sid;
  const g = rows.map((r) => r.slice());
  const lastRow = () => { for (let i = g.length - 1; i >= 0; i--) if ((g[i] || []).some((v) => v !== "" && v != null)) return i + 1; return 0; };
  const lastCol = () => Math.max(0, ...g.map((r) => { r = r || []; for (let j = r.length - 1; j >= 0; j--) if (r[j] !== "" && r[j] != null) return j + 1; return 0; }));
  const cell = (r, c) => { const v = (g[r - 1] || [])[c - 1]; return v == null ? "" : v; };
  const sh = {
    _g: g, getName: () => name, getSheetId: () => id, getParent: () => ss, getLastRow: lastRow, getLastColumn: lastCol,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      getValue: () => cell(r, c),
      setValues: (vals) => vals.forEach((row, i) => row.forEach((v, j) => { while (g.length < r + i) g.push([]); g[r - 1 + i] = g[r - 1 + i] || []; g[r - 1 + i][c - 1 + j] = v; })),
      setValue: (v) => { while (g.length < r) g.push([]); g[r - 1][c - 1] = v; },
      setFontWeight() { return this; }
    }),
    deleteRow: (r) => { g.splice(r - 1, 1); },
    clear() { g.length = 0; }, setFrozenRows() {}
  };
  return sh;
}

function setup(opts) {
  const alerts = [], mails = [], ctxRef = {}, trig = [], deleted = [];
  const scriptApp = { getProjectTriggers: () => opts.oldTrigger ? [{ getHandlerFunction: () => 'refreshMetaFeedAuto' }] : [], deleteTrigger: () => deleted.push(1),
    newTrigger: (fn) => { const b = { fn, calls: [] }; const p = new Proxy(b, { get: (o, k) => k === 'create' ? () => trig.push(o) : k in o ? o[k] : (...a) => { o.calls.push([k, ...a]); return p; } }); return p; } };
  const sheets = {};
  const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mkSheet(ss, n, [])), setActiveSheet() {}, toast() {} };
  const INV = ["Item name", "Product ID", "Status", "Condition", "Publisher", "Price", "Original", "Copy Flags"];
  sheets["GAME GUIDE BOOKS"] = mkSheet(ss, "GAME GUIDE BOOKS", [INV, [],
    ["Drakengard (RESTOCK-03)", "OWA-NEW", "Instock", "A", "YK GROUP", 250],
    ["Harvest Moon 64", "OWA-DUPNEW", "Instock", "A", "CT", 300],
    ["Fresh Book", "OWA-FRESH", "Instock", "A", "GS", 150],
    ["No Photo Book", "OWA-NOPIC", "Instock", "A", "GS", 99]]);
  sheets["MAGAZINE"] = mkSheet(ss, "MAGAZINE", [INV, []]);
  sheets["R2 IMAGES"] = mkSheet(ss, "R2 IMAGES", [[], ["", "", "", "", "pid", "n", "ext"], ["", "", "", "", "OWA-NEW", 1, "jpg"]]);
  const FB = [["Product ID", "FB Title", "Freebies", "Description"], ["", "", "", ""],
    ["OWA-OLD", "Drakengard (custom title)", "poster", ""],
    ["OWA-DUPOLD", "old row", "", ""],
    ["OWA-DUPNEW", "", "", ""],
    ["OWA-GONE", "sold long ago", "", ""]];
  (opts.extraOrphans || []).forEach((p) => FB.push([p, "", "", ""]));
  sheets["FB CATALOGUE"] = mkSheet(ss, "FB CATALOGUE", FB);
  const ui = { alert: (t, m) => { alerts.push(String(t) + "\n" + String(m || "")); return "YES"; }, Button: { YES: "YES", OK: "OK" }, ButtonSet: { YES_NO: 1, OK: 2 } };
  const csv = "pid,n,ext\nOWA-NEW,2,jpg\nOWA-DUPNEW,2,png|jpg\nOWA-FRESH,1,jpg\n" + (opts.extraCsv || "");
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => { if (ctxRef.c && ctxRef.c._headless) throw new Error('getUi in headless'); return ui; }, flush() {} },
    MailApp: { sendEmail: (...a) => mails.push(a) }, Session: { getEffectiveUser: () => ({ getEmail: () => 'me@x' }) },
    ScriptApp: scriptApp,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Logger: { log() {} }, console,
    Utilities: { parseCsv: (s) => s.trim().split("\n").map((l) => l.split(",")) },
    UrlFetchApp: { fetch: () => (opts.liveDown ? { getResponseCode: () => 503, getContentText: () => "" } : { getResponseCode: () => 200, getContentText: () => csv }) }
  };
  vm.createContext(ctx); ctxRef.c = ctx;
  vm.runInContext(fs.readFileSync(__dirname + "/Code_v44.gs", "utf8"), ctx);
  vm.runInContext(fs.readFileSync(__dirname + "/R2Upload.gs", "utf8"), ctx);
  return { ctx, sheets, ss, alerts, mails, trig, deleted };
}

// 1) ledger + chain resolution
{
  const { ctx, sheets } = setup({});
  vm.runInContext('_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 3, "OWA-OLD", "OWA-MID", "x")', ctx);
  vm.runInContext('_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 3, "OWA-MID", "OWA-NEW", "Drakengard (RESTOCK-03)")', ctx);
  vm.runInContext('_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 4, "OWA-DUPOLD", "OWA-DUPNEW", "Harvest Moon 64")', ctx);
  vm.runInContext('_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 4, "OWA-SAME", "OWA-SAME", "noop")', ctx);
  const L = sheets["PID CHANGES"]._g;
  assert.strictEqual(L.length, 4, "header + 3 real changes (no-op ignored)");
  assert.deepStrictEqual(L[0], ["Timestamp", "Sheet", "Row", "Old Product ID", "New Product ID", "Item name"]);
  const m = vm.runInContext("_pidChangeMap()", ctx);
  assert.strictEqual(m["OWA-OLD"], "OWA-NEW", "chain OLD -> MID -> NEW resolves to the latest");
  assert.strictEqual(m["OWA-DUPOLD"], "OWA-DUPNEW");

}
// 2) Refresh Meta feed: follow, archive, description template, live index, health check
{
  const S = setup({});
  const { ctx, sheets } = S;
  for (const [o, n] of [["OWA-OLD", "OWA-NEW"], ["OWA-DUPOLD", "OWA-DUPNEW"]])
    vm.runInContext(`_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 3, "${o}", "${n}", "t")`, ctx);
  vm.runInContext("refreshMetaFeed()", ctx);
  const g = sheets["FB CATALOGUE"]._g, H = g[0];
  const col = (h) => H.findIndex((x) => String(x).toLowerCase() === h.toLowerCase());
  const byPid = (p) => g.find((r) => r[0] === p);
  assert.ok(byPid("OWA-NEW"), "OWA-OLD row was renamed in place to OWA-NEW");
  assert.strictEqual(byPid("OWA-NEW")[col("FB Title")], "Drakengard (custom title)", "manual FB Title follows the rename");
  assert.strictEqual(byPid("OWA-NEW")[col("Freebies")], "poster");
  assert.ok(!byPid("OWA-OLD") && !byPid("OWA-GONE") && !byPid("OWA-DUPOLD"), "orphans left FB CATALOGUE");
  assert.strictEqual(g.filter((r) => r[0] === "OWA-DUPNEW").length, 1, "no duplicate row when the new PID already had one");
  const A = sheets["FB CATALOGUE ARCHIVE"]._g;
  assert.strictEqual(A.length, 3, "header + 2 archived rows (OWA-DUPOLD, OWA-GONE)");
  assert.deepStrictEqual(A.slice(1).map((r) => r[2]).sort(), ["OWA-DUPOLD", "OWA-GONE"]);
  assert.strictEqual(A[1][1], "Product ID not in inventory");
  assert.ok(byPid("OWA-FRESH"), "new Instock product got a row (v20b)");
  assert.ok(String(byPid("OWA-FRESH")[col("Description")]).length > 0, "F2: blank description filled from the template");
  assert.ok(/\/library\/OWA-DUPNEW\/1\.png$/.test(byPid("OWA-DUPNEW")[col("image_link")]), "F4: ext comes from the live R2 csv");
  const me = sheets["META EXPORT"]._g;
  assert.deepStrictEqual(me.slice(1).map((r) => r[0]).sort(), ["OWA-DUPNEW", "OWA-FRESH", "OWA-NEW"]);
  const last = S.alerts[S.alerts.length - 1];
  assert.ok(/1 Instock product\(s\) are NOT in the feed/.test(last), "health check headline");
  assert.ok(/OWA-NOPIC No Photo Book — no photo on R2/.test(last), "health check names the fix");
  assert.ok(/Not in inventory \(FB CATALOGUE rows to clean up\): 0/.test(last), "nothing left to clean up");
  assert.ok(/image index: R2 meta\/images\.csv \(live\)/.test(last), "index source shown in the popup");
  assert.ok(/FB CATALOGUE:/.test(last) && /followed 1 Product ID change/.test(last) && /moved 2 row/.test(last), "build log is shown in the same popup");
  assert.strictEqual(S.alerts.length, 1, "Refresh Meta feed shows exactly one popup (no confirm, no second alert)");
}
// 3) live index down -> R2 IMAGES sheet fallback still works
{
  const { ctx, sheets } = setup({ liveDown: true });
  vm.runInContext("refreshMetaFeed()", ctx);
  const g = sheets["FB CATALOGUE"]._g, H = g[0];
  const il = H.findIndex((x) => String(x).toLowerCase() === "image_link");
  assert.ok(/\/library\/OWA-NEW\/1\.jpg$/.test(g.find((r) => r[0] === "OWA-NEW")[il]), "fallback sheet index gives OWA-NEW its link");
  assert.strictEqual(g.find((r) => r[0] === "OWA-DUPNEW")[il], "", "not in the sheet index -> blank link (no guessing)");
  assert.strictEqual(vm.runInContext("_r2ImageIndexSource", ctx), "R2 IMAGES sheet (fallback: live read failed)");
}
// 4) safety stop: too many orphans -> nothing archived
{
  const extra = Array.from({ length: 60 }, (_, i) => "OWA-X" + i);
  const S = setup({ extraOrphans: extra });
  vm.runInContext("refreshMetaFeed()", S.ctx);
  assert.ok(!S.sheets["FB CATALOGUE ARCHIVE"], "no archive sheet created above the safety limit");
  assert.ok(S.sheets["FB CATALOGUE"]._g.some((r) => r[0] === "OWA-GONE"), "rows kept");
  assert.ok(/above the safety limit/.test(S.alerts[S.alerts.length - 1]));
}
// 5) P1 hook: editing Publisher rewrites the Product ID in _recalcRow -> the change is logged
{
  const sheets = {};
  const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mkSheet(ss, n, [])), toast() {} };
  const gg = sheets["GAME GUIDE BOOKS"] = mkSheet(ss, "GAME GUIDE BOOKS", [["Item name", "Product ID", "Status", "Condition", "Publisher", "Price"], [],
    ["Drakengard (RESTOCK-03)", "OWA-GGBD059AR03", "Instock", "A", "YK GROUP", 250]]);
  const gr = gg.getRange;   // formula/format setters used by _setDerivedFormulasForRow are no-ops here
  gg.getRange = (...a) => { const r = gr(...a); return new Proxy(r, { get: (o, k) => (k in o ? o[k] : () => r) }); };
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ({ alert() {} }), flush() {} }, Logger: { log() {} }, console,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + "/Code_v44.gs", "utf8"), ctx);
  ctx.__gg = gg;
  vm.runInContext('_recalcRow(__gg, 3, _resolveColumns(__gg), "GAME GUIDE BOOKS", { publisher: true })', ctx);
  const L = sheets["PID CHANGES"]._g;
  assert.strictEqual(L.length, 2, "one ledger row");
  assert.strictEqual(L[1][3], "OWA-GGBD059AR03");
  assert.strictEqual(L[1][4], gg._g[2][1], "ledger new PID = the PID now in the sheet");
  assert.notStrictEqual(gg._g[2][1], "OWA-GGBD059AR03");
  vm.runInContext('_recalcRow(__gg, 3, _resolveColumns(__gg), "GAME GUIDE BOOKS", { publisher: true })', ctx);
  assert.strictEqual(sheets["PID CHANGES"]._g.length, 2, "recalc that keeps the same PID logs nothing");
}
console.log("meta-pipeline.test.js: all assertions passed");

// ===== v28: headless nightly refresh =====
const run = (S, fn) => vm.runInContext(fn, S.ctx);
const logRows = (S) => (S.sheets["REFRESH LOG"] ? S.sheets["REFRESH LOG"]._g.slice(1) : []);
// 6) happy path: no UI, no popup, no email, one OK row, META EXPORT written
{
  const S = setup({});
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(S.alerts.length, 0, "no popup in headless mode");
  assert.strictEqual(S.mails.length, 0, "no email when OK");
  const L = logRows(S);
  assert.strictEqual(L.length, 1); assert.strictEqual(L[0][1], "auto"); assert.strictEqual(L[0][2], "OK"); assert.strictEqual(L[0][3], 3);
  assert.strictEqual(S.sheets["META EXPORT"]._g.length, 4, "header + 3 products");
  assert.strictEqual(run(S, "_headless"), false, "_headless reset");
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(S).length, 2, "one row per run");
}
// 7) drop guard: current META EXPORT has 10 rows, new build only 3 -> GUARD, untouched, email sent
{
  const S = setup({});
  const ex = S.ss.insertSheet("META EXPORT");
  ex.getRange(1, 1, 11, 2).setValues([["id", "x"]].concat(Array.from({ length: 10 }, (_, i) => ["OLD" + i, "k"])));
  run(S, "refreshMetaFeedAuto()");
  const L = logRows(S);
  assert.strictEqual(L[0][2], "GUARD");
  assert.strictEqual(S.sheets["META EXPORT"]._g.length, 11, "META EXPORT untouched");
  assert.strictEqual(S.sheets["META EXPORT"]._g[1][0], "OLD0");
  assert.strictEqual(S.mails.length, 1); assert.strictEqual(S.mails[0][0], "me@x"); assert.ok(/GUARD/.test(S.mails[0][1]));
  assert.strictEqual(S.alerts.length, 0);
}
// 8) exactly at threshold passes (3 ready vs 3 rows -> fine; 4 rows -> 3 >= 3.2? no -> guard)
{
  const S = setup({});
  S.ss.insertSheet("META EXPORT").getRange(1, 1, 4, 2).setValues([["id", "x"], ["a", 1], ["b", 1], ["c", 1]]);
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(S)[0][2], "OK", "3 ready vs 3 existing passes");
}
// 9) Ready = 0 -> GUARD even with empty previous export
{
  const S = setup({});
  run(S, "(function(){var s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME GUIDE BOOKS'); for(var r=3;r<=6;r++) s.getRange(r,3).setValue('Sold');})()");
  S.ss.insertSheet("META EXPORT").getRange(1, 1, 1, 1).setValues([["id"]]);
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(S)[0][2], "GUARD"); assert.strictEqual(S.mails.length, 1);
}
// 10) exception -> ERROR row + email, flag reset; lock busy -> BUSY
{
  const S = setup({});
  run(S, "exportMetaCsv = function(){ throw new Error('boom'); }");
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(S)[0][2], "ERROR"); assert.ok(/boom/.test(logRows(S)[0][7]));
  assert.strictEqual(S.mails.length, 1); assert.strictEqual(run(S, "_headless"), false);
  const B = setup({});
  run(B, "LockService.getScriptLock = function(){ return { waitLock: function(){ throw new Error('Could not obtain lock after 30000 milliseconds.'); }, releaseLock(){} }; }");
  run(B, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(B)[0][2], "BUSY"); assert.strictEqual(B.mails.length, 1);
}
// 11) build stops (FB sheet missing) -> ERROR with reason
{
  const S = setup({});
  S.sheets["FB CATALOGUE"] = null;
  run(S, "refreshMetaFeedAuto()");
  assert.strictEqual(logRows(S)[0][2], "ERROR"); assert.ok(/not found/.test(logRows(S)[0][7]));
}
// 12) menu path unchanged: popup shown, no REFRESH LOG, no email
{
  const S = setup({});
  run(S, "refreshMetaFeed()");
  assert.strictEqual(S.alerts.length, 1); assert.ok(!S.sheets["REFRESH LOG"]); assert.strictEqual(S.mails.length, 0);
  assert.strictEqual(S.sheets["META EXPORT"]._g.length, 4);
}
// 13) trigger installer: replaces old trigger, ~04:30 Bangkok daily
{
  const S = setup({ oldTrigger: true });
  run(S, "installMetaRefreshTrigger()");
  assert.strictEqual(S.deleted.length, 1); assert.strictEqual(S.trig.length, 1);
  assert.strictEqual(S.trig[0].fn, "refreshMetaFeedAuto");
  const c = JSON.stringify(S.trig[0].calls);
  assert.ok(c.includes('["atHour",4]') && c.includes('["nearMinute",30]') && c.includes('["inTimezone","Asia/Bangkok"]') && c.includes('["everyDays",1]'), c);
}
console.log("v28 headless tests passed");
// ===== v29: no (RESTOCK-NN) in the Meta title =====
{
  const S = setup({});
  const gg = S.sheets["GAME GUIDE BOOKS"]._g;
  gg.find((r) => r[1] === "OWA-FRESH")[0] = "Fresh Book (RESTOCK-02)";            // new row -> v20b step writes FB Title
  const fbg = S.sheets["FB CATALOGUE"]._g;
  fbg.find((r) => r[0] === "OWA-DUPNEW")[1] = "Harvest Moon 64 (RESTOCK-01)";      // legacy cell with RESTOCK
  vm.runInContext('_logPidChange(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GAME GUIDE BOOKS"), 3, "OWA-OLD", "OWA-NEW", "t")', S.ctx);   // rename keeps the manual title
  vm.runInContext("refreshMetaFeed()", S.ctx);
  const H = fbg[0], ti = H.findIndex((x) => String(x).toLowerCase() === "fb title");
  assert.strictEqual(fbg.find((r) => r[0] === "OWA-FRESH")[ti], "Fresh Book", "v20b writes the stripped title into FB Title");
  const me = S.sheets["META EXPORT"]._g, mt = me[0].indexOf("title");
  const title = (p) => me.find((r) => r[0] === p)[mt];
  assert.strictEqual(title("OWA-FRESH"), "Fresh Book");
  assert.strictEqual(title("OWA-DUPNEW"), "Harvest Moon 64", "legacy FB Title cleaned at export");
  assert.strictEqual(title("OWA-NEW"), "Drakengard (custom title)", "manual custom title is kept");
  assert.ok(me.slice(1).every((r) => !/RESTOCK/i.test(r[mt])), "no RESTOCK in any exported title");
}
console.log("v29 title tests passed");

// ===== v30: identical copies listed once + all-caps titles =====
{
  const D = (n, cond, pub, orig, flags) => ["Dup Game (RESTOCK-0" + n + ")", "OWA-DUP" + n, "Instock", cond, pub, 200, orig, flags];
  const S = setup({ extraCsv: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => "OWA-DUP" + n + ",1,jpg\n").join("") + "OWA-CAPS1,1,jpg\nOWA-CAPS2,1,jpg\n" });
  const gg = S.sheets["GAME GUIDE BOOKS"]._g;
  gg.push(D(1, "A", "YK GROUP", 130, ""), D(2, "A", "YK GROUP", 130, ""), D(3, "A", "YK GROUP", 130, "MAP"), D(4, "A", "YK GROUP", 100, ""),
          D(5, "B", "YK GROUP", 130, ""), D(6, "A", "OTHER", 130, ""), D(7, "A", "yk group", "130", " "));     // 7 = same as 1 / 2 (case, spacing)
  gg.push(["HOBBY HORROR", "OWA-CAPS1", "Instock", "A", "GS", 99, 20, ""], ["Mixed Case PS2 GUIDE", "OWA-CAPS2", "Instock", "A", "GS", 99, 20, ""]);
  const dupSold = D(8, "A", "YK GROUP", 130, ""); dupSold[2] = "Sold"; gg.push(dupSold);      // sold copy never counts
  vm.runInContext("refreshMetaFeed()", S.ctx);
  const me = S.sheets["META EXPORT"]._g, H = me[0], qi = H.indexOf("quantity_to_sell_on_facebook"), ti = H.indexOf("title");
  const row = (p) => me.find((r) => r[0] === p);
  assert.ok(row("OWA-DUP1") && !row("OWA-DUP2") && !row("OWA-DUP7") && !row("OWA-DUP8"), "identical copies collapse into the first one; sold copy not exported");
  assert.strictEqual(row("OWA-DUP1")[qi], "3", "quantity = 3 identical Instock copies (1, 2, 7)");
  for (const p of ["OWA-DUP3", "OWA-DUP4", "OWA-DUP5", "OWA-DUP6"]) assert.ok(row(p), p + " differs in flags/original/condition/publisher -> its own row");
  assert.strictEqual(row("OWA-DUP3")[qi], "1");
  assert.strictEqual(row("OWA-NEW")[qi], "1", "unique copy keeps quantity 1");
  assert.strictEqual(row("OWA-CAPS1")[ti], "Hobby Horror", "all-caps title -> Capitalised");
  assert.strictEqual(row("OWA-CAPS2")[ti], "Mixed Case PS2 GUIDE", "mixed-case title untouched");
  const last = S.alerts[S.alerts.length - 1];
  assert.ok(/Merged identical copies[^\n]*: 2/.test(last), "popup reports merged copies (2 and 7)");
  assert.ok(!/OWA-DUP2|OWA-DUP7/.test(last), "merged copies are not listed as gaps");
  const inv = vm.runInContext("_metaTitleCase('GAMEMAG สูตรเกม 1')+'|'+_metaTitleCase('FINAL FANTASY VII')+'|'+_metaTitleCase('สูตรเกม')+'|'+_metaTitleCase('PS2 RPG')", S.ctx);
  assert.strictEqual(inv, "Gamemag สูตรเกม 1|Final Fantasy VII|สูตรเกม|PS2 RPG");
  // auto run: same result, no popup, REFRESH LOG carries OK
  const A = setup({ extraCsv: "OWA-DUP1,1,jpg\nOWA-DUP2,1,jpg\n" });
  A.sheets["GAME GUIDE BOOKS"]._g.push(D(1, "A", "YK GROUP", 130, ""), D(2, "A", "YK GROUP", 130, ""));
  vm.runInContext("refreshMetaFeedAuto()", A.ctx);
  assert.strictEqual(A.alerts.length, 0); assert.strictEqual(A.sheets["REFRESH LOG"]._g[1][2], "OK");
  assert.strictEqual(A.sheets["META EXPORT"]._g.length, 5, "header + 3 base + 1 merged duplicate row");
}
console.log("v30 dedup/title tests passed");
