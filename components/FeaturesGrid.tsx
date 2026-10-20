import { launchFeatures } from "@/lib/launch-features";
import { Icon, type IconName } from "./Icons";
import Reveal from "./Reveal";

export default function FeaturesGrid({ limit }: { limit?: number }) {
  const list = limit ? launchFeatures.slice(0, limit) : launchFeatures;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((f, i) => {
        const Glyph = Icon[f.icon as IconName] ?? Icon.spark;
        return (
          <Reveal key={f.title} delay={(i % 3) * 80}>
            <div className="card group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/40 hover:shadow-glow">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald transition-colors group-hover:bg-emerald group-hover:text-ink">
                <Glyph className="h-[22px] w-[22px]" />
              </div>
              <h3 className="mt-4 font-display text-[15px] font-semibold">{f.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{f.desc}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
