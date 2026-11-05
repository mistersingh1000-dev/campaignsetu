import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "User Data Deletion Instructions",
  description: "How to request access, disconnection and deletion of CampaignSetu account and Meta-connected information.",
};

export default function DataDeletionPage() {
  const subject = encodeURIComponent("CampaignSetu — data deletion request");
  return (
    <main className="container-px mx-auto max-w-3xl py-16">
      <p className="text-sm font-medium text-emerald">Privacy &amp; account requests</p>
      <h1 className="mt-3 font-display text-3xl font-bold">User Data Deletion Instructions</h1>
      <p className="muted mt-5 leading-relaxed">
        CampaignSetu is an independent CRM and WhatsApp Business Platform integration.
        You may request deletion of your CampaignSetu account and personal information,
        including information obtained through your authorized Facebook Page or WhatsApp Business connection.
        Some information may need to be retained when required by law or for a legitimate dispute or security purpose.
      </p>
      <h2 className="mt-9 text-xl font-semibold">How to submit a deletion request</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-6 text-sm leading-relaxed">
        <li>Contact us from the email address associated with your CampaignSetu account. Email <a className="text-emerald underline" href={`mailto:${site.email}?subject=${subject}`}>{site.email}</a> with the subject “CampaignSetu — data deletion request”.</li>
        <li>State whether you want to delete your entire account, revoke a Meta/WhatsApp connection, or request deletion of specific personal information. Identify the connected business or Page, if relevant, without supplying private access tokens.</li>
        <li>We may verify account ownership before taking action. Once verified, our team will review and process the request and explain any applicable retention obligations.</li>
        <li>We will confirm the outcome through your registered contact details. If a request cannot be completed immediately, we will explain the reason and available next steps.</li>
      </ol>
      <h2 className="mt-9 text-xl font-semibold">What information is covered?</h2>
      <p className="muted mt-3 text-sm leading-relaxed">
        Depending on your usage, this can include account profile details, saved CRM leads,
        contacts, conversation records, linked Facebook Page identifiers and WhatsApp Business
        Account identifiers. Deleting data from CampaignSetu does not automatically delete it
        from Meta, WhatsApp, your customers' devices, or external systems.
      </p>
      <h2 className="mt-9 text-xl font-semibold">Revoke access separately</h2>
      <p className="muted mt-3 text-sm leading-relaxed">
        You can review or revoke your authorized business integration in the applicable
        Meta Business settings. Revoking permissions may stop new synchronization but does
        not by itself request deletion of records already stored in CampaignSetu.
      </p>
      <p className="mt-9 text-sm">
        For additional information see our <Link href="/privacy" className="text-emerald underline">Privacy Policy</Link> and <Link href="/contact" className="text-emerald underline">Contact page</Link>.
      </p>
      <p className="muted mt-5 text-xs">Never send passwords, OTPs, payment PINs or Meta access tokens in a deletion request.</p>
    </main>
  );
}
