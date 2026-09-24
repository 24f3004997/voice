# import asyncio
# import json
# import time
# from datetime import datetime

# import numpy as np
# from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware

# try:
#     from .model import analyze_audio_file, analyze_pcm_audio
#     from .transcript_risk import analyze_transcript
# except ImportError:
#     from model import analyze_audio_file, analyze_pcm_audio
#     from transcript_risk import analyze_transcript


# app = FastAPI(title="VoxShield API")


# # ============================================================
# # CORS
# # ============================================================

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


# ALLOWED_EXTENSIONS = {
#     "wav",
#     "mp3",
#     "m4a",
#     "flac",
#     "ogg",
#     "webm",
# }


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


# # ============================================================
# # VOICE PROFILES
# # ============================================================

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


# # ============================================================
# # LIVE SESSION STATE
# # ============================================================

# _live_sessions = {}


# # ============================================================
# # RISK HELPERS
# # ============================================================

# def _risk_level(risk: int) -> str:
#     if risk >= 70:
#         return "HIGH"

#     if risk >= 50:
#         return "MEDIUM"

#     return "LOW"


# def _record_risk_activity(risk: int):
#     now = datetime.now()
#     current_time = now.strftime("%H:%M")

#     if (
#         not overview_state["risk_activity"]
#         or overview_state["risk_activity"][-1]["time"] != current_time
#     ):
#         overview_state["risk_activity"].append(
#             {
#                 "time": current_time,
#                 "low": 0,
#                 "medium": 0,
#                 "high": 0,
#             }
#         )

#     point = overview_state["risk_activity"][-1]

#     level = _risk_level(risk).lower()

#     point[level] += 1

#     overview_state["risk_activity"] = overview_state["risk_activity"][-7:]


# def _add_incident(
#     risk: int,
#     label: str,
#     detection: str,
#     source="LIVE CALL",
# ):
#     now = datetime.now()

#     level = _risk_level(risk)

#     overview_state["recent_incidents"].insert(
#         0,
#         {
#             "id": f"VX-{now.strftime('%H%M%S%f')[:8]}",
#             "time": now.strftime("%H:%M"),
#             "caller": "Local Microphone",
#             "role": "Live Call",
#             "risk": int(risk),
#             "level": level,
#             "detection": detection,
#             "transaction": "—",
#             "source": source,
#             "status": (
#                 "OPEN"
#                 if level == "HIGH"
#                 else "UNDER REVIEW"
#                 if level == "MEDIUM"
#                 else "MONITORING"
#             ),
#         },
#     )

#     overview_state["recent_incidents"] = (
#         overview_state["recent_incidents"][:10]
#     )


# # ============================================================
# # RISK COMBINATION
# # ============================================================

# def combine_risk(
#     audio_risk: int,
#     transcript_risk: int,
# ) -> int:
#     """
#     Transparent MVP rule.

#     Either the audio channel or transcript channel can raise
#     the live risk.

#     This is a screening signal, not a calibrated probability.
#     """

#     return max(
#         int(audio_risk),
#         int(transcript_risk),
#     )


# def risk_band(risk: int) -> str:
#     if risk >= 70:
#         return "HIGH RISK"

#     if risk >= 50:
#         return "MEDIUM RISK"

#     return "LOW RISK"


# # ============================================================
# # OVERVIEW
# # ============================================================

# @app.get("/api/overview")
# def get_overview():
#     return overview_state


# # ============================================================
# # NORMAL AUDIO ANALYSIS
# # ============================================================

# @app.post("/api/analyse")
# async def analyse_audio(
#     file: UploadFile = File(...),
# ):
#     filename = file.filename or ""

#     ext = (
#         filename.split(".")[-1].lower()
#         if "." in filename
#         else ""
#     )

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

#         overview_state["analysis_sources"][
#             "uploaded_audio"
#         ] += 1

#         risk = int(
#             result.get(
#                 "overall_risk",
#                 round(
#                     float(
#                         result.get(
#                             "spoof_probability",
#                             0,
#                         )
#                     )
#                     * 100
#                 ),
#             )
#         )

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

#     overview_state["active_calls"] = len(
#         _live_sessions
#     )

