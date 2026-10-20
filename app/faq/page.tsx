import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ — WhatsApp Business API Questions Answered",
  description:
    "Answers about the WhatsApp Business API, Meta Embedded Signup, activation time, using existing numbers, support and CRM integration.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="FAQ"
        title={<>Questions, <span className="gradient-text">answered</span></>}
        subtitle="Everything you need to know about getting started with the official WhatsApp Business API."
      />
      <section className="container-px py-16">
        <FaqAccordion />
      </section>
    </>
  );
}
