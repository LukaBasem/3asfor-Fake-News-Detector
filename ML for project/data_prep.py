"""
data_prep.py
============
Data Loading & Preprocessing module for the Hybrid Fake News Detection System.

Responsibilities:
- Load a fake news dataset (Kaggle "Fake and Real News" format assumed:
  Fake.csv / True.csv, each with at least a 'text' column).
- Clean text (remove URLs, punctuation, lowercase, remove stopwords, lemmatize).
- Extract TF-IDF features.
- Persist the fitted TfidfVectorizer and the train/test splits for downstream scripts.
"""

import os
import re
import string
import logging

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# --------------------------------------------------------------------------- #
# Setup
# --------------------------------------------------------------------------- #
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Ensure required NLTK resources are available (idempotent, safe to call repeatedly)
for resource in ["stopwords", "wordnet", "omw-1.4"]:
    try:
        nltk.data.find(f"corpora/{resource}")
    except LookupError:
        nltk.download(resource, quiet=True)

STOPWORDS = set(stopwords.words("english"))
LEMMATIZER = WordNetLemmatizer()

# Paths
DATA_DIR = "data"
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)


# --------------------------------------------------------------------------- #
# Text Cleaning
# --------------------------------------------------------------------------- #
def clean_text(text: str) -> str:
    """
    Clean a raw news text string for downstream NLP processing.

    Steps:
      1. Lowercase
      2. Remove URLs
      3. Remove punctuation and digits
      4. Tokenize (simple whitespace split)
      5. Remove stopwords
      6. Lemmatize remaining tokens

    Args:
        text: Raw input string.

    Returns:
        Cleaned, lemmatized, space-joined string.
    """
    if not isinstance(text, str):
        return ""

    # 1. Lowercase
    text = text.lower()

    # 2. Remove URLs
    text = re.sub(r"http\S+|www\.\S+", " ", text)

    # 3. Remove punctuation and digits
    text = re.sub(f"[{re.escape(string.punctuation)}]", " ", text)
    text = re.sub(r"\d+", " ", text)

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 4-6. Tokenize, remove stopwords, lemmatize
    tokens = text.split()
    tokens = [
        LEMMATIZER.lemmatize(tok)
        for tok in tokens
        if tok not in STOPWORDS and len(tok) > 2
    ]

    return " ".join(tokens)


# --------------------------------------------------------------------------- #
# Data Loading
# --------------------------------------------------------------------------- #
def load_dataset(fake_path: str = None, true_path: str = None,
                  combined_path: str = None) -> pd.DataFrame:
    """
    Load the fake news dataset.

    Two supported formats:
      A) Kaggle "Fake and Real News" format -> two separate CSVs (Fake.csv, True.csv)
         each containing a 'text' (and often 'title') column.
      B) A single combined CSV with columns ['text', 'label'] where
         label = 1 (fake) / 0 (real), e.g. a pre-merged LIAR-style dataset.

    Args:
        fake_path: Path to Fake.csv (Kaggle format).
        true_path: Path to True.csv (Kaggle format).
        combined_path: Path to a single pre-labeled CSV (alternative format).

    Returns:
        DataFrame with columns ['text', 'label'] where label: 1 = FAKE, 0 = REAL.
    """
    if combined_path and os.path.exists(combined_path):
        logger.info(f"Loading combined dataset from {combined_path}")
        df = pd.read_csv(combined_path)
        if "title" in df.columns and "text" in df.columns:
            df["text"] = df["title"].fillna("") + " " + df["text"].fillna("")
        df = df[["text", "label"]].dropna()
        return df

    if fake_path and true_path and os.path.exists(fake_path) and os.path.exists(true_path):
        logger.info(f"Loading Kaggle-format dataset from {fake_path} and {true_path}")
        fake_df = pd.read_csv(fake_path)
        true_df = pd.read_csv(true_path)

        fake_df["label"] = 1  # 1 = FAKE
        true_df["label"] = 0  # 0 = REAL

        # Merge title + text if both present
        for df_ in (fake_df, true_df):
            if "title" in df_.columns and "text" in df_.columns:
                df_["text"] = df_["title"].fillna("") + " " + df_["text"].fillna("")

        combined = pd.concat([fake_df[["text", "label"]], true_df[["text", "label"]]],
                              ignore_index=True)
        combined = combined.dropna(subset=["text"])
        combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)  # shuffle
        return combined

    raise FileNotFoundError(
        "No valid dataset found. Provide either (fake_path & true_path) "
        "for the Kaggle Fake/True format, or combined_path for a "
        "pre-merged ['text','label'] CSV."
    )


