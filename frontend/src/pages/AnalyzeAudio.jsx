import { API_BASE_URL } from "../config";
import React, { useState } from "react";
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

      const API_BASE_URL =
        import.meta.env.VITE_API_URL ||
        "http://127.0.0.1:8000";

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

          {/* UPLOAD */}

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

                const dropped =
                  e.dataTransfer.files?.[0];

                setFile(dropped || null);
                setResult(null);
                setError("");
              }}
            >

              <UploadCloud size={28} />

              <b>
                {file
                  ? file.name
                  : "Drag & drop an audio file here"}
              </b>

              <span>
                {file
                  ? `${Math.round(file.size / 1024)} KB selected`
                  : "WAV, MP3, M4A, FLAC, OGG, WebM · Maximum 25 MB"}
              </span>

              <input
                type="file"
                accept="audio/*"
                onChange={pick}
              />

              <button
                className="choose-btn"
                type="button"
              >
                Choose file
              </button>

            </label>


            {file && (

              <div className="selected-file">

                <FileAudio size={15} />

                <span>
                  {file.name}
                </span>

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


          {/* ANALYSIS */}

          <section className="panel compare-card">

            <SectionTitle
              icon={<UserRound size={16} />}
              title="Compare with registered voice"
              subtitle="Optional speaker verification"
            />

            <select>
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

              <div className="caution">
                <b>Analysis failed:</b>{" "}
                {error}
              </div>

            )}


            {/* RESULT */}

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

                <div className="result-score">

                  Spoof probability:{" "}

                  <strong>
                    {(
                      result.spoof_probability * 100
                    ).toFixed(2)}
                    %
                  </strong>

                </div>

                <div className="result-score">

                  Bonafide probability:{" "}

                  <strong>
                    {(
                      result.bonafide_probability * 100
                    ).toFixed(2)}
                    %
                  </strong>

                </div>

                <div className="result-score">

                  Risk:{" "}

                  <strong>
                    {result.verdict}
                  </strong>

                </div>

                <p className="muted">
                  {result.recommendation}
                </p>

              </div>

            )}

          </section>

        </div>

      </div>

    </Shell>
  );
}