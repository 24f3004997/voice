import { API_BASE_URL } from "./config";
import React, { useState, useRef } from "react";
import {
  UploadCloud,
  UserRound,
  Activity,
  FileAudio,
  X,
} from "lucide-react";

import {
  Shell,
  PageTitle,
  SectionTitle,
} from "../components/Layout";

export default function AnalyzeAudio() {

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const pick = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setError("");
  };

  const analyzeAudio = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/api/analyse`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Analysis failed"
        );
      }

      setResult(data);

    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        "Unable to analyse audio."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>

      <PageTitle
        eyebrow="Upload a voice recording to evaluate voice integrity, speaker similarity and fraud-related signals"
        title="ANALYZE AUDIO"
      />

      <div className="content analyze-content">

        <div className="upload-layout">

          {/* UPLOAD (Left Side - Chota Box) */}
          <section className="panel upload-card">

            <SectionTitle
              icon={<UploadCloud size={16} />}
              title="Upload recording"
              subtitle="WAV, MP3, M4A, FLAC, OGG, WebM · Maximum 25 MB"
            />

            <label
              className={
                "dropzone " +
                (drag ? "drag" : "")
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const dropped = e.dataTransfer.files?.[0];
                setFile(dropped || null);
                setResult(null);
                setError("");
              }}
            >

              <UploadCloud size={28} className="cloud-icon" />

              <b>
                {file
                  ? file.name
                  : "Drag & drop an audio file here"}
              </b>

              <span>
                {file
                  ? `${Math.round(file.size / 1024)} KB selected`
                  : "Maximum 25 MB file size limit"}
              </span>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }} 
                accept="audio/*"
                onChange={pick}
              />

              <button
                className="choose-btn"
                type="button"
                onClick={() => fileInputRef.current.click()}
              >
                Choose file
              </button>

            </label>

            {file && (
              <div className="selected-file">
                <FileAudio size={15} className="file-icon" />
                <span>{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

          </section>


          {/* ANALYSIS & RESULT (Right Side - Bada Box) */}
          <section className="panel compare-card">

            <SectionTitle
              icon={<UserRound size={16} />}
              title="Compare with registered voice"
              subtitle="Optional speaker verification"
            />

            <select className="glass-select">
              <option>None</option>
              <option>Demo CFO</option>
              <option>Demo CEO</option>
              <option>Demo Finance Manager</option>
            </select>

            <p className="muted">
              Without a profile, only voice integrity analysis is performed.
            </p>

            <div className="caution">
              <b>Interpret with caution.</b>{" "}
              Model output is a screening signal and
              should not be treated as proof of authenticity.
            </div>

            <button
              className="primary-btn analyze-btn"
              disabled={!file || loading}
              onClick={analyzeAudio}
            >
              <Activity size={14} />
              {loading
                ? "Analyzing..."
                : "Analyze Audio"}
            </button>

            {/* ERROR */}
            {error && (
              <div className="error-box">
                <b>Analysis failed:</b>{" "}
                {error}
              </div>
            )}

            {/* RESULT (Bada Dikhne Wala Area) */}
            {result && (
              <div className="analysis-result">

                <div className="result-title">
                  ANALYSIS RESULT
                </div>

                <h2
                  className={
                    result.label === "SPOOF"
                      ? "result-spoof"
                      : "result-bonafide"
                  }
                >
                  {result.label}
                </h2>

                <div className="result-stats-grid">
                  <div className="result-stat-box">
                    <span>Spoof Probability</span>
                    <strong>
                      {(result.spoof_probability * 100).toFixed(2)}%
                    </strong>
                  </div>

                  <div className="result-stat-box">
                    <span>Bonafide Probability</span>
                    <strong>
                      {(result.bonafide_probability * 100).toFixed(2)}%
                    </strong>
                  </div>

                  <div className="result-stat-box">
                    <span>Risk Verdict</span>
                    <strong className={result.label === "SPOOF" ? "spoof-text" : "bonafide-text"}>
                      {result.verdict}
                    </strong>
                  </div>
                </div>

                <p className="result-recommendation">
                  {result.recommendation}
                </p>

              </div>
            )}

          </section>

        </div>

      </div>

      {/* =====================================================
          PAGE CSS (MODERN DARK THEME)
      ===================================================== */}
      <style>{`
        .analyze-content {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          padding: 20px 0 80px;
          color: #f8fafc;
        }

        /* Ambient background glow */
        .analyze-content::before {
          content: "";
          position: fixed;
          width: 600px;
          height: 600px;
          left: -150px;
          top: 50px;
          background: rgba(34, 211, 238, 0.12); /* Cyan Glow */
          filter: blur(150px);
          pointer-events: none;
          z-index: -1;
        }

        .analyze-content::after {
          content: "";
          position: fixed;
          width: 600px;
          height: 600px;
          right: -100px;
          bottom: -100px;
          background: rgba(139, 92, 246, 0.12); /* Purple Glow */
          filter: blur(150px);
          pointer-events: none;
          z-index: -1;
        }

        /* Layout - Left Box Chota (35%), Right Box Bada (65%) */
        .upload-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .upload-card {
          flex: 0 0 35%; /* Upload Box width restricted */
        }

        .compare-card {
          flex: 1; /* Result Box gets remaining large space */
        }

        /* Glass Panels */
        .panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }

        /* Dropzone Styling */
        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          padding: 40px 20px;
          margin-top: 16px;
          border: 2px dashed rgba(34, 211, 238, 0.2);
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.4);
          transition: all 0.2s ease;
        }

        .dropzone.drag, .dropzone:hover {
          border-color: #22d3ee;
          background: rgba(34, 211, 238, 0.05);
        }

        .cloud-icon {
          color: #22d3ee;
          margin-bottom: 8px;
        }

        .dropzone b {
          font-size: 14px;
          color: #f8fafc;
          font-weight: 600;
        }

        .dropzone span {
          font-size: 11px;
          color: #64748b;
        }

        .choose-btn {
          margin-top: 12px;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
          border: 1px solid rgba(34, 211, 238, 0.2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .choose-btn:hover {
          background: rgba(34, 211, 238, 0.2);
        }

        /* Selected File */
        .selected-file {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.05);
          border: 1px solid rgba(34, 211, 238, 0.15);
        }

        .selected-file .file-icon {
          color: #22d3ee;
        }

        .selected-file span {
          flex: 1;
          font-size: 13px;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .selected-file button {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
        }

        .selected-file button:hover {
          color: #ef4444; /* Red close icon on hover */
        }

        /* Right Panel Elements */
        .glass-select {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f8fafc;
          font-size: 13px;
          outline: none;
        }
        
        .glass-select option {
          background: #0f172a;
          color: #f8fafc;
        }

        .muted {
          margin-top: 8px;
          font-size: 12px;
          color: #64748b;
        }

        .caution {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          font-size: 12px;
          line-height: 1.5;
        }

        .analyze-btn {
          margin-top: 24px;
          width: 100%;
          padding: 14px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          background: #22d3ee;
          color: #020617;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: 0.2s;
        }

        .analyze-btn:hover:not(:disabled) {
          background: #06b6d4;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(34, 211, 238, 0.2);
        }

        .analyze-btn:disabled {
          background: rgba(255, 255, 255, 0.1);
          color: #64748b;
          cursor: not-allowed;
        }

        .error-box {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 13px;
        }

        /* Large Result Area */
        .analysis-result {
          margin-top: 30px;
          padding: 30px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
        }

        .result-title {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .result-spoof {
          font-size: 36px;
          color: #ef4444; /* Big Red for Spoof */
          margin: 0 0 24px 0;
          letter-spacing: 0.05em;
        }

        .result-bonafide {
          font-size: 36px;
          color: #10b981; /* Big Green for Bonafide */
          margin: 0 0 24px 0;
          letter-spacing: 0.05em;
        }

        .result-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .result-stat-box {
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .result-stat-box span {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .result-stat-box strong {
          font-size: 18px;
          color: #f8fafc;
        }

        .spoof-text { color: #ef4444 !important; }
        .bonafide-text { color: #10b981 !important; }

        .result-recommendation {
          margin: 0;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          font-size: 14px;
        }

        /* Responsive Layout */
        @media (max-width: 900px) {
          .upload-layout {
            flex-direction: column;
          }
          .upload-card, .compare-card {
            flex: 1 1 100%;
            width: 100%;
          }
          .result-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </Shell>
  );
}