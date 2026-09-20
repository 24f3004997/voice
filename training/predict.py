# from pathlib import Path
# import sys

# import numpy as np
# import librosa
# import torch
# import torch.nn as nn


# # ============================================================
# # CONFIG
# # ============================================================

# ROOT = Path(__file__).resolve().parents[1]

# MODEL_PATH = (
#     ROOT
#     / "training"
#     / "outputs"
#     / "voxshield_cnn_best.pt"
# )

# SAMPLE_RATE = 16000
# AUDIO_SECONDS = 3
# NUM_SAMPLES = SAMPLE_RATE * AUDIO_SECONDS

# N_MELS = 64
# N_FFT = 512
# HOP_LENGTH = 160

# THRESHOLD = 0.50


# # ============================================================
# # MODEL
# # ============================================================

# class VoxShieldCNN(nn.Module):

#     def __init__(self):
#         super().__init__()

#         self.features = nn.Sequential(
#             nn.Conv2d(1, 4, 3, padding=1),
#             nn.ReLU(),
#             nn.MaxPool2d(2),

#             nn.Conv2d(4, 8, 3, padding=1),
#             nn.ReLU(),
#             nn.MaxPool2d(2),

#             nn.Conv2d(8, 16, 3, padding=1),
#             nn.ReLU(),

#             nn.AdaptiveAvgPool2d((1, 1)),
#         )

#         self.classifier = nn.Sequential(
#             nn.Flatten(),
#             nn.Dropout(0.2),
#             nn.Linear(16, 2),
#         )

#     def forward(self, x):
#         x = self.features(x)
#         return self.classifier(x)


# # ============================================================
# # FEATURE EXTRACTION
# # ============================================================

# def extract_logmel(audio_path):

#     audio, _ = librosa.load(
#         str(audio_path),
#         sr=SAMPLE_RATE,
#         mono=True,
#     )

#     if len(audio) < NUM_SAMPLES:

#         audio = np.pad(
#             audio,
#             (
#                 0,
#                 NUM_SAMPLES - len(audio)
#             ),
#             mode="constant",
#         )

#     else:

#         audio = audio[:NUM_SAMPLES]

#     mel = librosa.feature.melspectrogram(
#         y=audio,
#         sr=SAMPLE_RATE,
#         n_fft=N_FFT,
#         hop_length=HOP_LENGTH,
#         n_mels=N_MELS,
#         fmin=20,
#         fmax=7600,
#         power=2.0,
#     )

#     logmel = librosa.power_to_db(
#         mel,
#         ref=np.max,
#     )

#     logmel = (
#         logmel - logmel.mean()
#     ) / (
#         logmel.std() + 1e-6
#     )

#     return torch.tensor(
#         logmel,
#         dtype=torch.float32,
#     ).unsqueeze(0).unsqueeze(0)


# # ============================================================
# # PREDICT
# # ============================================================

# def predict(audio_path):

#     audio_path = Path(audio_path)

#     if not audio_path.exists():

#         raise FileNotFoundError(
#             f"Audio file not found:\n{audio_path}"
#         )

#     checkpoint = torch.load(
#         MODEL_PATH,
#         map_location="cpu"
#     )

#     model = VoxShieldCNN()

#     model.load_state_dict(
#         checkpoint["model_state_dict"]
#     )

#     model.eval()

#     features = extract_logmel(
#         audio_path
#     )

#     with torch.no_grad():

#         logits = model(features)

#         probabilities = torch.softmax(
#             logits,
#             dim=1
#         )

#     bonafide_probability = float(
#         probabilities[0, 0].item()
#     )

#     spoof_probability = float(
#         probabilities[0, 1].item()
#     )

#     if spoof_probability >= THRESHOLD:

#         verdict = "SPOOF"

#     else:

#         verdict = "BONAFIDE"

#     return {
#         "verdict": verdict,
#         "spoof_probability": spoof_probability,
#         "bonafide_probability": bonafide_probability,
#     }


# # ============================================================
# # CLI
# # ============================================================

# def main():

#     if len(sys.argv) < 2:

#         print(
#             "Usage:"
#         )

#         print(
#             "python training/predict.py <audio_file>"
#         )

#         sys.exit(1)

#     audio_path = sys.argv[1]

#     result = predict(
#         audio_path
#     )

#     print("\n" + "=" * 50)
#     print("VoxShield Result")
#     print("=" * 50)

#     print(
#         "Verdict:",
#         result["verdict"]
#     )

