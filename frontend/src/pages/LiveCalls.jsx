import { WS_BASE_URL } from "./config";
import React, { useEffect, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  AudioWaveform,
  Clock3,
  FileAudio,
  Fingerprint,
  Mic2,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRound,
  Zap,
  MessageSquareText,
} from "lucide-react";

import { Shell, PageTitle } from "../components/Layout";


export default function LiveCalls() {

  // ==========================================================
  // STATE
  // ==========================================================
  const [transcript, setTranscript] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [keywordFlags, setKeywordFlags] = useState([]);
  const [isLive, setIsLive] = useState(false);
  

  const [risk, setRisk] = useState(0);

  const [spoofProbability, setSpoofProbability] =
    useState(0);

  const [bonafideProbability, setBonafideProbability] =
    useState(0);

  const [transcriptRisk, setTranscriptRisk] =
    useState(0);

  const [combinedRisk, setCombinedRisk] =
    useState(0);

  const [signalCount, setSignalCount] =
    useState(0);

  const [voiceRisk, setVoiceRisk] =
    useState("waiting");

  const [verdict, setVerdict] =
    useState("WAITING FOR AUDIO");

  const [statusLabel, setStatusLabel] =
    useState("Start microphone monitoring");

  const [processingTime, setProcessingTime] =
    useState(0);

  const [waveform, setWaveform] =
    useState(
      Array.from(
        { length: 54 },
        () => 8
      )
    );

  const [error, setError] =
    useState("");

  const [elapsed, setElapsed] =
    useState(0);

  const [analysisCount, setAnalysisCount] =
    useState(0);

  const [lastAnalysisAt, setLastAnalysisAt] =
    useState(null);

  const [backendConnected, setBackendConnected] =
    useState(false);

  const [challengeState, setChallengeState] =
    useState("ready");

  const [challengeResult, setChallengeResult] =
    useState("No challenge started");

  const [auditTrail, setAuditTrail] =
    useState([]);
  const [alertNotification, setAlertNotification] = useState(null);
  // ==========================================================
  // REFS
  // ==========================================================

  const websocketRef =
    useRef(null);

  const audioContextRef =
    useRef(null);

  const processorRef =
    useRef(null);

  const sourceRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const sampleBufferRef =
    useRef([]);

  const startTimeRef =
    useRef(null);
  
  const recognitionRef =
    useRef(null);
  const transcriptEndRef =
    useRef(null);

  const challengeTimerRef =
    useRef(null);

  const analysisCountRef =
    useRef(0);

  const challengeStateRef =
    useRef("ready");

  const addAudit = (time, text) => {
    setAuditTrail((prev) => [
      {
        id: Date.now() + Math.random(),
        time,
        text,
      },
      ...prev,
    ].slice(0, 6));
  };

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {

    return () => {
      stopLiveCall();
    };

  }, []);


  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {

    if (!isLive) {
      return;
    }

    const timer =
      setInterval(() => {

        if (!startTimeRef.current) {
          return;
        }

        const seconds =
          Math.floor(
            (Date.now() -
              startTimeRef.current) /
            1000
          );

        setElapsed(seconds);

      }, 1000);

    return () => clearInterval(timer);

  }, [isLive]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [transcript, interimTranscript]);


  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  const formatTime = (seconds) => {

    const mins =
      Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");

    const secs =
      (seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${mins}:${secs}`;
  };


  // ==========================================================
  // DOWNSAMPLE AUDIO TO 16 KHZ
  // ==========================================================

  const downsampleBuffer = (
  buffer,
  inputSampleRate,
  outputSampleRate
) => {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  if (inputSampleRate < outputSampleRate) {
    console.warn(
      `[AUDIO] Cannot upsample ${inputSampleRate}Hz -> ${outputSampleRate}Hz`
    );
    return buffer;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);

  const result = new Float32Array(newLength);

  let resultIndex = 0;

  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(
      Math.floor((i + 1) * ratio),
      buffer.length
    );

    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      sum += buffer[j];
      count++;
    }

    result[resultIndex++] =
      count > 0 ? sum / count : 0;
  }

  return result;
};


  // ==========================================================
  // FLOAT32 -> PCM16
  // ==========================================================

  const floatTo16BitPCM = (float32Array) => {
  const buffer = new ArrayBuffer(
    float32Array.length * 2
  );

  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(
      -1,
      Math.min(1, float32Array[i])
    );

    const value =
      sample < 0
        ? sample * 0x8000
        : sample * 0x7fff;

    view.setInt16(
      i * 2,
      value,
      true
    );
  }

  return buffer;
};

  // ==========================================================
  // LIVE WAVEFORM
  // ==========================================================

  const updateWaveform =
    (audioData) => {

      const samples = [];

      const step =
        Math.max(
          1,
          Math.floor(
            audioData.length / 54
          )
        );

      for (
        let i = 0;
        i < audioData.length;
        i += step
      ) {

        let sum = 0;

        const end =
          Math.min(
            i + step,
            audioData.length
          );

        for (
          let j = i;
          j < end;
          j++
        ) {

          sum +=
            Math.abs(
              audioData[j]
            );

        }

        const average =
          sum /
          Math.max(
            1,
            end - i
          );

        const height =
          Math.min(
            70,
            Math.max(
              8,
              average * 260
            )
          );

        samples.push(height);

      }

      setWaveform(
        samples.slice(0, 54)
      );

    };

  const startSpeechRecognition = () => {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setSpeechSupported(false);
    return;
  }

  setSpeechSupported(true);

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;

  // Change to "hi-IN" if your calls are primarily Hindi.
  recognition.lang = "en-IN";

  recognition.onresult = (event) => {
    let interim = "";
    const newFinalLines = [];

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const text =
        event.results[i][0].transcript.trim();

      if (!text) continue;

      if (event.results[i].isFinal) {
        newFinalLines.push(text);
      } else {
        interim += text;
      }
    }

    if (newFinalLines.length) {
      setTranscript((prev) => [
        ...prev,
        ...newFinalLines.map((text) => ({
          id:
            Date.now() +
            Math.random(),
          text,
          time: new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          ),
        })),
      ]);

      const finalText = newFinalLines.join(" ");

      detectTranscriptSignals(finalText);

      if (
        websocketRef.current &&
        websocketRef.current.readyState === WebSocket.OPEN
      ) {
        websocketRef.current.send(
          JSON.stringify({
            type: "transcript",
            text: finalText,
          })
        );
      }

      addAudit(
        "STT",
        `Speech segment transcribed: ${finalText.slice(0, 90)}${finalText.length > 90 ? "…" : ""}`
      );
    }

    setInterimTranscript(interim);
  };

  recognition.onerror = (event) => {
    console.warn(
      "Speech recognition:",
      event.error
    );
  };

  recognition.onend = () => {
    // Browser may automatically stop continuous
    // recognition. Restart while call is live.
    if (
      websocketRef.current &&
      websocketRef.current.readyState ===
        WebSocket.OPEN
    ) {
      try {
        recognition.start();
      } catch {}
    }
  };

  recognitionRef.current = recognition;

  try {
    recognition.start();
  } catch (error) {
    console.warn(
      "Speech recognition start failed:",
      error
    );
  }
};
  const detectTranscriptSignals = (text) => {
  const lower = text.toLowerCase();

  const patterns = [
    {
      label: "Urgency",
      words: [
        "urgent",
        "immediately",
        "right now",
        "as soon as possible",
      ],
    },
    {
      label: "Financial request",
      words: [
        "transfer",
        "payment",
        "bank",
        "account",
        "money",
        "wire",
        "lakhs",
        "crore",
      ],
    },
    {
      label: "Confidentiality pressure",
      words: [
        "don't tell",
        "do not tell",
        "keep this secret",
        "don't involve",
        "do not involve",
        "confidential",
      ],
    },
    {
      label: "Credential request",
      words: [
        "password",
        "otp",
        "verification code",
        "pin",
        "code",
      ],
    },
  ];

  const detected = [];

  patterns.forEach((pattern) => {
    const matched =
      pattern.words.some((word) =>
        lower.includes(word)
      );

    if (matched) {
      detected.push(pattern.label);
    }
  });

  if (detected.length) {
    setKeywordFlags((prev) => {
      const merged = [
        ...detected,
        ...prev,
      ];

      return [
        ...new Set(merged),
      ].slice(0, 8);
    });

    addAudit(
      "SIGNAL",
      `Transcript signal detected: ${detected.join(", ")}`
    );
  }
};


  // ==========================================================
  // START LIVE CALL
  // ==========================================================

  const startLiveCall =
    async () => {

      try {

        setError("");
        setBackendConnected(false);
        setAnalysisCount(0);
        analysisCountRef.current = 0;
        setLastAnalysisAt(null);
        setTranscript([]);
        setInterimTranscript("");
        setKeywordFlags([]);
        setSignalCount(0);
        setSpoofProbability(0);
        setBonafideProbability(0);
        setTranscriptRisk(0);
        setCombinedRisk(0);
        challengeStateRef.current = "ready";
        setChallengeState("ready");
        setChallengeResult("No challenge started");
        setAuditTrail([
          {
            id: Date.now(),
            time: "00:00",
            text: "Monitoring session requested",
          },
        ]);

        // ----------------------------------------------------
        // MIC PERMISSION
        // ----------------------------------------------------

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: {
                channelCount: {
                  ideal:1,
                  max:1,
                },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            });
        

        streamRef.current =
          stream;

        // ----------------------------------------------------
// MIC DEBUG INFO
// ----------------------------------------------------
        const track = stream.getAudioTracks()[0];

        console.log(
        "[MIC SETTINGS]",
        track.getSettings()
        );

        if (track.getCapabilities) {
        console.log(
        "[MIC CAPABILITIES]",
        track.getCapabilities()
        );
          }
        

        // ----------------------------------------------------
        // WEBSOCKET
        // ----------------------------------------------------

        const WS_BASE_URL =
          import.meta.env.VITE_WS_URL ||
          "WS_BASE_URL";

        const websocket =
          new WebSocket(new WebSocket(`${WS_BASE_URL}/ws/live-call`)
            ///`${import.meta.env.VITE_WS_URL}/ws/live-call`
         /// );
          
          

        websocket.binaryType =
          "arraybuffer";

        websocketRef.current =
          websocket;


        websocket.onopen =
          () => {

            setIsLive(true);

            setVerdict(
              "LISTENING"
            );

            setStatusLabel(
              "Live audio stream connected"
            );

            setVoiceRisk(
              "monitoring"
            );

            setBackendConnected(true);
            setChallengeState((prev) =>
              prev === "ready" ? "ready" : prev
            );

            addAudit(
              "LIVE",
              "Backend WebSocket connected; live audio stream started"
            );

            // Tell the backend that every binary packet
            // below is mono PCM16 at 16 kHz.
            websocket.send(
              JSON.stringify({
                type: "start",
                sample_rate: 16000,
                channels: 1,
                format: "pcm_s16le",
              })
            );

            startTimeRef.current =
              Date.now();

            startSpeechRecognition();

          };


        websocket.onmessage =
          (event) => {

            try {

              const data =
                JSON.parse(
                  event.data
                );

              // --------------------------------------------
              // MODEL RESULT
              // --------------------------------------------

              if (
                data.type ===
                "analysis"
              ) {

                const isInsufficientAudio =
                  data.status === "insufficient_audio" ||
                  data.label === "INSUFFICIENT AUDIO" ||
                  data.verdict === "INSUFFICIENT AUDIO";

                  if (isInsufficientAudio) {
                    setRisk(0);
                    setCombinedRisk(0);

                    setSpoofProbability(0);
                    setBonafideProbability(0);

                    setVoiceRisk("unknown");
                    setVerdict("INSUFFICIENT AUDIO");
                    setStatusLabel("SPEAK CLEARLY");

                    setProcessingTime(
                      Number(data.processing_time_ms || 0)
  );

                    return;
}

                const nextCombinedRisk = Math.max(
                  0,
                  Math.min(
                    100,
                    Number(
                      data.combined_risk ??
                      data.overall_risk ??
                      0
                    )
                  )
                );

                setRisk(nextCombinedRisk);
                setCombinedRisk(nextCombinedRisk);

                setSpoofProbability(
                  Number(
                    data.spoof_probability ||
                    0
                  )
                );

                setBonafideProbability(
                  Number(
                    data.bonafide_probability ||
                    0
                  )
                );

                setTranscriptRisk(
                  Number(data.transcript_risk || 0)
                );

                setSignalCount(
                  Number(data.signal_count || 0)
                );

                setVoiceRisk(
                  data.voice_risk ||
                  "unknown"
                );

                setVerdict(
                  data.combined_status ||
                  data.verdict ||
                  "ANALYZING"
                );

                setStatusLabel(
                  data.status_label ||
                  `Backend CNN: ${data.label || "ANALYZING"}`
                );

                setProcessingTime(
                  data.processing_time_ms ||
                  0
                );

                analysisCountRef.current += 1;
                setAnalysisCount(analysisCountRef.current);
                setLastAnalysisAt(new Date());
                const alertRisk = Number(
  data.combined_risk ??
  data.overall_risk ??
  0
);

const alertLevel =
  data.risk_level ||
  data.combined_status ||
  (
    alertRisk >= 80
      ? "CRITICAL"
      : alertRisk >= 60
        ? "HIGH"
        : alertRisk >= 30
          ? "MEDIUM"
          : "LOW"
  );

if (alertLevel !== "LOW" && alertRisk >= 30) {
  setAlertNotification({
    level: alertLevel,
    risk: Math.round(alertRisk),
    action:
      data.recommended_action ||
      data.recommendation ||
      "VERIFY_CALLER",
    message:
      data.action_paused
        ? "Sensitive action paused"
        : data.verification_required
          ? "Caller verification required"
          : "Review caller activity",
  });

  setTimeout(() => {
    setAlertNotification(null);
  }, 6000);
}
                setBackendConnected(true);

                addAudit(
                  "MODEL",
                  `CNN window analyzed: ${data.label || "UNKNOWN"} · ${Math.round(Number(data.spoof_probability || 0) * 100)}% spoof · ${Math.round(Number(data.bonafide_probability || 0) * 100)}% bonafide · combined ${Math.round(Number(data.combined_risk ?? data.overall_risk ?? 0))}`
                );

                if (challengeStateRef.current === "listening") {
                  const currentRisk = Number(
                    data.combined_risk ?? data.overall_risk ?? 0
                  );
                  if (currentRisk < 50) {
                    challengeStateRef.current = "passed";
                    setChallengeState("passed");
                    setChallengeResult("Challenge audio shows a lower spoof signal");
                  } else {
                    challengeStateRef.current = "review";
                    setChallengeState("review");
                    setChallengeResult("Challenge audio needs manual review");
                  }
                }

              }

              if (data.type === "transcript_analysis") {
                const nextTranscriptRisk = Number(
                  data.transcript_risk || 0
                );
                const nextCombinedRisk = Number(
                  data.combined_risk || 0
                );

                setTranscriptRisk(nextTranscriptRisk);
                setCombinedRisk(nextCombinedRisk);
                setRisk(
                  Math.max(
                    0,
                    Math.min(100, nextCombinedRisk)
                  )
                );
                setSignalCount(Number(data.signal_count || 0));

                if (Array.isArray(data.signals) && data.signals.length) {
                  setKeywordFlags((prev) => [
                    ...new Set([
                      ...data.signals,
                      ...prev,
                    ]),
                  ].slice(0, 8));
                }

                addAudit(
                  "RISK",
                  data.signals?.length
                    ? `Transcript risk: ${data.signals.join(", ")} · combined ${nextCombinedRisk}`
                    : `Transcript analyzed · combined risk ${nextCombinedRisk}`
                );
              }

              if (
                data.type ===
                "error"
              ) {

                setError(
                  data.message
                );

              }

            } catch (err) {

              console.error(
                "WebSocket message error:",
                err
              );

            }

          };


        websocket.onerror =
          () => {

            setBackendConnected(false);

            addAudit(
              "ERROR",
              "Live backend connection error"
            );

            setError(
              "Live backend connection failed."
            );

          };


        websocket.onclose =
          () => {

            setBackendConnected(false);

            addAudit(
              "LIVE",
              "Backend WebSocket disconnected"
            );

            setIsLive(false);

          };


        
      
         
        // ----------------------------------------------------
// AUDIO CONTEXT
// ----------------------------------------------------

const AudioContextClass =
  window.AudioContext ||
  window.webkitAudioContext;

const audioContext =
  new AudioContextClass({
    sampleRate: 16000,
  });

audioContextRef.current =
  audioContext;

console.log(
  "[AUDIO CONTEXT]",
  "requested=16000",
  "actual=",
  audioContext.sampleRate
);

// Some browsers create the context suspended.
if (audioContext.state === "suspended") {
  await audioContext.resume();
}

console.log(
  "[AUDIO CONTEXT STATE]",
  audioContext.state
);

const source =
  audioContext.createMediaStreamSource(
    stream
  );

sourceRef.current = source;

// ----------------------------------------------------
// SCRIPT PROCESSOR
// ----------------------------------------------------

const processor =
  audioContext.createScriptProcessor(
    4096,
    1,
    1
  );

processorRef.current =
  processor;

// ----------------------------------------------------
// AUDIO PROCESSING
// ----------------------------------------------------

let packetCount = 0;
let totalSamplesSent = 0;

processor.onaudioprocess = (event) => {
  if (
    !websocketRef.current ||
    websocketRef.current.readyState !==
      WebSocket.OPEN
  ) {
    return;
  }

  const input =
    event.inputBuffer.getChannelData(0);

  // ----------------------------------------------
  // MIC DEBUG / WAVEFORM
  // ----------------------------------------------

  updateWaveform(input);

  // ----------------------------------------------
  // CALCULATE CHUNK RMS + PEAK
  // ----------------------------------------------

  let sumSq = 0;
  let peak = 0;

  for (let i = 0; i < input.length; i++) {
    const sample = input[i];

    sumSq += sample * sample;

    const abs = Math.abs(sample);

    if (abs > peak) {
      peak = abs;
    }
  }

  const rms = Math.sqrt(
    sumSq / Math.max(1, input.length)
  );
  
  // ----------------------------------------------
  // AUDIO RESAMPLING
  // ----------------------------------------------

  let audio16k;

  if (audioContext.sampleRate === 16000) {
    // Browser already gave us 16 kHz.
    audio16k = input;
  } else {
    // Fallback for browsers that ignore
    // the requested 16 kHz context.
    audio16k = downsampleBuffer(
      input,
      audioContext.sampleRate,
      16000
    );
  }

  // ----------------------------------------------
  // FLOAT32 -> PCM16
  // ----------------------------------------------

  const pcm =
    floatTo16BitPCM(audio16k);

  // ----------------------------------------------
  // SEND TO BACKEND
  // ----------------------------------------------

  websocketRef.current.send(pcm);

  packetCount++;
  totalSamplesSent += audio16k.length;

  // Don't spam console on every audio callback.
  if (packetCount % 25 === 0) {
    console.log(
      "[AUDIO STREAM]",
      {
        packetCount,
        inputSampleRate:
          audioContext.sampleRate,
        inputSamples:
          input.length,
        outputSamples:
          audio16k.length,
        rms:
          Number(rms.toFixed(6)),
        peak:
          Number(peak.toFixed(6)),
        totalSamplesSent,
        approximateSeconds:
          Number(
            (
              totalSamplesSent / 16000
            ).toFixed(2)
          ),
      }
    );
  }
};

// ----------------------------------------------------
// CONNECT AUDIO GRAPH
// ----------------------------------------------------

source.connect(processor);

// IMPORTANT:
// ScriptProcessor needs an output connection
// to stay active, but we don't want microphone
// audio sent to speakers.

const silentGain =
  audioContext.createGain();

silentGain.gain.value = 0;

processor.connect(silentGain);

silentGain.connect(
  audioContext.destination
);

      } catch (err) {

        console.error(
          "Unable to start microphone:",
          err
        );

        setError(
          err.message ||
          "Microphone permission was denied."
        );

        stopLiveCall();

      }

    };


//   // ==========================================================
//   // STOP LIVE CALL
//   // ==========================================================

//   const stopLiveCall =
//     () => {

//       try {

//         if (recognitionRef.current) {
//   try {
//     recognitionRef.current.stop();
//   } catch {}

//   recognitionRef.current = null;
// }

//         if (
//           websocketRef.current &&
//           websocketRef.current.readyState ===
//             WebSocket.OPEN
//         ) {

//           websocketRef.current.send(
//             JSON.stringify({
//               type: "stop",
//             })
//           );

//           websocketRef.current.close();

//         }

//       } catch {}

//       websocketRef.current =
//         null;


//       if (
//         processorRef.current
//       ) {

//         try {
//           processorRef.current.disconnect();
//         } catch {}

//       }

//       processorRef.current =
//         null;


//       if (
//         sourceRef.current
//       ) {

//         try {
//           sourceRef.current.disconnect();
//         } catch {}

//       }

//       sourceRef.current =
//         null;


//       if (
//         audioContextRef.current
//       ) {

//         try {
//           audioContextRef.current.close();
//         } catch {}

//       }

//       audioContextRef.current =
//         null;


//       if (
//         streamRef.current
//       ) {

//         streamRef.current
//           .getTracks()
//           .forEach(
//             (track) =>
//               track.stop()
//           );

//       }

//       streamRef.current =
//         null;


//       if (
//         animationRef.current
//       ) {

//         cancelAnimationFrame(
//           animationRef.current
//         );

//       }


//       if (challengeTimerRef.current) {
//         clearTimeout(challengeTimerRef.current);
//         challengeTimerRef.current = null;
//       }

//       setBackendConnected(false);
//       setIsLive(false);

//       if (elapsed > 0) {
//         addAudit(
//           formatTime(elapsed),
//           "Monitoring session ended"
//         );
//       }

//       setElapsed(0);

//       setVerdict(
//         "CALL ENDED"
//       );

//       setStatusLabel(
//         "Start a new live monitoring session"
//       );

//       setVoiceRisk(
//         "waiting"
//       );

//       setWaveform(
//         Array.from(
//           { length: 54 },
//           () => 8
//         )
//       );

//     };

// ==========================================================
// STOP LIVE CALL
// ==========================================================

const stopLiveCall = () => {
  try {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}

      recognitionRef.current = null;
    }

    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      try {
        websocketRef.current.send(
          JSON.stringify({
            type: "stop",
          })
        );
      } catch {}

      try {
        websocketRef.current.close();
      } catch {}
    }
  } catch {}

  websocketRef.current = null;

  // --------------------------------------------------------
  // STOP AUDIO PROCESSOR
  // --------------------------------------------------------

  if (processorRef.current) {
    try {
      processorRef.current.disconnect();
    } catch {}
  }

  processorRef.current = null;

  // --------------------------------------------------------
  // STOP AUDIO SOURCE
  // --------------------------------------------------------

  if (sourceRef.current) {
    try {
      sourceRef.current.disconnect();
    } catch {}
  }

  sourceRef.current = null;

  // --------------------------------------------------------
  // CLOSE AUDIO CONTEXT
  // --------------------------------------------------------

  if (audioContextRef.current) {
    try {
      audioContextRef.current.close();
    } catch {}
  }

  audioContextRef.current = null;

  // --------------------------------------------------------
  // STOP MICROPHONE
  // --------------------------------------------------------

  if (streamRef.current) {
    streamRef.current
      .getTracks()
      .forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
  }

  streamRef.current = null;

  // --------------------------------------------------------
  // STOP WAVEFORM ANIMATION
  // --------------------------------------------------------

  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }

  // --------------------------------------------------------
  // STOP CHALLENGE TIMER
  // --------------------------------------------------------

  if (challengeTimerRef.current) {
    clearTimeout(challengeTimerRef.current);
    challengeTimerRef.current = null;
  }

  // --------------------------------------------------------
  // SESSION UI STATE
  // --------------------------------------------------------

  setBackendConnected(false);
  setIsLive(false);

  if (elapsed > 0) {
    addAudit(
      formatTime(elapsed),
      "Monitoring session ended"
    );
  }

  setElapsed(0);

  // IMPORTANT:
  // Clear stale model values after the call ends.
  setRisk(0);
  setCombinedRisk(0);
  setSpoofProbability(0);
  setBonafideProbability(0);
  setTranscriptRisk(0);
  setSignalCount(0);
  setProcessingTime(0);

  analysisCountRef.current = 0;
  setAnalysisCount(0);
  setLastAnalysisAt(null);

  setVerdict("NO SIGNAL");

  setStatusLabel(
    "Start a new live monitoring session"
  );

  setVoiceRisk("waiting");

  setKeywordFlags([]);

  setInterimTranscript("");

  setWaveform(
    Array.from(
      { length: 54 },
      () => 8
    )
  );
};
  // ==========================================================
  // LIVE VOICE CHALLENGE
  // ==========================================================

  const startVoiceVerification = async () => {
    if (!isLive) {
      challengeStateRef.current = "listening";
      setChallengeState("listening");
      setChallengeResult("Starting microphone monitoring…");
      addAudit("VERIFY", "Voice challenge requested; starting live stream");
      await startLiveCall();
      return;
    }

    challengeStateRef.current = "listening";
    setChallengeState("listening");
    setChallengeResult("Listening for challenge audio…");
    addAudit("VERIFY", "Live voice challenge started");

    if (challengeTimerRef.current) {
      clearTimeout(challengeTimerRef.current);
    }

    challengeTimerRef.current = setTimeout(() => {
      setChallengeState((current) => {
        if (current === "listening") {
          challengeStateRef.current = "review";
          setChallengeResult(
            "No fresh challenge result yet; keep monitoring"
          );
          addAudit(
            "VERIFY",
            "Challenge window completed; latest CNN signal retained"
          );
          return "review";
        }
        return current;
      });
    }, 5000);
  };


  // ==========================================================
  // RISK COLOR CLASS
  // ==========================================================

  // const riskClass =
  //   risk >= 70
  //     ? "danger"
  //     : risk >= 35
  //       ? "warning"
  //       : "safe";
  const riskClass =
  !isLive
    ? "safe"
    : risk >= 70
      ? "danger"
      : risk >= 35
        ? "warning"
        : "safe";


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Shell>
      {alertNotification && (
      <div className={`live-alert-notification ${alertNotification.level.toLowerCase()}`}>
        <div className="live-alert-icon">
          <AlertTriangle size={18} />
        </div>

        <div className="live-alert-content">
          <strong>
            {alertNotification.level} RISK DETECTED
          </strong>

          <span>
            Risk {alertNotification.risk}/100 · {alertNotification.message}
          </span>

          <small>
            Action: {alertNotification.action}
          </small>
        </div>

        <button
          type="button"
          onClick={() => setAlertNotification(null)}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      </div>
    )}


      <div className="live-page">

        <PageTitle
          eyebrow="Operations / Live Calls"
          title="ACTIVE INCIDENT"
        >

          <span
            className={
              isLive
                ? "live-pill active"
                : "live-pill"
            }
          >

            <span className="live-dot" />

            {isLive
              ? "LIVE CALL"
              : "READY"}

          </span>

        </PageTitle>


        <main className="live-content">


          {/* =================================================
              ACTIVE CALL
          ================================================= */}

          <section className="incident-card">

            <div className="incident-header">

              <div className="caller-block">

                <div className="active-label">

                  <span
                    className={
                      isLive
                        ? "active-dot pulse"
                        : "active-dot"
                    }
                  />

                  {isLive
                    ? "ACTIVE CALL"
                    : "MICROPHONE READY"}

                </div>


                <div className="caller-name">

                  <h2>
                    Local Microphone
                  </h2>

                  <span>
                    — Live audio stream
                  </span>

                </div>


                <div className="call-meta">

                  <span>
                    {formatTime(elapsed)}
                  </span>

                  <span>•</span>

                  <span>
                    {isLive
                      ? "LIVE STREAM"
                      : "OFFLINE"}
                  </span>

                  <span>•</span>

                  <span>
                    {isLive
                      ? "Model monitoring"
                      : "Waiting to start"}
                  </span>

                </div>

              </div>


              {/* RISK SCORE */}

              <div
                className={`risk-score ${riskClass}`}
              >

                <div className="score-row">

                  <strong>
                    {risk}
                  </strong>

                  <span>
                    /100
                  </span>

                </div>


                <div className="score-label">
                  {isLive
                    ? verdict
                    : "NO SIGNAL"}
                </div>

              </div>

            </div>


            {/* =================================================
                LIVE VOICE SIGNAL
            ================================================= */}

            <div className="voice-signal-box">

              <div className="box-header">

                <div className="box-title">

                  <Mic2 size={16} />

                  <span>
                    LIVE VOICE SIGNAL
                  </span>

                </div>


                <div className="live-status">

                  <span
                    className={
                      isLive
                        ? "live-status-dot pulse"
                        : "live-status-dot"
                    }
                  />

                  {isLive
                    ? "LIVE"
                    : "STANDBY"}

                </div>

              </div>


              <div className="waveform">

                {waveform.map(
                  (height, index) => (

                    <i
                      key={index}
                      style={{
                        height:
                          `${height}px`,
                      }}
                    />

                  )
                )}

              </div>

            </div>


            {/* =================================================
                LIVE TRANSCRIPT
            ================================================= */}

            <div className="transcript-box">

              <div className="box-header">

                <div className="box-title">

                  <FileAudio
                    size={16}
                  />

                  <span>
                    LIVE TRANSCRIPT
                  </span>

                </div>


                <span className="small-live">

                  {isLive
                    ? "LISTENING"
                    : "WAITING"}

                </span>

              </div>


              
                <div className="transcript-content">

  {!speechSupported && (
    <div className="transcript-warning">
      Live transcription is not supported
      by this browser. Please use Chrome
      or Edge.
    </div>
  )}

  {transcript.length === 0 &&
    !interimTranscript &&
    speechSupported && (
      <p className="listening">
        {isLive
          ? "Listening for speech..."
          : "Start monitoring to begin transcription."}
      </p>
    )}

  {transcript.map((line) => (
    <div
      key={line.id}
      className="transcript-line"
    >
      <span className="transcript-time">
        {line.time}
      </span>

      <span className="transcript-text">
        "{line.text}"
      </span>
    </div>
  ))}

  {interimTranscript && (
    <div className="transcript-line interim">
      <span className="transcript-time">
        LIVE
      </span>

      <span className="transcript-text">
        "{interimTranscript}"
      </span>
    </div>
  )}

  <div ref={transcriptEndRef} />

</div>
            </div>


            {/* START / STOP */}

            <div className="live-control">

              {!isLive ? (

                <button
                  className="start-live-btn"
                  onClick={
                    startLiveCall
                  }
                >

                  <Mic2 size={16} />

                  Start Live Monitoring

                </button>

              ) : (

                <button
                  className="stop-live-btn"
                  onClick={
                    stopLiveCall
                  }
                >

                  <span />

                  Stop Live Monitoring

                </button>

              )}

            </div>


            {error && (

              <div className="live-error">

                <AlertTriangle
                  size={15}
                />

                <span>
                  {error}
                </span>

              </div>

            )}

          </section>


          {/* =================================================
              REAL-TIME RISK
          ================================================= */}

          <section className="risk-section">

            <div className="section-heading">

              <div>

                <span>
                  REAL-TIME SIGNALS
                </span>

                <h2>
                  Risk Assessment
                </h2>

              </div>

              <Activity
                size={23}
              />

            </div>


            {/* <div className="risk-grid">

              <RiskCard
                title="Voice Integrity Risk"
                value={
                  `${Math.round(
                    spoofProbability * 100
                  )}%`
                }
                type={
                  spoofProbability >= 0.5
                    ? "danger"
                    : "cyan"
                }
              />


              <RiskCard
                title="Model Risk Score"
                value={
                  `${risk}%`
                }
                type={
                  risk >= 70
                    ? "danger"
                    : risk >= 35
                      ? "warning"
                      : "cyan"
                }
              />


              <RiskCard
                title="Detection Status"
                value={
                  isLive
                    ? "LIVE"
                    : "READY"
                }
                type="cyan"
              />

            </div> */}
            <div className="risk-grid">

  <RiskCard
    title="Voice Integrity Risk"
    value={
      isLive
        ? `${Math.round(
            spoofProbability * 100
          )}%`
        : "—"
    }
    type={
      !isLive
        ? "cyan"
        : spoofProbability >= 0.5
          ? "danger"
          : "cyan"
    }
  />

  <RiskCard
    title="Model Risk Score"
    value={
      isLive
        ? `${Math.round(risk)}%`
        : "—"
    }
    type={
      !isLive
        ? "cyan"
        : risk >= 70
          ? "danger"
          : risk >= 35
            ? "warning"
            : "cyan"
    }
  />

  <RiskCard
    title="Detection Status"
    value={
      isLive
        ? "LIVE"
        : "READY"
    }
    type="cyan"
  />

</div>

          </section>


          {/* =================================================
              TRUST + TIMELINE
          ================================================= */}

          <section className="main-grid">


            {/* <div className="glass-card">

              <CardHeader
                icon={
                  <Activity
                    size={17}
                  />
                }
                title="Continuous Trust Score"
                subtitle="Updated from live model analysis"
              />


              <div className="trust-score">

                <strong>
                  {100 - risk}
                </strong>

                <span>
                  /100
                </span>

              </div>


              <div className="critical-small">

                {risk >= 70
                  ? "HIGH RISK"
                  : risk >= 35
                    ? "REVIEW"
                    : "MONITORING"}

              </div>


              <div className="trust-line">

                <span
                  style={{
                    width:
                      `${Math.max(
                        2,
                        100 - risk
                      )}%`,
                  }}
                />

              </div>


              <div className="signal-list">

                <SignalItem
                  name="Spoof probability"
                  value={
                    `${Math.round(
                      spoofProbability *
                      100
                    )}%`
                  }
                />

                <SignalItem
                  name="Overall model risk"
                  value={
                    `${risk}/100`
                  }
                />

                <SignalItem
                  name="Model processing"
                  value={
                    `${processingTime} ms`
                  }
                />

                <SignalItem
                  name="Detection state"
                  value={
                    isLive
                      ? "LIVE"
                      : "STANDBY"
                  }
                />

              </div>

            </div> */}
          <div className="glass-card">

  <CardHeader
    icon={
      <Activity
        size={17}
      />
    }
    title="Continuous Trust Score"
    subtitle={
      isLive
        ? "Updated from live model analysis"
        : "Waiting for live audio analysis"
    }
  />

  <div className="trust-score">

    <strong>
      {isLive
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(100 - risk)
            )
          )
        : 0}
    </strong>

    <span>
      /100
    </span>

  </div>

  <div className="critical-small">

    {!isLive
      ? "NO SIGNAL"
      : risk >= 70
        ? "HIGH RISK"
        : risk >= 35
          ? "REVIEW"
          : "MONITORING"}

  </div>

  <div className="trust-line">

    <span
      style={{
        width: isLive
          ? `${Math.max(
              2,
              100 - risk
            )}%`
          : "2%",
      }}
    />

  </div>

  <div className="signal-list">

    <SignalItem
      name="Spoof probability"
      value={
        isLive
          ? Math.round(combinedRisk)
          : "—"
      }
    />

    <SignalItem
      name="Overall model risk"
      value={
        isLive
          ? `${Math.round(risk)}/100`
          : "—"
      }
    />

    <SignalItem
      name="Model processing"
      value={
        isLive
          ? `${Math.round(
              processingTime
            )} ms`
          : "—"
      }
    />

    <SignalItem
      name="Detection state"
      value={
        isLive
          ? "LIVE"
          : "STANDBY"
      }
    />

  </div>

</div>


            <div className="glass-card">

              <CardHeader
                icon={
                  <Activity
                    size={17}
                  />
                }
                title="Live Detection Timeline"
                subtitle="Latest model events during the call"
              />


              <div className="timeline-list">

                <div className="timeline-row">

                  <span className="timeline-time">
                    {formatTime(
                      elapsed
                    )}
                  </span>

                  <span className="timeline-text">
                    {isLive
                      ? "Microphone stream active"
                      : "Waiting for microphone"}
                  </span>

                  <span className="timeline-score">
                    {risk}
                  </span>

                </div>


                <div className="timeline-row">

                  <span className="timeline-time">
                    LIVE
                  </span>

                  <span className="timeline-text">
                    {statusLabel}
                  </span>

                  <span className="timeline-score">
                    {Math.round(
                      spoofProbability *
                      100
                    )}
                  </span>

                </div>
                <div className="timeline-row">

  <span className="timeline-time">
    STT
  </span>

  <span className="timeline-text">
    {transcript.length > 0
      ? `Transcribed ${transcript.length} speech segment${
          transcript.length === 1
            ? ""
            : "s"
        }`
      : "Waiting for speech"}
  </span>

  <span className="timeline-score">
    {transcript.length}
  </span>

</div>


                <div className="timeline-row">

                  <span className="timeline-time">
                    MODEL
                  </span>

                  <span className="timeline-text">
                    {isLive
                      ? "Continuous audio analysis"
                      : "Model idle"}
                  </span>

                  <span className="timeline-score">
                    {isLive && processingTime
                      ? `${Math.round(processingTime)} ms`
                      : "—"}
                  </span>

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              WHY FLAGGED
          ================================================= */}

          <section className="main-grid">

            <div className="glass-card">

              <CardHeader
                icon={
                  <AlertTriangle
                    size={17}
                  />
                }
                title="Live Detection Signals"
                subtitle="Signals derived from the current audio stream"
              />


              <div className="flag-list">

                <FlagItem
                  icon={
                    <AudioWaveform
                      size={16}
                    />
                  }
                  title="Voice integrity"
                  text={
                    isLive
                      ? `Spoof ${Math.round(spoofProbability * 100)}% · Bonafide ${Math.round(bonafideProbability * 100)}% · combined risk ${Math.round(combinedRisk)}.`
                      : "Waiting for audio input."
                  }
                />


                <FlagItem
                  icon={
                    <Zap size={16} />
                  }
                  title="Continuous analysis"
                  text={
                    isLive
                      ? `Backend CNN: rolling 3-second window · ${analysisCount} analyzed · ${processingTime} ms last inference.`
                      : "Start monitoring to activate backend audio analysis."
                  }
                />
                {keywordFlags.length > 0 && (
  <div className="detected-signals">

    <div className="detected-title">
      <MessageSquareText size={14} />

      Transcript Signals
    </div>

    <div className="signal-tags">

      {keywordFlags.map((flag) => (
        <span key={flag}>
          {flag}
        </span>
      ))}

    </div>

  </div>
)}


                <FlagItem
                  icon={
                    <UserRound
                      size={16}
                    />
                  }
                  title="Speech activity"
                  text={
                    isLive
                      ? `${transcript.length} final speech segment${transcript.length === 1 ? "" : "s"} · transcript risk ${Math.round(transcriptRisk)} · ${signalCount} signal${signalCount === 1 ? "" : "s"}${interimTranscript ? " · live speech detected" : ""}.`
                      : "No active speech stream."
                  }
                />


                <FlagItem
                  icon={
                    <Fingerprint
                      size={16}
                    />
                  }
                  title="Model status"
                  text={
                    isLive
                      ? backendConnected
                        ? `CNN live · ${analysisCount} window${analysisCount === 1 ? "" : "s"} · combined risk ${Math.round(combinedRisk)}.`
                        : "Connecting to VoxShield CNN backend…"
                      : "VoxShield CNN is currently idle."
                  }
                />

              </div>

            </div>


            {/* TRANSACTION */}

            <div className="glass-card">

              <CardHeader
                icon={
                  <ShieldAlert
                    size={17}
                  />
                }
                title="Live Call Context"
                subtitle="Current monitoring session"
              />


              <div className="transaction-box">

                <div className="transaction-row">

                  <span>
                    Session
                  </span>

                  <strong>
                    {isLive
                      ? "ACTIVE"
                      : "IDLE"}
                  </strong>

                </div>


                <div className="transaction-row">

                  <span>
                    Duration
                  </span>

                  <strong>
                    {formatTime(
                      elapsed
                    )}
                  </strong>

                </div>


                <div className="transaction-row">

                  <span>
                    Model verdict
                  </span>

                  <strong
                    className={
                      risk >= 70
                        ? "danger-value"
                        : ""
                    }
                  >
                    {verdict}
                  </strong>

                </div>


                <div className="transaction-row">

                  <span>
                    Spoof / Bonafide
                  </span>

                  <strong>
                    {Math.round(spoofProbability * 100)}% / {Math.round(bonafideProbability * 100)}%
                  </strong>

                </div>


                <div className="transaction-row">

                  <span>
                    Transcript risk
                  </span>

                  <strong>
                    {Math.round(transcriptRisk)} / 100
                  </strong>

                </div>


                <div className="transaction-row">

                  <span>
                    Recommended state
                  </span>

                  <strong>
                    {risk >= 70
                      ? "VERIFY"
                      : risk >= 50
                        ? "REVIEW"
                        : "MONITOR"}
                  </strong>

                </div>

                <div className="transaction-row">

                  <span>
                    Backend
                  </span>

                  <strong>
                    {backendConnected ? "CONNECTED" : "DISCONNECTED"}
                  </strong>

                </div>

                <div className="transaction-row">

                  <span>
                    Live analyses
                  </span>

                  <strong>
                    {analysisCount}
                  </strong>

                </div>

                <div className="transaction-row">

                  <span>
                    Last model update
                  </span>

                  <strong>
                    {lastAnalysisAt
                      ? lastAnalysisAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "--"}
                  </strong>

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              VERIFICATION + AUDIT
          ================================================= */}

          <section className="main-grid">

            <div className="glass-card">

              <CardHeader
                icon={
                  <Fingerprint
                    size={17}
                  />
                }
                title="Voice Integrity Test"
                subtitle="Independent verification challenge"
              />


              <div className="challenge-box">

                <div className="challenge-status">

                  <div className="challenge-icon">

                    <Mic2
                      size={18}
                    />

                  </div>


                  <div>

                    <strong>
                      {challengeState === "listening"
                        ? "Challenge listening"
                        : challengeState === "passed"
                          ? "Challenge signal accepted"
                          : challengeState === "review"
                            ? "Challenge needs review"
                            : "Verification available"}
                    </strong>

                    <span>
                      {challengeResult}
                    </span>

                  </div>

                </div>


                <div className="challenge-prompt">

                  <span>
                    CHALLENGE PROMPT
                  </span>

                  <strong>
                    “Please repeat the verification phrase.”
                  </strong>

                </div>


                <div className="challenge-actions">

                  <button
                    className="verify-btn"
                    onClick={startVoiceVerification}
                    disabled={challengeState === "listening"}
                  >

                    <UserCheck
                      size={15}
                    />

                    {challengeState === "listening"
                      ? "Listening…"
                      : "Start Verification"}

                  </button>


                  <button
                    className="secondary-btn"
                    onClick={() => {
                      challengeStateRef.current = "ready";
                      setChallengeState("ready");
                      setChallengeResult("Challenge postponed");
                      if (challengeTimerRef.current) {
                        clearTimeout(challengeTimerRef.current);
                        challengeTimerRef.current = null;
                      }
                      addAudit("VERIFY", "Voice challenge postponed");
                    }}
                  >

                    <Clock3
                      size={15}
                    />

                    Later

                  </button>

                </div>

              </div>

            </div>


            <div className="glass-card">

              <CardHeader
                icon={
                  <FileAudio
                    size={17}
                  />
                }
                title="Audit Trail"
                subtitle="Current live monitoring state"
              />


              <div className="audit-list">

                {auditTrail.length > 0 ? (
                  auditTrail.slice(0, 4).map((item) => (
                    <AuditItem
                      key={item.id}
                      time={item.time}
                      text={item.text}
                    />
                  ))
                ) : (
                  <>
                    <AuditItem
                      time="00:00"
                      text="Monitoring not started"
                    />
                    <AuditItem
                      time="MODEL"
                      text="Model idle"
                    />
                  </>
                )}

              </div>

            </div>

          </section>


          {/* =================================================
              SAFETY GATE
          ================================================= */}

          <section className="safety-gate">

            <div className="safety-icon">

              <ShieldCheck
                size={21}
              />

            </div>


            <div className="safety-copy">

              <strong>
                LIVE MONITORING GATE
              </strong>

              <span>
                {isLive
                  ? "Audio is actively being monitored by VoxShield."
                  : "Start live monitoring to begin model analysis."}
              </span>

            </div>


            <div className="safety-actions">

              {!isLive ? (

                <button
                  className="verify-button"
                  onClick={
                    startLiveCall
                  }
                >
                  Start Monitoring
                </button>

              ) : (

                <button
                  className="block-button"
                  onClick={
                    stopLiveCall
                  }
                >
                  Stop Monitoring
                </button>

              )}

            </div>

          </section>

        </main>


        {/* ===================================================
            PAGE CSS
        =================================================== */}

        <style>{`

          * {
            box-sizing: border-box;
          }

          .live-page {
            min-height: 100%;
            color: #dce8e9;
            position: relative;
          }

          .live-page::before {
            content: "";
            position: fixed;
            width: 480px;
            height: 480px;
            left: 2%;
            top: 110px;
            background: rgba(0,190,200,.10);
            filter: blur(100px);
            pointer-events: none;
          }

          .live-page::after {
            content: "";
            position: fixed;
            width: 500px;
            height: 500px;
            right: 2%;
            top: 420px;
            background: rgba(20,55,120,.10);
            filter: blur(110px);
            pointer-events: none;
          }

          .live-content {
            position: relative;
            z-index: 1;
            width: min(1180px, calc(100% - 48px));
            margin: 0 auto;
            padding: 30px 0 80px;
          }

          .live-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 16px;
            border-radius: 999px;
            background: rgba(90,20,28,.20);
            border: 1px solid rgba(255,90,105,.20);
            color: #ff858f;
            font-size: 12px;
            font-weight: 600;
          }

          .live-pill.active {
            box-shadow: 0 0 20px rgba(255,80,100,.12);
          }

          .live-dot,
          .active-dot,
          .live-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #28d6d9;
          }

          .live-dot,
          .active-dot.pulse,
          .live-status-dot.pulse {
            background: #ff6876;
            box-shadow: 0 0 12px rgba(255,104,118,.8);
            animation: livePulse 1.2s infinite;
          }

          @keyframes livePulse {
            0%,100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: .35;
              transform: scale(.7);
            }
          }

          .incident-card {
            padding: 22px;
            border-radius: 22px;
            background: linear-gradient(
              145deg,
              rgba(14,35,39,.78),
              rgba(6,21,25,.74)
            );
            border: 1px solid rgba(114,185,190,.13);
            box-shadow:
              0 25px 80px rgba(0,0,0,.22),
              inset 0 1px 0 rgba(255,255,255,.035);
            backdrop-filter: blur(22px);
          }

          .incident-header {
            display: grid;
            grid-template-columns: minmax(0,1fr) 142px;
            gap: 18px;
          }

          .caller-block {
            padding: 5px 3px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .active-label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 9px;
            color: rgba(77,204,211,.70);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .09em;
          }

          .caller-name {
            display: flex;
            align-items: baseline;
            gap: 10px;
            flex-wrap: wrap;
          }

          .caller-name h2 {
            margin: 0;
            font-size: 25px;
            color: #e4eeee;
          }

          .caller-name span {
            color: rgba(166,189,191,.58);
            font-size: 14px;
          }

          .call-meta {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            color: rgba(143,173,176,.56);
            font-size: 12px;
          }

          .risk-score {
            min-height: 108px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            background: rgba(30,30,30,.25);
            border: 1px solid rgba(100,180,186,.15);
          }

          .risk-score.danger {
            border-color: rgba(255,91,107,.28);
          }

          .risk-score.warning {
            border-color: rgba(255,193,70,.28);
          }

          .score-row {
            display: flex;
            align-items: baseline;
            gap: 5px;
          }

          .score-row strong {
            color: #64d9d9;
            font-size: 38px;
            line-height: 1;
          }

          .risk-score.danger .score-row strong {
            color: #ff7c89;
          }

          .risk-score.warning .score-row strong {
            color: #ffc94d;
          }

          .score-row span {
            color: rgba(188,167,170,.52);
            font-size: 12px;
          }

          .score-label {
            margin-top: 10px;
            color: #7edfe1;
            font-size: 9px;
            letter-spacing: .08em;
            text-align: center;
          }

          .risk-score.danger .score-label {
            color: #ff7883;
          }

          .voice-signal-box,
          .transcript-box {
            border-radius: 17px;
            background: rgba(3,19,22,.62);
            border: 1px solid rgba(100,180,186,.11);
          }

          .voice-signal-box {
            margin-top: 17px;
            padding: 15px 17px 14px;
          }

          .transcript-box {
            margin-top: 13px;
            padding: 16px 19px 18px;
          }

          .box-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .box-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(83,199,207,.66);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .10em;
          }

          .live-status {
            display: flex;
            align-items: center;
            gap: 7px;
            color: #ff7883;
            font-size: 10px;
          }

          .waveform {
            height: 82px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            margin-top: 4px;
            overflow: hidden;
          }

          .waveform i {
            width: 4px;
            min-height: 8px;
            display: block;
            border-radius: 99px;
            background: linear-gradient(
              to bottom,
              rgba(55,211,217,.88),
              rgba(25,121,129,.48)
            );
            transition: height .08s linear;
          }

          .small-live {
            padding: 4px 8px;
            border-radius: 999px;
            color: #ff7f89;
            background: rgba(255,78,95,.08);
            border: 1px solid rgba(255,78,95,.13);
            font-size: 9px;
          }

          .transcript-content {
            display: flex;
            flex-direction: column;
            gap: 7px;
            margin-top: 14px;
          }

          .transcript-content p {
            margin: 0;
            color: rgba(192,210,211,.72);
            font-size: 14px;
          }

          .transcript-content .listening {
            color: #e9b1b7;
            font-weight: 600;
          }

          .muted-line {
            color: rgba(143,173,176,.45) !important;
            font-size: 12px !important;
          }

          .live-control {
            display: flex;
            justify-content: center;
            margin-top: 17px;
          }

          .start-live-btn,
          .stop-live-btn {
            border: 0;
            border-radius: 10px;
            padding: 12px 22px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 9px;
          }

          .start-live-btn {
            background: #1fc3c5;
            color: #041013;
          }

          .stop-live-btn {
            background: rgba(255,70,85,.12);
            color: #ff7b87;
            border: 1px solid rgba(255,80,95,.25);
          }

          .stop-live-btn span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #ff6876;
          }

          .live-error {
            margin-top: 14px;
            padding: 11px 14px;
            border: 1px solid rgba(255,80,95,.2);
            background: rgba(80,20,28,.2);
            color: #ff9aa3;
            border-radius: 9px;
            display: flex;
            gap: 8px;
            font-size: 12px;
          }

          .risk-section {
            margin-top: 40px;
          }

          .section-heading {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 17px;
          }

          .section-heading span {
            display: block;
            margin-bottom: 6px;
            color: rgba(67,188,198,.55);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .12em;
          }

          .section-heading h2 {
            margin: 0;
            color: #dce9ea;
            font-size: 20px;
          }

          .section-heading > svg {
            color: rgba(42,191,201,.60);
          }

          .risk-grid {
            display: grid;
            grid-template-columns: repeat(3,minmax(0,1fr));
            gap: 18px;
          }

          .risk-card {
            padding: 20px;
            border-radius: 18px;
            background: rgba(5,25,29,.68);
            border: 1px solid rgba(100,180,186,.11);
          }

          .risk-card-title {
            color: rgba(150,180,183,.65);
            font-size: 11px;
          }

          .risk-card-value {
            margin-top: 8px;
            font-size: 28px;
            font-weight: 700;
            color: #5ee1e1;
          }

          .risk-card.danger .risk-card-value {
            color: #ff7180;
          }

          .risk-card.warning .risk-card-value {
            color: #ffc94d;
          }

          .main-grid {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 18px;
            margin-top: 24px;
          }

          .glass-card {
            padding: 20px;
            border-radius: 18px;
            background: rgba(5,24,28,.66);
            border: 1px solid rgba(100,180,186,.11);
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .card-header-icon {
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            border-radius: 8px;
            color: #38d2d6;
            border: 1px solid rgba(50,210,215,.25);
          }

          .card-header strong {
            display: block;
            font-size: 13px;
            color: #dce9ea;
          }

          .card-header span {
            display: block;
            margin-top: 3px;
            color: rgba(143,173,176,.50);
            font-size: 9px;
          }

          .trust-score {
            margin-top: 22px;
            display: flex;
            align-items: baseline;
            gap: 5px;
          }

          .trust-score strong {
            font-size: 45px;
            color: #ff7583;
          }

          .trust-score span {
            color: rgba(170,180,185,.45);
          }

          .critical-small {
            margin-top: 2px;
            color: #ff7883;
            font-size: 10px;
            letter-spacing: .12em;
          }

          .trust-line {
            height: 4px;
            margin-top: 13px;
            background: rgba(255,255,255,.05);
            border-radius: 99px;
            overflow: hidden;
          }

          .trust-line span {
            display: block;
            height: 100%;
            background: #ff6876;
            transition: width .3s ease;
          }

          .detected-signals {
  margin-top: 15px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,.05);
}

