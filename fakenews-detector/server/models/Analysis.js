const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema({
  claim: { type: String, required: true },
  // 🚀 شلنا الـ enum من هنا عشان يقبل أي حالة (true, False, PARTLY TRUE, إلخ)
  verdict: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  reasoning: { type: String },
  sources: [
    {
      title: String,
      url: String,
      snippet: String,
    },
  ],
});

const AnalysisSchema = new mongoose.Schema(
  {
    inputType: { type: String, enum: ["text", "url"], required: true },
    sourceUrl: { type: String },
    articleTitle: { type: String },
    articleText: { type: String, required: true },
    // 🚀 شلنا الـ enum من النتيجة النهائية كمان
    overallVerdict: { type: String, required: true },
    overallConfidence: { type: Number, min: 0, max: 100 },
    overallSummary: { type: String },
    claims: [ClaimSchema],
    processingTimeMs: { type: Number },
    llmProvider: { type: String },
    llmModel: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", AnalysisSchema);