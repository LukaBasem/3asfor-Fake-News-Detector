const express = require("express");
const router = express.Router();
const { analyzeArticle } = require("../controllers/analyzeController");

router.post("/", analyzeArticle);

module.exports = router;
