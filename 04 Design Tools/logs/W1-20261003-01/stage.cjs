const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{write,log,root}=require('../../w1-work.cjs');
for(const [from,to] of [['Code_v32.gs','Code.gs'],['WebApp_v32.gs','Webapp.gs'],['Index.html','Index.html'],['W1Orders.gs','W1Orders.gs']]){
 let s=fs.readFileSync(path.join(__dirname,'candidate',from),'utf8');
 if(from==='Code_v32.gs')s=s.replace(/var BANK_INFO = \{[\s\S]*?\};/,"var BANK_INFO = { no:'TEST-BANK', bank:'TEST', account:'TEST' };");
 if(from==='Index.html')s=s.replaceAll('1sxaS-J3YmCyJKX98HlrPvQH1uw9fRqITHEHN8_xGyJOKyuZchvAYhkkp','1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd').replace('TEST_OR_PROJECT','1ILKjMLjbVErqsUMbz0-Cx0FbifI0R0aPpt5mDlNKmG0hfDdk3F-Y5BWd');
 if(to.endsWith('.gs'))new vm.Script(s,{filename:to});else for(const m of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
 write('04 Design Tools/logs/W1-20261003-01/test-runtime/'+to,s);
}
write('04 Design Tools/logs/W1-20261003-01/test-runtime/W1Qa.gs',fs.readFileSync(__dirname+'/W1Qa.gs','utf8'));
for(const f of ['p1-add.test.cjs','p1-ui.test.cjs','Index.test.js','image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js']){let s=fs.readFileSync(path.join(root,'03 Apps Script/Web App',f),'utf8').replaceAll('Code_v31.gs','Code_v32.gs').replaceAll('WebApp_v31.gs','WebApp_v32.gs');write('04 Design Tools/logs/W1-20261003-01/candidate/'+f,s);}
for(const f of ['R2Upload.gs'])write('04 Design Tools/logs/W1-20261003-01/candidate/'+f,fs.readFileSync(path.join(root,'03 Apps Script/Web App',f),'utf8'));
