"""
evaluate.py
===========
Visualization & Metrics module.

Generates examiner-friendly plots and saves them to 'plots/':
  - confusion_matrix_<model>.png   for each trained model
  - roc_curve_comparison.png       ROC-AUC curves for all models on one plot
  - f1_score_comparison.png        Bar chart comparing macro-F1 across models
  - top_features_<model>.png       Top 10 most influential words for Fake vs Real
"""

import os
import logging

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import confusion_matrix, roc_curve, auc

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = "data"
MODELS_DIR = "models"
PLOTS_DIR = "plots"
os.makedirs(PLOTS_DIR, exist_ok=True)

LABEL_NAMES = {0: "Real", 1: "Fake"}


# --------------------------------------------------------------------------- #
# Confusion Matrix
# --------------------------------------------------------------------------- #
def plot_confusion_matrix(model, X_test, y_test, model_name: str):
    """
    Plot and save a confusion matrix heatmap for a single model.

    Args:
        model: Fitted classifier.
        X_test, y_test: Test data and true labels.
        model_name: Used in the title and output filename.
    """
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)

    plt.figure(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=[LABEL_NAMES[0], LABEL_NAMES[1]],
        yticklabels=[LABEL_NAMES[0], LABEL_NAMES[1]],
    )
    plt.title(f"Confusion Matrix - {model_name}")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()

    out_path = os.path.join(PLOTS_DIR, f"confusion_matrix_{model_name}.png")
    plt.savefig(out_path, dpi=150)
    plt.close()
    logger.info(f"Saved {out_path}")


# --------------------------------------------------------------------------- #
# ROC-AUC Curve Comparison
# --------------------------------------------------------------------------- #
def plot_roc_curves(models: dict, X_test, y_test):
    """
    Plot ROC curves for all models on a single figure for direct comparison.

    Args:
        models: Dict of model_name -> fitted classifier (must support predict_proba).
        X_test, y_test: Test data and true labels.
    """
    plt.figure(figsize=(6, 5))

    for name, model in models.items():
        if not hasattr(model, "predict_proba"):
            logger.warning(f"{name} has no predict_proba; skipping ROC curve.")
            continue

        y_proba = model.predict_proba(X_test)[:, 1]  # probability of class "Fake" (1)
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        roc_auc = auc(fpr, tpr)

        plt.plot(fpr, tpr, label=f"{name} (AUC = {roc_auc:.3f})")

    plt.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Random Guess")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve Comparison Across Models")
    plt.legend(loc="lower right")
    plt.tight_layout()

    out_path = os.path.join(PLOTS_DIR, "roc_curve_comparison.png")
    plt.savefig(out_path, dpi=150)
    plt.close()
    logger.info(f"Saved {out_path}")


# --------------------------------------------------------------------------- #
# F1 Score Bar Chart
# --------------------------------------------------------------------------- #
def plot_f1_comparison(metrics: dict):
    """
    Bar chart comparing macro-F1 scores across all trained models.

    Args:
        metrics: Dict of model_name -> metric dict (must contain 'f1_macro').
    """
    names = list(metrics.keys())
    f1_scores = [metrics[n]["f1_macro"] for n in names]

    plt.figure(figsize=(6, 4))
    bars = plt.bar(names, f1_scores, color=sns.color_palette("viridis", len(names)))

    for bar, score in zip(bars, f1_scores):
        plt.text(
            bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
            f"{score:.3f}", ha="center", va="bottom"
        )

    plt.ylim(0, 1.05)
    plt.ylabel("Macro F1-Score")
    plt.title("Model Comparison - Macro F1 Score")
    plt.tight_layout()

    out_path = os.path.join(PLOTS_DIR, "f1_score_comparison.png")
    plt.savefig(out_path, dpi=150)
    plt.close()
    logger.info(f"Saved {out_path}")


# --------------------------------------------------------------------------- #
# Top Feature Importances (Linear Models)
# --------------------------------------------------------------------------- #
def plot_top_features(model, vectorizer, model_name: str, top_n: int = 10):
    """
    Plot the top N most influential words for the FAKE class and the REAL class,
    based on the linear model's learned coefficients.

    Only works for linear models (LogisticRegression, linear SVC) that expose
    `coef_`. Tree-based models (RandomForest) use `feature_importances_` instead,
    but those are not class-directional, so they are handled separately.

    Args:
        model: Fitted linear classifier with `coef_` attribute.
        vectorizer: Fitted TfidfVectorizer (provides feature names).
        model_name: Used in title/filename.
        top_n: Number of top words to display per class.
    """
    feature_names = np.array(vectorizer.get_feature_names_out())

    if hasattr(model, "coef_"):
        coefs = model.coef_[0]

        top_fake_idx = np.argsort(coefs)[-top_n:][::-1]   # most positive -> pushes toward FAKE (1)
        top_real_idx = np.argsort(coefs)[:top_n]          # most negative -> pushes toward REAL (0)

        fig, axes = plt.subplots(1, 2, figsize=(10, 5))

        axes[0].barh(feature_names[top_fake_idx], coefs[top_fake_idx], color="crimson")
        axes[0].set_title(f"Top {top_n} Words Indicating FAKE")
        axes[0].invert_yaxis()

        axes[1].barh(feature_names[top_real_idx], coefs[top_real_idx], color="seagreen")
        axes[1].set_title(f"Top {top_n} Words Indicating REAL")
        axes[1].invert_yaxis()

        fig.suptitle(f"Feature Importance - {model_name}")
        plt.tight_layout()

    elif hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_idx = np.argsort(importances)[-top_n:][::-1]

        plt.figure(figsize=(6, 5))
        plt.barh(feature_names[top_idx], importances[top_idx], color="steelblue")
        plt.title(f"Top {top_n} Important Features - {model_name}")
        plt.gca().invert_yaxis()
        plt.tight_layout()

    else:
        logger.warning(f"{model_name} does not support feature importance extraction.")
        return

    out_path = os.path.join(PLOTS_DIR, f"top_features_{model_name}.png")
    plt.savefig(out_path, dpi=150)
    plt.close()
    logger.info(f"Saved {out_path}")


# --------------------------------------------------------------------------- #
# Entry Point
# --------------------------------------------------------------------------- #
def main():
    logger.info("Loading models, vectorizer, and test data...")

    all_models = joblib.load(os.path.join(MODELS_DIR, "all_models.pkl"))
    vectorizer = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
    X_test = joblib.load(os.path.join(DATA_DIR, "X_test_tfidf.pkl"))
    y_test = joblib.load(os.path.join(DATA_DIR, "y_test.pkl"))

    import json
    with open(os.path.join(MODELS_DIR, "metrics.json")) as f:
        metrics = json.load(f)

    # 1. Confusion matrices for every model
    for name, model in all_models.items():
        plot_confusion_matrix(model, X_test, y_test, name)

    # 2. ROC curve comparison
    plot_roc_curves(all_models, X_test, y_test)

    # 3. F1 comparison bar chart
    plot_f1_comparison(metrics)

    # 4. Top feature importances (Logistic Regression preferred for interpretability)
    if "LogisticRegression" in all_models:
        plot_top_features(all_models["LogisticRegression"], vectorizer, "LogisticRegression")
    if "SVM" in all_models:
        plot_top_features(all_models["SVM"], vectorizer, "SVM")
    if "RandomForest" in all_models:
        plot_top_features(all_models["RandomForest"], vectorizer, "RandomForest")

    logger.info(f"All plots saved to '{PLOTS_DIR}/'")


if __name__ == "__main__":
    main()
