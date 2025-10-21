import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import ProgressBar from "../ProgressBar/ProgressBar";

export default function Analyzer() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return alert("Please select a file first");
    setLoading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      setProgress(25);

      // Example backend API endpoint
      const response = await axios.post("http://localhost:5000/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 50));
        },
      });

      setProgress(80);
      setResult(response.data.result || "No result found");
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert("Error analyzing file");
    } finally {
      setLoading(false);
    }
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

          {result && (
            <div style={styles.resultBox}>
              <h3 style={styles.resultTitle}>Analysis Result</h3>
              <pre style={styles.resultText}>{result}</pre>
            </div>
          )}
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
