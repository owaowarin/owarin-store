import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load('C:/Users/JIN/Downloads/Market Place - Price Check.xlsx'));
const sh = wb.worksheets.getItem('GAME GUIDE BOOKS');
const v = sh.getRange('A1:R1613').values; const h=v[0]; const ix=Object.fromEntries(h.map((x,i)=>[x,i]));
const rows=v.slice(1).filter(r=>r[ix['Item name']]);
function nums(rs){return rs.map(r=>Number(r[ix['Price']])).filter(Number.isFinite).sort((a,b)=>a-b)}
function stats(rs){const a=nums(rs); const q=p=>a[Math.floor((a.length-1)*p)]; return {n:rs.length, nnum:a.length, min:a[0],p25:q(.25),median:q(.5),p75:q(.75),max:a.at(-1)}}
for(const key of ['R1','R2','R3','NEW','(blank)']) console.log(key, stats(rows.filter(r=>(r[ix['Rarity']]??'(blank)')===key)));
console.log('HIGH', JSON.stringify(rows.filter(r=>Number(r[ix['Price']])>=700).map(r=>[r[ix['Item name']],r[ix['Price']],r[ix['Price Range']],r[ix['Rarity']]]).slice(0,100)));
console.log('BLANKS', JSON.stringify(rows.filter(r=>!r[ix['Rarity']]).map(r=>[r[ix['Item name']],r[ix['Price']],r[ix['Price Range']]]).slice(0,120)));