#     overview_state["analysis_sources"][
#         "live_calls"
#     ] = max(
#         overview_state["analysis_sources"]["live_calls"],
#         len(_live_sessions),
#     )

#     # --------------------------------------------------------
#     # Audio configuration
#     # --------------------------------------------------------

#     sample_rate = 16000

#     audio_buffer = np.array(
#         [],
#         dtype=np.int16,
#     )

#     window_seconds = 3
#     step_seconds = 1

#     window_samples = (
#         sample_rate * window_seconds
#     )

#     step_samples = (
#         sample_rate * step_seconds
#     )

#     samples_since_analysis = 0

#     session_started = False

#     # --------------------------------------------------------
#     # Risk state
#     # --------------------------------------------------------

#     audio_risk = 0
#     transcript_risk = 0

#     analysis_count = 0
#     transcript_count = 0
#     signal_count = 0

#     # Keep latest semantic information
#     latest_signals = []
#     latest_semantic_matches = []
#     latest_matched_phrases = []

#     print("[LIVE] WebSocket connected")

#     try:

#         while True:

#             message = await websocket.receive()

#             # =================================================
#             # TEXT / CONTROL / TRANSCRIPT
#             # =================================================

#             if message.get("text"):

#                 try:
#                     data = json.loads(
#                         message["text"]
#                     )

#                 except json.JSONDecodeError:
#                     continue

#                 message_type = data.get(
#                     "type"
#                 )

#                 # =================================================
#                 # START
#                 # =================================================

#                 if message_type == "start":

#                     sample_rate = int(
#                         data.get(
#                             "sample_rate",
#                             16000,
#                         )
#                     )

#                     sample_rate = max(
#                         8000,
#                         min(sample_rate, 48000),
#                     )

#                     window_samples = (
#                         sample_rate
#                         * window_seconds
#                     )

#                     step_samples = (
#                         sample_rate
#                         * step_seconds
#                     )

#                     session_started = True

#                     audio_buffer = np.array(
#                         [],
#                         dtype=np.int16,
#                     )

#                     samples_since_analysis = 0

#                     audio_risk = 0
#                     transcript_risk = 0

#                     analysis_count = 0
#                     transcript_count = 0
#                     signal_count = 0

#                     latest_signals = []
#                     latest_semantic_matches = []
#                     latest_matched_phrases = []

#                     print(
#                         f"[LIVE] Started "
#                         f"sample_rate={sample_rate}"
#                     )

#                     await websocket.send_json(
#                         {
#                             "type": "started",
#                             "sample_rate": sample_rate,
#                             "window_seconds": window_seconds,
#                             "step_seconds": step_seconds,
#                         }
#                     )

#                 # =================================================
#                 # TRANSCRIPT
#                 # =================================================

#                 elif message_type == "transcript":

#                     if not session_started:
#                         continue

#                     text = str(
#                         data.get(
#                             "text",
#                             "",
#                         )
#                     ).strip()

#                     if not text:
#                         continue

#                     transcript_count += 1

#                     # -------------------------------------------------
#                     # Semantic transcript analysis
#                     # -------------------------------------------------

#                     try:

#                         analysis = analyze_transcript(
#                             text
#                         )

#                     except Exception as e:

#                         print(
#                             "[LIVE][STT] "
#                             "Transcript analysis error:",
#                             repr(e),
#                         )

#                         continue

#                     # -------------------------------------------------
#                     # Transcript risk
#                     # -------------------------------------------------

#                     current_transcript_risk = int(
#                         analysis.get(
#                             "transcript_risk",
#                             0,
#                         )
#                     )

#                     transcript_risk = max(
#                         transcript_risk,
#                         current_transcript_risk,
#                     )

#                     # -------------------------------------------------
#                     # Semantic signals
#                     # -------------------------------------------------

#                     raw_signals = analysis.get(
#                         "signals",
#                         [],
#                     )

#                     signal_labels = [
#                         signal.get(
#                             "label",
#                             str(signal),
#                         )
#                         if isinstance(signal, dict)
#                         else str(signal)
#                         for signal in raw_signals
#                     ]

#                     latest_signals = signal_labels

