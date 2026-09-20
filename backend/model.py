# import os
# import tempfile

# import librosa
# import numpy as np
# import torch
# import torch.nn as nn


# # ---------------------------------------------------------
# # Paths / constants
# # ---------------------------------------------------------

# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# MODEL_PATH = os.path.join(
#     BASE_DIR,
#     "training",
#     "outputs",
#     "voxshield_cnn_best.pt",
# )

# TARGET_SR = 16000
# AUDIO_DURATION = 3
# TARGET_SAMPLES = TARGET_SR * AUDIO_DURATION

# N_MELS = 64
# N_FFT = 512
# HOP_LENGTH = 160


# # ---------------------------------------------------------
# # Model
# # ---------------------------------------------------------

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


# # ---------------------------------------------------------
# # Load model ONCE
# # ---------------------------------------------------------

# device = torch.device("cpu")

# model = VoxShieldCNN().to(device)

# checkpoint = torch.load(
#     MODEL_PATH,
#     map_location=device,
#     weights_only=False,
# )

# if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
#     model.load_state_dict(checkpoint["model_state_dict"])
# else:
#     model.load_state_dict(checkpoint)

# model.eval()


# # ---------------------------------------------------------
# # Feature extraction
# # ---------------------------------------------------------

# def waveform_to_tensor(y: np.ndarray, sample_rate: int):
#     """
#     Convert raw waveform into the same Mel-spectrogram
#     representation used during CNN training.
#     """

#     y = np.asarray(y, dtype=np.float32)

#     # Mono
#     if y.ndim > 1:
#         y = np.mean(y, axis=1)

#     # Resample to 16 kHz
#     if sample_rate != TARGET_SR:
#         y = librosa.resample(
#             y,
#             orig_sr=sample_rate,
#             target_sr=TARGET_SR,
#         )

#     # Exactly 3 seconds
#     if len(y) < TARGET_SAMPLES:
#         y = np.pad(
#             y,
#             (0, TARGET_SAMPLES - len(y)),
#             mode="constant",
#         )
#     else:
#         y = y[-TARGET_SAMPLES:]

#     # Mel spectrogram
#     mel = librosa.feature.melspectrogram(
#         y=y,
#         sr=TARGET_SR,
#         n_fft=N_FFT,
#         hop_length=HOP_LENGTH,
#         n_mels=N_MELS,
#         power=2.0,
#     )

#     mel_db = librosa.power_to_db(
#         mel,
#         ref=np.max,
#     )

#     # Standardization
#     mel_db = (
#         mel_db - mel_db.mean()
#     ) / (mel_db.std() + 1e-6)

#     tensor = torch.from_numpy(
#         mel_db.astype(np.float32)
#     )

#     tensor = tensor.unsqueeze(0).unsqueeze(0)

#     return tensor.to(device)


# # ---------------------------------------------------------
# # CNN prediction
# # ---------------------------------------------------------

# def _predict_waveform(
#     y: np.ndarray,
#     sample_rate: int,
# ):
#     x = waveform_to_tensor(
#         y,
#         sample_rate,
#     )

#     with torch.no_grad():
#         logits = model(x)

#         probabilities = torch.softmax(
#             logits,
#             dim=1,
#         )[0]

#     bonafide_probability = float(
#         probabilities[0].item()
#     )

#     spoof_probability = float(
#         probabilities[1].item()
#     )

#     # 0 = bonafide
#     # 1 = spoof

#     if spoof_probability >= 0.70:
#         verdict = "HIGH RISK"
#         voice_risk = "high"
#         action = "PAUSE AND VERIFY"
#         recommendation = (
#             "Potential synthetic voice signal detected. "
#             "Verify caller identity before continuing."
#         )

#     elif spoof_probability >= 0.50:
#         verdict = "MEDIUM RISK"
#         voice_risk = "medium"
#         action = "MONITOR"
#         recommendation = (
#             "Potential synthetic voice indicators detected. "
#             "Continue monitoring and verify if needed."
#         )

#     else:
#         verdict = "LOW RISK"
#         voice_risk = "low"
#         action = "CONTINUE"
#         recommendation = (
#             "No strong synthetic voice signal detected "
#             "in the current audio window."
#         )

