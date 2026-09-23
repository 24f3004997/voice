# import asyncio
# import io
# import json
# import time
# import wave
# import os
# import soundfile as sf
# from datetime import datetime

# import numpy as np
# from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware

# try:
#     from .model import analyze_audio_file, analyze_pcm_audio
# except ImportError:
#     from model import analyze_audio_file, analyze_pcm_audio


# app = FastAPI(title="VoxShield API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://127.0.0.1:5173",
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# ALLOWED_EXTENSIONS = {"wav", "mp3", "m4a", "flac", "ogg", "webm"}

# # ============================================================
# # REAL-TIME OVERVIEW STATE
# # ============================================================

# overview_state = {
#     "active_calls": 0,
#     "active_calls_delta": "Live",
#     "high_risk_calls": 0,
#     "calls_analyzed_today": 0,
#     "calls_analyzed_delta": "Live",
#     "risk_activity": [],
#     "system_status": {
#         "detection": True,
#         "speaker_verification": True,
#         "behavior_analysis": True,
#         "transaction_risk": True,
#     },
#     "system_status_label": "Live configuration",
#     "recent_incidents": [],
#     "verification_pending": 0,
#     "actions_paused": 0,
#     "analysis_sources": {
#         "live_calls": 0,
#         "uploaded_audio": 0,
#     },
# }
# voice_profiles = [
#     {
#         "id": "VP-001",
#         "name": "Aarav Mehta",
#         "role": "Executive",
#         "status": "ACTIVE",
#         "samples": 18,
#         "verified": "Today",
#         "drift": "LOW",
#     },
#     {
#         "id": "VP-002",
#         "name": "Riya Sharma",
#         "role": "Finance",
#         "status": "ACTIVE",
#         "samples": 14,
#         "verified": "Today",
#         "drift": "LOW",
#     },
#     {
#         "id": "VP-003",
#         "name": "Kabir Singh",
#         "role": "Operations",
#         "status": "REVIEW",
#         "samples": 11,
#         "verified": "2 days ago",
#         "drift": "HIGH",
#     },
# ]
# _live_sessions = {}


# def _risk_level(risk: int) -> str:
#     if risk >= 70:
#         return "HIGH"
#     if risk >= 50:
#         return "MEDIUM"
#     return "LOW"


# def _record_risk_activity(risk: int):
#     now = datetime.now()
#     current_time = now.strftime("%H:%M")

#     if not overview_state["risk_activity"] or overview_state["risk_activity"][-1]["time"] != current_time:
#         overview_state["risk_activity"].append({
#             "time": current_time,
#             "low": 0,
#             "medium": 0,
#             "high": 0,
#         })

#     point = overview_state["risk_activity"][-1]
#     level = _risk_level(risk).lower()
#     point[level] += 1
#     overview_state["risk_activity"] = overview_state["risk_activity"][-7:]


# def _add_incident(risk: int, label: str, detection: str, source="LIVE CALL"):
#     now = datetime.now()
#     level = _risk_level(risk)
#     overview_state["recent_incidents"].insert(0, {
#         "id": f"VX-{now.strftime('%H%M%S%f')[:8]}",
#         "time": now.strftime("%H:%M"),
#         "caller": "Local Microphone",
#         "role": "Live Call",
#         "risk": int(risk),
#         "level": level,
#         "detection": detection,
#         "transaction": "—",
#         "source": source,
#         "status": "OPEN" if level == "HIGH" else "UNDER REVIEW" if level == "MEDIUM" else "MONITORING",
#     })
#     overview_state["recent_incidents"] = overview_state["recent_incidents"][:10]


# @app.get("/api/overview")
# def get_overview():
#     return overview_state


# # ============================================================
# # TRANSCRIPT RISK ENGINE
# # ============================================================

# TRANSCRIPT_PATTERNS = [
#     {
#         "label": "Urgency",
#         "risk": 20,
#         "words": [
#             "urgent",
#             "immediately",
#             "right now",
#             "as soon as possible",
#         ],
#     },
#     {
#         "label": "Financial request",
#         "risk": 30,
#         "words": [
#             "transfer",
#             "payment",
#             "bank",
#             "account",
#             "money",
#             "wire",
#             "lakhs",
#             "crore",
#         ],
#     },
#     {
#         "label": "Confidentiality pressure",
#         "risk": 25,
#         "words": [
#             "don't tell",
#             "do not tell",
#             "keep this secret",
#             "don't involve",
#             "do not involve",
#             "confidential",
#         ],
#     },
#     {
#         "label": "Credential request",
#         "risk": 35,
#         "words": [
#             "password",
#             "otp",
#             "verification code",
#             "pin",
#             "code",
#         ],
#     },
# ]


