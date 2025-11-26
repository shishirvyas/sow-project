from fastapi import APIRouter, BackgroundTasks, Request, Response, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.app.core.config import settings
import subprocess
import sys
from pathlib import Path
import logging
import json
from typing import Optional

router = APIRouter()

class PromptVariable(BaseModel):
    variable_name: str
    variable_value: str

class PromptCreate(BaseModel):
    clause_id: str
    name: str
    prompt_text: str
    is_active: bool = True

class VariableCreate(BaseModel):
    variable_name: str
    variable_value: str
    description: str = None

class BulkVariablesCreate(BaseModel):
    variables: list[VariableCreate]

@router.get("/hello")
async def hello():
  return {"message": "Hello from FastAPI"}

@router.get("/config")
async def get_config():
    """
    Debug endpoint: returns the loaded configuration.
    Useful for verifying environment variables and settings are loaded correctly.
    """
    return {
        "ENV": settings.ENV,
        "PORT": settings.PORT,
        "OPENAI_MODEL": settings.OPENAI_MODEL,
        "CALL_LLM": settings.CALL_LLM,
        "MAX_CHARS_FOR_SINGLE_CALL": settings.MAX_CHARS_FOR_SINGLE_CALL,
        "FALLBACK_TO_CHUNK": settings.FALLBACK_TO_CHUNK,
        "OPENAI_API_KEY_SET": settings.OPENAI_API_KEY is not None,  # don't expose the key itself
        "ACS_CONNECTION_STRING_SET": settings.ACS_CONNECTION_STRING is not None,  # don't expose
    }
    