.detected-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #e6d08a;
  font-size: 10px;
  font-weight: 600;
}

.signal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.signal-tags span {
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(255,190,50,.07);
  border: 1px solid rgba(255,190,50,.15);
  color: #e5c66c;
  font-size: 9px;
}

          .signal-list {
            margin-top: 17px;
          }

          .signal-item {
            display: flex;
            justify-content: space-between;
            padding: 9px 0;
            border-bottom: 1px solid rgba(255,255,255,.035);
            font-size: 11px;
          }

          .signal-item span {
            color: rgba(153,181,183,.55);
          }

          .signal-item strong {
            color: #dbe8e9;
          }

          .timeline-list {
            margin-top: 18px;
          }

          .timeline-row {
            display: grid;
            grid-template-columns: 55px 1fr 45px;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,.035);
            font-size: 11px;
          }

          .timeline-time {
            color: #35cbd0;
          }

          .timeline-text {
            color: rgba(186,207,208,.66);
          }

          .timeline-score {
            text-align: right;
            color: #ff7883;
          }

          .flag-list {
            margin-top: 17px;
          }

          .flag-item {
            display: flex;
            gap: 11px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,.035);
          }

          .flag-icon {
            color: #32ced2;
            padding-top: 2px;
          }

          .flag-item strong {
            display: block;
            color: #dce8e9;
            font-size: 12px;
          }

          .flag-item span {
            display: block;
            margin-top: 4px;
            color: rgba(150,180,183,.55);
            font-size: 10px;
            line-height: 1.5;
          }

          .transcript-content {
  max-height: 230px;
  overflow-y: auto;
  padding-right: 8px;
}

