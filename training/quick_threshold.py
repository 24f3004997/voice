from pathlib import Path
import hashlib

import numpy as np
import pandas as pd
import torch
import torch.nn as nn


ROOT = Path(__file__).resolve().parents[1]

DEV_CSV = ROOT / "training" / "metadata" / "dev.csv"
CACHE_DIR = ROOT / "training" / "feature_cache"
MODEL_PATH = ROOT / "training" / "outputs" / "voxshield_cnn_best.pt"

N_SAMPLES = 1000
SEED = 42


def cache_path(audio_path):
    key = hashlib.md5(
        audio_path.encode("utf-8")
    ).hexdigest()

    return CACHE_DIR / f"{key}.npy"


class VoxShieldCNN(nn.Module):

    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 4, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(4, 8, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(8, 16, 3, padding=1),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1)),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.2),
            nn.Linear(16, 2),
        )

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x)


def stratified_sample(df, n, seed):

    rng = np.random.RandomState(seed)

    parts = []

    for label in [0, 1]:

        group = df[df["label"] == label]

        count = round(
            n * len(group) / len(df)
        )

        count = min(
            count,
            len(group)
        )

        parts.append(
            group.sample(
                n=count,
                random_state=seed
            )
        )

    result = pd.concat(parts)

    return result.sample(
        frac=1,
        random_state=seed
    ).reset_index(drop=True)


def main():

    checkpoint = torch.load(
        MODEL_PATH,
        map_location="cpu"
    )

    model = VoxShieldCNN()

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.eval()

    df = pd.read_csv(DEV_CSV)

    df = stratified_sample(
        df,
        min(N_SAMPLES, len(df)),
        SEED
    )

    print("Samples:", len(df))
    print(df["label_name"].value_counts())

    y_true = []
    spoof_probs = []

    with torch.no_grad():

        for i, (_, row) in enumerate(
            df.iterrows(),
            1
        ):

            feature_file = cache_path(
                row["path"]
            )

            feature = np.load(
                feature_file
            ).astype(
                np.float32
            )

            x = torch.from_numpy(
                feature
            ).unsqueeze(0).unsqueeze(0)

            logits = model(x)

            probs = torch.softmax(
                logits,
                dim=1
            )

            spoof_probability = float(
                probs[0, 1].item()
            )

            y_true.append(
                int(row["label"])
            )

            spoof_probs.append(
                spoof_probability
            )

            if i % 250 == 0:
                print(
                    f"Processed {i}/{len(df)}"
                )

    y_true = np.array(y_true)
    spoof_probs = np.array(spoof_probs)

    print("\nThreshold results")
    print("=" * 70)

    print(
        f"{'Threshold':<12}"
        f"{'Bonafide Recall':<20}"
        f"{'Spoof Recall':<18}"
        f"{'Accuracy':<15}"
    )

    print("-" * 70)

    for threshold in [
        0.10,
        0.20,
        0.30,
        0.40,
        0.50,
        0.60,
        0.70,
        0.80,
        0.90,
    ]:

        predictions = (
            spoof_probs >= threshold
        ).astype(int)

        bonafide_mask = (
            y_true == 0
        )

        spoof_mask = (
            y_true == 1
        )

        bonafide_recall = (
            np.mean(
                predictions[bonafide_mask] == 0
            )
        )

        spoof_recall = (
            np.mean(
                predictions[spoof_mask] == 1
            )
        )

        accuracy = np.mean(
            predictions == y_true
        )

        print(
            f"{threshold:<12.2f}"
            f"{bonafide_recall:<20.3f}"
            f"{spoof_recall:<18.3f}"
            f"{accuracy:<15.3f}"
        )


if __name__ == "__main__":
    main()