import logging
import json
import time
from pathlib import Path
from text_extraction_helpers import extract_text
from fallback_chunking import fallback_chunk_and_call

def process_all_single_call(PROMPT_DIR, SOW_DIR, OUT_DIR, MAX_CHARS_FOR_SINGLE_CALL, FALLBACK_TO_CHUNK, TRIGGER_RE, make_user_prompt_full, call_llm_single):
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
                    analysis = fallback_chunk_and_call(system_prompt, sow_text, call_llm_single=call_llm_single, OUT_DIR=OUT_DIR)
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

            # Add delay to handle rate-limiting
            time.sleep(10)  # Increased delay to 10 seconds to further reduce risk of hitting API rate limits

def load_prompts(prompt_dir: Path):
    prompts = {}
    if not prompt_dir.exists():
        logging.warning(f"Prompt directory {prompt_dir} does not exist.")
        return prompts
    for p in sorted(prompt_dir.glob("*.txt")):
        prompts[p.stem] = p.read_text(encoding="utf-8")
    return prompts
