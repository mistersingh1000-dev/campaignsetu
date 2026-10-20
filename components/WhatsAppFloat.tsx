"use client";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { Icon } from "./Icons";

export default function WhatsAppFloat() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.whatsappMessage)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3"
    >
      <span className="hidden rounded-full glass px-3 py-2 text-xs font-medium shadow-card md:block">Chat with us</span>
      <span className="relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,.7)] transition-transform group-hover:scale-105">
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-pulse-ring" />
        <Icon.inbox className="relative h-7 w-7" />
      </span>
    </a>
  );
}
