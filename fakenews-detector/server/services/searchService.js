const axios = require("axios");

// ─── NewsAPI ───────────────────────────────────────────────────────────────────
async function searchNewsAPI(query) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: query,
        language: "en",
        sortBy: "relevancy",
        pageSize: 5,
      },
      headers: { "X-Api-Key": apiKey },
      timeout: 10000,
    });

    return (response.data.articles || []).map((a) => ({
      title: a.title,
      url: a.url,
      snippet: a.description || "",
      source: a.source?.name || "NewsAPI",
    }));
  } catch (err) {
    console.warn("NewsAPI error:", err.message);
    return [];
  }
}

// ─── Tavily ────────────────────────────────────────────────────────────────────
async function searchTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      },
      { timeout: 10000 }
    );

    return (response.data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || "",
      source: "Tavily",
    }));
  } catch (err) {
    console.warn("Tavily error:", err.message);
    return [];
  }
}

// ─── Combined search ───────────────────────────────────────────────────────────
async function searchForClaim(claim) {
  const [newsResults, tavilyResults] = await Promise.allSettled([
    searchNewsAPI(claim),
    searchTavily(claim),
  ]);

  const news = newsResults.status === "fulfilled" ? newsResults.value : [];
  const tavily = tavilyResults.status === "fulfilled" ? tavilyResults.value : [];

  // Merge and deduplicate by URL
  const all = [...news, ...tavily];
  const seen = new Set();
  return all
    .filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .slice(0, 6);
}

module.exports = { searchForClaim };
