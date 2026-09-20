from pathlib import Path
import hashlib
import random

import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from torch.utils.data import Dataset, DataLoader


# ============================================================
# CONFIG
# ============================================================

TRAIN_CSV = Path("training/metadata/train.csv")
DEV_CSV = Path("training/metadata/dev.csv")
CACHE_DIR = Path("training/feature_cache")
OUTPUT_DIR = Path("training/outputs")

BATCH_SIZE = 64

# Controlled first run
EPOCHS = 8

LR = 3e-4

# 5,160 balanced training samples
MAX_TRAIN_SAMPLES = 5160

# Much faster validation than evaluating all 24,844 samples
MAX_DEV_SAMPLES = 4000

NUM_WORKERS = 0
SEED = 42


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

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

        feature_file = cache_path(row["path"])

        if not feature_file.exists():
            raise FileNotFoundError(
                f"Missing cached feature: {feature_file}"
            )

        x = np.load(
            feature_file
        ).astype(np.float32)

        # [64, frames] -> [1, 64, frames]
        x = torch.from_numpy(x).unsqueeze(0)

        y = torch.tensor(
            int(row["label"]),
            dtype=torch.long
        )

        return x, y


# ============================================================
# MODEL
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

            # Compact final block
            nn.Conv2d(
                48,
                64,
                kernel_size=3,
                padding=1
            ),
            nn.BatchNorm2d(64),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1))
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
# METRICS
# ============================================================

def calculate_metrics(targets, preds):

    return {
        "accuracy": accuracy_score(
            targets,
            preds
        ),

        "macro_f1": f1_score(
            targets,
            preds,
            average="macro",
            zero_division=0
        ),

        "bonafide_precision": precision_score(
            targets,
            preds,
            labels=[0],
            average=None,
            zero_division=0
        )[0],

        "bonafide_recall": recall_score(
            targets,
            preds,
            labels=[0],
            average=None,
            zero_division=0
        )[0],

        "bonafide_f1": f1_score(
            targets,
            preds,
            labels=[0],
            average=None,
            zero_division=0
        )[0],

        "spoof_precision": precision_score(
            targets,
            preds,
            labels=[1],
            average=None,
            zero_division=0
        )[0],

        "spoof_recall": recall_score(
            targets,
            preds,
            labels=[1],
            average=None,
            zero_division=0
        )[0],

        "spoof_f1": f1_score(
            targets,
            preds,
            labels=[1],
            average=None,
            zero_division=0
        )[0],
    }


# ============================================================
# EVALUATION
# ============================================================

def evaluate(model, loader, criterion):

    model.eval()

    losses = []
    all_preds = []
    all_targets = []

    with torch.no_grad():

        for x, y in loader:

            x = x.to(DEVICE)
            y = y.to(DEVICE)

            logits = model(x)

            loss = criterion(
                logits,
                y
            )

            losses.append(
                loss.item()
            )

            preds = torch.argmax(
                logits,
                dim=1
            )

            all_preds.extend(
                preds.cpu().numpy()
            )

            all_targets.extend(
                y.cpu().numpy()
            )

    metrics = calculate_metrics(
        all_targets,
        all_preds
    )

    cm = confusion_matrix(
        all_targets,
        all_preds,
        labels=[0, 1]
    )

    return (
        float(np.mean(losses)),
        metrics,
        cm
    )


# ============================================================
# BALANCED TRAIN DATA
# ============================================================

def make_balanced_train_df(df):

    bonafide = df[
        df["label"] == 0
    ]

    spoof = df[
        df["label"] == 1
    ]

    n_each = min(
        len(bonafide),
        len(spoof),
        MAX_TRAIN_SAMPLES // 2
    )

    bonafide = bonafide.sample(
        n=n_each,
        random_state=SEED
    )

    spoof = spoof.sample(
        n=n_each,
        random_state=SEED
    )

    result = pd.concat(
        [
            bonafide,
            spoof
        ]
    )

    return result.sample(
        frac=1,
        random_state=SEED
    ).reset_index(drop=True)


