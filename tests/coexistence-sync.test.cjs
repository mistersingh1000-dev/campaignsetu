const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,deps={}){const m={exports:{}};new Function('exports','require','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m.exports,n=>n in deps?deps[n]:require(n),m);return m.exports;}
class DB {
 constructor(){this.map=new Map();this.queue=Promise.resolve();}
 collection(name){const db=this;return {doc(id){const key=name+'/'+id;return {id,key,get:async()=>({exists:db.map.has(key),data:()=>db.map.get(key)}),set:async(v,o)=>db.map.set(key,o?.merge?{...db.map.get(key),...v}:v)};},where(field,op,val){return {get:async()=>({docs:[...db.map].filter(([k,v])=>k.startsWith(name+'/')&&v[field]===val).map(([k,v])=>({id:k.split('/')[1],data:()=>v}))})};}};}
 runTransaction(fn){const p=this.queue.then(async()=>{const writes=[];const result=await fn({get:r=>r.get(),set:(r,v,o)=>writes.push(()=>this.map.set(r.key,o?.merge?{...this.map.get(r.key),...v}:v)),update:(r,v)=>writes.push(()=>this.map.set(r.key,{...this.map.get(r.key),...v}))});writes.forEach(w=>w());return result;});this.queue=p.catch(()=>{});return p;}
}
const convId=(u,p)=>u+'_'+p;
const api=load('lib/coexistence-sync.ts',{'./chat-db':{convId}});
const owner={email:'owner@example.com',waba_id:'123'};
const msg={from:'15550000000',to:'16505551234',id:'wamid.1',timestamp:'1739230955',type:'text',text:{body:'Mobile reply'}};
test('duplicate mobile echoes and history share one message; older history preserves unread and preview',async()=>{
 const db=new DB();
 await Promise.all([1,2].map(()=>api.digestCoexistenceChange(db,owner,'456','smb_message_echoes',{message_echoes:[msg]})));
 assert.equal([...db.map.keys()].filter(k=>k.startsWith('messages/')).length,1);
 const key='conversations/'+convId(owner.email,msg.to);db.map.set(key,{...db.map.get(key),lastMessage:'new live message',lastMessageTime:'2026-10-30T01:00:00.000Z',unreadCount:4,isRead:false});
 await api.digestCoexistenceChange(db,owner,'456','history',{metadata:{display_phone_number:msg.from},history:[{metadata:{progress:100},threads:[{id:msg.to,messages:[msg,{...msg,id:'wamid.2',from:msg.to,text:{body:'old inbound'}}]}]}]});
 assert.equal([...db.map.keys()].filter(k=>k.startsWith('messages/')).length,2);
 assert.equal(db.map.get(key).unreadCount,4);assert.equal(db.map.get(key).lastMessage,'new live message');
 const incoming=[...db.map.values()].find(v=>v.waMessageId==='wamid.2');assert.equal(incoming.sender,'contact');assert.equal(incoming.importedHistory,true);
});
test('history media payload enriches placeholder without duplicating or firing inbound automation',async()=>{
 const db=new DB();const base={...msg,id:'media',type:'media_placeholder'};
 await api.digestCoexistenceChange(db,owner,'456','history',{metadata:{display_phone_number:msg.from},history:[{threads:[{id:msg.to,messages:[base]}]}]});
 await api.digestCoexistenceChange(db,owner,'456','history',{messages:[{...base,from:msg.to,to:undefined,type:'image',image:{caption:'image caption',id:'asset'}}]});
 const rows=[...db.map.values()].filter(v=>v.waMessageId==='media');assert.equal(rows.length,1);assert.equal(rows[0].mediaId,'asset');assert.equal(rows[0].content,'image caption');
});
test('contact updates preserve opt-out, consent and CRM fields; stale add cannot undo removal',async()=>{
 const db=new DB(),key='contacts/'+convId(owner.email,msg.to);db.map.set(key,{id:'contact',userId:owner.email,phone:msg.to,name:'old',marketingOptIn:false,doNotMessage:true,tags:['VIP'],email:'client@example.invalid'});
 const change=(action,time,name)=>({state_sync:[{type:'contact',action,metadata:{timestamp:String(time)},contact:{phone_number:msg.to,full_name:name}}]});
 await api.digestCoexistenceChange(db,owner,'456','smb_app_state_sync',change('add',1739230955,'Updated'));
 await api.digestCoexistenceChange(db,owner,'456','smb_app_state_sync',change('remove',1739230957));
 await api.digestCoexistenceChange(db,owner,'456','smb_app_state_sync',change('add',1739230956,'stale'));
 const row=db.map.get(key);assert.equal(row.name,'Updated');assert.equal(row.businessAppRemoved,true);assert.equal(row.doNotMessage,true);assert.equal(row.marketingOptIn,false);assert.deepEqual(row.tags,['VIP']);assert.equal(row.email,'client@example.invalid');
});
test('declined history records a status and never creates messages',async()=>{
 const db=new DB();await api.digestCoexistenceChange(db,owner,'456','history',{history:[{errors:[{code:2593109}]}]});
 assert.equal([...db.map.values()].find(v=>v.historyStatus)?.historyStatus,'declined');assert.equal([...db.map.keys()].some(k=>k.startsWith('messages/')),false);
});
const requests=load('lib/coexistence-sync-request.ts',{'./credential-crypto':{decryptCredential:v=>v}});
function ready(){const db=new DB();db.map.set('users/'+owner.email,{...owner,wa_coexistence:true,wa_registered:true,phone_number_id:'456',wa_token:'private-token',wa_connected_at:new Date().toISOString()});return db;}
test('sync requests run contacts before history and retries never duplicate accepted requests',async()=>{
 const db=ready(),calls=[];const fetcher=async(url,o)=>{calls.push(JSON.parse(o.body).sync_type);return {ok:true,status:200,json:async()=>({request_id:'request-'+calls.length})};};
 const result=await requests.requestCoexistenceSync(db,owner.email,fetcher);assert.deepEqual(calls,['smb_app_state_sync','history']);assert.equal(result.history,'requested');await requests.requestCoexistenceSync(db,owner.email,fetcher);assert.equal(calls.length,2);
});
test('uncertain network result is retained and cannot be automatically retried',async()=>{
 const db=ready();let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
 const result=await requests.requestCoexistenceSync(db,owner.email,fetcher);assert.equal(result.contacts,'uncertain');
 await requests.requestCoexistenceSync(db,owner.email,fetcher);assert.equal(calls,1);
});
test('signed history webhook stores messages without inbound automation; unknown owners request retry',async()=>{
 const crypto=require('node:crypto');process.env.META_APP_SECRET='test-webhook-secret';
 const db=new DB();db.map.set('users/'+owner.email,{...owner,phone_number_id:'456'});
 const baseCollection=db.collection.bind(db);db.collection=name=>{const c=baseCollection(name),where=c.where;c.where=(...args)=>{const q=where(...args);q.limit=()=>q;return q;};return c;};
 let automationCalls=0;
 const route=load('app/api/webhooks/whatsapp/route.ts',{
 'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),{status:init?.status||200})}},
 '@/lib/db':{getDb:()=>db},'@/lib/chat-db':{},'@/lib/marketing-db':{},
 '@/lib/automation-engine':{runInboundAutomations:async()=>{automationCalls++;}},
 '@/lib/webhook-idempotency':{},'@/lib/coexistence-sync':api});
 const payload={entry:[{id:'123',changes:[{field:'history',value:{metadata:{phone_number_id:'456',display_phone_number:msg.from},history:[{threads:[{id:msg.to,messages:[msg]}]}]}}]}]};
 const request=(body,valid=true)=>{const raw=JSON.stringify(body);return new Request('https://example.com/api/webhooks/whatsapp',{method:'POST',body:raw,headers:{'x-hub-signature-256':valid?'sha256='+crypto.createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex'):'sha256=bad'}});};
 assert.equal((await route.POST(request(payload,false))).status,401);
 assert.equal((await route.POST(request(payload))).status,200);assert.equal(automationCalls,0);
 payload.entry[0].changes[0].value.metadata.phone_number_id='unknown';
 assert.equal((await route.POST(request(payload))).status,503);
});
