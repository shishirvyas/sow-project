import React from "react";

const About = () => (
  <div style={styles.page}>
    <div style={styles.card}>
      <h1>About</h1>
      <p>
        This application helps analyze Statements of Work (SOW) using AI models. 
        It identifies risks and unclear points from uploaded documents.
      </p>
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

export default About;
