"use client";
import { useEffect, useState } from "react";

type Session = { id:string; name:string|null; email:string|null; lastMessage:string; lastMessageAt:string; unreadForAdmin:number; status:string };
type Message = { id:string; sender:"visitor"|"admin"; text:string; createdAt:string };

export default function WebsiteChatAdmin() {
 const [sessions,setSessions]=useState<Session[]>([]);
 const [selected,setSelected]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function loadSessions(){try{const r=await fetch("/api/admin/website-chat",{cache:"no-store"});const d=await r.json();if(r.ok){setSessions(d.sessions||[]);if(!selected&&d.sessions?.length)setSelected(d.sessions[0].id);}else setError(d.error||"Could not load chats.");}catch{setError("Network error.");}}
 async function loadMessages(id:string){try{const visitorId=id.replace(/^campaignsetu_/,"");const r=await fetch("/api/public-chat?visitorId="+encodeURIComponent(visitorId),{cache:"no-store"});const d=await r.json();if(r.ok)setMessages(d.messages||[]);}catch{setError("Could not load messages.");}}
 useEffect(()=>{void loadSessions();const t=window.setInterval(loadSessions,5000);return()=>window.clearInterval(t);},[]);
 useEffect(()=>{if(!selected)return;void loadMessages(selected);const t=window.setInterval(()=>loadMessages(selected),3000);return()=>window.clearInterval(t);},[selected]);
 async function reply(e:React.FormEvent){e.preventDefault();if(!draft.trim()||!selected||busy)return;setBusy(true);setError("");try{const r=await fetch("/api/admin/website-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:selected,message:draft.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Reply failed.");setMessages(v=>[...v,d.message]);setDraft("");void loadSessions();}catch(e){setError(e instanceof Error?e.message:"Reply failed.");}finally{setBusy(false);}}
 const active=sessions.find(s=>s.id===selected);
 return <section className="px-4 py-8 md:px-8"><div className="mb-6"><h1 className="text-2xl font-bold">Website Live Chat</h1><p className="muted mt-1 text-sm">Messages from visitors on the public CampaignSetu website.</p></div>
 {error&&<p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
 <div className="grid min-h-[65vh] gap-4 lg:grid-cols-[320px_1fr]">
 <aside className="card max-h-[65vh] overflow-y-auto p-2">{sessions.map(s=><button key={s.id} onClick={()=>setSelected(s.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected===s.id?"bg-emerald/10 border border-emerald":"hover:bg-white/5"}`}><div className="flex justify-between gap-2"><b className="truncate text-sm">{s.name||s.email||"Website visitor"}</b>{s.unreadForAdmin>0&&<span className="rounded-full bg-emerald px-2 text-xs text-black">{s.unreadForAdmin}</span>}</div><p className="muted mt-1 truncate text-xs">{s.lastMessage}</p><p className="muted mt-1 text-[10px]">{new Date(s.lastMessageAt).toLocaleString()}</p></button>)}{!sessions.length&&<p className="p-5 text-sm muted">No visitor messages yet.</p>}</aside>
 <div className="card flex min-h-[60vh] flex-col p-3">{active?<><header className="border-b border-line p-2"><b>{active.name||"Website visitor"}</b><p className="muted text-xs">{active.email||"No email provided"}</p></header><div className="flex-1 space-y-3 overflow-y-auto p-3">{messages.map(m=><div key={m.id} className={m.sender==="admin"?"flex justify-end":"flex justify-start"}><div className={`max-w-[80%] rounded-xl p-3 text-sm ${m.sender==="admin"?"bg-emerald text-black":"bg-white/10"}`}><p className="whitespace-pre-wrap">{m.text}</p><p className="mt-1 text-right text-[10px] opacity-60">{new Date(m.createdAt).toLocaleTimeString()}</p></div></div>)}</div><form onSubmit={reply} className="flex gap-2 border-t border-line p-2"><input className="field flex-1" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Reply to visitor…" maxLength={2000}/><button className="btn-primary" disabled={busy||!draft.trim()}>{busy?"Sending…":"Reply"}</button></form></>:<p className="m-auto muted text-sm">Select a visitor conversation.</p>}</div></div></section>;
}
