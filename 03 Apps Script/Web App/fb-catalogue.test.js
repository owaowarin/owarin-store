// Regression test: buildFbCatalogue() must fill the Meta block from the inventory.
// Loads Code_v42.gs THEN R2Upload.gs into one context -- the same way Apps Script
// concatenates project files -- so a helper redefined in R2Upload.gs (the 2026-09-23
// incident: _resolveColumns/_val/_tryWrite overridden) fails this test.
// Run: node fb-catalogue.test.js
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function mkSheet(name, rows, id) {
  const g = rows.map((r) => r.slice());
  const lastRow = () => { for (let i = g.length - 1; i >= 0; i--) if (g[i].some((v) => v !== "")) return i + 1; return 0; };
  const lastCol = () => Math.max(0, ...g.map((r) => { for (let j = r.length - 1; j >= 0; j--) if (r[j] !== "") return j + 1; return 0; }));
  const cell = (r, c) => { const v = (g[r - 1] || [])[c - 1]; return v == null ? "" : v; };
  return {
    _g: g, getName: () => name, getSheetId: () => id, getLastRow: lastRow, getLastColumn: lastCol,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r + i, c + j))),
      getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => String(cell(r + i, c + j)))),
      getValue: () => cell(r, c),
      setValues: (vals) => vals.forEach((row, i) => row.forEach((v, j) => { while (g.length < r + i) g.push([]); g[r - 1 + i][c - 1 + j] = v; })),
      setValue: (v) => { while (g.length < r) g.push([]); g[r - 1][c - 1] = v; },
      setFontWeight() { return this; }
    }),
    clear() { g.length = 0; }, setFrozenRows() {}
  };
}

const INV_HDR = ["Item name", "Product ID", "Status", "Condition", "Publisher", "Price"];
const sheets = {
  "GAME GUIDE BOOKS": mkSheet("GAME GUIDE BOOKS", [INV_HDR, [],
    ["Alan Wake (RESTOCK-02)", "OWA-1", "Instock", "A", "YK GROUP", 310],
    ["Sold Book", "OWA-2", "Sold", "B", "GAME STAR", 120]], 1),
  "MAGAZINE": mkSheet("MAGAZINE", [INV_HDR, []], 2),
  "R2 IMAGES": mkSheet("R2 IMAGES", [[], ["", "", "", "", "pid", "n", "ext"], ["", "", "", "", "OWA-1", 1, "png"]], 3),
  "FB CATALOGUE": mkSheet("FB CATALOGUE", [["Product ID", "FB Title", "Price", "Description"], ["OWA-1", "", "", ""], ["OWA-2", "Sold Book", "", ""]], 4)
};
const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mkSheet(n, [], 9)), setActiveSheet() {} };
const ui = { alert: () => "YES", Button: { YES: "YES", OK: "OK" }, ButtonSet: { YES_NO: 1, OK: 2 } };
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ui, flush() {} },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Logger: { log() {} }, console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/Code_v42.gs", "utf8"), ctx);
vm.runInContext(fs.readFileSync(__dirname + "/R2Upload.gs", "utf8"), ctx);   // loads after Code.gs, as in the project

vm.runInContext("rebuildDescriptions()", ctx);   // owner runs this first (menu: Rebuild descriptions)
vm.runInContext("buildFbCatalogue()", ctx);
const g = sheets["FB CATALOGUE"]._g, H = g[0];
const col = (h) => H.findIndex((x) => String(x).toLowerCase() === h);
const row = (pid) => { const r = g.find((x) => x[0] === pid); return (h) => r[col(h)]; };
const a = row("OWA-1");
assert.strictEqual(a("title"), "Alan Wake", "title falls back to the inventory name (RESTOCK stripped)");
assert.strictEqual(a("condition"), "used");
assert.strictEqual(a("brand"), "YK GROUP");
assert.strictEqual(a("price"), "310.00 THB");                 // lands in the first header matching "price"
assert.strictEqual(a("availability"), "in stock");
assert.ok(/\/library\/OWA-1\/1\.png$/.test(a("image_link")));
assert.strictEqual(row("OWA-2")("availability"), "out of stock");
assert.strictEqual(row("OWA-2")("title"), "Sold Book", "an existing FB Title wins over the fallback");

vm.runInContext("exportMetaCsv()", ctx);
const me = sheets["META EXPORT"]._g;
assert.strictEqual(me.length, 2, "exactly one Instock row is ready to upload");
assert.strictEqual(me[1][0], "OWA-1");
console.log("fb-catalogue.test.js: all assertions passed");
