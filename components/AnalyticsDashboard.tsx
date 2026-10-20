"use client";
import { useEffect, useState } from "react";

type Analytics = {
  totalConversations: number;
  totalContacts: number;
  totalMessages: number;
  unreadConversations: number;
  trialDaysLeft: number;
  plan: string;
  connectedToWhatsApp: boolean;
};

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/analytics");
        const data = await res.json();
        if (res.ok) setAnalytics(data.analytics);
      } catch (e) {
        console.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !analytics) {
    return <div className="p-4 text-slate-400">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <div className="card p-4">
        <p className="text-xs text-slate-400">Conversations</p>
        <p className="text-2xl font-bold mt-2">{analytics.totalConversations}</p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-400">Contacts</p>
        <p className="text-2xl font-bold mt-2">{analytics.totalContacts}</p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-400">Messages</p>
        <p className="text-2xl font-bold mt-2">{analytics.totalMessages}</p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-400">Unread</p>
        <p className={`text-2xl font-bold mt-2 ${analytics.unreadConversations > 0 ? "text-emerald" : ""}`}>
          {analytics.unreadConversations}
        </p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-400">Trial Days Left</p>
        <p className={`text-2xl font-bold mt-2 ${analytics.trialDaysLeft <= 3 ? "text-orange-500" : "text-emerald"}`}>
          {analytics.trialDaysLeft}
        </p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-slate-400">Plan</p>
        <p className="text-lg font-bold mt-2 capitalize">{analytics.plan}</p>
      </div>

      <div className="card p-4 col-span-2 md:col-span-3">
        <p className="text-xs text-slate-400">WhatsApp Status</p>
        <p className={`text-lg font-bold mt-2 ${analytics.connectedToWhatsApp ? "text-emerald" : "text-slate-400"}`}>
          {analytics.connectedToWhatsApp ? "✓ Connected" : "✗ Not Connected"}
        </p>
      </div>
    </div>
  );
}