.transcript-line {
  display: grid;
  grid-template-columns: 55px 1fr;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255,255,255,.035);
}

.transcript-time {
  color: #38cbd0;
  font-size: 9px;
  padding-top: 2px;
}

.transcript-text {
  color: #d9e4e5;
  font-size: 13px;
  line-height: 1.5;
}

.transcript-line.interim {
  opacity: .55;
}

.transcript-line.interim .transcript-text {
  color: #7bd7da;
}

.transcript-warning {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255,180,50,.07);
  border: 1px solid rgba(255,180,50,.16);
  color: #e7c56d;
  font-size: 11px;
}

          .transaction-box {
            margin-top: 17px;
          }

          .transaction-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,.035);
            font-size: 11px;
          }

          .transaction-row span {
            color: rgba(150,180,183,.55);
          }

          .transaction-row strong {
            color: #dce8e9;
            text-align: right;
          }

          .danger-value {
            color: #ff7883 !important;
          }

          .challenge-box {
            margin-top: 18px;
          }

          .challenge-status {
            display: flex;
            gap: 12px;
          }

          .challenge-icon {
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            color: #36d2d5;
            border: 1px solid rgba(50,210,215,.22);
            border-radius: 9px;
          }

          .challenge-status strong {
            display: block;
            color: #dce8e9;
            font-size: 12px;
          }

          .challenge-status span {
            display: block;
            margin-top: 4px;
            color: rgba(150,180,183,.55);
            font-size: 10px;
          }

          .challenge-prompt {
            margin-top: 17px;
            padding: 14px;
            background: rgba(2,16,19,.65);
            border: 1px solid rgba(100,180,186,.08);
            border-radius: 10px;
          }

          .challenge-prompt span {
            display: block;
            color: rgba(54,205,210,.55);
            font-size: 9px;
            letter-spacing: .1em;
          }

          .challenge-prompt strong {
            display: block;
            margin-top: 8px;
            color: #dbe7e8;
            font-size: 12px;
          }

          .challenge-actions {
            display: flex;
            gap: 10px;
            margin-top: 14px;
          }

          .verify-btn,
          .secondary-btn {
            border-radius: 8px;
            padding: 9px 13px;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
          }

          .verify-btn {
            background: #1dc2c4;
            border: 0;
            color: #041013;
          }

          .secondary-btn {
            background: transparent;
            color: #9bb1b3;
            border: 1px solid rgba(120,170,175,.18);
          }

          .audit-list {
            margin-top: 18px;
          }

          .audit-item {
            display: flex;
            gap: 12px;
            padding: 11px 0;
            border-bottom: 1px solid rgba(255,255,255,.035);
          }

          .audit-time {
            color: #39cbd0;
            font-size: 10px;
            min-width: 45px;
          }

          .audit-text {
            color: rgba(180,205,206,.66);
            font-size: 11px;
          }

          .safety-gate {
            margin-top: 24px;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-radius: 15px;
            background: rgba(7,25,29,.72);
            border: 1px solid rgba(70,180,185,.12);
          }

          .safety-icon {
            color: #39d1d4;
          }

          .safety-copy {
            flex: 1;
          }

          .safety-copy strong {
            display: block;
            color: #dce8e9;
            font-size: 11px;
            letter-spacing: .08em;
          }

          .safety-copy span {
            display: block;
            margin-top: 4px;
            color: rgba(150,180,183,.52);
            font-size: 10px;
          }

          .safety-actions {
            display: flex;
            gap: 8px;
          }

          .verify-button,
          .block-button {
            border: 0;
            border-radius: 8px;
            padding: 9px 14px;
            cursor: pointer;
          }

          .verify-button {
            background: #1dc2c4;
            color: #041013;
          }

          .block-button {
            background: rgba(255,70,85,.12);
            color: #ff7b87;
            border: 1px solid rgba(255,80,95,.2);
          }

          @media (max-width: 850px) {

            .risk-grid,
            .main-grid {
              grid-template-columns: 1fr;
            }

            .incident-header {
              grid-template-columns: 1fr;
            }

            .risk-score {
              min-height: 100px;
            }

            .safety-gate {
              flex-direction: column;
              align-items: flex-start;
            }

           /* =========================================================
   LIVE RISK ALERT — GLASSMORPHISM
   ========================================================= */

.live-alert-notification {
  position: fixed;

  top: 76px;
  right: 26px;

  z-index: 99999;

  width: 390px;
  min-height: 86px;

  display: flex;
  align-items: center;

  gap: 13px;

  padding: 14px 15px;

  /* Glass surface */
  background:
    linear-gradient(
      135deg,
      rgba(15, 34, 38, 0.94),
      rgba(5, 17, 21, 0.91)
    );

  /* Soft border */
  border: 1px solid rgba(118, 190, 195, 0.16);

  border-left: 3px solid #f59e0b;

  border-radius: 15px;

  /* Depth + glass glow */
  box-shadow:
    0 24px 65px rgba(0, 0, 0, 0.42),
    0 8px 25px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.035);

  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);

  overflow: hidden;

  animation:
    liveAlertEnter
    0.38s
    cubic-bezier(0.22, 1, 0.36, 1);

  color: #dce9ea;
}


