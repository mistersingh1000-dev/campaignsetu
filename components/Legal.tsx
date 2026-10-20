import PageHeader from "./PageHeader";

export default function Legal({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { h: string; p: string }[];
}) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} subtitle={`Last updated ${updated}`} />
      <section className="container-px py-14">
        <div className="mx-auto max-w-3xl space-y-8">
          {sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-display text-lg font-semibold">{s.h}</h2>
              <p className="muted mt-2 text-sm leading-relaxed">{s.p}</p>
            </div>
          ))}
          <p className="muted border-t pt-6 text-xs" style={{ borderColor: "var(--line)" }}>
            This document is a template provided for convenience and is not legal advice. Have your
            policies reviewed by a qualified professional before publishing.
          </p>
        </div>
      </section>
    </>
  );
}
