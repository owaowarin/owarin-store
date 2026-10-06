import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load('outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity.xlsx'));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');
const v = sh.getRange('A1:S1613').values;
const rows = v.slice(1).filter(r => r[0]);
const count = {}; for (const r of rows) count[r[18]] = (count[r[18]] || 0) + 1;
console.log('COUNTS', JSON.stringify(count));
console.log('R1 SAMPLE', JSON.stringify(rows.filter(r => r[18] === 'R1').slice(0, 10).map(r => [r[0], r[10], r[11], r[18]])));
console.log((await wb.inspect({kind:'table', sheetId:sh.name, range:'R1:S15', include:'values,formulas', tableMaxRows:15, tableMaxCols:2, maxChars:3000})).ndjson);
