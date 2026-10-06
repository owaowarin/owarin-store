const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync(__dirname + "/Code_v42.gs", "utf8");
const snippet = source.match(/var R2_PUBLIC_URL[\s\S]*?\nfunction _imageUrl\(pid\) \{[\s\S]*?\n\}\n/);
assert.ok(snippet, "_r2ImageIndex()/_imageUrl() snippet not found in Code_v42.gs");

const errSnippet = source.match(/function _looksLikeSheetError\(v\) \{[\s\S]*?\n\}\n/);
assert.ok(errSnippet, "_looksLikeSheetError() snippet not found in Code_v42.gs");
const _looksLikeSheetError = new Function(errSnippet[0] + "\nreturn _looksLikeSheetError;")();

function run(rows) {
  // rows: array of [pid, n, ext] as R2 IMAGES!E3:G<last> would return them
  const sheet = {
    getLastRow: () => rows.length + 2,
    getRange: (row, col, numRows, numCols) => {
      assert.strictEqual(row, 3);
      assert.strictEqual(col, 5);
      assert.strictEqual(numCols, 3);
      assert.strictEqual(numRows, rows.length);
      return { getValues: () => rows };
    }
  };
  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name) => { assert.strictEqual(name, "R2 IMAGES"); return sheet; }
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(snippet[0], context);
  return context;
}

// solo jpg
let ctx = run([["OWA-1", "1", "jpg"]]);
assert.strictEqual(ctx._imageUrl("OWA-1"), "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/library/OWA-1/1.jpg");

// solo png -- the actual bug this fix targets (old code always hardcoded .jpg)
ctx = run([["OWA-2", "1", "png"]]);
assert.strictEqual(ctx._imageUrl("OWA-2"), "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/library/OWA-2/1.png");

// mixed per-position ext -- position 1 is the first "|" token
ctx = run([["OWA-3", "2", "jpg|png"]]);
assert.strictEqual(ctx._imageUrl("OWA-3"), "https://pub-366b23912e6144bc8240fcf7e6764d01.r2.dev/library/OWA-3/1.jpg");

// Product ID with no R2 IMAGES row at all -> "" (not a guessed/broken URL)
ctx = run([["OWA-1", "1", "jpg"]]);
assert.strictEqual(ctx._imageUrl("OWA-404"), "");

// falsy pid -> ""
ctx = run([["OWA-1", "1", "jpg"]]);
assert.strictEqual(ctx._imageUrl(""), "");
assert.strictEqual(ctx._imageUrl(null), "");

// empty sheet -> every lookup is ""
ctx = run([]);
assert.strictEqual(ctx._imageUrl("OWA-1"), "");

// _looksLikeSheetError -- guards buildFbCatalogue() against a broken formula (e.g. #REF!
// from the FB CATALOGUE!A2 array-formula conflict) flowing through as a literal Product ID
assert.strictEqual(_looksLikeSheetError("#REF!"), true);
assert.strictEqual(_looksLikeSheetError("#N/A"), true);
assert.strictEqual(_looksLikeSheetError("#VALUE!"), true);
assert.strictEqual(_looksLikeSheetError("  #REF! "), true);
assert.strictEqual(_looksLikeSheetError("OWA-GGBA001YKAR01"), false);
assert.strictEqual(_looksLikeSheetError(""), false);
assert.strictEqual(_looksLikeSheetError(null), false);

console.log("image-url test passed");
