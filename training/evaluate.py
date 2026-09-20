# from pathlib import Path
# import hashlib

# import numpy as np
# import pandas as pd
# import torch
# import torch.nn as nn

# from sklearn.metrics import (
#     accuracy_score,
#     precision_score,
#     recall_score,
#     f1_score,
#     confusion_matrix,
#     classification_report,
# )


# # ============================================================
# # PATHS
# # ============================================================

# ROOT = Path(__file__).resolve().parents[1]

# DEV_CSV = ROOT / "training" / "metadata" / "dev.csv"
# CACHE_DIR = ROOT / "training" / "feature_cache"
# MODEL_PATH = ROOT / "training" / "outputs" / "voxshield_cnn_best.pt"

# # Fast evaluation
# N_EVAL_SAMPLES = 1000

# SEED = 42


# # ============================================================
# # CACHE PATH
# # ============================================================

# def cache_path(audio_path):
#     key = hashlib.md5(
#         audio_path.encode("utf-8")
#     ).hexdigest()

#     return CACHE_DIR / f"{key}.npy"


# # ============================================================
# # MODEL
# # Must exactly match the model used during training
# # ============================================================

# class VoxShieldCNN(nn.Module):

#     def __init__(self):
#         super().__init__()

#         self.features = nn.Sequential(

#             nn.Conv2d(
#                 1,
#                 4,
#                 kernel_size=3,
#                 padding=1
#             ),
#             nn.ReLU(),
#             nn.MaxPool2d(2),

#             nn.Conv2d(
#                 4,
#                 8,
#                 kernel_size=3,
#                 padding=1
#             ),
#             nn.ReLU(),
#             nn.MaxPool2d(2),

#             nn.Conv2d(
#                 8,
#                 16,
#                 kernel_size=3,
#                 padding=1
#             ),
#             nn.ReLU(),

#             nn.AdaptiveAvgPool2d(
#                 (1, 1)
#             ),
#         )

#         self.classifier = nn.Sequential(

#             nn.Flatten(),

#             nn.Dropout(0.2),

#             nn.Linear(
#                 16,
#                 2
#             ),
#         )

#     def forward(self, x):

#         x = self.features(x)

#         return self.classifier(x)


# # ============================================================
# # STRATIFIED SAMPLE
# # Creates a balanced-ish evaluation set while preserving
# # the original class proportions as much as possible.
# # ============================================================

# def stratified_sample(df, n, seed=42):

#     rng = np.random.RandomState(seed)

#     classes = df["label"].unique()

#     sampled_parts = []

#     total = len(df)

#     for label in classes:

#         class_df = df[
#             df["label"] == label
#         ]

#         proportion = len(class_df) / total

#         class_n = round(
#             n * proportion
#         )

#         class_n = min(
#             class_n,
#             len(class_df)
#         )

#         sampled = class_df.sample(
#             n=class_n,
#             random_state=seed
#         )

#         sampled_parts.append(
#             sampled
#         )

#     result = pd.concat(
#         sampled_parts
#     )

#     # If rounding caused the count to differ,
#     # adjust it.
#     if len(result) > n:

#         result = result.sample(
#             n=n,
#             random_state=seed
#         )

#     elif len(result) < n:

#         remaining = df.drop(
#             result.index
#         )

#         extra_n = min(
#             n - len(result),
#             len(remaining)
#         )

#         if extra_n > 0:

#             extra = remaining.sample(
#                 n=extra_n,
#                 random_state=seed
#             )

#             result = pd.concat(
#                 [result, extra]
#             )

#     # Shuffle final evaluation set
#     result = result.sample(
#         frac=1,
#         random_state=seed
#     ).reset_index(
#         drop=True
#     )

#     return result


# # ============================================================
# # MAIN
# # ============================================================

# def main():

#     # --------------------------------------------------------
#     # Check files
#     # --------------------------------------------------------

#     if not MODEL_PATH.exists():

#         raise FileNotFoundError(
#             f"Model not found:\n{MODEL_PATH}"
#         )

#     if not DEV_CSV.exists():

#         raise FileNotFoundError(
#             f"Dev CSV not found:\n{DEV_CSV}"
#         )

#     if not CACHE_DIR.exists():

#         raise FileNotFoundError(
#             f"Feature cache not found:\n{CACHE_DIR}"
#         )

