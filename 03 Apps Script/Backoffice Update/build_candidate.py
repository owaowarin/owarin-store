from pathlib import Path
import re
root = Path(__file__).resolve().parent
old = root.parent / 'Web App'
def explicit_target(source):
    return source.replace('SpreadsheetApp.getActiveSpreadsheet()', '_owaSpreadsheet()').replace('SpreadsheetApp.getActive()', '_owaSpreadsheet()')
live = root.parent / 'Live Source' / 'Current-2026-09-10'
# Current editor source is the real /dev baseline, archived before any edits.
(root/'Core.gs').write_text(explicit_target((live/'Code.gs').read_text(encoding='utf-8-sig')), encoding='utf-8')
fb = explicit_target((live/'FbAlbum.gs').read_text(encoding='utf-8-sig'))
fb = fb.replace('function _fbaToken() {', "function _fbaToken() {\n  throw new Error('LAB: Facebook network actions are disabled; use fbaDryRun or fbaAudit');")
fb = fb.replace('function fbaInstallTrigger() {', "function fbaInstallTrigger() {\n  throw new Error('LAB: automatic posting triggers are disabled');")
(root/'FbAlbum.gs').write_text(fb, encoding='utf-8')
w = (live/'webapp.gs').read_text(encoding='utf-8-sig')
# Keep original helpers, replace the public paths; old sale implementations are removed.
start = w.index('function _apiMarkSold(p)')
end = w.index('function _appendSalesRows', start)
w = w[:start] + 'function _apiMarkSold(p) { return _owaMarkSold(p); }\n\n' + w[end:]
start = w.index('function _apiSalesConfirm(p)')
end = w.index('// ── SALES LIST', start)
w = w[:start] + 'function _apiSalesConfirm(p) { return _owaSale(p); }\n\n' + w[end:]
w = w.replace('function _apiSalesList() {', 'function _apiSalesList() { return _owaSalesList(); }\nfunction _owaLegacySalesList() {')
w = w.replace('return GGB_SHEET; // default GGB', 'if (source === "GGB") return GGB_SHEET;\n  throw new Error("Choose GGB or MAG explicitly; ALL is a read-only combined view");')
w = w.replace('function _route(action, p) {', '''function _route(action, p) {
  // The old tool infers auction from price and clears dates: incompatible with real auctions.
  if (action === 'tools.suspectAuction') throw new Error('Auction must be recorded from an actual sale; automatic guessing is disabled');
  if (action.indexOf('tools.') === 0 && p.source === 'ALL') throw new Error('Select GUIDE BOOKS or MAGAZINES before running tools');''')
w = w.replace('function _apiInvAdd(p) {', '''function _apiInvAdd(p) {
  if (['Sold','Auction'].indexOf(p.status) >= 0) throw new Error('Add as Instock, then record the sale with Mark Sold');''')
w = w.replace('var prevStatus = (sheet.getRange(row, COL.status).getValue() || "").toString().trim();', '''var prevStatus = (sheet.getRange(row, COL.status).getValue() || "").toString().trim();
    _owaNoPending();
    if (prevStatus === 'Sold' || prevStatus === 'Auction') throw new Error('Sold copies are read-only here; a return needs an explicit ledger adjustment');
    if (ch.status === 'Sold' || ch.status === 'Auction') throw new Error('Use Mark Sold or checkout to record the sale');''')
# Explicit existing sheet takes priority over any new LAB tabs with similar headers.
w = w.replace('var sh = _sheetByHeaders(["order", "product", "netProfit"]);', 'var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SALES") || _sheetByHeaders(["order", "product", "netProfit"]);')
w = w.replace('// · a sale channel (SHOPEE -> price converted back to the shop-front base, /1.2 - 50)', '// · Sale capture uses actual item price; see SalesService.gs for checkout and journal')
w = w.replace('return JSON.stringify({ ok: false, error: String((err && err.message) || err) });', '''var safeToEditCheckout = false;
    if (payload && payload.requestId) {
      try { safeToEditCheckout = !_owaJournal().records.some(function(r){ return r.value.id === payload.requestId; }); } catch(ignore) {}
    }
    return JSON.stringify({ ok: false, error: String((err && err.message) || err), safeToEditCheckout: safeToEditCheckout });''')
# Remove unused legacy sale paths and the duplicate helper already supplied by Code.gs.
w = w.replace('case "sales.list":', 'case "sales.retry":           return _owaRetry(p.requestId);\n    case "sales.list":')
for name in ['_appendSalesRows', '_priceToBase', '_colLetter']:
    start = w.index('function ' + name + '(')
    end = w.index('\n}', start) + 2
    w = w[:start] + w[end:]
