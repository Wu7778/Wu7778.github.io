const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('./server.cjs');
test('管理权限、商品活动 CRUD、持久化及视频接口移除',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gracing-test-'));
 const server=createApp({dataDir:dir});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 let cookie='',csrf='';
 async function request(route,method='GET',data,authenticated=true,extra={}){const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(authenticated?{Cookie:cookie,'X-CSRF-Token':csrf}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:await res.json()}}
 try{
  assert.equal((await request('/api/session')).body.needsSetup,true);
  assert.equal((await request('/api/products','POST',{})).status,401);
  assert.equal((await request('/api/setup','POST',{username:'owner',password:'short'})).status,400);
  const setup=await request('/api/setup','POST',{username:'owner',password:'test-password-12345'});assert.equal(setup.status,200);csrf=setup.body.csrf;
  assert.equal((await request('/api/setup','POST',{username:'other',password:'test-password-12345'})).status,409);
  assert.equal((await request('/api/products','POST',{},true,{'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await request('/api/products','POST',{},true,{Origin:'https://evil.example'})).status,403);
  assert.equal((await fetch(base+'/data/store.json')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';
  const item={name:'测试产品',category:'内衣',price:99,sizes:'S、M',colors:'黑色',year:2026,season:'秋季',description:'商品介绍',featured:true,flashSale:true,images:[image]};
  assert.equal((await request('/api/products','POST',{...item,images:[]})).status,400);
  assert.equal((await request('/api/products','POST',{...item,images:Array(10).fill(image)})).status,400);
  assert.equal((await request('/api/products','POST',{...item,images:['data:image/png;base64,YWJj']})).status,400);
  const created=await request('/api/products','POST',item);assert.equal(created.status,201);const id=created.body.id;
  const pending=await request('/api/products/'+id,'PUT',{...item,price:null,year:null,season:'待确认'});assert.equal(pending.status,200);assert.equal(pending.body.price,null);assert.equal(pending.body.year,null);
  const photo=await fetch(base+'/assets/product-224-2.jpg');assert.equal(photo.status,200);assert.match(photo.headers.get('content-type'),/^image\/jpeg/);
  assert.equal((await request('/api/products/'+id,'PUT',{...item,name:'修改产品',featured:false})).body.name,'修改产品');
  assert.equal((await request('/api/store','GET',null,false)).body.products[0].featured,false);
  const activity={name:'福利',kind:'福利推送',description:'到店福利',benefit:'赠礼，限前十名',startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),enabled:true,images:[]};
  assert.equal((await request('/api/activities','POST',{...activity,endsAt:activity.startsAt})).status,400);
  const a=await request('/api/activities','POST',activity);assert.equal(a.status,201);
  await request('/api/activities','POST',{...activity,startsAt:new Date(Date.now()+7200000).toISOString(),endsAt:new Date(Date.now()+10800000).toISOString()});
  assert.equal((await request('/api/store','GET',null,false)).body.activities.length,1);
  assert.equal((await request('/api/admin/store')).body.activities.length,2);
  assert.equal((await request('/api/videos')).status,404);
  assert.equal((await request('/api/videos','POST',{})).status,404);
  assert.equal((await request('/api/products/'+id,'DELETE',{})).status,200);assert.equal((await request('/api/store')).body.products.length,0);
  assert.equal((await request('/api/activities/'+a.body.id,'DELETE',{})).status,200);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'store.json')));assert.equal(saved.admin.username,'owner');assert.equal(saved.admin.password,undefined);assert.equal(saved.admin.hash.includes('test-password'),false);
  await request('/api/logout','POST',{});assert.equal((await request('/api/admin/store')).status,401);
  assert.equal((await request('/api/login','POST',{username:'owner',password:'wrong'})).status,401);
  assert.equal((await request('/api/login','POST',{username:'owner',password:'test-password-12345'})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
