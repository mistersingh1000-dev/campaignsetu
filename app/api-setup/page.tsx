import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Business Messaging API Setup — Meta Embedded Signup",
  description:
    "Connect a customer-owned WhatsApp Business Platform account through Meta Embedded Signup without asking customers to copy API credentials.",
};

const customerReady = [
  {
    k: "Facebook access",
    v: "Use a Facebook account that can access the correct Meta Business Portfolio for the business.",
  },
  {
    k: "Business details",
    v: "Keep the business name, website, email and other business information accurate and consistent in case Meta requests verification.",
  },
  {
    k: "A phone number you control",
    v: "Use a number eligible for the onboarding path Meta presents. Existing numbers may require Meta's current migration or coexistence option.",
  },
  {
    k: "Verification access",
    v: "Be ready to receive any SMS, voice or in-product verification Meta requests for the selected number.",
  },
];

const embeddedSteps = [
  { n: 1, title: "Open your dashboard", body: "Sign in to Codecraft Messaging Hub and tap Connect WhatsApp." },
  { n: 2, title: "Meta popup opens", body: "Continue with Facebook inside Meta's hosted Embedded Signup window." },
  { n: 3, title: "Choose business assets", body: "Select or create the correct Business Portfolio, WhatsApp Business Account and phone number." },
  { n: 4, title: "Complete Meta checks", body: "Finish any OTP, business verification, number eligibility or permission step Meta requires." },
  { n: 5, title: "Connection finishes automatically", body: "The platform receives Meta's authorization result, subscribes the WABA webhook and attempts Cloud API phone registration. Your dashboard then shows Connected or Activation Pending." },
];

const providerRequirements = [
  {
    k: "Meta App + Embedded Signup configuration",
    v: "The platform owner configures the Meta Business app, Facebook Login for Business / Embedded Signup configuration, App ID, Config ID and App Secret once for the SaaS.",
  },
  {
    k: "App Review / Advanced Access",
    v: "Before broad production release, request the Meta permissions and Advanced Access required by the provider flow, including business_management and whatsapp_business_management where applicable.",
  },
  {
    k: "WhatsApp messaging permission",
    v: "The operational token used for phone registration and messaging needs the WhatsApp messaging permission required by Meta for those operations.",
  },
  {
    k: "Provider System User",
    v: "When provider mode is enabled, configure the provider Business ID, System User and server-side tokens needed to manage connected customer WABAs.",
  },
  {
    k: "Webhook configuration",
    v: "Configure the Meta Webhooks product and verify callback so each connected WABA can deliver inbound messages and delivery/read events to the platform.",
  },
  {
    k: "Billing model",
    v: "If Meta provider credit-line billing is used, configure it only after that commercial model is approved. Otherwise keep credit-line mode disabled.",
  },
];

const gotchas = [
  {
    q: "Embedded Signup finished but dashboard says Activation Pending",
    a: "Meta returned the WABA and phone IDs but final phone registration did not complete. Check permissions, number eligibility, verification and provider credentials before starting another signup, so you do not create duplicate WABAs.",
  },
  {
    q: "The number already uses WhatsApp or WhatsApp Business",
    a: "Do not delete the existing account automatically. Use the migration or coexistence option Meta currently offers for that number and business during onboarding.",
  },
  {
    q: "Can customers send bulk marketing to any uploaded list?",
    a: "No. Campaigns require recorded marketing opt-in and Meta-approved templates when applicable. Contacts marked Do Not Message are automatically excluded.",
  },
  {
    q: "Does Embedded Signup guarantee instant approval?",
    a: "No. It streamlines the connection process, but Meta still controls App Review, business verification, number eligibility, messaging limits and other account-specific requirements.",
  },
];

export default function ApiSetupPage() {
  return (
    <>
      <PageHeader
        eyebrow="Business Messaging API Setup"
        title={<>Connect through <span className="gradient-text">Meta Embedded Signup</span></>}
        subtitle="Customers use one official Meta-hosted popup. They do not need to copy App IDs, WABA IDs, Phone Number IDs or access tokens into the dashboard."
      />

      <section className="container-px py-16">
        <SectionHeading eyebrow="Customer checklist" title="Have these ready before onboarding" subtitle="The technical Meta app configuration belongs to the platform owner, not each customer." />
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          {customerReady.map((item, i) => <Reveal key={item.k} delay={i * 50}><div className="card h-full p-5"><h3 className="font-display text-base font-semibold">{item.k}</h3><p className="muted mt-1.5 text-sm leading-relaxed">{item.v}</p></div></Reveal>)}
        </div>
      </section>

      <section className="border-t container-px py-16" style={{ borderColor: "var(--line)" }}>
        <SectionHeading eyebrow="Customer flow" title="One Connect WhatsApp button" subtitle="This is the only normal customer onboarding path in the dashboard." />
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {embeddedSteps.map((step, i) => <Reveal key={step.n} delay={i * 50}><div className="card p-5"><div className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald/15 font-display text-sm font-bold text-emerald">{step.n}</span><div><h3 className="font-display text-base font-semibold">{step.title}</h3><p className="muted mt-1.5 text-sm leading-relaxed">{step.body}</p></div></div></div></Reveal>)}
          <div className="pt-4 text-center"><Link href="/dashboard" className="btn-primary inline-flex">Open dashboard</Link></div>
        </div>
      </section>

      <section className="border-t container-px py-16" style={{ borderColor: "var(--line)" }}>
        <SectionHeading eyebrow="Platform owner only" title="What CodeCraft Marketing configures once" subtitle="These are administrator/provider requirements. Customers should not have to perform them for every connection." />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {providerRequirements.map((item, i) => <Reveal key={item.k} delay={(i % 2) * 60}><div className="card h-full p-5"><h3 className="font-display text-base font-semibold">{item.k}</h3><p className="muted mt-1.5 text-sm leading-relaxed">{item.v}</p></div></Reveal>)}
        </div>
      </section>

      <section className="border-t container-px py-16" style={{ borderColor: "var(--line)" }}>
        <SectionHeading eyebrow="Troubleshooting" title="Common setup questions" />
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {gotchas.map((item, i) => <Reveal key={item.q} delay={i * 40}><div className="card p-5"><h3 className="font-display text-base font-semibold">{item.q}</h3><p className="muted mt-2 text-sm leading-relaxed">{item.a}</p></div></Reveal>)}
        </div>
      </section>
    </>
  );
}
