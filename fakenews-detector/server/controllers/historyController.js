const Analysis = require("../models/Analysis");

async function getHistory(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      Analysis.find({}, "-articleText")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Analysis.countDocuments(),
    ]);

    res.json({
      analyses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAnalysisById(req, res) {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ error: "Not found" });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteAnalysis(req, res) {
  try {
    await Analysis.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getHistory, getAnalysisById, deleteAnalysis };
