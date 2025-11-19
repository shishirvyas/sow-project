import json
import logging
from pathlib import Path
from text_extraction_helpers import extract_text

def fallback_chunk_and_call(system_prompt: str, sow_text: str, call_llm_single=None, OUT_DIR: Path = None):
    """
    If a document exceeds size limits, a safe fallback is to chunk the SOW,
    call the model on each chunk and then aggregate results. This function
    provides a simple chunking strategy (not as robust as streaming).
    """
    max_chunk = 20000  # characters per chunk (tune)
    chunks = [sow_text[i:i+max_chunk] for i in range(0, len(sow_text), max_chunk)]
    aggregated = {
        "detected": False,
        "findings": [],
        "overall_risk": "none",
        "actions": [],
        "meta": {"aggregation": True, "chunks": len(chunks)}
    }
    for idx, chunk in enumerate(chunks, start=1):
        user = None
        if call_llm_single:
            user = call_llm_single(system_prompt, chunk)
        else:
            logging.error("call_llm_single function must be provided.")
            continue
        parsed = user.get("parsed")
        raw = user.get("raw")
        # If parsed join findings; crude merging: append findings and set detected True if any
        if parsed and isinstance(parsed, dict):
            if parsed.get("detected"):
                aggregated["detected"] = True
            aggregated["findings"].extend(parsed.get("findings", []))
            # escalate risk
            if parsed.get("overall_risk") == "high":
                aggregated["overall_risk"] = "high"
            elif parsed.get("overall_risk") == "medium" and aggregated["overall_risk"] != "high":
                aggregated["overall_risk"] = "medium"
            elif parsed.get("overall_risk") == "low" and aggregated["overall_risk"] not in ("high","medium"):
                aggregated["overall_risk"] = "low"
        else:
            # Save raw for debugging
            if OUT_DIR:
                raw_path = OUT_DIR / f"fallback_raw_chunk_{idx}.txt"
                raw_path.write_text(raw or "NO_RAW", encoding="utf-8")
    # Basic actions
    if aggregated["findings"]:
        aggregated["actions"] = [
            "Insert cap at 3.5% (preferred) or 4.0% (fallback).",
            "Clarify CPI index variant and geography.",
            "State increases are non-compounded and limited to once per 12 months."
        ]
    return aggregated
