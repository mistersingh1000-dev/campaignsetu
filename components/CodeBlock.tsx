export default function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-ink-soft" style={{ borderColor: "var(--line)" }}>
      {title && (
        <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--line)" }}>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-xs muted">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-relaxed">
        <code className="font-mono text-emerald/90">{code}</code>
      </pre>
    </div>
  );
}
