"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/crm-db";
const stages = ["New","Contacted","Qualified","Proposal","Won","Lost"];
const blank = {name:"",phone:"",email:"",stage:"New",notes:"",followUpAt:"",value:0};
export default function LeadCRM() {
  const [leads,setLeads] = useState<Lead[]>([]);
  const [draft,setDraft] = useState<any>(null);
  const [query,setQuery] = useState("");
  const [stage,setStage] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [next,setNext] = useState<string|null>(null);
  async function load(after?:string) {
    try {
      const r=await fetch("/api/crm/leads"+(after?"?after="+encodeURIComponent(after):""),{cache:"no-store"});
      const d=await r.json(); if(!r.ok) throw Error(d.error);
      setLeads(old=>after?[...old,...d.leads]:d.leads); setNext(d.next);
    } catch(e:any) {setMessage(e.message || "Unable to load leads.");}
    finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  async function save(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r=await fetch("/api/crm/leads",{method:draft.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft)});
      const d=await r.json(); if(!r.ok) throw Error(d.error);
      setLeads(old=>draft.id?old.map(l=>l.id===draft.id?d.lead:l):[d.lead,...old]);
      setDraft(null); setMessage("Lead saved.");
    } catch(e:any) {setMessage(e.message||"Unable to save.");}
    finally {setBusy(false);}
  }
  const visible=leads.filter(l=>(!stage||l.stage===stage)&&[l.name,l.phone,l.email,l.source,l.notes].join(" ").toLowerCase().includes(query.toLowerCase()));
  const due=leads.filter(l=>l.followUpAt&&l.followUpAt<=new Date().toISOString()&&!["Won","Lost"].includes(l.stage));
  const input="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-white/20";
  return <main className="mx-auto max-w-7xl p-4 md:p-8">
    <p className="text-sm font-semibold text-emerald">CampaignSetu · Customer relationships</p>
    <div className="my-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Lead CRM</h1><p className="mt-2 text-slate-500">Capture enquiries, track deals and plan your next follow-up.</p></div><button className="rounded-xl bg-emerald px-5 py-3 font-semibold text-white" onClick={()=>setDraft({...blank})}>+ Add lead</button></div>
    <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Loaded leads",leads.length],["Follow-ups due",due.length],["Open pipeline",leads.filter(l=>!["Won","Lost"].includes(l.stage)).length],["Won value","₹"+leads.filter(l=>l.stage==="Won").reduce((n,l)=>n+l.value,0).toLocaleString("en-IN")]].map(([label,value])=><div key={label} className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <div className="mb-5 flex flex-wrap gap-3"><input aria-label="Search leads" className={input+" max-w-md"} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email, source or notes"/><select aria-label="Filter stage" className={input+" max-w-xs"} value={stage} onChange={e=>setStage(e.target.value)}><option value="">All stages</option>{stages.map(s=><option key={s}>{s}</option>)}</select></div>
    {message&&<p role="status" className="mb-4 rounded-xl border p-3">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white dark:border-white/10 dark:bg-white/5"><table className="w-full text-left text-sm"><thead><tr className="border-b">{["Lead","Stage","Source","Follow-up","Value","Action"].map(h=><th className="p-4" key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(l=><tr key={l.id} className="border-b last:border-0 dark:border-white/10"><td className="p-4"><strong>{l.name}</strong><p className="mt-1 text-slate-500">{l.phone||l.email}</p></td><td className="p-4"><span className="rounded-full bg-emerald/10 px-3 py-1">{l.stage}</span></td><td className="p-4">{l.source}</td><td className="p-4">{l.followUpAt?new Date(l.followUpAt).toLocaleString():"Not scheduled"}{due.some(d=>d.id===l.id)&&<span className="block text-amber-600">Due</span>}</td><td className="p-4">₹{l.value.toLocaleString("en-IN")}</td><td className="p-4"><button className="font-semibold text-emerald" onClick={()=>setDraft({...l,followUpAt:l.followUpAt||""})}>Open / edit</button></td></tr>)}</tbody></table>{!visible.length&&<p className="p-10 text-center text-slate-500">{loading?"Loading leads…":"No leads found. Add your first enquiry."}</p>}</div>
    {next&&<button className="mt-4 rounded-xl border px-4 py-2" onClick={()=>void load(next)}>Load more leads</button>}
    <div className="mt-6 grid gap-4 md:grid-cols-3">{[["WhatsApp inbox","Reply to active conversations and review message history.","/dashboard/chat"],["Chatbot & rules","Manage keyword replies and automatic lead tags.","/dashboard/automations"],["Contacts & consent","Manage customer details and marketing permissions.","/dashboard/contacts"]].map(([title,text,url])=><Link key={url} href={url} className="rounded-2xl border p-5 dark:border-white/10"><h2 className="font-bold">{title} →</h2><p className="mt-2 text-sm text-slate-500">{text}</p></Link>)}</div>
    <p className="mt-5 rounded-xl bg-amber-500/10 p-4 text-sm">Facebook Lead Ads connection is not active yet. Page authorization, lead access and webhook configuration are required before automatic imports. WhatsApp replies also require an eligible connected number; a lead form submission alone does not open a WhatsApp reply window.</p>
    {draft&&<div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4"><form onSubmit={save} className="mx-auto my-8 max-w-xl space-y-4 rounded-2xl bg-white p-6 text-slate-900"><h2 className="text-xl font-bold">{draft.id?"Lead details":"New lead"}</h2>{[["name","Name"],["phone","Phone with country code"],["email","Email"]].map(([key,label])=><label className="block text-sm" key={key}>{label}<input className={input+" mt-1"} required={key==="name"} type={key==="email"?"email":"text"} maxLength={key==="name"?120:254} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}<label className="block text-sm">Stage<select className={input+" mt-1"} value={draft.stage} onChange={e=>setDraft({...draft,stage:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label className="block text-sm">Follow-up date and time (include timezone)<input placeholder="2026-10-30T15:00:00+05:30" className={input+" mt-1"} value={draft.followUpAt} onChange={e=>setDraft({...draft,followUpAt:e.target.value})}/></label><label className="block text-sm">Deal value (₹)<input className={input+" mt-1"} type="number" min="0" max="1000000000000" value={draft.value} onChange={e=>setDraft({...draft,value:Number(e.target.value)})}/></label><label className="block text-sm">Notes<textarea className={input+" mt-1"} rows={4} maxLength={10000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><div className="flex gap-3"><button disabled={busy} className="rounded-xl bg-emerald px-5 py-2 text-white">{busy?"Saving…":"Save lead"}</button><button disabled={busy} type="button" className="rounded-xl border px-5 py-2" onClick={()=>setDraft(null)}>Cancel</button></div></form></div>}
  </main>;
}
