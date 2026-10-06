const fs=require('node:fs'),crypto=require('node:crypto'),dir=__dirname,hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const matrix=JSON.parse(fs.readFileSync(dir+'/attempts/F05/journal-proof.json','utf8')),gaps=matrix.flatMap((r,i)=>r.every(x=>x==='')?[{row:i+2,eventId:crypto.randomUUID()}]:[]);
if(gaps.length!==49||matrix.length!==1120)throw Error('Unexpected proof');
const spec={id:'qa-gap-reconcile-20261004',stamp:new Date().toISOString(),beforeHash:hash(matrix),prefixRows:matrix.length,sourceExportSHA256:crypto.createHash('sha256').update(fs.readFileSync(dir+'/attempts/F05/google-ledger-error.xlsx')).digest('hex'),gaps};
fs.writeFileSync(dir+'/attempts/F05/gap-repair-intent.json',JSON.stringify(spec,null,2));
fs.copyFileSync(dir+'/W1Qa.gs',dir+'/attempts/F05/W1Qa-before-gap-helper.gs');
fs.appendFileSync(dir+'/W1Qa.gs','\nvar W1_QA_GAP_REPAIR = '+JSON.stringify(spec)+';\n'+String.raw`
function w1QaV36RepairGaps(){
 _w1Access_();return _withLock(function(){
  _w1QaV34Test_();var s=W1_QA_GAP_REPAIR,sh=_w1Table_('ORDER REQUESTS'),rows=_w1Rows_('ORDER REQUESTS'),actor=Session.getActiveUser().getEmail();
  var gapRows=s.gaps.map(function(g){var snap={orderId:'',physicalRow:g.row,reason:'Explicit reconciliation of fully blank capacity gaps after duplicate isolated QA execution',beforeJournalHash:s.beforeHash,sourceExportSHA256:s.sourceExportSHA256};return {row:g.row,values:[g.eventId,s.stamp,'qa-gap-20261004-R'+g.row,1,'QA_CAPACITY_GAP',_w1Hash_(snap),'','DONE',_w1Encode_(snap),_w1Encode_({reconciledBlankCapacity:true}),'',actor,'isolated test explicit reconciliation','Code v36 / WebApp v36','gap-repair-intent.json; no erased event or business row']};});
  var normalized=rows.slice(0,s.prefixRows).map(function(r){return r.slice();});if(normalized.length!==s.prefixRows)throw Error('QA_PREFIX_LENGTH_CHANGED');
  gapRows.forEach(function(g){var r=normalized[g.row-2];r.forEach(function(v,j){if(v!==''&&v!==g.values[j])throw Error('QA_GAP_CONFLICT '+g.row);});normalized[g.row-2]=new Array(15).fill('');});
  if(_w1Hash_(normalized)!==s.beforeHash)throw Error('QA_ORIGINAL_JOURNAL_CHANGED');
  var own=rows.filter(function(r){return r[2]===s.id;}),last=own.length?own[own.length-1]:null,requestHash=_w1Hash_(s),req;
  if(last){if(last[5]!==requestHash)throw Error('QA_REPAIR_INTENT_CHANGED');if(last[7]==='DONE'){_w1Requests_();return JSON.stringify({requestId:s.id,replayed:true,gaps:s.gaps.length});}req={id:s.id,attempt:Number(last[3])+1,action:'QA_GAP_RECONCILE',hash:requestHash,snap:_w1Decode_(last[8]),entrySource:'isolated test explicit reconciliation'};}
  else{req={id:s.id,attempt:1,action:'QA_GAP_RECONCILE',hash:requestHash,snap:{orderId:'',spec:s},entrySource:'isolated test explicit reconciliation'};_w1Encode_(req.snap);_w1Event_(req,'PREPARED');}
  try{
   _w1Runs_(gapRows.map(function(g){return {source:'QA',row:g.row,values:g.values};}),function(run){var range=sh.getRange(run[0].row,1,run.length,15),expected=run.map(function(g){return g.values;});if(JSON.stringify(range.getValues())!==JSON.stringify(expected))_w1Write_('QA verified blank gaps '+run[0].row,function(){range.setValues(expected);});if(JSON.stringify(range.getValues())!==JSON.stringify(expected))throw Error('QA_GAP_READBACK '+run[0].row);});
   var result={requestId:s.id,gaps:s.gaps.length,beforeHash:s.beforeHash,sourceExportSHA256:s.sourceExportSHA256};_w1Event_(req,'DONE',result);_w1Requests_();return JSON.stringify(result);
  }catch(e){try{_w1Event_(req,'NEEDS_REVIEW',null,e.message);}catch(a){}throw e;}
 });
}
`);
console.log('Saved fixed explicit repair intent for49 blank logical rows; existing journal matrix SHA',spec.beforeHash);
