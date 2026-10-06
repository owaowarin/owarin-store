// Manual integration checks. This file must never be installed in the store project.
function owaLabSmokeTest() {
  if (_owaSpreadsheet().getId() !== '158ekdEhxQC0hLIaUCz7cV3hx_XAVBeHuKYsD82HSszE') throw new Error('LAB ONLY');
  var report = { time: new Date().toISOString(), passed: [], failed: [] };
  function check(name, fn) { try { var detail = fn(); report.passed.push({name:name,detail:detail}); console.log('PASS '+name+' '+JSON.stringify(detail)); } catch(e) { report.failed.push({name:name,error:String(e)}); console.log('FAIL '+name+' '+e); } }
  function expect(v, text) { if (!v) throw new Error(text); }
  function call(a,p) { var r=JSON.parse(api(a,p)); if(!r.ok)throw new Error(r.error); return r.data; }
  check('shipping 0/1/2/6/7',function(){var v=[0,1,2,6,7].map(_owaShipping);expect(JSON.stringify(v)==='[0,50,60,100,100]','Wrong shipping');return v;});
  check('read inventory / booking / contents / settings',function(){return {GGB:call('inventory.list',{source:'GGB'}).length,MAG:call('inventory.list',{source:'MAG'}).length,booking:call('booking.list').rows.length,contents:call('contents.list').rows.length,settings:!!call('settings.get')};});
  check('mixed checkout / separate auction price / date / replay',function(){
    var p={requestId:'LAB-SMOKE-20260910-MIXED-01',items:[{source:'GGB',sku:'OWA-GGBA001YKAR01',price:271,method:'DIRECT'},{source:'MAG',sku:'OWA-MAGA005AMAN00',price:83,method:'AUCTION'}],channel:'SHOP',shipping:40,customerShipping:60,soldDate:'2026-09-09'};
    var first=call('sales.confirm',p), count=_getSalesSheet().getLastRow(), again=call('sales.confirm',p);
    expect(first.orderId===again.orderId && _getSalesSheet().getLastRow()===count,'Replay duplicated sale');
    p.items.forEach(function(it,i){var sh=_getSheetOrThrow(_sheetFromCode(it.source)),c=_resolveColumns(sh),r=_readRow(sh,_findRowBySku(sh,c,it.sku),it.source);expect(r.price===it.price,'Wrong price');expect(r.status===(i?'Auction':'Sold'),'Wrong status');expect(_owaHistoryDate(r.soldDate)==='2026-09-09','Wrong date');});
    p.requestId='LAB-SMOKE-20260910-RESELL-01'; expect(!JSON.parse(api('sales.confirm',p)).ok,'Resale was accepted');
    return {orderId:first.orderId,ledgerLastRow:count,items:p.items};
  });
  check('Add success / formulas / edit / invalid Add',function(){
    var found=call('inventory.list',{source:'GGB'}).filter(function(r){return r.name.indexOf('Lab Smoke 20260910')>=0;})[0];
    var added=found?{item:found}:call('inventory.add',{source:'GGB',title:'Lab Smoke 20260910',pub:'YK',cond:'A',price:120,cost:30,status:'Instock'});
    expect(!!added.item.productId,'Missing new SKU');
    var sh=_getSheetOrThrow(GGB_SHEET),c=_resolveColumns(sh),row=_findRowBySku(sh,c,added.item.productId);
    expect(sh.getRange(row,c.price).getValue()===120,'Price not saved');
    if(c.marketplace)expect(!!sh.getRange(row,c.marketplace).getFormula(),'Missing marketplace formula');
    call('inventory.update',{source:'GGB',sku:added.item.productId,changes:{price:120}});
    var before=sh.getLastRow();expect(!JSON.parse(api('inventory.add',{source:'GGB',title:''})).ok,'Empty title accepted');expect(before===sh.getLastRow(),'Invalid Add wrote row');
    return {sku:added.item.productId,row:row,writeWarnings:_SP2_WRITE_ERRORS};
  });
  check('booking create / update / delete',function(){var r=call('booking.save',{name:'LAB TEST ONLY',gameTitle:'Lab Smoke 20260910',queue:'1',status:'Waiting'});call('booking.save',{row:r.row,queue:'2'});expect(call('booking.list').rows.some(function(x){return x.row===r.row&&x.queue==='2';}),'Booking update missing');return call('booking.delete',{row:r.row});});
  check('contents create / update / delete',function(){var r=call('contents.save',{title:'LAB TEST ONLY',content:'test'});call('contents.save',{row:r.row,content:'updated'});expect(call('contents.list').rows.some(function(x){return x.row===r.row&&x.content==='updated';}),'Contents update missing');return call('contents.delete',{row:r.row});});
  check('SALES and journal consistency',function(){var r=call('sales.list');expect(r.pendingRequests.length===0,'Pending checkout');return {ledger:r.rows.length,history:r.history.length,pending:r.pendingRequests};});
  console.log('LAB_REPORT '+JSON.stringify(report)); return report;
}