#                     # -------------------------------------------------
#                     # Matched phrases
#                     # -------------------------------------------------

#                     latest_matched_phrases = (
#                         analysis.get(
#                             "matched_phrases",
#                             [],
#                         )
#                     )

#                     # -------------------------------------------------
#                     # Semantic matches
#                     # -------------------------------------------------

#                     latest_semantic_matches = (
#                         analysis.get(
#                             "semantic_matches",
#                             [],
#                         )
#                     )

#                     signal_count += len(
#                         signal_labels
#                     )

#                     # -------------------------------------------------
#                     # Combined risk
#                     # -------------------------------------------------

#                     combined_risk = combine_risk(
#                         audio_risk,
#                         transcript_risk,
#                     )

#                     # -------------------------------------------------
#                     # Incident
#                     # -------------------------------------------------

#                     if signal_labels:

#                         _add_incident(
#                             combined_risk,
#                             "TRANSCRIPT",
#                             ", ".join(
#                                 signal_labels
#                             ),
#                             source="LIVE CALL • STT",
#                         )

#                     # -------------------------------------------------
#                     # Debug logging
#                     # -------------------------------------------------

#                     print(
#                         f"[LIVE][STT] "
#                         f"segments={transcript_count} "
#                         f"signals={signal_labels} "
#                         f"transcript_risk={transcript_risk} "
#                         f"combined={combined_risk}"
#                     )

#                     # -------------------------------------------------
#                     # Send transcript result to frontend
#                     # -------------------------------------------------

#                     await websocket.send_json(
#                         {
#                             "type": "transcript_analysis",

#                             "timestamp": datetime.now().isoformat(),

#                             "text": text,

#                             "transcript_risk": transcript_risk,

#                             "signals": signal_labels,

#                             "matched_phrases": (
#                                 latest_matched_phrases
#                             ),

#                             "semantic_matches": (
#                                 latest_semantic_matches
#                             ),

#                             "combined_risk": combined_risk,

#                             "combined_status": risk_band(
#                                 combined_risk
#                             ),

#                             "transcript_count": (
#                                 transcript_count
#                             ),

#                             "signal_count": (
#                                 signal_count
#                             ),
#                         }
#                     )

#                 # =================================================
#                 # STOP
#                 # =================================================

#                 elif message_type == "stop":

#                     print(
#                         "[LIVE] Client stopped"
#                     )

#                     await websocket.send_json(
#                         {
#                             "type": "stopped",

#                             "summary": {
#                                 "analysis_count": (
#                                     analysis_count
#                                 ),

#                                 "transcript_count": (
#                                     transcript_count
#                                 ),

#                                 "signal_count": (
#                                     signal_count
#                                 ),

#                                 "audio_risk": (
#                                     audio_risk
#                                 ),

#                                 "transcript_risk": (
#                                     transcript_risk
#                                 ),

#                                 "combined_risk": combine_risk(
#                                     audio_risk,
#                                     transcript_risk,
#                                 ),

#                                 "signals": (
#                                     latest_signals
#                                 ),

#                                 "semantic_matches": (
#                                     latest_semantic_matches
#                                 ),
#                             },
#                         }
#                     )

#                     break

#             # =====================================================
#             # BINARY PCM16 AUDIO
#             # =====================================================

#             elif message.get("bytes"):

#                 if not session_started:
#                     continue

#                 raw_bytes = message["bytes"]

#                 if not raw_bytes:
#                     continue

#                 chunk = np.frombuffer(
#                     raw_bytes,
#                     dtype="<i2",
#                 )

#                 if chunk.size == 0:
#                     continue

#                 # -------------------------------------------------
#                 # Debug PCM
#                 # -------------------------------------------------

#                 chunk_float = (
#                     chunk.astype(
#                         np.float32
#                     )
#                     / 32768.0
#                 )

#                 if (
#                     len(audio_buffer)
#                     % (4096 * 25)
#                     < len(chunk)
#                 ):

