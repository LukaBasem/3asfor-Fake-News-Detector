"""
source_verifier.py
==================
Source Verification Module for the Hybrid Fake News Detection System.

Adds a web-search verification layer on top of the existing TF-IDF +
ML classifier pipeline.  The ML model remains the authoritative decision-maker;
this module enriches its output with real, human-readable corroborating sources.
"""
import re
import time
import logging
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Lazily download the NLTK resources the first time this module is imported.
for _resource in ["stopwords", "punkt", "punkt_tab", "averaged_perceptron_tagger"]:
    try:
        if _resource in ("punkt", "punkt_tab"):
            nltk.data.find(f"tokenizers/{_resource}")
        else:
            nltk.data.find(f"corpora/{_resource}")
    except LookupError:
        nltk.download(_resource, quiet=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(module)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class NewsSource:
    """A single corroborating news source returned by the web search."""
    headline: str
    url: str
    snippet: str = ""
    published_date: str = ""

    def __str__(self) -> str:
        return f'"{self.headline}" → {self.url}'

@dataclass
class VerificationReport:
    verdict: str                        # "REAL" | "FAKE"
    confidence_score: float             # 0.0 – 1.0  (from your ML model)
    explanation: str                    # from Llama 3 explanation layer
    top_features: list                  # from TF-IDF / ML model

    search_query: str = ""              # the query sent to the search engine
    sources: list[NewsSource] = field(default_factory=list)
    source_count: int = 0
    verification_status: str = "UNVERIFIED"   # "CORROBORATED" | "DISPUTED" | "UNVERIFIED"

    def display(self) -> str:
        source_lines = "\n   ".join(str(s) for s in self.sources) or "None found"
        return (
            f"\nPrediction    : {self.verdict}\n"
            f"Confidence    : {round(self.confidence_score * 100, 1)}%\n"
            f"Verification  : {self.verification_status}\n"
            f"Search Query  : \"{self.search_query}\"\n"
            f"Sources ({self.source_count}):\n   {source_lines}\n"
            f"Summary       : {self.explanation}\n"
        )

# ─── Keyword Extraction ───────────────────────────────────────────────────────

class KeywordExtractor:
    ALLOWED_POS = {"NN", "NNS", "NNP", "NNPS", "VB", "VBD", "VBG", "VBN", "VBP", "VBZ"}

    def __init__(self, max_keywords: int = 7):
        self.max_keywords = max_keywords
        self._stopwords = set(stopwords.words("english"))

    def extract(self, text: str) -> str:
        if not text or not text.strip():
            raise ValueError("Input text is empty; cannot extract keywords.")

        text = unicodedata.normalize("NFKD", text)
        text = re.sub(r"[^a-zA-Z\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        tokens = word_tokenize(text.lower())
        tagged = nltk.pos_tag(tokens)

        keywords = [
            word for word, pos in tagged
            if pos in self.ALLOWED_POS
            and word not in self._stopwords
            and len(word) > 2
        ]

        unique_keywords = list(dict.fromkeys(keywords))
        query = " ".join(unique_keywords[: self.max_keywords])

        logger.info(f"Extracted search query: \"{query}\"")
        return query

# ─── Search Backends ─────────────────────────────────────────────────────────

class DuckDuckGoSearcher:
    def __init__(self, max_results: int = 3, throttle_seconds: float = 1.5):
        self.max_results = max_results
        self.throttle_seconds = throttle_seconds

    def search(self, query: str) -> list[NewsSource]:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            raise ImportError("duckduckgo-search is not installed.\nRun: pip install duckduckgo-search")

        time.sleep(self.throttle_seconds)

        try:
            with DDGS() as ddgs:
                raw_results = list(ddgs.news(query, max_results=self.max_results))
        except Exception as exc:
            raise RuntimeError(f"DuckDuckGo search failed: {exc}") from exc

        if not raw_results:
            logger.warning(f"No results returned for query: \"{query}\"")
            return []

        sources = []
        for item in raw_results:
            sources.append(NewsSource(
                headline=item.get("title", "No headline"),
                url=item.get("url", ""),
                snippet=item.get("body", ""),
                published_date=item.get("date", ""),
            ))

        return sources

class NewsAPISearcher:
    def __init__(self, api_key: str, max_results: int = 3):
        self.api_key = api_key
        self.max_results = max_results

    def search(self, query: str) -> list[NewsSource]:
        try:
            from newsapi import NewsApiClient
        except ImportError:
            raise ImportError("newsapi-python is not installed.\nRun: pip install newsapi-python")

        newsapi = NewsApiClient(api_key=self.api_key)

        try:
            response = newsapi.get_everything(
                q=query,
                language="en",
                sort_by="relevancy",
                page_size=self.max_results,
            )
        except Exception as exc:
            raise RuntimeError(f"NewsAPI request failed: {exc}") from exc

        articles = response.get("articles", [])
        if not articles:
            logger.warning(f"NewsAPI returned no articles for query: \"{query}\"")
            return []

        return [
            NewsSource(
                headline=a.get("title", "No headline"),
                url=a.get("url", ""),
                snippet=a.get("description", ""),
                published_date=a.get("publishedAt", ""),
            )
            for a in articles
        ]

# ─── Core Verifier ───────────────────────────────────────────────────────────

class NewsVerifier:
    def __init__(
        self,
        searcher=None,
        max_keywords: int = 7,
        newsapi_key: Optional[str] = None,
    ):
        self.extractor = KeywordExtractor(max_keywords=max_keywords)

        if newsapi_key:
            self.searcher = NewsAPISearcher(api_key=newsapi_key)
        elif searcher is not None:
            self.searcher = searcher
        else:
            self.searcher = DuckDuckGoSearcher()

    def _derive_verification_status(
        self, verdict: str, source_count: int
    ) -> str:
        if source_count == 0:
            return "UNVERIFIED"
        return "CORROBORATED" if verdict == "REAL" else "DISPUTED"

    def verify(self, raw_text: str, ml_result: dict) -> VerificationReport:
        search_query = ""
        try:
            search_query = self.extractor.extract(raw_text)
        except ValueError as exc:
            logger.error(f"Keyword extraction failed: {exc}")

        sources: list[NewsSource] = []
        if search_query:
            try:
                sources = self.searcher.search(search_query)
                logger.info(f"Retrieved {len(sources)} source(s)")
            except (RuntimeError, ImportError) as exc:
                logger.error(f"Search failed (system will continue without sources): {exc}")

        status = self._derive_verification_status(
            verdict=ml_result.get("verdict", "UNVERIFIED"),
            source_count=len(sources),
        )

        return VerificationReport(
            verdict=ml_result.get("verdict", "UNVERIFIED"),
            confidence_score=ml_result.get("confidence_score", 0.0),
            explanation=ml_result.get("explanation", ""),
            top_features=ml_result.get("top_features", []),
            search_query=search_query,
            sources=sources,
            source_count=len(sources),
            verification_status=status,
        )

    def verify_text(self, raw_text: str) -> VerificationReport:
        ml_result = self._placeholder_ml_result(raw_text)
        return self.verify(raw_text, ml_result)

    @staticmethod
    def _placeholder_ml_result(text: str) -> dict:
        logger.info("[PLACEHOLDER] Using simulated ML result — replace with real pipeline call.")
        return {
            "verdict": "FAKE",
            "confidence_score": 0.91,
            "explanation": "The model flagged this article due to sensationalist language.",
            "top_features": [
                {"word": "shocking", "weight": 0.82},
                {"word": "secret",   "weight": 0.76},
            ],
        }

# ─── FastAPI Integration Adapter ─────────────────────────────────────────────

def build_api_response(report: VerificationReport) -> dict:
    """
    Serialise a VerificationReport into the JSON shape expected by analyzeController.js.
    """
    # 🚀 التعديل الأخير هنا: تأمين النتيجة عشان الداتا بيز تقبلها دايماً
    final_verdict = str(report.verdict).upper() if report.verdict else "FAKE"

    return {
        "verdict":          final_verdict,
        "confidence_score": report.confidence_score,
        "explanation":      report.explanation,
        "top_features":     report.top_features,
        # ── new fields added by this module ──────────────────────────────────
        "verification": {
            "status":       report.verification_status,
            "search_query": report.search_query,
            "source_count": report.source_count,
            "sources": [
                {
                    "headline":       s.headline,
                    "url":            s.url,
                    "snippet":        s.snippet,
                    "published_date": s.published_date,
                }
                for s in report.sources
            ],
        },
    }

if __name__ == "__main__":
    pass