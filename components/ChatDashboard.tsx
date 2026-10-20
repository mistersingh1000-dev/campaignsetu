"use client";
import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  userId: string;
  phoneNumberId: string;
  contactPhone: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  isRead: boolean;
  createdAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  sender: "user" | "contact";
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
  waMessageId: string | null;
};

function StatusTick({ status }: { status: Message["status"] }) {
  if (status === "failed") return <span title="Failed">!</span>;
  if (status === "read") return <span title="Read">✓✓</span>;
  if (status === "delivered") return <span title="Delivered">✓✓</span>;
  return <span title="Sent">✓</span>;
}

export default function ChatDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      markRead(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    setLoadingConvs(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        if (!selectedId && data.conversations?.length) {
          setSelectedId(data.conversations[0].id);
        }
      } else {
        setError(friendly(data));
      }
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoadingConvs(false);
    }
  }

  async function loadMessages(id: string) {
    setLoadingMsgs(true);
    setError("");
    try {
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}/messages`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
      else setError(friendly(data));
    } catch {
      setError("Could not load this conversation.");
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/chat/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0, isRead: true } : c))
      );
    } catch {
      // Not critical — the badge will clear on next load.
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || !selectedId || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.message]);
        setInput("");
        loadConversations();
      } else {
        setError(friendly(data));
      }
    } catch {
      setError("Could not send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function friendly(data: any): string {
    const map: Record<string, string> = {
      not_authenticated: "Your session expired. Please log in again.",
      no_db: "The database isn't configured yet.",
      trial_expired: "Your free trial has ended. Upgrade to keep sending messages.",
      whatsapp_not_connected: "Connect your WhatsApp number in API Setup before sending.",
      suspended: "This account is suspended. Contact support.",
      send_failed: "WhatsApp rejected the message.",
      unauthorized: "You don't have access to this conversation.",
      not_found: "That conversation no longer exists.",
    };
    return data?.message || map[data?.error] || "Something went wrong. Please try again.";
  }

  const selected = conversations.find((c) => c.id === selectedId) || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* Conversation list */}
      <aside className="w-full border-b border-line md:w-80 md:border-b-0 md:border-r overflow-y-auto">
        <div className="border-b border-line p-4">
          <h2 className="font-display text-lg font-semibold">Chats</h2>
          <p className="muted mt-1 text-xs">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </p>
        </div>

        {loadingConvs ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg bg-white/[0.03] p-3">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-sm muted">
            No conversations yet. When someone messages your WhatsApp number, the chat appears here.
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedId === c.id
                    ? "border-emerald bg-emerald/10"
                    : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.contactName || c.contactPhone}
                    </p>
                    <p className="muted mt-1 truncate text-xs">
                      {c.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald px-1.5 text-xs font-bold text-black">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Messages */}
      <section className="flex flex-1 flex-col">
        {selected ? (
          <>
            <header className="border-b border-line p-4">
              <h3 className="font-semibold">{selected.contactName || selected.contactPhone}</h3>
              <p className="muted font-mono text-xs">{selected.contactPhone}</p>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {error && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                  {error}
                </div>
              )}

              {loadingMsgs ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                    <div className="h-10 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
                  </div>
                ))
              ) : messages.length === 0 ? (
                <p className="muted mt-10 text-center text-sm">
                  No messages yet in this conversation.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        m.sender === "user"
                          ? "rounded-br-sm bg-emerald text-black"
                          : "rounded-bl-sm bg-white/[0.08]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          m.sender === "user" ? "text-black/60" : "muted"
                        }`}
                      >
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.sender === "user" && <StatusTick status={m.status} />}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-line p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="field flex-1"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="btn-primary disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <p className="text-lg font-medium">No conversation selected</p>
              <p className="muted mt-2 text-sm">Pick a chat on the left to start messaging.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
