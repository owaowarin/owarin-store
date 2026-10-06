import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/JIN/Downloads/Market Place - Price Check.xlsx';
const outDir = 'outputs/marketplace-price-check';
await fs.mkdir(outDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const summary = await workbook.inspect({ kind: 'workbook,sheet,table', maxChars: 12000, tableMaxRows: 20, tableMaxCols: 20, tableMaxCellChars: 120 });
console.log(summary.ndjson);
const sheets = workbook.worksheets.items;
for (const sheet of sheets) {
  const used = sheet.getUsedRange();
  console.log(`SHEET ${sheet.name} USED ${used ? used.address : 'none'}`);
  if (used) {
    const view = await workbook.inspect({ kind: 'region', sheetId: sheet.name, range: used.address, maxChars: 18000, tableMaxRows: 100, tableMaxCols: 30, tableMaxCellChars: 160 });
    console.log(view.ndjson);
    const preview = await workbook.render({ sheetName: sheet.name, autoCrop: 'all', scale: 1, format: 'png' });
    await fs.writeFile(`${outDir}/${sheet.name.replace(/[^a-z0-9_-]+/gi, '_')}.png`, new Uint8Array(await preview.arrayBuffer()));
  }
}
