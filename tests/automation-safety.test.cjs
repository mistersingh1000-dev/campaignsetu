const test=require("node:test"),assert=require("node:assert/strict");
const {load,DB}=require("./test-helpers.cjs");
function setup(){
 const db=new DB(),sent=[],runs=[];
 const rule={id:"rule1",name:"Hello",triggerType:"keyword",keywords:["hello"],matchMode:"contains",priority:10,replyText:"Hi {{name}}",actionType:"reply_text",addTags:[]};
 const owner={email:"owner@example.com",phone_number_id:"123",plan:"free",wa_registered:true};
 const contact={id:"contact1",phone:"15550000000",name:"Guest",doNotMessage:false,tags:[]};
 const api=load("lib/automation-engine.ts",{
  "@/lib/chat-db":{addMessage:async(...args)=>{sent.push(args);},updateContactForUser:async()=>{}},
  "@/lib/entitlements":{accessState:()=>({active:true})},
  "@/lib/whatsapp-auth":{whatsappApiToken:()=>"test-placeholder"},
  "@/lib/automation-db":{listEnabledAutomationRules:async()=>[rule],markAutomationRun:async(_,r)=>{runs.push(r.id);}}
 });
 return {api,db,rule,owner,contact,sent,runs};
}
test("concurrent inbound messages reserve one automated-reply window",async()=>{
 const x=setup(),original=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,json:async()=>({messages:[{id:"test-wamid"}]})};};
 try{
  const inputs=Array.from({length:3},()=>x.api.runInboundAutomations({db:x.db,owner:x.owner,contact:x.contact,conversationId:"conversation-1",inboundText:"hello"}));
  const results=await Promise.all(inputs);
  assert.equal(results.filter(x=>x.sent===1).length,1);
  assert.equal(results.filter(x=>x.blocked==="cooldown").length,2);
  assert.equal(calls,1);assert.equal(x.sent.length,1);assert.equal(x.runs.length,1);
  const next=await x.api.runInboundAutomations({db:x.db,owner:x.owner,contact:x.contact,conversationId:"conversation-1",inboundText:"hello again"});
  assert.equal(next.blocked,"cooldown");assert.equal(calls,1);
 }finally{global.fetch=original;}
});
test("different workspaces/conversations cannot share throttling state; do-not-message prevents replies",async()=>{
 const x=setup(),original=global.fetch;
 let sends=0;global.fetch=async()=>{sends++;return {ok:true,json:async()=>({messages:[{id:"wamid." + sends}]})};};
 try {
  const invoke=(owner,conversationId,contact)=>x.api.runInboundAutomations({db:x.db,owner,contact,conversationId,inboundText:"hello"});
  assert.equal((await invoke(x.owner,"one",x.contact)).sent,1);
  assert.equal((await invoke(x.owner,"two",x.contact)).sent,1);
  assert.equal((await invoke({...x.owner,email:"another@example.com"},"one",x.contact)).sent,1);
  assert.equal((await invoke(x.owner,"three",{...x.contact,doNotMessage:true})).blocked,"do_not_message");
  assert.equal(sends,3);
 }finally{global.fetch=original;}
});
test("Meta send failures do not cause repeated outgoing messages during an uncertain window",async()=>{
 const x=setup(),original=global.fetch;
 let attempts=0;global.fetch=async()=>{attempts++;throw Error("network timeout");};
 try {
  const input={db:x.db,owner:x.owner,contact:x.contact,conversationId:"failure",inboundText:"hello"};
  await assert.rejects(()=>x.api.runInboundAutomations(input),/network timeout/);
  assert.equal((await x.api.runInboundAutomations(input)).blocked,"cooldown");
  assert.equal(attempts,1);
 }finally{global.fetch=original;}
});
