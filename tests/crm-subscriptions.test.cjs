const test=require('node:test'),assert=require('node:assert/strict');
const {load,DB}=require('./test-helpers.cjs'),plans=load('lib/crm-plans.ts');
const user=(tier='basic')=>({email:'owner@example.com',plan:'expired',crm_tier:tier,crm_status:'active',crm_ends_at:'2099-01-01T00:00:00.000Z'});
const leadApi=load('lib/crm-db.ts',{'./crm-plans':plans});
test('six exact CRM prices and periods; trial gets Pro for exactly seven days independent of WhatsApp',()=>{
 assert.deepEqual(plans.crmPlans.map(p=>[p.monthly,p.yearly]),[[199,1999],[499,3999],[999,7999]]);assert.equal(plans.crmOffers.length,6);assert.equal(plans.crmOffer('crm_pro_yearly').months,12);assert.equal(plans.crmOffer('pro'),undefined);
 const start=Date.parse('2026-10-30T00:00:00Z'),u={plan:'expired',crm_status:'trial',crm_tier:'pro',crm_trial_ends_at:new Date(start+7*86400000).toISOString()};
 assert.equal(plans.crmAccess(u,start).active,true);assert.equal(plans.crmAccess(u,start).limits.leads,25000);assert.equal(plans.crmAccess(u,start+7*86400000).active,false);assert.equal(plans.crmAccess({...u,plan:'suspended'},start).active,false);
 assert.equal(plans.crmAccess(user()).active,true);
});
test('renewal extends only CRM, clamps month-end and disallows unpriced mid-term tier changes',()=>{
 const activated=plans.crmActivation({plan:'expired'},'crm_basic_monthly',new Date('2026-01-31T12:00:00Z'));assert.equal(activated.crm_ends_at,'2026-02-28T12:00:00.000Z');assert.equal('plan' in activated,false);assert.equal('trial_ends_at' in activated,false);
 assert.throws(()=>plans.crmActivation(user(),'crm_pro_monthly'),/tier change/);assert.equal(plans.crmActivation(user(),'crm_basic_yearly').crm_ends_at,'2100-01-01T00:00:00.000Z');
});
test('concurrent manual and Facebook imports cannot exceed the stored-lead cap; replay survives expiry',async()=>{
 const db=new DB(),email=user().email;db.map.set('users/'+email,user());db.map.set('crm_usage/'+email,{leads:499});
 const input={name:'Demo',email:'demo@example.invalid'};
 const results=await Promise.allSettled([leadApi.saveLead(db,email,input),leadApi.saveLead(db,email,input,'123')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.map.get('crm_usage/'+email).leads,500);assert.equal([...db.map.keys()].filter(k=>k.startsWith('crm_leads/')).length,1);
 const fresh=new DB();fresh.map.set('users/'+email,user());const a=await leadApi.saveLead(fresh,email,input,'999');fresh.map.set('users/'+email,{...user(),crm_ends_at:'2000-01-01'});assert.equal((await leadApi.saveLead(fresh,email,input,'999')).id,a.id);await assert.rejects(()=>leadApi.saveLead(fresh,email,input),/ended/);
});
test('existing lead counts bootstrap before quota; settings reject extra fields/templates but preserve existing data after downgrade',async()=>{
 const db=new DB(),email=user().email;db.map.set('users/'+email,user());for(let n=0;n<500;n++)db.map.set('crm_leads/old'+n,{userId:email});await assert.rejects(()=>leadApi.saveLead(db,email,{name:'Extra',email:'x@example.invalid'}),/500/);
 const headers={'next/headers':{cookies:async()=>({get:()=>({value:'session'})})},'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'@/lib/auth':{COOKIE_NAME:'test',verifySession:async()=>({sub:email})},'@/lib/db':{getDb:()=>db,findUser:async()=>user()},'@/lib/crm-plans':plans,'@/lib/crm-settings':load('lib/crm-settings.ts')};
 const route=load('app/api/crm/settings/route.ts',headers);const fields=Array.from({length:4},(_,i)=>({id:'field_'+i,label:'Field '+i,type:'text'}));
 let response=await route.PUT({json:async()=>({fields})});assert.equal(response.status,402);
 db.map.set('crm_settings/'+email,{fields});response=await route.PUT({json:async()=>({fields})});assert.equal(response.status,200);assert.equal(db.map.get('crm_settings/'+email).fields.length,4);
 const templates=Array.from({length:4},(_,i)=>({id:'template_'+i,name:'Draft',subject:'Hello',body:'Draft only'}));response=await route.PUT({json:async()=>({fields,emailTemplates:templates})});assert.equal(response.status,402);
});
test('Page quota is enforced transactionally and another workspace cannot overwrite ownership',async()=>{
 process.env.AUTH_SECRET='test';const credential=load('lib/credential-crypto.ts'),api=load('lib/facebook-lead-onboarding.ts',{'./crm-plans':plans,'./credential-crypto':credential});const db=new DB(),email=user().email;db.map.set('users/'+email,user());
 const fetcher=async()=>({ok:true,json:async()=>({success:true})});const page=id=>({id,name:'Demo',encryptedToken:credential.encryptCredential('token')});
 const results=await Promise.allSettled(['1','2'].map(id=>api.connectFacebookPage(db,email,page(id),fetcher)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const first=[...db.map].find(([k])=>k.startsWith('crm_facebook_pages/'));await assert.rejects(()=>api.connectFacebookPage(db,'other@example.com',page(first[0].split('/')[1]),fetcher),/workspace_conflict/);
});
const tickets=load('lib/support-tickets.ts',{'./crm-plans':plans});
test('ticket ownership, reply roles, resolution and reopen are server-controlled; expired customers can request help',async()=>{
 const db=new DB(),u={...user(),crm_ends_at:'2000-01-01'};const t=await tickets.createSupportTicket(db,u,{subject:'Demo issue',message:'This is a demo test ticket.',category:'CRM',priority:'high',userId:'attacker'});assert.equal(t.userId,u.email);assert.equal(t.priority,'normal');
 assert.equal(await tickets.updateSupportTicket(db,t.id,'other@example.com',false,{message:'steal'}),null);
 let r=await tickets.updateSupportTicket(db,t.id,u.email,false,{message:'Customer reply',author:'support'});assert.equal(r.messages[1].author,'customer');r=await tickets.updateSupportTicket(db,t.id,'admin@example.com',true,{message:'Support reply'});assert.equal(r.status,'waiting_customer');assert.equal(r.messages[2].author,'support');
 r=await tickets.updateSupportTicket(db,t.id,u.email,false,{status:'resolved'});assert.equal(r.status,'resolved');r=await tickets.updateSupportTicket(db,t.id,u.email,false,{status:'open'});assert.equal(r.status,'open');
 await assert.rejects(()=>tickets.updateSupportTicket(db,t.id,u.email,false,{status:'waiting_customer'}));
});
test('concurrent tickets respect the 10-open-ticket limit',async()=>{
 const db=new DB(),u=user('pro');for(let i=0;i<9;i++)db.map.set('support_tickets/old'+i,{userId:u.email,status:'open'});const results=await Promise.allSettled([1,2].map(()=>tickets.createSupportTicket(db,u,{subject:'Demo issue',message:'This is a concurrency test.',category:'General'})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal([...db.map.keys()].filter(k=>k.startsWith('support_tickets/')).length,10);
});
test('verified CRM payment activation changes only CRM and is idempotent for payment replay',async()=>{
 const db=new DB(),u=user();db.map.set('users/'+u.email,{...u,crm_status:'trial',crm_ends_at:undefined,trial_ends_at:'2000-01-01'});
 db.map.set('razorpay_orders/order1',{id:'order1',userId:u.email,planId:'crm_pro_yearly',months:12,status:'created'});
 const api=load('lib/razorpay-payments.ts',{'./crm-plans':plans});const a=await api.activateRazorpayOrder(db,'order1','payment1','webhook'),b=await api.activateRazorpayOrder(db,'order1','payment1','webhook');assert.equal(b.alreadyPaid,true);assert.equal(a.validUntil,b.validUntil);assert.equal(db.map.get('users/'+u.email).crm_tier,'pro');assert.equal(db.map.get('users/'+u.email).plan,'expired');assert.equal(db.map.get('users/'+u.email).trial_ends_at,'2000-01-01');
});
test('manual UPI purchase is pending until admin approval and CRM renewal never extends API access',async()=>{
 const db=new DB(),u={...user(),crm_status:'trial',crm_ends_at:undefined,trial_ends_at:'2000-01-01'};db.map.set('users/'+u.email,u);
 const api=load('lib/orders.ts',{'./crm-plans':plans});const order=await api.createOrder(db,{userId:u.email,userName:'Demo',planId:'crm_advance_yearly',planName:'CRM Advance · Yearly',amount:3999,months:12,reference:'TESTUTR123456',payerNote:'Synthetic test only'});
 assert.equal(order.status,'pending');assert.equal(db.map.get('users/'+u.email).crm_status,'trial');
 await assert.rejects(()=>api.createOrder(db,{...order,reference:'TESTUTR123456'}),/reference_already_used/);
 const result=await api.approveOrderAndExtend(db,order.id,'admin@example.com');assert.equal(result.order.status,'approved');const account=db.map.get('users/'+u.email);assert.equal(account.crm_tier,'advance');assert.equal(account.crm_status,'active');assert.equal(account.plan,'expired');assert.equal(account.trial_ends_at,'2000-01-01');await assert.rejects(()=>api.approveOrderAndExtend(db,order.id,'admin@example.com'),/already_decided/);
});
test('support endpoint refuses unauthenticated callers and lists only the signed-in customer tickets',async()=>{
 const db=new DB(),u=user();db.map.set('support_tickets/own',{id:'own',userId:u.email,updatedAt:'2026-10-30'});db.map.set('support_tickets/foreign',{id:'foreign',userId:'another@example.com',updatedAt:'2026-10-30'});
 let session={sub:u.email};const route=load('app/api/support/tickets/route.ts',{
 'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'next/headers':{cookies:async()=>({get:()=>({value:'test'})})},'@/lib/auth':{COOKIE_NAME:'test',verifySession:async()=>session},'@/lib/db':{getDb:()=>db,findUser:async()=>u},'@/lib/rate-limit':{consumeRateLimit:async()=>({allowed:true})},'@/lib/support-tickets':tickets});
 let r=await route.GET();assert.deepEqual(r.body.tickets.map(t=>t.id),['own']);session=null;r=await route.GET();assert.equal(r.status,401);
});