# ============================================================
# STRATIFIED DEV SAMPLE
# ============================================================

def make_dev_df(df):

    if MAX_DEV_SAMPLES is None:
        return df.reset_index(drop=True)

    # Keep dev balanced enough for a useful quick evaluation.
    bonafide = df[
        df["label"] == 0
    ]

    spoof = df[
        df["label"] == 1
    ]

    # Half from each class.
    n_each = MAX_DEV_SAMPLES // 2

    bonafide_n = min(
        n_each,
        len(bonafide)
    )

    spoof_n = min(
        n_each,
        len(spoof)
    )

    bonafide = bonafide.sample(
        n=bonafide_n,
        random_state=SEED
    )

    spoof = spoof.sample(
        n=spoof_n,
        random_state=SEED
    )

    result = pd.concat(
        [
            bonafide,
            spoof
        ]
    )

    return result.sample(
        frac=1,
        random_state=SEED
    ).reset_index(drop=True)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\nLoading metadata...")

    train_df = pd.read_csv(
        TRAIN_CSV
    )

    dev_df = pd.read_csv(
        DEV_CSV
    )

    print("\nOriginal train distribution:")
    print(
        train_df["label_name"].value_counts()
    )

    print("\nOriginal dev distribution:")
    print(
        dev_df["label_name"].value_counts()
    )

    # ========================================================
    # PREPARE DATA
    # ========================================================

    train_df = make_balanced_train_df(
        train_df
    )

    dev_df = make_dev_df(
        dev_df
    )

    print("\nFinal train samples:")
    print(len(train_df))

    print("\nFinal train distribution:")
    print(
        train_df["label_name"].value_counts()
    )

    print("\nFinal dev samples:")
    print(len(dev_df))

    print("\nFinal dev distribution:")
    print(
        dev_df["label_name"].value_counts()
    )

    # ========================================================
    # DATASETS
    # ========================================================

    train_ds = CachedFeatureDataset(
        train_df
    )

    dev_ds = CachedFeatureDataset(
        dev_df
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS
    )

    dev_loader = DataLoader(
        dev_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    # ========================================================
    # CLASS WEIGHTS
    # ========================================================

    counts = (
        train_df["label"]
        .value_counts()
        .sort_index()
    )

    class_weights = (
        len(train_df)
        / (2 * counts.values)
    )

    class_weights = torch.tensor(
        class_weights,
        dtype=torch.float32,
        device=DEVICE
    )

    print(
        "\nClass weights:",
        class_weights.tolist()
    )

    # ========================================================
    # MODEL
    # ========================================================

    model = VoxShieldCNN().to(
        DEVICE
    )

    criterion = nn.CrossEntropyLoss(
        weight=class_weights
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LR,
        weight_decay=1e-4
    )

    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=2
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    best_f1 = -1.0
    best_epoch = 0

    # ========================================================
    # TRAIN
    # ========================================================

    print("\nStarting training...")
    print("=" * 70)

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        model.train()

        running_loss = 0.0

        all_preds = []
        all_targets = []

        for batch_idx, (x, y) in enumerate(
            train_loader,
            1
        ):

            x = x.to(DEVICE)
            y = y.to(DEVICE)

            optimizer.zero_grad()

            logits = model(x)

            loss = criterion(
                logits,
                y
            )

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                max_norm=3.0
            )

            optimizer.step()

            running_loss += loss.item()

            preds = torch.argmax(
                logits,
                dim=1
            )

            all_preds.extend(
                preds.detach()
                .cpu()
                .numpy()
            )

            all_targets.extend(
                y.detach()
                .cpu()
                .numpy()
            )

            # More frequent progress output
            if batch_idx % 20 == 0:

                print(
                    f"Epoch {epoch}/{EPOCHS} "
                    f"| Batch {batch_idx}/{len(train_loader)} "
                    f"| Loss {loss.item():.4f}",
                    flush=True
                )

        # ====================================================
        # TRAIN METRICS
        # ====================================================

        train_loss = (
            running_loss
            / len(train_loader)
        )

        train_metrics = calculate_metrics(
            all_targets,
            all_preds
        )

        # ====================================================
        # DEV
        # ====================================================

        print(
            f"\nEvaluating epoch {epoch}...",
            flush=True
        )

        dev_loss, dev_metrics, cm = evaluate(
            model,
            dev_loader,
            criterion
        )

        scheduler.step(
            dev_metrics["macro_f1"]
        )

        current_lr = (
            optimizer.param_groups[0]["lr"]
        )

        # ====================================================
        # RESULTS
        # ====================================================

        print("\n" + "-" * 70)

        print(
            f"Epoch {epoch}/{EPOCHS}"
        )

        print(
            f"Learning Rate: {current_lr:.6f}"
        )

        print(
            f"Train Loss: {train_loss:.4f}"
        )

        print(
            f"Train Macro F1: "
            f"{train_metrics['macro_f1']:.4f}"
        )

        print(
            f"Dev Loss: {dev_loss:.4f}"
        )

        print(
            f"Dev Accuracy: "
            f"{dev_metrics['accuracy']:.4f}"
        )

        print(
            f"Dev Macro F1: "
            f"{dev_metrics['macro_f1']:.4f}"
        )

        print("\nBONAFIDE")

        print(
            f"  Precision: "
            f"{dev_metrics['bonafide_precision']:.4f}"
        )

        print(
            f"  Recall:    "
            f"{dev_metrics['bonafide_recall']:.4f}"
        )

        print(
            f"  F1:        "
            f"{dev_metrics['bonafide_f1']:.4f}"
        )

        print("\nSPOOF")

        print(
            f"  Precision: "
            f"{dev_metrics['spoof_precision']:.4f}"
        )

        print(
            f"  Recall:    "
            f"{dev_metrics['spoof_recall']:.4f}"
        )

        print(
            f"  F1:        "
            f"{dev_metrics['spoof_f1']:.4f}"
        )

        print("\nConfusion Matrix:")
        print(
            "              Predicted"
        )
        print(
            "              Bonafide  Spoof"
        )
        print(
            f"Actual Bonafide "
            f"{cm[0, 0]:9d} {cm[0, 1]:6d}"
        )
        print(
            f"Actual Spoof    "
            f"{cm[1, 0]:9d} {cm[1, 1]:6d}"
        )

        # ====================================================
        # SAVE BEST
        # ====================================================

        if dev_metrics["macro_f1"] > best_f1:

            best_f1 = (
                dev_metrics["macro_f1"]
            )

            best_epoch = epoch

            checkpoint = {

                "model_state_dict":
                    model.state_dict(),

                "dev_f1":
                    dev_metrics["macro_f1"],

                "dev_accuracy":
                    dev_metrics["accuracy"],

                "bonafide_precision":
                    dev_metrics["bonafide_precision"],

                "bonafide_recall":
                    dev_metrics["bonafide_recall"],

                "bonafide_f1":
                    dev_metrics["bonafide_f1"],

                "spoof_precision":
                    dev_metrics["spoof_precision"],

                "spoof_recall":
                    dev_metrics["spoof_recall"],

                "spoof_f1":
                    dev_metrics["spoof_f1"],

                "epoch":
                    epoch,
            }

            save_path = (
                OUTPUT_DIR
                / "voxshield_cnn_best.pt"
            )

            torch.save(
                checkpoint,
                save_path
            )

            print(
                f"\nSaved BEST checkpoint: "
                f"{save_path}"
            )

        print("-" * 70)

    # ========================================================
    # DONE
    # ========================================================

    print("\nTraining complete.")

    print(
        f"Best Dev Macro F1: "
        f"{best_f1:.4f}"
    )

    print(
        f"Best Epoch: "
        f"{best_epoch}"
    )

    print(
        "\nCheckpoint:"
    )

    print(
        OUTPUT_DIR
        / "voxshield_cnn_best.pt"
    )


if __name__ == "__main__":
    main()