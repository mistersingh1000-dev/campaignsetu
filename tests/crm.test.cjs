const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const compiled=ts.transpileModule(fs.readFileSync("lib/crm-db.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const settingsCode=ts.transpileModule(fs.readFileSync("lib/crm-settings.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const settingsModule={exports:{}};new Function("exports","require","module",settingsCode)(settingsModule.exports,require,settingsModule);
const m={exports:{}};new Function("exports","require","module",compiled)(m.exports,n=>n==="./crm-settings"?settingsModule.exports:n==="./crm-plans"?require("./test-helpers.cjs").load("lib/crm-plans.ts"):require(n),m);
const {cleanLead,saveLead}=m.exports;
test("lead validation rejects invalid contact, stage, dates and values",()=>{
 for(const input of [
 {name:"A"}, {name:"A",phone:"12"}, {name:"A",email:"bad"},
 {name:"A",email:"a@example.com",stage:"Other"}, {name:"A",email:"a@example.com",followUpAt:"bad"},
 {name:"A",email:"a@example.com",value:-1}
 ])assert.throws(()=>cleanLead(input));
 assert.equal(cleanLead({name:" A ",phone:"+91 7009732517"}).phone,"+917009732517");
 assert.equal(cleanLead({name:"Lead"},false).name,"Lead");
});
test("replayed Facebook leads deduplicate within a workspace without overwriting edits",async()=>{
 const db=new (require("./test-helpers.cjs").DB)();const map=db.map;
 for(const email of ["one@example.com","two@example.com"])map.set("users/"+email,{plan:"free",email});
 const input={name:"Customer",email:"customer@example.com"};
 const [a,b]=await Promise.all([saveLead(db,"one@example.com",input,"123"),saveLead(db,"one@example.com",input,"123")]);
 assert.equal(a.id,b.id);assert.equal([...map.keys()].filter(k=>k.startsWith("crm_leads/")).length,1);
 map.set("crm_leads/"+a.id,{...a,stage:"Won",notes:"Do not overwrite"});
 const replay=await saveLead(db,"one@example.com",input,"123");assert.equal(replay.stage,"Won");
 const other=await saveLead(db,"two@example.com",input,"123");
 assert.notEqual(a.id,other.id);assert.equal([...map.keys()].filter(k=>k.startsWith("crm_leads/")).length,2);
});

test("Facebook webhook rejects unsigned requests before accessing the database", async()=>{
 const source=fs.readFileSync("app/api/webhooks/facebook-leads/route.ts","utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};
 const json=(body,init)=>({body,status:init?.status||200});
 const deps={
  "next/server":{NextResponse:{json}},
  "@/lib/db":{getDb:()=>{throw Error("Must not access database");}},
  "@/lib/credential-crypto":{decryptCredential:()=>{throw Error("Must not decrypt");}},
  "@/lib/crm-db":{saveLead:()=>{throw Error("Must not save");}},
 };
 new Function("exports","require","module",compiled)(module.exports,n=>deps[n]||require(n),module);
 const old=process.env.META_APP_SECRET;process.env.META_APP_SECRET="test-only-secret";
 try {
  for(const signature of [null,"sha256=wrong",""]) {
   const response=await module.exports.POST({text:async()=>'{"object":"page"}',headers:{get:()=>signature}});
   assert.equal(response.status,401);
  }
 }finally {if(old===undefined)delete process.env.META_APP_SECRET;else process.env.META_APP_SECRET=old;}
});

test("custom field validation strips unknown keys and rejects invalid values",()=>{
 const {cleanCustomValues,cleanSettings}=settingsModule.exports;
 const settings=cleanSettings({tags:["Hot","Hot"],sources:["Event"],fields:[{id:"budget",label:"Budget",type:"number"},{id:"service",label:"Service",type:"select",options:["Ads","Website"]},{id:"consent",label:"Consent",type:"boolean"}]});
 assert.deepEqual(settings.tags,["Hot"]);assert.ok(settings.sources.includes("Manual"));
 assert.deepEqual(cleanCustomValues({budget:"5000",service:"Ads",untrusted:"drop"},settings.fields),{budget:5000,service:"Ads"});
 assert.throws(()=>cleanCustomValues({budget:"invalid"},settings.fields));
 assert.throws(()=>cleanCustomValues({service:"Unknown"},settings.fields));
 assert.throws(()=>cleanCustomValues({consent:"true"},settings.fields));
 assert.throws(()=>cleanSettings({fields:[{id:"bad/key",label:"Bad",type:"text"}]}));
 const lead=cleanLead({name:"Lead",email:"a@example.com",tags:[" Hot ","Hot"],rowColor:"red",followUpDone:true});
 assert.deepEqual(lead.tags,["Hot"]);assert.equal(lead.rowColor,"");assert.equal(lead.followUpDone,true);
});

test("custom pipeline labels keep stable IDs and validate lead transitions",()=>{
 const {cleanSettings,getPipeline}=settingsModule.exports;
 const config=cleanSettings({pipeline:[...getPipeline({sources:[],tags:[],fields:[]}).map(p=>p.id==="New"?{...p,label:"Fresh enquiry"}:p),{id:"Demo",label:"Demo booked",color:"#123456",outcome:"open"}]});
 assert.equal(getPipeline(config)[0].id,"New");
 assert.equal(getPipeline(config)[0].label,"Fresh enquiry");
 assert.equal(cleanLead({name:"A",email:"a@example.com",stage:"Demo"},true,config).stage,"Demo");
 assert.throws(()=>cleanLead({name:"A",email:"a@example.com",stage:"Missing"},true,config));
 assert.throws(()=>cleanSettings({pipeline:[{id:"New",label:"New",color:"#ffffff",outcome:"open"}]}));
});
test("email templates personalize plain text and reject header injection",()=>{
 const {cleanSettings,renderEmailTemplate}=settingsModule.exports;
 const template={id:"intro",name:"Intro",subject:"Hello {{name}}",body:"Phone {{phone}} / {{email}}"};
 const config=cleanSettings({emailTemplates:[template]});
 assert.equal(config.emailTemplates.length,1);
 assert.deepEqual(renderEmailTemplate(template,{name:"Manpreet",phone:"123",email:"a@example.com"}),{subject:"Hello Manpreet",body:"Phone 123 / a@example.com"});
 assert.throws(()=>cleanSettings({emailTemplates:[{...template,subject:"Hello\r\nBcc: someone@example.com"}]}));
});
