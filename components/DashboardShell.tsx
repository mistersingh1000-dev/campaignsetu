"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import ThemeToggle from "./ThemeToggle";

type Me = {
  authenticated?: boolean;
  name?: string;
  email?: string;
  connected?: boolean;
  accessStatus?: string;
};

type Item = {
  label: string;
  href: string;
  icon: keyof typeof Icon;
};

const items: Item[] = [
  { label: "Dashboard", href: "/dashboard", icon: "chart" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "chart" },
  { label: "Inbox", href: "/dashboard/chat", icon: "inbox" },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "send" },
  { label: "Save Money", href: "/dashboard/save-money", icon: "shield" },
  { label: "Contacts", href: "/dashboard/contacts", icon: "link" },
  { label: "Lead CRM", href: "/dashboard/lead-crm", icon: "report" },
  { label: "Automation", href: "/dashboard/automations", icon: "bolt" },
  { label: "Leads & Commerce", href: "/dashboard/commerce", icon: "spark" },
  { label: "Channels", href: "/dashboard/channels", icon: "whatsapp" },
  { label: "Settings", href: "/dashboard/settings", icon: "key" },
  { label: "Subscription & Plans", href: "/dashboard/subscription", icon: "shield" },
  { label: "Media Library", href: "/dashboard/media", icon: "report" },
  { label: "CTWA Ads", href: "/dashboard/ctwa-ads", icon: "facebook" },
  { label: "Lead Source & QR", href: "/dashboard/lead-source", icon: "webhook" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  const initials = useMemo(() => {
    const source = me?.name || me?.email || "User";
    return source.trim().slice(0, 1).toUpperCase();
  }, [me]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  };

  const nav = (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-[#101714] dark:text-white">
      <div className="flex items-center gap-3 border-b px-5 py-5 dark:border-white/10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#16a66a] text-white shadow-lg">
          <Icon.inbox className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold leading-tight">Codecraft Messaging Hub</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">Business API Workspace</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          <span className="text-slate-400">⌕</span>
          <input
            aria-label="Search menu"
            placeholder="Search menu..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          const I = Icon[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition ${
                active
                  ? "bg-emerald/10 text-emerald"
                  : "text-slate-700 hover:bg-slate-100 dark:text-white/85 dark:hover:bg-white/5"
              }`}
            >
              <I className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {!["Dashboard", "Analytics"].includes(item.label) && <span className="text-xs opacity-60">›</span>}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t p-3 dark:border-white/10">
        {profileOpen && (
          <div className="absolute bottom-[78px] left-3 right-3 overflow-hidden rounded-2xl border bg-white shadow-2xl dark:border-white/10 dark:bg-[#16201c]">
            <Link href="/dashboard/profile" className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5">Profile</Link>
            <Link href="/dashboard/company" className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5">Company Profile</Link>
            <button onClick={logout} className="block w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-500/5">Logout</button>
          </div>
        )}
        <button onClick={() => setProfileOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald/15 font-bold text-emerald">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{me?.name || "My Account"}</span>
            <span className="block truncate text-xs text-slate-500 dark:text-white/50">{me?.email || "Signed in"}</span>
          </span>
          <span className="text-lg opacity-50">↗</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a0f0d]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[290px] border-r bg-white lg:block dark:border-white/10 dark:bg-[#101714]">
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <aside className="relative h-full w-[88%] max-w-[390px] shadow-2xl">{nav}</aside>
        </div>
      )}

      <div className="lg:pl-[290px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-6 dark:border-white/10 dark:bg-[#0f1512]/95">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border lg:hidden dark:border-white/10" aria-label="Open dashboard menu">
              <Icon.menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold">Messaging Workspace</p>
              <p className="hidden text-xs text-slate-500 sm:block dark:text-white/45">Embedded Signup · Automation · Campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${me?.connected ? "bg-emerald/10 text-emerald" : "bg-amber-500/10 text-amber-500"}`}>
              {me?.connected ? "WhatsApp Connected" : "Not Connected"}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
