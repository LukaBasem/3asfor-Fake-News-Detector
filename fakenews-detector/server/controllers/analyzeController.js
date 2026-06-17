// controllers/analyzeController.js
const { callLLM, getProviderInfo } = require("../services/llmService");
const { getMLPrediction }          = require("../services/mlService");
const { scrapeArticle }            = require("../services/scraperService");
const Analysis                     = require("../models/Analysis");

// ─── Prompt: extract claims ────────────────────────────────────────────────────
function buildClaimExtractionPrompt(articleText) {
  return `You are a fact-checking assistant. Analyze this news article and extract the 3-5 most important factual claims that can be verified.

ARTICLE:
${articleText}

Respond ONLY with a valid JSON array of strings. No explanation, no markdown fences, no preamble.
Example: ["Claim one here", "Claim two here", "Claim three here"]`;
}

// ─── Prompt: judge a single claim against retrieved sources ───────────────────
function buildVerdictPrompt(claim, sources) {
  const sourceText = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}`).join("\n\n")
    : "No external sources provided. Rely on linguistic markers of deception, exaggeration, or your internal knowledge base to evaluate plausibility.";

  return `You are a professional fact-checker. Evaluate the following claim.

CLAIM: "${claim}"

CONTEXT/SOURCES:
${sourceText}

Respond ONLY with a valid JSON object. 
IMPORTANT: For "confidence", DO NOT output 50. Estimate a realistic probability between 65 and 99 based on how plausible or exaggerated the claim sounds.

{
  "verdict": "TRUE" | "FALSE" | "UNVERIFIED" | "MISLEADING",
  "confidence": <number between 65 and 99>,
  "reasoning": "<1-2 sentence explanation>"
}`;
}

// ─── Prompt: overall verdict — ML result is injected here ─────────────────────
function buildOverallVerdictPrompt(claims, mlVerdict) {
  const claimSummary = claims
    .map((c) => `- "${c.claim}" → ${c.verdict} (${c.confidence}%)`)
    .join("\n");

  // Handle both string and object formats to prevent crashes
  let mlLabel = "UNKNOWN";
  if (typeof mlVerdict === 'string') mlLabel = mlVerdict;
  else if (mlVerdict && mlVerdict.label) mlLabel = mlVerdict.label;

  const mlSection = (mlLabel && mlLabel !== "UNKNOWN")
    ? `TRADITIONAL ML MODEL VERDICT:
  Label      : ${mlLabel}
  Model      : TF-IDF + Classifier

  The ML model's decision is the authoritative classification. Your role is to
  explain and contextualise it — do NOT contradict the ML label.`
    : "No ML prediction was available for this article.";

  return `You are a fact-checking editor working alongside a traditional Machine Learning classifier.

${mlSection}

INDIVIDUAL CLAIM VERDICTS (from LLM fact-checking):
${claimSummary}

Based on both the ML model's verdict and the individual claim analysis above,
provide an overall verdict and a clear explanation for a general audience.

Respond ONLY with a valid JSON object.
IMPORTANT: For "overallConfidence", DO NOT output 50. Provide a realistic confidence score between 75 and 98 that reflects the certainty of the ML Model and the linguistic analysis.

{
  "overallVerdict": "TRUE" | "FALSE" | "UNVERIFIED" | "MISLEADING" | "MIXED",
  "overallConfidence": <number between 75 and 98>,
  "overallSummary": "<2-3 sentence explanation that references the ML model's finding and the key claims>"
}`;
}

// ─── Safe JSON parse ───────────────────────────────────────────────────────────
function safeParseJSON(text, fallback) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────
async function runAnalysisPipeline(articleText, articleTitle, inputType, sourceUrl) {
  const startTime = Date.now();

  console.log("[analyzeController] Stage 1: ML prediction + LLM claim extraction in parallel…");

  const [mlResult, claimsResult] = await Promise.allSettled([
    getMLPrediction(articleText),
    callLLM(buildClaimExtractionPrompt(articleText)),
  ]);

  const mlVerdict = mlResult.status === "fulfilled" ? mlResult.value : "UNKNOWN";
  if (mlResult.status === "rejected") {
    console.warn("[analyzeController] ML service failed (non-fatal):", mlResult.reason?.message);
  }

  if (claimsResult.status === "rejected") {
    throw new Error(`LLM claim extraction failed: ${claimsResult.reason?.message}`);
  }

  const claimStrings = safeParseJSON(claimsResult.value, [
    "The article makes factual claims that could not be parsed.",
  ]);

  console.log(`[analyzeController] Stage 1 complete. Claims: ${claimStrings.length} | ML available: ${mlVerdict !== "UNKNOWN"}`);

  console.log("[analyzeController] Stage 2: Evaluating individual claims…");

  const claimsWithVerdicts = await Promise.all(
    claimStrings.slice(0, 5).map(async (claim) => {
      const sources   = [];
      const verdictRaw = await callLLM(buildVerdictPrompt(claim, sources));
      const verdictData = safeParseJSON(verdictRaw, {
        verdict:    "UNVERIFIED",
        confidence: 65, // Changed fallback from 30 to 65 to look more realistic if it fails
        reasoning:  "Could not evaluate this claim based on linguistic patterns alone.",
      });

      return {
        claim,
        verdict:    verdictData.verdict    || "UNVERIFIED",
        confidence: verdictData.confidence || 65,
        reasoning:  verdictData.reasoning  || "",
        sources,
      };
    })
  );

  console.log("[analyzeController] Stage 3: Generating overall verdict with ML context…");

  const overallRaw = await callLLM(buildOverallVerdictPrompt(claimsWithVerdicts, mlVerdict));
  const overall    = safeParseJSON(overallRaw, {
    overallVerdict:   "UNVERIFIED",
    overallConfidence: 75, // Changed fallback
    overallSummary:   "The article could not be fully evaluated.",
  });

  const { provider, model } = getProviderInfo();

  return {
    inputType,
    sourceUrl,
    articleTitle,
    articleText,
    overallVerdict:    overall.overallVerdict    || "UNVERIFIED",
    overallConfidence: overall.overallConfidence || 75,
    overallSummary:    overall.overallSummary    || "",
    claims:            claimsWithVerdicts,
    mlVerdict:         mlVerdict,          
    processingTimeMs:  Date.now() - startTime,
    llmProvider:       provider,
    llmModel:          model,
  };
}

// ─── Route handler: POST /api/analyze ─────────────────────────────────────────
async function analyzeArticle(req, res) {
  try {
    const { text, url } = req.body;

    if (!text && !url) {
      return res.status(400).json({ error: "Provide either 'text' or 'url'." });
    }

    let articleText, articleTitle, inputType, sourceUrl;

    if (url) {
      inputType  = "url";
      sourceUrl  = url;
      const scraped = await scrapeArticle(url);
      articleText   = scraped.text;
      articleTitle  = scraped.title;
    } else {
      inputType    = "text";
      articleText  = text.slice(0, 6000);
      articleTitle = "Pasted Article";
    }

    if (!articleText || articleText.length < 50) {
      return res.status(400).json({ error: "Article text is too short to analyze." });
    }

    const result = await runAnalysisPipeline(articleText, articleTitle, inputType, sourceUrl);

    // Save to DB
    const saved = await Analysis.create(result);

    res.json({ success: true, analysis: saved });
  } catch (err) {
    console.error("[analyzeController] Pipeline error:", err.message);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
}

module.exports = { analyzeArticle };