@router.post("/upload-sow")
async def upload_sow(file: UploadFile = File(...)):
    """
    Upload SOW document to Azure Blob Storage
    
    Accepts: PDF, DOCX, TXT files
    Returns: Blob metadata including blob_name for processing
    """
    try:
        # Validate file type
        allowed_extensions = {".pdf", ".docx", ".txt"}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Upload to Azure Blob Storage
        from src.app.services.azure_blob_service import AzureBlobService
        blob_service = AzureBlobService()
        
        result = blob_service.upload_sow(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream"
        )
        
        logging.info(f"Uploaded SOW: {result['blob_name']}")
        
        return {
            "message": "SOW uploaded successfully",
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading SOW: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-sow/{blob_name:path}")
def process_sow_from_blob(blob_name: str):
    """
    Process a SOW document from Azure Blob Storage
    
    Args:
        blob_name: Name of the blob in Azure Storage (from upload response)
        
    Returns:
        Analysis results from all configured prompts with error information if any failures occurred
    """
    from datetime import datetime
    from src.app.services.sow_processor import SOWProcessor
    from src.app.services.azure_blob_service import AzureBlobService
    
    blob_service = AzureBlobService()
    start_time = datetime.now()
    
    try:
        processor = SOWProcessor()
        results = processor.process_sow_from_blob(blob_name)
        
        # Add timestamp and processing metadata
        results["processing_started_at"] = start_time.isoformat()
        results["processing_completed_at"] = datetime.now().isoformat()
        
        # Store ALL results in Azure Blob Storage (success, partial, or failed)
        try:
            storage_result = blob_service.store_analysis_result(blob_name, results)
            results["storage"] = storage_result
            logging.info(f"Analysis results stored: {storage_result['result_blob_name']}")
        except Exception as storage_error:
            logging.error(f"Failed to store analysis results in blob storage: {storage_error}")
            results["storage_warning"] = "Analysis completed but results could not be stored in blob storage"
        
        # Check if processing completely failed (old error format for compatibility)
        if "error" in results and results.get("status") != "failed":
            raise HTTPException(status_code=500, detail=results["error"])
        
        # If all prompts failed, return 500 with error details
        if results.get("status") == "failed":
            logging.error(f"All prompts failed for {blob_name}: {results.get('errors')}")
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Analysis failed for all prompts",
                    "blob_name": results.get("blob_name"),
                    "errors": results.get("errors", []),
                    "storage": results.get("storage")  # Include storage info even on failure
                }
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing SOW: {e}", exc_info=True)
        
        # Store error result in blob storage for history
        error_result = {
            "blob_name": blob_name,
            "status": "error",
            "processing_started_at": start_time.isoformat(),
            "processing_completed_at": datetime.now().isoformat(),
            "error": str(e),
            "error_type": type(e).__name__,
            "prompts_processed": 0,
            "results": {}
        }
        
        try:
            storage_result = blob_service.store_analysis_result(blob_name, error_result)
            logging.info(f"Error result stored: {storage_result['result_blob_name']}")
        except Exception as storage_error:
            logging.error(f"Failed to store error result in blob storage: {storage_error}")
        
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis-history")
def get_analysis_history(request: Request):
    """
    Get all analysis results from Azure Blob Storage
    
    Returns:
        List of all analysis results with metadata
    """
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        import json
        
        blob_service = AzureBlobService()
        results_container = "sow-analysis-results"
        
        # Get container client
        container_client = blob_service.blob_service_client.get_container_client(results_container)
        
        # Check if container exists
        if not container_client.exists():
            return {
                "history": [],
                "count": 0,
                "success_count": 0,
                "error_count": 0
            }
        
        # List all blobs in results container
        blobs = container_client.list_blobs()
        
        history = []
        success_count = 0
        error_count = 0
        
        for blob in blobs:
            try:
                # Download and parse each result
                blob_client = container_client.get_blob_client(blob.name)
                content = blob_client.download_blob().readall()
                result_data = json.loads(content.decode('utf-8'))
                
                # Extract key metadata
                status = result_data.get("status", "unknown")
                
                # Check if PDF exists and generate API URL
                pdf_exists = blob_service.pdf_exists(blob.name)
                api_base = str(request.base_url).rstrip('/')
                pdf_url = f"{api_base}/api/v1/analysis-history/{blob.name}/download-pdf" if pdf_exists else None
                
                history_item = {
                    "result_blob_name": blob.name,
                    "source_blob": result_data.get("blob_name", "unknown"),
                    "status": status,
                    "prompts_processed": result_data.get("prompts_processed", 0),
                    "processing_started_at": result_data.get("processing_started_at"),
                    "processing_completed_at": result_data.get("processing_completed_at"),
                    "has_errors": bool(result_data.get("errors")),
                    "error_count": len(result_data.get("errors", [])),
                    "created": blob.creation_time.isoformat() if blob.creation_time else None,
                    "size": blob.size,
                    "url": blob_client.url,
                    "pdf_available": pdf_exists,
                    "pdf_url": pdf_url
                }
                
                # Count success vs errors
                if status in ["success", "partial_success"]:
                    success_count += 1
                elif status in ["failed", "error"]:
                    error_count += 1
                
                history.append(history_item)
                
            except Exception as parse_error:
                logging.error(f"Error parsing blob {blob.name}: {parse_error}")
                # Add minimal info for unparseable blobs
                history.append({
                    "result_blob_name": blob.name,
                    "source_blob": "unknown",
                    "status": "parse_error",
                    "error": str(parse_error),
                    "created": blob.creation_time.isoformat() if blob.creation_time else None,
                    "size": blob.size
                })
        
        # Sort by creation time (newest first)
        history.sort(key=lambda x: x.get("created", ""), reverse=True)
        
        return {
            "history": history,
            "count": len(history),
            "success_count": success_count,
            "error_count": error_count
        }
        
    except Exception as e:
        logging.error(f"Error fetching analysis history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# PDF endpoints - MUST come before the detail route to match properly
@router.post("/analysis-history/{result_blob_name:path}/generate-pdf")
async def generate_analysis_pdf(result_blob_name: str, request: Request, background_tasks: BackgroundTasks):
    """
    Generate PDF for analysis result and upload to Azure Blob Storage
    
    Args:
        result_blob_name: Name of the result blob
        background_tasks: FastAPI background tasks
        
    Returns:
        Status and PDF URL when ready
    """
    logging.info(f"[PDF GENERATE] Starting PDF generation for: {result_blob_name}")
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        from src.app.services.pdf_generator import PDFGenerator
        import json
        
        blob_service = AzureBlobService()
        
        # Check if PDF already exists
        logging.info(f"[PDF GENERATE] Checking if PDF already exists for: {result_blob_name}")
        pdf_exists = blob_service.pdf_exists(result_blob_name)
        if pdf_exists:
            logging.info(f"[PDF GENERATE] PDF already exists, returning existing URL")
            api_base = str(request.base_url).rstrip('/')
            download_url = f"{api_base}/api/v1/analysis-history/{result_blob_name}/download-pdf"
            logging.info(f"[PDF GENERATE] Download URL: {download_url}")
            
            return {
                "status": "already_exists",
                "message": "PDF already generated",
                "pdf_url": download_url,
                "pdf_blob_name": result_blob_name.replace('.json', '.pdf')
            }
        
        # Get analysis result data
        results_container = "sow-analysis-results"
        blob_client = blob_service.blob_service_client.get_blob_client(
            container=results_container,
            blob=result_blob_name
        )
        
        if not blob_client.exists():
            logging.error(f"[PDF GENERATE] Analysis result not found: {result_blob_name}")
            raise HTTPException(status_code=404, detail="Analysis result not found")
        
        logging.info(f"[PDF GENERATE] Downloading analysis data from blob storage")
        content = blob_client.download_blob().readall()
        analysis_data = json.loads(content.decode('utf-8'))
        logging.info(f"[PDF GENERATE] Analysis data loaded, size: {len(content)} bytes")
        
        # Generate PDF
        logging.info(f"[PDF GENERATE] Starting PDF generation with PDFGenerator")
        pdf_generator = PDFGenerator()
        pdf_buffer = pdf_generator.generate_analysis_pdf(analysis_data)
        logging.info(f"[PDF GENERATE] PDF generated, buffer size: {pdf_buffer.getbuffer().nbytes} bytes")
        
        # Upload PDF to blob storage
        logging.info(f"[PDF GENERATE] Uploading PDF to Azure Blob Storage")
        pdf_info = blob_service.store_analysis_pdf(result_blob_name, pdf_buffer)
        logging.info(f"[PDF GENERATE] PDF uploaded successfully: {pdf_info['pdf_blob_name']}, size: {pdf_info['size']}")
        
        # Return our API endpoint instead of Azure blob URL
        api_base = str(request.base_url).rstrip('/')
        download_url = f"{api_base}/api/v1/analysis-history/{result_blob_name}/download-pdf"
        
        return {
            "status": "success",
            "message": "PDF generated successfully",
            "pdf_url": download_url,
            "pdf_blob_name": pdf_info['pdf_blob_name'],
            "size": pdf_info['size']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis-history/{result_blob_name:path}/pdf-url")
def get_analysis_pdf_url(result_blob_name: str, request: Request):
    """
    Check PDF availability and return API download endpoint
    
    Args:
        result_blob_name: Name of the result blob
        request: FastAPI request object
        
    Returns:
        PDF status and API download URL
    """
    logging.info(f"[PDF URL CHECK] Checking PDF availability for: {result_blob_name}")
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        
        blob_service = AzureBlobService()
        pdf_exists = blob_service.pdf_exists(result_blob_name)
        logging.info(f"[PDF URL CHECK] PDF exists: {pdf_exists}")
        logging.info(f"[PDF URL CHECK] PDF exists: {pdf_exists}")
        
        if pdf_exists:
            # Return our API endpoint instead of Azure blob URL
            api_base = str(request.base_url).rstrip('/')
            download_url = f"{api_base}/api/v1/analysis-history/{result_blob_name}/download-pdf"
            logging.info(f"[PDF URL CHECK] Returning available status with URL: {download_url}")
            
            return {
                "status": "available",
                "pdf_url": download_url,
                "pdf_blob_name": result_blob_name.replace('.json', '.pdf')
            }
        else:
            return {
                "status": "not_generated",
                "message": "PDF not yet generated. Use generate-pdf endpoint to create it."
            }
        
    except Exception as e:
        logging.error(f"Error getting PDF URL: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis-history/{result_blob_name:path}/download-pdf")
def download_analysis_pdf(result_blob_name: str):
    """
    Download PDF for analysis result
    
    Args:
        result_blob_name: Name of the result blob
        
    Returns:
        PDF file stream
    """
    logging.info(f"[PDF DOWNLOAD] Download request received for: {result_blob_name}")
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        from fastapi.responses import StreamingResponse
        import io
        
        blob_service = AzureBlobService()
        pdfs_container = "sow-analysis-pdfs"
        base_name = result_blob_name.replace('.json', '')
        pdf_blob_name = f"{base_name}.pdf"
        
        logging.info(f"[PDF DOWNLOAD] Looking for PDF: {pdf_blob_name} in container: {pdfs_container}")
        
        # Get PDF blob client
        blob_client = blob_service.blob_service_client.get_blob_client(
            container=pdfs_container,
            blob=pdf_blob_name
        )
        
        if not blob_client.exists():
            logging.error(f"[PDF DOWNLOAD] PDF not found in blob storage: {pdf_blob_name}")
            raise HTTPException(
                status_code=404, 
                detail="PDF not found. Generate it first using the generate-pdf endpoint."
            )
        
        # Download PDF
        logging.info(f"[PDF DOWNLOAD] Downloading PDF from Azure Blob Storage")
        pdf_data = blob_client.download_blob().readall()
        logging.info(f"[PDF DOWNLOAD] PDF downloaded, size: {len(pdf_data)} bytes")
        
        logging.info(f"[PDF DOWNLOAD] Creating StreamingResponse with Content-Disposition: attachment; filename={pdf_blob_name}")
        response = StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={pdf_blob_name}",
                "Content-Length": str(len(pdf_data))
            }
        )
        logging.info(f"[PDF DOWNLOAD] StreamingResponse created successfully")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error downloading PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Detail route - MUST come after PDF routes to avoid matching /pdf-url paths
