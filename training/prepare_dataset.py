
from pathlib import Path
import csv

# ============================================================
# VoxShield - ASVspoof 2019 LA Dataset Preparation
# ============================================================

# This file is inside:
# voxshield/training/prepare_dataset.py

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset" / "LA"

PROTOCOL_DIR = DATASET_DIR / "ASVspoof2019_LA_cm_protocols"

TRAIN_AUDIO_DIR = (
    DATASET_DIR / "ASVspoof2019_LA_train" / "flac"
)

DEV_AUDIO_DIR = (
    DATASET_DIR / "ASVspoof2019_LA_dev" / "flac"
)

OUTPUT_DIR = BASE_DIR / "metadata"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def find_audio(audio_dir, file_id):
    """
    Locate an audio file using its ASVspoof file ID.
    Supports FLAC and WAV.
    """

    for extension in [".flac", ".wav"]:
        path = audio_dir / f"{file_id}{extension}"

        if path.exists():
            return path

    return None


def read_protocol(protocol_path, audio_dir):
    """
    Read ASVspoof protocol and create labeled metadata.

    ASVspoof LA protocol format:
    speaker_id file_id system_id attack_id label

    Example labels:
    bonafide -> 0
    spoof    -> 1
    """

    rows = []

    if not protocol_path.exists():
        raise FileNotFoundError(
            f"Protocol file not found: {protocol_path}"
        )

    with open(
        protocol_path,
        "r",
        encoding="utf-8",
        errors="ignore"
    ) as file:

        for line_number, line in enumerate(file, start=1):

            line = line.strip()

            if not line:
                continue

            parts = line.split()

            # ASVspoof LA protocol has 5 columns.
            if len(parts) < 5:
                print(
                    f"Skipping malformed line {line_number}: {line}"
                )
                continue

            speaker_id = parts[0]
            file_id = parts[1]
            label = parts[-1].lower()

            if label == "bonafide":
                numeric_label = 0

            elif label == "spoof":
                numeric_label = 1

            else:
                print(
                    f"Unknown label at line {line_number}: {label}"
                )
                continue

            audio_path = find_audio(audio_dir, file_id)

            if audio_path is None:
                print(
                    f"Audio missing for file ID: {file_id}"
                )
                continue

            rows.append({
                "path": str(audio_path.resolve()),
                "file_id": file_id,
                "speaker_id": speaker_id,
                "label": numeric_label,
                "label_name": label
            })

    return rows


def save_csv(rows, output_path):

    fieldnames = [
        "path",
        "file_id",
        "speaker_id",
        "label",
        "label_name"
    ]

    with open(
        output_path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved: {output_path}")
    print(f"Total samples: {len(rows)}")


def print_statistics(rows, name):

    bonafide = sum(
        row["label"] == 0 for row in rows
    )

    spoof = sum(
        row["label"] == 1 for row in rows
    )

    speakers = len(
        set(row["speaker_id"] for row in rows)
    )

    print(f"\n{name} statistics")
    print("-" * 40)
    print(f"Total audio : {len(rows)}")
    print(f"Bonafide    : {bonafide}")
    print(f"Spoof       : {spoof}")
    print(f"Speakers    : {speakers}")


def main():

    train_protocol = (
        PROTOCOL_DIR / "ASVspoof2019.LA.cm.train.trn.txt"
    )

    dev_protocol = (
        PROTOCOL_DIR / "ASVspoof2019.LA.cm.dev.trl.txt"
    )

    print("Preparing VoxShield dataset...")
    print(f"Dataset directory: {DATASET_DIR}")

    train_rows = read_protocol(
        train_protocol,
        TRAIN_AUDIO_DIR
    )

    dev_rows = read_protocol(
        dev_protocol,
        DEV_AUDIO_DIR
    )

    if len(train_rows) == 0:
        raise RuntimeError(
            "No training samples found. "
            "Check dataset paths and protocol files."
        )

    if len(dev_rows) == 0:
        raise RuntimeError(
            "No development samples found. "
            "Check ASVspoof2019_LA_dev/flac."
        )

    save_csv(
        train_rows,
        OUTPUT_DIR / "train.csv"
    )

    save_csv(
        dev_rows,
        OUTPUT_DIR / "dev.csv"
    )

    print_statistics(train_rows, "TRAIN")
    print_statistics(dev_rows, "DEV")

    print("\nDataset preparation complete!")


if __name__ == "__main__":
    main()