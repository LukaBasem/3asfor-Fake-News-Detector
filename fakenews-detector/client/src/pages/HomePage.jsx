import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, FileText, AlertCircle, Sparkles } from "lucide-react";
import { analyzeArticle } from "../utils/api";
import LoadingState from "../components/LoadingState";

const EXAMPLE_TEXT = `Scientists have discovered a new treatment that completely cures all forms of cancer with a single injection. The treatment, developed in a secret lab, has shown 100% success rate in all 10 patients tested. Major pharmaceutical companies are allegedly trying to suppress this breakthrough to protect their profits. The FDA has not approved it yet, but doctors worldwide are calling it "the greatest medical achievement in human history."`;

export default function HomePage() {
  const [mode, setMode] = useState("text"); // "text" | "url"
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    setError("");
    if (mode === "text" && text.trim().length < 50) {
      setError("Please paste a longer article (at least 50 characters).");
      return;
    }
    if (mode === "url" && !url.startsWith("http")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    try {
      const payload = mode === "url" ? { url } : { text };
      const { data } = await analyzeArticle(payload);
      navigate(`/result/${data.analysis._id}`);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Analysis failed. Please check your backend connection."
      );
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-4">
          <Sparkles size={12} />
          Powered by Traditional ML & Groq Cloud
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Analyze News Article
        </h1>
        <p className="text-slate-400">
          A Hybrid AI system that uses TF-IDF & a trained classifier for fast,
          accurate classification, then LLaMA 3.1 via Groq Cloud to explain
          the verdict and verify individual claims.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-surface-800 rounded-xl border border-surface-700 mb-6 w-fit animate-fade-in">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "text"
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText size={15} />
          Paste Text
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "url"
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Link2 size={15} />
          From URL
        </button>
      </div>

      {/* Input area */}
      <div className="card p-6 mb-4 animate-fade-in glow-blue">
        {mode === "text" ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Article Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full news article here…"
              rows={10}
              className="w-full bg-surface-700/50 border border-surface-600 rounded-xl px-4 py-3
                         text-slate-200 placeholder-slate-500 text-sm leading-relaxed resize-none
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30
                         transition-colors"
            />
            <div className="flex justify-between mt-2">
              <button
                onClick={() => setText(EXAMPLE_TEXT)}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Try an example →
              </button>
              <span className="text-xs text-slate-500 font-mono">
                {text.length} chars
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Article URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full bg-surface-700/50 border border-surface-600 rounded-xl px-4 py-3
                         text-slate-200 placeholder-slate-500 text-sm
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30
                         transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">
              We'll scrape and analyze the article automatically.
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-4 animate-fade-in">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full justify-center flex items-center gap-2 text-base"
      >
        <Sparkles size={17} />
        Analyze for Fake News
      </button>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mt-8 animate-slide-up">
        {[
          { n: "Core ML",    label: "TF-IDF + Classifier" },
          { n: "Groq Cloud", label: "Blazing Fast LLaMA 3.1" },
          { n: "Hybrid AI",  label: "Prediction + Explainability" },
        ].map(({ n, label }) => (
          <div key={n} className="card p-4 text-center">
            <div className="text-xl font-bold text-brand-400 font-mono">{n}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
