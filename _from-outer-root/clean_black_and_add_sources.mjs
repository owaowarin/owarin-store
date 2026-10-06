import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'outputs/marketplace-price-check/Market Place - Price Check_with_market_rarity_and_researched_prices.xlsx';
const outputPath = 'outputs/marketplace-price-check/Market Place - Price Check_final_with_sources.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');

// Remove the black conditional/direct formatting only from the item-name area.
const itemRange = sh.getRange('A3:A1613');
itemRange.conditionalFormats.deleteAll();
itemRange.format.fill = '#FFFFFF';
itemRange.format.font = { name: 'Roboto', size: 11, color: '#000000' };

// Put the public research references beside the working table.
sh.getRange('T1:U6').values = [
  ['Research reference', 'Link'],
  ['Shopee: บทสรุปเกม', null],
  ['Shopee: บทสรุปเกม PS2', null],
  ['Shopee: Zelda บทสรุป', null],
  ['PantipMarket: หนังสือเกมหายาก', null],
  ['Lazada: Final Fantasy V guide', null],
];
sh.getRange('U2:U6').formulas = [
  ['=HYPERLINK("https://shopee.co.th/list/%E0%B8%9A%E0%B8%97%E0%B8%AA%E0%B8%A3%E0%B8%B8%E0%B8%9B%E0%B9%80%E0%B8%81%E0%B8%A1","Open source")'],
  ['=HYPERLINK("https://shopee.co.th/search?category=11044957&keyword=ps2+%E0%B8%9A%E0%B8%97","Open source")'],
  ['=HYPERLINK("https://shopee.co.th/search?keyword=zelda+breath+of+the+wild+%E0%B8%9A%E0%B8%97%E0%B8%AA%E0%B8%A3%E0%B8%B8%E0%B8%9B","Open source")'],
  ['=HYPERLINK("https://www.samutprakan.pantipmarket.com/?p=627&relate=1&viewmode=gallery","Open source")'],
  ['=HYPERLINK("https://www.lazada.co.th/videodetail/?video_id=8000070094138","Open source")'],
];
sh.getRange('T1:U6').format = { font: { name: 'Arial', size: 10, color: '#000000' }, verticalAlignment: 'center' };
sh.getRange('T1:U1').format = { fill: '#D9EAF7', font: { name: 'Arial', size: 10, bold: true, color: '#000000' }, horizontalAlignment: 'center' };
sh.getRange('T1:T6').format.columnWidth = 28;
sh.getRange('U1:U6').format.columnWidth = 18;

wb.recalculate();
console.log((await wb.inspect({ kind: 'table', sheetId: sh.name, range: 'A6:C16', include: 'values,formulas', tableMaxRows: 11, tableMaxCols: 3, maxChars: 5000 })).ndjson);
console.log((await wb.inspect({ kind: 'table', sheetId: sh.name, range: 'T1:U6', include: 'values,formulas', tableMaxRows: 6, tableMaxCols: 2, maxChars: 5000 })).ndjson);
const preview = await wb.render({ sheetName: sh.name, range: 'A1:U20', scale: 1, format: 'png' });
await fs.writeFile('outputs/marketplace-price-check/final-preview.png', new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