@router.get("/analysis-history/{result_blob_name:path}")
def get_analysis_detail(result_blob_name: str):
    """
    Get detailed analysis result from Azure Blob Storage
    
    Args:
        result_blob_name: Name of the result blob
        
    Returns:
        Complete analysis result data
    """
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        import json
        
        blob_service = AzureBlobService()
        results_container = "sow-analysis-results"
        
        # Get blob client
        blob_client = blob_service.blob_service_client.get_blob_client(
            container=results_container,
            blob=result_blob_name
        )
        
        # Check if blob exists
        if not blob_client.exists():
            raise HTTPException(status_code=404, detail="Analysis result not found")
        
        # Download and parse result
        content = blob_client.download_blob().readall()
        result_data = json.loads(content.decode('utf-8'))
        
        # Get blob properties
        properties = blob_client.get_blob_properties()
        
        # Add metadata
        result_data["_metadata"] = {
            "result_blob_name": result_blob_name,
            "created": properties.creation_time.isoformat() if properties.creation_time else None,
            "last_modified": properties.last_modified.isoformat() if properties.last_modified else None,
            "size": properties.size,
            "url": blob_client.url
        }
        
        return result_data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching analysis detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sows")
def list_sows(limit: int = 100):
    """
    List all SOW documents in Azure Blob Storage
    
    Args:
        limit: Maximum number of results (default 100)
    """
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        
        blob_service = AzureBlobService()
        sows = blob_service.list_sows(limit=limit)
        
        return {
            "sows": sows,
            "count": len(sows)
        }
        
    except Exception as e:
        logging.error(f"Error listing SOWs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sows/{blob_name:path}")
