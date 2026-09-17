// import { useRef, useState } from "react";

// const MAX_FILE_SIZE = 25 * 1024 * 1024;
// const SUPPORTED_EXTENSIONS = ["wav", "mp3", "m4a", "flac", "ogg", "webm"];

// function readableSize(bytes) {
//   if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }

// function labelForStatus(status) {
//   if (status === "model_not_configured") return "Model integration required";
//   if (status === "success") return "Analysis complete";
//   if (status === "inference_error") return "Model inference unavailable";
//   return status.replaceAll("_", " ");
// }

// function validateFile(file) {
//   const extension = file.name.split(".").pop()?.toLowerCase();
//   if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
//     return "Choose WAV, MP3, M4A, FLAC, OGG, or WebM audio.";
//   }
//   if (file.size === 0) return "The selected audio file is empty.";
//   if (file.size > MAX_FILE_SIZE) return "The file is larger than the 25 MB limit.";
//   return null;
// }

// function App() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const fileInput = useRef(null);

//   function chooseFile(file) {
//     setResult(null);
//     if (!file) {
//       setSelectedFile(null);
//       return;
//     }
//     const validationError = validateFile(file);
//     if (validationError) {
//       setSelectedFile(null);
//       setError(validationError);
//       return;
//     }
//     setError("");
//     setSelectedFile(file);
//   }

//   async function analyse() {
//     if (!selectedFile) {
//       setError("Select an audio file before starting an analysis.");
//       return;
//     }

