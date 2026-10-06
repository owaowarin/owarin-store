import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'outputs/marketplace-price-check/Market Place - Price Check_final_with_sources.xlsx';
const outputPath = 'outputs/marketplace-price-check/Market Place - Price Check_final_with_sources_v2.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');
sh.getRange('U2:U6').values = [
  ['https://shopee.co.th/list/%E0%B8%9A%E0%B8%97%E0%B8%AA%E0%B8%A3%E0%B8%B8%E0%B8%9B%E0%B9%80%E0%B8%81%E0%B8%A1'],
  ['https://shopee.co.th/search?category=11044957&keyword=ps2+%E0%B8%9A%E0%B8%97'],
  ['https://shopee.co.th/search?keyword=zelda+breath+of+the+wild+%E0%B8%9A%E0%B8%97%E0%B8%AA%E0%B8%A3%E0%B8%B8%E0%B8%9B'],
  ['https://www.samutprakan.pantipmarket.com/?p=627&relate=1&viewmode=gallery'],
  ['https://www.lazada.co.th/videodetail/?video_id=8000070094138'],
];
sh.getRange('U2:U6').format.wrapText = false;
sh.getRange('U2:U6').format.font = { name: 'Arial', size: 9, color: '#0563C1', underline: 'single' };
sh.getRange('U1:U6').format.columnWidth = 42;
wb.recalculate();
console.log((await wb.inspect({kind:'table',sheetId:sh.name,range:'T1:U6',include:'values,formulas',tableMaxRows:6,tableMaxCols:2,maxChars:7000})).ndjson);
const preview = await wb.render({sheetName:sh.name,range:'A1:U20',scale:1,format:'png'});
await fs.writeFile('outputs/marketplace-price-check/final-v2-preview.png',new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
