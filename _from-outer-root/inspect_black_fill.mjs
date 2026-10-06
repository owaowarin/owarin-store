import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = 'outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');
console.log((await wb.inspect({kind:'computedStyle', sheetId:sh.name, range:'A1:S8', maxChars:12000})).ndjson);
console.log((await wb.inspect({kind:'region', sheetId:sh.name, range:'A1:S8', maxChars:8000})).ndjson);
console.log((await wb.inspect({kind:'drawing', sheetId:sh.name, maxChars:8000})).ndjson);
