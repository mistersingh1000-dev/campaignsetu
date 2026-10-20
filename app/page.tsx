import Link from "next/link";
import HeroChat from "@/components/HeroChat";
import FeaturesGrid from "@/components/FeaturesGrid";
import SignupFlow from "@/components/SignupFlow";
import PricingCards from "@/components/PricingCards";
import FaqAccordion from "@/components/FaqAccordion";
import ContactForm from "@/components/ContactForm";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import { Icon } from "@/components/Icons";

const trust = [
  "Built for the WhatsApp Business Platform",
  "Customer-owned WhatsApp accounts",
  "Signed webhook processing",
  "Dashboard & conversation inbox",
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-glow" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-dark [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)] [background-size:42px_42px]" />
        <div className="container-px grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Reveal>
              <span className="eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                Independent business messaging software
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Manage customer conversations with an <span className="gradient-text">independent messaging dashboard</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="muted mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
                Codecraft Messaging Hub is independent software operated by Codecraft Marketing. Connect a business-owned WhatsApp account through Meta-hosted Embedded Signup, receive messages and delivery events, manage contacts and conversations, and send compliant support or approved template messages from one dashboard.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn-primary">
                  Start 7-day free trial <Icon.arrow className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="btn-ghost">
                  View pricing
                </Link>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <ul className="mt-9 grid max-w-lg grid-cols-2 gap-3">
                {trust.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm">
                    <Icon.check className="h-4 w-4 shrink-0 text-emerald" />
                    <span className="muted">{t}</span>
                  </li>
                ))}
              </ul>
              <p className="muted mt-5 max-w-xl text-xs leading-relaxed">
                Facebook credentials and verification codes are entered only in Meta-hosted flows when Meta requests them. We do not ask customers to send Facebook passwords, OTPs, access tokens, or card PINs to us.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:justify-self-end">
            <HeroChat />
          </Reveal>
        </div>

        <div className="border-y py-5" style={{ borderColor: "var(--line)" }}>
          <div className="container-px flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm muted">
            <span className="text-xs uppercase tracking-[0.18em]">Compatible with Meta Cloud API</span>
            <span className="hidden h-4 w-px bg-current opacity-20 sm:block" />
            <span>Webhooks</span>
            <span>Template sending</span>
            <span>Contacts</span>
            <span>Conversation inbox</span>
            <span>Account analytics</span>
          </div>
        </div>
      </section>

      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Launch-ready capabilities"
          title={<>The core tools needed to <span className="gradient-text">connect and support customers</span></>}
          subtitle="These are the capabilities currently implemented in the platform. Campaign automation, AI workflows and advanced template management can be added as the next product phase."
        />
        <div className="mt-12">
          <FeaturesGrid limit={6} />
        </div>
        <div className="mt-8 text-center">
          <Link href="/features" className="btn-ghost">
            See platform capabilities <Icon.arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container-px py-16">
        <SectionHeading
          eyebrow="Meta Embedded Signup"
          title="A simpler customer onboarding flow"
          subtitle="After your Meta Login for Business configuration and required permissions are approved, customers can connect their Business Portfolio and WhatsApp assets from inside the platform. The authorization window is hosted by Meta."
        />
        <div className="mt-12">
          <SignupFlow />
        </div>
        <div className="mt-8 text-center">
          <Link href="/embedded-signup" className="btn-primary">
            Open Embedded Signup <Icon.arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container-px py-16">
        <SectionHeading
          eyebrow="Platform pricing"
          title="Choose your plan"
          subtitle="Platform subscription pricing is separate from any usage or conversation charges billed under Meta's WhatsApp Business Platform pricing."
        />
        <div className="mt-12">
          <PricingCards />
        </div>
      </section>

      <section className="container-px py-16">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12">
          <FaqAccordion />
        </div>
      </section>

      <section className="container-px py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              center={false}
              eyebrow="Talk to us"
              title="Request a demo"
              subtitle="Tell us about your business and WhatsApp use case. We can guide you through the account, number and onboarding requirements."
            />
            <div className="mt-6 space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <Icon.inbox className="h-5 w-5 text-emerald" /> WhatsApp onboarding support
              </p>
              <p className="flex items-center gap-3">
                <Icon.shield className="h-5 w-5 text-emerald" /> Meta-hosted Embedded Signup connection
              </p>
              <p className="flex items-center gap-3">
                <Icon.bolt className="h-5 w-5 text-emerald" /> Guided API and webhook setup
              </p>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
