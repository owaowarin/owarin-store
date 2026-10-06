import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path='outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity_and_researched_prices.xlsx';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sh=wb.worksheets.getItem('GAME GUIDE BOOKS');
console.log((await wb.inspect({kind:'computedStyle',sheetId:sh.name,range:'A8:A16',maxChars:8000})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'',options:{maxResults:20},summary:'all matches'})).ndjson);
