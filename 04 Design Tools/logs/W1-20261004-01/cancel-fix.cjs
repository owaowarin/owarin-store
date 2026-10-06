const fs=require('node:fs'),path=require('node:path'),w=require('./work.cjs');
const old=path.join(w.dir,'../W1-20261003-01');
for(const name of ['Code_v32.gs','WebApp_v32.gs','W1Orders.gs','Index.html','R2Upload.gs','p1-add.test.cjs','p1-ui.test.cjs','Index.test.js','image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js'])w.write('04 Design Tools/logs/W1-20261004-01/candidate/'+name,fs.readFileSync(path.join(old,'candidate',name)));
for(const name of ['harness.cjs','schema.json','w1.test.cjs','ui.test.cjs'])w.write('04 Design Tools/logs/W1-20261004-01/'+name,fs.readFileSync(path.join(old,name)));
let html=fs.readFileSync(path.join(old,'candidate/Index.html'),'utf8');
function replace(a,b){if(html.split(a).length!==2)throw Error('Unique anchor '+a.slice(0,65));html=html.replace(a,b);}
replace('<h2>Final review</h2>','<h2 id="w1ReviewTitle">Final review</h2>');
replace('w1Review={payload:payload,order:order};',"w1Review={payload:payload,order:order,action:'orders.confirm'};$('w1ReviewTitle').textContent='Final review';$('w1Commit').textContent='Confirm sold · Label later';");
replace("if(op==='cancel'){if(!confirm('Cancel '+o.orderId+' and release only its reservation?'))return;w1Run('orders.cancel',{orderId:o.orderId,expectedRevision:o.revision}).then(function(r){w1Saved(r,'orders.cancel');}).catch(function(e){toast(e.message);});}","if(op==='cancel')w1OpenCancel(o);");
replace("$('w1Commit').addEventListener('click',function(){if(!w1Review)return;w1Run('orders.confirm',w1Review.payload).then(function(r){w1Saved(r,'orders.confirm');}).catch(function(e){toast(e.message);});});", "function w1OpenCancel(order){w1Review={action:'orders.cancel',payload:{orderId:order.orderId,expectedRevision:order.revision}};$('w1ReviewTitle').textContent='Cancel order';$('w1ReviewContent').innerHTML='<p>'+esc(order.orderId)+'</p><p>Release only this order’s reservation. Other Pending orders remain reserved.</p>';$('w1Commit').textContent='Confirm cancel';showModal('w1ReviewModal',true);w1SyncButtons();}\n$('w1Commit').addEventListener('click',function(){if(!w1Review)return;var action=w1Review.action;w1Run(action,w1Review.payload).then(function(r){showModal('w1ReviewModal',false);w1Saved(r,action);}).catch(function(e){toast(e.message);});});");
const rel='04 Design Tools/logs/W1-20261004-01/candidate/Index.html';w.write(rel,html);
const start=html.indexOf('/* W1 Orders UI.'),end=html.indexOf('\nw1SyncButtons();',start);if(start<0||end<0)throw Error('UI extraction');w.write('04 Design Tools/logs/W1-20261004-01/W1UI.js',html.slice(start,end));
const testPrior=fs.readFileSync(path.join(w.dir,'test-runtime/Index.html'),'utf8');const controls=testPrior.slice(testPrior.indexOf('<aside'),testPrior.indexOf('</script>',testPrior.indexOf('<aside'))+9);
const pid='1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd';
const base=fs.readFileSync(path.join(old,'test-runtime/Index.html'),'utf8');
let staged=html.replace(/owarin\.add\.pending\.[^']+\.v1/g,'owarin.add.pending.'+pid+'.v1').replace('owarin.w1.pending.TEST_OR_PROJECT.v32','owarin.w1.pending.'+pid+'.v32');
// Preserve the already verified test storage-key transform. No bank data in HTML.
if(!staged.includes('owarin.w1.pending.'+pid+'.v32'))throw Error('Test key');
w.write('04 Design Tools/logs/W1-20261004-01/test-runtime/Index.html',staged.replace('<body>','<body>'+controls));
w.log('UI-CANCEL-F01','Reuse existing review modal for cancellation','Native confirm CDP timeout, dialog undefined, stale capture; export proved no cancel request. Minimal Index-only fix; business transaction unchanged','candidate/Index backup preserved; frozen previous package unchanged');
