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

# Configure logging for this script
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True  # Override any existing configuration
)

# Text extraction helpers
from text_extraction_helpers import extract_text, extract_text_from_docx, extract_text_from_pdf

# LLM client (OpenAI)
from openai import OpenAI

# ---------- Config ----------
load_dotenv()


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

# Import main flow
from main_flow import load_prompts

def call_llm_single(system_prompt: str, user_prompt: str):
    """
    Call the LLM with system and user prompts, return parsed JSON response.
    Includes retry logic with exponential backoff for rate limiting.
    """
    import httpx
    
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    max_retries = 3
    base_delay = 15  # Start with 15 seconds
    
    for attempt in range(max_retries):
        try:
            if provider == "openai":
                client = OpenAI()
                payload = {
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                logging.info(f"Calling OpenAI LLM with payload:\n{json.dumps(payload, indent=2)}")
                resp = client.chat.completions.create(**payload)
                text = resp.choices[0].message.content.strip()
            elif provider == "groq":
                if not GROQ_API_KEY:
                    raise RuntimeError("GROQ_API_KEY is not set in environment.")
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
                payload = {
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.0,
                    "max_tokens": 3000
                }
                logging.info(f"Calling Groq LLM with payload:\n{json.dumps(payload, indent=2)}")
                with httpx.Client(timeout=60) as client:
                    r = client.post(url, headers=headers, json=payload)
                    if r.status_code == 429:
                        retry_delay = base_delay * (2 ** attempt)
                        logging.warning(f"Rate limit hit (429). Retrying in {retry_delay} seconds... (attempt {attempt + 1}/{max_retries})")
                        if attempt < max_retries - 1:
                            time.sleep(retry_delay)
                            continue
                        else:
                            logging.error("Max retries reached. Rate limit persists.")
                            raise httpx.HTTPStatusError(f"Rate limit exceeded after {max_retries} attempts", request=r.request, response=r)
                    if r.status_code != 200:
                        logging.error(f"Groq API error {r.status_code}: {r.text}")
                    r.raise_for_status()
                    resp = r.json()
                text = resp["choices"][0]["message"]["content"].strip()
            elif provider == "ollama":
                url = f"{OLLAMA_BASE_URL}/api/chat"
                payload = {
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                }
                logging.info(f"Calling Ollama LLM with payload:\n{json.dumps(payload, indent=2)}")
                with httpx.Client(timeout=60) as client:
                    r = client.post(url, json=payload)
                    r.raise_for_status()
                    resp = r.json()
                text = resp.get("message", {}).get("content", "").strip()
            else:
                raise RuntimeError(f"Unsupported LLM_PROVIDER: {provider}")

            # Try to parse as JSON
            try:
                parsed = json.loads(text)
                return {"parsed": parsed, "raw": text}
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1).strip()
                    try:
                        parsed = json.loads(json_str)
                        logging.info("Successfully extracted JSON from markdown code block")
                        return {"parsed": parsed, "raw": text}
                    except json.JSONDecodeError:
                        pass
                
                # Try to find and parse the first JSON object in the text
                brace_idx = text.find('{')
                if brace_idx >= 0:
                    # Try to extract from the first { to the last }
                    last_brace = text.rfind('}')
                    if last_brace > brace_idx:
                        json_str = text[brace_idx:last_brace+1]
                        try:
                            parsed = json.loads(json_str)
                            logging.info("Successfully extracted JSON object from response")
                            return {"parsed": parsed, "raw": text}
                        except json.JSONDecodeError:
                            pass
                
                logging.warning(f"Failed to parse LLM response as JSON. Raw response (first 2000 chars):\n{text[:2000]}")
                logging.warning(f"Raw response (last 500 chars):\n{text[-500:]}")
                return {"parsed": None, "raw": text}
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < max_retries - 1:
                continue  # Already handled above for Groq
            raise
        except Exception as e:
            logging.error(f"LLM call failed: {type(e).__name__}: {e}")
            return {"parsed": None, "raw": str(e), "error": True}
    
    # Should not reach here, but just in case
    return {"parsed": None, "raw": "Max retries exceeded", "error": True}

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
# Import fallback chunking
from fallback_chunking import fallback_chunk_and_call

# Configuration for chunking
MAX_CHARS_FOR_SINGLE_CALL = 100000
FALLBACK_TO_CHUNK = True
TRIGGER_RE = re.compile(r'\b(CPI|CPI-U|inflation|COLA|indexation|escalation|annual\s+increase)\b', re.IGNORECASE)

# Ensure output directory exists
OUT_DIR.mkdir(parents=True, exist_ok=True)

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

if __name__ == "__main__":
    process_all_single_call()
