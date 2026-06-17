const express = require("express");
const router = express.Router();
const { getHistory, getAnalysisById, deleteAnalysis } = require("../controllers/historyController");

router.get("/", getHistory);
router.get("/:id", getAnalysisById);
router.delete("/:id", deleteAnalysis);

module.exports = router;
