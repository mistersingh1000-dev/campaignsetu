import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ContactForm from "@/components/ContactForm";
import { Icon } from "@/components/Icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Request a Demo or Talk to Sales",
  description:
    "Get in touch with Codecraft Messaging Hub. Request a demo, talk to sales, or chat with us on WhatsApp about official WhatsApp Business API access.",
};

const channels = [
  { icon: "whatsapp" as const, label: "WhatsApp", value: "Tap the floating button to chat now" },
  { icon: "send" as const, label: "Email", value: site.email },
  { icon: "bolt" as const, label: "Response time", value: "Within one business day" },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={<>Let's get you <span className="gradient-text">live</span></>}
        subtitle="Request a demo or talk to sales. Tell us your use case and we'll map the fastest path to the official API."
      />
      <section className="container-px py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {channels.map((c) => {
              const Glyph = Icon[c.icon];
              return (
                <div key={c.label} className="card flex items-start gap-4 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald">
                    <Glyph className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{c.label}</p>
                    <p className="muted mt-1 text-sm">{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
