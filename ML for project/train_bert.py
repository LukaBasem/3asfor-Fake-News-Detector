"""
train_bert.py
=============
Deep Learning / Transformer Fine-Tuning module.

Fine-tunes a lightweight transformer (DistilBERT by default) on the same
fake news dataset used by the classical ML pipeline (data/train_clean.csv,
data/test_clean.csv produced by data_prep.py).

This script demonstrates:
  - HuggingFace Datasets + Tokenizer pipeline
  - Trainer API with custom metrics (Accuracy, Precision, Recall, F1-macro)
  - Model checkpointing for later comparison against classical baselines

Output:
  - models/distilbert_fakenews/   (fine-tuned model + tokenizer)
  - models/bert_metrics.json      (eval metrics, for comparison in evaluate.py)
"""

import os
import json
import logging

import numpy as np
import pandas as pd
import torch

from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
)
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = "data"
MODELS_DIR = "models"
MODEL_CHECKPOINT = "distilbert-base-uncased"
OUTPUT_DIR = os.path.join(MODELS_DIR, "distilbert_fakenews")
os.makedirs(MODELS_DIR, exist_ok=True)


# --------------------------------------------------------------------------- #
# Data Loading
# --------------------------------------------------------------------------- #
def load_hf_datasets(tokenizer, max_length: int = 256):
    """
    Load the cleaned train/test CSVs produced by data_prep.py and tokenize them.

    Args:
        tokenizer: A HuggingFace tokenizer instance.
        max_length: Max token sequence length (truncation/padding).

    Returns:
        (train_dataset, test_dataset) as HuggingFace Dataset objects, tokenized.
    """
    train_df = pd.read_csv(os.path.join(DATA_DIR, "train_clean.csv")).dropna()
    test_df = pd.read_csv(os.path.join(DATA_DIR, "test_clean.csv")).dropna()

    train_ds = Dataset.from_pandas(train_df[["text", "label"]])
    test_ds = Dataset.from_pandas(test_df[["text", "label"]])

    def tokenize_fn(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=max_length,
        )

    train_ds = train_ds.map(tokenize_fn, batched=True)
    test_ds = test_ds.map(tokenize_fn, batched=True)

    train_ds = train_ds.remove_columns(["text"])
    test_ds = test_ds.remove_columns(["text"])

    train_ds = train_ds.rename_column("label", "labels")
    test_ds = test_ds.rename_column("label", "labels")

    train_ds.set_format("torch")
    test_ds.set_format("torch")

    return train_ds, test_ds


# --------------------------------------------------------------------------- #
# Metrics
# --------------------------------------------------------------------------- #
def compute_metrics(eval_pred):
    """
    Compute Accuracy, Precision, Recall, F1 (macro) for HuggingFace Trainer.

    Args:
        eval_pred: Tuple of (logits, labels) provided by the Trainer.

    Returns:
        Dict of metric_name -> value.
    """
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)

    return {
        "accuracy": accuracy_score(labels, preds),
        "precision_macro": precision_score(labels, preds, average="macro", zero_division=0),
        "recall_macro": recall_score(labels, preds, average="macro", zero_division=0),
        "f1_macro": f1_score(labels, preds, average="macro", zero_division=0),
    }


# --------------------------------------------------------------------------- #
# Training Pipeline
# --------------------------------------------------------------------------- #
def main(
    model_checkpoint: str = MODEL_CHECKPOINT,
    num_epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    logger.info(f"Loading tokenizer and model: {model_checkpoint}")
    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_checkpoint, num_labels=2
    )

    train_ds, test_ds = load_hf_datasets(tokenizer)
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        logging_dir=os.path.join(OUTPUT_DIR, "logs"),
        logging_steps=50,
        report_to="none",  # disable wandb/etc by default
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=test_ds,
        data_collator=data_collator,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics,
    )

    logger.info("Starting fine-tuning...")
    trainer.train()

    logger.info("Evaluating on test set...")
    eval_results = trainer.evaluate()
    logger.info(f"Evaluation results: {eval_results}")

    # Save model + tokenizer + metrics for downstream comparison
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    with open(os.path.join(MODELS_DIR, "bert_metrics.json"), "w") as f:
        json.dump(eval_results, f, indent=2)

    logger.info(f"Fine-tuned model saved to '{OUTPUT_DIR}'")
    logger.info(f"Metrics saved to 'models/bert_metrics.json'")


if __name__ == "__main__":
    main()
