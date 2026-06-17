const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeArticle(url) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 15000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

  // Remove noise
  $("script, style, nav, footer, header, aside, .ad, .advertisement, .social-share").remove();

  // Try to get title
  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled Article";

  // Try common article containers first
  let text = "";
  const articleSelectors = [
    "article",
    '[role="main"]',
    ".article-body",
    ".post-content",
    ".entry-content",
    ".story-body",
    "main",
  ];

  for (const selector of articleSelectors) {
    const candidate = $(selector).text().trim();
    if (candidate.length > 200) {
      text = candidate;
      break;
    }
  }

  // Fallback: grab all paragraphs
  if (!text) {
    text = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 40)
      .join("\n\n");
  }

  if (!text || text.length < 100) {
    throw new Error("Could not extract article text from this URL.");
  }

  // Truncate to ~6000 chars to stay within LLM context
  return {
    title,
    text: text.slice(0, 6000),
  };
}

module.exports = { scrapeArticle };