#     print(
#         "Spoof probability:",
#         f"{result['spoof_probability'] * 100:.2f}%"
#     )

#     print(
#         "Bonafide probability:",
#         f"{result['bonafide_probability'] * 100:.2f}%"
#     )

#     print("=" * 50)


# if __name__ == "__main__":
#     main()
from pathlib import Path
import sys

import numpy as np
import librosa
import torch
import torch.nn as nn


# ============================================================
# CONFIG
# ============================================================

ROOT = Path(
    __file__
).resolve().parents[1]

MODEL_PATH = (
    ROOT
    / "training"
    / "outputs"
    / "voxshield_cnn_best.pt"
)

SAMPLE_RATE = 16000
AUDIO_SECONDS = 3
NUM_SAMPLES = SAMPLE_RATE * AUDIO_SECONDS

N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160

THRESHOLD = 0.50


# ============================================================
# MODEL
# EXACT SAME ARCHITECTURE AS TRAINING
# ============================================================

class VoxShieldCNN(nn.Module):

    def __init__(self):

        super().__init__()

        self.features = nn.Sequential(

            # Block 1
            nn.Conv2d(
                1,
                12,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.Conv2d(
                12,
                12,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 2
            nn.Conv2d(
                12,
                24,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.Conv2d(
                24,
                24,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 3
            nn.Conv2d(
                24,
                48,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.Conv2d(
                48,
                48,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Final block
            nn.Conv2d(
                48,
                64,
                3,
                padding=1,
            ),
            nn.BatchNorm2d(64),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d(
                (1, 1)
            ),
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Dropout(0.30),

            nn.Linear(
                64,
                32,
            ),

            nn.ReLU(),

            nn.Dropout(0.20),

            nn.Linear(
                32,
                2,
            ),
        )

    def forward(self, x):

        x = self.features(x)

        return self.classifier(x)


# ============================================================
# FEATURE EXTRACTION
# ============================================================

def extract_logmel(audio_path):

    audio, _ = librosa.load(
        str(audio_path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    # Exactly 3 seconds
    if len(audio) < NUM_SAMPLES:

        audio = np.pad(
            audio,
            (
                0,
                NUM_SAMPLES - len(audio),
            ),
            mode="constant",
        )

    else:

        # Keep latest 3 seconds.
        # Same behavior as backend/model.py.
        audio = audio[-NUM_SAMPLES:]

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
    ) / (
        logmel.std() + 1e-6
    )

    return torch.tensor(
        logmel,
        dtype=torch.float32,
    ).unsqueeze(
        0
    ).unsqueeze(
        0
    )


# ============================================================
# PREDICT
# ============================================================

def predict(audio_path):

    audio_path = Path(
        audio_path
    )

    if not audio_path.exists():

        raise FileNotFoundError(
            f"Audio file not found:\n{audio_path}"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location="cpu",
        weights_only=False,
    )

    model = VoxShieldCNN()

    if (
        isinstance(checkpoint, dict)
        and "model_state_dict" in checkpoint
    ):

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

    else:

        model.load_state_dict(
            checkpoint
        )

    model.eval()

    features = extract_logmel(
        audio_path
    )

    with torch.no_grad():

        logits = model(
            features
        )

        probabilities = torch.softmax(
            logits,
            dim=1,
        )

    bonafide_probability = float(
        probabilities[0, 0].item()
    )

    spoof_probability = float(
        probabilities[0, 1].item()
    )

    if spoof_probability >= THRESHOLD:

        verdict = "SPOOF"

    else:

        verdict = "BONAFIDE"

    return {

        "verdict": verdict,

        "spoof_probability":
            spoof_probability,

        "bonafide_probability":
            bonafide_probability,
    }


# ============================================================
# CLI
# ============================================================

def main():

    if len(sys.argv) < 2:

        print(
            "Usage:"
        )

        print(
            "python training/predict.py <audio_file>"
        )

        sys.exit(1)

    audio_path = sys.argv[1]

    result = predict(
        audio_path
    )

    print(
        "\n" + "=" * 50
    )

    print(
        "VoxShield Result"
    )

    print(
        "=" * 50
    )

    print(
        "Verdict:",
        result["verdict"]
    )

    print(
        "Spoof probability:",
        f"{result['spoof_probability'] * 100:.2f}%"
    )

    print(
        "Bonafide probability:",
        f"{result['bonafide_probability'] * 100:.2f}%"
    )

    print(
        "=" * 50
    )


if __name__ == "__main__":

    main()