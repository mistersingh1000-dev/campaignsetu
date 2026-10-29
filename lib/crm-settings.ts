export type CustomField = { id:string; label:string; type:"text"|"textarea"|"number"|"date"|"boolean"|"select"; options:string[] };
export type CrmSettings = { sources:string[]; tags:string[]; fields:CustomField[] };
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
 return {sources,tags,fields};
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
