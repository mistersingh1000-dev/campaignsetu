import type { Firestore } from "firebase-admin/firestore";
import { crmAccess } from "./crm-plans";
export const ticketStatuses=["open","waiting_customer","resolved"] as const;
export function cleanTicket(input:any){
 const subject=String(input?.subject||"").trim(),message=String(input?.message||"").trim();
 const category=String(input?.category||"General");
 if(subject.length<4||subject.length>120||message.length<10||message.length>5000||!["General","Billing","CRM","Facebook connection","WhatsApp connection","Technical issue"].includes(category))throw Error("Use a 4–120 character subject and 10–5000 character description.");
 return {subject,message,category};
}
export async function createSupportTicket(db:Firestore,user:any,input:any){
 const clean=cleanTicket(input),ref=db.collection("support_tickets").doc(),now=new Date().toISOString();
 const ticket={id:ref.id,userId:user.email,subject:clean.subject,category:clean.category,status:"open",priority:crmAccess(user).active&&crmAccess(user).tier==="pro"?"high":"normal",createdAt:now,updatedAt:now,messages:[{author:"customer",text:clean.message,at:now}]};
 await db.runTransaction(async tx=>{
  const current=await tx.get(db.collection("support_tickets").where("userId","==",user.email));
  if(current.docs.filter(d=>d.data().status!=="resolved").length>=10)throw Error("You already have 10 open tickets. Continue an existing ticket or resolve one first.");
  tx.create(ref,ticket);
 });return ticket;
}
export async function updateSupportTicket(db:Firestore,id:string,email:string,isAdmin:boolean,input:any){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw Error("Invalid ticket.");
 const text=typeof input.message==="string"?input.message.trim():"",status=input.status;
 if(text.length>5000||(!text&&!status))throw Error("Enter a reply up to 5000 characters or choose a status.");
 if(status&&!ticketStatuses.includes(status))throw Error("Invalid status.");
 if(!isAdmin&&status&&!["open","resolved"].includes(status))throw Error("Invalid customer action.");
 const ref=db.collection("support_tickets").doc(id);
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),ticket=snap.data();
  if(!snap.exists||(!isAdmin&&ticket?.userId!==email))return null;
  const messages=ticket!.messages||[];if(text&&messages.length>=100)throw Error("This ticket has reached 100 replies. Raise a new ticket and reference this ID.");
  const now=new Date().toISOString(),patch={updatedAt:now,status:status||(text?(isAdmin?"waiting_customer":"open"):ticket!.status),messages:text?[...messages,{author:isAdmin?"support":"customer",text,at:now}]:messages};
  tx.update(ref,patch);return {...ticket,...patch};
 });
}
