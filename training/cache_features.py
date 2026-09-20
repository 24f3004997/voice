from pathlib import Path
import hashlib

import numpy as np
import pandas as pd
import librosa
from tqdm import tqdm


ROOT = Path(__file__).resolve().parents[1]

TRAIN_CSV = ROOT / "training" / "metadata" / "train.csv"
DEV_CSV = ROOT / "training" / "metadata" / "dev.csv"

CACHE_DIR = ROOT / "training" / "feature_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 16000
AUDIO_SECONDS = 3
NUM_SAMPLES = SAMPLE_RATE * AUDIO_SECONDS

N_MELS = 64
N_FFT = 512
HOP_LENGTH = 160


def feature_path(audio_path):
    key = hashlib.md5(
        str(audio_path).encode("utf-8")
    ).hexdigest()

    return CACHE_DIR / f"{key}.npy"


def extract_feature(audio_path):
    audio, _ = librosa.load(
        str(audio_path),
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

    return logmel.astype(np.float32)


def cache_csv(csv_path):
    df = pd.read_csv(csv_path)

    print(f"\nCaching: {csv_path.name}")
    print(f"Total files: {len(df)}")

    failed = 0

    for _, row in tqdm(
        df.iterrows(),
        total=len(df),
    ):
        audio_path = row["path"]
        output_path = feature_path(audio_path)

        if output_path.exists():
            continue

        try:
            feature = extract_feature(audio_path)
            np.save(output_path, feature)
        except Exception as exc:
            failed += 1
            print(
                f"\nFailed: {audio_path}\n{exc}"
            )

    print(
        f"Finished {csv_path.name}. "
        f"Failed: {failed}"
    )


def main():
    cache_csv(TRAIN_CSV)
    cache_csv(DEV_CSV)

    print("\nFeature caching complete.")
    print(f"Cache directory: {CACHE_DIR}")


if __name__ == "__main__":
    main()