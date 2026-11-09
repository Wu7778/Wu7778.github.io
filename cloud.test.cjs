const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('./server.cjs');
test('云端开通保护、跨实例会话、CSRF 和持久化冲突',async()=>{
 let saved={admin:null,products:[],activities:[]},storedSessions=[],storedAttempts=[],conflict=false;
 async function request(route,method='GET',data,headers={}){
  const db=structuredClone(saved),sessions=new Map(structuredClone(storedSessions)),attempts=new Map(structuredClone(storedAttempts));
  const options={db,sessions,attempts,cloud:true,setupToken:'test-private-token',allowedHosts:[],persist:async()=>{if(conflict)throw Object.assign(new Error('conflict'),{status:409});saved=structuredClone(db);storedSessions=[...sessions];storedAttempts=[...attempts]}};
  const app=createApp(options);await new Promise(r=>app.listen(0,'127.0.0.1',r));const host='127.0.0.1:'+app.address().port;options.allowedHosts.push(host);
  try{const res=await fetch('http://'+host+route,{method,headers:{'Content-Type':'application/json',...headers},...(data?{body:JSON.stringify(data)}:{})});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')}}finally{await new Promise(r=>app.close(r))}
 }
 assert.equal((await request('/api/session')).data.needsSetup,false);
 const credentials={username:'owner',password:'cloud-test-password-123'};
 assert.equal((await request('/api/setup','POST',credentials)).status,403);
 const setup=await request('/api/setup','POST',credentials,{'x-setup-token':'test-private-token'});
 assert.equal(setup.status,200);assert.match(setup.cookie,/Secure/);
 const headers={cookie:setup.cookie.split(';')[0],'x-csrf-token':setup.data.csrf};
 assert.equal((await request('/api/session','GET',null,headers)).data.loggedIn,true);
 assert.equal((await request('/api/products','POST',{}, {cookie:headers.cookie})).status,403);
 const product={name:'测试',category:'内衣',sizes:'M',colors:'白',year:null,season:'待确认',description:'test',price:null,featured:true,flashSale:false,images:['/api/images/12345678-abcd.jpeg']};
 conflict=true;assert.equal((await request('/api/products','POST',product,headers)).status,409);assert.equal(saved.products.length,0);
 conflict=false;assert.equal((await request('/api/products','POST',product,headers)).status,201);
 assert.equal((await request('/api/store')).data.products.length,1);
 assert.equal((await request('/api/logout','POST',{},headers)).status,200);
 assert.equal((await request('/api/session','GET',null,headers)).data.loggedIn,false);
});
