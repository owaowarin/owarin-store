const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),path=require('node:path'),d=__dirname,c=d+'/candidate';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase(),lf=s=>s.replace(/\r\n/g,'\n');
const files=['Code_v39.gs','WebApp_v39.gs','W1Orders.gs','W2Clients.gs','Index.html','LabelRenderer.html','W2LabelUI.html','W2Suggest.html','LabelDialog.html'],hashes={};
for(const file of files)hashes[file]=hash(lf(fs.readFileSync(c+'/'+file,'utf8')));
const revision={revision:'W2-20261005-01/v39@'+hash(JSON.stringify(hashes)),hashes};
const mapping={'Code.gs':'Code_v39.gs','Webapp.gs':'WebApp_v39.gs','W1Orders.gs':'W1Orders.gs','W2Clients.gs':'W2Clients.gs','W2LabelUI.html':'W2LabelUI.html','W2Suggest.html':'W2Suggest.html','LabelRenderer.html':'LabelRenderer.html','LabelDialog.html':'LabelDialog.html'};
for(const [to,from] of Object.entries(mapping))assert.equal(lf(fs.readFileSync(d+'/google-source-readback/'+to,'utf8')),lf(fs.readFileSync(c+'/'+from,'utf8')));
for(const f of fs.readdirSync(d+'/test-runtime'))assert.equal(lf(fs.readFileSync(d+'/google-source-readback/'+f,'utf8')),lf(fs.readFileSync(d+'/test-runtime/'+f,'utf8')));
assert.equal(lf(fs.readFileSync(d+'/google-source-before/appsscript.json','utf8')),lf(fs.readFileSync(d+'/google-source-readback/appsscript.json','utf8')));
assert.equal(lf(fs.readFileSync(d+'/google-source-before/W1Qa.gs','utf8')),lf(fs.readFileSync(d+'/google-source-readback/W1Qa.gs','utf8')));
const w1=JSON.parse(fs.readFileSync(d+'/../W1-20261005-01/revision.json','utf8'));for(const {file:name,sha256LF:h} of w1.files){let b=lf(fs.readFileSync(d+'/../W1-20261005-01/candidate/'+name,'utf8'));assert.equal(hash(b),h.toUpperCase());}
assert(fs.readFileSync(c+'/Code_v39.gs','utf8').includes('pairs with WebApp.gs v39'));assert(fs.readFileSync(c+'/WebApp_v39.gs','utf8').includes('pairs with Code.gs v39'));
const result={result:'PASS',revision:revision.revision,candidateFiles:files.length,sourceReadbacks:12,manifestUnchanged:true,w1Frozen:true};fs.writeFileSync(d+'/revision.json',JSON.stringify(revision,null,2)+'\n');fs.writeFileSync(d+'/verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
