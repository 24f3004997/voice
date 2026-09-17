# VoxShield

VoxShield is a hackathon MVP for screening uploaded audio for possible
voice-cloning or synthetic-speech signals in a banking-fraud context. It is a
decision-support prototype, **not** an identity-verification system or a
guarantee that audio is genuine or synthetic.

The MVP has a complete local upload path, dashboard, and a lazy-loaded local
anti-spoofing adapter for the Hugging Face checkpoint
[`Vansh180/deepfake-audio-wav2vec2`](https://huggingface.co/Vansh180/deepfake-audio-wav2vec2).
The code returns a genuine/synthetic result only after that checkpoint loads and
finishes inference. If it cannot load or run, the API returns `inference_error`
with no score or risk instead of inventing a result.

## Features

- React/Vite cybersecurity dashboard with file, loading, error, result, and reset states.
- FastAPI health endpoint and multipart audio-upload endpoint.
- Validation for supported audio extensions and a 25 MB server-side limit.
- Temporary upload storage that is removed after the request completes.
- A stable `analyse_audio(audio_path)` adapter around a real Wav2Vec2 checkpoint.
- Transparent risk display: it is derived only from a real model probability.
- Fraud-prevention recommendation: independently verify a caller before sensitive actions.

## Tech stack

| Area | Choice |
| --- | --- |
| Frontend | React, Vite, plain CSS |
| Backend | Python, FastAPI, Uvicorn |
| ML integration point | PyTorch, TorchAudio, and Hugging Face Transformers |
| Storage | Temporary local files only |

## Project layout

```text
voxshield/
├── backend/                 # FastAPI API, services, schemas, and ML adapter
├── frontend/                # React/Vite user interface
├── data/sample_audio/       # Place non-sensitive local demo clips here
├── docs/architecture.md     # Diagram and design decisions
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.10 or newer (Python 3.12 was used for this setup)
- Node.js 20 or newer with npm
- A terminal such as PowerShell

## Install and run locally

Open **two PowerShell terminals** in the project root.

### 1. Backend terminal

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The API is then available at `http://127.0.0.1:8000` and interactive API docs
are at `http://127.0.0.1:8000/docs`.

### 2. Frontend terminal

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## Test the API

With the backend running:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "voxshield-backend"
}
```

To test an audio upload, replace the sample path with an audio file on your
computer:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/analyse" -F "file=@C:\path\to\sample.wav"
```

On a successful model run, a valid file returns `status: "success"`, a
`genuine` or `synthetic` label, the checkpoint's actual fake-class probability,
and its derived display risk. If the model cannot load, download, decode, or
run, it returns `inference_error` with `unknown` and `null` score/risk.

Run the backend checks from the `backend` folder:

```powershell
pytest
```

### If `python -m venv` says `No module named pip`

That is a Python installation issue, not a VoxShield code error. Repair or
reinstall Python with `pip` and `venv` enabled (the best fix). As a temporary
local workaround, install the dependencies into the created environment's
site-packages and run Uvicorn through that environment's Python:

```powershell
cd backend
python -m pip install --target .venv\Lib\site-packages -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Confirms the API is running. |
| POST | `/api/analyse` | Receives one audio file in the `file` multipart field. |

## ML model setup

The integration point is `backend/app/ml/detector.py`. By default it uses the
MIT-licensed `Vansh180/deepfake-audio-wav2vec2` Wav2Vec2 audio-classification
checkpoint. Its published configuration identifies class `0` as `real` and
class `1` as `fake`; the model card specifies 16 kHz input and describes a
binary anti-spoofing task trained on a balanced ASVspoof 2021 PA subset.

The adapter deliberately loads it with `AutoFeatureExtractor` and
`AutoModelForAudioClassification`, not an AASIST-specific loader. The first
analysis downloads and caches the roughly 378 MB checkpoint; later runs reuse
the local cache.

Input preprocessing is intentionally small and transparent:

1. Decode the temporary file with `torchaudio`.
2. Average multi-channel audio into mono.
3. Resample to 16 kHz when needed.
4. Pass the complete waveform to the checkpoint's feature extractor.
5. Apply softmax to the two raw logits. `spoof_probability` is specifically the
   `fake` class probability, not the predicted-class confidence or a fraud score.

The UI's `voice_risk` is a display heuristic derived from that real probability:
low `< 0.40`, medium `0.40–0.749...`, high `>= 0.75`. It is not scientifically
or financially validated.

Install all required inference packages with the normal backend command:

```powershell
pip install -r requirements.txt
```

For a presentation machine that must intentionally avoid downloading/loading the
model, use the explicit safe fallback before starting Uvicorn:

```powershell
$env:VOXSHIELD_DETECTOR_MODE = "disabled"
```

This makes the API return `model_not_configured` with `unknown` and `null`
scores. `.env.example` documents the supported value; it is a reference file,
not automatically loaded by Python.

## Dataset setup

No dataset is bundled with this MVP. Store only non-sensitive, licensed clips
inside `data/sample_audio/`; source audio is ignored by Git. For model testing,
keep a small, documented set of known real/synthetic samples and never use
customer calls without the appropriate permission and data controls.

## Known limitations

- The selected checkpoint is a 94.6M-parameter model. Its first local load can
  take time and its CPU inference can be slow for long recordings.
- File extension and declared MIME type validation are not a guarantee that a
  file is decodable audio. Undecodable audio receives an HTTP 400 response.
- A future spoof probability is a model signal, not a calibrated fraud or
  financial-risk decision.
- The app cannot detect every voice clone, establish identity, or replace
  independent verification.
- This MVP has no authentication, database, cloud storage, or audit trail.

## Suggested next steps

1. Install the Phase 2 dependencies and run one known-labeled WAV through the
   endpoint. Record the command output and model version for the demo.
2. Test known real and known synthetic samples that you are licensed to use.
3. Explain the model's narrow training domain and the independent-verification
   workflow in the hackathon presentation.
4. Consider a more extensively benchmarked model only after the MVP is stable.
