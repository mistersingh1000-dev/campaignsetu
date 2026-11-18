import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ — Social Automation & WhatsApp Business API Guide",
  description:
    "Step-by-step guide to connect Facebook and Instagram for automation, plus answers about the WhatsApp Business API, Meta Embedded Signup, and CRM integration.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="FAQ"
        title={
          <>
            Questions, <span className="gradient-text">answered</span>
          </>
        }
        subtitle="How to connect Facebook and Instagram for automation, plus everything you need to know about the official WhatsApp Business API."
      />

      <section className="container-px pt-12 pb-4">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            How to Connect Facebook and Instagram for Automation
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Follow these steps to connect your Facebook Pages and Instagram Business account to CampaignSetu:
          </p>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700">
            <li>
              <strong>Log in:</strong> Sign in at{" "}
              <Link href="/login" className="font-medium text-emerald-600 underline">
                lasmediaagency.online/login
              </Link>{" "}
              using your CampaignSetu account (Admin or Customer account with Social Access).
            </li>
            <li>
              <strong>Open Social Publisher:</strong> Go to{" "}
              <Link href="/dashboard/social" className="font-medium text-emerald-600 underline">
                Social Publisher (/dashboard/social)
              </Link>{" "}
              from the dashboard sidebar.
            </li>
            <li>
              <strong>Click Connect:</strong> Under <strong>All-in-One Social &amp; Messaging Connections</strong>, click{" "}
              <strong>Connect Facebook Pages</strong> (or <strong>Connect Instagram Business</strong>).
            </li>
            <li>
              <strong>Log in with Facebook:</strong> In the <strong>Facebook Login for Business</strong> popup, log in or continue with the Facebook account that has Admin access to your Business Portfolio, Facebook Page, and linked Instagram Business account.
            </li>
            <li>
              <strong>Select Business Portfolio:</strong> Choose your Business Portfolio and click <strong>Continue</strong>.
            </li>
            <li>
              <strong>Select Facebook Pages:</strong> Choose <strong>Opt in to current Pages only</strong> (or{" "}
              <strong>Opt in to all current and future Pages</strong>), select your Pages, and click <strong>Continue</strong>.
            </li>
            <li>
              <strong>Select Instagram Accounts:</strong> Choose{" "}
              <strong>Opt in to all current and future Instagram accounts</strong> (or select specific accounts) and click{" "}
              <strong>Continue</strong>.
            </li>
            <li>
              <strong>Review &amp; Save:</strong> On the <strong>Review CampaignSetu&apos;s access request</strong> screen, review all permissions and click <strong>Save</strong>, then click <strong>Got it</strong>.
            </li>
            <li>
              <strong>Verify Connection:</strong> You will be redirected back to <code>/dashboard/social</code>, where your Facebook Pages and Instagram Business account will show as <strong>Connected</strong> and ready to publish from <strong>Create &amp; Publish Post</strong>.
            </li>
          </ol>
        </div>
      </section>

      <section className="container-px py-12">
        <FaqAccordion />
      </section>
    </>
  );
}
