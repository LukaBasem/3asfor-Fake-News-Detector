VerifyAI — Fake News Detector
A full-stack MERN application that analyzes news articles for credibility using LLaMA 3 via Ollama (or Groq as a cloud fallback).

Tech Stack
Layer	Tech
Frontend	React 18 + Vite + TailwindCSS + Recharts
Backend	Node.js + Express
Database	MongoDB + Mongoose
AI	LLaMA 3 via Ollama (local) or Groq (cloud)
Search	NewsAPI + Tavily API
Scraping	Cheerio
Quick Start
1. Prerequisites
Node.js 18+
MongoDB running locally (mongod) or a MongoDB Atlas URI
Ollama installed and running
2. Pull LLaMA 3
ollama pull llama3
ollama serve   # starts on http://localhost:11434
3. Install dependencies
npm run install:all
4. Configure environment
cd server
cp .env.example .env
# Edit .env with your API keys
Minimum required in .env:

MONGODB_URI=mongodb://localhost:27017/fakenews-detector
LLM_PROVIDER=ollama
Optional but recommended:

NEWS_API_KEY=...     # https://newsapi.org (free)
TAVILY_API_KEY=...   # https://tavily.com (free)
5. Run in development
npm run dev
Frontend: http://localhost:5173
Backend: http://localhost:5000
API docs (Swagger): http://localhost:5000/api-docs (add swagger if desired)
Using Groq Instead of Ollama
If your machine can't run Ollama (needs ~8GB RAM for LLaMA 3 8B):

Get a free API key at https://console.groq.com
In server/.env:
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
API Endpoints
Method	Endpoint	Description
POST	/api/analyze	Analyze an article (text or URL)
GET	/api/history	Get analysis history (paginated)
GET	/api/history/:id	Get a specific analysis
DELETE	/api/history/:id	Delete an analysis
GET	/api/health	Server + LLM provider status
POST /api/analyze
// Text mode
{ "text": "Full article text here..." }

// URL mode
{ "url": "https://example.com/article" }
Response:

{
  "success": true,
  "analysis": {
    "_id": "...",
    "overallVerdict": "FALSE",
    "overallConfidence": 82,
    "overallSummary": "...",
    "claims": [
      {
        "claim": "...",
        "verdict": "FALSE",
        "confidence": 85,
        "reasoning": "...",
        "sources": [{ "title": "...", "url": "...", "snippet": "..." }]
      }
    ]
  }
}
The LLaMA Pipeline
User Input (text or URL)
       ↓
[Scrape if URL] — Cheerio
       ↓
[Extract Claims] — LLaMA 3 prompt → JSON array of 3-5 claims
       ↓
[Search Sources] — NewsAPI + Tavily per claim (parallel)
       ↓
[Judge Each Claim] — LLaMA 3 prompt: claim vs sources → verdict + confidence
       ↓
[Overall Verdict] — LLaMA 3 summarizes all claim verdicts
       ↓
[Save to MongoDB] → Return to React UI
Project Structure
fakenews-detector/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # VerdictBadge, ClaimCard, ConfidenceBar, Charts
│       ├── pages/           # HomePage, ResultPage, HistoryPage
│       └── utils/           # api.js, verdictUtils.js
└── server/                  # Express backend
    ├── controllers/         # analyzeController, historyController
    ├── models/              # Analysis (Mongoose schema)
    ├── routes/              # /analyze, /history
    └── services/            # llmService, searchService, scraperService
Deployment
Backend → Railway or Render

Set all .env variables in the dashboard
Use GROQ_API_KEY instead of Ollama (servers can't run local models)
Frontend → Vercel

Build command: cd client && npm run build
Output dir: client/dist
Add env var: VITE_API_URL=https://your-backend.railway.app
Accuracy Tips
Test on 20–30 known fake articles from FakeNewsNet or LIAR dataset
Tune prompts in server/controllers/analyzeController.js
Add more API keys (both NewsAPI + Tavily) for better source coverage
