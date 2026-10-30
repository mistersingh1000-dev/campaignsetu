const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./test-helpers.cjs');
test('admin CRM grants await Next async params, preserve API access, reject mixed payloads and non-admins',async()=>{
 let admin={sub:'admin@example.com'},writes=[];
 const route=load('app/api/admin/users/[email]/route.ts',{'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'@/lib/admin-auth':{getAdminSession:async()=>admin},'@/lib/db':{getDb:()=>({}),updateUser:async(_,email,updates)=>{writes.push({email,updates});return {email,...updates,password_hash:'hidden',wa_token:'secret',wa_registration_pin:'pin'};}},'@/lib/crm-plans':load('lib/crm-plans.ts')});
 const req=body=>new Request('https://app.test/api/admin/users/customer%40example.com',{method:'PATCH',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify(body)}),ctx={params:Promise.resolve({email:'customer@example.com'})};
 let r=await route.PATCH(req({crm_plan_id:'crm_pro_yearly'}),ctx);assert.equal(r.status,200);assert.equal(writes[0].email,'customer@example.com');assert.equal(writes[0].updates.crm_tier,'pro');assert.equal(writes[0].updates.plan,undefined);assert.equal(r.body.user.password_hash,undefined);assert.equal(r.body.user.wa_token,undefined);
 r=await route.PATCH(req({crm_plan_id:'crm_basic_monthly',plan:'paid'}),ctx);assert.equal(r.status,400);assert.equal(writes.length,1);
 r=await route.PATCH(req({crm_plan_id:'crm_missing_monthly'}),ctx);assert.equal(r.status,400);
 admin=null;r=await route.PATCH(req({crm_plan_id:'crm_pro_yearly'}),ctx);assert.equal(r.status,403);assert.equal(writes.length,1);
});
