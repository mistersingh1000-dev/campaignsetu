const test=require("node:test"),assert=require("node:assert/strict");
const {load,DB}=require("./test-helpers.cjs");
function fixture(){
 const db=new DB(),email="owner@example.com",state={email};
 const dependencies={
  "next/server":{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},
  "next/headers":{cookies:async()=>({get:()=>({value:"test"})})},
  "@/lib/auth":{COOKIE_NAME:"session",verifySession:async()=>state.email?{sub:state.email}:null},
  "@/lib/db":{getDb:()=>db,findUser:async(_,id)=>db.map.get("users/"+id)||null},
  "@/lib/whatsapp-auth":{whatsappApiToken:()=> "test-token-not-real"}
 };
 const route=load("app/api/whatsapp/connection-health/route.ts",dependencies);
 return {db,state,email,route};
}
test("unauthenticated and disconnected workspace returns safe diagnostic without contacting Meta",async()=>{
 const {db,state,email,route}=fixture();
 state.email=null;assert.equal((await route.GET()).status,401);
 state.email=email;db.map.set("users/"+email,{email,wa_registered:false});
 const r=await route.GET();assert.equal(r.status,200);assert.equal(r.body.connected,false);
 assert.equal(r.body.phone,"not_connected");assert.equal(r.body.routing,"not_checked");
});
test("read-only Graph checks verify phone, unique inbox routing and WABA subscription without claiming delivery",async()=>{
 const {db,email,route}=fixture(),original=global.fetch,app=process.env.NEXT_PUBLIC_META_APP_ID;
 const requested=[];
 process.env.NEXT_PUBLIC_META_APP_ID="123";
 db.map.set("users/"+email,{email,phone_number_id:"456",waba_id:"789",wa_registered:true,wa_coexistence:true});
 global.fetch=async(url,options)=>{
  requested.push({url,method:options?.method||"GET",auth:options?.headers?.Authorization});
  return new Response(JSON.stringify(String(url).includes("subscribed_apps")?{data:[{id:"123"}]}:{id:"456",display_phone_number:"+1 555 000 1234"}),{status:200});
 };
 try {
  const r=await route.GET();assert.equal(r.status,200);
  assert.equal(r.body.connected,true);assert.equal(r.body.phone,"confirmed");
  assert.equal(r.body.routing,"unique");assert.equal(r.body.webhookApp,"confirmed");
  assert.equal(r.body.coexistence,true);
  assert.equal(r.body.inboxDelivery,"requires_real_message_test");
  assert.equal(r.body.mobileEcho,"requires_real_message_test");
  assert.equal(requested.length,2);assert.ok(requested.every(x=>x.method==="GET"));
  assert.ok(!JSON.stringify(r.body).includes("test-token-not-real"));
  assert.ok(!JSON.stringify(r.body).includes("15550001234"));
 }finally{global.fetch=original;if(app===undefined)delete process.env.NEXT_PUBLIC_META_APP_ID;else process.env.NEXT_PUBLIC_META_APP_ID=app;}
});
test("ambiguous phone owner fails routing check without exposing another user",async()=>{
 const {db,email,route}=fixture(),original=global.fetch;
 db.map.set("users/"+email,{email,phone_number_id:"456",waba_id:"789",wa_registered:true});
 db.map.set("users/other@example.com",{email:"other@example.com",phone_number_id:"456",wa_registered:true});
 global.fetch=async()=>new Response(JSON.stringify({error:{message:"Denied"}}),{status:403});
 try{
  const r=await route.GET();
  assert.equal(r.body.routing,"ambiguous");
  assert.equal(r.body.phone,"unavailable");
  assert.equal(r.body.webhookApp,"unavailable");
  assert.ok(r.body.steps.some(s=>s.includes("not uniquely routed")));
 }finally{global.fetch=original;}
});
