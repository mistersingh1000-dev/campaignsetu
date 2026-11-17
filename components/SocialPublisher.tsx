"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Account = {
  id: string;
  platform: "facebook" | "instagram" | "twitter" | "whatsapp";
  accountName: string;
  username?: string | null;
};

type PostItem = {
  id: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string;
  status: string;
  scheduledAt?: string | null;
  createdAt?: string;
  results?: Record<string, { ok: boolean; detail: string }>;
};

export default function SocialPublisher() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [socialEnabled, setSocialEnabled] = useState(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("image");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadAll = async () => {
    const [accRes, postRes] = await Promise.all([
      fetch("/api/social/accounts", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/social/publish", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]);
    if (Array.isArray(accRes.accounts)) setAccounts(accRes.accounts);
    if (Array.isArray(postRes.posts)) setPosts(postRes.posts);
    setSocialEnabled(accRes.socialEnabled !== false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mediaUrl: mediaType === "text" ? "" : mediaUrl,
          mediaType,
          accountIds: selected,
          scheduledAt: scheduleMode ? scheduledAt : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || "Failed to publish post." });
      } else {
        setFeedback({
          ok: data.status !== "failed",
          msg: data.status === "scheduled" ? `Post scheduled for ${scheduledAt}` : `Post status: ${data.status}`,
        });
        setText("");
        setMediaUrl("");
        await loadAll();
      }
    } catch {
      setFeedback({ ok: false, msg: "Network error while publishing." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {!socialEnabled && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          Social Publisher access is not granted for this account yet. Ask your admin to click Grant Social in the Admin Panel.
        </div>
      )}
      <form onSubmit={submit} className="rounded-3xl border p-6 space-y-5" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Create &amp; Publish Post</h2>
            <p className="muted text-sm">Publish or schedule one post across Facebook, Instagram, and Twitter (X).</p>
          </div>
          <Link href="/dashboard/channels" className="text-sm font-semibold text-emerald hover:underline">
            Manage Connected Accounts →
          </Link>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Select Connected Accounts</p>
          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
              No social accounts connected yet. Connect Facebook, Instagram, or Twitter (X) below or from Channels.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const active = selected.includes(acc.id);
                return (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() => toggle(acc.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active ? "border-emerald bg-emerald/15 text-emerald" : "hover:bg-white/5"
                    }`}
                    style={!active ? { borderColor: "var(--line)" } : undefined}
                  >
                    {acc.platform.toUpperCase()} · {acc.accountName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as "text" | "image" | "video")}
              className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="image">Image Post</option>
              <option value="video">Video / Reel</option>
              <option value="text">Text Only (FB / X)</option>
            </select>
          </div>
          {mediaType !== "text" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">Public Media URL (Image / MP4 Video)</label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Caption / Post Text</label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your caption, hashtags, or announcement..."
            className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={scheduleMode} onChange={(e) => setScheduleMode(e.target.checked)} />
            Schedule for later
          </label>
          {scheduleMode && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="rounded-xl border bg-transparent px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          )}
        </div>

        {feedback && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm ${feedback.ok ? "border-emerald/40 bg-emerald/10 text-emerald" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
            {feedback.msg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || accounts.length === 0} | !socialEnabled}
            className="rounded-xl bg-[#16a66a] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Processing..." : scheduleMode ? "Schedule Post" : "Publish Now"}
          </button>
          <Link href="/dashboard/campaigns" className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-white/5" style={{ borderColor: "var(--line)" }}>
            WhatsApp Template Broadcast →
          </Link>
        </div>
      </form>

      <div className="rounded-3xl border p-6" style={{ borderColor: "var(--line)" }}>
        <h3 className="text-lg font-bold">Recent &amp; Scheduled Posts</h3>
        {posts.length === 0 ? (
          <p className="muted mt-2 text-sm">No social posts created yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--line)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold line-clamp-1">{p.text || p.mediaUrl || "Media Post"}</span>
                  <span className="rounded-full bg-emerald/15 px-3 py-0.5 text-xs font-semibold text-emerald">{p.status}</span>
                </div>
                {p.scheduledAt && <p className="muted mt-1 text-xs">Scheduled: {p.scheduledAt}</p>}
                {p.results && Object.keys(p.results).length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs muted">
                    {Object.entries(p.results).map(([k, r]) => (
                      <li key={k}>{r.ok ? "✓" : "✕"} {r.detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
