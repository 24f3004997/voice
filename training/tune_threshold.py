from pathlib import Path

import numpy as np
import pandas as pd
import librosa
import torch
import torch.nn as nn

from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


ROOT = Path(__file__).resolve().parents[1]

DEV_CSV = ROOT / "training" / "metadata" / "dev.csv"
MODEL_PATH = ROOT / "training" / "outputs" / "voxshield_cnn_best.pt"

SAMPLE_RATE = 16000
AUDIO_SECONDS = 3
NUM_SAMPLES = SAMPLE_RATE * AUDIO_SECONDS

N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160


def load_logmel(path):
    audio, _ = librosa.load(
        str(path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    if len(audio) < NUM_SAMPLES:
        audio = np.pad(
            audio,
            (0, NUM_SAMPLES - len(audio)),
            mode="constant",
        )
    else:
        audio = audio[:NUM_SAMPLES]

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=SAMPLE_RATE,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        fmin=20,
        fmax=7600,
        power=2.0,
    )

    logmel = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    logmel = (
        logmel - logmel.mean()
    ) / (logmel.std() + 1e-6)

    return torch.tensor(
        logmel,
        dtype=torch.float32,
    ).unsqueeze(0).unsqueeze(0)


class VoxShieldCNN(nn.Module):
    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(16, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1)),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.3),
            nn.Linear(128, 2),
        )

    def forward(self, x):
        return self.classifier(
            self.features(x)
        )


def main():
    checkpoint = torch.load(
        MODEL_PATH,
        map_location="cpu",
    )

    model = VoxShieldCNN()
    model.load_state_dict(
        checkpoint["model_state_dict"]
    )
    model.eval()

    df = pd.read_csv(DEV_CSV)

    y_true = []
    spoof_probabilities = []

    print(f"Collecting scores from {len(df)} files...")

    with torch.no_grad():
        for index, row in df.iterrows():
            features = load_logmel(row["path"])

            logits = model(features)
            probabilities = torch.softmax(
                logits,
                dim=1,
            )

            spoof_probability = float(
                probabilities[0, 1].item()
            )

            y_true.append(int(row["label"]))
            spoof_probabilities.append(
                spoof_probability
            )

            if (index + 1) % 1000 == 0:
                print(
                    f"Processed {index + 1}/{len(df)}"
                )

    y_true = np.array(y_true)
    spoof_probabilities = np.array(
        spoof_probabilities
    )

    print("\nThreshold results:\n")

    for threshold in [
        0.30,
        0.40,
        0.50,
        0.60,
        0.70,
        0.80,
        0.90,
    ]:
        y_pred = (
            spoof_probabilities >= threshold
        ).astype(int)

        cm = confusion_matrix(
            y_true,
            y_pred,
        )

        spoof_precision = precision_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        spoof_recall = recall_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        spoof_f1 = f1_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        bonafide_recall = cm[0, 0] / max(
            cm[0].sum(),
            1,
        )

        print(
            f"Threshold: {threshold:.2f} | "
            f"Spoof Precision: {spoof_precision:.4f} | "
            f"Spoof Recall: {spoof_recall:.4f} | "
            f"Spoof F1: {spoof_f1:.4f} | "
            f"Bonafide Recall: {bonafide_recall:.4f}"
        )

        print("Confusion matrix:")
        print(cm)
        print()


if __name__ == "__main__":
    main()