#     # --------------------------------------------------------
#     # Load model
#     # --------------------------------------------------------

#     checkpoint = torch.load(
#         MODEL_PATH,
#         map_location="cpu"
#     )

#     model = VoxShieldCNN()

#     model.load_state_dict(
#         checkpoint["model_state_dict"]
#     )

#     model.eval()

#     print(
#         "Loaded model checkpoint."
#     )

#     if "epoch" in checkpoint:

#         print(
#             "Checkpoint epoch:",
#             checkpoint["epoch"]
#         )

#     if "dev_f1" in checkpoint:

#         print(
#             "Checkpoint Dev Macro F1:",
#             checkpoint["dev_f1"]
#         )

#     # --------------------------------------------------------
#     # Load metadata
#     # --------------------------------------------------------

#     df = pd.read_csv(
#         DEV_CSV
#     )

#     print(
#         "\nFull dev set:",
#         len(df)
#     )

#     print(
#         "\nFull dev labels:"
#     )

#     print(
#         df["label_name"].value_counts()
#     )

#     # --------------------------------------------------------
#     # Create stratified 1000-sample evaluation set
#     # --------------------------------------------------------

#     n = min(
#         N_EVAL_SAMPLES,
#         len(df)
#     )

#     df = stratified_sample(
#         df,
#         n=n,
#         seed=SEED
#     )

#     print(
#         f"\nEvaluating {len(df)} mixed dev files..."
#     )

#     print(
#         "\nEvaluation labels:"
#     )

#     print(
#         df["label_name"].value_counts()
#     )

#     # --------------------------------------------------------
#     # Evaluation
#     # --------------------------------------------------------

#     y_true = []
#     y_pred = []

#     missing_cache = 0

#     with torch.no_grad():

#         for i, (_, row) in enumerate(
#             df.iterrows(),
#             1
#         ):

#             feature_file = cache_path(
#                 row["path"]
#             )

#             if not feature_file.exists():

#                 print(
#                     "\nWARNING: Missing cache:"
#                 )

#                 print(
#                     feature_file
#                 )

#                 missing_cache += 1

#                 continue

#             # Load cached log-mel
#             feature = np.load(
#                 feature_file
#             ).astype(
#                 np.float32
#             )

#             # [64, 301]
#             # ->
#             # [1, 1, 64, 301]

#             x = torch.from_numpy(
#                 feature
#             ).unsqueeze(
#                 0
#             ).unsqueeze(
#                 0
#             )

#             output = model(x)

#             prediction = int(
#                 output.argmax(
#                     dim=1
#                 ).item()
#             )

#             y_true.append(
#                 int(row["label"])
#             )

#             y_pred.append(
#                 prediction
#             )

#             if i % 250 == 0:

#                 print(
#                     f"Processed {i}/{len(df)}"
#                 )

#     # --------------------------------------------------------
#     # Check evaluation
#     # --------------------------------------------------------

#     print(
#         "\nMissing cache files:",
#         missing_cache
#     )

#     if len(y_true) == 0:

#         raise RuntimeError(
#             "No samples were evaluated."
#         )

#     # --------------------------------------------------------
#     # Classification report
#     # --------------------------------------------------------

#     print(
#         "\nClassification report:"
#     )

#     print(
#         classification_report(
#             y_true,
#             y_pred,
#             labels=[0, 1],
#             target_names=[
#                 "bonafide",
#                 "spoof",
#             ],
#             zero_division=0,
#         )
#     )

#     # --------------------------------------------------------
#     # Confusion matrix
#     # --------------------------------------------------------

#     cm = confusion_matrix(
#         y_true,
#         y_pred,
#         labels=[0, 1]
#     )

#     print(
#         "Confusion matrix:"
#     )

#     print(cm)

#     # --------------------------------------------------------
#     # Metrics
#     # --------------------------------------------------------

#     accuracy = accuracy_score(
#         y_true,
#         y_pred
#     )

#     macro_f1 = f1_score(
#         y_true,
#         y_pred,
#         average="macro",
#         zero_division=0
#     )

#     spoof_precision = precision_score(
#         y_true,
#         y_pred,
#         pos_label=1,
#         zero_division=0
#     )

