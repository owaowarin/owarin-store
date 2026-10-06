const fs=require('node:fs'),path=require('node:path');
const [id,message,result,recovery='same Request ID; isolated test only']=process.argv.slice(2),time=new Date().toISOString();
if(!id||!message||!result)throw Error('id/message/result required');
fs.appendFileSync(path.join(__dirname,'changes.csv'),[time,'W1-20261004-05',id,message,result,recovery].map(x=>JSON.stringify(x)).join(',')+'\n');
fs.appendFileSync(path.join(__dirname,'implementation.md'),'\n'+time+' '+id+': '+message+' — '+result+'; recovery: '+recovery+'\n');