//     setIsLoading(true);
//     setError("");
//     setResult(null);

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const response = await fetch("/api/analyse", { method: "POST", body: formData });
//       const body = await response.json();
//       if (!response.ok) throw new Error(body.detail || "The server could not analyse this file.");
//       setResult(body);
//     } catch (requestError) {
//       setError(requestError.message || "Could not connect to the VoxShield backend.");
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   function reset() {
//     setSelectedFile(null);
//     setResult(null);
//     setError("");
//     if (fileInput.current) fileInput.current.value = "";
//   }

//   const isModelReady = result?.status === "success";

//   return (
//     <main className="page-shell">
//       <header className="site-header">
//         <a className="brand" href="#top" aria-label="VoxShield home">
//           <span className="brand-mark" aria-hidden="true">◈</span>
//           <span>VoxShield</span>
//         </a>
//         <span className="beta-pill">Hackathon MVP</span>
//       </header>

//       <section className="hero" id="top">
//         <p className="eyebrow">VOICE IMPERSONATION SCREENING</p>
//         <h1>Make voice-based decisions with a safer second look.</h1>
//         <p className="hero-copy">
//           Upload an audio clip to send it through VoxShield’s anti-spoofing analysis pipeline.
//           Always verify a caller through an independent channel before sensitive actions.
//         </p>
//       </section>

//       <section className="dashboard" aria-label="Audio analysis dashboard">
//         <div className="panel upload-panel">
//           <div className="panel-heading">
//             <div>
//               <p className="step-label">01 / AUDIO INPUT</p>
//               <h2>Upload a voice recording</h2>
//             </div>
//             <span className="limit-label">Up to 25 MB</span>
//           </div>

//           <label className="drop-zone" htmlFor="audio-file">
//             <span className="upload-icon" aria-hidden="true">↑</span>
//             <span className="drop-title">Choose an audio file</span>
//             <span className="drop-copy">WAV, MP3, M4A, FLAC, OGG, or WebM</span>
//             <input
//               ref={fileInput}
//               id="audio-file"
//               type="file"
//               accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,audio/*"
//               onChange={(event) => chooseFile(event.target.files?.[0])}
//             />
//           </label>

//           {selectedFile && (
//             <div className="file-row" aria-live="polite">
//               <span className="file-icon" aria-hidden="true">♪</span>
//               <span className="file-name">{selectedFile.name}</span>
//               <span className="file-size">{readableSize(selectedFile.size)}</span>
//             </div>
//           )}

//           {error && <p className="error-message" role="alert">{error}</p>}

//           <div className="actions">
//             <button className="button secondary" type="button" onClick={reset} disabled={isLoading}>
//               Reset
//             </button>
//             <button className="button primary" type="button" onClick={analyse} disabled={isLoading}>
//               {isLoading ? "Analysing audio…" : "Analyse recording"}
//             </button>
//           </div>
//         </div>

//         <aside className="panel trust-panel" aria-label="How VoxShield uses results">
//           <p className="step-label">HOW TO USE THIS</p>
//           <h2>A signal, not a verdict.</h2>
//           <p>
//             VoxShield is designed to support fraud-prevention conversations. It does not confirm
//             identity or detect every AI-generated voice.
//           </p>
//           <ul>
//             <li>Do not share OTPs, PINs, or account credentials on a call.</li>
//             <li>Call a known official number to verify an urgent request.</li>
//             <li>Escalate suspicious requests through your normal fraud process.</li>
//           </ul>
//         </aside>
//       </section>

//       {result && (
//         <section className="results" aria-live="polite" aria-label="Analysis result">
//           <div className="results-heading">
//             <div>
//               <p className="step-label">02 / SCREENING RESULT</p>
//               <h2>{labelForStatus(result.status)}</h2>
//             </div>
//             <span className={`status-chip ${isModelReady ? "ready" : "pending"}`}>
//               {isModelReady ? "Model output" : "No model output"}
//             </span>
//           </div>

//           <div className="metric-grid">
//             <article className="metric-card">
//               <span>Classification</span>
//               <strong>{result.label === "unknown" ? "Unknown" : result.label}</strong>
//               <small>Actual detector label</small>
//             </article>
//             <article className="metric-card">
//               <span>Spoof probability</span>
//               <strong>{result.spoof_probability == null ? "Not available" : `${(result.spoof_probability * 100).toFixed(1)}%`}</strong>
//               <small>Actual model output only</small>
//             </article>
//             <article className="metric-card">
//               <span>Voice risk</span>
//               <strong className={result.voice_risk ? `risk-${result.voice_risk}` : ""}>
//                 {result.voice_risk ?? "Not available"}
//               </strong>
//               <small>Derived from model output</small>
//             </article>
//           </div>

//           <div className="result-details">
//             <article>
//               <h3>What this result means</h3>
//               <ul>
//                 {result.explanation.map((item) => <li key={item}>{item}</li>)}
//               </ul>
//               <p className="model-note">Model: {result.model_name} · Processing: {result.processing_time_ms} ms</p>
//             </article>
//             <article className="recommendation">
//               <h3>Recommended action</h3>
//               <p>{result.recommendation}</p>
//               <span>Simulated banking fraud-prevention guidance — not an automated decision.</span>
//             </article>
//           </div>
//         </section>
//       )}

//       <footer>
//         VoxShield MVP · This tool supports review; it does not prove authenticity or identity.
//       </footer>
//     </main>
//   );
// }

// export default App;

import { useRef, useState } from "react";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ["wav", "mp3", "m4a", "flac", "ogg", "webm"];

function readableSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function labelForStatus(status) {
  if (status === "model_not_configured") return "Model integration required";
  if (status === "complete") return "Analysis complete";
  return status.replaceAll("_", " ");
}

function validateFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return "Choose WAV, MP3, M4A, FLAC, OGG, or WebM audio.";
  }
  if (file.size === 0) return "The selected audio file is empty.";
  if (file.size > MAX_FILE_SIZE) return "The file is larger than the 25 MB limit.";
  return null;
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInput = useRef(null);

  function chooseFile(file) {
    setResult(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }
    setError("");
    setSelectedFile(file);
  }

  async function analyse() {
    if (!selectedFile) {
      setError("Select an audio file before starting an analysis.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/analyse", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "The server could not analyse this file.");
      setResult(body);
    } catch (requestError) {
      setError(requestError.message || "Could not connect to the VoxShield backend.");
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setSelectedFile(null);
    setResult(null);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  const isModelReady = result?.status === "complete";

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VoxShield home">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <span>VoxShield</span>
        </a>
        <span className="beta-pill">Hackathon MVP</span>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">VOICE IMPERSONATION SCREENING</p>
        <h1>Make voice-based decisions with a safer second look.</h1>
        <p className="hero-copy">
          Upload an audio clip to send it through VoxShield’s anti-spoofing analysis pipeline.
          Always verify a caller through an independent channel before sensitive actions.
        </p>
      </section>

      <section className="dashboard" aria-label="Audio analysis dashboard">
        <div className="panel upload-panel">
          <div className="panel-heading">
            <div>
              <p className="step-label">01 / AUDIO INPUT</p>
              <h2>Upload a voice recording</h2>
            </div>
            <span className="limit-label">Up to 25 MB</span>
          </div>

          <label className="drop-zone" htmlFor="audio-file">
            <span className="upload-icon" aria-hidden="true">↑</span>
            <span className="drop-title">Choose an audio file</span>
            <span className="drop-copy">WAV, MP3, M4A, FLAC, OGG, or WebM</span>
            <input
              ref={fileInput}
              id="audio-file"
              type="file"
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,audio/*"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>

          {selectedFile && (
            <div className="file-row" aria-live="polite">
              <span className="file-icon" aria-hidden="true">♪</span>
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{readableSize(selectedFile.size)}</span>
            </div>
          )}

          {error && <p className="error-message" role="alert">{error}</p>}

          <div className="actions">
            <button className="button secondary" type="button" onClick={reset} disabled={isLoading}>
              Reset
            </button>
            <button className="button primary" type="button" onClick={analyse} disabled={isLoading}>
              {isLoading ? "Analysing audio…" : "Analyse recording"}
            </button>
          </div>
        </div>

        <aside className="panel trust-panel" aria-label="How VoxShield uses results">
          <p className="step-label">HOW TO USE THIS</p>
          <h2>A signal, not a verdict.</h2>
          <p>
            VoxShield is designed to support fraud-prevention conversations. It does not confirm
            identity or detect every AI-generated voice.
          </p>
          <ul>
            <li>Do not share OTPs, PINs, or account credentials on a call.</li>
            <li>Call a known official number to verify an urgent request.</li>
            <li>Escalate suspicious requests through your normal fraud process.</li>
          </ul>
        </aside>
      </section>

      {result && (
        <section className="results" aria-live="polite" aria-label="Analysis result">
          <div className="results-heading">
            <div>
              <p className="step-label">02 / SCREENING RESULT</p>
              <h2>{labelForStatus(result.status)}</h2>
            </div>
            <span className={`status-chip ${isModelReady ? "ready" : "pending"}`}>
              {isModelReady ? "Model output" : "No model output"}
            </span>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Classification</span>
              <strong>{result.label === "unknown" ? "Unknown" : result.label}</strong>
              <small>Actual detector label</small>
            </article>
            <article className="metric-card">
              <span>Spoof probability</span>
              <strong>{result.spoof_probability == null ? "Not available" : `${(result.spoof_probability * 100).toFixed(1)}%`}</strong>
              <small>Actual model output only</small>
            </article>
            <article className="metric-card">
              <span>Voice risk</span>
              <strong className={result.voice_risk ? `risk-${result.voice_risk}` : ""}>
                {result.voice_risk ?? "Not available"}
              </strong>
              <small>Derived from model output</small>
            </article>
          </div>

          <div className="result-details">
            <article>
              <h3>What this result means</h3>
              <ul>
                {result.explanation.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
              <p className="model-note">Model: {result.model_name} · Processing: {result.processing_time_ms} ms</p>
            </article>
            <article className="recommendation">
              <h3>Recommended action</h3>
              <p>{result.recommendation}</p>
              <span>Simulated banking fraud-prevention guidance — not an automated decision.</span>
            </article>
          </div>
        </section>
      )}

      <footer>
        VoxShield MVP · This tool supports review; it does not prove authenticity or identity.
      </footer>
    </main>
  );
}

export default App;