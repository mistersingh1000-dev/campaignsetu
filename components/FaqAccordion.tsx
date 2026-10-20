"use client";
import { useState } from "react";
import { faqs } from "@/lib/site";
import { Icon } from "./Icons";

export default function FaqAccordion({ items = faqs }: { items?: typeof faqs }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((f, i) => {
        const active = open === i;
        return (
          <div key={f.q} className="card overflow-hidden">
            <button
              onClick={() => setOpen(active ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={active}
            >
              <span className="font-display text-[15px] font-semibold">{f.q}</span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-transform ${
                  active ? "rotate-45 border-emerald text-emerald" : ""
                }`}
                style={{ borderColor: active ? "" : "var(--line)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <div
              className="grid transition-all duration-300"
              style={{ gridTemplateRows: active ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="muted px-5 pb-5 text-sm leading-relaxed">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
