# VoxShield MVP architecture

```text
Browser (React + Vite)
        |
        | POST /api/analyse (multipart audio file)
        v
FastAPI route
        |
        v
Upload service
  - extension and content-type check
  - 25 MB streaming size limit
  - short-lived temporary file
        |
        v
ML adapter: analyse_audio(audio_path)
  - Default: Wav2Vec2 Hugging Face anti-spoofing checkpoint
  - Optional disabled mode: no prediction / no score
        |
        v
Risk service
  - only maps an actual spoof probability
  - low < 0.40, medium < 0.75, high >= 0.75
        |
        v
JSON response -> React result card
```

## Why this is the simplest useful design

There is one backend process and one frontend development server. There is no
database because this MVP does not need historical analysis records. The upload
is held only in a temporary file so audio can be passed to model code that
expects a path; it is deleted in `finally` after analysis.

## Result integrity rules

`spoof_probability` is only populated after the Wav2Vec2 checkpoint completes
inference. It equals the softmax probability of the checkpoint's `fake` class.
The risk value is derived from that probability and is not independently
predicted. If no probability is returned, both fields remain `null`; the UI
labels that clearly. `NotConfiguredDetector` remains an explicit disabled-mode
fallback and never creates demo values.

## Model-adapter contract

Any future adapter must return these fields through `DetectionResult`:

| Field | Meaning |
| --- | --- |
| `label` | The model's documented class label. |
| `spoof_probability` | Real score, 0–1, or `None` when the model does not provide one. |
| `model_name` | Concrete model/checkpoint identity. |
| `processing_time_ms` | Measured local inference time. |
| `status` | `success`, `model_not_configured`, or `inference_error`. |
| `explanation` | Evidence-backed, user-readable notes. |

The selected checkpoint's source, license, preprocessing, and class mapping are
documented in the root README. Before a demo, test it on known-labeled, licensed
clips; the model's self-reported metrics do not establish production accuracy.
