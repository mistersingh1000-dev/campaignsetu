import Link from "next/link";
import { Icon, type IconName } from "./Icons";

export type ModuleCard = {
  title: string;
  description: string;
  icon?: IconName;
  href?: string;
  badge?: string;
};

export default function DashboardModulePage({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: ModuleCard[];
}) {
  return (
    <section className="px-4 py-6 md:px-8 md:py-8">
      <div className="rounded-[28px] border bg-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="muted mt-3 max-w-3xl text-sm leading-relaxed md:text-base">{description}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const I = Icon[card.icon || "spark"];
          const body = (
            <div className="h-full rounded-3xl border bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.025]">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald/10 text-emerald"><I className="h-5 w-5" /></span>
                {card.badge && <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">{card.badge}</span>}
              </div>
              <h2 className="mt-5 text-lg font-bold">{card.title}</h2>
              <p className="muted mt-2 text-sm leading-relaxed">{card.description}</p>
              {card.href && <p className="mt-5 text-sm font-semibold text-emerald">Open →</p>}
            </div>
          );
          return card.href ? <Link key={card.title} href={card.href}>{body}</Link> : <div key={card.title}>{body}</div>;
        })}
      </div>
    </section>
  );
}