#     label = (
#         "SPOOF"
#         if spoof_probability >= 0.50
#         else "BONAFIDE"
#     )

#     return {
#         "status": "complete",
#         "label": label,
#         "status_label": label,

#         "verdict": verdict,

#         "overall_risk": round(
#             spoof_probability * 100
#         ),

#         "spoof_probability": round(
#             spoof_probability,
#             4,
#         ),

#         "bonafide_probability": round(
#             bonafide_probability,
#             4,
#         ),

#         "voice_risk": voice_risk,

#         "action": action,

#         "recommendation": recommendation,

#         "model_name": "VoxShield CNN",
#     }


# # ---------------------------------------------------------
# # Existing uploaded-file inference
# # ---------------------------------------------------------

# def analyze_audio_file(
#     file_bytes: bytes,
#     filename: str,
# ):
#     suffix = os.path.splitext(filename)[1]

#     with tempfile.NamedTemporaryFile(
#         suffix=suffix,
#         delete=False,
#     ) as temp:

#         temp.write(file_bytes)
#         temp_path = temp.name

#     try:
#         y, sr = librosa.load(
#             temp_path,
#             sr=None,
#             mono=True,
#         )

#         return _predict_waveform(
#             y,
#             sr,
#         )

#     finally:
#         if os.path.exists(temp_path):
#             os.remove(temp_path)


# # ---------------------------------------------------------
# # NEW: Real-time PCM inference
# # ---------------------------------------------------------

# def analyze_pcm_audio(
#     audio: np.ndarray,
#     sample_rate: int,
# ):
#     """
#     Analyze raw PCM microphone audio.

#     Frontend sends:
#         Int16 PCM
#         mono
#         browser's native sample rate

#     Backend converts it into the same
#     16 kHz / 3 second representation
#     used by the trained CNN.
#     """

#     audio = np.asarray(
#         audio,
#         dtype=np.float32,
#     )

#     if audio.size == 0:
#         raise ValueError(
#             "Empty audio window."
#         )

#     # Int16 -> float32
#     if np.max(np.abs(audio)) > 1.5:
#         audio = audio / 32768.0

#     return _predict_waveform(
#         audio,
#         sample_rate,
#     )
import os
import tempfile

import librosa
import numpy as np
import torch
import torch.nn as nn


# ---------------------------------------------------------
# Paths / constants
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "training",
    "outputs",
    "voxshield_cnn_best.pt",
)

TARGET_SR = 16000
AUDIO_DURATION = 3
TARGET_SAMPLES = TARGET_SR * AUDIO_DURATION

N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160


# ---------------------------------------------------------
# Model
# EXACT SAME ARCHITECTURE AS TRAINING
# ---------------------------------------------------------

