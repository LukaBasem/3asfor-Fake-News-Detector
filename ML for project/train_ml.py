"""
train_ml.py
===========
Classical ML Training & Evaluation module.

Trains three baseline classifiers on TF-IDF features:
  - Logistic Regression
  - Support Vector Machine (Linear kernel, with probability estimates)
  - Random Forest

Evaluates each on Accuracy, Precision, Recall, F1 (macro), and persists:
  - models/best_model.pkl   -> highest macro-F1 model
  - models/all_models.pkl   -> dict of all trained models (for evaluate.py comparisons)
  - models/metrics.json     -> evaluation metrics for all models
"""

import os
import json
import logging

import joblib
import pandas as pd

from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = "data"
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)


# --------------------------------------------------------------------------- #
# Model Definitions
# --------------------------------------------------------------------------- #
def get_model_zoo() -> dict:
    """
    Define the set of baseline classical models to train.

    Returns:
        Dict mapping model name -> initialized (unfitted) sklearn estimator.
    """
    return {
        "LogisticRegression": LogisticRegression(
            max_iter=1000,
            C=1.0,
            class_weight="balanced",
            random_state=42,
        ),
        "SVM": SVC(
            kernel="linear",
            probability=True,  # required for ROC-AUC / confidence scores
            class_weight="balanced",
            random_state=42,
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
    }


# --------------------------------------------------------------------------- #
# Training & Evaluation
# --------------------------------------------------------------------------- #
def evaluate_model(model, X_test, y_test) -> dict:
    """
    Compute standard classification metrics for a fitted model.

    Args:
        model: A fitted sklearn classifier.
        X_test: Test feature matrix.
        y_test: True labels for the test set.

    Returns:
        Dict of metric_name -> value.
    """
    y_pred = model.predict(X_test)

    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_macro": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
    }


def train_and_evaluate_all(X_train, y_train, X_test, y_test) -> tuple:
    """
    Train all baseline models and evaluate each.

    Args:
        X_train, y_train: Training feature matrix and labels.
        X_test, y_test: Test feature matrix and labels.

    Returns:
        (trained_models: dict, metrics: dict)
    """
    models = get_model_zoo()
    trained_models = {}
    metrics = {}

    for name, model in models.items():
        logger.info(f"Training {name}...")
        model.fit(X_train, y_train)

        model_metrics = evaluate_model(model, X_test, y_test)
        metrics[name] = model_metrics
        trained_models[name] = model

        logger.info(f"{name} results: {model_metrics}")

    return trained_models, metrics


def select_and_save_best(trained_models: dict, metrics: dict) -> str:
    """
    Select the model with the highest macro-F1 score and persist:
      - models/best_model.pkl
      - models/all_models.pkl
      - models/metrics.json

    Args:
        trained_models: Dict of name -> fitted model.
        metrics: Dict of name -> metric dict.

    Returns:
        Name of the best-performing model.
    """
    best_name = max(metrics, key=lambda name: metrics[name]["f1_macro"])
    best_model = trained_models[best_name]

    joblib.dump(best_model, os.path.join(MODELS_DIR, "best_model.pkl"))
    joblib.dump(trained_models, os.path.join(MODELS_DIR, "all_models.pkl"))

    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    # Also save best model name for downstream reference (e.g., inference.py)
    with open(os.path.join(MODELS_DIR, "best_model_name.txt"), "w") as f:
        f.write(best_name)

    logger.info(f"Best model: {best_name} (macro-F1 = {metrics[best_name]['f1_macro']:.4f})")
    logger.info(f"Saved best_model.pkl, all_models.pkl, metrics.json to '{MODELS_DIR}/'")

    return best_name


# --------------------------------------------------------------------------- #
# Entry Point
# --------------------------------------------------------------------------- #
def main():
    logger.info("Loading TF-IDF features and labels from 'data/'...")
    X_train = joblib.load(os.path.join(DATA_DIR, "X_train_tfidf.pkl"))
    X_test = joblib.load(os.path.join(DATA_DIR, "X_test_tfidf.pkl"))
    y_train = joblib.load(os.path.join(DATA_DIR, "y_train.pkl"))
    y_test = joblib.load(os.path.join(DATA_DIR, "y_test.pkl"))

    trained_models, metrics = train_and_evaluate_all(X_train, y_train, X_test, y_test)

    best_name = select_and_save_best(trained_models, metrics)

    # Pretty-print summary table
    summary_df = pd.DataFrame(metrics).T
    logger.info("\n" + summary_df.to_string())
    print(f"\nBest model selected: {best_name}")


if __name__ == "__main__":
    main()
