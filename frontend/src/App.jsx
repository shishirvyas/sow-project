// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import ProgressBar from "./components/ProgressBar/ProgressBar";

const BACKEND_BASE = "http://localhost:5000";
const BACKEND_URL = `${BACKEND_BASE}/analyze`;
const LLM_OPTIONS_URL = `${BACKEND_BASE}/llm-options`;
const LLM_SELECT_URL = `${BACKEND_BASE}/llm-select`;

const MAX_SIZE_MB = 25;
const ALLOWED_EXT = [".pdf", ".docx", ".doc", ".txt", ".rtf", ".html", ".htm", ".xls", ".xlsx"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "application/rtf",
  "text/html",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export default function App() {
  // LLM selection state
  const [llmOptions, setLlmOptions] = useState([]);
  const [selectedLLM, setSelectedLLM] = useState(() => localStorage.getItem("selectedLLM") || "mock");
  const [selectedLocalBackend, setSelectedLocalBackend] = useState(() => localStorage.getItem("selectedLocalBackend") || "ollama");

  // File + UI state
  const [file, setFile] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  const isValidFile = useMemo(() => {
    if (!file) return false;
    const ext = file.name?.toLowerCase().slice(file.name.lastIndexOf(".")) || "";
    const okType = ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);
    const okSize = file.size <= MAX_SIZE_MB * 1024 * 1024;
    return okType && okSize;
  }, [file]);

  const isValidType = (f) => {
    const ext = f.name?.toLowerCase().slice(f.name.lastIndexOf(".")) || "";
    return ALLOWED_MIME.includes(f.type) || ALLOWED_EXT.includes(ext);
  };

  const handleFile = (f) => {
    if (!f) return;
    setError("");
    setResult(null);
    setRawResponse(null);
    setFile(f);
    setPreviewName(f.name);
    setUploadProgress(0);

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB} MB.`);
    } else if (!isValidType(f)) {
      setError("Unsupported file type. Use PDF, DOCX, DOC, RTF, HTML, XLSX, or TXT.");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const analyze = async () => {
    if (!file) return setError("Please choose a file.");
    if (!isValidFile) return setError("Unsupported file or size.");

    try {
      setIsLoading(true);
      setError("");
      setResult(null);
      setRawResponse(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(BACKEND_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          } else {
            const pct = Math.min(98, Math.round((progressEvent.loaded / (1024 * 1024)) * 2));
            setUploadProgress(pct);
          }
        },
      });

      setUploadProgress(100);

      if (data?.ok && data.analysis) {
        setResult(data.analysis);
        setRawResponse(data);
      } else if (!data?.ok) {
        const serverMsg = data?.parseError || data?.error || data?.message || JSON.stringify(data);
        setError(`Server failed to parse/analyze: ${serverMsg}`);
        setRawResponse(data);
      } else {
        // fallback (older shape)
        setResult(data);
      }
    } catch (err) {
      // Friendly handling for common backend responses
      const serverData = err?.response?.data;
      if (serverData?.error === "quota_exceeded") {
        setError("Server: OpenAI quota exhausted. Enable billing or use Mock/Local mode.");
      } else if (serverData?.error === "backend_unreachable") {
        setError("Server: Selected LLM backend is unreachable. Check local LLM or select another option.");
      } else {
        const msg =
          serverData?.message ||
          serverData?.error ||
          err?.message ||
          "Something went wrong while analyzing.";
        setError(msg);
      }
    } finally {
      setTimeout(() => setUploadProgress(0), 400);
      setIsLoading(false);
    }
  };

  // Fetch LLM options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const r = await axios.get(LLM_OPTIONS_URL, { timeout: 5000 });
        if (r.data?.ok && r.data.options) {
          setLlmOptions(r.data.options);
          if (r.data.current) {
            setSelectedLLM(r.data.current.mode || "mock");
            if (r.data.current.localBackend) setSelectedLocalBackend(r.data.current.localBackend);
          }
        } else {
          // fallback if backend responds but not ok
          setLlmOptions([{ id: "mock", label: "Mock (dev)" }, { id: "openai", label: "OpenAI (cloud)" }, { id: "local:ollama", label: "Local: Ollama" }]);
        }
      } catch (e) {
        console.warn("Could not fetch LLM options:", e.message || e);
        setLlmOptions([{ id: "mock", label: "Mock (dev)" }, { id: "openai", label: "OpenAI (cloud)" }, { id: "local:ollama", label: "Local: Ollama" }]);
      }
    }
    loadOptions();
  }, []);

  // Call backend to set selection
  async function setLLMSelection(mode, localBackend) {
    try {
      const body = { mode: mode === "local:ollama" || mode === "local:textgen" ? "local" : mode };
      if (localBackend) body.localBackend = localBackend;
      await axios.post(LLM_SELECT_URL, body);
      setSelectedLLM(mode);
      localStorage.setItem("selectedLLM", mode);
      if (localBackend) {
        setSelectedLocalBackend(localBackend);
        localStorage.setItem("selectedLocalBackend", localBackend);
      }
    } catch (e) {
      console.error("Failed to set LLM selection:", e.message || e);
      alert("Failed to select LLM backend. See console for details.");
    }
  }

  const copySummary = async () => {
    if (!result) return;
    const text = [
      "SOW Analysis",
      "",
      "Risks:",
      ...(result.risks?.length ? result.risks.map((r, i) => `${i + 1}. ${r}`) : ["- none -"]),
      "",
      "Unclear Points:",
      ...(result.unclear?.length ? result.unclear.map((u, i) => `${i + 1}. ${u}`) : ["- none -"]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard.");
    } catch {
      alert("Could not copy.");
    }
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sow-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>SOW Analyzer</h1>

        {/* LLM selector */}
        <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ opacity: 0.85 }}>LLM:</label>
          <select
            value={selectedLLM}
            onChange={(ev) => {
              const val = ev.target.value;
              if (val === "local:ollama" || val === "local:textgen") {
                setLLMSelection(val, val === "local:ollama" ? "ollama" : "textgen");
              } else {
                setLLMSelection(val);
              }
            }}
            style={{ padding: "6px 8px", borderRadius: 8, background: "#0f1530", color: "#e7ebf3", border: "1px solid #1c2546" }}
          >
            {llmOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Current: <strong>{selectedLLM}</strong>
          </div>
        </div>

        <p style={styles.subtitle}>
          Upload a PDF, DOC/DOCX, RTF, HTML, XLSX, or TXT. Max {MAX_SIZE_MB} MB.
        </p>

        <div
          style={styles.drop}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => document.getElementById("fileInput").click()}
          role="button"
          aria-label="Upload SOW file"
        >
          <p style={{ margin: 0 }}>{previewName ? `Selected: ${previewName}` : "Drag & drop or click to choose file"}</p>
          <input id="fileInput" type="file" accept=".pdf,.doc,.docx,.doc,.rtf,.html,.htm,.txt,.xls,.xlsx" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>

        <button
          onClick={analyze}
          disabled={!file || !isValidFile || isLoading}
          style={{
            ...styles.button,
            opacity: !file || !isValidFile || isLoading ? 0.6 : 1,
            cursor: !file || !isValidFile || isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Analyzing…" : "Analyze"}
        </button>

        {/* Progress bar (visible while uploading) */}
        <ProgressBar progress={uploadProgress} showText={true} visible={uploadProgress > 0 && uploadProgress < 100} />

        {error && <div style={styles.error}>{error}</div>}

        {result && (
          <div style={styles.result}>
            <h2 style={styles.sectionTitle}>Analysis Result</h2>

            <div style={styles.grid}>
              <div style={styles.panel}>
                <h3 style={styles.panelTitle}>Risks {Array.isArray(result.risks) ? `(${result.risks.length})` : ""}</h3>
                {Array.isArray(result.risks) && result.risks.length > 0 ? (
                  <ul style={styles.list}>{result.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                ) : (
                  <p style={styles.muted}>No risks found.</p>
                )}
              </div>

              <div style={styles.panel}>
                <h3 style={styles.panelTitle}>Unclear Points {Array.isArray(result.unclear) ? `(${result.unclear.length})` : ""}</h3>
                {Array.isArray(result.unclear) && result.unclear.length > 0 ? (
                  <ul style={styles.list}>{result.unclear.map((u, i) => <li key={i}>{u}</li>)}</ul>
                ) : (
                  <p style={styles.muted}>No unclear points.</p>
                )}
              </div>
            </div>

            <div style={styles.actions}>
              <button onClick={copySummary} style={styles.secondaryBtn}>Copy Summary</button>
              <button onClick={downloadJSON} style={styles.secondaryBtn}>Download JSON</button>
            </div>

            {rawResponse && (
              <details style={{ marginTop: 12, color: "#cbd5e1" }}>
                <summary>Server response (debug)</summary>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{JSON.stringify(rawResponse, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* keep your original styles object below unchanged */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: "#0b1020",
    color: "#e7ebf3",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 900,
    background: "#11172e",
    border: "1px solid #1c2546",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
  },
  title: { margin: "0 0 8px 0", fontSize: 28 },
  subtitle: { marginTop: 0, opacity: 0.8 },
  drop: {
    border: "2px dashed #2f3a66",
    borderRadius: 12,
    padding: 24,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
    background: "#0f1530",
  },
  button: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #2b3870",
    background: "#2b5cff",
    color: "white",
    fontWeight: 600,
  },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    background: "#3a1020",
    border: "1px solid #7a1a3a",
    color: "#ffb4c4",
    whiteSpace: "pre-wrap",
  },
  result: {
    marginTop: 24,
    background: "#0f1530",
    borderRadius: 12,
    border: "1px solid #1c2546",
    padding: 16,
  },
  sectionTitle: { marginTop: 0, marginBottom: 12, fontSize: 20 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  panel: {
    background: "#0b1126",
    border: "1px solid #1c2546",
    borderRadius: 10,
    padding: 12,
  },
  panelTitle: { marginTop: 0, marginBottom: 10, fontSize: 16 },
  list: { margin: 0, paddingLeft: 18 },
  muted: { opacity: 0.75, margin: 0 },
  actions: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #2b3870",
    background: "#131b3a",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
};
