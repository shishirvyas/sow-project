"""
SOW Processing service that works with Azure Blob Storage
"""
import logging
import json
import os
from pathlib import Path
from typing import Dict, Optional
from src.app.services.azure_blob_service import AzureBlobService
from src.app.services.text_extraction_helpers import extract_text
from src.app.services.main_flow import load_prompts_from_database, load_prompts
from src.app.services.process_sows_single_call import call_llm_single, make_user_prompt_full
from src.app.utils.error_codes import (
    ErrorCode, create_error, is_timeout_error, 
    is_config_error, is_rate_limit_error
)
import re

class SOWProcessor:
    """Process SOW documents from Azure Blob Storage"""
    
    def __init__(self):
        self.blob_service = AzureBlobService()
        self.output_dir = Path(__file__).resolve().parents[3] / "resources" / "output"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load environment settings
        self.max_chars = int(os.getenv("MAX_CHARS_FOR_SINGLE_CALL", "4000"))
        self.use_database = os.getenv("USE_PROMPT_DATABASE", "false").lower() == "true"
        
        # Trigger pattern for pre-scan
        self.trigger_re = re.compile(
            r"\b(CPI|escalation|annual\s+adjustment|rate\s+increase|defect|warranty|bug|"
            r"IP|ownership|foreground|deliverables|license)\b",
            re.IGNORECASE
        )
    
    def process_sow_from_blob(self, blob_name: str) -> Dict:
        """
        Process a SOW document from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob in Azure Storage
            
        Returns:
            Dictionary with analysis results for all prompts
        """
        try:
            logging.info(f"Processing SOW from blob: {blob_name}")
            
            # Download blob to temporary file
            temp_path = self.blob_service.download_sow_to_temp(blob_name)
            temp_file = Path(temp_path)
            
            try:
                # Extract text from document
                sow_text = extract_text(temp_file)
                
                if not sow_text.strip():
                    logging.warning(f"No text extracted from {blob_name}")
                    return {
                        "error": "No text could be extracted from the document",
                        "blob_name": blob_name
                    }
                
                # Load prompts
                if self.use_database:
                    logging.info("Loading prompts from database...")
                    prompts = load_prompts_from_database()
                else:
                    logging.info("Loading prompts from files...")
                    prompt_dir = Path(__file__).resolve().parents[3] / "resources" / "clause-lib"
                    prompts = load_prompts(prompt_dir)
                
                if not prompts:
                    logging.error("No prompts found")
                    return {
                        "error": "No prompts configured for analysis",
                        "blob_name": blob_name
                    }
                
                # Pre-scan for trigger terms
                pre_hits = len(self.trigger_re.findall(sow_text))
                logging.info(f"Pre-scan trigger hits: {pre_hits}")
                
                # Process with all prompts
                results = {}
                errors = []
                
                for prompt_name, system_prompt in prompts.items():
                    logging.info(f"Using prompt: {prompt_name}")
                    
                    try:
                        # Call LLM
                        user_prompt = make_user_prompt_full(sow_text)
                        response = call_llm_single(system_prompt, user_prompt)
                        
                        # Check if LLM call failed
                        if response.get("error"):
                            error_detail = response.get("error")
                            exception = response.get("exception")
                            
                            # Determine error code based on exception type
                            if exception:
                                if is_config_error(exception):
                                    error_code = ErrorCode.LL01
                                elif is_timeout_error(exception):
                                    error_code = ErrorCode.LL02
                                elif is_rate_limit_error(exception):
                                    error_code = ErrorCode.LL03
                                else:
                                    error_code = ErrorCode.LL05
                            else:
                                error_code = ErrorCode.LL05
                            
                            error = create_error(
                                error_code,
                                detail=error_detail,
                                context={"prompt_name": prompt_name, "blob_name": blob_name}
                            )
                            errors.append(error)
                            logging.error(f"LLM error for {prompt_name}: {error}")
                            continue
                        
                        # Parse response
                        parsed = response.get("parsed")
                        if parsed and isinstance(parsed, dict):
                            analysis = parsed
                            analysis.setdefault("meta", {})
                            analysis["meta"].update({
                                "source_blob": blob_name,
                                "prompt_name": prompt_name,
                                "trigger_hits": pre_hits
                            })
                        else:
                            # Fallback if parsing failed
                            raw = response.get("raw", "NO_RAW")
                            
                            # Create error for invalid response format
                            error = create_error(
                                ErrorCode.LL04,
                                detail="LLM did not return valid JSON",
                                context={"prompt_name": prompt_name, "blob_name": blob_name}
                            )
                            errors.append(error)
                            
                            analysis = {
                                "detected": False,
                                "findings": [],
                                "overall_risk": "none",
                                "actions": [],
                                "meta": {
                                    "source_blob": blob_name,
                                    "prompt_name": prompt_name,
                                    "note": "LLM did not return JSON",
                                    "trigger_hits": pre_hits
                                }
                            }
                            
                            # Save raw output
                            raw_file = self.output_dir / f"{Path(blob_name).stem}__{prompt_name}__raw.txt"
                            raw_file.write_text(raw, encoding="utf-8")
                    
                    except Exception as e:
                        # Catch any unexpected errors during prompt processing
                        logging.error(f"Unexpected error processing prompt {prompt_name}: {e}", exc_info=True)
                        error = create_error(
                            ErrorCode.GEN01,
                            detail=str(e),
                            context={"prompt_name": prompt_name, "blob_name": blob_name}
                        )
                        errors.append(error)
                        continue
                    
                    # Deduplicate findings
                    findings = analysis.get("findings", [])
                    unique_findings = []
                    seen = set()
                    for finding in findings:
                        key = (
                            finding.get("original_text", "").strip(),
                            finding.get("compliance_status", "")
                        )
                        if key not in seen:
                            unique_findings.append(finding)
                            seen.add(key)
                    
                    if len(unique_findings) < len(findings):
                        logging.info(f"Filtered {len(findings) - len(unique_findings)} duplicate findings")
                    
                    analysis["findings"] = unique_findings
                    
                    # Save individual result
                    output_file = self.output_dir / f"{Path(blob_name).stem}__{prompt_name}.json"
                    output_file.write_text(
                        json.dumps(analysis, indent=2, ensure_ascii=False),
                        encoding="utf-8"
                    )
                    
                    results[prompt_name] = analysis
                
                # Check if all prompts failed
                if not results and errors:
                    logging.error(f"All prompts failed for {blob_name}")
                    return {
                        "blob_name": blob_name,
                        "prompts_processed": 0,
                        "results": {},
                        "errors": errors,
                        "trigger_hits": pre_hits,
                        "status": "failed"
                    }
                
                logging.info(f"Completed processing {blob_name} with {len(results)} prompts")
                
                response = {
                    "blob_name": blob_name,
                    "prompts_processed": len(results),
                    "results": results,
                    "trigger_hits": pre_hits,
                    "status": "success" if not errors else "partial_success"
                }
                
                # Add errors if any occurred
                if errors:
                    response["errors"] = errors
                
                return response
                
            finally:
                # Clean up temp file
                if temp_file.exists():
                    temp_file.unlink()
                    
        except Exception as e:
            logging.error(f"Error processing SOW from blob {blob_name}: {e}", exc_info=True)
            return {
                "error": str(e),
                "blob_name": blob_name
            }
    
    def get_latest_result(self, blob_name: Optional[str] = None) -> Optional[Dict]:
        """
        Get the latest analysis result
        
        Args:
            blob_name: Optional blob name to filter results
            
        Returns:
            Latest analysis result or None
        """
        try:
            # Find JSON files
            if blob_name:
                pattern = f"{Path(blob_name).stem}__*.json"
            else:
                pattern = "*.json"
            
            json_files = sorted(
                self.output_dir.glob(pattern),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            if not json_files:
                return None
            
            latest_file = json_files[0]
            content = latest_file.read_text(encoding="utf-8")
            return json.loads(content)
            
        except Exception as e:
            logging.error(f"Error getting latest result: {e}")
            return None
