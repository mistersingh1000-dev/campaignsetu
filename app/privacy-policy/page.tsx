import React from 'react';

export const metadata = {
  title: 'Privacy Policy | CampaignSetu - Las Media Agency',
  description: 'Privacy Policy and Meta API Data Usage guidelines for CampaignSetu CRM by Las Media Agency.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Effective Date: November 18, 2026 | Platform: CampaignSetu (lasmediaagency.online)
        </p>

        <div className="space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
            <p>
              Las Media Agency (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the{' '}
              <strong>CampaignSetu</strong> CRM platform accessible at{' '}
              <a href="https://lasmediaagency.online" className="text-cyan-400 underline">
                https://lasmediaagency.online
              </a>
              . This Privacy Policy explains how we collect, use, store, and protect your information when you use our website, CRM services, and Meta API integrations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              2. Meta Platform &amp; WhatsApp Business Data Usage
            </h2>
            <p>
              When you connect your Facebook Page, Instagram Business Account, or WhatsApp Business Account (WABA) through Meta Embedded Signup or OAuth, we access and process only the data strictly required to operate your CRM features:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-slate-300">
              <li>Business Portfolio IDs, Page IDs, Instagram Business IDs, and WhatsApp Business Account IDs.</li>
              <li>Connected business phone numbers and approved WhatsApp message templates.</li>
              <li>Page and user access tokens required to publish scheduled posts, retrieve Facebook Lead Ads, and send or receive WhatsApp customer messages.</li>
            </ul>
            <p className="mt-2">
              We strictly comply with Meta Platform Terms and Developer Policies. We <strong>do not sell, rent, or trade</strong> your Meta API data or customer contact lists to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To enable automated WhatsApp notifications, template messaging, and unified inbox support.</li>
              <li>To cross-publish and schedule content across your authorized Facebook Pages and Instagram Business accounts.</li>
              <li>To sync real-time leads from your Facebook Lead Ads directly into your CRM dashboard.</li>
              <li>To maintain account security, authentication, and subscription billing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Data Security &amp; Retention</h2>
            <p>
              All access tokens, credentials, and customer records are encrypted in transit (HTTPS/TLS) and stored securely. We retain your business data only for as long as your CampaignSetu account remains active or as needed to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">
              5. User Data Deletion Instructions
            </h2>
            <p>
              You have full control over your connected Meta accounts and data. You can revoke permissions or request complete deletion of your data at any time by:
            </p>
            <ol className="list-decimal pl-6 mt-2 space-y-1">
              <li>Disconnecting your Facebook, Instagram, or WhatsApp integration from your CampaignSetu CRM Settings dashboard.</li>
              <li>Removing the <strong>CampaignSetu</strong> app from your Facebook Account Settings under <em>Settings &amp; Privacy &gt; Settings &gt; Business Integrations</em>.</li>
              <li>
                Emailing us at{' '}
                <a href="mailto:support@lasmediaagency.online" className="text-cyan-400 underline">
                  support@lasmediaagency.online
                </a>{' '}
                with the subject line <strong>&ldquo;Data Deletion Request&rdquo;</strong>. All associated tokens and records will be permanently deleted within 48 hours.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, contact us at:
              <br />
              <strong>Las Media Agency (Ludhiana Ad Service)</strong>
              <br />
              Ludhiana, Punjab, India
              <br />
              Email:{' '}
              <a href="mailto:support@lasmediaagency.online" className="text-cyan-400 underline">
                support@lasmediaagency.online
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
