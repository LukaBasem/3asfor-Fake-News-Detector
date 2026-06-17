// services/llmService.js
const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// ▼▼▼  PASTE YOUR GROQ API KEY HERE  ▼▼▼
// Get your free key at: https://console.groq.com/keys
// ─────────────────────────────────────────────────────────────────────────────
const GROQ_API_KEY = "YOUR_GROQ_API_KEY";        // !!!مسحنا ال كي من هنا عشان الجيت هب سيكيوريتي!!!
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.1-8b-instant";
const GROQ_TIMEOUT = 30000; // 30 seconds

/**
 * Calls the Groq Cloud API with a user prompt and optional system prompt.
 * Returns the model's raw text response.
 *
 * @param {string} prompt       - The user-facing prompt content.
 * @param {string} systemPrompt - Optional system instruction for the model.
 * @returns {Promise<string>}   - The model's text reply.
 */
async function callLLM(prompt, systemPrompt = "") {
  if (!GROQ_API_KEY || GROQ_API_KEY === "PLACE_YOUR_GROQ_API_KEY_HERE") {
    throw new Error(
      "Groq API key is not set. Open llmService.js and paste your key into the GROQ_API_KEY constant."
    );
  }

  const messages = [
    ...(systemPrompt
      ? [{ role: "system", content: systemPrompt }]
      : []),
    { role: "user", content: prompt },
  ];

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,   // Low temperature → deterministic, structured JSON output
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: GROQ_TIMEOUT,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty response.");
    }

    return content.trim();
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error(`Groq API timed out after ${GROQ_TIMEOUT / 1000}s.`);
    }
    if (error.response) {
      const status = error.response.status;
      const msg    = error.response.data?.error?.message || "Unknown Groq API error";
      throw new Error(`Groq API error ${status}: ${msg}`);
    }
    throw error;
  }
}

/**
 * Returns metadata about the active LLM provider.
 * Kept identical to the old signature so no other service needs to change.
 */
function getProviderInfo() {
  return {
    provider: "groq",
    model: GROQ_MODEL,
  };
}

module.exports = { callLLM, getProviderInfo };
