const test=require("node:test");
const assert=require("node:assert/strict");
const {load}=require("./test-helpers.cjs");
function setup(options={}) {
 const saved=[]; let rate={allowed:true,remaining:4,retryAfterSeconds:0},email=null;
 const db={collection:name=>({add:async value=>{saved.push({name,value});return {id:"enquiry-1"};}})};
 const route=load("app/api/contact/route.ts",{
  "next/server":{NextResponse:{json:(body,init)=>({body,status:init?.status||200,headers:init?.headers||{}})}},
  "@/lib/db":{getDb:()=>options.noDb?null:db},
  "@/lib/email":{sendEmail:async value=>{email=value;return {ok:true};},escapeHtml:value=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},
  "@/lib/site":{site:{email:"owner@example.com",domain:"https://lasmediaagency.online"}},
  "@/lib/rate-limit":{consumeRateLimit:async()=>rate,requestIp:req=>req.headers.get("x-forwarded-for")||"unknown"}
 });
 return {route,saved,getEmail:()=>email,setRate:value=>rate=value};
}
function request(body,headers={}) {
 return new Request("https://lasmediaagency.online/api/contact",{method:"POST",headers:{"content-type":"application/json",...headers},body:typeof body==="string"?body:JSON.stringify(body)});
}
test("public contact saves validated enquiries and safely escapes notification content",async()=>{
 const {route,saved,getEmail}=setup();
 const res=await route.POST(request({name:"<script>alert(1)</script>",email:"buyer@example.com",message:"Need a demo",intent:"sales"}));
 assert.equal(res.status,201);assert.equal(saved.length,1);assert.equal(saved[0].name,"enquiries");
 assert.equal(saved[0].value.status,"new");assert.equal(saved[0].value.intent,"sales");
 assert.match(getEmail().html,/&lt;script&gt;/);assert.doesNotMatch(getEmail().html,/<script>/);
});
test("public contact rejects invalid and oversized fields before storing",async()=>{
 const {route,saved}=setup();
 assert.equal((await route.POST(request({name:"",email:"buyer@example.com"}))).status,400);
 assert.equal((await route.POST(request({name:"A".repeat(121),email:"buyer@example.com"}))).status,400);
 assert.equal((await route.POST(request({name:"Buyer",email:"bad"}))).status,400);
 assert.equal((await route.POST(request({name:"Buyer",email:"buyer@example.com",message:"x".repeat(4001)}))).status,400);
 assert.equal((await route.POST(request({name:"Buyer",email:"buyer@example.com",message:"x".repeat(17000)}))).status,413);
 assert.equal((await route.POST(request("{invalid json"))).status,400);
 assert.equal(saved.length,0);
});
test("public contact rate limit blocks repeat submissions and reports retry time",async()=>{
 const {route,saved,setRate}=setup();setRate({allowed:false,remaining:0,retryAfterSeconds:900});
 const res=await route.POST(request({name:"Buyer",email:"buyer@example.com"},{ "x-forwarded-for":"203.0.113.10"}));
 assert.equal(res.status,429);assert.equal(res.headers["Retry-After"],900);assert.equal(saved.length,0);
});
test("public contact reports database outage rather than a false success",async()=>{
 const {route}=setup({noDb:true});const res=await route.POST(request({name:"Buyer",email:"buyer@example.com"}));
 assert.equal(res.status,503);assert.equal(res.body.error,"unavailable");
});
