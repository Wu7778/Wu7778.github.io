const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=__dirname;
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const port=Number(process.env.PORT)||3000;
const url=`http://127.0.0.1:${port}`;
async function health(){try{const response=await fetch(url+'/api/session',{signal:AbortSignal.timeout(1200)});if(!response.ok)return 'occupied';const data=await response.json();return typeof data.loggedIn==='boolean'&&typeof data.needsSetup==='boolean'?'ready':'occupied'}catch(e){return e.cause?.code==='ECONNREFUSED'?'offline':'unknown'}}
async function start(){
 let state=await health();
 if(state==='occupied'||state==='unknown')throw new Error(`端口 ${port} 已有其他服务或未响应，请检查后重试。`);
 if(state!=='ready'){
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  const log=fs.openSync(path.join(root,'data','server.log'),'a');
  const child=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log],env:process.env});
  child.on('error',e=>{console.error(e.message);process.exitCode=1});child.unref();fs.closeSync(log);
  for(let attempt=0;attempt<30;attempt++){await new Promise(r=>setTimeout(r,300));if(await health()==='ready'){state='ready';break}}
  if(state!=='ready')throw new Error('服务未能启动，请查看 data/server.log。');
 }
 const store=await fetch(url+'/api/store',{signal:AbortSignal.timeout(5000)});
 if(!store.ok)throw new Error('服务已启动，但商品数据读取失败，请查看 data/server.log。');
 console.log(`店铺服务已就绪：${url}\n服务会在后台保持运行，关闭此窗口不影响访问。`);
 if(!process.argv.includes('--no-browser')){
  const browser=spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${url}' -WindowStyle Hidden`],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log('请在浏览器打开：'+url));browser.unref();
 }
}
start().catch(e=>{console.error(e.message);process.exitCode=1});
