export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <div className={`w-32 h-12 rounded-lg ${i % 2 === 0 ? "bg-emerald/20" : "bg-slate-800/50"} animate-pulse`} />
        </div>
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg bg-white/[0.03] animate-pulse space-y-2">
          <div className="h-4 bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
