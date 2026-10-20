import Reveal from "./Reveal";

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-glow" />
      <div className="container-px py-16 text-center sm:py-20">
        {eyebrow && (
          <Reveal>
            <span className="eyebrow">{eyebrow}</span>
          </Reveal>
        )}
        <Reveal delay={80}>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={140}>
            <p className="muted mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
              {subtitle}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
