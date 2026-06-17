export default function ConfidenceBar({ value = 0, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, value));

  const color =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-yellow-500"
      : pct >= 30
      ? "bg-orange-500"
      : "bg-red-500";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">Confidence</span>
          <span className="text-xs font-mono text-slate-300">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
