require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const analyzeRoutes = require("./routes/analyze");
const historyRoutes = require("./routes/history");

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// Rate limiter — 30 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/analyze", analyzeRoutes);
app.use("/api/history", historyRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    llmProvider: process.env.LLM_PROVIDER || "ollama",
    model: process.env.LLM_PROVIDER === "groq"
      ? process.env.GROQ_MODEL
      : process.env.OLLAMA_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/fakenews-detector";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🦙 LLM provider: ${process.env.LLM_PROVIDER || "ollama"}`);
});
