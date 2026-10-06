const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{log,sha}=require('../../w1-work.cjs');
for(const f of ['p1-add.test.cjs','p1-ui.test.cjs','Index.test.js','image-url.test.js','fb-catalogue.test.js','meta-pipeline.test.js']){
 const r=cp.spawnSync(process.execPath,[f],{cwd:path.join(__dirname,'candidate'),encoding:'utf8'});const out=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(__dirname,'regression-'+f+'.txt'),out);log('REGRESSION_'+f,f,'regression-'+f+'.txt','v32 candidate',sha(out),'exit '+r.status);console.log(f+' exit '+r.status);if(r.status){process.stdout.write(out);process.exitCode=1;}
}
