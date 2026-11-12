"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = { id: string; sender: "visitor" | "admin"; text: string; createdAt: string };

export default function WebsiteChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visitorId, setVisitorId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = "";
    try {
      id = window.localStorage.getItem("campaignsetu_visitor_id") || "";
      if (!id) {
        id = window.crypto.randomUUID();
        window.localStorage.setItem("campaignsetu_visitor_id", id);
      }
    } catch { id = window.crypto.randomUUID(); }
    setVisitorId(id);
  }, []);

  useEffect(() => {
    if (!open || !visitorId) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/public-chat?visitorId=${encodeURIComponent(visitorId)}`, { cache: "no-store" });
        const data = await res.json();
        if (active && res.ok) setMessages(data.messages || []);
      } catch { /* retry on next poll */ }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, visitorId]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || !visitorId || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/public-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, message, name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not send your message.");
      setMessages((old) => [...old, data.message]);
      setText("");
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && <section className="mb-3 flex h-[min(520px,75vh)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center justify-between bg-emerald p-4 text-black">
          <div><p className="font-semibold">CampaignSetu Support</p><p className="text-xs opacity-75">Send us a message</p></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full px-2 py-1 text-xl">×</button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && <p className="rounded-xl bg-white/5 p-3 text-sm muted">Hi! How can we help? Leave your question and our team will reply here.</p>}
          {messages.map((m) => <div key={m.id} className={m.sender === "visitor" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.sender === "visitor" ? "bg-emerald text-black" : "bg-white/10"}`}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">{new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
            </div>
          </div>)}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="space-y-2 border-t border-line p-3">
          <div className="grid grid-cols-2 gap-2">
            <input className="field text-xs" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} maxLength={80}/>
            <input className="field text-xs" placeholder="Email (optional)" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/>
          </div>
          <div className="flex gap-2">
            <input className="field min-w-0 flex-1 text-sm" placeholder="Type your message…" value={text} onChange={e=>setText(e.target.value)} maxLength={2000}/>
            <button disabled={busy || !text.trim()} className="btn-primary disabled:opacity-50">{busy ? "…" : "Send"}</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-[10px] muted">Please do not share passwords, OTPs or payment credentials.</p>
        </form>
      </section>}
      <button onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-2xl text-black shadow-xl" aria-label={open ? "Close support chat" : "Open support chat"}>{open ? "×" : "✦"}</button>
    </div>
  );
}
