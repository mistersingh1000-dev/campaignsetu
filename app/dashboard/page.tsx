import type { Metadata } from "next";
import Link from "next/link";
import DashboardDemo from "@/components/DashboardDemo";
import TrialBanner from "@/components/TrialBanner";
import PendingOrderBanner from "@/components/PendingOrderBanner";
import ConnectNumber from "@/components/ConnectNumber";
import { Icon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Dashboard — WhatsApp Connection, Inbox & Analytics",
  description: "Connect WhatsApp through Meta Embedded Signup, then manage automation, inbox, contacts and campaigns.",
};

const quick = [
  { label: "Connect WhatsApp", href: "/dashboard/channels", icon: "whatsapp" as const },
  { label: "Automation", href: "/dashboard/automations", icon: "bolt" as const },
  { label: "Inbox", href: "/dashboard/chat", icon: "inbox" as const },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "send" as const },
];

export default function DashboardPage() {
  return (
    <section className="px-4 py-6 md:px-8 md:py-8">
      <div className="rounded-[28px] bg-gradient-to-r from-[#0c9b64] to-[#14b878] p-7 text-white shadow-xl md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">WhatsApp Business Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85 md:text-base">Connect a customer-owned WhatsApp Business Account with Meta Embedded Signup, then manage inbox, contacts, campaigns and automation from one panel.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quick.map((item) => {
          const I = Icon[item.icon];
          return (
            <Link key={item.href} href={item.href} className="rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.03]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald/10 text-emerald"><I className="h-5 w-5" /></span>
              <p className="mt-4 font-bold">{item.label}</p>
              <p className="muted mt-1 text-xs">Open workspace →</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <PendingOrderBanner />
        <TrialBanner />
        <ConnectNumber />
        <DashboardDemo />
      </div>
    </section>
  );
}
