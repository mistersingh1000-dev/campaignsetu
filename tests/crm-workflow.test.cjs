const test=require("node:test");
const assert=require("node:assert/strict");
const {load,DB}=require("./test-helpers.cjs");
const plans=load("lib/crm-plans.ts");
const settings=load("lib/crm-settings.ts");
const crm=load("lib/crm-db.ts",{"./crm-plans":plans,"./crm-settings":settings});
const origin="https://campaignsetu.vercel.app";
const validUser=email=>({email,plan:"free",crm_status:undefined,crm_tier:undefined});
function setup(){
 const db=new DB(),owner="owner@example.com",other="other@example.com";
 db.map.set("users/"+owner,validUser(owner));db.map.set("users/"+other,validUser(other));
 // Firestore-like lead query with ordering and cursor; other collections retain the shared mock.
 const original=db.collection.bind(db);
 db.collection=(name)=>{
  const base=original(name);
  if(name!=="crm_leads")return base;
  const query=(filter=null,after=null,max=Infinity)=>({
   where:(key,operator,value)=>query([key,operator,value],after,max),
   orderBy:()=>query(filter,after,max),
   limit:n=>query(filter,after,n),
   startAfter:id=>query(filter,id,max),
   count:()=>({get:async()=>({data:()=>({count:[...db.map].filter(([k,v])=>k.startsWith("crm_leads/")&&(!filter||v[filter[0]]===filter[2])).length})})}),
   get:async()=>{
    const matches=[...db.map].filter(([k,v])=>k.startsWith("crm_leads/")&&(!filter||v[filter[0]]===filter[2]))
      .sort((a,b)=>a[0].localeCompare(b[0])).filter(([k])=>!after||k.split("/")[1]>after).slice(0,max);
    return {docs:matches.map(([k])=>db.snap(k)),size:matches.length,empty:matches.length===0};
   }
  });
  return {...base,where:(key,operator,value)=>query([key,operator,value])};
 };
 const state={user:owner};
 const dependencies={
  "next/server":{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},
  "next/headers":{cookies:async()=>({get:()=>({value:"mock-cookie"})})},
  "@/lib/auth":{COOKIE_NAME:"session",verifySession:async()=>state.user?{sub:state.user}:null},
  "@/lib/db":{getDb:()=>db,findUser:async(_,email)=>db.map.get("users/"+email)||null},
  "@/lib/crm-plans":plans,
  "@/lib/crm-settings":settings,
  "@/lib/crm-db":crm
 };
 return {db,owner,other,state,
  leads:load("app/api/crm/leads/route.ts",dependencies),
  settings:load("app/api/crm/settings/route.ts",dependencies),
  subscription:load("app/api/crm/subscription/route.ts",dependencies)};
}
function req(path,method,data,requestOrigin=origin){
 return new Request(origin+path,{method,headers:{"content-type":"application/json",...(requestOrigin?{origin:requestOrigin}:{})},body:data===undefined?undefined:JSON.stringify(data)});
}
test("CampaignSetu lead workflow: add, list, edit pipeline, schedule, mark follow-up, and tenant isolation",async()=>{
 const {db,owner,other,state,leads}=setup();
 const due="2030-06-01T09:30:00.000Z";
 const created=await leads.POST(req("/api/crm/leads","POST",{name:"Demo enquiry",phone:"+919876543210",followUpAt:due,notes:"Needs website",source:"Manual"}));
 assert.equal(created.status,201);assert.equal(created.body.lead.stage,"New");
 assert.equal(created.body.lead.userId,owner);
 const id=created.body.lead.id;
 const fetched=await leads.GET(req("/api/crm/leads","GET"));
 assert.equal(fetched.status,200);assert.deepEqual(fetched.body.leads.map(l=>l.id),[id]);
 assert.equal(fetched.body.next,null);
 const changed=await leads.PATCH(req("/api/crm/leads","PATCH",{...created.body.lead,stage:"Qualified",followUpAt:due,followUpDone:true,notes:"Call completed, quote requested",value:12000}));
 assert.equal(changed.status,200);assert.equal(changed.body.lead.stage,"Qualified");
 assert.equal(changed.body.lead.followUpDone,true);
 assert.equal(changed.body.lead.value,12000);
 assert.ok(changed.body.lead.activity.some(x=>x.text.includes("stage")&&x.text.includes("followUpDone")));
 state.user=other;
 const outsiders=await leads.GET(req("/api/crm/leads","GET"));assert.deepEqual(outsiders.body.leads,[]);
 const attempted=await leads.PATCH(req("/api/crm/leads","PATCH",{...changed.body.lead,stage:"Won"}));
 assert.equal(attempted.status,404);
 assert.equal(db.map.get("crm_leads/"+id).stage,"Qualified");
 state.user=null;
 assert.equal((await leads.GET(req("/api/crm/leads","GET"))).status,401);
 assert.equal((await leads.POST(req("/api/crm/leads","POST",{name:"No session"}))).status,401);
});
test("CRM settings: default configuration, custom stage and fields, persistence and protected history",async()=>{
 const {db,owner,other,state,settings:api,leads,subscription}=setup();
 const defaults=await api.GET();assert.equal(defaults.status,200);
 assert.ok(defaults.body.settings.sources.includes("Manual"));
 const configured={...settings.defaultSettings,fields:[{id:"budget",label:"Expected budget",type:"number",options:[]}],
  pipeline:[...settings.defaultPipeline,{id:"Demo",label:"Demo booked",color:"#123456",outcome:"open"}],
  emailTemplates:[{id:"intro",name:"Hello",subject:"Hello {{name}}",body:"Thank you for your enquiry"}]};
 const saved=await api.PUT(req("/api/crm/settings","PUT",configured));
 assert.equal(saved.status,200);
 const read=await api.GET();assert.equal(read.body.settings.fields[0].id,"budget");
 const lead=await leads.POST(req("/api/crm/leads","POST",{name:"Custom funnel",email:"custom@example.com",stage:"Demo",customValues:{budget:9000}}));
 assert.equal(lead.status,201);assert.equal(lead.body.lead.stage,"Demo");
 assert.equal(lead.body.lead.customValues.budget,9000);
 const denyRemoval=await api.PUT(req("/api/crm/settings","PUT",{...configured,fields:[]}));
 assert.equal(denyRemoval.status,400);
 assert.equal((await api.GET()).body.settings.fields.length,1);
 const usage=await subscription.GET();assert.equal(usage.status,200);
 assert.equal(usage.body.usage.leads,1);assert.equal(usage.body.usage.fields,1);
 state.user=other;assert.equal((await api.GET()).body.settings.fields.length,0);
 state.user=owner;
 db.map.set("users/"+owner,{email:owner,plan:"expired"});
 assert.equal((await api.GET()).status,200);
 assert.equal((await leads.GET(req("/api/crm/leads","GET"))).status,200);
 assert.equal((await leads.POST(req("/api/crm/leads","POST",{name:"Blocked",email:"blocked@example.com"}))).status,403);
 assert.equal((await api.PUT(req("/api/crm/settings","PUT",configured))).status,403);
});
test("CRM writes reject cross-origin requests and preserve imported WhatsApp provenance",async()=>{
 const {db,owner,leads,settings:api}=setup();
 assert.equal((await leads.POST(req("/api/crm/leads","POST",{name:"Forgery",email:"x@example.com"},"https://attacker.invalid"))).status,403);
 assert.equal((await api.PUT(req("/api/crm/settings","PUT",settings.defaultSettings,"https://attacker.invalid"))).status,403);
 const imported=await crm.saveWhatsAppLead(db,owner,{phone:"919999999999",name:"Nitin",firstMessage:"Need price"});
 const tampered=await leads.PATCH(req("/api/crm/leads","PATCH",{...imported,source:"Manual",stage:"Contacted"}));
 assert.equal(tampered.status,200);assert.equal(tampered.body.lead.source,"WhatsApp");
 assert.equal(tampered.body.lead.stage,"Contacted");
 assert.equal((await leads.PATCH(req("/api/crm/leads","PATCH",{...imported,id:imported.id,stage:"Won"},"https://attacker.invalid"))).status,403);
 assert.equal(db.map.get("crm_leads/"+imported.id).stage,"Contacted");
});