#     spoof_recall = recall_score(
#         y_true,
#         y_pred,
#         pos_label=1,
#         zero_division=0
#     )

#     spoof_f1 = f1_score(
#         y_true,
#         y_pred,
#         pos_label=1,
#         zero_division=0
#     )

#     print(
#         "\nSummary:"
#     )

#     print(
#         "Accuracy:",
#         round(accuracy, 4)
#     )

#     print(
#         "Macro F1:",
#         round(macro_f1, 4)
#     )

#     print(
#         "Spoof Precision:",
#         round(spoof_precision, 4)
#     )

#     print(
#         "Spoof Recall:",
#         round(spoof_recall, 4)
#     )

#     print(
#         "Spoof F1:",
#         round(spoof_f1, 4)
#     )


# if __name__ == "__main__":
#     main()
from pathlib import Path
import hashlib

import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)

from torch.utils.data import Dataset, DataLoader


# ============================================================
# CONFIG
# ============================================================

DEV_CSV = Path("training/metadata/dev.csv")
CACHE_DIR = Path("training/feature_cache")
CHECKPOINT = Path("training/outputs/voxshield_cnn_best.pt")

BATCH_SIZE = 64
NUM_WORKERS = 0

torch.set_num_threads(4)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", DEVICE)
print("Torch threads:", torch.get_num_threads())


# ============================================================
# CACHE
# ============================================================

def cache_path(audio_path):

    key = hashlib.md5(
        audio_path.encode("utf-8")
    ).hexdigest()

    return CACHE_DIR / f"{key}.npy"


# ============================================================
# DATASET
# ============================================================

class CachedFeatureDataset(Dataset):

    def __init__(self, df):
        self.df = df.reset_index(drop=True)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):

        row = self.df.iloc[idx]

        feature_file = cache_path(
            row["path"]
        )

        if not feature_file.exists():
            raise FileNotFoundError(
                f"Missing cached feature: {feature_file}"
            )

        x = np.load(
            feature_file
        ).astype(np.float32)

        # [64, frames] -> [1, 64, frames]
        x = torch.from_numpy(
            x
        ).unsqueeze(0)

        y = torch.tensor(
            int(row["label"]),
            dtype=torch.long
        )

        return x, y


# ============================================================
# SAME MODEL ARCHITECTURE AS TRAINING
# ============================================================