# def analyze_transcript(text: str) -> dict:
#     lower = (text or "").lower().strip()
#     detected = []
#     matched_phrases = []
#     transcript_risk = 0

#     for pattern in TRANSCRIPT_PATTERNS:
#         matches = [word for word in pattern["words"] if word in lower]
#         if matches:
#             detected.append(pattern["label"])
#             matched_phrases.extend(matches[:3])
#             transcript_risk += pattern["risk"]

#     transcript_risk = min(100, transcript_risk)

#     return {
#         "transcript_risk": transcript_risk,
#         "signals": detected,
#         "matched_phrases": matched_phrases,
#     }


# def combine_risk(audio_risk: int, transcript_risk: int) -> int:
#     # Transparent MVP rule: either channel can raise the live risk.
#     # This is a screening signal, not a calibrated probability.
#     return max(int(audio_risk), int(transcript_risk))


# def risk_band(risk: int) -> str:
#     if risk >= 70:
#         return "HIGH RISK"
#     if risk >= 50:
#         return "MEDIUM RISK"
#     return "LOW RISK"


# # ============================================================
# # NORMAL AUDIO ANALYSIS
# # ============================================================

# @app.post("/api/analyse")
# async def analyse_audio(file: UploadFile = File(...)):
#     filename = file.filename or ""
#     ext = filename.split(".")[-1].lower() if "." in filename else ""

#     if ext not in ALLOWED_EXTENSIONS:
#         raise HTTPException(
#             status_code=400,
#             detail="Unsupported audio file format.",
#         )

#     try:
#         content = await file.read()

#         if not content:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Audio file is empty.",
#             )

#         if len(content) > 25 * 1024 * 1024:
#             raise HTTPException(
#                 status_code=400,
#                 detail="File is larger than 25 MB.",
#             )

#         result = await asyncio.to_thread(
#             analyze_audio_file,
#             content,
#             filename,
#         )
#         overview_state["calls_analyzed_today"] += 1
#         overview_state["analysis_sources"]["uploaded_audio"] += 1
#         risk = int(result.get("overall_risk", round(float(result.get("spoof_probability", 0)) * 100)))
#         _record_risk_activity(risk)
#         return result

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Inference error: {str(e)}",
#         )


# # ============================================================
# # LIVE CALL WEBSOCKET
# # ============================================================

# @app.websocket("/ws/live-call")
# async def live_call(websocket: WebSocket):
#     await websocket.accept()
#     session_id = id(websocket)
#     _live_sessions[session_id] = "LOW"
#     overview_state["active_calls"] = len(_live_sessions)
#     overview_state["analysis_sources"]["live_calls"] = max(overview_state["analysis_sources"]["live_calls"], len(_live_sessions))

#     sample_rate = 16000
#     audio_buffer = np.array([], dtype=np.int16)

#     window_seconds = 3
#     step_seconds = 1
#     window_samples = sample_rate * window_seconds
#     step_samples = sample_rate * step_seconds
#     samples_since_analysis = 0

#     session_started = False
#     audio_risk = 0
#     transcript_risk = 0
#     analysis_count = 0
#     transcript_count = 0
#     signal_count = 0

#     print("[LIVE] WebSocket connected")

#     try:
#         while True:
#             message = await websocket.receive()

#             # --------------------------------------------------
#             # TEXT / CONTROL / TRANSCRIPT
#             # --------------------------------------------------
#             if message.get("text"):
#                 try:
#                     data = json.loads(message["text"])
#                 except json.JSONDecodeError:
#                     continue

#                 message_type = data.get("type")

#                 if message_type == "start":
#                     sample_rate = int(data.get("sample_rate", 16000))
#                     sample_rate = max(8000, min(sample_rate, 48000))
#                     window_samples = sample_rate * window_seconds
#                     step_samples = sample_rate * step_seconds
#                     session_started = True
#                     audio_buffer = np.array([], dtype=np.int16)
#                     samples_since_analysis = 0
#                     audio_risk = 0
#                     transcript_risk = 0
#                     analysis_count = 0
#                     transcript_count = 0
#                     signal_count = 0

#                     print(f"[LIVE] Started sample_rate={sample_rate}")

#                     await websocket.send_json({
#                         "type": "started",
#                         "sample_rate": sample_rate,
#                         "window_seconds": window_seconds,
#                         "step_seconds": step_seconds,
#                     })

#                 elif message_type == "transcript":
#                     if not session_started:
#                         continue

