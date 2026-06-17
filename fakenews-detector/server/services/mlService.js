const axios = require("axios");

const PYTHON_API_URL  = "http://127.0.0.1:8000/predict";
const PYTHON_TIMEOUT  = 180000; // 180 seconds 

/**
 * Calls the local Python FastAPI ML service for TF-IDF + classifier prediction.
 * @param {string} text - The raw news article text to classify.
 * @returns {Promise<string>} - The prediction label (e.g. "TRUE" / "FALSE" / "UNKNOWN").
 */
async function getMLPrediction(text) {
  try {
    const response = await axios.post(
      PYTHON_API_URL,
      { text },
      {
        headers: { "Content-Type": "application/json" },
        timeout: PYTHON_TIMEOUT,
      }
    );

    const data = response.data;

    // Normalise across common field-name conventions from the Python side
    const raw =
      data.prediction ??
      data.label      ??
      data.verdict    ??
      data.result     ??
      null;

    if (raw === null || raw === undefined) {
      console.warn("[mlService] Python response did not contain a recognisable prediction field:", data);
      return "UNKNOWN";
    }

    return String(raw).toUpperCase();

  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.warn(`[mlService] Python ML service is not running at ${PYTHON_API_URL}. Returning UNKNOWN.`);
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      console.warn(`[mlService] Python ML service timed out after ${PYTHON_TIMEOUT / 1000}s. Returning UNKNOWN.`);
    } else if (error.response) {
      console.warn(`[mlService] Python ML service returned HTTP ${error.response.status}:`, error.response.data ?? error.message);
    } else {
      console.warn("[mlService] Unexpected error calling Python ML service:", error.message);
    }

    return "UNKNOWN";
  }
}

module.exports = { getMLPrediction };