def get_sow_metadata(blob_name: str):
    """
    Get metadata for a specific SOW document
    
    Args:
        blob_name: Name of the blob
    """
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        
        blob_service = AzureBlobService()
        metadata = blob_service.get_blob_metadata(blob_name)
        
        return metadata
        
    except Exception as e:
        logging.error(f"Error getting SOW metadata: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="SOW not found")

@router.delete("/sows/{blob_name:path}")
def delete_sow(blob_name: str):
    """
    Delete a SOW document from Azure Blob Storage
    
    Args:
        blob_name: Name of the blob to delete
    """
    try:
        from src.app.services.azure_blob_service import AzureBlobService
        
        blob_service = AzureBlobService()
        blob_service.delete_sow(blob_name)
        
        return {
            "message": "SOW deleted successfully",
            "blob_name": blob_name
        }
        
    except Exception as e:
        logging.error(f"Error deleting SOW: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-sows")
def process_sows():
    """
    DEPRECATED: Use /upload-sow and /process-sow/{blob_name} instead
    
    Legacy endpoint: Run process_sows_single_call.py and return the latest output JSON from the output folder.
    """
    logging.warning("Using deprecated /process-sows endpoint. Use /upload-sow and /process-sow instead.")
    
    # sow-backend/src/app/services/process_sows_single_call.py
    # __file__ = .../sow-backend/src/app/api/v1/endpoints.py
    # parents[4] -> sow-backend
    backend_root = Path(__file__).resolve().parents[4]
    script_path = backend_root / "src" / "app" / "services" / "process_sows_single_call.py"
    output_dir = backend_root / "resources" / "output"
    # Run the script synchronously and capture output
    python_exec = sys.executable or "python"
    result = subprocess.run(
        [python_exec, str(script_path)], 
        cwd=str(script_path.parent), 
        check=False,
        capture_output=True,
        text=True
    )
    
    # Log the subprocess output
    if result.stdout:
        logging.info(f"Script stdout:\n{result.stdout}")
    if result.stderr:
        logging.error(f"Script stderr:\n{result.stderr}")
    
    # Find the latest .json file in output_dir
    json_files = sorted(output_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not json_files:
        return Response(content="{}", media_type="application/json")
    latest_json = json_files[0]
    content = latest_json.read_text(encoding="utf-8")
    return Response(content=content, media_type="application/json")


# --- Simple Notifications API (file-backed) ---------------------------------
# This provides a minimal server-side storage for notifications so the frontend
# can persist and sync notification read/unread state. It uses a JSON file
# under the backend's `resources/` folder. This is intentionally lightweight
# for development. Replace with DB persistence if required.

NOTIFICATIONS_FILE = Path(__file__).resolve().parents[4] / "resources" / "notifications.json"

def _read_notifications_file():
    try:
        if not NOTIFICATIONS_FILE.exists():
            return []
        raw = NOTIFICATIONS_FILE.read_text(encoding="utf-8")
        data = json.loads(raw or "[]")
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        logging.error(f"Error reading notifications file: {e}")
        return []

def _write_notifications_file(items):
    try:
        NOTIFICATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        NOTIFICATIONS_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        return True
    except Exception as e:
        logging.error(f"Error writing notifications file: {e}")
        return False


@router.get("/notifications")
def get_notifications():
    """Return all notifications."""
    try:
        items = _read_notifications_file()
        return {"notifications": items, "count": len(items)}
    except Exception as e:
        logging.error(f"Error returning notifications: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})


class NotificationCreate(BaseModel):
    title: str
    body: Optional[str] = None


@router.post("/notifications")
def create_notification(payload: NotificationCreate):
    """Create a new notification (dev-only helper)."""
    try:
        items = _read_notifications_file()
        max_id = max((it.get("id", 0) for it in items), default=0)
        new = {
            "id": max_id + 1,
            "title": payload.title,
            "body": payload.body or "",
            "time": "now",
            "read": False,
        }
        items.insert(0, new)
        _write_notifications_file(items)
        return {"notification": new}
    except Exception as e:
        logging.error(f"Error creating notification: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.put("/notifications/{nid}/read")
def mark_notification_read(nid: int):
    """Mark a notification as read."""
    try:
        items = _read_notifications_file()
        updated = False
        for it in items:
            if int(it.get("id", -1)) == int(nid):
                it["read"] = True
                updated = True
                break
        if updated:
            _write_notifications_file(items)
            return {"message": "marked"}
        return JSONResponse(status_code=404, content={"error": "not found"})
    except Exception as e:
        logging.error(f"Error marking notification read: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.put("/notifications/mark_all_read")
def mark_all_read():
    try:
        items = _read_notifications_file()
        for it in items:
            it["read"] = True
        _write_notifications_file(items)
        return {"message": "all marked"}
    except Exception as e:
        logging.error(f"Error marking all notifications: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/prompts")
def list_prompts():
    """
    List all available prompts from database
    """
    import logging
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        prompts = db_service.fetch_all_active_prompts()
        logging.info(f"Fetched {len(prompts)} prompts from database: {list(prompts.keys())}")
        return {"prompts": list(prompts.keys()), "count": len(prompts)}
    except Exception as e:
        logging.error(f"Error fetching prompts: {type(e).__name__}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__, "message": "Failed to fetch prompts from database"}
        )

@router.get("/prompts/{clause_id}")
def get_prompt(clause_id: str):
    """
    Get a specific prompt by clause_id with all variables populated
    """
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        prompt = db_service.fetch_prompt_by_clause_id(clause_id)
        if prompt:
            return {"clause_id": clause_id, "prompt": prompt}
        else:
            return JSONResponse(
                status_code=404,
                content={"error": f"Prompt not found for clause_id: {clause_id}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to fetch prompt"}
        )

@router.get("/prompts/{clause_id}/variables")
def get_prompt_variables(clause_id: str):
    """
    Get all variables and their values for a specific prompt
    """
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        variables = db_service.get_all_variables(clause_id)
        if variables:
            return {"clause_id": clause_id, "variables": variables}
        else:
            return JSONResponse(
                status_code=404,
                content={"error": f"No variables found for clause_id: {clause_id}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to fetch variables"}
        )

@router.put("/prompts/{clause_id}/variables")
def update_prompt_variable(clause_id: str, variable: PromptVariable):
    """
    Update a variable value for a specific prompt
    """
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        success = db_service.update_variable(
            clause_id, 
            variable.variable_name, 
            variable.variable_value
        )
        if success:
            return {
                "message": "Variable updated successfully",
                "clause_id": clause_id,
                "variable_name": variable.variable_name,
                "new_value": variable.variable_value
            }
        else:
            return JSONResponse(
                status_code=404,
                content={"error": f"Variable '{variable.variable_name}' not found for {clause_id}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to update variable"}
        )

@router.post("/prompts")
def create_prompt(prompt: PromptCreate):
    """
    Create a new prompt template in the database
    """
    import logging
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        
        # Insert the new prompt template
        conn = db_service.get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO prompt_templates (clause_id, name, prompt_text, is_active)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (prompt.clause_id, prompt.name, prompt.prompt_text, prompt.is_active))
            
            prompt_id = cur.fetchone()[0]
            conn.commit()
            
            logging.info(f"Created new prompt template: {prompt.clause_id}")
            
            return {
                "message": "Prompt created successfully",
                "clause_id": prompt.clause_id,
                "prompt_id": prompt_id,
                "name": prompt.name
            }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        logging.error(f"Error creating prompt: {type(e).__name__}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to create prompt"}
        )

@router.post("/prompts/{clause_id}/variables")
def add_prompt_variable(clause_id: str, variable: VariableCreate):
    """
    Add a new variable to an existing prompt
    """
    import logging
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        
        conn = db_service.get_connection()
        cur = conn.cursor()
        
        try:
            # Get prompt_id for the clause_id
            cur.execute("""
                SELECT id FROM prompt_templates WHERE clause_id = %s
            """, (clause_id,))
            
            result = cur.fetchone()
            if not result:
                return JSONResponse(
                    status_code=404,
                    content={"error": f"Prompt not found for clause_id: {clause_id}"}
                )
            
            prompt_id = result[0]
            
            # Insert the variable
            cur.execute("""
                INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (prompt_id, variable.variable_name, variable.variable_value, variable.description))
            
            variable_id = cur.fetchone()[0]
            conn.commit()
            
            logging.info(f"Added variable '{variable.variable_name}' to prompt {clause_id}")
            
            return {
                "message": "Variable added successfully",
                "clause_id": clause_id,
                "variable_id": variable_id,
                "variable_name": variable.variable_name,
                "variable_value": variable.variable_value
            }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        logging.error(f"Error adding variable: {type(e).__name__}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to add variable"}
        )

@router.post("/prompts/{clause_id}/variables/bulk")
def add_prompt_variables_bulk(clause_id: str, bulk_variables: BulkVariablesCreate):
    """
    Add multiple variables to an existing prompt in one request
    """
    import logging
    try:
        from src.app.services.prompt_db_service import PromptDatabaseService
        db_service = PromptDatabaseService()
        
        conn = db_service.get_connection()
        cur = conn.cursor()
        
        try:
            # Get prompt_id for the clause_id
            cur.execute("""
                SELECT id FROM prompt_templates WHERE clause_id = %s
            """, (clause_id,))
            
            result = cur.fetchone()
            if not result:
                return JSONResponse(
                    status_code=404,
                    content={"error": f"Prompt not found for clause_id: {clause_id}"}
                )
            
            prompt_id = result[0]
            
            # Insert all variables
            added_variables = []
            for variable in bulk_variables.variables:
                cur.execute("""
                    INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (prompt_id, variable.variable_name, variable.variable_value, variable.description))
                
                variable_id = cur.fetchone()[0]
                added_variables.append({
                    "variable_id": variable_id,
                    "variable_name": variable.variable_name
                })
            
            conn.commit()
            
            logging.info(f"Added {len(added_variables)} variables to prompt {clause_id}")
            
            return {
                "message": f"Added {len(added_variables)} variables successfully",
                "clause_id": clause_id,
                "variables_added": added_variables,
                "count": len(added_variables)
            }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        logging.error(f"Error adding bulk variables: {type(e).__name__}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Failed to add variables"}
        )