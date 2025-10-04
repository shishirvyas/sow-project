import React from "react";
import "./progress.css";

/**
 * Props:
 *  - progress: number (0-100)
 *  - showText: boolean (show percentage text on the bar)
 *  - visible: boolean (whether to render)
 *  - className: optional extra className
 */
export default function ProgressBar({ progress = 0, showText = true, visible = true, className = "" }) {
  if (!visible) return null;

  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className={`cv-progress-root ${className}`} aria-hidden={false} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="cv-progress-track">
        <div className="cv-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {showText && (
        <div className="cv-progress-text" aria-hidden="true">
          {pct}%
        </div>
      )}
    </div>
  );
}
