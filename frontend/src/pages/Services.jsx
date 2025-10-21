import React from "react";

const Services = () => (
  <div style={styles.page}>
    <div style={styles.card}>
      <h1>Services</h1>
      <ul>
        <li>AI-based SOW document analysis</li>
        <li>Risk identification and summary extraction</li>
        <li>Support for multiple file types (PDF, DOCX, etc.)</li>
      </ul>
    </div>
  </div>
);

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0b1020",
    color: "#e7ebf3",
  },
  card: {
    background: "#11172e",
    padding: "24px",
    borderRadius: "12px",
    maxWidth: "700px",
    border: "1px solid #1c2546",
  },
};

export default Services;