#                     text = str(data.get("text", "")).strip()
#                     if not text:
#                         continue

#                     transcript_count += 1
#                     analysis = analyze_transcript(text)
#                     transcript_risk = max(
#                         transcript_risk,
#                         int(analysis["transcript_risk"]),
#                     )
#                     signal_count += len(analysis["signals"])

#                     combined_risk = combine_risk(
#                         audio_risk,
#                         transcript_risk,
#                     )

#                     if analysis["signals"]:
#                         _add_incident(
#                             combined_risk,
#                             "TRANSCRIPT",
#                             ", ".join(analysis["signals"]),
#                             source="LIVE CALL • STT",
#                         )

#                     print(
#                         f"[LIVE][STT] segments={transcript_count} "
#                         f"signals={analysis['signals']} "
#                         f"transcript_risk={transcript_risk} "
#                         f"combined={combined_risk}"
#                     )

#                     await websocket.send_json({
#                         "type": "transcript_analysis",
#                         "timestamp": datetime.now().isoformat(),
#                         "text": text,
#                         "transcript_risk": transcript_risk,
#                         "signals": analysis["signals"],
#                         "matched_phrases": analysis["matched_phrases"],
#                         "combined_risk": combined_risk,
#                         "combined_status": risk_band(combined_risk),
#                         "transcript_count": transcript_count,
#                         "signal_count": signal_count,
#                     })

#                 elif message_type == "stop":
#                     print("[LIVE] Client stopped")
#                     await websocket.send_json({
#                         "type": "stopped",
#                         "summary": {
#                             "analysis_count": analysis_count,
#                             "transcript_count": transcript_count,
#                             "signal_count": signal_count,
#                             "audio_risk": audio_risk,
#                             "transcript_risk": transcript_risk,
#                             "combined_risk": combine_risk(audio_risk, transcript_risk),
#                         },
#                     })
#                     break

#             # --------------------------------------------------
#             # BINARY PCM16 AUDIO
#             # --------------------------------------------------
#             elif message.get("bytes"):
#                 if not session_started:
#                     continue

#                 raw_bytes = message["bytes"]

#                 if not raw_bytes:
#                     continue

#                 chunk = np.frombuffer(
#                     raw_bytes,
#                     dtype="<i2",
#     )
#                 chunk_float = chunk.astype(np.float32) / 32768.0

#                 if len(audio_buffer) % (4096 * 25) < len(chunk):
#                     print(
#                         "[BACKEND PCM]",
#                         "samples=", len(chunk),
#                         "rms=", float(np.sqrt(np.mean(chunk_float ** 2))),
#                         "peak=", float(np.max(np.abs(chunk_float))),
#     )
#                 if chunk.size == 0:
#                     continue

#                 audio_buffer = np.concatenate([
#                 audio_buffer,
#                 chunk,
#     ])

#                 samples_since_analysis += len(chunk)

#     # Analyze every 1 second once we have
#     # at least 3 seconds of audio.
#                 if (
#                     len(audio_buffer) >= window_samples
#                     and samples_since_analysis >= step_samples
#                 ):
#                     samples_since_analysis = 0

#         # IMPORTANT:
#         # Pass the entire rolling buffer.
#         # analyze_pcm_audio() selects the best
#         # 3-second speech-rich segment.
#                     window = audio_buffer.copy()

#                     try:
#                         started_at = time.perf_counter()

#                         result = await asyncio.to_thread(
#                             analyze_pcm_audio,
#                             window,
#                             sample_rate,
#             )

#                         processing_ms = round(
#                         (
#                             time.perf_counter()
#                             - started_at
#                            ) * 1000
#             )

#                         audio_risk = int(
#                             result.get(
#                                 "overall_risk",
#                                 round(
#                                     float(
#                                         result.get(
#                                             "spoof_probability",
#                                              0,
#                                         )
#                                     ) * 100
#                     ),
#                 )
#             )

#                         analysis_count += 1

#                         overview_state[
#                             "calls_analyzed_today"
#                         ] += 1

#                         overview_state[
#                             "analysis_sources"
#                         ]["live_calls"] += 1

#                         combined_risk = combine_risk(
#                             audio_risk,
#                             transcript_risk,
#             )

#                         _record_risk_activity(
#                             combined_risk
#             )

#                         new_level = _risk_level(
#                             combined_risk
#             )

#                         old_level = _live_sessions.get(
#                             session_id,
#                             "LOW",
#             )

#                         if old_level != new_level:

#                             if old_level == "HIGH":
#                                 overview_state[
#                                     "high_risk_calls"
#                                 ] = max(
#                                     0,
#                                     overview_state[
#                                         "high_risk_calls"
#                                     ] - 1,
#                     )

