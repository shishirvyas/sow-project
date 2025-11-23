import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import ProgressBar from "../ProgressBar/ProgressBar";
import { useNavigate } from "react-router-dom";

export default function Analyzer() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // will hold parsed JSON or null
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    // This UI triggers the backend processing endpoint which reads server-side resources
    setLoading(true);
    setProgress(10);
    setResult(null);
    // Validate that a file (basename) has been selected
    if (!file) {
      alert("Please Upload a SOW file to start analysis. No File Selected.");
      setLoading(false);
      return;
    }
    try {
      // POST to the FastAPI endpoint we added CORS for
      // Send the selected filename as a query parameter (backend expects basenames present on server)
      const url = `http://127.0.0.1:8000/api/v1/process-sows?filenames=${encodeURIComponent(
        file.name
      )}`;
      setProgress(25);

      const response = await axios.post(url, null, {
        timeout: 120000,
        onDownloadProgress: (e) => {
          // simulate progress during long processing
          if (e.lengthComputable) {
            setProgress(30 + Math.round((e.loaded / e.total) * 50));
          }
        },
      });

      setProgress(80);
      // Attempt to parse JSON. Backend returns Response with application/json
      const data = response.data;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      // Navigate to results page and pass payload via location state
      navigate("/results", { state: { payload } });
      setProgress(100);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data || err.message || "Error analyzing";
      alert(String(msg));
    } finally {
      setLoading(false);
      // small delay to show 100% progress
      setTimeout(() => setProgress(0), 800);
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const renderValue = (val) => {
    if (val === null) return <em>null</em>;
    if (Array.isArray(val)) {
      return (
        <ul style={{ paddingLeft: 16 }}>
          {val.map((v, i) => (
            <li key={i}>{renderValue(v)}</li>
          ))}
        </ul>
      );
    }
    if (typeof val === "object") {
      return (
        <div style={{ borderLeft: "2px solid #1c2546", paddingLeft: 12 }}>
          {Object.keys(val).map((k) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <strong style={{ color: "#2b5cff" }}>{k}:</strong>
              <div style={{ marginTop: 4 }}>{renderValue(val[k])}</div>
            </div>
          ))}
        </div>
      );
    }
    return <span style={{ color: "#e7ebf3" }}>{String(val)}</span>;
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h1 style={styles.title}>SOW Analyzer</h1>

        <div style={styles.card}>
          <label htmlFor="fileUpload" style={styles.label}>
            Choose SOW File
          </label>
          <input
            id="fileUpload"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            style={styles.fileInput}
          />

          <button onClick={handleAnalyze} style={styles.button} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>

          {loading && (
            <div style={{ width: "100%", marginTop: "12px" }}>
              <ProgressBar progress={progress} />
            </div>
          )}

          {/* Result view moved to dedicated results page */}
        </div>
      </div>
    </div>
  );
}

// 💅 Styles
const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0b1020 0%, #11172e 100%)",
    padding: "20px",
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: "700px",
    textAlign: "center",
  },
  title: {
    color: "#e7ebf3",
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "20px",
  },
  card: {
    background: "#11172e",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    border: "1px solid #1c2546",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  label: {
    color: "#e7ebf3",
    fontWeight: "500",
    fontSize: "16px",
  },
  fileInput: {
    background: "#0b1020",
    border: "1px solid #2b5cff",
    borderRadius: "8px",
    color: "#e7ebf3",
    padding: "10px",
    width: "100%",
    maxWidth: "350px",
    cursor: "pointer",
  },
  button: {
    background: "#2b5cff",
    color: "#fff",
    border: "none",
    padding: "12px 28px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  resultBox: {
    background: "#0b1020",
    border: "1px solid #1c2546",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "20px",
    textAlign: "left",
    width: "100%",
    overflowX: "auto",
  },
  resultTitle: {
    color: "#2b5cff",
    marginBottom: "8px",
  },
  resultText: {
    color: "#e7ebf3",
    whiteSpace: "pre-wrap",
    fontSize: "14px",
    fontFamily: "monospace",
  },

  // 🔧 Media queries
  "@media (max-width: 600px)": {
    title: { fontSize: "1.5rem" },
    card: { padding: "18px" },
    button: { width: "100%" },
  },
};
