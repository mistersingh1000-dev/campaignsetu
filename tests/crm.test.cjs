const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const compiled=ts.transpileModule(fs.readFileSync("lib/crm-db.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};new Function("exports","require","module",compiled)(m.exports,require,m);
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
 const map=new Map();let serial=Promise.resolve();let n=0;
 const db={collection:()=>({doc:(id)=>({id:id||String(++n)})}),runTransaction:(fn)=>{
  const p=serial.then(async()=>{
   const writes=[];const value=await fn({get:async r=>({exists:map.has(r.id),data:()=>map.get(r.id)}),create:(r,v)=>writes.push(()=>map.set(r.id,v))});
   writes.forEach(f=>f());return value;
  });serial=p.catch(()=>{});return p;
 }};
 const input={name:"Customer",email:"customer@example.com"};
 const [a,b]=await Promise.all([saveLead(db,"one@example.com",input,"123"),saveLead(db,"one@example.com",input,"123")]);
 assert.equal(a.id,b.id);assert.equal(map.size,1);
 map.set(a.id,{...a,stage:"Won",notes:"Do not overwrite"});
 const replay=await saveLead(db,"one@example.com",input,"123");assert.equal(replay.stage,"Won");
 const other=await saveLead(db,"two@example.com",input,"123");
 assert.notEqual(a.id,other.id);assert.equal(map.size,2);
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