#                             if new_level == "HIGH":
#                                 overview_state[
#                                     "high_risk_calls"
#                                 ] += 1

#                             _live_sessions[
#                                 session_id
#                             ] = new_level

#                             _add_incident(
#                                 combined_risk,
#                                 result.get(
#                                     "label",
#                                     "UNKNOWN",
#                     ),
#                                 f"Live risk changed to {new_level}",
#                 )

#             # Only send if socket is still connected.
#                         try:
#                             await websocket.send_json({
#                                 "type": "analysis",
#                                 "timestamp": datetime.now().isoformat(),
#                                 **result,
#                                 "processing_time_ms": processing_ms,
#                                 "audio_risk": audio_risk,
#                                 "transcript_risk": transcript_risk,
#                                 "combined_risk": combined_risk,
#                                 "combined_status": risk_band(
#                                     combined_risk
#                     ),
#                                 "analysis_count": analysis_count,
#                                 "transcript_count": transcript_count,
#                                 "signal_count": signal_count,
#                 })
#                         except Exception:
#                             break

#                         if result.get("status") == "insufficient_audio":
#                             print(
#                                 "[LIVE] "
#                                 f"label=INSUFFICIENT_AUDIO "
#                                 f"rms={result.get('audio_rms', 0):.6f} "
#                                 f"active={result.get('active_ratio', 0):.2f}"
#                 )
#                         else:
#                             print(
#                                 "[LIVE] "
#                                 f"label={result.get('label', 'UNKNOWN')} "
#                                 f"spoof="
#                                 f"{float(result.get('spoof_probability', 0)) * 100:.1f}% "
#                                 f"bonafide="
#                                 f"{float(result.get('bonafide_probability', 0)) * 100:.1f}% "
#                                 f"audio_risk={audio_risk} "
#                                 f"transcript_risk={transcript_risk} "
#                                 f"combined={combined_risk}"
#                 )

#                     except Exception as e:
#                             print(
#                                 "[LIVE] Analysis error:",
#                                 repr(e),
#             )

#     # Keep latest 6 seconds.
#                     max_buffer_samples = sample_rate * 6

#                     if len(audio_buffer) > max_buffer_samples:
#                         audio_buffer = audio_buffer[
#                             -max_buffer_samples:
#         ]

#     except WebSocketDisconnect:
#         print("[LIVE] WebSocket disconnected")
#     except Exception as e:
#         print("[LIVE] WebSocket error:", e)
#     finally:
#         old_level = _live_sessions.pop(session_id, "LOW")
#         if old_level == "HIGH":
#             overview_state["high_risk_calls"] = max(0, overview_state["high_risk_calls"] - 1)
#         overview_state["active_calls"] = len(_live_sessions)
#         print("[LIVE] Session ended")


# # ============================================================
# # HEALTH
# # ============================================================

# @app.get("/")
# def root():
#     return {
#         "status": "ok",
#         "service": "VoxShield API",
#     }


# @app.get("/api/health")
# def health():
#     return {
#         "status": "healthy",
#         "timestamp": datetime.now().isoformat(),
#     }

# @app.get("/api/voice-profiles")
# async def get_voice_profiles():
#     return {
#         "status": "ok",
#         "profiles": voice_profiles,
#         "count": len(voice_profiles),
#     }


# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run(
#         "main:app",
#         host="127.0.0.1",
#         port=8000,
#         reload=True,
#     )

import asyncio
import json
import time
from datetime import datetime

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

try:
    from .model import analyze_audio_file, analyze_pcm_audio
    from .transcript_risk import analyze_transcript
except ImportError:
    from model import analyze_audio_file, analyze_pcm_audio
    from transcript_risk import analyze_transcript


app = FastAPI(title="VoxShield API")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_EXTENSIONS = {
    "wav",
    "mp3",
    "m4a",
    "flac",
    "ogg",
    "webm",
}


# ============================================================
# REAL-TIME OVERVIEW STATE
# ============================================================

overview_state = {
    "active_calls": 0,
    "active_calls_delta": "Live",

    "high_risk_calls": 0,

    "calls_analyzed_today": 0,
    "calls_analyzed_delta": "Live",

    "risk_activity": [],

    "system_status": {
        "detection": True,
        "speaker_verification": True,
        "behavior_analysis": True,
        "transaction_risk": True,
    },

    "system_status_label": "Live configuration",

    "recent_incidents": [],

    "verification_pending": 0,
    "actions_paused": 0,

    "analysis_sources": {
        "live_calls": 0,
        "uploaded_audio": 0,
    },
}


