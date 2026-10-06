const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const vm = require("vm");

let uuid = 0;
const context = {
  Utilities: {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (_algorithm, text) => [...crypto.createHash("sha256").update(text, "utf8").digest()].map(n => n > 127 ? n - 256 : n),
    formatDate: () => "20260922T120000Z",
    getUuid: () => (++uuid).toString(16).padStart(10, "0") + "0000000000000000000000"
  }
};
vm.createContext(context);
const source = fs.readFileSync(__dirname + "/R2Upload.gs", "utf8");
vm.runInContext(source, context);
for (const duplicate of ["_withLock", "_resolveColumns", "_val", "_sp2ResetWriteErrors", "_tryWrite"]) {
  assert.ok(!source.includes("function " + duplicate + "("), "duplicate global helper remains: " + duplicate);
}

const targets = [
  { source: "GAME GUIDE BOOKS", productId: "OWA-1", itemName: "Book A", type: "A", status: "Instock" },
  { source: "MAGAZINE", productId: "OWA-2", itemName: "Book B", type: "B", status: "Instock" }
];
const rows = context._r2BuildRequestRows_(targets, "EXPORT_INSTOCK", "Instock", "2026-09-22T12:00:00.000Z", "R2B-TEST", "2026-09-22T11:59:59.000Z");
assert.strictEqual(context.R2_QUEUE_HEADERS.length, 14);
assert.strictEqual(context.R2_RESULT_HEADERS.length, 19);
assert.strictEqual(rows.length, 2);
assert.ok(rows.every(row => row.length === 14 && row[1] === "R2B-TEST" && row[3] === "EXPORT_INSTOCK" && row[8] === "Instock"));
assert.ok(rows.every(row => /^[0-9a-f]{64}$/.test(row[9])));
assert.ok(rows.every(row => row[10] === "COUNT:2" && /^[0-9a-f]{64}$/.test(row[11]) && row[12] === "r2-hybrid-v4"));
assert.strictEqual(rows[0][11], rows[1][11]);
assert.notStrictEqual(rows[0][0], rows[1][0]);
assert.notStrictEqual(rows[0][9], rows[1][9]);
const readback = rows.map(row => row.slice());
const sheet = { getRange: () => ({ getDisplayValues: () => readback }) };
assert.strictEqual(context._r2ConfirmBatch_(sheet, 2, rows), true);
readback[1][7] = "WRONG TYPE";
assert.strictEqual(context._r2ConfirmBatch_(sheet, 2, rows), false);
if (process.argv.includes("--emit-vector")) console.log(JSON.stringify(rows));
else console.log("R2Upload request-contract test passed");
