import { signupSteps } from "@/lib/site";
import { Icon } from "./Icons";
import Reveal from "./Reveal";

export default function SignupFlow() {
  return (
    <div className="relative">
      <div className="absolute left-[27px] top-4 bottom-4 hidden w-px bg-gradient-to-b from-emerald/60 via-emerald/30 to-transparent lg:block lg:left-1/2" />
      <ol className="grid gap-4 lg:grid-cols-5">
        {signupSteps.map((s, i) => (
          <Reveal key={s.n} delay={i * 90}>
            <li className="card relative h-full p-5">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2ee06f] to-[#075E54] font-display text-lg font-bold text-white shadow-glow">
                  {s.n}
                </span>
                <h3 className="font-display text-[15px] font-semibold lg:mt-3">{s.title}</h3>
              </div>
              <p className="muted mt-3 text-sm leading-relaxed">{s.desc}</p>
              {i < signupSteps.length - 1 && (
                <Icon.arrow className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-emerald/50 lg:block" />
              )}
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
