export const VERDICT_CONFIG = {
  TRUE: {
    label: "Verified True",
    color: "emerald",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: "✓",
    description: "Claims are supported by credible sources",
  },
  FALSE: {
    label: "False",
    color: "red",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: "✗",
    description: "Claims contradict credible evidence",
  },
  UNVERIFIED: {
    label: "Unverified",
    color: "yellow",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    icon: "?",
    description: "Insufficient evidence to confirm or deny",
  },
  MISLEADING: {
    label: "Misleading",
    color: "orange",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
    icon: "⚠",
    description: "Contains misleading framing or context",
  },
  MIXED: {
    label: "Mixed",
    color: "purple",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    icon: "~",
    description: "Some claims verified, others disputed",
  },
};

export function getVerdictConfig(verdict) {
  return VERDICT_CONFIG[verdict] || VERDICT_CONFIG.UNVERIFIED;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str, n = 100) {
  return str?.length > n ? str.slice(0, n) + "…" : str;
}