#                     print(
#                         "[BACKEND PCM]",
#                         "samples=",
#                         len(chunk),
#                         "rms=",
#                         float(
#                             np.sqrt(
#                                 np.mean(
#                                     chunk_float ** 2
#                                 )
#                             )
#                         ),
#                         "peak=",
#                         float(
#                             np.max(
#                                 np.abs(
#                                     chunk_float
#                                 )
#                             )
#                         ),
#                     )

#                 # -------------------------------------------------
#                 # Add PCM to rolling buffer
#                 # -------------------------------------------------

#                 audio_buffer = np.concatenate(
#                     [
#                         audio_buffer,
#                         chunk,
#                     ]
#                 )

#                 samples_since_analysis += len(
#                     chunk
#                 )

#                 # -------------------------------------------------
#                 # Analyze every 1 second once
#                 # at least 3 seconds exist.
#                 # -------------------------------------------------

#                 if (
#                     len(audio_buffer)
#                     >= window_samples
#                     and samples_since_analysis
#                     >= step_samples
#                 ):

#                     samples_since_analysis = 0

#                     # -------------------------------------------------
#                     # Pass rolling buffer.
#                     # analyze_pcm_audio() selects best 3-sec window.
#                     # -------------------------------------------------

#                     window = audio_buffer.copy()

#                     try:

#                         started_at = (
#                             time.perf_counter()
#                         )

#                         result = await asyncio.to_thread(
#                             analyze_pcm_audio,
#                             window,
#                             sample_rate,
#                         )

#                         processing_ms = round(
#                             (
#                                 time.perf_counter()
#                                 - started_at
#                             )
#                             * 1000
#                         )

#                         # -------------------------------------------------
#                         # Safety check
#                         # -------------------------------------------------

#                         if result is None:

#                             print(
#                                 "[LIVE] "
#                                 "Analysis returned None"
#                             )

#                             continue

#                         # -------------------------------------------------
#                         # Audio risk
#                         # -------------------------------------------------

#                         audio_risk = int(
#                             result.get(
#                                 "overall_risk",
#                                 round(
#                                     float(
#                                         result.get(
#                                             "spoof_probability",
#                                             0,
#                                         )
#                                     )
#                                     * 100
#                                 ),
#                             )
#                         )

#                         analysis_count += 1

#                         overview_state[
#                             "calls_analyzed_today"
#                         ] += 1

#                         overview_state[
#                             "analysis_sources"
#                         ]["live_calls"] += 1

#                         # -------------------------------------------------
#                         # Combined risk
#                         # -------------------------------------------------

#                         combined_risk = combine_risk(
#                             audio_risk,
#                             transcript_risk,
#                         )

#                         _record_risk_activity(
#                             combined_risk
#                         )

#                         # -------------------------------------------------
#                         # Live session risk level
#                         # -------------------------------------------------

#                         new_level = _risk_level(
#                             combined_risk
#                         )

#                         old_level = _live_sessions.get(
#                             session_id,
#                             "LOW",
#                         )

#                         if old_level != new_level:

#                             # Remove previous HIGH count
#                             if old_level == "HIGH":

#                                 overview_state[
#                                     "high_risk_calls"
#                                 ] = max(
#                                     0,
#                                     overview_state[
#                                         "high_risk_calls"
#                                     ]
#                                     - 1,
#                                 )

#                             # Add new HIGH count
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
#                                 ),
#                                 (
#                                     f"Live risk changed "
#                                     f"to {new_level}"
#                                 ),
#                             )

#                         # -------------------------------------------------
#                         # Send analysis to frontend
#                         # -------------------------------------------------

#                         try:

#                             await websocket.send_json(
#                                 {
#                                     "type": "analysis",

#                                     "timestamp": (
#                                         datetime.now()
#                                         .isoformat()
#                                     ),

#                                     **result,

#                                     "processing_time_ms": (
#                                         processing_ms
#                                     ),

#                                     "audio_risk": (
#                                         audio_risk
#                                     ),

#                                     "transcript_risk": (
#                                         transcript_risk
#                                     ),

#                                     "combined_risk": (
#                                         combined_risk
#                                     ),

#                                     "combined_status": (
#                                         risk_band(
#                                             combined_risk
#                                         )
#                                     ),

#                                     "analysis_count": (
#                                         analysis_count
#                                     ),

