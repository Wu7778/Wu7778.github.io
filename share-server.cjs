// Public preview gateway: forwards only the storefront's read-only routes.
const http=require('node:http');
const allowed=new Set(['/','/index.html','/style.css','/app.js','/store-ui.js','/api/store']);
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
 if(req.method!=='GET')return json(403,{error:'公开链接仅供浏览，店铺管理请使用本机地址。'});
 if(pathname==='/api/session')return json(200,{loggedIn:false,needsSetup:false,readOnly:true});
 if(!allowed.has(pathname)&&!/^\/assets\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(pathname))return json(403,{error:'公开链接仅供浏览。'});
 try{
  const response=await fetch('http://127.0.0.1:3000'+pathname,{signal:AbortSignal.timeout(10000)});
  res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream'});
  if(pathname==='/'||pathname==='/index.html')res.end((await response.text()).replace('</head>','<style>#manageBtn{display:none!important}</style></head>'));
  else res.end(Buffer.from(await response.arrayBuffer()));
 }catch{json(502,{error:'店铺本地服务暂时不可用。'})}
});
server.listen(3002,'127.0.0.1',()=>console.log('Read-only storefront: http://127.0.0.1:3002'));
