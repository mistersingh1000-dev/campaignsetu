import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import FeaturesGrid from "@/components/FeaturesGrid";
import SignupFlow from "@/components/SignupFlow";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Features — Messaging API Dashboard",
  description:
    "Explore launch-ready Codecraft Messaging Hub capabilities: Meta Cloud API connection, Embedded Signup, conversation inbox, contacts, signed webhooks and account analytics.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title={<>Launch-ready tools on the <span className="gradient-text">official Cloud API</span></>}
        subtitle="The current production scope focuses on reliable onboarding, conversations, contacts, webhook events and account visibility."
      />
      <section className="container-px py-16">
        <FeaturesGrid />
      </section>
      <section className="container-px py-12">
        <SectionHeading eyebrow="Onboarding" title="From signup to a connected WhatsApp account" />
        <div className="mt-12">
          <SignupFlow />
        </div>
      </section>
      <section className="container-px py-12">
        <div className="card mx-auto max-w-3xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Next product phase</h2>
          <p className="muted mt-3 text-sm leading-relaxed">
            Campaign automation, AI chatbot workflows, richer template management, scheduling and
            advanced team controls should be treated as the next product phase until those modules
            are fully implemented and tested end to end.
          </p>
        </div>
      </section>
    </>
  );
}
