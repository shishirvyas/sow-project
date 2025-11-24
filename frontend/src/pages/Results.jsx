import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const payload = state?.payload;

  if (!payload) {
    return (
      <div style={{ padding: 24 }}>
        <h2>No result to display</h2>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const renderValue = (val) => {
    if (val === null) return <em>null</em>;
    if (Array.isArray(val)) {
      return (
        <ul>
          {val.map((v, i) => (
            <li key={i}>{renderValue(v)}</li>
          ))}
        </ul>
      );
    }
    if (typeof val === "object") {
      return (
        <div style={{ marginLeft: 8 }}>
          {Object.keys(val).map((k) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <strong>{k}:</strong>
              <div>{renderValue(val[k])}</div>
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  const { content, blob_url } = payload;

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <h2>Analysis Result</h2>
      {blob_url && (
        <div style={{ marginBottom: 12 }}>
          <a href={blob_url} target="_blank" rel="noreferrer">Open in Azure Blob Storage</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <h3>Structured Analysis</h3>
          <div style={{ background: "#f7f7f7", padding: 16, borderRadius: 6 }}>
            {renderValue(content)}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Processing Logs</h3>
          <div style={{ background: '#0f1720', color: '#e6eef8', padding: 12, borderRadius: 6, fontSize: 13 }}>
            <div><strong>Requested files:</strong></div>
            <div style={{ marginBottom: 8 }}>{(payload.requested_filenames || []).join(', ') || '—'}</div>

            <div><strong>Output files:</strong></div>
            <div style={{ marginBottom: 8 }}>{(payload.output_files || []).slice(0,5).join(', ') || '—'}</div>

            <div><strong>Duration:</strong></div>
            <div style={{ marginBottom: 8 }}>{payload.processing?.duration_seconds ? `${payload.processing.duration_seconds}s` : '—'}</div>

            <div><strong>Return code:</strong> {payload.processing?.returncode ?? '—'}</div>

            <details style={{ marginTop: 8 }}>
              <summary>Stdout (server)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: '#dff' }}>{payload.processing?.stdout || '—'}</pre>
            </details>

            <details style={{ marginTop: 8 }}>
              <summary>Stderr (server)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: '#ffdcdc' }}>{payload.processing?.stderr || '—'}</pre>
            </details>

            <details style={{ marginTop: 8 }}>
              <summary>Upload Info</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: '#efe' }}>{JSON.stringify(payload.upload_info || payload.processing?.upload || {}, null, 2)}</pre>
            </details>

          </div>
        </div>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary>Raw JSON</summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </div>
  );
}
