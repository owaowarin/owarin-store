const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),w=require('./work.cjs');
for(const name of ['remaining.test.cjs','w1.test.cjs','candidate/p1-add.test.cjs','candidate/image-url.test.js','candidate/fb-catalogue.test.js','candidate/meta-pipeline.test.js']){
 const r=cp.spawnSync(process.execPath,[path.join(w.dir,name)],{encoding:'utf8'});const out=r.stdout+r.stderr;w.write('04 Design Tools/logs/W1-20261004-03/tests/'+name.replaceAll('/','-')+'.txt',out);w.log('TEST-'+name,'Affected check',`exit ${r.status}`);console.log(name+' exit '+r.status);if(r.status){console.log(out.slice(-2300));process.exitCode=1;break;}
}
