import EmbeddedSignupButton from "@/components/EmbeddedSignupButton";
import ConnectNumber from "@/components/ConnectNumber";
import { Icon } from "@/components/Icons";

export const metadata = {
  title: "Channels — WhatsApp Connection",
  description: "Connect a customer-owned WhatsApp Business account with Meta Embedded Signup.",
};

export default function ChannelsPage() {
  return (
    <section className="px-4 py-6 md:px-8 md:py-8">
      <div className="rounded-[28px] bg-gradient-to-r from-[#0d9f67] to-[#10b981] p-7 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Channels</p>
        <h1 className="mt-2 text-3xl font-bold">WhatsApp Connection</h1>
        <p className="mt-2 text-white/85">Connect your WhatsApp Business Account securely through Meta-hosted onboarding.</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-emerald/70 bg-emerald/[0.04] p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald/10 text-emerald"><Icon.inbox className="h-6 w-6" /></span>
            <div>
              <p className="text-lg font-bold">Embedded Signup</p>
              <p className="muted mt-1 text-sm">Recommended customer onboarding</p>
            </div>
          </div>
          <p className="muted mt-5 text-sm leading-relaxed">Your customer signs in on Meta, chooses the correct Business Portfolio, WhatsApp Business Account and phone number, and authorizes the connection without sharing passwords or API tokens with you.</p>
          <div className="mt-5"><EmbeddedSignupButton /></div>
        </div>

        <div className="rounded-3xl border p-6" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/5"><Icon.key className="h-6 w-6" /></span>
            <div>
              <p className="text-lg font-bold">Manual Setup</p>
              <p className="muted mt-1 text-sm">Admin / advanced support only</p>
            </div>
          </div>
          <p className="muted mt-5 text-sm leading-relaxed">Manual credentials are intentionally not exposed to normal customers. Use Embedded Signup for customer onboarding. Manual provider configuration remains an internal administrator workflow.</p>
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200">Protected setup — contact the platform administrator when manual provider configuration is genuinely required.</div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border p-6 md:p-8" style={{ borderColor: "var(--line)" }}>
        <h2 className="text-2xl font-bold">Already using WhatsApp Business App?</h2>
        <span className="mt-3 inline-flex rounded-full bg-emerald/15 px-3 py-1 text-xs font-bold text-emerald">COEXISTENCE</span>
        <p className="muted mt-4 max-w-3xl text-sm leading-relaxed">Where Meta currently offers a supported coexistence or migration option for the selected account, follow the exact option shown inside Meta Embedded Signup. Do not delete the customer's existing WhatsApp account unless Meta explicitly requires it for that onboarding path.</p>
      </div>

      <div className="mt-8"><ConnectNumber /></div>
    </section>
  );
}
