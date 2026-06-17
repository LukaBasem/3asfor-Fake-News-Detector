import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import VerdictBadge from "./VerdictBadge";
import ConfidenceBar from "./ConfidenceBar";

export default function ClaimCard({ claim, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-surface-700/30 transition-colors"
      >
        <span className="text-xs font-mono text-slate-500 mt-1 flex-shrink-0 w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm leading-relaxed mb-3">{claim.claim}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <VerdictBadge verdict={claim.verdict} size="sm" />
            <div className="flex-1 max-w-32">
              <ConfidenceBar value={claim.confidence} showLabel={false} />
            </div>
            <span className="text-xs text-slate-500 font-mono">{claim.confidence}%</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 flex-shrink-0 mt-1 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-surface-700 px-5 pb-5 pt-4 animate-fade-in">
          {/* Reasoning */}
          {claim.reasoning && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Analysis
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{claim.reasoning}</p>
            </div>
          )}

          {/* Sources */}
          {claim.sources?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Sources ({claim.sources.length})
              </p>
              <div className="space-y-2">
                {claim.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 rounded-lg bg-surface-700/50 hover:bg-surface-700 transition-colors group"
                  >
                    <ExternalLink
                      size={13}
                      className="text-brand-400 flex-shrink-0 mt-0.5 group-hover:text-brand-300"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                        {source.title}
                      </p>
                      {source.snippet && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {source.snippet}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!claim.sources?.length && (
            <p className="text-xs text-slate-500 italic">No sources found for this claim.</p>
          )}
        </div>
      )}
    </div>
  );
}
