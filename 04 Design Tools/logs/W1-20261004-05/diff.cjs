const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),dir=__dirname;
const git='C:/Users/JIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
fs.mkdirSync(dir+'/diff',{recursive:true});
function diff(before,after,name){const r=spawnSync(git,['diff','--no-index','--no-ext-diff','--',before,after],{encoding:'utf8',maxBuffer:4e6});if(r.status>1||r.error)throw r.error||Error(r.stderr);fs.writeFileSync(dir+'/diff/'+name,r.stdout);}
for(const [old,newer] of [['Code_v33.gs','Code_v36.gs'],['WebApp_v33.gs','WebApp_v36.gs'],['W1Orders.gs','W1Orders.gs'],['Index.html','Index.html']])diff(dir+'/before/candidate/'+old,dir+'/candidate/'+newer,'candidate-'+newer+'.diff');
for(const [old,newer] of [['Code_v34.gs','Code_v36.gs'],['WebApp_v34.gs','WebApp_v36.gs'],['W1Orders.gs','W1Orders.gs'],['Index.html','Index.html']])diff(dir+'/attempts/F04/before/candidate/'+old,dir+'/candidate/'+newer,'F04-'+newer+'.diff');
for(const [old,newer] of [['Code_v35.gs','Code_v36.gs'],['WebApp_v35.gs','WebApp_v36.gs'],['W1Orders.gs','W1Orders.gs']])diff(dir+'/attempts/F05/before/candidate/'+old,dir+'/candidate/'+newer,'F05-'+newer+'.diff');
console.log('PASS base-v33 and F04 scoped diffs saved');
