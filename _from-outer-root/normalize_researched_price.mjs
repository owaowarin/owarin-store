import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = 'outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity.xlsx';
const outputPath = 'outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity_and_researched_prices.xlsx';
const outDir = 'outputs/marketplace-price-check';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');
const values = sh.getRange('A1:S1613').values;

function normalize(value, listed) {
  const text = String(value ?? '');
  const range = text.match(/range\s+([\d,]+)\s*[–-]\s*([\d,]+)/i);
  if (range) return `฿${range[1].replaceAll(',', '')}–${range[2].replaceAll(',', '')}`;
  const ref = text.match(/(?:ref\s*[฿b]?|^)([\d,]+)\s*$/i);
  if (ref) return `฿${ref[1].replaceAll(',', '')}`;
  const n = Number(listed);
  return Number.isFinite(n) && n > 0 ? `฿${n}` : 'Research needed';
}

const rows = values.slice(1).map(row => row[0] ? [normalize(row[10], row[11])] : [null]);
sh.getRange('K1:K1613').values = [['Researched Price / Range'], ...rows];
sh.getRange('K1:K1613').format.wrapText = false;
sh.getRange('K1').format = {
  fill: '#1F4E78',
  font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
};
sh.getRange('K2:K1613').format = {
  font: { name: 'Arial', size: 10, color: '#1F1F1F' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
};
sh.getRange('K1:K1613').format.columnWidth = 20;
wb.recalculate();
const check = await wb.inspect({ kind: 'table', sheetId: sh.name, range: 'J1:L12', include: 'values,formulas', tableMaxRows: 12, tableMaxCols: 3, maxChars: 5000 });
console.log(check.ndjson);
const preview = await wb.render({ sheetName: sh.name, range: 'A1:S20', scale: 1, format: 'png' });
await fs.writeFile(`${outDir}/market-rarity-price-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
