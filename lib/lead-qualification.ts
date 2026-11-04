/** Deterministic, non-sending lead-form triage. Not an AI diagnosis or payment confirmation. */
export type FormAssessment = {
 score:number; priority:"Hot"|"Warm"|"Cold"; intent:"purchase"|"callback"|"appointment"|"pricing"|"information"|"opt_out";
 nextAction:string; replyDraft:string; reasons:string[]; answers:Record<string,string>;
};
const identity=/^(full_name|first_name|last_name|phone_number|phone|mobile_number|email|email_address|postal_code|zip_code)$/i;
export function assessLeadForm(raw:Record<string,unknown>,name="Customer"):FormAssessment {
 const entries=Object.entries(raw||{}).filter(([k,v])=>!identity.test(k.replace(/[^a-z0-9]+/gi,"_"))&&typeof v==="string"&&v.trim()).slice(0,5).map(([k,v])=>[k.slice(0,90),String(v).trim().slice(0,240)] as const);
 const answers=Object.fromEntries(entries);
 const content=entries.map(([k,v])=>k.replace(/[_-]/g," ")+": "+v).join(" ").toLowerCase();
 const stop=/\b(stop|unsubscribe|not interested|no thanks|do not contact|wrong number)\b|नहीं चाहिए|मत भेज/iu.test(content);
 const buy=!stop&&/\b(buy|purchase|ready to pay|book now|confirm order|want to buy)\b|खरीदना|लेना है|payment karna/iu.test(content);
 const call=!stop&&/\b(call me|call back|callback|phone call|please call)\b|कॉल करो|फोन करो/iu.test(content);
 const appointment=!stop&&/\b(appointment|meeting|consultation|schedule a visit|book a demo)\b|मिलना है|अपॉइंटमेंट/iu.test(content);
 const price=!stop&&/\b(price|pricing|cost|budget|quotation|quote|fees|charges|package|plan)\b|₹|कीमत|कितना|बजट/iu.test(content);
 const urgent=!stop&&/\b(urgent|asap|today|tomorrow|immediately|within a week)\b|जल्दी|आज|अभी/iu.test(content);
 const score=stop?0:Math.min(100,15+7*entries.length+(buy?32:0)+(call?18:0)+(appointment?12:0)+(price?9:0)+(urgent?15:0));
 const priority:FormAssessment["priority"]=score>=70?"Hot":score>=40?"Warm":"Cold";
 const intent:FormAssessment["intent"]=stop?"opt_out":buy?"purchase":call?"callback":appointment?"appointment":price?"pricing":"information";
 const nextAction=stop?"Respect opt-out — do not contact":buy?"Call to confirm selected plan, terms and payment":call?"Call customer and confirm a convenient time":appointment?"Confirm appointment and availability":price?"Send a verified quotation after confirming requirements":"Qualify requirements and schedule follow-up";
 const first=String(name||"Customer").split(/\s+/)[0].slice(0,50);
 const replyDraft=stop?"":buy?("Hi "+first+", thanks for your interest. Our team will confirm the plan and payment details."):call?("Hi "+first+", what time is convenient for a callback?"):appointment?("Hi "+first+", please share your preferred appointment time."):price?("Hi "+first+", please share your exact requirements so we can confirm the correct price."):("Hi "+first+", thanks for your enquiry. Please tell us what you need.");
 const reasons=[entries.length+" form answer(s)",...(buy?["Buying intent"]:[]),...(call?["Callback requested"]:[]),...(urgent?["Time-sensitive"]:[]),...(price?["Price enquiry"]:[]),...(stop?["Opt-out"]:[])];
 return {score,priority,intent,nextAction,replyDraft,reasons,answers};
}
