const {get,put}=require('@vercel/blob');
const {createApp}=require('../server.cjs');
const crypto=require('node:crypto');
const {Readable}=require('node:stream');
module.exports=async(req,res)=>{
 try{
  const url=new URL(req.url,'https://localhost');
  const route=req.query?.route||url.searchParams.get('route');
  if(route)req.url='/api/'+(Array.isArray(route)?route.join('/'):route);
  const pathname=new URL(req.url,'https://localhost').pathname;
  const image=/^\/api\/images\/([a-f0-9-]+\.(jpeg|png|webp))$/.exec(pathname);
  if(image&&req.method==='GET'){
   const result=await get('images/'+image[1],{access:'private',useCache:false});
   if(!result){res.statusCode=404;return res.end()}
   res.setHeader('Content-Type','image/'+image[2]);
   res.setHeader('X-Content-Type-Options','nosniff');
   res.setHeader('Cache-Control','public, max-age=86400, immutable');
   return Readable.fromWeb(result.stream).pipe(res);
  }
  const result=await get('store.json',{access:'private',useCache:false});
  if(!result)throw new Error('Store is not initialized');
  let etag=result.blob.etag;
  const state=await new Response(result.stream).json();
  const sessions=new Map((state.sessions||[]).filter(([,s])=>s.expires>Date.now()));
  const attempts=new Map((state.attempts||[]).filter(([,s])=>s.until>Date.now()));
  const persist=async()=>{
   state.sessions=[...sessions];state.attempts=[...attempts];
   try{const saved=await put('store.json',JSON.stringify(state),{access:'private',allowOverwrite:true,addRandomSuffix:false,ifMatch:etag,contentType:'application/json'});etag=saved.etag}
   catch(e){if(e.name==='BlobPreconditionFailedError')throw Object.assign(new Error('另一位管理员刚更新了数据，请刷新后重试。'),{status:409});throw e}
  };
  const app=createApp({db:state,sessions,attempts,persist,cloud:true,setupToken:state.setupToken,
   allowedHosts:[process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL,'gracing-dongtai-derun.vercel.app','www.gracing.life','gracing.life'].filter(Boolean),
   uploadImage:async(src)=>{const [,type,base64]=/^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(src);const name=crypto.randomUUID()+'.'+type;await put('images/'+name,Buffer.from(base64,'base64'),{access:'private',addRandomSuffix:false,contentType:'image/'+type});return '/api/images/'+name}
  });
  await app.listeners('request')[0](req,res);
 }catch(e){console.error('Store request failed:',e.name,e.message);if(!res.headersSent){res.statusCode=503;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'店铺服务暂时不可用，请稍后重试。'}))}else res.end()}
};
