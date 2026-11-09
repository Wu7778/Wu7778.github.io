const fs=require('node:fs');
fs.mkdirSync('public',{recursive:true});
for(const file of ['index.html','style.css','app.js','store-ui.js'])fs.copyFileSync(file,'public/'+file);
fs.cpSync('assets','public/assets',{recursive:true,filter:source=>!source.endsWith('.json')});
