const fs=require('node:fs'),crypto=require('node:crypto');
const {get,put}=require('@vercel/blob');
process.loadEnvFile('.env.local');
(async()=>{
 const existing=await get('store.json',{access:'private',useCache:false});
 if(existing){console.log('Cloud store already initialized; no data overwritten.');return}
 const local=JSON.parse(fs.readFileSync('data/store.json','utf8'));
 const state={admin:local.admin,products:local.products,activities:local.activities,sessions:[],attempts:[],setupToken:crypto.randomBytes(32).toString('hex')};
 for(const item of [...state.products,...state.activities]){
  item.images=await Promise.all(item.images.map(async src=>{
   const [,type,b64]=/^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(src);
   const name=crypto.randomUUID()+'.'+type;
   await put('images/'+name,Buffer.from(b64,'base64'),{access:'private',addRandomSuffix:false,contentType:'image/'+type});
   return '/api/images/'+name;
  }));
 }
 await put('store.json',JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});
 fs.writeFileSync('data/线上管理入口.txt','店主专用首次开通链接（请勿公开分享）：\nhttps://gracing-dongtai-derun.vercel.app/#setup='+state.setupToken+'\n打开后点击“管理员登录”，设置自己的账号和至少 12 位密码。\n管理员创建后，此开通链接即失效。\n');
 console.log('Initialized cloud store: '+state.products.length+' products, '+state.activities.length+' activities. Private setup link saved locally.');
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1});
