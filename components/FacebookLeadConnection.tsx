"use client";
import { useEffect, useState } from "react";
export default function FacebookLeadConnection() {
 const [pages,setPages]=useState<any[]>([]),[token,setToken]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/crm/facebook").then(r=>r.json()).then(d=>setPages(d.pages||[])).catch(()=>setError("Unable to load Page connections."));},[]);
 async function connect(e:React.FormEvent) {
  e.preventDefault();setBusy(true);setError("");
  try {const r=await fetch("/api/crm/facebook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pageToken:token})});const d=await r.json();if(!r.ok)throw Error(d.error);setToken("");setPages(p=>[...p.filter(x=>x.id!==d.page.id),d.page]);}
  catch(e:any){setError(e.message||"Connection failed.");}finally{setBusy(false);}
 }
 return <section className="mt-6 rounded-2xl border p-5 dark:border-white/10"><h2 className="font-bold">Facebook Lead Ads</h2><p className="my-2 text-sm text-slate-500">Connect an authorized Facebook Page to import new Instant Form leads. Requires this app's lead access, Page lead permissions and a verified leadgen webhook. This does not import every Facebook enquiry or historical lead automatically.</p>{pages.map(p=><p key={p.id} className="my-2 text-sm">{p.name} · {p.status}</p>)}<details><summary className="cursor-pointer text-sm font-semibold">Advanced Page connection</summary><form onSubmit={connect} className="mt-3 flex flex-wrap gap-2"><label className="min-w-0 flex-1 text-sm">Page access token<input type="password" autoComplete="off" required value={token} onChange={e=>setToken(e.target.value)} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 dark:border-white/20"/></label><button disabled={busy} className="self-end rounded-xl bg-emerald px-4 py-2 text-white">{busy?"Connecting…":"Connect Page"}</button></form><p className="mt-2 text-xs text-slate-500">Use only a token generated for CampaignSetu. Stored encrypted on the server; never paste it in chat. Connecting subscribes this app to new leads for the Page.</p></details>{error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</section>;
}
