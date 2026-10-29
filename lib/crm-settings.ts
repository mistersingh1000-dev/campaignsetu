export type CustomField = { id:string; label:string; type:"text"|"textarea"|"number"|"date"|"boolean"|"select"; options:string[] };
export type PipelineStage = {id:string;label:string;color:string;outcome:"open"|"won"|"lost"};
export type EmailTemplate = {id:string;name:string;subject:string;body:string};
export type CrmSettings = { sources:string[]; tags:string[]; fields:CustomField[]; pipeline?:PipelineStage[]; emailTemplates?:EmailTemplate[] };
export const defaultPipeline:PipelineStage[] = [
{id:"New",label:"New",color:"#3b82f6",outcome:"open"},
{id:"Contacted",label:"Contacted",color:"#eab308",outcome:"open"},
{id:"Qualified",label:"Qualified",color:"#f97316",outcome:"open"},
{id:"Proposal",label:"Proposal",color:"#a855f7",outcome:"open"},
{id:"Won",label:"Won",color:"#10b981",outcome:"won"},
{id:"Lost",label:"Lost",color:"#ef4444",outcome:"lost"}];
export function getPipeline(settings:CrmSettings):PipelineStage[]{return settings.pipeline?.length?settings.pipeline:defaultPipeline;}
export function renderEmailTemplate(template:EmailTemplate,lead:{name?:string;phone?:string;email?:string}){
 const render=(text:string)=>text.replace(/\{\{(name|phone|email)\}\}/g,(_,key)=>String(lead[key as keyof typeof lead]||""));
 return {subject:render(template.subject),body:render(template.body)};
}
export const defaultSources=["Manual","Facebook Lead Ads","WhatsApp","Instagram","Google Ads","Website","Referral","Import","Phone"];
export const defaultSettings:CrmSettings={sources:defaultSources,tags:[],fields:[]};
export function cleanSettings(input:any):CrmSettings {
 const list=(v:any,max:number)=>Array.from(new Set<string>((Array.isArray(v)?v:[]).map((x:any)=>String(x).trim().slice(0,60)).filter(Boolean))).slice(0,max);
 const sources=Array.from(new Set([...defaultSources,...list(input.sources,40)]));
 const tags=list(input.tags,100);
 const fields:CustomField[]=(Array.isArray(input.fields)?input.fields:[]).slice(0,30).map((f:any)=>{
  if(!/^[a-z][a-z0-9_]{0,39}$/.test(f.id)||!["text","textarea","number","date","boolean","select"].includes(f.type))throw Error("Invalid custom field.");
  const label=String(f.label||"").trim().slice(0,80);if(!label)throw Error("Field label required.");
  const options=list(f.options,50);if(f.type==="select"&&!options.length)throw Error("Select fields need options.");
  return {id:f.id,label,type:f.type,options};
 });
 if(new Set(fields.map(f=>f.id)).size!==fields.length)throw Error("Duplicate field key.");
 const pipeline:PipelineStage[]=(Array.isArray(input.pipeline)?input.pipeline:defaultPipeline).slice(0,30).map((p:any)=>{
  const id=String(p.id||""),label=String(p.label||"").trim().slice(0,60);
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(id)||!label||!/^#[0-9a-fA-F]{6}$/.test(p.color)||!["open","won","lost"].includes(p.outcome))throw Error("Invalid pipeline stage.");
  return {id,label,color:p.color,outcome:p.outcome};
 });
 if(new Set(pipeline.map(p=>p.id)).size!==pipeline.length||!pipeline.some(p=>p.id==="New")||!pipeline.some(p=>p.outcome==="won")||!pipeline.some(p=>p.outcome==="lost"))throw Error("Pipeline needs New, Won and Lost outcomes with unique keys.");
 const emailTemplates:EmailTemplate[]=(Array.isArray(input.emailTemplates)?input.emailTemplates:[]).slice(0,50).map((t:any)=>{
  const id=String(t.id||""),name=String(t.name||"").trim().slice(0,100),subject=String(t.subject||"").trim().slice(0,200),body=String(t.body||"").trim().slice(0,10000);
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(id)||!name||!subject||!body||/[\r\n]/.test(subject))throw Error("Invalid email template.");
  return {id,name,subject,body};
 });
 if(new Set(emailTemplates.map(t=>t.id)).size!==emailTemplates.length)throw Error("Duplicate template key.");
 return {sources,tags,fields,pipeline,emailTemplates};
}
export function cleanCustomValues(input:any,fields:CustomField[]) {
 const values:Record<string,string|number|boolean>={};
 for(const f of fields) {
  const value=input?.[f.id];if(value===undefined||value===null||value==="")continue;
  if(f.type==="number"){const n=Number(value);if(!Number.isFinite(n))throw Error("Invalid number.");values[f.id]=n;}
  else if(f.type==="boolean"){if(typeof value!=="boolean")throw Error("Invalid checkbox.");values[f.id]=value;}
  else {const text=String(value).slice(0,2000);if(f.type==="select"&&!f.options.includes(text))throw Error("Invalid selection.");
   if(f.type==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(text))throw Error("Invalid date.");values[f.id]=text;}
 }
 return values;
}
