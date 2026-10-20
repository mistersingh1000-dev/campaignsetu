"use client";
import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  userId: string;
  phoneNumberId: string;
  contactPhone: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  createdAt: string;
};

export default function AdminConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch all conversations (admin endpoint TODO)
      const res = await fetch("/api/admin/conversations");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      } else {
        setError(data.error || "Failed to load");
      }
    } catch (e) {
      setError("Error loading conversations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading conversations...</div>;

  return (
    <section className="container-px py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Customer Conversations</h1>
        <p className="muted mt-2">Monitor all active chat threads across your customers</p>
      </div>

      {error && <div className="mb-4 bg-red-500/20 border border-red-500 text-red-400 p-3 rounded text-sm">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Last Message</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Unread</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conv) => (
              <tr key={conv.id} className="border-b border-line hover:bg-white/[0.03]">
                <td className="px-4 py-3 text-sm font-mono">{conv.userId}</td>
                <td className="px-4 py-3 text-sm">{conv.contactName || conv.contactPhone}</td>
                <td className="px-4 py-3 text-sm text-slate-400 truncate">{conv.lastMessage || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {conv.unreadCount > 0 && (
                    <span className="bg-emerald text-black text-xs font-bold px-2 py-1 rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conversations.length === 0 && (
        <div className="p-12 text-center text-slate-400">
          <p className="text-lg">No conversations yet</p>
          <p className="text-sm mt-2">Messages will appear here once customers receive incoming messages</p>
        </div>
      )}
    </section>
  );
}