#                                     "transcript_count": (
#                                         transcript_count
#                                     ),

#                                     "signal_count": (
#                                         signal_count
#                                     ),

#                                     # Latest transcript context
#                                     "transcript_signals": (
#                                         latest_signals
#                                     ),

#                                     "semantic_matches": (
#                                         latest_semantic_matches
#                                     ),

#                                     "matched_phrases": (
#                                         latest_matched_phrases
#                                     ),
#                                 }
#                             )

#                         except Exception:

#                             break

#                         # -------------------------------------------------
#                         # Logging
#                         # -------------------------------------------------

#                         if (
#                             result.get("status")
#                             == "insufficient_audio"
#                         ):

#                             print(
#                                 "[LIVE] "
#                                 "label=INSUFFICIENT_AUDIO "
#                                 f"rms={result.get('audio_rms', 0):.6f} "
#                                 f"active={result.get('active_ratio', 0):.2f}"
#                             )

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
#                             )

#                     except Exception as e:

#                         print(
#                             "[LIVE] Analysis error:",
#                             repr(e),
#                         )

#                     # -------------------------------------------------
#                     # Keep latest 6 seconds.
#                     # -------------------------------------------------

#                     max_buffer_samples = (
#                         sample_rate * 6
#                     )

#                     if (
#                         len(audio_buffer)
#                         > max_buffer_samples
#                     ):

#                         audio_buffer = (
#                             audio_buffer[
#                                 -max_buffer_samples:
#                             ]
#                         )

#     except WebSocketDisconnect:

#         print(
#             "[LIVE] WebSocket disconnected"
#         )

#     except Exception as e:

#         print(
#             "[LIVE] WebSocket error:",
#             repr(e),
#         )

#     finally:

#         old_level = _live_sessions.pop(
#             session_id,
#             "LOW",
#         )

#         if old_level == "HIGH":

#             overview_state[
#                 "high_risk_calls"
#             ] = max(
#                 0,
#                 overview_state[
#                     "high_risk_calls"
#                 ]
#                 - 1,
#             )

#         overview_state["active_calls"] = len(
#             _live_sessions
#         )

#         print(
#             "[LIVE] Session ended"
#         )


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


# # ============================================================
# # VOICE PROFILES
# # ============================================================

# @app.get("/api/voice-profiles")
# async def get_voice_profiles():
#     return {
#         "status": "ok",
#         "profiles": voice_profiles,
#         "count": len(voice_profiles),
#     }


