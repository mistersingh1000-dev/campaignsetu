import Link from "next/link";
import { Icon, type IconName } from "./Icons";

const actions: Array<{
  title: string;
  desc: string;
  href: string;
  icon: IconName;
  cta: string;
}> = [
  {
    title: "Conversation inbox",
    desc: "Read inbound WhatsApp conversations and reply from the shared dashboard.",
    href: "/dashboard/chat",
    icon: "inbox",
    cta: "Open inbox",
  },
  {
    title: "Contacts & consent",
    desc: "Manage customer records, marketing opt-in and Do Not Message status.",
    href: "/dashboard/contacts",
    icon: "link",
    cta: "Manage contacts",
  },
  {
    title: "WhatsApp templates",
    desc: "Sync approved Meta templates and submit simple Marketing or Utility templates for review.",
    href: "/dashboard/templates",
    icon: "report",
    cta: "Open templates",
  },
  {
    title: "Broadcast campaigns",
    desc: "Send approved template campaigns only to contacts with recorded marketing consent.",
    href: "/dashboard/campaigns",
    icon: "rocket",
    cta: "Open campaigns",
  },
  {
    title: "Analytics",
    desc: "See real conversation, contact, message and unread counts from your account data.",
    href: "/dashboard/analytics",
    icon: "chart",
    cta: "View analytics",
  },
  {
    title: "API setup guide",
    desc: "Follow the Meta setup, onboarding and webhook requirements for your WhatsApp account.",
    href: "/api-setup",
    icon: "key",
    cta: "Open guide",
  },
];

const checklist = [
  "Create and verify your platform account",
  "Connect the correct Meta Business Portfolio, WABA and phone number",
  "Confirm the dashboard shows WhatsApp as Connected, not Activation Pending",
  "Sync at least one Meta-approved template",
  "Record customer marketing opt-in before adding them to a campaign",
  "Respect opt-outs and WhatsApp messaging policies",
];

export default function DashboardDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Your workspace</h2>
        <p className="muted mt-1 text-sm">
          These sections use your real account data. Demo campaign numbers are not shown here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((item) => {
          const Glyph = Icon[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card group p-5 transition-all hover:-translate-y-0.5 hover:border-emerald/40"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald">
                  <Glyph className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold">{item.title}</h3>
                  <p className="muted mt-1.5 text-sm leading-relaxed">{item.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald">
                    {item.cta} <Icon.arrow className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald">
            <Icon.shield className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold">Before sending to customers</h3>
            <p className="muted mt-1 text-sm leading-relaxed">
              Complete this launch checklist for each customer account. Meta approval and messaging eligibility can differ by business and phone number.
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
