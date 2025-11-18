#!/usr/bin/env python3
"""
process_sows_single_call.py

Reads whole SOW docs from resources/sow-docs/, loads system prompt(s) from resources/clause-lib/,
and for each SOW + prompt performs a single LLM call that asks the model to analyze the entire SOW
for escalation / CPI / annual adjustment language and return a JSON matching the specified schema.

Output JSON files are written to resources/output/.
"""

import os
import re
import json
import time
import logging
from pathlib import Path
from dotenv import load_dotenv

# Text extraction
from docx import Document
from pypdf import PdfReader

# LLM client (OpenAI)
from openai import OpenAI

# ---------- Config ----------
load_dotenv()


# LLM provider selection
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()  # openai|groq|ollama
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
CALL_LLM = os.getenv("CALL_LLM", "true").lower() != "false"

# ROOT points to sow-backend directory (parent of src)
ROOT = Path(__file__).resolve().parents[3]  # process_sows_single_call.py -> services -> app -> src -> sow-backend
RESOURCES = ROOT / "resources"
SOW_DIR = RESOURCES / "sow-docs"
PROMPT_DIR = RESOURCES / "clause-lib"
OUT_DIR = RESOURCES / "output"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Safety / size thresholds
MAX_CHARS_FOR_SINGLE_CALL = int(os.getenv("MAX_CHARS_FOR_SINGLE_CALL", "60000"))  # 60k chars
# If a doc exceeds this, the script will either (A) proceed anyway (risking token limits) or (B) fallback to chunking if FALLBACK_TO_CHUNK=true
FALLBACK_TO_CHUNK = os.getenv("FALLBACK_TO_CHUNK", "true").lower() == "true"

# Logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# Trigger terms (for optional pre-scan highlighting; not required by single-call approach)
TRIGGER_TERMS = [
    "rate increase", "annual increase", "annual adjustment", "escalat", "CPI", "CPI-U",
    "consumer price index", "COLA", "inflation", "indexation", "rate schedule", "annual"
]
TRIGGER_RE = re.compile("|".join(re.escape(t) for t in TRIGGER_TERMS), re.IGNORECASE)

# ---------- Text extraction helpers ----------

def extract_text_from_docx(path: Path) -> str:
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        logging.error(f"Failed to extract text from DOCX {path}: {e}")
        return ""

def extract_text_from_pdf(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
        parts = []
        for p in reader.pages:
            try:
                t = p.extract_text() or ""
            except Exception as page_err:
                logging.warning(f"Failed to extract text from page in {path}: {page_err}")
                t = ""
            if t:
                parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        logging.error(f"Failed to extract text from PDF {path}: {e}")
        return ""

def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return extract_text_from_docx(path)
    elif suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    else:
        logging.warning(f"Unsupported file type: {path.suffix} for file {path}")
        return ""

# ---------- Prompts ----------

def load_prompts(prompt_dir: Path):
    prompts = {}
    if not prompt_dir.exists():
        logging.warning(f"Prompt directory {prompt_dir} does not exist.")
        return prompts
    for p in sorted(prompt_dir.glob("*.txt")):
        prompts[p.stem] = p.read_text(encoding="utf-8")
    return prompts

# ---------- LLM call ----------


import httpx

def call_llm_single(system_prompt: str, user_prompt: str, model: str = None):
    """
    Call the selected LLM provider (OpenAI, Groq, Ollama) and return parsed JSON if possible.
    """
    if not CALL_LLM:
        logging.info("CALL_LLM=false -> returning mock response (user prompt preview).")
        return {"parsed": None, "raw": user_prompt[:4000], "mock": True}

    provider = LLM_PROVIDER
    model = model or (OPENAI_MODEL if provider == "openai" else GROQ_MODEL if provider == "groq" else OLLAMA_MODEL)

    try:
        if provider == "openai":
            if not OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY is not set in environment.")
            client = OpenAI(api_key=OPENAI_API_KEY)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            logging.info("Calling OpenAI LLM...")
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.0,
                max_tokens=3000
            )
            text = resp.choices[0].message.content.strip()
        elif provider == "groq":
            if not GROQ_API_KEY:
                raise RuntimeError("GROQ_API_KEY is not set in environment.")
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.0,
                "max_tokens": 3000
            }
            logging.info(f"Calling Groq LLM...\nPayload: {json.dumps(payload, indent=2)}")
            with httpx.Client(timeout=60) as client:
                r = client.post(url, headers=headers, json=payload)
                if r.status_code != 200:
                    logging.error(f"Groq API error {r.status_code}: {r.text}")
                r.raise_for_status()
                resp = r.json()
            text = resp["choices"][0]["message"]["content"].strip()
        elif provider == "ollama":
            url = f"{OLLAMA_BASE_URL}/api/chat"
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            }
            logging.info("Calling Ollama LLM...")
            with httpx.Client(timeout=60) as client:
                r = client.post(url, json=payload)
                r.raise_for_status()
                resp = r.json()
            # Ollama returns {'message': {'content': ...}}
            text = resp.get("message", {}).get("content", "").strip()
        else:
            raise RuntimeError(f"Unsupported LLM_PROVIDER: {provider}")

        try:
            parsed = json.loads(text)
            return {"parsed": parsed, "raw": text}
        except Exception as json_err:
            logging.warning(f"Failed to parse LLM response as JSON: {json_err}")
            return {"parsed": None, "raw": text}
    except Exception as e:
        logging.error(f"LLM call failed: {type(e).__name__}: {e}")
        return {"parsed": None, "raw": str(e), "error": True}