(root/'WebApp.gs').write_text(explicit_target(w), encoding='utf-8')

h = (old/'Index.html').read_text(encoding='utf-8-sig')
def replace(a,b):
    global h
    assert a in h, a[:100]
    h = h.replace(a,b)
def function(name, body):
    global h
    start = h.index('function '+name+'(')
    # Existing named functions end at a column-zero closing brace.
    end = h.index('\n}', start) + 2
    h = h[:start] + body + h[end:]

replace('<button id="srcGGB" class="on">', '<button id="srcALL" class="on">ALL BOOKS</button>\n        <button id="srcGGB">')
replace("source: 'GGB',\n", "source: 'ALL',\n")
replace('S.data[S.source]', 'inventoryRows()')
function('findBySku', '''function inventoryRows(){ return S.source === 'ALL' ? S.data.GGB.concat(S.data.MAG) : S.data[S.source]; }
function findBySku(source, sku){
  var matches = (S.data[source] || []).filter(function(r){ return String(r.productId).trim() === sku; });
  return matches.length === 1 ? matches[0] : null;
}''')
replace("$('srcGGB').addEventListener", "$('srcALL').addEventListener('click', function(){ setSource('ALL'); });\n$('srcGGB').addEventListener")
replace("$('srcGGB').classList.toggle('on', s === 'GGB');", "$('srcALL').classList.toggle('on', s === 'ALL');\n  $('srcGGB').classList.toggle('on', s === 'GGB');")
replace("'<div class=\"item' + itemCls + '\">'", "'<div data-source=\"' + esc(r.source) + '\" class=\"item' + itemCls + '\">'")
replace("(st === 'Sold'\n        ? '<button class=\"btn small\" data-act=\"revert\" data-sku=\"' + esc(sku) + '\">↩ Back to INSTOCK</button>'", "(st !== 'Instock'\n        ? '<span class=\"badge\">' + esc(st) + '</span>'")
replace("'<div class=\"i-sub\">' +", "'<div class=\"i-sub\"><span class=\"badge\">' + esc(r.source) + '</span>' +")
replace("var a = act.getAttribute('data-act');", "var a = act.getAttribute('data-act'), src = act.closest('[data-source]').getAttribute('data-source');")
replace("openEdit(sku);", "openEdit(sku, src);")
replace("openSold(sku);", "openSold(sku, src);")
replace("addToCart(sku);", "addToCart(sku, src);")
replace("setModalSource(S.source);", "setModalSource(S.source === 'ALL' ? 'GGB' : S.source);")
replace("if (b) openEdit(b.getAttribute('data-rvedit'), S.source);", "if (b) openEdit(b.getAttribute('data-rvedit'), b.getAttribute('data-source'));")
replace("data-rvedit=\"' + esc(sku)", "data-source=\"' + esc(r.source) + '\" data-rvedit=\"' + esc(sku)")
# Full reset, including the private keyboard suggestion selection state.
replace("function attachSuggest(inputId, boxId, listFn, onChoose){", "var suggestionResets = [];\nfunction attachSuggest(inputId, boxId, listFn, onChoose){")
replace("function hide(){ box.style.display = 'none'; active = -1; }", "function hide(){ box.style.display = 'none'; active = -1; }\n  suggestionResets.push(function(){ items = []; hide(); box.innerHTML = ''; });")
start = h.index('      // ready for the next volume:')
end = h.index("      $('fName').focus();", start)
h = h[:start]+'''      resetAddForm();
'''+h[end:]
replace('function openAdd(){', '''function resetAddForm(){
  clearTimeout(_flT);
  fillForm({status:'Instock'});
  M.auto = {genre:false, platform:false, original:false, type:false};
  M.sku = ''; M.row = null;
  suggestionResets.forEach(function(reset){ reset(); });
}
function openAdd(){''')
replace("fillForm({ status: 'Instock' });", "resetAddForm();\n  $('fStatusSel').disabled = false;")
replace("fillForm(r);\n  $('mResult')", "fillForm(r);\n  $('fStatusSel').disabled = r.status === 'Sold' || r.status === 'Auction';\n  $('mResult')")
replace("if (M.mode === 'add') setModalSource('GGB');", "if (M.mode === 'add' && !M.saving) { setModalSource('GGB'); resetAddForm(); }")
replace("if (M.mode === 'add') setModalSource('MAG');", "if (M.mode === 'add' && !M.saving) { setModalSource('MAG'); resetAddForm(); }")
replace('<label class="f">Actual sold price', '''<label class="f">Sale method<select id="soldMethod"><option value="DIRECT">ขายปกติ</option><option value="AUCTION">ขายผ่านประมูลแล้ว</option></select></label>
        <label class="f">Sold date<input id="soldDate" type="date"></label>
        <label class="f">Customer shipping<input id="soldCustomerShipping" inputmode="decimal" value="50"></label>
        <label class="f">Actual sold price''')