# # ============================================================
# # RUN DIRECTLY
# # ============================================================

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
from fastapi import (
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# MODEL IMPORTS
# ============================================================

try:
    from .model import analyze_audio_file, analyze_pcm_audio
    from .transcript_risk import analyze_transcript
except ImportError:
    from model import analyze_audio_file, analyze_pcm_audio
    from transcript_risk import analyze_transcript


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="VoxShield API",
    version="1.0.0",
    description="Real-time AI voice spoof and impersonation risk detection API.",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONFIGURATION
# ============================================================

ALLOWED_EXTENSIONS = {
    "wav",
    "mp3",
    "m4a",
    "flac",
    "ogg",
    "webm",
}

MAX_UPLOAD_SIZE = 25 * 1024 * 1024

# Prototype risk policy.
# These are screening thresholds, NOT calibrated probabilities.
RISK_POLICY = {
    "LOW": {
        "min": 0,
        "max": 29,
        "label": "LOW",
        "action": "CONTINUE",
        "recommendation": "Continue monitoring the call normally.",
        "verification_required": False,
        "action_paused": False,
    },
    "MEDIUM": {
        "min": 30,
        "max": 59,
        "label": "MEDIUM",
        "action": "VERIFY_CALLER",
        "recommendation": "Verify the caller's identity before sharing sensitive information.",
        "verification_required": True,
        "action_paused": False,
    },
    "HIGH": {
        "min": 60,
        "max": 79,
        "label": "HIGH",
        "action": "SECONDARY_VERIFICATION",
        "recommendation": "Perform secondary verification before approving sensitive requests.",
        "verification_required": True,
        "action_paused": False,
    },
    "CRITICAL": {
        "min": 80,
        "max": 100,
        "label": "CRITICAL",
        "action": "PAUSE_SENSITIVE_ACTION",
        "recommendation": "Do not approve sensitive actions. Verify the caller through a trusted channel.",
        "verification_required": True,
        "action_paused": True,
    },
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

    "alerts": [],
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
# ALERT HISTORY
# ============================================================

_alert_history = []


# ============================================================
# RISK HELPERS
# ============================================================

def _clamp_risk(risk: int) -> int:
    return max(0, min(100, int(risk)))


def _risk_level(risk: int) -> str:
    """
    Four-band prevention policy.

    LOW       0-29
    MEDIUM   30-59
    HIGH     60-79
    CRITICAL 80-100
    """
    risk = _clamp_risk(risk)

    if risk >= 80:
        return "CRITICAL"

    if risk >= 60:
        return "HIGH"

    if risk >= 30:
        return "MEDIUM"

    return "LOW"


def risk_band(risk: int) -> str:
    """
    Backward-compatible human-readable risk label.
    """
    level = _risk_level(risk)

    if level == "CRITICAL":
        return "CRITICAL RISK"

    if level == "HIGH":
        return "HIGH RISK"

    if level == "MEDIUM":
        return "MEDIUM RISK"

    return "LOW RISK"


def _prevention_decision(risk: int) -> dict:
    """
    Converts the current screening risk into a concrete
    user-facing prevention decision.
    """
    risk = _clamp_risk(risk)
    level = _risk_level(risk)
    policy = RISK_POLICY[level]

    return {
        "risk": risk,
        "level": level,
        "action": policy["action"],
        "recommendation": policy["recommendation"],
        "verification_required": bool(
            policy["verification_required"]
        ),
        "action_paused": bool(
            policy["action_paused"]
        ),
        "alert_required": level in {
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        },
    }


def _record_risk_activity(risk: int):
    now = datetime.now()
    current_time = now.strftime("%H:%M")

    if (
        not overview_state["risk_activity"]
        or overview_state["risk_activity"][-1]["time"]
        != current_time
    ):
        overview_state["risk_activity"].append(
            {
                "time": current_time,
                "low": 0,
                "medium": 0,
                "high": 0,
                "critical": 0,
            }
        )

    point = overview_state["risk_activity"][-1]

    level = _risk_level(risk).lower()

    if level not in point:
        level = "low"

    point[level] += 1

    overview_state["risk_activity"] = (
        overview_state["risk_activity"][-7:]
    )


# ============================================================
# ALERT ENGINE
# ============================================================

def _create_alert(
    risk: int,
    detection: str,
    source: str = "LIVE CALL",
    signals=None,
    force: bool = False,
) -> dict:
    """
    Create a structured alert.

    This is intentionally separate from the ML score so the
    frontend can explain what action should be taken.
    """
    risk = _clamp_risk(risk)
    decision = _prevention_decision(risk)

    now = datetime.now()

    alert = {
        "id": f"ALT-{now.strftime('%H%M%S%f')[:10]}",
        "timestamp": now.isoformat(),
        "time": now.strftime("%H:%M:%S"),
        "risk": risk,
        "level": decision["level"],
        "detection": detection,
        "source": source,
        "signals": signals or [],
        "recommendation": decision["recommendation"],
        "recommended_action": decision["action"],
        "verification_required": decision["verification_required"],
        "action_paused": decision["action_paused"],
        "status": (
            "ACTION PAUSED"
            if decision["action_paused"]
            else "VERIFICATION REQUIRED"
            if decision["verification_required"]
            else "MONITORING"
        ),
    }

    # Keep global alert history short.
    _alert_history.insert(0, alert)

    del _alert_history[20:]

    # Keep overview alerts short as well.
    overview_state["alerts"] = _alert_history[:10]

    # Verification/action counters are state indicators.
    overview_state["verification_pending"] = sum(
        1
        for item in _alert_history
        if item["verification_required"]
        and item["status"] != "VERIFIED"
    )

    overview_state["actions_paused"] = sum(
        1
        for item in _alert_history
        if item["action_paused"]
        and item["status"] == "ACTION PAUSED"
    )

    print(
        "[ALERT]",
        f"level={alert['level']}",
        f"risk={alert['risk']}",
        f"action={alert['recommended_action']}",
        f"source={alert['source']}",
    )

    return alert


def _maybe_create_alert(
    risk: int,
    previous_level: str,
    detection: str,
    source: str,
    signals=None,
) -> dict | None:
    """
    Prevents alert spam.

    An alert is generated when the risk enters a new band.
    Critical can also be forced by callers if needed.
    """
    current_level = _risk_level(risk)

    if current_level == previous_level:
        return None

    if current_level == "LOW":
        return None

    return _create_alert(
        risk=risk,
        detection=detection,
        source=source,
        signals=signals,
    )


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
                "ACTION PAUSED"
                if level == "CRITICAL"
                else "OPEN"
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
        _clamp_risk(audio_risk),
        _clamp_risk(transcript_risk),
    )


# ============================================================
# OVERVIEW
# ============================================================

@app.get("/api/overview")
def get_overview():
    return overview_state


# ============================================================
# RISK POLICY API
# ============================================================

@app.get("/api/risk-policy")
def get_risk_policy():
    """
    Returns the prevention policy used by the live detector.
    """
    return {
        "status": "ok",
        "policy_type": "prototype_screening_policy",
        "note": (
            "Risk values are screening signals and are not "
            "calibrated probabilities."
        ),
        "thresholds": RISK_POLICY,
    }


# ============================================================
# ALERT API
# ============================================================

@app.get("/api/alerts")
def get_alerts():
    return {
        "status": "ok",
        "count": len(_alert_history),
        "alerts": _alert_history[:20],
    }


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

        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File is larger than 25 MB.",
            )

        result = await asyncio.to_thread(
            analyze_audio_file,
            content,
            filename,
        )

        if result is None:
            raise HTTPException(
                status_code=500,
                detail="Audio analysis returned no result.",
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

        risk = _clamp_risk(risk)

        _record_risk_activity(risk)

        decision = _prevention_decision(risk)

        # Add prevention information without changing
        # existing model fields.
        result["risk_level"] = decision["level"]
        result["risk_status"] = risk_band(risk)
        result["recommendation"] = decision[
            "recommendation"
        ]
        result["recommended_action"] = decision[
            "action"
        ]
        result["verification_required"] = decision[
            "verification_required"
        ]
        result["action_paused"] = decision[
            "action_paused"
        ]

        if decision["alert_required"]:
            alert = _create_alert(
                risk=risk,
                detection=result.get(
                    "label",
                    "AUDIO ANALYSIS",
                ),
                source="UPLOADED AUDIO",
            )

            result["alert"] = alert

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

    # --------------------------------------------------------
    # Latest semantic information
    # --------------------------------------------------------

    latest_signals = []
    latest_semantic_matches = []
    latest_matched_phrases = []

    # Prevent repeated alerts at the same risk band.
    current_alert_level = "LOW"

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
                        min(
                            sample_rate,
                            48000,
                        ),
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

                    current_alert_level = "LOW"

                    _live_sessions[
                        session_id
                    ] = "LOW"

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
                            "risk_policy": RISK_POLICY,
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
                        if isinstance(
                            signal,
                            dict,
                        )
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

                    decision = _prevention_decision(
                        combined_risk
                    )

                    # -------------------------------------------------
                    # Alert detection
                    # -------------------------------------------------

                    alert = None

                    if (
                        decision["level"]
                        != current_alert_level
                        and decision["alert_required"]
                    ):

                        alert = _create_alert(
                            risk=combined_risk,
                            detection="TRANSCRIPT + LIVE RISK",
                            source="LIVE CALL • STT",
                            signals=signal_labels,
                        )

                        current_alert_level = (
                            decision["level"]
                        )

                    elif (
                        decision["level"]
                        == "LOW"
                    ):

                        current_alert_level = "LOW"

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
                        f"combined={combined_risk} "
                        f"level={decision['level']}"
                    )

                    # -------------------------------------------------
                    # Send transcript result to frontend
                    # -------------------------------------------------

                    await websocket.send_json(
                        {
                            "type": "transcript_analysis",

                            "timestamp": (
                                datetime.now()
                                .isoformat()
                            ),

                            "text": text,

                            "transcript_risk": (
                                transcript_risk
                            ),

                            "signals": signal_labels,

                            "matched_phrases": (
                                latest_matched_phrases
                            ),

                            "semantic_matches": (
                                latest_semantic_matches
                            ),

                            "combined_risk": (
                                combined_risk
                            ),

                            "combined_status": (
                                risk_band(
                                    combined_risk
                                )
                            ),

                            "risk_level": (
                                decision["level"]
                            ),

                            "recommendation": (
                                decision[
                                    "recommendation"
                                ]
                            ),

                            "recommended_action": (
                                decision[
                                    "action"
                                ]
                            ),

                            "verification_required": (
                                decision[
                                    "verification_required"
                                ]
                            ),

                            "action_paused": (
                                decision[
                                    "action_paused"
                                ]
                            ),

                            "alert": alert,

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

                    combined_risk = combine_risk(
                        audio_risk,
                        transcript_risk,
                    )

                    decision = _prevention_decision(
                        combined_risk
                    )

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

                                "combined_risk": (
                                    combined_risk
                                ),

                                "risk_level": (
                                    decision["level"]
                                ),

                                "recommendation": (
                                    decision[
                                        "recommendation"
                                    ]
                                ),

                                "recommended_action": (
                                    decision[
                                        "action"
                                    ]
                                ),

                                "verification_required": (
                                    decision[
                                        "verification_required"
                                    ]
                                ),

                                "action_paused": (
                                    decision[
                                        "action_paused"
                                    ]
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
                                    chunk_float
                                    ** 2
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

                        audio_risk = _clamp_risk(
                            audio_risk
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
                        # Prevention decision
                        # -------------------------------------------------

                        decision = _prevention_decision(
                            combined_risk
                        )

                        new_level = (
                            decision["level"]
                        )

                        old_level = (
                            _live_sessions.get(
                                session_id,
                                "LOW",
                            )
                        )

                        # -------------------------------------------------
                        # HIGH / CRITICAL active call counter
                        # -------------------------------------------------

                        if old_level != new_level:

                            if old_level in {
                                "HIGH",
                                "CRITICAL",
                            }:

                                overview_state[
                                    "high_risk_calls"
                                ] = max(
                                    0,
                                    overview_state[
                                        "high_risk_calls"
                                    ]
                                    - 1,
                                )

                            if new_level in {
                                "HIGH",
                                "CRITICAL",
                            }:

                                overview_state[
                                    "high_risk_calls"
                                ] += 1

                            _live_sessions[
                                session_id
                            ] = new_level

                        # -------------------------------------------------
                        # Alert
                        # -------------------------------------------------

                        alert = None

                        if (
                            new_level
                            != current_alert_level
                            and decision[
                                "alert_required"
                            ]
                        ):

                            detection = (
                                result.get(
                                    "label",
                                    "VOICE ANALYSIS",
                                )
                            )

                            alert = _create_alert(
                                risk=combined_risk,
                                detection=detection,
                                source="LIVE CALL • AUDIO",
                                signals=latest_signals,
                            )

                            current_alert_level = (
                                new_level
                            )

                        elif new_level == "LOW":

                            current_alert_level = "LOW"

                        # -------------------------------------------------
                        # Incident
                        # -------------------------------------------------

                        if old_level != new_level:

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

                                    "risk_level": (
                                        decision["level"]
                                    ),

                                    "recommendation": (
                                        decision[
                                            "recommendation"
                                        ]
                                    ),

                                    "recommended_action": (
                                        decision[
                                            "action"
                                        ]
                                    ),

                                    "verification_required": (
                                        decision[
                                            "verification_required"
                                        ]
                                    ),

                                    "action_paused": (
                                        decision[
                                            "action_paused"
                                        ]
                                    ),

                                    "alert": alert,

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
                                f"combined={combined_risk} "
                                f"level={decision['level']} "
                                f"action={decision['action']}"
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

        if old_level in {
            "HIGH",
            "CRITICAL",
        }:

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
        "version": "1.0.0",
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