# ---------- User prompt builder ----------

def make_user_prompt_full(sow_text: str, decision_rules: str = "") -> str:
    """
    Build a user prompt that asks the model to analyze the entire SOW.
    Includes the decision rules and instructs to return a single JSON object matching the schema.
    """
    intro = (
        "Task:\n"
        "You are provided the full text of a Statement of Work (SOW). Your role: "
        "Identify annual rate increase / CPI escalation / COLA / indexation / annual adjustment language.\n\n"
        "Decision Rules:\n"
        "- If an annual increase cap > 5% → Flag: non_compliant.\n"
        "- If the annual increase <= 5% but > 4% → Flag: tighten.\n"
        "- If <= 4% → compliant.\n"
        "- If no explicit cap or CPI with no ceiling → missing_cap.\n"
        "- If frequency ≠ annual but functions as an annual escalator → treat as escalation and recommend annualized cap.\n\n"
        "Normalize trigger terms such as 'CPI', 'CPI-U', 'inflation', 'COLA', 'indexation'. Prioritize sections: Pricing, Rate Schedule, Escalation Clause.\n\n"
        "Output:\nReturn EXACTLY one JSON object following the schema described in the system prompt (detected, findings array, overall_risk, actions).\n\n"
    )
    if decision_rules:
        intro += "Additional rules:\n" + decision_rules + "\n\n"

    # Append the entire SOW text (bounded/trimmed if needed)
    body = f"SOW_TEXT_BEGIN\n\n{sow_text}\n\nSOW_TEXT_END\n\n"
    prompt = intro + body + "Now produce the JSON output.\n"
    return prompt

# ---------- Fallback chunking (simple) ----------
def fallback_chunk_and_call(system_prompt: str, sow_text: str):
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
        user = make_user_prompt_full(chunk)
        resp = call_llm_single(system_prompt, user)
        parsed = resp.get("parsed")
        raw = resp.get("raw")
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

# ---------- Main flow ----------

def process_all_single_call():
    prompts = load_prompts(PROMPT_DIR)
    if not prompts:
        logging.error(f"No prompts found in {PROMPT_DIR}. Place prompt text files (*.txt) there.")
        return

    sow_files = sorted([p for p in SOW_DIR.iterdir() if p.suffix.lower() in (".docx", ".pdf", ".txt")])
    if not sow_files:
        logging.error(f"No SOW files found in {SOW_DIR}. Place files there.")
        return

    for sow in sow_files:
        logging.info(f"Processing SOW: {sow.name}")
        sow_text = extract_text(sow)
        if not sow_text.strip():
            logging.warning(f"No text extracted from {sow}; skipping.")
            continue

        # Optional pre-scan: count trigger term hits
        pre_hits = len(TRIGGER_RE.findall(sow_text))
        logging.info(f"Pre-scan trigger hits: {pre_hits}")

        for prompt_name, system_prompt in prompts.items():
            logging.info(f"Using prompt: {prompt_name}")
            # Decide whether to call single or fallback
            if len(sow_text) > MAX_CHARS_FOR_SINGLE_CALL:
                logging.warning(f"SOW length {len(sow_text)} exceeds threshold {MAX_CHARS_FOR_SINGLE_CALL}.")
                if FALLBACK_TO_CHUNK:
                    logging.info("Falling back to chunked processing.")
                    analysis = fallback_chunk_and_call(system_prompt, sow_text)
                else:
                    logging.info("Proceeding with a single (large) LLM call despite size.")
                    user = make_user_prompt_full(sow_text)
                    resp = call_llm_single(system_prompt, user)
                    analysis = resp.get("parsed") or {"detected": False, "findings": [], "overall_risk": "none", "actions": [], "meta": {"raw": resp.get("raw")}}
            else:
                # Single-call path
                user = make_user_prompt_full(sow_text)
                resp = call_llm_single(system_prompt, user)
                parsed = resp.get("parsed")
                raw = resp.get("raw")
                if parsed and isinstance(parsed, dict):
                    analysis = parsed
                    # add meta
                    analysis.setdefault("meta", {})
                    analysis["meta"].update({"source_file": str(sow), "prompt_name": prompt_name, "trigger_hits": pre_hits})
                else:
                    # fallback: save raw and create a minimal structured output
                    raw_out = OUT_DIR / f"{sow.stem}__{prompt_name}__raw.txt"
                    raw_out.write_text(raw or "NO_RAW", encoding="utf-8")
                    analysis = {
                        "detected": False,
                        "findings": [],
                        "overall_risk": "none",
                        "actions": [],
                        "meta": {
                            "source_file": str(sow),
                            "prompt_name": prompt_name,
                            "note": "LLM did not return JSON; raw saved.",
                            "raw_path": str(raw_out),
                            "trigger_hits": pre_hits
                        }
                    }

            # --- Duplicate detection logic ---
            findings = analysis.get("findings", [])
            unique = []
            seen = set()
            for f in findings:
                # Use original_text and compliance_status as duplicate key
                key = (f.get("original_text", "").strip(), f.get("compliance_status", ""))
                if key not in seen:
                    unique.append(f)
                    seen.add(key)
            if len(unique) < len(findings):
                logging.info(f"Filtered {len(findings) - len(unique)} duplicate findings.")
            analysis["findings"] = unique

            # write output JSON
            out_file = OUT_DIR / f"{sow.stem}__{prompt_name}.json"
            out_file.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
            logging.info(f"Wrote {out_file}")

            # small sleep to avoid bursts
            time.sleep(0.5)

if __name__ == "__main__":
    process_all_single_call()