# --------------------------------------------------------------------------- #
# Feature Extraction
# --------------------------------------------------------------------------- #
def build_tfidf_features(train_texts, test_texts, max_features: int = 10000,
                          ngram_range: tuple = (1, 2)):
    """
    Fit a TfidfVectorizer on training texts and transform train/test sets.

    Args:
        train_texts: Iterable of cleaned training documents.
        test_texts: Iterable of cleaned test documents.
        max_features: Vocabulary size cap.
        ngram_range: n-gram range for TF-IDF (unigrams + bigrams by default).

    Returns:
        (X_train_tfidf, X_test_tfidf, vectorizer)
    """
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=ngram_range,
        sublinear_tf=True,
        min_df=2,
    )

    X_train = vectorizer.fit_transform(train_texts)
    X_test = vectorizer.transform(test_texts)

    return X_train, X_test, vectorizer


# --------------------------------------------------------------------------- #
# Main Pipeline
# --------------------------------------------------------------------------- #
def run_preprocessing_pipeline(
    fake_csv: str = os.path.join(DATA_DIR, "Fake.csv"),
    true_csv: str = os.path.join(DATA_DIR, "True.csv"),
    combined_csv: str = os.path.join(DATA_DIR, "combined.csv"),
    test_size: float = 0.2,
    random_state: int = 42,
):
    """
    Full preprocessing pipeline:
      1. Load raw data
      2. Clean text
      3. Train/test split
      4. TF-IDF feature extraction
      5. Persist vectorizer + processed splits to disk for train_ml.py / train_bert.py

    Outputs (saved under models/ and data/):
      - models/tfidf_vectorizer.pkl
      - data/X_train_tfidf.pkl, data/X_test_tfidf.pkl
      - data/y_train.pkl, data/y_test.pkl
      - data/train_clean.csv, data/test_clean.csv (for BERT fine-tuning, raw cleaned text)
    """
    df = load_dataset(fake_path=fake_csv, true_path=true_csv, combined_path=combined_csv)
    logger.info(f"Loaded dataset with shape: {df.shape}")
    logger.info(f"Class distribution:\n{df['label'].value_counts()}")

    logger.info("Cleaning text (this may take a while for large datasets)...")
    df["clean_text"] = df["text"].apply(clean_text)

    # Drop rows that became empty after cleaning
    df = df[df["clean_text"].str.len() > 0].reset_index(drop=True)

    # Train/test split (stratified to preserve class balance)
    X_train_text, X_test_text, y_train, y_test = train_test_split(
        df["clean_text"], df["label"],
        test_size=test_size, random_state=random_state, stratify=df["label"]
    )

    # TF-IDF features
    X_train_tfidf, X_test_tfidf, vectorizer = build_tfidf_features(X_train_text, X_test_text)

    # Persist artifacts
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
    joblib.dump(X_train_tfidf, os.path.join(DATA_DIR, "X_train_tfidf.pkl"))
    joblib.dump(X_test_tfidf, os.path.join(DATA_DIR, "X_test_tfidf.pkl"))
    joblib.dump(y_train, os.path.join(DATA_DIR, "y_train.pkl"))
    joblib.dump(y_test, os.path.join(DATA_DIR, "y_test.pkl"))

    # Save raw cleaned text splits too (needed for BERT tokenizer, which works on raw text)
    pd.DataFrame({"text": X_train_text, "label": y_train}).to_csv(
        os.path.join(DATA_DIR, "train_clean.csv"), index=False
    )
    pd.DataFrame({"text": X_test_text, "label": y_test}).to_csv(
        os.path.join(DATA_DIR, "test_clean.csv"), index=False
    )

    logger.info("Preprocessing complete. Artifacts saved to 'models/' and 'data/'.")
    logger.info(f"TF-IDF train matrix shape: {X_train_tfidf.shape}")
    logger.info(f"TF-IDF test matrix shape:  {X_test_tfidf.shape}")

    return X_train_tfidf, X_test_tfidf, y_train, y_test, vectorizer


if __name__ == "__main__":
    run_preprocessing_pipeline()
