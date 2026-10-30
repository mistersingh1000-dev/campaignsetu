const fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
function load(file,deps={}){const m={exports:{}},compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('exports','require','module',compiled)(m.exports,n=>n in deps?deps[n]:n.startsWith('.')?load(path.resolve(path.dirname(file),n+'.ts'),deps):require(n),m);return m.exports;}
class DB{
 constructor(){this.map=new Map();this.queue=Promise.resolve();this.n=0;}
 snap(key){const value=this.map.get(key);return {id:key.split('/').pop(),exists:this.map.has(key),data:()=>value&&structuredClone(value),ref:this.ref(key)};}
 ref(key){const db=this;return {id:key.split('/').pop(),key,get:async()=>db.snap(key),set:async(v,o)=>db.map.set(key,o?.merge?{...db.map.get(key),...v}:v),create:async v=>{if(db.map.has(key))throw Error('exists');db.map.set(key,v);},update:async v=>db.map.set(key,{...db.map.get(key),...v})};}
 collection(name){const db=this;function query(filters=[],max=Infinity){return {where:(f,o,v)=>query([...filters,[f,o,v]],max),limit:n=>query(filters,n),get:async()=>{const docs=[...db.map.keys()].filter(k=>k.startsWith(name+'/')&&filters.every(([f,o,v])=>o==='in'?v.includes(db.map.get(k)[f]):db.map.get(k)[f]===v)).slice(0,max).map(k=>db.snap(k));return {docs,size:docs.length,empty:!docs.length};},count(){return {get:async()=>({data:()=>({count:[...db.map.keys()].filter(k=>k.startsWith(name+'/')&&filters.every(([f,o,v])=>db.map.get(k)[f]===v)).length})})};}};}
 return {...query(),doc:id=>db.ref(name+'/'+(id||'auto'+(++db.n)))};}
 runTransaction(fn){const p=this.queue.then(async()=>{const writes=[];const result=await fn({get:r=>r.get(),create:(r,v)=>writes.push(()=>{if(this.map.has(r.key))throw Error('exists');this.map.set(r.key,v);}),set:(r,v,o)=>writes.push(()=>this.map.set(r.key,o?.merge?{...this.map.get(r.key),...v}:v)),update:(r,v)=>writes.push(()=>this.map.set(r.key,{...this.map.get(r.key),...v})),delete:r=>writes.push(()=>this.map.delete(r.key))});writes.forEach(w=>w());return result;});this.queue=p.catch(()=>{});return p;}
}
module.exports={load,DB};