/* =========================================================
   TOP GLASS HIGHLIGHT
   ========================================================= */

.live-alert-notification::before {
  content: "";

  position: absolute;

  top: 0;
  left: 0;
  right: 0;

  height: 1px;

  background:
    linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.14),
      transparent
    );

  pointer-events: none;
}


/* =========================================================
   SUBTLE AMBIENT GLOW
   ========================================================= */

.live-alert-notification::after {
  content: "";

  position: absolute;

  width: 120px;
  height: 120px;

  right: -55px;
  top: -60px;

  border-radius: 50%;

  background: rgba(245, 158, 11, 0.07);

  filter: blur(35px);

  pointer-events: none;
}


/* =========================================================
   ICON
   ========================================================= */

.live-alert-icon {
  position: relative;

  width: 40px;
  height: 40px;

  flex: 0 0 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 11px;

  background:
    linear-gradient(
      145deg,
      rgba(245, 158, 11, 0.14),
      rgba(245, 158, 11, 0.055)
    );

  border: 1px solid rgba(245, 158, 11, 0.16);

  color: #fbbf24;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.035),
    0 0 18px rgba(245,158,11,.05);
}


/* small status dot */

.live-alert-icon::after {
  content: "";

  position: absolute;

  width: 5px;
  height: 5px;

  right: 6px;
  top: 6px;

  border-radius: 50%;

  background: currentColor;

  box-shadow:
    0 0 8px currentColor;

  opacity: .85;
}


/* =========================================================
   CONTENT
   ========================================================= */

.live-alert-content {
  min-width: 0;

  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 4px;
}


.live-alert-content strong {
  display: block;

  color: #e5eeee;

  font-size: 11px;

  font-weight: 700;

  letter-spacing: .075em;

  line-height: 1.25;
}


.live-alert-content span {
  display: block;

  color: rgba(194, 216, 218, .76);

  font-size: 11px;

  font-weight: 400;

  line-height: 1.4;
}


.live-alert-content small {
  display: block;

  margin-top: 1px;

  color: rgba(132, 166, 168, .58);

  font-size: 9px;

  font-weight: 600;

  letter-spacing: .035em;

  line-height: 1.3;
}


/* =========================================================
   CLOSE BUTTON
   ========================================================= */

.live-alert-notification > button {
  position: relative;

  z-index: 2;

  width: 28px;
  height: 28px;

  flex: 0 0 28px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;

  border: 1px solid rgba(115, 163, 166, .08);

  border-radius: 8px;

  background: rgba(100, 150, 153, .045);

  color: rgba(155, 181, 183, .55);

  font-size: 17px;

  line-height: 1;

  cursor: pointer;

  transition:
    background .18s ease,
    color .18s ease,
    border-color .18s ease,
    transform .18s ease;
}


.live-alert-notification > button:hover {
  color: #dcebec;

  background: rgba(100, 170, 175, .10);

  border-color: rgba(100, 190, 195, .15);

  transform: scale(1.04);
}


/* =========================================================
   MEDIUM RISK
   ========================================================= */

.live-alert-notification.medium {
  border-left-color: #eab308;
}

.live-alert-notification.medium::after {
  background: rgba(234, 179, 8, .07);
}

.live-alert-notification.medium .live-alert-icon {
  color: #facc15;

  background:
    linear-gradient(
      145deg,
      rgba(234, 179, 8, .14),
      rgba(234, 179, 8, .045)
    );

  border-color: rgba(234, 179, 8, .15);
}


/* =========================================================
   HIGH RISK
   ========================================================= */

.live-alert-notification.high {
  border-left-color: #f97316;
}

.live-alert-notification.high::after {
  background: rgba(249, 115, 22, .075);
}

.live-alert-notification.high .live-alert-icon {
  color: #fb923c;

  background:
    linear-gradient(
      145deg,
      rgba(249, 115, 22, .15),
      rgba(249, 115, 22, .045)
    );

  border-color: rgba(249, 115, 22, .16);
}


/* =========================================================
   CRITICAL RISK
   ========================================================= */

.live-alert-notification.critical {
  border-left-color: #ef4444;

  box-shadow:
    0 25px 70px rgba(0, 0, 0, .48),
    0 8px 28px rgba(0, 0, 0, .22),
    0 0 28px rgba(239, 68, 68, .075),
    inset 0 1px 0 rgba(255,255,255,.035);
}

.live-alert-notification.critical::after {
  background: rgba(239, 68, 68, .09);
}

.live-alert-notification.critical .live-alert-icon {
  color: #f87171;

  background:
    linear-gradient(
      145deg,
      rgba(239, 68, 68, .16),
      rgba(239, 68, 68, .045)
    );

  border-color: rgba(239, 68, 68, .17);

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.035),
    0 0 20px rgba(239,68,68,.07);
}


/* =========================================================
   ENTRY ANIMATION
   ========================================================= */

