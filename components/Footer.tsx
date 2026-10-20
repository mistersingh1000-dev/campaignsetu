"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerLinks, site } from "@/lib/site";
import { Icon } from "./Icons";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <footer className="relative mt-24 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="container-px py-14">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#2ee06f] to-[#075E54] shadow-glow">
                <Icon.inbox className="h-5 w-5 text-white" />
              </span>
              <span className="font-display text-[15px] font-bold">
                Codecraft <span className="gradient-text">Messaging Hub</span>
              </span>
            </Link>
            <p className="muted mt-4 max-w-sm text-sm leading-relaxed">
              Independent software operated by Codecraft Marketing for businesses using the WhatsApp Business Platform. Customer onboarding uses Meta-hosted Embedded Signup.
            </p>
            <p className="muted mt-3 max-w-sm text-xs leading-relaxed">
              We never ask for your Facebook password, Facebook OTP, WhatsApp OTP, Meta access token, or card PIN over chat, email, or support messages.
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm">
              <a href={`mailto:${site.email}`} className="muted hover:text-emerald">{site.email}</a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] muted">{heading}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm muted transition-colors hover:text-emerald">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm muted sm:flex-row" style={{ borderColor: "var(--line)" }}>
          <p>© 2026 Codecraft Messaging Hub · Operated by Codecraft Marketing.</p>
          <p className="max-w-xl text-center text-xs sm:text-right">
            Codecraft Messaging Hub is not Meta, WhatsApp, or an official Meta/WhatsApp product and is not endorsed by Meta Platforms, Inc. WhatsApp and Meta are trademarks of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