class VoxShieldCNN(nn.Module):

    def __init__(self):

        super().__init__()

        self.features = nn.Sequential(

            # Block 1
            nn.Conv2d(
                1,
                12,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.Conv2d(
                12,
                12,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(12),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 2
            nn.Conv2d(
                12,
                24,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.Conv2d(
                24,
                24,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(24),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Block 3
            nn.Conv2d(
                24,
                48,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.Conv2d(
                48,
                48,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(48),
            nn.ReLU(),

            nn.MaxPool2d(2),

            # Final block
            nn.Conv2d(
                48,
                64,
                kernel_size=3,
                padding=1,
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


# ---------------------------------------------------------
# Load model ONCE
# ---------------------------------------------------------

device = torch.device("cpu")

model = VoxShieldCNN().to(device)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
    weights_only=False,
)

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


# ---------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------

def waveform_to_tensor(
    y: np.ndarray,
    sample_rate: int,
):

    """
    Convert raw waveform into the same
    Mel-spectrogram representation used
    during CNN training.
    """

    y = np.asarray(
        y,
        dtype=np.float32,
    )

    # Mono
    if y.ndim > 1:
        y = np.mean(
            y,
            axis=1,
        )

    # Resample to 16 kHz
    if sample_rate != TARGET_SR:

        y = librosa.resample(
            y,
            orig_sr=sample_rate,
            target_sr=TARGET_SR,
        )

    # Exactly 3 seconds
    if len(y) < TARGET_SAMPLES:

        y = np.pad(
            y,
            (
                0,
                TARGET_SAMPLES - len(y),
            ),
            mode="constant",
        )

    else:

        # Keep the latest 3 seconds
        y = y[-TARGET_SAMPLES:]

    # Mel spectrogram
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=TARGET_SR,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        fmin=20,
        fmax=7600,
        power=2.0,
    )

    # Log-mel
    mel_db = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    # Standardization
    mel_db = (
        mel_db - mel_db.mean()
    ) / (
        mel_db.std() + 1e-6
    )

    tensor = torch.from_numpy(
        mel_db.astype(np.float32)
    )

    tensor = tensor.unsqueeze(
        0
    ).unsqueeze(
        0
    )

    return tensor.to(device)


# ---------------------------------------------------------
# CNN prediction
# ---------------------------------------------------------

def _predict_waveform(
    y: np.ndarray,
    sample_rate: int,
):

    x = waveform_to_tensor(
        y,
        sample_rate,
    )

    with torch.no_grad():

        logits = model(x)

        probabilities = torch.softmax(
            logits,
            dim=1,
        )[0]

    # 0 = bonafide
    # 1 = spoof

    bonafide_probability = float(
        probabilities[0].item()
    )

    spoof_probability = float(
        probabilities[1].item()
    )

    # Risk band
    if spoof_probability >= 0.70:

        verdict = "HIGH RISK"
        voice_risk = "high"
        action = "PAUSE AND VERIFY"

        recommendation = (
            "Potential synthetic voice signal detected. "
            "Verify caller identity before continuing."
        )

    elif spoof_probability >= 0.50:

        verdict = "MEDIUM RISK"
        voice_risk = "medium"
        action = "MONITOR"

        recommendation = (
            "Potential synthetic voice indicators detected. "
            "Continue monitoring and verify if needed."
        )

    else:

        verdict = "LOW RISK"
        voice_risk = "low"
        action = "CONTINUE"

        recommendation = (
            "No strong synthetic voice signal detected "
            "in the current audio window."
        )

    label = (
        "SPOOF"
        if spoof_probability >= 0.50
        else "BONAFIDE"
    )

    return {

        "status": "complete",

        "label": label,

        "status_label": label,

        "verdict": verdict,

        "overall_risk": round(
            spoof_probability * 100
        ),

        "spoof_probability": round(
            spoof_probability,
            4,
        ),

        "bonafide_probability": round(
            bonafide_probability,
            4,
        ),

        "voice_risk": voice_risk,

        "action": action,

        "recommendation": recommendation,

        "model_name": "VoxShield CNN",
    }


# ---------------------------------------------------------
# Uploaded-file inference
# ---------------------------------------------------------

def analyze_audio_file(
    file_bytes: bytes,
    filename: str,
):

    suffix = os.path.splitext(
        filename
    )[1]

    with tempfile.NamedTemporaryFile(
        suffix=suffix,
        delete=False,
    ) as temp:

        temp.write(file_bytes)

        temp_path = temp.name

    try:

        y, sr = librosa.load(
            temp_path,
            sr=None,
            mono=True,
        )

        return _predict_waveform(
            y,
            sr,
        )

    finally:

        if os.path.exists(
            temp_path
        ):

            os.remove(
                temp_path
            )


# ---------------------------------------------------------
# Real-time PCM inference
# ---------------------------------------------------------

def analyze_pcm_audio(
    audio: np.ndarray,
    sample_rate: int,
):

    """
    Analyze raw PCM microphone audio.

    Frontend sends:
        Int16 PCM
        mono
        browser's native sample rate

    Backend converts it into the same
    16 kHz / 3 second representation
    used by the trained CNN.
    """

    audio = np.asarray(
        audio,
        dtype=np.float32,
    )

    if audio.size == 0:

        raise ValueError(
            "Empty audio window."
        )

    # Int16 -> float32
    if np.max(
        np.abs(audio)
    ) > 1.5:

        audio = audio / 32768.0

    return _predict_waveform(
        audio,
        sample_rate,
    )