# ============================================================
# VOICE PROFILES
# ============================================================

voice_profiles = [
    {
        "id": "VP-001",
        "name": "Aarav Mehta",
        "role": "Executive",
        "status": "ACTIVE",
        "samples": 18,
        "verified": "Today",
        "drift": "LOW",
    },
    {
        "id": "VP-002",
        "name": "Riya Sharma",
        "role": "Finance",
        "status": "ACTIVE",
        "samples": 14,
        "verified": "Today",
        "drift": "LOW",
    },
    {
        "id": "VP-003",
        "name": "Kabir Singh",
        "role": "Operations",
        "status": "REVIEW",
        "samples": 11,
        "verified": "2 days ago",
        "drift": "HIGH",
    },
]


# ============================================================
# LIVE SESSION STATE
# ============================================================

_live_sessions = {}


# ============================================================
# RISK HELPERS
# ============================================================

def _risk_level(risk: int) -> str:
    if risk >= 70:
        return "HIGH"

    if risk >= 50:
        return "MEDIUM"

    return "LOW"


def _record_risk_activity(risk: int):
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    if (
        not overview_state["risk_activity"]
        or overview_state["risk_activity"][-1]["time"] != current_time
    ):
        overview_state["risk_activity"].append(
            {
                "time": current_time,
                "low": 0,
                "medium": 0,
                "high": 0,
            }
        )

    point = overview_state["risk_activity"][-1]

    level = _risk_level(risk).lower()

    point[level] += 1

    overview_state["risk_activity"] = overview_state["risk_activity"][-7:]


def _add_incident(
    risk: int,
    label: str,
    detection: str,
    source="LIVE CALL",
):
    now = datetime.now()

    level = _risk_level(risk)

    overview_state["recent_incidents"].insert(
        0,
        {
            "id": f"VX-{now.strftime('%H%M%S%f')[:8]}",
            "time": now.strftime("%H:%M"),
            "caller": "Local Microphone",
            "role": "Live Call",
            "risk": int(risk),
            "level": level,
            "detection": detection,
            "transaction": "—",
            "source": source,
            "status": (
                "OPEN"
                if level == "HIGH"
                else "UNDER REVIEW"
                if level == "MEDIUM"
                else "MONITORING"
            ),
        },
    )

    overview_state["recent_incidents"] = (
        overview_state["recent_incidents"][:10]
    )


# ============================================================
# RISK COMBINATION
# ============================================================

def combine_risk(
    audio_risk: int,
    transcript_risk: int,
) -> int:
    """
    Transparent MVP rule.

    Either the audio channel or transcript channel can raise
    the live risk.

    This is a screening signal, not a calibrated probability.
    """

    return max(
        int(audio_risk),
        int(transcript_risk),
    )


def risk_band(risk: int) -> str:
    if risk >= 70:
        return "HIGH RISK"

    if risk >= 50:
        return "MEDIUM RISK"

    return "LOW RISK"


# ============================================================
# OVERVIEW
# ============================================================

@app.get("/api/overview")
def get_overview():
    return overview_state


# ============================================================
# NORMAL AUDIO ANALYSIS
# ============================================================

@app.post("/api/analyse")
async def analyse_audio(
    file: UploadFile = File(...),
):
    filename = file.filename or ""

    ext = (
        filename.split(".")[-1].lower()
        if "." in filename
        else ""
    )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio file format.",
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty.",
            )

        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File is larger than 25 MB.",
            )

        result = await asyncio.to_thread(
            analyze_audio_file,
            content,
            filename,
        )

        overview_state["calls_analyzed_today"] += 1

        overview_state["analysis_sources"][
            "uploaded_audio"
        ] += 1

        risk = int(
            result.get(
                "overall_risk",
                round(
                    float(
                        result.get(
                            "spoof_probability",
                            0,
                        )
                    )
                    * 100
                ),
            )
        )

        _record_risk_activity(risk)

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error: {str(e)}",
        )


# ============================================================
# LIVE CALL WEBSOCKET
# ============================================================

