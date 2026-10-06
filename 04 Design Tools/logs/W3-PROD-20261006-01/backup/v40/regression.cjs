// Run existing W2 checks against exact release sources, preserving frozen test files.
const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
for(const file of ['w2.test.cjs','orders-ui.test.cjs','label-renderer.test.cjs']){
 const original=path.resolve(__dirname,'../W2-20261005-01',file),target=path.join(__dirname,file);
 const text=fs.readFileSync(original,'utf8').replaceAll('Code_v39.gs','Code_v40.gs').replaceAll('WebApp_v39.gs','WebApp_v40.gs').replace('if(require.main===module){','{');
 const m=new Module(target,module);m.filename=target;m.paths=module.paths;const previous=require.main;require.main=m;
 try{m._compile(text,target);}finally{require.main=previous;}
}
