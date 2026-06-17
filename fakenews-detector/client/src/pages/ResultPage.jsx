import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Cpu,
  ExternalLink,
  BarChart2,
  ChevronRight,
} from "lucide-react";
import { getAnalysisById } from "../utils/api";
import VerdictBadge from "../components/VerdictBadge";
import ConfidenceBar from "../components/ConfidenceBar";
import ClaimCard from "../components/ClaimCard";
import { ConfidenceRadial, ClaimsPieChart } from "../components/VerdictChart";
import { getVerdictConfig, formatDate } from "../utils/verdictUtils";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalysisById(id)
      .then(({ data }) => setAnalysis(data))
      .catch(() => setError("Analysis not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || "Something went wrong."}</p>
        <Link to="/" className="btn-secondary inline-flex">
          Go back
        </Link>
      </div>
    );
  }

  const cfg = getVerdictConfig(analysis.overallVerdict);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        New Analysis
      </button>

      {/* Overall verdict hero */}
      <div className={`card p-8 mb-6 border ${cfg.border} relative overflow-hidden`}>
        <div
          className={`absolute inset-0 opacity-5`}
          style={{
            background: `radial-gradient(ellipse at top left, ${
              cfg.color === "emerald"
                ? "#10b981"
                : cfg.color === "red"
                ? "#ef4444"
                : cfg.color === "yellow"
                ? "#eab308"
                : cfg.color === "orange"
                ? "#f97316"
                : "#a855f7"
            }, transparent 70%)`,
          }}
        />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Overall Verdict
            </p>
            <div className="mb-4">
              <VerdictBadge verdict={analysis.overallVerdict} size="lg" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3 line-clamp-2">
              {analysis.articleTitle}
            </h2>
            {analysis.overallSummary && (
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                {analysis.overallSummary}
              </p>
            )}
            {analysis.sourceUrl && (
              <a
                href={analysis.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mt-3 transition-colors"
              >
                <ExternalLink size={12} />
                View Original Article
              </a>
            )}
          </div>

          {/* Radial confidence */}
          <div className="flex-shrink-0">
            <ConfidenceRadial value={analysis.overallConfidence} />
          </div>
        </div>

        {/* Meta row */}
        <div className="relative flex items-center gap-5 mt-6 pt-5 border-t border-surface-700 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            {formatDate(analysis.createdAt)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Cpu size={12} />
            {analysis.llmProvider} · {analysis.llmModel}
          </div>
          {analysis.processingTimeMs && (
            <div className="text-xs text-slate-500 font-mono">
              {(analysis.processingTimeMs / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Claims breakdown chart */}
        {analysis.claims?.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">Verdict Breakdown</h3>
            </div>
            <ClaimsPieChart claims={analysis.claims} />
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
              {[...new Set(analysis.claims.map((c) => c.verdict))].map((v) => {
                const c = getVerdictConfig(v);
                return (
                  <div key={v} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${c.bg.replace("/10", "")}`} />
                    <span className="text-xs text-slate-400">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confidence summary */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Confidence by Claim</h3>
          <div className="space-y-3">
            {analysis.claims?.map((claim, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 truncate max-w-44">
                    Claim {i + 1}
                  </span>
                  <VerdictBadge verdict={claim.verdict} size="sm" />
                </div>
                <ConfidenceBar value={claim.confidence} showLabel={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claims list */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-200 mb-4">
          Claim Analysis ({analysis.claims?.length || 0} claims)
        </h3>
        <div className="space-y-3">
          {analysis.claims?.map((claim, i) => (
            <ClaimCard key={i} claim={claim} index={i} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <button onClick={() => navigate("/")} className="btn-primary flex items-center gap-2">
          Analyze Another
          <ChevronRight size={16} />
        </button>
        <Link to="/history" className="btn-secondary flex items-center gap-2">
          View History
        </Link>
      </div>
    </div>
  );
}