@app.websocket("/ws/live-call")
async def live_call(websocket: WebSocket):

    await websocket.accept()

    session_id = id(websocket)

    _live_sessions[session_id] = "LOW"

    overview_state["active_calls"] = len(
        _live_sessions
    )

    overview_state["analysis_sources"][
        "live_calls"
    ] = max(
        overview_state["analysis_sources"]["live_calls"],
        len(_live_sessions),
    )

    # --------------------------------------------------------
    # Audio configuration
    # --------------------------------------------------------

    sample_rate = 16000

    audio_buffer = np.array(
        [],
        dtype=np.int16,
    )

    window_seconds = 3
    step_seconds = 1

    window_samples = (
        sample_rate * window_seconds
    )

    step_samples = (
        sample_rate * step_seconds
    )

    samples_since_analysis = 0

    session_started = False

    # --------------------------------------------------------
    # Risk state
    # --------------------------------------------------------

    audio_risk = 0
    transcript_risk = 0

    analysis_count = 0
    transcript_count = 0
    signal_count = 0

    # Keep latest semantic information
    latest_signals = []
    latest_semantic_matches = []
    latest_matched_phrases = []

    print("[LIVE] WebSocket connected")

    try:

        while True:

            message = await websocket.receive()

            # =================================================
            # TEXT / CONTROL / TRANSCRIPT
            # =================================================

            if message.get("text"):

                try:
                    data = json.loads(
                        message["text"]
                    )

                except json.JSONDecodeError:
                    continue

                message_type = data.get(
                    "type"
                )

                # =================================================
                # START
                # =================================================

                if message_type == "start":

                    sample_rate = int(
                        data.get(
                            "sample_rate",
                            16000,
                        )
                    )

                    sample_rate = max(
                        8000,
                        min(sample_rate, 48000),
                    )

                    window_samples = (
                        sample_rate
                        * window_seconds
                    )

                    step_samples = (
                        sample_rate
                        * step_seconds
                    )

                    session_started = True

                    audio_buffer = np.array(
                        [],
                        dtype=np.int16,
                    )

                    samples_since_analysis = 0

                    audio_risk = 0
                    transcript_risk = 0

                    analysis_count = 0
                    transcript_count = 0
                    signal_count = 0

                    latest_signals = []
                    latest_semantic_matches = []
                    latest_matched_phrases = []

                    print(
                        f"[LIVE] Started "
                        f"sample_rate={sample_rate}"
                    )

                    await websocket.send_json(
                        {
                            "type": "started",
                            "sample_rate": sample_rate,
                            "window_seconds": window_seconds,
                            "step_seconds": step_seconds,
                        }
                    )

                # =================================================
                # TRANSCRIPT
                # =================================================

                elif message_type == "transcript":

                    if not session_started:
                        continue

                    text = str(
                        data.get(
                            "text",
                            "",
                        )
                    ).strip()

                    if not text:
                        continue

                    transcript_count += 1

                    # -------------------------------------------------
                    # Semantic transcript analysis
                    # -------------------------------------------------

                    try:

                        analysis = analyze_transcript(
                            text
                        )

                    except Exception as e:

                        print(
                            "[LIVE][STT] "
                            "Transcript analysis error:",
                            repr(e),
                        )

                        continue

                    # -------------------------------------------------
                    # Transcript risk
                    # -------------------------------------------------

                    current_transcript_risk = int(
                        analysis.get(
                            "transcript_risk",
                            0,
                        )
                    )

                    transcript_risk = max(
                        transcript_risk,
                        current_transcript_risk,
                    )

                    # -------------------------------------------------
                    # Semantic signals
                    # -------------------------------------------------

                    raw_signals = analysis.get(
                        "signals",
                        [],
                    )

                    signal_labels = [
                        signal.get(
                            "label",
                            str(signal),
                        )
                        if isinstance(signal, dict)
                        else str(signal)
                        for signal in raw_signals
                    ]

                    latest_signals = signal_labels

                    # -------------------------------------------------
                    # Matched phrases
                    # -------------------------------------------------

                    latest_matched_phrases = (
                        analysis.get(
                            "matched_phrases",
                            [],
                        )
                    )

                    # -------------------------------------------------
                    # Semantic matches
                    # -------------------------------------------------

                    latest_semantic_matches = (
                        analysis.get(
                            "semantic_matches",
                            [],
                        )
                    )

                    signal_count += len(
                        signal_labels
                    )

                    # -------------------------------------------------
                    # Combined risk
                    # -------------------------------------------------

                    combined_risk = combine_risk(
                        audio_risk,
                        transcript_risk,
                    )

                    # -------------------------------------------------
                    # Incident
                    # -------------------------------------------------

                    if signal_labels:

                        _add_incident(
                            combined_risk,
                            "TRANSCRIPT",
                            ", ".join(
                                signal_labels
                            ),
                            source="LIVE CALL • STT",
                        )

                    # -------------------------------------------------
                    # Debug logging
                    # -------------------------------------------------

                    print(
                        f"[LIVE][STT] "
                        f"segments={transcript_count} "
                        f"signals={signal_labels} "
                        f"transcript_risk={transcript_risk} "
                        f"combined={combined_risk}"
                    )

                    # -------------------------------------------------
                    # Send transcript result to frontend
                    # -------------------------------------------------

                    await websocket.send_json(
                        {
                            "type": "transcript_analysis",

                            "timestamp": datetime.now().isoformat(),

                            "text": text,

                            "transcript_risk": transcript_risk,

                            "signals": signal_labels,

                            "matched_phrases": (
                                latest_matched_phrases
                            ),

                            "semantic_matches": (
                                latest_semantic_matches
                            ),

                            "combined_risk": combined_risk,

                            "combined_status": risk_band(
                                combined_risk
                            ),

                            "transcript_count": (
                                transcript_count
                            ),

                            "signal_count": (
                                signal_count
                            ),
                        }
                    )

                # =================================================
                # STOP
                # =================================================

                elif message_type == "stop":

                    print(
                        "[LIVE] Client stopped"
                    )

                    await websocket.send_json(
                        {
                            "type": "stopped",

                            "summary": {
                                "analysis_count": (
                                    analysis_count
                                ),

                                "transcript_count": (
                                    transcript_count
                                ),

                                "signal_count": (
                                    signal_count
                                ),

                                "audio_risk": (
                                    audio_risk
                                ),

                                "transcript_risk": (
                                    transcript_risk
                                ),

                                "combined_risk": combine_risk(
                                    audio_risk,
                                    transcript_risk,
                                ),

                                "signals": (
                                    latest_signals
                                ),

                                "semantic_matches": (
                                    latest_semantic_matches
                                ),
                            },
                        }
                    )

                    break

            # =====================================================
            # BINARY PCM16 AUDIO
            # =====================================================

            elif message.get("bytes"):

                if not session_started:
                    continue

                raw_bytes = message["bytes"]

                if not raw_bytes:
                    continue

                chunk = np.frombuffer(
                    raw_bytes,
                    dtype="<i2",
                )

                if chunk.size == 0:
                    continue

                # -------------------------------------------------
                # Debug PCM
                # -------------------------------------------------

                chunk_float = (
                    chunk.astype(
                        np.float32
                    )
                    / 32768.0
                )

                if (
                    len(audio_buffer)
                    % (4096 * 25)
                    < len(chunk)
                ):

                    print(
                        "[BACKEND PCM]",
                        "samples=",
                        len(chunk),
                        "rms=",
                        float(
                            np.sqrt(
                                np.mean(
                                    chunk_float ** 2
                                )
                            )
                        ),
                        "peak=",
                        float(
                            np.max(
                                np.abs(
                                    chunk_float
                                )
                            )
                        ),
                    )

                # -------------------------------------------------
                # Add PCM to rolling buffer
                # -------------------------------------------------

                audio_buffer = np.concatenate(
                    [
                        audio_buffer,
                        chunk,
                    ]
                )

                samples_since_analysis += len(
                    chunk
                )

                # -------------------------------------------------
                # Analyze every 1 second once
                # at least 3 seconds exist.
                # -------------------------------------------------

                if (
                    len(audio_buffer)
                    >= window_samples
                    and samples_since_analysis
                    >= step_samples
                ):

                    samples_since_analysis = 0

                    # -------------------------------------------------
                    # Pass rolling buffer.
                    # analyze_pcm_audio() selects best 3-sec window.
                    # -------------------------------------------------

                    window = audio_buffer.copy()

                    try:

                        started_at = (
                            time.perf_counter()
                        )

                        result = await asyncio.to_thread(
                            analyze_pcm_audio,
                            window,
                            sample_rate,
                        )

                        processing_ms = round(
                            (
                                time.perf_counter()
                                - started_at
                            )
                            * 1000
                        )

                        # -------------------------------------------------
                        # Safety check
                        # -------------------------------------------------

                        if result is None:

                            print(
                                "[LIVE] "
                                "Analysis returned None"
                            )

                            continue

                        # -------------------------------------------------
                        # Audio risk
                        # -------------------------------------------------

                        audio_risk = int(
                            result.get(
                                "overall_risk",
                                round(
                                    float(
                                        result.get(
                                            "spoof_probability",
                                            0,
                                        )
                                    )
                                    * 100
                                ),
                            )
                        )

                        analysis_count += 1

                        overview_state[
                            "calls_analyzed_today"
                        ] += 1

                        overview_state[
                            "analysis_sources"
                        ]["live_calls"] += 1

                        # -------------------------------------------------
                        # Combined risk
                        # -------------------------------------------------

                        combined_risk = combine_risk(
                            audio_risk,
                            transcript_risk,
                        )

                        _record_risk_activity(
                            combined_risk
                        )

                        # -------------------------------------------------
                        # Live session risk level
                        # -------------------------------------------------

                        new_level = _risk_level(
                            combined_risk
                        )

                        old_level = _live_sessions.get(
                            session_id,
                            "LOW",
                        )

                        if old_level != new_level:

                            # Remove previous HIGH count
                            if old_level == "HIGH":

                                overview_state[
                                    "high_risk_calls"
                                ] = max(
                                    0,
                                    overview_state[
                                        "high_risk_calls"
                                    ]
                                    - 1,
                                )

                            # Add new HIGH count
                            if new_level == "HIGH":

                                overview_state[
                                    "high_risk_calls"
                                ] += 1

                            _live_sessions[
                                session_id
                            ] = new_level

                            _add_incident(
                                combined_risk,
                                result.get(
                                    "label",
                                    "UNKNOWN",
                                ),
                                (
                                    f"Live risk changed "
                                    f"to {new_level}"
                                ),
                            )

                        # -------------------------------------------------
                        # Send analysis to frontend
                        # -------------------------------------------------

                        try:

                            await websocket.send_json(
                                {
                                    "type": "analysis",

                                    "timestamp": (
                                        datetime.now()
                                        .isoformat()
                                    ),

                                    **result,

                                    "processing_time_ms": (
                                        processing_ms
                                    ),

                                    "audio_risk": (
                                        audio_risk
                                    ),

                                    "transcript_risk": (
                                        transcript_risk
                                    ),

                                    "combined_risk": (
                                        combined_risk
                                    ),

                                    "combined_status": (
                                        risk_band(
                                            combined_risk
                                        )
                                    ),

                                    "analysis_count": (
                                        analysis_count
                                    ),

                                    "transcript_count": (
                                        transcript_count
                                    ),

                                    "signal_count": (
                                        signal_count
                                    ),

                                    # Latest transcript context
                                    "transcript_signals": (
                                        latest_signals
                                    ),

                                    "semantic_matches": (
                                        latest_semantic_matches
                                    ),

                                    "matched_phrases": (
                                        latest_matched_phrases
                                    ),
                                }
                            )

                        except Exception:

                            break

                        # -------------------------------------------------
                        # Logging
                        # -------------------------------------------------

                        if (
                            result.get("status")
                            == "insufficient_audio"
                        ):

                            print(
                                "[LIVE] "
                                "label=INSUFFICIENT_AUDIO "
                                f"rms={result.get('audio_rms', 0):.6f} "
                                f"active={result.get('active_ratio', 0):.2f}"
                            )

                        else:

                            print(
                                "[LIVE] "
                                f"label={result.get('label', 'UNKNOWN')} "
                                f"spoof="
                                f"{float(result.get('spoof_probability', 0)) * 100:.1f}% "
                                f"bonafide="
                                f"{float(result.get('bonafide_probability', 0)) * 100:.1f}% "
                                f"audio_risk={audio_risk} "
                                f"transcript_risk={transcript_risk} "
                                f"combined={combined_risk}"
                            )

                    except Exception as e:

                        print(
                            "[LIVE] Analysis error:",
                            repr(e),
                        )

                    # -------------------------------------------------
                    # Keep latest 6 seconds.
                    # -------------------------------------------------

                    max_buffer_samples = (
                        sample_rate * 6
                    )

                    if (
                        len(audio_buffer)
                        > max_buffer_samples
                    ):

                        audio_buffer = (
                            audio_buffer[
                                -max_buffer_samples:
                            ]
                        )

    except WebSocketDisconnect:

        print(
            "[LIVE] WebSocket disconnected"
        )

    except Exception as e:

        print(
            "[LIVE] WebSocket error:",
            repr(e),
        )

    finally:

        old_level = _live_sessions.pop(
            session_id,
            "LOW",
        )

        if old_level == "HIGH":

            overview_state[
                "high_risk_calls"
            ] = max(
                0,
                overview_state[
                    "high_risk_calls"
                ]
                - 1,
            )

        overview_state["active_calls"] = len(
            _live_sessions
        )

        print(
            "[LIVE] Session ended"
        )


# ============================================================
# HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "VoxShield API",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


# ============================================================
# VOICE PROFILES
# ============================================================

@app.get("/api/voice-profiles")
async def get_voice_profiles():
    return {
        "status": "ok",
        "profiles": voice_profiles,
        "count": len(voice_profiles),
    }


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )