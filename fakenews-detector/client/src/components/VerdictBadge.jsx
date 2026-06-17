import { getVerdictConfig } from "../utils/verdictUtils";

export default function VerdictBadge({ verdict, size = "md" }) {
  const cfg = getVerdictConfig(verdict);

  const sizes = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium
        ${cfg.bg} ${cfg.text} ${cfg.border} ${sizes[size]}`}
    >
      <span className="font-mono">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
