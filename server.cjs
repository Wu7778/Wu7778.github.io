const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
function createApp(options={}) {
 const dir=options.dataDir||path.join(__dirname,'data');
 if(!options.db)fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'store.json');
 const db=options.db||(fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{admin:null,products:[],activities:[]});
 const sessions=options.sessions||new Map(),attempts=options.attempts||new Map();
 const persist=options.persist||(()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(db,null,2));fs.renameSync(file+'.tmp',file)});
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
 const txt=(v,label,max=2000,required=true)=>{if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail(label+'填写不正确');return v.trim()};
 function images(v,required){if(!Array.isArray(v)||v.length>9||(required&&!v.length))fail('产品必须有 1–9 张图片；活动最多 9 张');return v.map(image=>{if(options.cloud&&typeof image==='string'&&/^\/(?:api\/images\/[a-f0-9-]+\.(?:jpeg|png|webp)|assets\/[a-zA-Z0-9-]+\.(?:jpg|png|webp))$/.test(image))return image;if(typeof image!=='string'||image.length>2800000)fail('单张图片不能超过 2 MB');const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);if(!m)fail('只支持 JPG、PNG、WebP 图片');const b=Buffer.from(m[2],'base64');if(b.length>2097152)fail('单张图片不能超过 2 MB');const valid=m[1]==='png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?b[0]===255&&b[1]===216&&b[2]===255:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(!valid)fail('图片内容与格式不符');return image})}
 function product(b){if(b.price!==null&&(typeof b.price!=='number'||!Number.isFinite(b.price)||b.price<0||b.price>999999))fail('价格不正确');if(b.year!==null&&(!Number.isInteger(b.year)||b.year<2000||b.year>2100))fail('年份应为 2000–2100');if(!['待确认','春季','夏季','秋季','冬季','四季'].includes(b.season))fail('季节不正确');if(typeof b.featured!=='boolean'||typeof b.flashSale!=='boolean')fail('主推或秒杀状态不正确');return {name:txt(b.name,'名称',60),category:txt(b.category,'类型',30),sizes:txt(b.sizes,'尺码',100),colors:txt(b.colors,'颜色',100),year:b.year,season:b.season,description:txt(b.description,'介绍'),price:b.price,featured:b.featured,flashSale:b.flashSale,images:images(b.images,true)}}
 function activity(b){if(!['活动公告','福利推送'].includes(b.kind))fail('活动类型不正确');const start=Date.parse(b.startsAt),end=Date.parse(b.endsAt);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)fail('活动结束时间必须晚于开始时间');if(typeof b.enabled!=='boolean')fail('发布状态不正确');return {name:txt(b.name,'标题',80),kind:b.kind,description:txt(b.description,'介绍'),benefit:txt(b.benefit,'福利',300,false),startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),enabled:b.enabled,images:images(b.images,false)}}
 const active=i=>i.enabled&&Date.parse(i.startsAt)<=Date.now()&&Date.parse(i.endsAt)>Date.now();
 async function body(req){if(req.body!==undefined){try{return typeof req.body==='string'?JSON.parse(req.body):req.body}catch{fail('JSON 无效')}}let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>26*1024*1024)fail('上传内容过大',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString())}catch{fail('JSON 无效')}}
 function session(req){const token=/(?:^|; )gracing_session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1],s=sessions.get(token);if(s&&s.expires>Date.now())return s;if(token)sessions.delete(token);return null}
 function login(res){const token=crypto.randomBytes(32).toString('hex'),s={csrf:crypto.randomBytes(24).toString('hex'),expires:Date.now()+28800000};sessions.set(token,s);res.setHeader('Set-Cookie',`gracing_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${options.cloud?'; Secure':''}`);return s}
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
  try{
   const host=req.headers.host||'';if(options.cloud?!options.allowedHosts.includes(host):!/^(127\.0\.0\.1|localhost):\d+$/.test(host))fail(options.cloud?'当前域名尚未获准访问店铺服务':'仅允许本机访问',403);
   const route=new URL(req.url,`http://${host}`).pathname,method=req.method;
   if(!['GET','HEAD'].includes(method)&&req.headers.origin&&req.headers.origin!==`${options.cloud?'https':'http'}://${host}`)fail('拒绝跨站请求',403);
   if(req.headers['sec-fetch-site']==='cross-site')fail('拒绝跨站请求',403);const s=session(req);
   if(route==='/api/session'&&method==='GET')return send({loggedIn:Boolean(s),needsSetup:!db.admin&&(!options.cloud||req.headers['x-setup-token']===options.setupToken),cloud:Boolean(options.cloud),username:s?db.admin.username:null,csrf:s?.csrf});
   if(['/api/setup','/api/login'].includes(route)&&method==='POST'){
    const key=options.cloud?(req.headers['x-forwarded-for']||req.socket.remoteAddress):req.socket.remoteAddress,recent=attempts.get(key)||{count:0,until:Date.now()+900000};if(recent.until<Date.now()){recent.count=0;recent.until=Date.now()+900000}if(recent.count>=10)fail('尝试过多，请 15 分钟后重试',429);recent.count++;attempts.set(key,recent);if(options.cloud)await persist();
    const b=await body(req),username=txt(b.username,'用户名',40),password=txt(b.password,'密码',128);
    if(route==='/api/setup'){if(options.cloud&&(!options.setupToken||req.headers['x-setup-token']!==options.setupToken))fail('请使用店主专用开通链接',403);if(db.admin)fail('管理员已创建',409);if(password.length<12)fail('密码至少 12 位');const salt=crypto.randomBytes(16).toString('hex');db.admin={username,salt,hash:crypto.scryptSync(password,salt,64).toString('hex')};await persist()}
    else if(!db.admin||username!==db.admin.username||!crypto.timingSafeEqual(Buffer.from(db.admin.hash,'hex'),crypto.scryptSync(password,db.admin.salt,64)))fail('用户名或密码错误',401);
    attempts.delete(key);const current=login(res);if(options.cloud)await persist();return send({loggedIn:true,csrf:current.csrf,username,needsSetup:false})
   }
   if(route.startsWith('/api/')&&!['GET','HEAD'].includes(method)){if(!s)fail('请先登录管理员',401);if(req.headers['x-csrf-token']!==s.csrf)fail('会话校验失败，请重新登录',403)}
   if(route==='/api/logout'&&method==='POST'){for(const [token,v]of sessions)if(v===s)sessions.delete(token);if(options.cloud)await persist();res.setHeader('Set-Cookie','gracing_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send({ok:true})}
   if(route==='/api/store'&&method==='GET')return send({products:db.products,activities:db.activities.filter(active)});
   if(route==='/api/admin/store'&&method==='GET'){if(!s)fail('请先登录管理员',401);return send({products:db.products,activities:db.activities})}
   if(route==='/api/images'&&method==='POST'&&options.uploadImage){const b=await body(req);const validated=images([b.image],true)[0];if(!validated.startsWith('data:'))fail('请上传图片内容');return send({url:await options.uploadImage(validated)},201)}
   const match=/^\/api\/(products|activities)(?:\/([a-f0-9-]+))?$/.exec(route);
   if(match&&['POST','PUT','DELETE'].includes(method)){const [,collection,id]=match,list=db[collection],index=list.findIndex(p=>p.id===id);if(method!=='POST'&&index<0)fail('记录不存在',404);if(method==='DELETE'){list.splice(index,1);await persist();return send({ok:true})}const value=(collection==='products'?product:activity)(await body(req));const entry={...value,id:method==='POST'?crypto.randomUUID():id,updatedAt:new Date().toISOString()};if(method==='POST')list.unshift(entry);else list[index]=entry;await persist();return send(entry,method==='POST'?201:200)}
   if(/^\/assets\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(route)&&method==='GET'){const asset=path.join(__dirname,route.slice(1));if(!fs.existsSync(asset))fail('图片不存在',404);res.writeHead(200,{'Content-Type':route.endsWith('.png')?'image/png':route.endsWith('.webp')?'image/webp':'image/jpeg','Cache-Control':'public, max-age=86400'});return res.end(fs.readFileSync(asset))}
   if(route.startsWith('/api/'))fail('接口不存在',404);const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/store-ui.js':'store-ui.js'};if(!files[route]||method!=='GET')fail('页面不存在',404);const f=files[route];res.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(__dirname,f)));
  }catch(error){if(!res.headersSent)send({error:error.status?error.message:'服务器处理失败，请检查本地数据目录'},error.status||500);else res.end()}
 });
}
if(require.main===module){if(fs.existsSync(path.join(__dirname,'.env')))process.loadEnvFile(path.join(__dirname,'.env'));const port=Number(process.env.PORT)||3000;createApp().listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}\n首次使用请打开管理员入口并创建账号。`))}
module.exports={createApp};


