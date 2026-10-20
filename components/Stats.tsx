import { stats } from "@/lib/site";
import Counter from "./Counter";
import Reveal from "./Reveal";

export default function Stats() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 80}>
          <div className="card p-6 text-center">
            <p className="font-display text-3xl font-bold gradient-text sm:text-4xl">
              <Counter to={s.value} suffix={s.suffix} decimals={s.value % 1 !== 0 ? 1 : 0} />
            </p>
            <p className="muted mt-2 text-sm">{s.label}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