class VoxShieldCNN(nn.Module):

    def __init__(self):

        super().__init__()

        self.features = nn.Sequential(

            # Block 1
            nn.Conv2d(
                1,
                12,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.Conv2d(
                12,
                12,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 2
            nn.Conv2d(
                12,
                24,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.Conv2d(
                24,
                24,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 3
            nn.Conv2d(
                24,
                48,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.Conv2d(
                48,
                48,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Final block
            nn.Conv2d(
                48,
                64,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(64),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1)),
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Dropout(0.30),

            nn.Linear(
                64,
                32
            ),

            nn.ReLU(),

            nn.Dropout(0.20),

            nn.Linear(
                32,
                2
            )
        )

    def forward(self, x):

        x = self.features(x)

        return self.classifier(x)


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    print("\nLoading checkpoint...")

    checkpoint = torch.load(
        CHECKPOINT,
        map_location=DEVICE,
        weights_only=False
    )

    model = VoxShieldCNN().to(
        DEVICE
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.eval()

    print(
        "Checkpoint:",
        CHECKPOINT
    )

    print(
        "Saved epoch:",
        checkpoint.get("epoch", "unknown")
    )

    print(
        "Saved dev Macro F1:",
        checkpoint.get("dev_f1", "unknown")
    )

    return model


# ============================================================
# FULL EVALUATION
# ============================================================

def evaluate(model, loader):

    model.eval()

    all_preds = []
    all_targets = []

    total_batches = len(loader)

    print("\nRunning full dev evaluation...")
    print(
        f"Total samples: {len(loader.dataset)}"
    )
    print(
        f"Total batches: {total_batches}"
    )

    with torch.no_grad():

        for batch_idx, (x, y) in enumerate(
            loader,
            1
        ):

            x = x.to(DEVICE)

            logits = model(x)

            preds = torch.argmax(
                logits,
                dim=1
            )

            all_preds.extend(
                preds.cpu().numpy()
            )

            all_targets.extend(
                y.numpy()
            )

            if (
                batch_idx % 50 == 0
                or batch_idx == total_batches
            ):

                print(
                    f"Evaluated "
                    f"{batch_idx}/{total_batches} batches "
                    f"({batch_idx / total_batches * 100:.1f}%)",
                    flush=True
                )

    return (
        np.array(all_targets),
        np.array(all_preds)
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("\nLoading dev metadata...")

    dev_df = pd.read_csv(
        DEV_CSV
    )

    print(
        "Full dev samples:",
        len(dev_df)
    )

    print("\nDev distribution:")

    print(
        dev_df["label_name"].value_counts()
    )

    # ========================================================
    # DATASET
    # ========================================================

    dev_ds = CachedFeatureDataset(
        dev_df
    )

    dev_loader = DataLoader(
        dev_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    # ========================================================
    # MODEL
    # ========================================================

    model = load_model()

    # ========================================================
    # EVALUATE
    # ========================================================

    targets, preds = evaluate(
        model,
        dev_loader
    )

    # ========================================================
    # METRICS
    # ========================================================

    accuracy = accuracy_score(
        targets,
        preds
    )

    macro_f1 = f1_score(
        targets,
        preds,
        average="macro",
        zero_division=0
    )

    weighted_f1 = f1_score(
        targets,
        preds,
        average="weighted",
        zero_division=0
    )

    precision = precision_score(
        targets,
        preds,
        labels=[0, 1],
        average=None,
        zero_division=0
    )

    recall = recall_score(
        targets,
        preds,
        labels=[0, 1],
        average=None,
        zero_division=0
    )

    f1 = f1_score(
        targets,
        preds,
        labels=[0, 1],
        average=None,
        zero_division=0
    )

    cm = confusion_matrix(
        targets,
        preds,
        labels=[0, 1]
    )

    # ========================================================
    # RESULTS
    # ========================================================

    print("\n")
    print("=" * 70)
    print("FULL DEV SET RESULTS")
    print("=" * 70)

    print(
        f"\nTotal samples:       {len(targets)}"
    )

    print(
        f"Accuracy:            {accuracy:.4f}"
    )

    print(
        f"Macro F1:            {macro_f1:.4f}"
    )

    print(
        f"Weighted F1:         {weighted_f1:.4f}"
    )

    print("\n" + "-" * 70)

    print("BONAFIDE")

    print(
        f"Precision:           {precision[0]:.4f}"
    )

    print(
        f"Recall:              {recall[0]:.4f}"
    )

    print(
        f"F1:                  {f1[0]:.4f}"
    )

    print("\nSPOOF")

    print(
        f"Precision:           {precision[1]:.4f}"
    )

    print(
        f"Recall:              {recall[1]:.4f}"
    )

    print(
        f"F1:                  {f1[1]:.4f}"
    )

    print("\n" + "-" * 70)

    print("CONFUSION MATRIX")

    print(
        "                 Predicted"
    )

    print(
        "                 Bonafide     Spoof"
    )

    print(
        f"Actual Bonafide  "
        f"{cm[0, 0]:9d} "
        f"{cm[0, 1]:10d}"
    )

    print(
        f"Actual Spoof     "
        f"{cm[1, 0]:9d} "
        f"{cm[1, 1]:10d}"
    )

    print("\n" + "-" * 70)

    print("CLASSIFICATION REPORT")

    print(
        classification_report(
            targets,
            preds,
            target_names=[
                "bonafide",
                "spoof"
            ],
            digits=4,
            zero_division=0
        )
    )

    print("=" * 70)

    # ========================================================
    # CHECKPOINT VS FULL DEV
    # ========================================================

    checkpoint = torch.load(
        CHECKPOINT,
        map_location="cpu",
        weights_only=False
    )

    saved_f1 = checkpoint.get(
        "dev_f1",
        None
    )

    print("\nCheckpoint comparison:")

    if saved_f1 is not None:

        print(
            f"Epoch-4 validation Macro F1: "
            f"{saved_f1:.4f}"
        )

        print(
            f"Full dev Macro F1:            "
            f"{macro_f1:.4f}"
        )

        print(
            f"Difference:                   "
            f"{macro_f1 - saved_f1:+.4f}"
        )

    print("\nEvaluation complete.")


if __name__ == "__main__":
    main()