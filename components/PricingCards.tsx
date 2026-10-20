"use client";
import { plans, type Plan } from "@/lib/site";
import { Icon } from "./Icons";
import Reveal from "./Reveal";

function PlanCard({ plan, index }: { plan: Plan; index: number }) {


  return (
    <Reveal delay={(index % 4) * 70}>
      <div
        className={`relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1.5 ${
          plan.highlight
            ? "border-emerald/60 bg-gradient-to-b from-emerald/[0.08] to-transparent shadow-glow"
            : "card hover:border-emerald/40 hover:shadow-glow"
        }`}
      >
        {plan.badge && (
          <span
            className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold ${
              plan.highlight ? "bg-emerald text-ink" : "bg-tick text-ink"
            }`}
          >
            {plan.badge}
          </span>
        )}
        <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
        <div className="mt-3 flex items-end gap-1">
          <span className="font-display text-4xl font-bold">₹{plan.price.toLocaleString("en-IN")}</span>
          <span className="muted mb-1 text-sm">{plan.note ?? plan.per}</span>
        </div>
        <ul className="mt-5 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
              <span className="muted">{f}</span>
            </li>
          ))}
        </ul>
        <a
          href={`/checkout?plan=${plan.id}`}
          className={`mt-6 block w-full text-center ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
        >
          {plan.cta}
        </a>
      </div>
    </Reveal>
  );
}

export default function PricingCards() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((p, i) => (
        <PlanCard key={p.id} plan={p} index={i} />
      ))}
    </div>
  );
}
