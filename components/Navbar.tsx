"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/lib/site";
import { Icon } from "./Icons";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`transition-all duration-300 ${scrolled ? "glass shadow-card" : ""}`}
        style={{ borderBottom: scrolled ? "1px solid var(--glass-line)" : "1px solid transparent" }}
      >
        <nav className="container-px flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#2ee06f] to-[#075E54] text-ink shadow-glow">
              <Icon.inbox className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-[15px] font-bold leading-tight">
              Codecraft <span className="gradient-text">Messaging Hub</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-emerald" : "muted hover:text-emerald"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost hidden h-10 px-4 py-0 sm:inline-flex">Login</Link>
            <Link href="/signup" className="btn-primary hidden h-10 px-4 py-0 sm:inline-flex">Free trial</Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="grid h-10 w-10 place-items-center rounded-full border lg:hidden"
              style={{ borderColor: "var(--line)" }}
            >
              {open ? <Icon.close className="h-5 w-5" /> : <Icon.menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      {open && (
        <div className="glass border-t lg:hidden" style={{ borderColor: "var(--glass-line)" }}>
          <div className="container-px flex flex-col gap-1 py-4">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-emerald/10">{item.label}</Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="btn-ghost flex-1">Login</Link>
              <Link href="/signup" className="btn-primary flex-1">Free trial</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