function('setSoldChannel', '''function setSoldChannel(ch){
  M.soldChannel = ch;
  document.querySelectorAll('#soldCh button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-ch') === ch); });
  updateSoldHint();
}''')
function('updateSoldHint', '''function updateSoldHint(){
  $('soldShip').disabled = false;
  $('soldConvHint').textContent = 'ราคาขายจริงต่อเล่ม ไม่รวมค่าส่ง · ช่องค่าส่งร้าน = จ่ายให้ขนส่งจริง · ยังไม่ใช่การบันทึกรับเงิน';
}''')
replace('function openSold(sku){\n  var r = findBySku(S.source, sku);', 'function openSold(sku, src){\n  var r = findBySku(src || S.source, sku);')
replace("M.sku = sku; M.row = r;\n  var rn", "if (String(r.status).trim() !== 'Instock') { toast('รายการนี้ไม่พร้อมขาย'); return; }\n  M.sku = sku; M.row = r;\n  $('soldMethod').value = 'DIRECT';\n  $('soldDate').value = bangkokToday();\n  $('soldCustomerShipping').value = '50';\n  var rn")
replace("callApi('inventory.markSold', { source:", "checkoutApi('inventory.markSold', { source:")
replace("shipping: $('soldShip').value.trim() })", "shipping: $('soldShip').value.trim(), customerShipping: $('soldCustomerShipping').value.trim(),\n                                  method: $('soldMethod').value, soldDate: $('soldDate').value })")
replace("return r && String(r.status).trim() !== 'Sold';", "return r && String(r.status).trim() === 'Instock';")
replace('function addToCart(sku){\n  var r = findBySku(S.source, sku);', 'function addToCart(sku, src){\n  var r = findBySku(src || S.source, sku);')
replace("if (st === 'Sold') { toast('This item is already sold'); return; }\n  if (st === 'Auction' && !confirm('This item is AUCTION status. Add to cart anyway?')) return;", "if (st !== 'Instock') { toast('รายการนี้ไม่พร้อมขาย (Auction คือขายแล้ว)'); return; }")
replace('baseTitle: r.baseTitle, status: st, price:', "baseTitle: r.baseTitle, status: st, method: 'DIRECT', price:")
replace("'<input class=\"cl-price\"", "'<select class=\"cl-method\" data-idx=\"' + i + '\"><option value=\"DIRECT\"' + (c.method !== 'AUCTION' ? ' selected' : '') + '>ขายปกติ</option><option value=\"AUCTION\"' + (c.method === 'AUCTION' ? ' selected' : '') + '>ประมูล</option></select>' +\n      '<input class=\"cl-price\"")
replace("function buildItemsLines(){\n  return S.cart.map", "function buildItemsLines(){\n  return S.cart.slice().sort(function(a,b){ return a.baseTitle.localeCompare(b.baseTitle, 'th', {numeric:true, sensitivity:'base'}) || (a.source + a.sku).localeCompare(b.source + b.sku); }).map")
replace("' (SHOPEE — ราคาแปลงกลับฐานหน้าร้านอัตโนมัติ)'", "' (SHOPEE — บันทึกราคาขายจริง ไม่หักค่าธรรมเนียมอัตโนมัติ)'")
replace("callApi('sales.confirm', {", "checkoutApi('sales.confirm', {")
replace('sku: c.sku, price: c.price };', 'sku: c.sku, price: c.price, method: c.method };')
replace("shipping: (function(){ var v = parseFloat($('cShipShop').value); return isNaN(v) ? 0 : v; })(),", "shipping: $('cShipShop').value.trim(), customerShipping: cartShipping(), soldDate: $('cartSoldDate').value,")
replace('/* cart events */', '''/* cart events */
$('cartLines').addEventListener('change', function(e){
  if (e.target.matches('.cl-method')) S.cart[+e.target.getAttribute('data-idx')].method = e.target.value;
});''')
replace('SHOPEE: ราคาที่กรอกจะถูกแปลงกลับฐานหน้าร้านอัตโนมัติ (÷1.2 −50)', 'SHOPEE: บันทึกราคาขายจริงต่อเล่ม · กำไรยังไม่หักค่าธรรมเนียมแพลตฟอร์ม')
replace('ช่องล่าง = ที่<b>ร้านออกเอง</b> ใส่ 0 ถ้าลูกค้าจ่ายเต็ม ใส่จำนวนจริงเมื่อส่งฟรี/ลดค่าส่งให้', 'ช่องล่าง = ยอดที่จ่ายให้บริษัทขนส่งจริง แม้ลูกค้าจ่ายค่าส่งแล้ว · ถ้ายังไม่ทราบ กำไรที่เห็นยังไม่ใช่ยอดสุดท้าย')
replace('Shipping paid by shop', 'Carrier shipping expense')
replace('<div class="cart-actions">', '<label class="f">Sold date<input id="cartSoldDate" type="date"></label><p class="hint">Confirm Sold บันทึกการขาย ยังไม่บันทึกการรับเงิน</p>\n      <div class="cart-actions">')
# Keep history separate from ledger totals: legacy stock rows cannot establish orders or payment.
replace('<div id="salesTable"', '<div id="salesTable"') # assert existing anchor
replace("S.sales.rows = dd.rows || []; S.sales.loaded = true;", "S.sales.rows = dd.rows || []; S.sales.history = dd.history || []; S.sales.pending = dd.pendingRequests || []; S.sales.loaded = true;")
replace('function renderSales(){\n  var rows', 'function renderSales(){\n  renderSaleHistory();\n  var rows')
replace('NET PROFIT', 'MARGIN BEFORE FEES')
replace("$('salesRefresh').addEventListener", '''function renderSaleHistory(){
  var el = $('saleHistory');
  if (!el) { el = document.createElement('div'); el.id = 'saleHistory'; $('salesWrap').parentNode.appendChild(el); }
  var rows = (S.sales.history || []).slice().sort(function(a,b){ return String(b.soldDate).localeCompare(String(a.soldDate)); });
  el.innerHTML = '<p>ประวัติรายเล่มจากสต็อก · Sold / Auction · รายการไม่มีวันที่ไม่ถูกรวมเป็นยอดของเดือนปัจจุบัน</p>' +
    (S.sales.pending.length ? '<p>มีรายการบันทึกค้าง: ' + esc(S.sales.pending.join(', ')) + ' — กด Retry checkout</p>' : '') +
    '<div style="overflow:auto"><table class="stbl"><tr><th>วันที่ขาย</th><th>ชื่อ / รหัสเล่ม</th><th>ประเภท</th><th>วิธีขาย</th><th>ราคาจริง</th></tr>' +
    rows.map(function(r){ return '<tr><td>' + esc(r.soldDate ? r.soldDate.slice(0,10) : 'ไม่ทราบวันที่') + '</td><td>' + esc(r.product) + '<br>' + esc(r.sku) + '</td><td>' + esc(r.source) + '</td><td>' + esc(r.method) + '</td><td>' + (r.price === '' || r.price == null ? 'ไม่ทราบราคา' : money(r.price)) + '</td></tr>'; }).join('') + '</table></div>';
}
$('salesRefresh').addEventListener''')
# Persistent original request: loss of an HTTP response must not create a new sale.
replace('/* ── mark sold / revert', '''function bangkokToday(){
  var parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  var d = {}; parts.forEach(function(p){ d[p.type] = p.value; });
  return d.year + '-' + d.month + '-' + d.day;
}
var pendingCheckout = null;
function restorePending(){
  try { pendingCheckout = JSON.parse(localStorage.getItem('owa.pendingCheckout.' + S.sheetUrl) || 'null'); } catch(e) {}
}
function savePending(value){
  pendingCheckout = value;
  try { if (value) localStorage.setItem('owa.pendingCheckout.' + S.sheetUrl, JSON.stringify(value)); else localStorage.removeItem('owa.pendingCheckout.' + S.sheetUrl); } catch(e) {}
}
function checkoutApi(action, payload){
  if (!S.sheetUrl) return Promise.reject(new Error('รอโหลดชีตก่อนบันทึกการขาย'));
  if (pendingCheckout) return Promise.reject(new Error('มีรายการรอยืนยันผล: กด Retry checkout เพื่อบันทึกรายการเดิมก่อน'));
  payload.requestId = 'owa-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  savePending({action:action, payload:payload, sheetUrl:S.sheetUrl});
  return sendPendingCheckout();
}
function sendPendingCheckout(){
  var request = pendingCheckout;
  if (!request && S.sales.pending && S.sales.pending.length === 1) return callApi('sales.retry', {requestId:S.sales.pending[0]});
  if (!request) return Promise.reject(new Error('เปิดหน้า SALES เพื่อโหลดรายการค้าง แล้วกด Retry อีกครั้ง'));
  if (request.sheetUrl !== S.sheetUrl) return Promise.reject(new Error('checkout ค้างเป็นของชีตอื่น ต้องกลับไปบันทึกในชีตต้นทาง'));
  return callApi(request.action, request.payload).then(function(result){ savePending(null); return result; });
}
$('cartSoldDate').value = bangkokToday();
var retryCheckout = document.createElement('button');
retryCheckout.className = 'btn'; retryCheckout.textContent = 'Retry checkout';
$('salesRefresh').parentNode.appendChild(retryCheckout);
retryCheckout.addEventListener('click', function(){
  retryCheckout.disabled = true;
  sendPendingCheckout().then(function(){ S.cart = []; S.sales.loaded = false; load(); loadSales(true); okToast('บันทึก checkout เดิมสำเร็จ'); })
    .catch(function(e){ toast(e.message); }).finally(function(){ retryCheckout.disabled = false; });
});
/* ── mark sold / revert''')
replace("if (r.ok) res(r.data); else rej(new Error(r.error || 'unknown error'));", "if (r.ok) res(r.data); else { var err = new Error(r.error || 'unknown error'); err.safeToEditCheckout = r.safeToEditCheckout === true; rej(err); }")
replace("return callApi(request.action, request.payload).then(function(result){ savePending(null); return result; });", "return callApi(request.action, request.payload).then(function(result){ savePending(null); return result; }).catch(function(e){ if (e.safeToEditCheckout) savePending(null); throw e; });")
# Avoid a misleading GGB label when the combined inventory is active.
replace("S.source === 'MAG' ? 'MAGAZINE' : 'GAME GUIDE BOOKS'", "S.source === 'ALL' ? 'ALL — เลือกคลังก่อนใช้เครื่องมือ' : (S.source === 'MAG' ? 'MAGAZINE' : 'GAME GUIDE BOOKS')")
replace('<option>Instock</option><option>Auction</option><option>Sold</option>', '<option>Instock</option><option>Hold</option><option>Retake</option><option disabled>Auction</option><option disabled>Sold</option>')
replace("$('fStatusSel').disabled = false;", "$('fStatusSel').disabled = false;\n  $('mSave').disabled = false;")
replace("$('fStatusSel').disabled = r.status === 'Sold' || r.status === 'Auction';", "$('fStatusSel').disabled = r.status === 'Sold' || r.status === 'Auction';\n  $('mSave').disabled = $('fStatusSel').disabled;")
replace('.cart-line .cl-rm{', '.cl-method{max-width:105px;background:var(--input);color:var(--fg);border:1px solid var(--border);padding:8px 3px} @media(max-width:540px){.cart-line{flex-wrap:wrap}.cart-line .cl-name{flex-basis:100%}}\n.cart-line .cl-rm{')
replace("S.sheetUrl = d.sheetUrl || '';", "S.sheetUrl = d.sheetUrl || '';\n      restorePending();")
replace('No sales recorded yet — close a cart in the CART tab.', 'ยังไม่มีรายการในสมุด SALES — ประวัติขายเดิมจากสต็อกแสดงด้านล่าง')
replace('function updateCartCount(){', "function updateCartCount(){\n  $('cartMsg').textContent = '';")
replace('function cartRecalcTotals(){', "function cartRecalcTotals(){\n  $('cartMsg').textContent = '';")
replace("if (e.target.matches('.cl-method')) S.cart[+e.target.getAttribute('data-idx')].method = e.target.value;", "if (e.target.matches('.cl-method')) { S.cart[+e.target.getAttribute('data-idx')].method = e.target.value; $('cartMsg').textContent = ''; }")
replace('ship: 0, np: 0, items: 0 }, orders', 'ship: 0, np: 0, items: 0, unknown: 0 }, orders')
replace("var np = (r.netProfit !== '' && r.netProfit != null) ? (+r.netProfit || 0) : (p - c - s);", "var np = (r.netProfit !== '' && r.netProfit != null) ? (+r.netProfit || 0) : (r.cost === '' || r.cost == null ? 0 : p - c - s);\n    if ((r.netProfit === '' || r.netProfit == null) && (r.cost === '' || r.cost == null)) T.unknown++;")
replace("sCard('MARGIN BEFORE FEES', money(T.np), 'np')", "sCard('MARGIN BEFORE FEES' + (T.unknown ? ' · ไม่รวม ' + T.unknown + ' รายการขาดต้นทุน' : ''), money(T.np), 'np')")
(root/'Index.html').write_text(h, encoding='utf-8')
