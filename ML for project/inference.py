"""
inference.py
=============
The Inference & Explainability Pipeline (Backend Entry Point).
Now powered by Groq Cloud for ultra-fast Llama 3 inference.
"""

import os
import json
import logging
from typing import List, Dict, Any
import requests

import joblib
import numpy as np
import gdown  # 🚀 تم إضافة المكتبة هنا

from data_prep import clean_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = "models"
LABEL_MAP = {0: "REAL", 1: "FAKE"}


# --------------------------------------------------------------------------- #
# Classification Engine (Traditional ML)
# --------------------------------------------------------------------------- #
class FakeNewsClassifier:
    def __init__(self, model_path: str = None, vectorizer_path: str = None):
        model_path = model_path or os.path.join(MODELS_DIR, "best_model.pkl")
        vectorizer_path = vectorizer_path or os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")

        # 🚀 --- بداية كود التحميل من جوجل درايف --- 🚀
        rf_model_id = '1g5EFhXxi6FyZ2Eu_tTaNw873dN1muzXb'
        # ⚠️ ماتنساش تحط الـ ID بتاع ملف الـ Vectorizer هنا بدل الكلمة دي:
        tfidf_id = '1EVG1UHQAm5hAWklKQMLD4WwQgfZ1XsuN'

        def download_from_drive(file_id, output_path):
            if not os.path.exists(output_path):
                logger.info(f"Downloading {output_path} from Google Drive...")
                # السطر ده بيعمل فولدر Models أوتوماتيك لو مش موجود على السيرفر
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                url = f'https://drive.google.com/uc?id={file_id}'
                gdown.download(url, output_path, quiet=False)
                logger.info(f"Download complete for {output_path}!")

        # تنفيذ التحميل
        download_from_drive(rf_model_id, model_path)
        download_from_drive(tfidf_id, vectorizer_path)
        # 🚀 --- نهاية كود التحميل --- 🚀

        if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
            raise FileNotFoundError("Model or vectorizer not found even after download attempt.")

        self.model = joblib.load(model_path)
        self.vectorizer = joblib.load(vectorizer_path)
        self.feature_names = np.array(self.vectorizer.get_feature_names_out())
        logger.info(f"Loaded model: {type(self.model).__name__}")

    def predict(self, raw_text: str, top_n_features: int = 5) -> Dict[str, Any]:
        cleaned = clean_text(raw_text)
        if not cleaned:
            raise ValueError("Input text is empty after preprocessing.")

        X = self.vectorizer.transform([cleaned])
        pred_label = int(self.model.predict(X)[0])
        proba = self.model.predict_proba(X)[0] 
        confidence = float(proba[pred_label])
        top_features = self._extract_top_features(X, pred_label, top_n_features)

        return {
            "verdict": LABEL_MAP[pred_label],
            "confidence_score": round(confidence, 4),
            "probabilities": {"REAL": round(float(proba[0]), 4), "FAKE": round(float(proba[1]), 4)},
            "top_features": top_features,
            "clean_text": cleaned,
        }

    def _extract_top_features(self, X, pred_label: int, top_n: int) -> List[Dict[str, float]]:
        x_dense = X.toarray().flatten()
        nonzero_idx = np.nonzero(x_dense)[0]

        if hasattr(self.model, "coef_"):
            coefs = self.model.coef_[0]
            contributions = x_dense[nonzero_idx] * coefs[nonzero_idx]
            if pred_label == 1: 
                order = np.argsort(contributions)[::-1][:top_n]
            else: 
                order = np.argsort(contributions)[:top_n]
            top_idx = nonzero_idx[order]
            weights = contributions[order]
        else:
            order = np.argsort(x_dense[nonzero_idx])[::-1][:top_n]
            top_idx = nonzero_idx[order]
            weights = x_dense[top_idx]

        return [
            {"word": self.feature_names[idx], "weight": round(float(w), 4)}
            for idx, w in zip(top_idx, weights)
        ]


# --------------------------------------------------------------------------- #
# Explanation Engine (LLM / Groq Cloud)
# --------------------------------------------------------------------------- #
class LlamaExplainer:
    def __init__(self, model: str = "llama-3.1-8b-instant"):
        self.model = model
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.url = "https://api.groq.com/openai/v1/chat/completions"

    def build_prompt(self, original_text: str, ml_result: Dict[str, Any]) -> str:
        top_words = ", ".join(f"'{f['word']}' (weight: {f['weight']:.3f})" for f in ml_result["top_features"])
        snippet = original_text[:1500] + ("..." if len(original_text) > 1500 else "")

        prompt = f"""You are an AI assistant helping users understand the output of a
machine learning fake news detection system. A statistical ML model (TF-IDF +
classifier) has ALREADY analyzed the article below and produced a verdict.
Your job is ONLY to explain this result in clear, neutral, user-friendly
language. Do NOT change, second-guess, or re-derive the verdict -- treat it
as ground truth from the detection system.

ARTICLE (excerpt):
\"\"\"{snippet}\"\"\"

ML SYSTEM VERDICT: {ml_result['verdict']}
CONFIDENCE SCORE: {ml_result['confidence_score'] * 100:.1f}%
TOP LINGUISTIC SIGNALS DETECTED: {top_words}

Please provide:
1. A 2-3 sentence plain-language explanation of why these linguistic signals
   are commonly associated with {ml_result['verdict'].lower()} news.
2. One practical tip for the reader on how to further verify this type of claim.

Keep the tone neutral, informative, and avoid being alarmist."""
        return prompt

    def explain(self, original_text: str, ml_result: Dict[str, Any]) -> str:
        prompt = self.build_prompt(original_text, ml_result)
        try:
            return self._call_groq_api(prompt)
        except Exception as e:
            logger.error(f"Groq API call failed: {e}. Using fallback explanation.")
            return self._fallback_explanation(ml_result)

    def _call_groq_api(self, prompt: str) -> str:
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not set! Falling back to basic explanation.")
            # ⚠️ كان في Error صغير في السطر ده صلحتهولك (كان ml_result مش متعرف هنا)
            raise ValueError("API Key missing")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a helpful, neutral fact-checking assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        }
        response = requests.post(self.url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

    def _fallback_explanation(self, ml_result: Dict[str, Any]) -> str:
        verdict = ml_result["verdict"]
        confidence = ml_result["confidence_score"] * 100
        words = ", ".join(f"'{f['word']}'" for f in ml_result["top_features"])

        if verdict == "FAKE":
            return f"The model classified this article as FAKE with {confidence:.1f}% confidence. This decision was influenced by words like {words}."
        else:
            return f"The model classified this article as REAL with {confidence:.1f}% confidence. Words such as {words} contributed to this decision."


# --------------------------------------------------------------------------- #
# Unified Pipeline (Backend Entry Point)
# --------------------------------------------------------------------------- #
class FakeNewsPipeline:
    def __init__(self, llama_model: str = "llama-3.1-8b-instant"):
        self.classifier = FakeNewsClassifier()
        self.explainer = LlamaExplainer(model=llama_model)

    def analyze(self, raw_text: str) -> Dict[str, Any]:
        ml_result = self.classifier.predict(raw_text)
        explanation = self.explainer.explain(raw_text, ml_result)

        return {
            "verdict": ml_result["verdict"],
            "confidence_score": ml_result["confidence_score"],
            "probabilities": ml_result["probabilities"],
            "top_features": ml_result["top_features"],
            "explanation": explanation,
        }