@keyframes liveAlertEnter {

  from {
    opacity: 0;

    transform:
      translate3d(24px, -10px, 0)
      scale(.965);

    filter: blur(2px);
  }

  to {
    opacity: 1;

    transform:
      translate3d(0, 0, 0)
      scale(1);

    filter: blur(0);
  }

}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 600px) {

  .live-alert-notification {
    top: 68px;
    right: 12px;
    left: 12px;

    width: auto;

    min-height: 80px;

    padding: 12px;
  }

  .live-alert-icon {
    width: 36px;
    height: 36px;

    flex-basis: 36px;
  }

  .live-alert-content strong {
    font-size: 10px;
  }

  .live-alert-content span {
    font-size: 10px;
  }

  .live-alert-content small {
    font-size: 8px;
  }

}

          }

        `}</style>

      </div>

    </Shell>
  );
}


// ============================================================
// SMALL COMPONENTS
// ============================================================

function CardHeader({
  icon,
  title,
  subtitle,
}) {

  return (
    <div className="card-header">

      <div className="card-header-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>

      </div>

    </div>
  );
}


function RiskCard({
  title,
  value,
  type,
}) {

  return (
    <div
      className={`risk-card ${type}`}
    >

      <div className="risk-card-title">
        {title}
      </div>

      <div className="risk-card-value">
        {value}
      </div>

    </div>
  );
}


function SignalItem({
  name,
  value,
}) {

  return (
    <div className="signal-item">

      <span>
        {name}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function FlagItem({
  icon,
  title,
  text,
}) {

  return (
    <div className="flag-item">

      <div className="flag-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </div>
  );
}


function AuditItem({
  time,
  text,
}) {

  return (
    <div className="audit-item">

      <span className="audit-time">
        {time}
      </span>

      <span className="audit-text">
        {text}
      </span>

    </div>
  );
}





// import React, { useEffect, useRef, useState } from "react";

// import {
//   Activity,
//   AlertTriangle,
//   AudioWaveform,
//   Clock3,
//   FileAudio,
//   Fingerprint,
//   Mic2,
//   ShieldAlert,
//   ShieldCheck,
//   UserCheck,
//   UserRound,
//   Zap,
//   MessageSquareText,
// } from "lucide-react";

// import { Shell, PageTitle } from "../components/Layout";


// export default function LiveCalls() {

//   // ==========================================================
//   // STATE
//   // ==========================================================
//   const [transcript, setTranscript] = useState([]);
//   const [interimTranscript, setInterimTranscript] = useState("");
//   const [speechSupported, setSpeechSupported] = useState(true);
//   const [keywordFlags, setKeywordFlags] = useState([]);
//   const [isLive, setIsLive] = useState(false);
  

//   const [risk, setRisk] = useState(0);

//   const [spoofProbability, setSpoofProbability] =
//     useState(0);

//   const [bonafideProbability, setBonafideProbability] =
//     useState(0);

//   const [transcriptRisk, setTranscriptRisk] =
//     useState(0);

//   const [combinedRisk, setCombinedRisk] =
//     useState(0);

//   const [signalCount, setSignalCount] =
//     useState(0);

//   const [voiceRisk, setVoiceRisk] =
//     useState("waiting");

//   const [verdict, setVerdict] =
//     useState("WAITING FOR AUDIO");

//   const [statusLabel, setStatusLabel] =
//     useState("Start microphone monitoring");

//   const [processingTime, setProcessingTime] =
//     useState(0);

//   const [waveform, setWaveform] =
//     useState(
//       Array.from(
//         { length: 54 },
//         () => 8
//       )
//     );

//   const [error, setError] =
//     useState("");

//   const [elapsed, setElapsed] =
//     useState(0);

//   const [analysisCount, setAnalysisCount] =
//     useState(0);

//   const [lastAnalysisAt, setLastAnalysisAt] =
//     useState(null);

//   const [backendConnected, setBackendConnected] =
//     useState(false);

//   const [challengeState, setChallengeState] =
//     useState("ready");

//   const [challengeResult, setChallengeResult] =
//     useState("No challenge started");

//   const [auditTrail, setAuditTrail] =
//     useState([]);

//   // ==========================================================
//   // REFS
//   // ==========================================================

//   const websocketRef =
//     useRef(null);

//   const audioContextRef =
//     useRef(null);

//   const processorRef =
//     useRef(null);

//   const sourceRef =
//     useRef(null);

//   const streamRef =
//     useRef(null);

//   const animationRef =
//     useRef(null);

//   const sampleBufferRef =
//     useRef([]);

//   const startTimeRef =
//     useRef(null);
  
//   const recognitionRef =
//     useRef(null);
//   const transcriptEndRef =
//     useRef(null);

//   const challengeTimerRef =
//     useRef(null);

//   const analysisCountRef =
//     useRef(0);

//   const challengeStateRef =
//     useRef("ready");

//   const addAudit = (time, text) => {
//     setAuditTrail((prev) => [
//       {
//         id: Date.now() + Math.random(),
//         time,
//         text,
//       },
//       ...prev,
//     ].slice(0, 6));
//   };

//   // ==========================================================
//   // CLEANUP
//   // ==========================================================

//   useEffect(() => {

//     return () => {
//       stopLiveCall();
//     };

//   }, []);


//   // ==========================================================
//   // TIMER
//   // ==========================================================

//   useEffect(() => {

//     if (!isLive) {
//       return;
//     }

//     const timer =
//       setInterval(() => {

//         if (!startTimeRef.current) {
//           return;
//         }

//         const seconds =
//           Math.floor(
//             (Date.now() -
//               startTimeRef.current) /
//             1000
//           );

//         setElapsed(seconds);

//       }, 1000);

//     return () => clearInterval(timer);

//   }, [isLive]);

//   useEffect(() => {
//     if (transcriptEndRef.current) {
//       transcriptEndRef.current.scrollIntoView({
//         behavior: "smooth",
//         block: "nearest",
//       });
//     }
//   }, [transcript, interimTranscript]);


//   // ==========================================================
//   // FORMAT TIME
//   // ==========================================================

//   const formatTime = (seconds) => {

//     const mins =
//       Math.floor(seconds / 60)
//         .toString()
//         .padStart(2, "0");

//     const secs =
//       (seconds % 60)
//         .toString()
//         .padStart(2, "0");

//     return `${mins}:${secs}`;
//   };


//   // ==========================================================
//   // DOWNSAMPLE AUDIO TO 16 KHZ
//   // ==========================================================

//   const downsampleBuffer = (
//   buffer,
//   inputSampleRate,
//   outputSampleRate
// ) => {
//   if (inputSampleRate === outputSampleRate) {
//     return buffer;
//   }

//   if (inputSampleRate < outputSampleRate) {
//     console.warn(
//       `[AUDIO] Cannot upsample ${inputSampleRate}Hz -> ${outputSampleRate}Hz`
//     );
//     return buffer;
//   }

//   const ratio = inputSampleRate / outputSampleRate;
//   const newLength = Math.round(buffer.length / ratio);

//   const result = new Float32Array(newLength);

//   let resultIndex = 0;

//   for (let i = 0; i < newLength; i++) {
//     const start = Math.floor(i * ratio);
//     const end = Math.min(
//       Math.floor((i + 1) * ratio),
//       buffer.length
//     );

//     let sum = 0;
//     let count = 0;

//     for (let j = start; j < end; j++) {
//       sum += buffer[j];
//       count++;
//     }

//     result[resultIndex++] =
//       count > 0 ? sum / count : 0;
//   }

//   return result;
// };


//   // ==========================================================
//   // FLOAT32 -> PCM16
//   // ==========================================================

//   const floatTo16BitPCM = (float32Array) => {
//   const buffer = new ArrayBuffer(
//     float32Array.length * 2
//   );

//   const view = new DataView(buffer);

//   for (let i = 0; i < float32Array.length; i++) {
//     const sample = Math.max(
//       -1,
//       Math.min(1, float32Array[i])
//     );

//     const value =
//       sample < 0
//         ? sample * 0x8000
//         : sample * 0x7fff;

//     view.setInt16(
//       i * 2,
//       value,
//       true
//     );
//   }

//   return buffer;
// };

//   // ==========================================================
//   // LIVE WAVEFORM
//   // ==========================================================

//   const updateWaveform =
//     (audioData) => {

//       const samples = [];

//       const step =
//         Math.max(
//           1,
//           Math.floor(
//             audioData.length / 54
//           )
//         );

//       for (
//         let i = 0;
//         i < audioData.length;
//         i += step
//       ) {

//         let sum = 0;

//         const end =
//           Math.min(
//             i + step,
//             audioData.length
//           );

//         for (
//           let j = i;
//           j < end;
//           j++
//         ) {

//           sum +=
//             Math.abs(
//               audioData[j]
//             );

//         }

//         const average =
//           sum /
//           Math.max(
//             1,
//             end - i
//           );

//         const height =
//           Math.min(
//             70,
//             Math.max(
//               8,
//               average * 260
//             )
//           );

//         samples.push(height);

//       }

//       setWaveform(
//         samples.slice(0, 54)
//       );

//     };

//   const startSpeechRecognition = () => {
//   const SpeechRecognition =
//     window.SpeechRecognition ||
//     window.webkitSpeechRecognition;

//   if (!SpeechRecognition) {
//     setSpeechSupported(false);
//     return;
//   }

//   setSpeechSupported(true);

//   const recognition = new SpeechRecognition();

//   recognition.continuous = true;
//   recognition.interimResults = true;

//   // Change to "hi-IN" if your calls are primarily Hindi.
//   recognition.lang = "en-IN";

//   recognition.onresult = (event) => {
//     let interim = "";
//     const newFinalLines = [];

//     for (
//       let i = event.resultIndex;
//       i < event.results.length;
//       i++
//     ) {
//       const text =
//         event.results[i][0].transcript.trim();

//       if (!text) continue;

//       if (event.results[i].isFinal) {
//         newFinalLines.push(text);
//       } else {
//         interim += text;
//       }
//     }

//     if (newFinalLines.length) {
//       setTranscript((prev) => [
//         ...prev,
//         ...newFinalLines.map((text) => ({
//           id:
//             Date.now() +
//             Math.random(),
//           text,
//           time: new Date().toLocaleTimeString(
//             [],
//             {
//               hour: "2-digit",
//               minute: "2-digit",
//               second: "2-digit",
//             }
//           ),
//         })),
//       ]);

//       const finalText = newFinalLines.join(" ");

//       detectTranscriptSignals(finalText);

//       if (
//         websocketRef.current &&
//         websocketRef.current.readyState === WebSocket.OPEN
//       ) {
//         websocketRef.current.send(
//           JSON.stringify({
//             type: "transcript",
//             text: finalText,
//           })
//         );
//       }

//       addAudit(
//         "STT",
//         `Speech segment transcribed: ${finalText.slice(0, 90)}${finalText.length > 90 ? "…" : ""}`
//       );
//     }

//     setInterimTranscript(interim);
//   };

//   recognition.onerror = (event) => {
//     console.warn(
//       "Speech recognition:",
//       event.error
//     );
//   };

//   recognition.onend = () => {
//     // Browser may automatically stop continuous
//     // recognition. Restart while call is live.
//     if (
//       websocketRef.current &&
//       websocketRef.current.readyState ===
//         WebSocket.OPEN
//     ) {
//       try {
//         recognition.start();
//       } catch {}
//     }
//   };

//   recognitionRef.current = recognition;

//   try {
//     recognition.start();
//   } catch (error) {
//     console.warn(
//       "Speech recognition start failed:",
//       error
//     );
//   }
// };
//   const detectTranscriptSignals = (text) => {
//   const lower = text.toLowerCase();

//   const patterns = [
//     {
//       label: "Urgency",
//       words: [
//         "urgent",
//         "immediately",
//         "right now",
//         "as soon as possible",
//       ],
//     },
//     {
//       label: "Financial request",
//       words: [
//         "transfer",
//         "payment",
//         "bank",
//         "account",
//         "money",
//         "wire",
//         "lakhs",
//         "crore",
//       ],
//     },
//     {
//       label: "Confidentiality pressure",
//       words: [
//         "don't tell",
//         "do not tell",
//         "keep this secret",
//         "don't involve",
//         "do not involve",
//         "confidential",
//       ],
//     },
//     {
//       label: "Credential request",
//       words: [
//         "password",
//         "otp",
//         "verification code",
//         "pin",
//         "code",
//       ],
//     },
//   ];

//   const detected = [];

//   patterns.forEach((pattern) => {
//     const matched =
//       pattern.words.some((word) =>
//         lower.includes(word)
//       );

//     if (matched) {
//       detected.push(pattern.label);
//     }
//   });

//   if (detected.length) {
//     setKeywordFlags((prev) => {
//       const merged = [
//         ...detected,
//         ...prev,
//       ];

//       return [
//         ...new Set(merged),
//       ].slice(0, 8);
//     });

//     addAudit(
//       "SIGNAL",
//       `Transcript signal detected: ${detected.join(", ")}`
//     );
//   }
// };


//   // ==========================================================
//   // START LIVE CALL
//   // ==========================================================

//   const startLiveCall =
//     async () => {

//       try {

//         setError("");
//         setBackendConnected(false);
//         setAnalysisCount(0);
//         analysisCountRef.current = 0;
//         setLastAnalysisAt(null);
//         setTranscript([]);
//         setInterimTranscript("");
//         setKeywordFlags([]);
//         setSignalCount(0);
//         setSpoofProbability(0);
//         setBonafideProbability(0);
//         setTranscriptRisk(0);
//         setCombinedRisk(0);
//         challengeStateRef.current = "ready";
//         setChallengeState("ready");
//         setChallengeResult("No challenge started");
//         setAuditTrail([
//           {
//             id: Date.now(),
//             time: "00:00",
//             text: "Monitoring session requested",
//           },
//         ]);

//         // ----------------------------------------------------
//         // MIC PERMISSION
//         // ----------------------------------------------------

//         const stream =
//           await navigator.mediaDevices
//             .getUserMedia({
//               audio: {
//                 channelCount: {
//                   ideal:1,
//                   max:1,
//                 },
//                 echoCancellation: false,
//                 noiseSuppression: false,
//                 autoGainControl: false,
//               },
//             });
        

//         streamRef.current =
//           stream;

//         // ----------------------------------------------------
// // MIC DEBUG INFO
// // ----------------------------------------------------
//         const track = stream.getAudioTracks()[0];

//         console.log(
//         "[MIC SETTINGS]",
//         track.getSettings()
//         );

//         if (track.getCapabilities) {
//         console.log(
//         "[MIC CAPABILITIES]",
//         track.getCapabilities()
//         );
//           }
        

//         // ----------------------------------------------------
//         // WEBSOCKET
//         // ----------------------------------------------------

//         const websocket =
//           new WebSocket(
//             "ws://127.0.0.1:8000/ws/live-call"
//           );

//         websocket.binaryType =
//           "arraybuffer";

//         websocketRef.current =
//           websocket;


//         websocket.onopen =
//           () => {

//             setIsLive(true);

//             setVerdict(
//               "LISTENING"
//             );

//             setStatusLabel(
//               "Live audio stream connected"
//             );

//             setVoiceRisk(
//               "monitoring"
//             );

//             setBackendConnected(true);
//             setChallengeState((prev) =>
//               prev === "ready" ? "ready" : prev
//             );

//             addAudit(
//               "LIVE",
//               "Backend WebSocket connected; live audio stream started"
//             );

//             // Tell the backend that every binary packet
//             // below is mono PCM16 at 16 kHz.
//             websocket.send(
//               JSON.stringify({
//                 type: "start",
//                 sample_rate: 16000,
//                 channels: 1,
//                 format: "pcm_s16le",
//               })
//             );

//             startTimeRef.current =
//               Date.now();

//             startSpeechRecognition();

//           };


//         websocket.onmessage =
//           (event) => {

//             try {

//               const data =
//                 JSON.parse(
//                   event.data
//                 );

//               // --------------------------------------------
//               // MODEL RESULT
//               // --------------------------------------------

//               if (
//                 data.type ===
//                 "analysis"
//               ) {

//                 const isInsufficientAudio =
//                   data.status === "insufficient_audio" ||
//                   data.label === "INSUFFICIENT AUDIO" ||
//                   data.verdict === "INSUFFICIENT AUDIO";

//                   if (isInsufficientAudio) {
//                     setRisk(0);
//                     setCombinedRisk(0);

//                     setSpoofProbability(0);
//                     setBonafideProbability(0);

//                     setVoiceRisk("unknown");
//                     setVerdict("INSUFFICIENT AUDIO");
//                     setStatusLabel("SPEAK CLEARLY");

//                     setProcessingTime(
//                       Number(data.processing_time_ms || 0)
//   );

//                     return;
// }

//                 const nextCombinedRisk = Math.max(
//                   0,
//                   Math.min(
//                     100,
//                     Number(
//                       data.combined_risk ??
//                       data.overall_risk ??
//                       0
//                     )
//                   )
//                 );

//                 setRisk(nextCombinedRisk);
//                 setCombinedRisk(nextCombinedRisk);

//                 setSpoofProbability(
//                   Number(
//                     data.spoof_probability ||
//                     0
//                   )
//                 );

//                 setBonafideProbability(
//                   Number(
//                     data.bonafide_probability ||
//                     0
//                   )
//                 );

//                 setTranscriptRisk(
//                   Number(data.transcript_risk || 0)
//                 );

//                 setSignalCount(
//                   Number(data.signal_count || 0)
//                 );

//                 setVoiceRisk(
//                   data.voice_risk ||
//                   "unknown"
//                 );

//                 setVerdict(
//                   data.combined_status ||
//                   data.verdict ||
//                   "ANALYZING"
//                 );

//                 setStatusLabel(
//                   data.status_label ||
//                   `Backend CNN: ${data.label || "ANALYZING"}`
//                 );

//                 setProcessingTime(
//                   data.processing_time_ms ||
//                   0
//                 );

//                 analysisCountRef.current += 1;
//                 setAnalysisCount(analysisCountRef.current);
//                 setLastAnalysisAt(new Date());
//                 setBackendConnected(true);

//                 addAudit(
//                   "MODEL",
//                   `CNN window analyzed: ${data.label || "UNKNOWN"} · ${Math.round(Number(data.spoof_probability || 0) * 100)}% spoof · ${Math.round(Number(data.bonafide_probability || 0) * 100)}% bonafide · combined ${Math.round(Number(data.combined_risk ?? data.overall_risk ?? 0))}`
//                 );

//                 if (challengeStateRef.current === "listening") {
//                   const currentRisk = Number(
//                     data.combined_risk ?? data.overall_risk ?? 0
//                   );
//                   if (currentRisk < 50) {
//                     challengeStateRef.current = "passed";
//                     setChallengeState("passed");
//                     setChallengeResult("Challenge audio shows a lower spoof signal");
//                   } else {
//                     challengeStateRef.current = "review";
//                     setChallengeState("review");
//                     setChallengeResult("Challenge audio needs manual review");
//                   }
//                 }

//               }

//               if (data.type === "transcript_analysis") {
//                 const nextTranscriptRisk = Number(
//                   data.transcript_risk || 0
//                 );
//                 const nextCombinedRisk = Number(
//                   data.combined_risk || 0
//                 );

//                 setTranscriptRisk(nextTranscriptRisk);
//                 setCombinedRisk(nextCombinedRisk);
//                 setRisk(
//                   Math.max(
//                     0,
//                     Math.min(100, nextCombinedRisk)
//                   )
//                 );
//                 setSignalCount(Number(data.signal_count || 0));

//                 if (Array.isArray(data.signals) && data.signals.length) {
//                   setKeywordFlags((prev) => [
//                     ...new Set([
//                       ...data.signals,
//                       ...prev,
//                     ]),
//                   ].slice(0, 8));
//                 }

//                 addAudit(
//                   "RISK",
//                   data.signals?.length
//                     ? `Transcript risk: ${data.signals.join(", ")} · combined ${nextCombinedRisk}`
//                     : `Transcript analyzed · combined risk ${nextCombinedRisk}`
//                 );
//               }

//               if (
//                 data.type ===
//                 "error"
//               ) {

//                 setError(
//                   data.message
//                 );

//               }

//             } catch (err) {

//               console.error(
//                 "WebSocket message error:",
//                 err
//               );

//             }

//           };


//         websocket.onerror =
//           () => {

//             setBackendConnected(false);

//             addAudit(
//               "ERROR",
//               "Live backend connection error"
//             );

//             setError(
//               "Live backend connection failed."
//             );

//           };


//         websocket.onclose =
//           () => {

//             setBackendConnected(false);

//             addAudit(
//               "LIVE",
//               "Backend WebSocket disconnected"
//             );

//             setIsLive(false);

//           };


        
      
         
//         // ----------------------------------------------------
// // AUDIO CONTEXT
// // ----------------------------------------------------

// const AudioContextClass =
//   window.AudioContext ||
//   window.webkitAudioContext;

// const audioContext =
//   new AudioContextClass({
//     sampleRate: 16000,
//   });

// audioContextRef.current =
//   audioContext;

// console.log(
//   "[AUDIO CONTEXT]",
//   "requested=16000",
//   "actual=",
//   audioContext.sampleRate
// );

// // Some browsers create the context suspended.
// if (audioContext.state === "suspended") {
//   await audioContext.resume();
// }

// console.log(
//   "[AUDIO CONTEXT STATE]",
//   audioContext.state
// );

// const source =
//   audioContext.createMediaStreamSource(
//     stream
//   );

// sourceRef.current = source;

// // ----------------------------------------------------
// // SCRIPT PROCESSOR
// // ----------------------------------------------------

// const processor =
//   audioContext.createScriptProcessor(
//     4096,
//     1,
//     1
//   );

// processorRef.current =
//   processor;

// // ----------------------------------------------------
// // AUDIO PROCESSING
// // ----------------------------------------------------

// let packetCount = 0;
// let totalSamplesSent = 0;

// processor.onaudioprocess = (event) => {
//   if (
//     !websocketRef.current ||
//     websocketRef.current.readyState !==
//       WebSocket.OPEN
//   ) {
//     return;
//   }

//   const input =
//     event.inputBuffer.getChannelData(0);

//   // ----------------------------------------------
//   // MIC DEBUG / WAVEFORM
//   // ----------------------------------------------

//   updateWaveform(input);

//   // ----------------------------------------------
//   // CALCULATE CHUNK RMS + PEAK
//   // ----------------------------------------------

//   let sumSq = 0;
//   let peak = 0;

//   for (let i = 0; i < input.length; i++) {
//     const sample = input[i];

//     sumSq += sample * sample;

//     const abs = Math.abs(sample);

//     if (abs > peak) {
//       peak = abs;
//     }
//   }

//   const rms = Math.sqrt(
//     sumSq / Math.max(1, input.length)
//   );
  
//   // ----------------------------------------------
//   // AUDIO RESAMPLING
//   // ----------------------------------------------

//   let audio16k;

//   if (audioContext.sampleRate === 16000) {
//     // Browser already gave us 16 kHz.
//     audio16k = input;
//   } else {
//     // Fallback for browsers that ignore
//     // the requested 16 kHz context.
//     audio16k = downsampleBuffer(
//       input,
//       audioContext.sampleRate,
//       16000
//     );
//   }

//   // ----------------------------------------------
//   // FLOAT32 -> PCM16
//   // ----------------------------------------------

//   const pcm =
//     floatTo16BitPCM(audio16k);

//   // ----------------------------------------------
//   // SEND TO BACKEND
//   // ----------------------------------------------

//   websocketRef.current.send(pcm);

//   packetCount++;
//   totalSamplesSent += audio16k.length;

//   // Don't spam console on every audio callback.
//   if (packetCount % 25 === 0) {
//     console.log(
//       "[AUDIO STREAM]",
//       {
//         packetCount,
//         inputSampleRate:
//           audioContext.sampleRate,
//         inputSamples:
//           input.length,
//         outputSamples:
//           audio16k.length,
//         rms:
//           Number(rms.toFixed(6)),
//         peak:
//           Number(peak.toFixed(6)),
//         totalSamplesSent,
//         approximateSeconds:
//           Number(
//             (
//               totalSamplesSent / 16000
//             ).toFixed(2)
//           ),
//       }
//     );
//   }
// };

// // ----------------------------------------------------
// // CONNECT AUDIO GRAPH
// // ----------------------------------------------------

// source.connect(processor);

// // IMPORTANT:
// // ScriptProcessor needs an output connection
// // to stay active, but we don't want microphone
// // audio sent to speakers.

// const silentGain =
//   audioContext.createGain();

// silentGain.gain.value = 0;

// processor.connect(silentGain);

// silentGain.connect(
//   audioContext.destination
// );

//       } catch (err) {

//         console.error(
//           "Unable to start microphone:",
//           err
//         );

//         setError(
//           err.message ||
//           "Microphone permission was denied."
//         );

//         stopLiveCall();

//       }

//     };


// //   // ==========================================================
// //   // STOP LIVE CALL
// //   // ==========================================================

// //   const stopLiveCall =
// //     () => {

// //       try {

// //         if (recognitionRef.current) {
// //   try {
// //     recognitionRef.current.stop();
// //   } catch {}

// //   recognitionRef.current = null;
// // }

// //         if (
// //           websocketRef.current &&
// //           websocketRef.current.readyState ===
// //             WebSocket.OPEN
// //         ) {

// //           websocketRef.current.send(
// //             JSON.stringify({
// //               type: "stop",
// //             })
// //           );

// //           websocketRef.current.close();

// //         }

// //       } catch {}

// //       websocketRef.current =
// //         null;


// //       if (
// //         processorRef.current
// //       ) {

// //         try {
// //           processorRef.current.disconnect();
// //         } catch {}

// //       }

// //       processorRef.current =
// //         null;


// //       if (
// //         sourceRef.current
// //       ) {

// //         try {
// //           sourceRef.current.disconnect();
// //         } catch {}

// //       }

// //       sourceRef.current =
// //         null;


// //       if (
// //         audioContextRef.current
// //       ) {

// //         try {
// //           audioContextRef.current.close();
// //         } catch {}

// //       }

// //       audioContextRef.current =
// //         null;


// //       if (
// //         streamRef.current
// //       ) {

// //         streamRef.current
// //           .getTracks()
// //           .forEach(
// //             (track) =>
// //               track.stop()
// //           );

// //       }

// //       streamRef.current =
// //         null;


// //       if (
// //         animationRef.current
// //       ) {

// //         cancelAnimationFrame(
// //           animationRef.current
// //         );

// //       }


// //       if (challengeTimerRef.current) {
// //         clearTimeout(challengeTimerRef.current);
// //         challengeTimerRef.current = null;
// //       }

// //       setBackendConnected(false);
// //       setIsLive(false);

// //       if (elapsed > 0) {
// //         addAudit(
// //           formatTime(elapsed),
// //           "Monitoring session ended"
// //         );
// //       }

// //       setElapsed(0);

// //       setVerdict(
// //         "CALL ENDED"
// //       );

// //       setStatusLabel(
// //         "Start a new live monitoring session"
// //       );

// //       setVoiceRisk(
// //         "waiting"
// //       );

// //       setWaveform(
// //         Array.from(
// //           { length: 54 },
// //           () => 8
// //         )
// //       );

// //     };

// // ==========================================================
// // STOP LIVE CALL
// // ==========================================================

// const stopLiveCall = () => {
//   try {
//     if (recognitionRef.current) {
//       try {
//         recognitionRef.current.stop();
//       } catch {}

//       recognitionRef.current = null;
//     }

//     if (
//       websocketRef.current &&
//       websocketRef.current.readyState === WebSocket.OPEN
//     ) {
//       try {
//         websocketRef.current.send(
//           JSON.stringify({
//             type: "stop",
//           })
//         );
//       } catch {}

//       try {
//         websocketRef.current.close();
//       } catch {}
//     }
//   } catch {}

//   websocketRef.current = null;

//   // --------------------------------------------------------
//   // STOP AUDIO PROCESSOR
//   // --------------------------------------------------------

//   if (processorRef.current) {
//     try {
//       processorRef.current.disconnect();
//     } catch {}
//   }

//   processorRef.current = null;

//   // --------------------------------------------------------
//   // STOP AUDIO SOURCE
//   // --------------------------------------------------------

//   if (sourceRef.current) {
//     try {
//       sourceRef.current.disconnect();
//     } catch {}
//   }

//   sourceRef.current = null;

//   // --------------------------------------------------------
//   // CLOSE AUDIO CONTEXT
//   // --------------------------------------------------------

//   if (audioContextRef.current) {
//     try {
//       audioContextRef.current.close();
//     } catch {}
//   }

//   audioContextRef.current = null;

//   // --------------------------------------------------------
//   // STOP MICROPHONE
//   // --------------------------------------------------------

//   if (streamRef.current) {
//     streamRef.current
//       .getTracks()
//       .forEach((track) => {
//         try {
//           track.stop();
//         } catch {}
//       });
//   }

//   streamRef.current = null;

//   // --------------------------------------------------------
//   // STOP WAVEFORM ANIMATION
//   // --------------------------------------------------------

//   if (animationRef.current) {
//     cancelAnimationFrame(animationRef.current);
//     animationRef.current = null;
//   }

//   // --------------------------------------------------------
//   // STOP CHALLENGE TIMER
//   // --------------------------------------------------------

//   if (challengeTimerRef.current) {
//     clearTimeout(challengeTimerRef.current);
//     challengeTimerRef.current = null;
//   }

//   // --------------------------------------------------------
//   // SESSION UI STATE
//   // --------------------------------------------------------

//   setBackendConnected(false);
//   setIsLive(false);

//   if (elapsed > 0) {
//     addAudit(
//       formatTime(elapsed),
//       "Monitoring session ended"
//     );
//   }

//   setElapsed(0);

//   // IMPORTANT:
//   // Clear stale model values after the call ends.
//   setRisk(0);
//   setCombinedRisk(0);
//   setSpoofProbability(0);
//   setBonafideProbability(0);
//   setTranscriptRisk(0);
//   setSignalCount(0);
//   setProcessingTime(0);

//   analysisCountRef.current = 0;
//   setAnalysisCount(0);
//   setLastAnalysisAt(null);

//   setVerdict("NO SIGNAL");

//   setStatusLabel(
//     "Start a new live monitoring session"
//   );

//   setVoiceRisk("waiting");

//   setKeywordFlags([]);

//   setInterimTranscript("");

//   setWaveform(
//     Array.from(
//       { length: 54 },
//       () => 8
//     )
//   );
// };
//   // ==========================================================
//   // LIVE VOICE CHALLENGE
//   // ==========================================================

//   const startVoiceVerification = async () => {
//     if (!isLive) {
//       challengeStateRef.current = "listening";
//       setChallengeState("listening");
//       setChallengeResult("Starting microphone monitoring…");
//       addAudit("VERIFY", "Voice challenge requested; starting live stream");
//       await startLiveCall();
//       return;
//     }

//     challengeStateRef.current = "listening";
//     setChallengeState("listening");
//     setChallengeResult("Listening for challenge audio…");
//     addAudit("VERIFY", "Live voice challenge started");

//     if (challengeTimerRef.current) {
//       clearTimeout(challengeTimerRef.current);
//     }

//     challengeTimerRef.current = setTimeout(() => {
//       setChallengeState((current) => {
//         if (current === "listening") {
//           challengeStateRef.current = "review";
//           setChallengeResult(
//             "No fresh challenge result yet; keep monitoring"
//           );
//           addAudit(
//             "VERIFY",
//             "Challenge window completed; latest CNN signal retained"
//           );
//           return "review";
//         }
//         return current;
//       });
//     }, 5000);
//   };


//   // ==========================================================
//   // RISK COLOR CLASS
//   // ==========================================================

//   // const riskClass =
//   //   risk >= 70
//   //     ? "danger"
//   //     : risk >= 35
//   //       ? "warning"
//   //       : "safe";
//   const riskClass =
//   !isLive
//     ? "safe"
//     : risk >= 70
//       ? "danger"
//       : risk >= 35
//         ? "warning"
//         : "safe";


//   // ==========================================================
//   // UI
//   // ==========================================================

//   return (
//     <Shell>

//       <div className="live-page">

//         <PageTitle
//           eyebrow="Operations / Live Calls"
//           title="ACTIVE INCIDENT"
//         >

//           <span
//             className={
//               isLive
//                 ? "live-pill active"
//                 : "live-pill"
//             }
//           >

//             <span className="live-dot" />

//             {isLive
//               ? "LIVE CALL"
//               : "READY"}

//           </span>

//         </PageTitle>


//         <main className="live-content">


//           {/* =================================================
//               ACTIVE CALL
//           ================================================= */}

//           <section className="incident-card">

//             <div className="incident-header">

//               <div className="caller-block">

//                 <div className="active-label">

//                   <span
//                     className={
//                       isLive
//                         ? "active-dot pulse"
//                         : "active-dot"
//                     }
//                   />

//                   {isLive
//                     ? "ACTIVE CALL"
//                     : "MICROPHONE READY"}

//                 </div>


//                 <div className="caller-name">

//                   <h2>
//                     Local Microphone
//                   </h2>

//                   <span>
//                     — Live audio stream
//                   </span>

//                 </div>


//                 <div className="call-meta">

//                   <span>
//                     {formatTime(elapsed)}
//                   </span>

//                   <span>•</span>

//                   <span>
//                     {isLive
//                       ? "LIVE STREAM"
//                       : "OFFLINE"}
//                   </span>

//                   <span>•</span>

//                   <span>
//                     {isLive
//                       ? "Model monitoring"
//                       : "Waiting to start"}
//                   </span>

//                 </div>

//               </div>


//               {/* RISK SCORE */}

//               <div
//                 className={`risk-score ${riskClass}`}
//               >

//                 <div className="score-row">

//                   <strong>
//                     {risk}
//                   </strong>

//                   <span>
//                     /100
//                   </span>

//                 </div>


//                 <div className="score-label">
//                   {isLive
//                     ? verdict
//                     : "NO SIGNAL"}
//                 </div>

//               </div>

//             </div>


//             {/* =================================================
//                 LIVE VOICE SIGNAL
//             ================================================= */}

//             <div className="voice-signal-box">

//               <div className="box-header">

//                 <div className="box-title">

//                   <Mic2 size={16} />

//                   <span>
//                     LIVE VOICE SIGNAL
//                   </span>

//                 </div>


//                 <div className="live-status">

//                   <span
//                     className={
//                       isLive
//                         ? "live-status-dot pulse"
//                         : "live-status-dot"
//                     }
//                   />

//                   {isLive
//                     ? "LIVE"
//                     : "STANDBY"}

//                 </div>

//               </div>


//               <div className="waveform">

//                 {waveform.map(
//                   (height, index) => (

//                     <i
//                       key={index}
//                       style={{
//                         height:
//                           `${height}px`,
//                       }}
//                     />

//                   )
//                 )}

//               </div>

//             </div>


//             {/* =================================================
//                 LIVE TRANSCRIPT
//             ================================================= */}

//             <div className="transcript-box">

//               <div className="box-header">

//                 <div className="box-title">

//                   <FileAudio
//                     size={16}
//                   />

//                   <span>
//                     LIVE TRANSCRIPT
//                   </span>

//                 </div>


//                 <span className="small-live">

//                   {isLive
//                     ? "LISTENING"
//                     : "WAITING"}

//                 </span>

//               </div>


              
//                 <div className="transcript-content">

//   {!speechSupported && (
//     <div className="transcript-warning">
//       Live transcription is not supported
//       by this browser. Please use Chrome
//       or Edge.
//     </div>
//   )}

//   {transcript.length === 0 &&
//     !interimTranscript &&
//     speechSupported && (
//       <p className="listening">
//         {isLive
//           ? "Listening for speech..."
//           : "Start monitoring to begin transcription."}
//       </p>
//     )}

//   {transcript.map((line) => (
//     <div
//       key={line.id}
//       className="transcript-line"
//     >
//       <span className="transcript-time">
//         {line.time}
//       </span>

//       <span className="transcript-text">
//         "{line.text}"
//       </span>
//     </div>
//   ))}

//   {interimTranscript && (
//     <div className="transcript-line interim">
//       <span className="transcript-time">
//         LIVE
//       </span>

//       <span className="transcript-text">
//         "{interimTranscript}"
//       </span>
//     </div>
//   )}

//   <div ref={transcriptEndRef} />

// </div>
//             </div>


//             {/* START / STOP */}

//             <div className="live-control">

//               {!isLive ? (

//                 <button
//                   className="start-live-btn"
//                   onClick={
//                     startLiveCall
//                   }
//                 >

//                   <Mic2 size={16} />

//                   Start Live Monitoring

//                 </button>

//               ) : (

//                 <button
//                   className="stop-live-btn"
//                   onClick={
//                     stopLiveCall
//                   }
//                 >

//                   <span />

//                   Stop Live Monitoring

//                 </button>

//               )}

//             </div>


//             {error && (

//               <div className="live-error">

//                 <AlertTriangle
//                   size={15}
//                 />

//                 <span>
//                   {error}
//                 </span>

//               </div>

//             )}

//           </section>


//           {/* =================================================
//               REAL-TIME RISK
//           ================================================= */}

//           <section className="risk-section">

//             <div className="section-heading">

//               <div>

//                 <span>
//                   REAL-TIME SIGNALS
//                 </span>

//                 <h2>
//                   Risk Assessment
//                 </h2>

//               </div>

//               <Activity
//                 size={23}
//               />

//             </div>


//             {/* <div className="risk-grid">

//               <RiskCard
//                 title="Voice Integrity Risk"
//                 value={
//                   `${Math.round(
//                     spoofProbability * 100
//                   )}%`
//                 }
//                 type={
//                   spoofProbability >= 0.5
//                     ? "danger"
//                     : "cyan"
//                 }
//               />


//               <RiskCard
//                 title="Model Risk Score"
//                 value={
//                   `${risk}%`
//                 }
//                 type={
//                   risk >= 70
//                     ? "danger"
//                     : risk >= 35
//                       ? "warning"
//                       : "cyan"
//                 }
//               />


//               <RiskCard
//                 title="Detection Status"
//                 value={
//                   isLive
//                     ? "LIVE"
//                     : "READY"
//                 }
//                 type="cyan"
//               />

//             </div> */}
//             <div className="risk-grid">

//   <RiskCard
//     title="Voice Integrity Risk"
//     value={
//       isLive
//         ? `${Math.round(
//             spoofProbability * 100
//           )}%`
//         : "—"
//     }
//     type={
//       !isLive
//         ? "cyan"
//         : spoofProbability >= 0.5
//           ? "danger"
//           : "cyan"
//     }
//   />

//   <RiskCard
//     title="Model Risk Score"
//     value={
//       isLive
//         ? `${Math.round(risk)}%`
//         : "—"
//     }
//     type={
//       !isLive
//         ? "cyan"
//         : risk >= 70
//           ? "danger"
//           : risk >= 35
//             ? "warning"
//             : "cyan"
//     }
//   />

//   <RiskCard
//     title="Detection Status"
//     value={
//       isLive
//         ? "LIVE"
//         : "READY"
//     }
//     type="cyan"
//   />

// </div>

//           </section>


//           {/* =================================================
//               TRUST + TIMELINE
//           ================================================= */}

//           <section className="main-grid">


//             {/* <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <Activity
//                     size={17}
//                   />
//                 }
//                 title="Continuous Trust Score"
//                 subtitle="Updated from live model analysis"
//               />


//               <div className="trust-score">

//                 <strong>
//                   {100 - risk}
//                 </strong>

//                 <span>
//                   /100
//                 </span>

//               </div>


//               <div className="critical-small">

//                 {risk >= 70
//                   ? "HIGH RISK"
//                   : risk >= 35
//                     ? "REVIEW"
//                     : "MONITORING"}

//               </div>


//               <div className="trust-line">

//                 <span
//                   style={{
//                     width:
//                       `${Math.max(
//                         2,
//                         100 - risk
//                       )}%`,
//                   }}
//                 />

//               </div>


//               <div className="signal-list">

//                 <SignalItem
//                   name="Spoof probability"
//                   value={
//                     `${Math.round(
//                       spoofProbability *
//                       100
//                     )}%`
//                   }
//                 />

//                 <SignalItem
//                   name="Overall model risk"
//                   value={
//                     `${risk}/100`
//                   }
//                 />

//                 <SignalItem
//                   name="Model processing"
//                   value={
//                     `${processingTime} ms`
//                   }
//                 />

//                 <SignalItem
//                   name="Detection state"
//                   value={
//                     isLive
//                       ? "LIVE"
//                       : "STANDBY"
//                   }
//                 />

//               </div>

//             </div> */}
//           <div className="glass-card">

//   <CardHeader
//     icon={
//       <Activity
//         size={17}
//       />
//     }
//     title="Continuous Trust Score"
//     subtitle={
//       isLive
//         ? "Updated from live model analysis"
//         : "Waiting for live audio analysis"
//     }
//   />

//   <div className="trust-score">

//     <strong>
//       {isLive
//         ? Math.max(
//             0,
//             Math.min(
//               100,
//               Math.round(100 - risk)
//             )
//           )
//         : 0}
//     </strong>

//     <span>
//       /100
//     </span>

//   </div>

//   <div className="critical-small">

//     {!isLive
//       ? "NO SIGNAL"
//       : risk >= 70
//         ? "HIGH RISK"
//         : risk >= 35
//           ? "REVIEW"
//           : "MONITORING"}

//   </div>

//   <div className="trust-line">

//     <span
//       style={{
//         width: isLive
//           ? `${Math.max(
//               2,
//               100 - risk
//             )}%`
//           : "2%",
//       }}
//     />

//   </div>

//   <div className="signal-list">

//     <SignalItem
//       name="Spoof probability"
//       value={
//         isLive
//           ? Math.round(combinedRisk)
//           : "—"
//       }
//     />

//     <SignalItem
//       name="Overall model risk"
//       value={
//         isLive
//           ? `${Math.round(risk)}/100`
//           : "—"
//       }
//     />

//     <SignalItem
//       name="Model processing"
//       value={
//         isLive
//           ? `${Math.round(
//               processingTime
//             )} ms`
//           : "—"
//       }
//     />

//     <SignalItem
//       name="Detection state"
//       value={
//         isLive
//           ? "LIVE"
//           : "STANDBY"
//       }
//     />

//   </div>

// </div>


//             <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <Activity
//                     size={17}
//                   />
//                 }
//                 title="Live Detection Timeline"
//                 subtitle="Latest model events during the call"
//               />


//               <div className="timeline-list">

//                 <div className="timeline-row">

//                   <span className="timeline-time">
//                     {formatTime(
//                       elapsed
//                     )}
//                   </span>

//                   <span className="timeline-text">
//                     {isLive
//                       ? "Microphone stream active"
//                       : "Waiting for microphone"}
//                   </span>

//                   <span className="timeline-score">
//                     {risk}
//                   </span>

//                 </div>


//                 <div className="timeline-row">

//                   <span className="timeline-time">
//                     LIVE
//                   </span>

//                   <span className="timeline-text">
//                     {statusLabel}
//                   </span>

//                   <span className="timeline-score">
//                     {Math.round(
//                       spoofProbability *
//                       100
//                     )}
//                   </span>

//                 </div>
//                 <div className="timeline-row">

//   <span className="timeline-time">
//     STT
//   </span>

//   <span className="timeline-text">
//     {transcript.length > 0
//       ? `Transcribed ${transcript.length} speech segment${
//           transcript.length === 1
//             ? ""
//             : "s"
//         }`
//       : "Waiting for speech"}
//   </span>

//   <span className="timeline-score">
//     {transcript.length}
//   </span>

// </div>


//                 <div className="timeline-row">

//                   <span className="timeline-time">
//                     MODEL
//                   </span>

//                   <span className="timeline-text">
//                     {isLive
//                       ? "Continuous audio analysis"
//                       : "Model idle"}
//                   </span>

//                   <span className="timeline-score">
//                     {isLive && processingTime
//                       ? `${Math.round(processingTime)} ms`
//                       : "—"}
//                   </span>

//                 </div>

//               </div>

//             </div>

//           </section>


//           {/* =================================================
//               WHY FLAGGED
//           ================================================= */}

//           <section className="main-grid">

//             <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <AlertTriangle
//                     size={17}
//                   />
//                 }
//                 title="Live Detection Signals"
//                 subtitle="Signals derived from the current audio stream"
//               />


//               <div className="flag-list">

//                 <FlagItem
//                   icon={
//                     <AudioWaveform
//                       size={16}
//                     />
//                   }
//                   title="Voice integrity"
//                   text={
//                     isLive
//                       ? `Spoof ${Math.round(spoofProbability * 100)}% · Bonafide ${Math.round(bonafideProbability * 100)}% · combined risk ${Math.round(combinedRisk)}.`
//                       : "Waiting for audio input."
//                   }
//                 />


//                 <FlagItem
//                   icon={
//                     <Zap size={16} />
//                   }
//                   title="Continuous analysis"
//                   text={
//                     isLive
//                       ? `Backend CNN: rolling 3-second window · ${analysisCount} analyzed · ${processingTime} ms last inference.`
//                       : "Start monitoring to activate backend audio analysis."
//                   }
//                 />
//                 {keywordFlags.length > 0 && (
//   <div className="detected-signals">

//     <div className="detected-title">
//       <MessageSquareText size={14} />

//       Transcript Signals
//     </div>

//     <div className="signal-tags">

//       {keywordFlags.map((flag) => (
//         <span key={flag}>
//           {flag}
//         </span>
//       ))}

//     </div>

//   </div>
// )}


//                 <FlagItem
//                   icon={
//                     <UserRound
//                       size={16}
//                     />
//                   }
//                   title="Speech activity"
//                   text={
//                     isLive
//                       ? `${transcript.length} final speech segment${transcript.length === 1 ? "" : "s"} · transcript risk ${Math.round(transcriptRisk)} · ${signalCount} signal${signalCount === 1 ? "" : "s"}${interimTranscript ? " · live speech detected" : ""}.`
//                       : "No active speech stream."
//                   }
//                 />


//                 <FlagItem
//                   icon={
//                     <Fingerprint
//                       size={16}
//                     />
//                   }
//                   title="Model status"
//                   text={
//                     isLive
//                       ? backendConnected
//                         ? `CNN live · ${analysisCount} window${analysisCount === 1 ? "" : "s"} · combined risk ${Math.round(combinedRisk)}.`
//                         : "Connecting to VoxShield CNN backend…"
//                       : "VoxShield CNN is currently idle."
//                   }
//                 />

//               </div>

//             </div>


//             {/* TRANSACTION */}

//             <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <ShieldAlert
//                     size={17}
//                   />
//                 }
//                 title="Live Call Context"
//                 subtitle="Current monitoring session"
//               />


//               <div className="transaction-box">

//                 <div className="transaction-row">

//                   <span>
//                     Session
//                   </span>

//                   <strong>
//                     {isLive
//                       ? "ACTIVE"
//                       : "IDLE"}
//                   </strong>

//                 </div>


//                 <div className="transaction-row">

//                   <span>
//                     Duration
//                   </span>

//                   <strong>
//                     {formatTime(
//                       elapsed
//                     )}
//                   </strong>

//                 </div>


//                 <div className="transaction-row">

//                   <span>
//                     Model verdict
//                   </span>

//                   <strong
//                     className={
//                       risk >= 70
//                         ? "danger-value"
//                         : ""
//                     }
//                   >
//                     {verdict}
//                   </strong>

//                 </div>


//                 <div className="transaction-row">

//                   <span>
//                     Spoof / Bonafide
//                   </span>

//                   <strong>
//                     {Math.round(spoofProbability * 100)}% / {Math.round(bonafideProbability * 100)}%
//                   </strong>

//                 </div>


//                 <div className="transaction-row">

//                   <span>
//                     Transcript risk
//                   </span>

//                   <strong>
//                     {Math.round(transcriptRisk)} / 100
//                   </strong>

//                 </div>


//                 <div className="transaction-row">

//                   <span>
//                     Recommended state
//                   </span>

//                   <strong>
//                     {risk >= 70
//                       ? "VERIFY"
//                       : risk >= 50
//                         ? "REVIEW"
//                         : "MONITOR"}
//                   </strong>

//                 </div>

//                 <div className="transaction-row">

//                   <span>
//                     Backend
//                   </span>

//                   <strong>
//                     {backendConnected ? "CONNECTED" : "DISCONNECTED"}
//                   </strong>

//                 </div>

//                 <div className="transaction-row">

//                   <span>
//                     Live analyses
//                   </span>

//                   <strong>
//                     {analysisCount}
//                   </strong>

//                 </div>

//                 <div className="transaction-row">

//                   <span>
//                     Last model update
//                   </span>

//                   <strong>
//                     {lastAnalysisAt
//                       ? lastAnalysisAt.toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           second: "2-digit",
//                         })
//                       : "--"}
//                   </strong>

//                 </div>

//               </div>

//             </div>

//           </section>


//           {/* =================================================
//               VERIFICATION + AUDIT
//           ================================================= */}

//           <section className="main-grid">

//             <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <Fingerprint
//                     size={17}
//                   />
//                 }
//                 title="Voice Integrity Test"
//                 subtitle="Independent verification challenge"
//               />


//               <div className="challenge-box">

//                 <div className="challenge-status">

//                   <div className="challenge-icon">

//                     <Mic2
//                       size={18}
//                     />

//                   </div>


//                   <div>

//                     <strong>
//                       {challengeState === "listening"
//                         ? "Challenge listening"
//                         : challengeState === "passed"
//                           ? "Challenge signal accepted"
//                           : challengeState === "review"
//                             ? "Challenge needs review"
//                             : "Verification available"}
//                     </strong>

//                     <span>
//                       {challengeResult}
//                     </span>

//                   </div>

//                 </div>


//                 <div className="challenge-prompt">

//                   <span>
//                     CHALLENGE PROMPT
//                   </span>

//                   <strong>
//                     “Please repeat the verification phrase.”
//                   </strong>

//                 </div>


//                 <div className="challenge-actions">

//                   <button
//                     className="verify-btn"
//                     onClick={startVoiceVerification}
//                     disabled={challengeState === "listening"}
//                   >

//                     <UserCheck
//                       size={15}
//                     />

//                     {challengeState === "listening"
//                       ? "Listening…"
//                       : "Start Verification"}

//                   </button>


//                   <button
//                     className="secondary-btn"
//                     onClick={() => {
//                       challengeStateRef.current = "ready";
//                       setChallengeState("ready");
//                       setChallengeResult("Challenge postponed");
//                       if (challengeTimerRef.current) {
//                         clearTimeout(challengeTimerRef.current);
//                         challengeTimerRef.current = null;
//                       }
//                       addAudit("VERIFY", "Voice challenge postponed");
//                     }}
//                   >

//                     <Clock3
//                       size={15}
//                     />

//                     Later

//                   </button>

//                 </div>

//               </div>

//             </div>


//             <div className="glass-card">

//               <CardHeader
//                 icon={
//                   <FileAudio
//                     size={17}
//                   />
//                 }
//                 title="Audit Trail"
//                 subtitle="Current live monitoring state"
//               />


//               <div className="audit-list">

//                 {auditTrail.length > 0 ? (
//                   auditTrail.slice(0, 4).map((item) => (
//                     <AuditItem
//                       key={item.id}
//                       time={item.time}
//                       text={item.text}
//                     />
//                   ))
//                 ) : (
//                   <>
//                     <AuditItem
//                       time="00:00"
//                       text="Monitoring not started"
//                     />
//                     <AuditItem
//                       time="MODEL"
//                       text="Model idle"
//                     />
//                   </>
//                 )}

//               </div>

//             </div>

//           </section>


//           {/* =================================================
//               SAFETY GATE
//           ================================================= */}

//           <section className="safety-gate">

//             <div className="safety-icon">

//               <ShieldCheck
//                 size={21}
//               />

//             </div>


//             <div className="safety-copy">

//               <strong>
//                 LIVE MONITORING GATE
//               </strong>

//               <span>
//                 {isLive
//                   ? "Audio is actively being monitored by VoxShield."
//                   : "Start live monitoring to begin model analysis."}
//               </span>

//             </div>


//             <div className="safety-actions">

//               {!isLive ? (

//                 <button
//                   className="verify-button"
//                   onClick={
//                     startLiveCall
//                   }
//                 >
//                   Start Monitoring
//                 </button>

//               ) : (

//                 <button
//                   className="block-button"
//                   onClick={
//                     stopLiveCall
//                   }
//                 >
//                   Stop Monitoring
//                 </button>

//               )}

//             </div>

//           </section>

//         </main>


//         {/* ===================================================
//             PAGE CSS
//         =================================================== */}

//         <style>{`

//           * {
//             box-sizing: border-box;
//           }

//           .live-page {
//             min-height: 100%;
//             color: #dce8e9;
//             position: relative;
//           }

//           .live-page::before {
//             content: "";
//             position: fixed;
//             width: 480px;
//             height: 480px;
//             left: 2%;
//             top: 110px;
//             background: rgba(0,190,200,.10);
//             filter: blur(100px);
//             pointer-events: none;
//           }

//           .live-page::after {
//             content: "";
//             position: fixed;
//             width: 500px;
//             height: 500px;
//             right: 2%;
//             top: 420px;
//             background: rgba(20,55,120,.10);
//             filter: blur(110px);
//             pointer-events: none;
//           }

//           .live-content {
//             position: relative;
//             z-index: 1;
//             width: min(1180px, calc(100% - 48px));
//             margin: 0 auto;
//             padding: 30px 0 80px;
//           }

//           .live-pill {
//             display: inline-flex;
//             align-items: center;
//             gap: 8px;
//             padding: 9px 16px;
//             border-radius: 999px;
//             background: rgba(90,20,28,.20);
//             border: 1px solid rgba(255,90,105,.20);
//             color: #ff858f;
//             font-size: 12px;
//             font-weight: 600;
//           }

//           .live-pill.active {
//             box-shadow: 0 0 20px rgba(255,80,100,.12);
//           }

//           .live-dot,
//           .active-dot,
//           .live-status-dot {
//             width: 7px;
//             height: 7px;
//             border-radius: 50%;
//             background: #28d6d9;
//           }

//           .live-dot,
//           .active-dot.pulse,
//           .live-status-dot.pulse {
//             background: #ff6876;
//             box-shadow: 0 0 12px rgba(255,104,118,.8);
//             animation: livePulse 1.2s infinite;
//           }

//           @keyframes livePulse {
//             0%,100% {
//               opacity: 1;
//               transform: scale(1);
//             }
//             50% {
//               opacity: .35;
//               transform: scale(.7);
//             }
//           }

//           .incident-card {
//             padding: 22px;
//             border-radius: 22px;
//             background: linear-gradient(
//               145deg,
//               rgba(14,35,39,.78),
//               rgba(6,21,25,.74)
//             );
//             border: 1px solid rgba(114,185,190,.13);
//             box-shadow:
//               0 25px 80px rgba(0,0,0,.22),
//               inset 0 1px 0 rgba(255,255,255,.035);
//             backdrop-filter: blur(22px);
//           }

//           .incident-header {
//             display: grid;
//             grid-template-columns: minmax(0,1fr) 142px;
//             gap: 18px;
//           }

//           .caller-block {
//             padding: 5px 3px;
//             display: flex;
//             flex-direction: column;
//             justify-content: center;
//           }

//           .active-label {
//             display: flex;
//             align-items: center;
//             gap: 8px;
//             margin-bottom: 9px;
//             color: rgba(77,204,211,.70);
//             font-size: 11px;
//             font-weight: 600;
//             letter-spacing: .09em;
//           }

//           .caller-name {
//             display: flex;
//             align-items: baseline;
//             gap: 10px;
//             flex-wrap: wrap;
//           }

//           .caller-name h2 {
//             margin: 0;
//             font-size: 25px;
//             color: #e4eeee;
//           }

//           .caller-name span {
//             color: rgba(166,189,191,.58);
//             font-size: 14px;
//           }

//           .call-meta {
//             display: flex;
//             gap: 8px;
//             margin-top: 10px;
//             color: rgba(143,173,176,.56);
//             font-size: 12px;
//           }

//           .risk-score {
//             min-height: 108px;
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             justify-content: center;
//             border-radius: 18px;
//             background: rgba(30,30,30,.25);
//             border: 1px solid rgba(100,180,186,.15);
//           }

//           .risk-score.danger {
//             border-color: rgba(255,91,107,.28);
//           }

//           .risk-score.warning {
//             border-color: rgba(255,193,70,.28);
//           }

//           .score-row {
//             display: flex;
//             align-items: baseline;
//             gap: 5px;
//           }

//           .score-row strong {
//             color: #64d9d9;
//             font-size: 38px;
//             line-height: 1;
//           }

//           .risk-score.danger .score-row strong {
//             color: #ff7c89;
//           }

//           .risk-score.warning .score-row strong {
//             color: #ffc94d;
//           }

//           .score-row span {
//             color: rgba(188,167,170,.52);
//             font-size: 12px;
//           }

//           .score-label {
//             margin-top: 10px;
//             color: #7edfe1;
//             font-size: 9px;
//             letter-spacing: .08em;
//             text-align: center;
//           }

//           .risk-score.danger .score-label {
//             color: #ff7883;
//           }

//           .voice-signal-box,
//           .transcript-box {
//             border-radius: 17px;
//             background: rgba(3,19,22,.62);
//             border: 1px solid rgba(100,180,186,.11);
//           }

//           .voice-signal-box {
//             margin-top: 17px;
//             padding: 15px 17px 14px;
//           }

//           .transcript-box {
//             margin-top: 13px;
//             padding: 16px 19px 18px;
//           }

//           .box-header {
//             display: flex;
//             align-items: center;
//             justify-content: space-between;
//           }

//           .box-title {
//             display: flex;
//             align-items: center;
//             gap: 8px;
//             color: rgba(83,199,207,.66);
//             font-size: 10px;
//             font-weight: 600;
//             letter-spacing: .10em;
//           }

//           .live-status {
//             display: flex;
//             align-items: center;
//             gap: 7px;
//             color: #ff7883;
//             font-size: 10px;
//           }

//           .waveform {
//             height: 82px;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             gap: 5px;
//             margin-top: 4px;
//             overflow: hidden;
//           }

//           .waveform i {
//             width: 4px;
//             min-height: 8px;
//             display: block;
//             border-radius: 99px;
//             background: linear-gradient(
//               to bottom,
//               rgba(55,211,217,.88),
//               rgba(25,121,129,.48)
//             );
//             transition: height .08s linear;
//           }

//           .small-live {
//             padding: 4px 8px;
//             border-radius: 999px;
//             color: #ff7f89;
//             background: rgba(255,78,95,.08);
//             border: 1px solid rgba(255,78,95,.13);
//             font-size: 9px;
//           }

//           .transcript-content {
//             display: flex;
//             flex-direction: column;
//             gap: 7px;
//             margin-top: 14px;
//           }

//           .transcript-content p {
//             margin: 0;
//             color: rgba(192,210,211,.72);
//             font-size: 14px;
//           }

//           .transcript-content .listening {
//             color: #e9b1b7;
//             font-weight: 600;
//           }

//           .muted-line {
//             color: rgba(143,173,176,.45) !important;
//             font-size: 12px !important;
//           }

//           .live-control {
//             display: flex;
//             justify-content: center;
//             margin-top: 17px;
//           }

//           .start-live-btn,
//           .stop-live-btn {
//             border: 0;
//             border-radius: 10px;
//             padding: 12px 22px;
//             font-weight: 700;
//             cursor: pointer;
//             display: inline-flex;
//             align-items: center;
//             gap: 9px;
//           }

//           .start-live-btn {
//             background: #1fc3c5;
//             color: #041013;
//           }

//           .stop-live-btn {
//             background: rgba(255,70,85,.12);
//             color: #ff7b87;
//             border: 1px solid rgba(255,80,95,.25);
//           }

//           .stop-live-btn span {
//             width: 7px;
//             height: 7px;
//             border-radius: 50%;
//             background: #ff6876;
//           }

//           .live-error {
//             margin-top: 14px;
//             padding: 11px 14px;
//             border: 1px solid rgba(255,80,95,.2);
//             background: rgba(80,20,28,.2);
//             color: #ff9aa3;
//             border-radius: 9px;
//             display: flex;
//             gap: 8px;
//             font-size: 12px;
//           }

//           .risk-section {
//             margin-top: 40px;
//           }

//           .section-heading {
//             display: flex;
//             align-items: flex-end;
//             justify-content: space-between;
//             margin-bottom: 17px;
//           }

//           .section-heading span {
//             display: block;
//             margin-bottom: 6px;
//             color: rgba(67,188,198,.55);
//             font-size: 10px;
//             font-weight: 600;
//             letter-spacing: .12em;
//           }

//           .section-heading h2 {
//             margin: 0;
//             color: #dce9ea;
//             font-size: 20px;
//           }

//           .section-heading > svg {
//             color: rgba(42,191,201,.60);
//           }

//           .risk-grid {
//             display: grid;
//             grid-template-columns: repeat(3,minmax(0,1fr));
//             gap: 18px;
//           }

//           .risk-card {
//             padding: 20px;
//             border-radius: 18px;
//             background: rgba(5,25,29,.68);
//             border: 1px solid rgba(100,180,186,.11);
//           }

//           .risk-card-title {
//             color: rgba(150,180,183,.65);
//             font-size: 11px;
//           }

//           .risk-card-value {
//             margin-top: 8px;
//             font-size: 28px;
//             font-weight: 700;
//             color: #5ee1e1;
//           }

//           .risk-card.danger .risk-card-value {
//             color: #ff7180;
//           }

//           .risk-card.warning .risk-card-value {
//             color: #ffc94d;
//           }

//           .main-grid {
//             display: grid;
//             grid-template-columns: repeat(2,minmax(0,1fr));
//             gap: 18px;
//             margin-top: 24px;
//           }

//           .glass-card {
//             padding: 20px;
//             border-radius: 18px;
//             background: rgba(5,24,28,.66);
//             border: 1px solid rgba(100,180,186,.11);
//           }

//           .card-header {
//             display: flex;
//             align-items: center;
//             gap: 10px;
//           }

//           .card-header-icon {
//             width: 32px;
//             height: 32px;
//             display: grid;
//             place-items: center;
//             border-radius: 8px;
//             color: #38d2d6;
//             border: 1px solid rgba(50,210,215,.25);
//           }

//           .card-header strong {
//             display: block;
//             font-size: 13px;
//             color: #dce9ea;
//           }

//           .card-header span {
//             display: block;
//             margin-top: 3px;
//             color: rgba(143,173,176,.50);
//             font-size: 9px;
//           }

//           .trust-score {
//             margin-top: 22px;
//             display: flex;
//             align-items: baseline;
//             gap: 5px;
//           }

//           .trust-score strong {
//             font-size: 45px;
//             color: #ff7583;
//           }

//           .trust-score span {
//             color: rgba(170,180,185,.45);
//           }

//           .critical-small {
//             margin-top: 2px;
//             color: #ff7883;
//             font-size: 10px;
//             letter-spacing: .12em;
//           }

//           .trust-line {
//             height: 4px;
//             margin-top: 13px;
//             background: rgba(255,255,255,.05);
//             border-radius: 99px;
//             overflow: hidden;
//           }

//           .trust-line span {
//             display: block;
//             height: 100%;
//             background: #ff6876;
//             transition: width .3s ease;
//           }

//           .detected-signals {
//   margin-top: 15px;
//   padding-top: 14px;
//   border-top: 1px solid rgba(255,255,255,.05);
// }

// .detected-title {
//   display: flex;
//   align-items: center;
//   gap: 7px;
//   color: #e6d08a;
//   font-size: 10px;
//   font-weight: 600;
// }

// .signal-tags {
//   display: flex;
//   flex-wrap: wrap;
//   gap: 7px;
//   margin-top: 9px;
// }

// .signal-tags span {
//   padding: 5px 8px;
//   border-radius: 6px;
//   background: rgba(255,190,50,.07);
//   border: 1px solid rgba(255,190,50,.15);
//   color: #e5c66c;
//   font-size: 9px;
// }

//           .signal-list {
//             margin-top: 17px;
//           }

//           .signal-item {
//             display: flex;
//             justify-content: space-between;
//             padding: 9px 0;
//             border-bottom: 1px solid rgba(255,255,255,.035);
//             font-size: 11px;
//           }

//           .signal-item span {
//             color: rgba(153,181,183,.55);
//           }

//           .signal-item strong {
//             color: #dbe8e9;
//           }

//           .timeline-list {
//             margin-top: 18px;
//           }

//           .timeline-row {
//             display: grid;
//             grid-template-columns: 55px 1fr 45px;
//             gap: 10px;
//             padding: 10px 0;
//             border-bottom: 1px solid rgba(255,255,255,.035);
//             font-size: 11px;
//           }

//           .timeline-time {
//             color: #35cbd0;
//           }

//           .timeline-text {
//             color: rgba(186,207,208,.66);
//           }

//           .timeline-score {
//             text-align: right;
//             color: #ff7883;
//           }

//           .flag-list {
//             margin-top: 17px;
//           }

//           .flag-item {
//             display: flex;
//             gap: 11px;
//             padding: 12px 0;
//             border-bottom: 1px solid rgba(255,255,255,.035);
//           }

//           .flag-icon {
//             color: #32ced2;
//             padding-top: 2px;
//           }

//           .flag-item strong {
//             display: block;
//             color: #dce8e9;
//             font-size: 12px;
//           }

//           .flag-item span {
//             display: block;
//             margin-top: 4px;
//             color: rgba(150,180,183,.55);
//             font-size: 10px;
//             line-height: 1.5;
//           }

//           .transcript-content {
//   max-height: 230px;
//   overflow-y: auto;
//   padding-right: 8px;
// }

// .transcript-line {
//   display: grid;
//   grid-template-columns: 55px 1fr;
//   gap: 10px;
//   padding: 9px 0;
//   border-bottom: 1px solid rgba(255,255,255,.035);
// }

// .transcript-time {
//   color: #38cbd0;
//   font-size: 9px;
//   padding-top: 2px;
// }

// .transcript-text {
//   color: #d9e4e5;
//   font-size: 13px;
//   line-height: 1.5;
// }

// .transcript-line.interim {
//   opacity: .55;
// }

// .transcript-line.interim .transcript-text {
//   color: #7bd7da;
// }

// .transcript-warning {
//   padding: 12px;
//   border-radius: 8px;
//   background: rgba(255,180,50,.07);
//   border: 1px solid rgba(255,180,50,.16);
//   color: #e7c56d;
//   font-size: 11px;
// }

//           .transaction-box {
//             margin-top: 17px;
//           }

//           .transaction-row {
//             display: flex;
//             justify-content: space-between;
//             gap: 20px;
//             padding: 12px 0;
//             border-bottom: 1px solid rgba(255,255,255,.035);
//             font-size: 11px;
//           }

//           .transaction-row span {
//             color: rgba(150,180,183,.55);
//           }

//           .transaction-row strong {
//             color: #dce8e9;
//             text-align: right;
//           }

//           .danger-value {
//             color: #ff7883 !important;
//           }

//           .challenge-box {
//             margin-top: 18px;
//           }

//           .challenge-status {
//             display: flex;
//             gap: 12px;
//           }

//           .challenge-icon {
//             width: 36px;
//             height: 36px;
//             display: grid;
//             place-items: center;
//             color: #36d2d5;
//             border: 1px solid rgba(50,210,215,.22);
//             border-radius: 9px;
//           }

//           .challenge-status strong {
//             display: block;
//             color: #dce8e9;
//             font-size: 12px;
//           }

//           .challenge-status span {
//             display: block;
//             margin-top: 4px;
//             color: rgba(150,180,183,.55);
//             font-size: 10px;
//           }

//           .challenge-prompt {
//             margin-top: 17px;
//             padding: 14px;
//             background: rgba(2,16,19,.65);
//             border: 1px solid rgba(100,180,186,.08);
//             border-radius: 10px;
//           }

//           .challenge-prompt span {
//             display: block;
//             color: rgba(54,205,210,.55);
//             font-size: 9px;
//             letter-spacing: .1em;
//           }

//           .challenge-prompt strong {
//             display: block;
//             margin-top: 8px;
//             color: #dbe7e8;
//             font-size: 12px;
//           }

//           .challenge-actions {
//             display: flex;
//             gap: 10px;
//             margin-top: 14px;
//           }

//           .verify-btn,
//           .secondary-btn {
//             border-radius: 8px;
//             padding: 9px 13px;
//             display: inline-flex;
//             align-items: center;
//             gap: 7px;
//             cursor: pointer;
//           }

//           .verify-btn {
//             background: #1dc2c4;
//             border: 0;
//             color: #041013;
//           }

//           .secondary-btn {
//             background: transparent;
//             color: #9bb1b3;
//             border: 1px solid rgba(120,170,175,.18);
//           }

//           .audit-list {
//             margin-top: 18px;
//           }

//           .audit-item {
//             display: flex;
//             gap: 12px;
//             padding: 11px 0;
//             border-bottom: 1px solid rgba(255,255,255,.035);
//           }

//           .audit-time {
//             color: #39cbd0;
//             font-size: 10px;
//             min-width: 45px;
//           }

//           .audit-text {
//             color: rgba(180,205,206,.66);
//             font-size: 11px;
//           }

//           .safety-gate {
//             margin-top: 24px;
//             padding: 18px 20px;
//             display: flex;
//             align-items: center;
//             gap: 15px;
//             border-radius: 15px;
//             background: rgba(7,25,29,.72);
//             border: 1px solid rgba(70,180,185,.12);
//           }

//           .safety-icon {
//             color: #39d1d4;
//           }

//           .safety-copy {
//             flex: 1;
//           }

//           .safety-copy strong {
//             display: block;
//             color: #dce8e9;
//             font-size: 11px;
//             letter-spacing: .08em;
//           }

//           .safety-copy span {
//             display: block;
//             margin-top: 4px;
//             color: rgba(150,180,183,.52);
//             font-size: 10px;
//           }

//           .safety-actions {
//             display: flex;
//             gap: 8px;
//           }

//           .verify-button,
//           .block-button {
//             border: 0;
//             border-radius: 8px;
//             padding: 9px 14px;
//             cursor: pointer;
//           }

//           .verify-button {
//             background: #1dc2c4;
//             color: #041013;
//           }

//           .block-button {
//             background: rgba(255,70,85,.12);
//             color: #ff7b87;
//             border: 1px solid rgba(255,80,95,.2);
//           }

//           @media (max-width: 850px) {

//             .risk-grid,
//             .main-grid {
//               grid-template-columns: 1fr;
//             }

//             .incident-header {
//               grid-template-columns: 1fr;
//             }

//             .risk-score {
//               min-height: 100px;
//             }

//             .safety-gate {
//               flex-direction: column;
//               align-items: flex-start;
//             }

//           }

//         `}</style>

//       </div>

//     </Shell>
//   );
// }


// // ============================================================
// // SMALL COMPONENTS
// // ============================================================

// function CardHeader({
//   icon,
//   title,
//   subtitle,
// }) {

//   return (
//     <div className="card-header">

//       <div className="card-header-icon">
//         {icon}
//       </div>

//       <div>

//         <strong>
//           {title}
//         </strong>

//         <span>
//           {subtitle}
//         </span>

//       </div>

//     </div>
//   );
// }


// function RiskCard({
//   title,
//   value,
//   type,
// }) {

//   return (
//     <div
//       className={`risk-card ${type}`}
//     >

//       <div className="risk-card-title">
//         {title}
//       </div>

//       <div className="risk-card-value">
//         {value}
//       </div>

//     </div>
//   );
// }


// function SignalItem({
//   name,
//   value,
// }) {

//   return (
//     <div className="signal-item">

//       <span>
//         {name}
//       </span>

//       <strong>
//         {value}
//       </strong>

//     </div>
//   );
// }


// function FlagItem({
//   icon,
//   title,
//   text,
// }) {

//   return (
//     <div className="flag-item">

//       <div className="flag-icon">
//         {icon}
//       </div>

//       <div>

//         <strong>
//           {title}
//         </strong>

//         <span>
//           {text}
//         </span>

//       </div>

//     </div>
//   );
// }


// function AuditItem({
//   time,
//   text,
// }) {

//   return (
//     <div className="audit-item">

//       <span className="audit-time">
//         {time}
//       </span>

//       <span className="audit-text">
//         {text}
//       </span>

//     </div>
//   );
// }