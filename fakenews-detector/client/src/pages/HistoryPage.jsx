import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Trash2, ChevronRight, Search } from "lucide-react";
import { getHistory, deleteAnalysis } from "../utils/api";
import VerdictBadge from "../components/VerdictBadge";
import ConfidenceBar from "../components/ConfidenceBar";
import { formatDate, truncate } from "../utils/verdictUtils";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(p = 1) {
    setLoading(true);
    try {
      const { data } = await getHistory(p);
      setAnalyses(data.analyses);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]);

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    await deleteAnalysis(id);
    load(page);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analysis History</h1>
          <p className="text-slate-400 text-sm">
            {pagination.total || 0} articles analyzed
          </p>
        </div>
        <Link to="/" className="btn-primary flex items-center gap-2 text-sm">
          <Search size={15} />
          New Analysis
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 h-20 shimmer-bg" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock size={32} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No analyses yet</p>
          <Link to="/" className="text-brand-400 text-sm hover:text-brand-300">
            Analyze your first article →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {analyses.map((item) => (
            <Link
              key={item._id}
              to={`/result/${item._id}`}
              className="card p-5 flex items-center gap-4 hover:border-surface-600 hover:bg-surface-700/20 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <VerdictBadge verdict={item.overallVerdict} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {item.inputType === "url" ? "URL" : "Text"}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-200 truncate mb-1">
                  {item.articleTitle || "Untitled Article"}
                </p>
                <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
              </div>

              {/* Confidence mini bar */}
              <div className="w-24 flex-shrink-0 hidden sm:block">
                <ConfidenceBar value={item.overallConfidence} />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => handleDelete(item._id, e)}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                page === i + 1
                  ? "bg-brand-500 text-white"
                  : "bg-surface-800 text-slate-400 hover:bg-surface-700 border border-surface-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
