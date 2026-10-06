import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/Users/JIN/Downloads/Market Place - Price Check.xlsx';
const outputDir = 'outputs/marketplace-price-check';
const outputPath = `${outputDir}/Market Place - Price Check_with_market_rarity.xlsx`;
await fs.mkdir(outputDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheet = workbook.worksheets.getItem('GAME GUIDE BOOKS');
const values = sheet.getRange('A1:R1613').values;
const headers = values[0];
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

function marketNumbers(value) {
  const text = String(value ?? '');
  const range = text.match(/range\s+([\d,]+)\s*[–-]\s*([\d,]+)/i);
  if (range) return { low: Number(range[1].replaceAll(',', '')), high: Number(range[2].replaceAll(',', '')) };
  const ref = text.match(/(?:ref\s*[฿b]?|^)([\d,]+)\s*$/i);
  if (ref) { const n = Number(ref[1].replaceAll(',', '')); return { low: n, high: n }; }
  return null;
}

const labels = values.slice(1).map((row) => {
  if (!row[idx['Item name']]) return [null];
  const listed = Number(row[idx['Price']]);
  const parsed = marketNumbers(row[idx['Price Range']]);
  const low = parsed?.low ?? (Number.isFinite(listed) ? listed : 0);
  const high = parsed?.high ?? (Number.isFinite(listed) ? listed : 0);
  const mid = (low + high) / 2;
  // R1 = highest rarity/value; R3 = common/lower-value guide.
  return [mid >= 500 || high >= 800 || listed >= 800 ? 'R1' : mid >= 200 || high >= 300 || listed >= 300 ? 'R2' : 'R3'];
});

sheet.getRange('S1:S1612').values = [['Market Rarity'], ...labels];
sheet.getRange('S1:S1612').format.verticalAlignment = 'center';
sheet.getRange('S1').format = {
  fill: '#1F4E78',
  font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
};
sheet.getRange('S2:S1612').format = {
  font: { name: 'Arial', size: 10, color: '#1F1F1F' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
};
sheet.getRange('S1:S1612').format.columnWidth = 16;
sheet.getRange('S2:S1612').conditionalFormats.add('containsText', { text: 'R1', format: { fill: '#F4CCCC', font: { bold: true, color: '#990000' } } });
sheet.getRange('S2:S1612').conditionalFormats.add('containsText', { text: 'R2', format: { fill: '#FFF2CC', font: { bold: true, color: '#7F6000' } } });
sheet.getRange('S2:S1612').conditionalFormats.add('containsText', { text: 'R3', format: { fill: '#D9EAD3', font: { bold: true, color: '#274E13' } } });

workbook.recalculate();
const check = await workbook.inspect({ kind: 'table', sheetId: sheet.name, range: 'A1:S20', include: 'values,formulas', tableMaxRows: 20, tableMaxCols: 19, maxChars: 10000 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, summary: 'final formula error scan' });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: sheet.name, range: 'A1:S30', scale: 1, format: 'png' });
await fs.writeFile(`${outputDir}/market-rarity-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
