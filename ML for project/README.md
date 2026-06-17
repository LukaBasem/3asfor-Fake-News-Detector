# Hybrid Fake News Detection System

Separation of Concerns: Classical ML (TF-IDF + LR/SVM/RF) performs the
auditable, evaluable classification. A fine-tuned DistilBERT provides a
deep-learning comparison point. Llama 3 is used ONLY as an explainability
layer on top of the ML verdict — it never re-classifies.

## Setup

```bash
pip install -r requirements.txt
```

Place your dataset in `data/`:
- Kaggle "Fake and Real News" format: `data/Fake.csv` and `data/True.csv`
  (each with a `text` column, optionally `title`)
- OR a single pre-merged file: `data/combined.csv` with columns `text,label`
  (label: 1 = FAKE, 0 = REAL)

## Run Order

```bash
python data_prep.py      # cleans text, builds TF-IDF, saves splits
python train_ml.py        # trains LR / SVM / RandomForest, picks best by macro-F1
python evaluate.py         # generates confusion matrices, ROC curves, F1 chart,
                            # and top-feature plots into plots/
python train_bert.py       # (optional, GPU recommended) fine-tunes DistilBERT
python inference.py        # demo: classify a sample article + Llama 3 explanation
```

## Llama 3 Explanation Layer

Set an API key (Groq's free OpenAI-compatible Llama 3 endpoint is used by default):

```bash
export GROQ_API_KEY="your_key_here"
```

Without a key, `inference.py` falls back to a deterministic template
explanation so the pipeline still runs end-to-end offline.

## Output Artifacts

- `models/tfidf_vectorizer.pkl`, `models/best_model.pkl`, `models/all_models.pkl`
- `models/metrics.json`, `models/bert_metrics.json`
- `models/distilbert_fakenews/` (fine-tuned transformer)
- `plots/*.png` (confusion matrices, ROC curves, F1 comparison, feature importance)
