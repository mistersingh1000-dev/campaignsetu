"use client";
import { useEffect, useState } from "react";
type Page={id:string;name:string;status?:string;available?:boolean;lastLeadReceivedAt?:string|null};
const messages:Record<string,string>={choose_page:"Facebook authorization received. Choose the Page you want to connect below.",cancelled:"Facebook connection was cancelled. No new Page was connected.",invalid_state:"The login session expired or could not be verified. Start Connect Facebook again.",permissions_missing:"Facebook did not grant all required lead permissions. Check Page lead access or contact support.",no_pages_available:"No eligible Pages were returned. Sign in with the Facebook account that manages your Page.",page_discovery_limit:"Your Page list is too large to complete safely. Contact support.",authorization_failed:"Facebook authorization did not complete. Start again or contact support."};
export default function FacebookLeadConnection() {
 const [pages,setPages]=useState<Page[]>([]),[candidates,setCandidates]=useState<Page[]>([]);
 const [loginConfigured,setLoginConfigured]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState<string|null>(null);
 async function load(){
  try{const r=await fetch("/api/crm/facebook",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error);setPages(d.pages||[]);setCandidates(d.selectablePages||[]);setLoginConfigured(d.loginConfigured===true);}
  catch(e:any){setError(e.message||"Unable to load Page connections.");}finally{setLoading(false);}
 }
 useEffect(()=>{const status=new URLSearchParams(window.location.search).get("facebook_status");if(status&&messages[status])setNotice(messages[status]);void load();},[]);
 async function connect(pageId:string){
  setBusy(pageId);setError("");
  try{const r=await fetch("/api/crm/facebook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pageId})});const d=await r.json();if(!r.ok)throw Error(d.error);setNotice("Page subscription saved. Verify capture with a real test lead before treating it as live.");await load();}
  catch(e:any){setError(e.message||"Page connection failed.");}finally{setBusy(null);}
 }
 return <section className="mt-6 space-y-4 rounded-2xl border p-5 dark:border-white/10"><div><h2 className="text-xl font-bold">Connect your Facebook Page</h2><p className="mt-2 text-sm text-slate-500">Each customer connects their own Page to their own workspace. Sign in with Facebook, review the requested permissions, then choose a Page. Tokens stay encrypted on the server.</p></div>
 {loading?<p className="text-sm">Checking connection availability…</p>:loginConfigured?<a className="inline-block rounded-xl bg-emerald px-5 py-3 font-semibold text-white" href="/api/crm/facebook/authorize">Connect Facebook</a>:<p role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm">Customer Facebook login is awaiting the platform administrator's Meta configuration and permissions. No access token needs to be pasted here.</p>}
 {notice&&<p role="status" className="rounded-xl border p-3 text-sm">{notice}</p>}
 {candidates.length>0&&<div><h3 className="mb-2 font-semibold">Choose your authorized Page</h3><ul className="space-y-2">{candidates.map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span>{p.name}<span className="block text-xs text-slate-500">Page ID {p.id}</span></span><button disabled={busy!==null||p.available===false} onClick={()=>void connect(p.id)} className="rounded-xl border px-4 py-2">{p.available===false?"Assigned to another workspace":busy===p.id?"Connecting…":"Connect this Page"}</button></li>)}</ul></div>}
 {pages.length>0&&<div><h3 className="mb-2 font-semibold">Your workspace Pages</h3><ul className="space-y-2">{pages.map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span>{p.name}<span className="block text-xs text-slate-500">{p.status==="subscribed"?(p.lastLeadReceivedAt?"Receiving leads · latest "+new Date(p.lastLeadReceivedAt).toLocaleString():"Subscribed · test lead not yet verified"):p.status==="subscription_failed"?"Subscription failed · retry available":"Connection pending"}</span></span>{p.status!=="subscribed"&&<button disabled={busy!==null} className="rounded-xl border px-4 py-2" onClick={()=>void connect(p.id)}>{busy===p.id?"Retrying…":"Retry connection"}</button>}</li>)}</ul></div>}
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 <p className="text-xs text-slate-500">New Instant Form leads can be imported after Page authorization, lead access and the platform webhook are verified. This does not automatically import every Facebook message or historical lead, or send a WhatsApp message to form submitters.</p></section>;
}
