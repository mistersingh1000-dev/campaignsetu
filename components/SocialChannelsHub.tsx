"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Account = {
  id: string;
  platform: "facebook" | "instagram" | "twitter" | "whatsapp";
  accountId: string;
  accountName: string;
  username?: string | null;
  status: string;
};

type AccountsResponse = {
  config?: { facebook?: boolean; instagram?: boolean; twitter?: boolean; whatsapp?: boolean };
  whatsappConnected?: boolean;
  accounts?: Account[];
  error?: string;
};

export default function SocialChannelsHub() {
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/accounts", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ error: "Unable to load social channel connections." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const disconnect = async (id: string) => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/social/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setMsg("Account disconnected.");
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const accounts = data?.accounts || [];
  const fbAccounts = accounts.filter((a) => a.platform === "facebook");
  const igAccounts = accounts.filter((a) => a.platform === "instagram");
  const xAccounts = accounts.filter((a) => a.platform === "twitter");
  const cfg = data?.config || {};

  const cards = [
    {
      key: "facebook",
      title: "Facebook Pages",
      desc: "Connect Facebook Pages for feed posts, photos, videos & reels.",
      configured: Boolean(cfg.facebook),
      connectHref: "/api/social/meta/authorize",
      items: fbAccounts,
      badge: fbAccounts.length ? `${fbAccounts.length} Connected` : "Not Connected",
    },
    {
      key: "instagram",
      title: "Instagram Business",
      desc: "Linked via your Facebook Page for photos & Reels publishing.",
      configured: Boolean(cfg.instagram),
      connectHref: "/api/social/meta/authorize",
      items: igAccounts,
      badge: igAccounts.length ? `${igAccounts.length} Connected` : "Not Connected",
    },
    {
      key: "twitter",
      title: "Twitter (X)",
      desc: "Connect your X account via OAuth 2.0 to publish posts.",
      configured: Boolean(cfg.twitter),
      connectHref: "/api/social/twitter/authorize",
      items: xAccounts,
      badge: xAccounts.length ? `${xAccounts.length} Connected` : "Not Connected",
    },
    {
      key: "whatsapp",
      title: "WhatsApp Business",
      desc: "Send approved Template Broadcasts via Meta Cloud API.",
      configured: Boolean(cfg.whatsapp),
      connectHref: "/dashboard/channels",
      items: [],
      badge: data?.whatsappConnected ? "Connected" : "Not Connected",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">All-in-One Social &amp; Messaging Connections</h2>
          <p className="muted mt-1 text-sm">Connect Facebook, Instagram, Twitter (X), and WhatsApp from one place.</p>
        </div>
        <Link href="/dashboard/social" className="rounded-xl bg-[#16a66a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Open Social Publisher →
        </Link>
      </div>

      {msg && <div className="rounded-xl border border-emerald/40 bg-emerald/10 px-4 py-2 text-sm text-emerald">{msg}</div>}
      {data?.error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{data.error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const isConnected = card.items.length > 0 || (card.key === "whatsapp" && data?.whatsappConnected);
          return (
            <div key={card.key} className="rounded-3xl border p-5" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{card.title}</h3>
                  <p className="muted mt-1 text-sm">{card.desc}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${isConnected ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-400"}`}>
                  {loading ? "Checking..." : card.badge}
                </span>
              </div>

              {card.items.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {card.items.map((acc) => (
                    <li key={acc.id} className="flex items-center justify-between rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
                      <span className="truncate font-medium">
                        {acc.accountName} {acc.username ? `(@${acc.username})` : ""}
                      </span>
                      <button
                        onClick={() => disconnect(acc.id)}
                        disabled={busyId === acc.id}
                        className="ml-2 text-xs font-semibold text-red-400 hover:underline disabled:opacity-50"
                      >
                        {busyId === acc.id ? "Removing..." : "Disconnect"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {card.key === "whatsapp" ? (
                  <Link href="/dashboard/campaigns" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
                    WhatsApp Broadcasts →
                  </Link>
                ) : card.configured ? (
                  <a href={card.connectHref} className="rounded-xl bg-[#16a66a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    {card.items.length > 0 ? `Add / Reconnect ${card.title}` : `Connect ${card.title}`}
                  </a>
                ) : (
                  <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                    Env keys required in Vercel ({card.key === "twitter" ? "X_CLIENT_ID / X_CLIENT_SECRET" : "NEXT_PUBLIC_META_APP_ID / META_APP_SECRET"})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
