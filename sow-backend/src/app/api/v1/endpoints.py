from fastapi import APIRouter, BackgroundTasks, Request, Response, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.app.core.config import settings
from src.app.api.v1.auth import get_current_user
from src.app.services.auth_service import get_user_permissions
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
async def upload_sow(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user)
):
    """
    Upload SOW document to Azure Blob Storage
    
    Requires: document.upload permission
    Accepts: PDF, DOCX, TXT files
    Returns: Blob metadata including blob_name for processing
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'document.upload' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: document.upload required")
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
        from src.app.services.file_management_service import FileManagementService
        
        blob_service = AzureBlobService()
        
        result = blob_service.upload_sow(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Create document record in database with user ownership
        file_service = FileManagementService()
        document_id = file_service.create_document_record(
            blob_name=result['blob_name'],
            original_filename=result['original_filename'],
            file_size_bytes=result['size'],
            content_type=result['content_type'],
            uploaded_by=user_id,
            blob_url=result.get('url'),
            metadata={
                'upload_method': 'web_ui',
                'original_content_type': file.content_type
            }
        )
        
        logging.info(f"Uploaded SOW: {result['blob_name']} by user {user_id}, document_id={document_id}")
        
        return {
            "message": "SOW uploaded successfully",
            "document_id": document_id,
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading SOW: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-sow/{blob_name:path}")
def process_sow_from_blob(
    blob_name: str,
    user_id: int = Depends(get_current_user)
):
    """
    Process a SOW document from Azure Blob Storage
    
    Requires: analysis.create permission + document access permission
    
    Args:
        blob_name: Name of the blob in Azure Storage (from upload response)
        
    Returns:
        Analysis results from all configured prompts with error information if any failures occurred
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.create' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.create required")
    
    from datetime import datetime
    from src.app.services.sow_processor import SOWProcessor
    from src.app.services.azure_blob_service import AzureBlobService
    from src.app.services.file_management_service import FileManagementService
    
    blob_service = AzureBlobService()
    file_service = FileManagementService()
    start_time = datetime.now()
    
    # Check if user has access to this document
    if not file_service.user_can_access_document(user_id, blob_name):
        raise HTTPException(
            status_code=403, 
            detail="Permission denied: You can only analyze files you uploaded or have file.view_all permission"
        )
    
    # Update document status to processing
    file_service.update_analysis_status(blob_name, 'processing')
    
    try:
        processor = SOWProcessor()
        results = processor.process_sow_from_blob(blob_name)
        
        # Add timestamp and processing metadata
        end_time = datetime.now()
        results["processing_started_at"] = start_time.isoformat()
        results["processing_completed_at"] = end_time.isoformat()
        analysis_duration_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Store ALL results in Azure Blob Storage (success, partial, or failed)
        try:
            storage_result = blob_service.store_analysis_result(blob_name, results)
            results["storage"] = storage_result
            logging.info(f"Analysis results stored: {storage_result['result_blob_name']}")
            
            # Update document status and create analysis result record
            doc = file_service.get_document_by_blob_name(blob_name)
            if doc:
                file_service.update_analysis_status(blob_name, 'completed', end_time)
                file_service.create_analysis_result(
                    document_id=doc['id'],
                    result_blob_name=storage_result['result_blob_name'],
                    analyzed_by=user_id,
                    analysis_duration_ms=analysis_duration_ms,
                    status='completed' if results.get('status') != 'partial' else 'partial'
                )
            
        except Exception as storage_error:
            logging.error(f"Failed to store analysis results in blob storage: {storage_error}")
            results["storage_warning"] = "Analysis completed but results could not be stored in blob storage"
            file_service.update_analysis_status(blob_name, 'failed')
        
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
async def get_analysis_history(
    request: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Get analysis results from database with user permission filtering
    
    Requires: analysis.view permission
    
    Returns only files uploaded by the user, unless user has file.view_all permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.view' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.view required")
    
    try:
        from src.app.services.file_management_service import FileManagementService
        from src.app.db.client import get_db_connection_dict
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        file_service = FileManagementService()
        
        # Check if user has file.view_all permission
        has_view_all = 'file.view_all' in permissions
        
        logging.info(f"User {user_id} fetching analysis history (has_view_all={has_view_all})")
        
        # Query database for analysis history with document metadata
        conn = get_db_connection_dict()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query based on permissions
        if has_view_all:
            # Manager/Admin: Get all documents with analysis results
            query = """
                SELECT 
                    ud.id as document_id,
                    ud.blob_name as source_blob,
                    ud.original_filename,
                    ud.file_size_bytes,
                    ud.upload_date,
                    ud.uploaded_by,
                    ud.analysis_status,
                    ud.last_analyzed_at,
                    u.full_name as uploaded_by_name,
                    u.email as uploaded_by_email,
                    ar.id as analysis_id,
                    ar.result_blob_name,
                    ar.analyzed_by,
                    ar.analysis_date,
                    ar.analysis_duration_ms,
                    ar.status as analysis_result_status,
                    ar.error_message,
                    ar.prompts_executed,
                    analyzer.full_name as analyzed_by_name
                FROM uploaded_documents ud
                LEFT JOIN analysis_results ar ON ud.id = ar.document_id
                LEFT JOIN users u ON ud.uploaded_by = u.id
                LEFT JOIN users analyzer ON ar.analyzed_by = analyzer.id
                WHERE ud.is_deleted = FALSE
                ORDER BY 
                    COALESCE(ar.analysis_date, ud.upload_date) DESC
                LIMIT 100
            """
            cursor.execute(query)
        else:
            # Analyst/Viewer: Get only own documents
            query = """
                SELECT 
                    ud.id as document_id,
                    ud.blob_name as source_blob,
                    ud.original_filename,
                    ud.file_size_bytes,
                    ud.upload_date,
                    ud.uploaded_by,
                    ud.analysis_status,
                    ud.last_analyzed_at,
                    u.full_name as uploaded_by_name,
                    u.email as uploaded_by_email,
                    ar.id as analysis_id,
                    ar.result_blob_name,
                    ar.analyzed_by,
                    ar.analysis_date,
                    ar.analysis_duration_ms,
                    ar.status as analysis_result_status,
                    ar.error_message,
                    ar.prompts_executed,
                    analyzer.full_name as analyzed_by_name
                FROM uploaded_documents ud
                LEFT JOIN analysis_results ar ON ud.id = ar.document_id
                LEFT JOIN users u ON ud.uploaded_by = u.id
                LEFT JOIN users analyzer ON ar.analyzed_by = analyzer.id
                WHERE ud.uploaded_by = %s AND ud.is_deleted = FALSE
                ORDER BY 
                    COALESCE(ar.analysis_date, ud.upload_date) DESC
                LIMIT 100
            """
            cursor.execute(query, (user_id,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Transform database results to history format
        history = []
        success_count = 0
        error_count = 0
        
        api_base = str(request.base_url).rstrip('/')
        
        for row in results:
            # Skip documents without analysis results if needed
            if row['result_blob_name'] is None:
                # Document uploaded but not yet analyzed
                history_item = {
                    "document_id": row['document_id'],
                    "source_blob": row['source_blob'],
                    "original_filename": row['original_filename'],
                    "file_size_bytes": row['file_size_bytes'],
                    "upload_date": row['upload_date'].isoformat() if row['upload_date'] else None,
                    "uploaded_by": row['uploaded_by'],
                    "uploaded_by_name": row['uploaded_by_name'],
                    "uploaded_by_email": row['uploaded_by_email'],
                    "status": row['analysis_status'] or 'pending',
                    "result_blob_name": None,
                    "analysis_date": None,
                    "analysis_duration_ms": None,
                    "prompts_processed": 0,
                    "has_errors": False,
                    "error_count": 0,
                    "error_message": None,
                    "analyzed_by_name": None,
                    "pdf_available": False,
                    "pdf_url": None
                }
                history.append(history_item)
                continue
            
            # Document with analysis results
            status = row['analysis_result_status'] or row['analysis_status'] or 'unknown'
            has_errors = bool(row['error_message'])
            prompts_count = len(row['prompts_executed']) if row['prompts_executed'] else 0
            
            history_item = {
                "document_id": row['document_id'],
                "source_blob": row['source_blob'],
                "original_filename": row['original_filename'],
                "file_size_bytes": row['file_size_bytes'],
                "upload_date": row['upload_date'].isoformat() if row['upload_date'] else None,
                "uploaded_by": row['uploaded_by'],
                "uploaded_by_name": row['uploaded_by_name'],
                "uploaded_by_email": row['uploaded_by_email'],
                "result_blob_name": row['result_blob_name'],
                "status": status,
                "analysis_date": row['analysis_date'].isoformat() if row['analysis_date'] else None,
                "processing_completed_at": row['analysis_date'].isoformat() if row['analysis_date'] else None,
                "analysis_duration_ms": row['analysis_duration_ms'],
                "prompts_processed": prompts_count,
                "has_errors": has_errors,
                "error_count": 1 if has_errors else 0,
                "error_message": row['error_message'],
                "analyzed_by": row['analyzed_by'],
                "analyzed_by_name": row['analyzed_by_name'],
                "pdf_available": False,  # Will be lazy loaded or checked per request
                "pdf_url": f"{api_base}/api/v1/analysis-history/{row['result_blob_name']}/download-pdf" if row['result_blob_name'] else None
            }
            
            # Count success vs errors
            if status in ["completed", "success", "partial_success"]:
                success_count += 1
            elif status in ["failed", "error"]:
                error_count += 1
            
            history.append(history_item)
        
        logging.info(f"Returning {len(history)} analysis history items for user {user_id}")
        
        return {
            "history": history,
            "count": len(history),
            "success_count": success_count,
            "error_count": error_count,
            "view_mode": "all" if has_view_all else "own",
            "user_id": user_id
        }
        
    except Exception as e:
        logging.error(f"Error fetching analysis history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# PDF endpoints - MUST come before the detail route to match properly
@router.post("/analysis-history/{result_blob_name:path}/generate-pdf")
async def generate_analysis_pdf(
    result_blob_name: str,
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user)
):
    """
    Generate PDF for analysis result and upload to Azure Blob Storage
    
    Requires: analysis.export permission
    
    Args:
        result_blob_name: Name of the result blob
        background_tasks: FastAPI background tasks
        
    Returns:
        Status and PDF URL when ready
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.export' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.export required")
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
def get_analysis_pdf_url(
    result_blob_name: str,
    request: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Check PDF availability and return API download endpoint
    
    Requires: analysis.view permission
    
    Args:
        result_blob_name: Name of the result blob
        request: FastAPI request object
        
    Returns:
        PDF status and API download URL
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.view' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.view required")
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
def download_analysis_pdf(
    result_blob_name: str,
    user_id: int = Depends(get_current_user)
):
    """
    Download PDF for analysis result
    
    Requires: analysis.view permission
    
    Args:
        result_blob_name: Name of the result blob
        
    Returns:
        PDF file stream
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.view' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.view required")
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
def get_analysis_detail(
    result_blob_name: str,
    user_id: int = Depends(get_current_user)
):
    """
    Get detailed analysis result from Azure Blob Storage
    
    Requires: analysis.view permission
    
    Args:
        result_blob_name: Name of the result blob
        
    Returns:
        Complete analysis result data
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'analysis.view' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: analysis.view required")
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
async def delete_sow(
    blob_name: str,
    user_id: int = Depends(get_current_user)
):
    """
    Delete a SOW document from Azure Blob Storage
    
    Requires: document.delete permission
    
    Args:
        blob_name: Name of the blob to delete
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'document.delete' not in permissions:
        raise HTTPException(status_code=403, detail="Permission denied: document.delete required")
    
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

# ==================== PROMPTS MANAGEMENT ENDPOINTS ====================

class PromptCreateRequest(BaseModel):
    clause_id: str
    name: str
    prompt_text: str
    is_active: bool = True

class PromptUpdateRequest(BaseModel):
    clause_id: str
    name: str
    prompt_text: str
    is_active: bool

class VariableRequest(BaseModel):
    variable_name: str
    variable_value: str
    description: Optional[str] = None

@router.get("/prompts")
async def get_prompts(
    request: Request,
    current_user: int = Depends(get_current_user)
):
    """Get all prompts (requires prompt.view permission)"""
    try:
        # Check permission
        user_permissions = get_user_permissions(current_user)
        if 'prompt.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import get_all_prompts
        prompts = get_all_prompts()
        
        logging.info(f"📋 User {current_user} fetched {len(prompts)} prompts")
        logging.info(f"🔍 Prompts data type: {type(prompts)}")
        if prompts:
            logging.info(f"🔍 First prompt type: {type(prompts[0])}")
            logging.info(f"🔍 First prompt: {prompts[0]}")
            logging.info(f"🔍 First prompt keys: {list(prompts[0].keys()) if hasattr(prompts[0], 'keys') else 'No keys method'}")
        
        # Ensure proper JSON serialization - convert RealDictRow to plain dict
        prompts_list = []
        for p in prompts:
            # Convert to dict first to ensure we can access all fields
            p_dict = dict(p) if hasattr(p, 'keys') else p
            prompts_list.append({
                "id": p_dict['id'],
                "clause_id": p_dict['clause_id'],
                "name": p_dict['name'],
                "prompt_text": p_dict['prompt_text'],
                "is_active": p_dict['is_active'],
                "created_at": str(p_dict['created_at']) if p_dict.get('created_at') else None,
                "updated_at": str(p_dict['updated_at']) if p_dict.get('updated_at') else None,
                "variable_count": int(p_dict.get('variable_count', 0))
            })
        
        logging.info(f"🔍 Serialized first prompt: {prompts_list[0] if prompts_list else 'None'}")
        
        return JSONResponse(content={"prompts": prompts_list, "count": len(prompts_list)})
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching prompts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prompts/{prompt_id}")
async def get_prompt(
    prompt_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a single prompt by ID with variables (requires prompt.view permission)"""
    try:
        # Check permission
        user_permissions = get_user_permissions(current_user)
        if 'prompt.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import get_prompt_by_id
        prompt = get_prompt_by_id(prompt_id)
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        return prompt
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching prompt {prompt_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompts")
async def create_prompt(
    prompt_data: PromptCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new prompt (requires prompt.create permission)"""
    try:
        # Check permission
        user_permissions = get_user_permissions(current_user)
        if 'prompt.create' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import create_prompt
        prompt = create_prompt(
            clause_id=prompt_data.clause_id,
            name=prompt_data.name,
            prompt_text=prompt_data.prompt_text,
            is_active=prompt_data.is_active
        )
        
        logging.info(f"✅ User {current_user} created prompt '{prompt_data.clause_id}'")
        return {"message": "Prompt created successfully", "prompt": prompt}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating prompt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/prompts/{prompt_id}")
async def update_prompt(
    prompt_id: int,
    prompt_data: PromptUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing prompt (requires prompt.edit permission)"""
    try:
        # Check permission
        user_permissions = get_user_permissions(current_user)
        if 'prompt.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import update_prompt
        prompt = update_prompt(
            prompt_id=prompt_id,
            clause_id=prompt_data.clause_id,
            name=prompt_data.name,
            prompt_text=prompt_data.prompt_text,
            is_active=prompt_data.is_active
        )
        
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        logging.info(f"✏️ User {current_user} updated prompt ID {prompt_id}")
        return {"message": "Prompt updated successfully", "prompt": prompt}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating prompt {prompt_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a prompt (requires prompt.delete permission)"""
    try:
        # Check permission
        user_permissions = get_user_permissions(current_user)
        if 'prompt.delete' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import delete_prompt
        success = delete_prompt(prompt_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        logging.info(f"🗑️ User {current_user} deleted prompt ID {prompt_id}")
        return {"message": "Prompt deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting prompt {prompt_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prompts/{prompt_id}/variables")
async def get_prompt_variables(
    prompt_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all variables for a prompt (requires prompt.view permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'prompt.view' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import get_prompt_variables
        variables = get_prompt_variables(prompt_id)
        
        return {"variables": variables}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching variables: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/prompts/{prompt_id}/variables")
async def add_prompt_variable(
    prompt_id: int,
    variable_data: VariableRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Add/update a variable for a prompt (requires prompt.edit permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'prompt.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import add_variable
        variable = add_variable(
            prompt_id=prompt_id,
            variable_name=variable_data.variable_name,
            variable_value=variable_data.variable_value,
            description=variable_data.description
        )
        
        logging.info(f"✅ User {current_user} added variable '{variable_data.variable_name}' to prompt {prompt_id}")
        return {"message": "Variable added successfully", "variable": variable}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding variable: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/prompts/{prompt_id}/variables/{variable_id}")
async def delete_prompt_variable(
    prompt_id: int,
    variable_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a variable (requires prompt.edit permission)"""
    try:
        user_permissions = get_user_permissions(current_user)
        if 'prompt.edit' not in user_permissions:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        from src.app.services.prompt_service import delete_variable
        success = delete_variable(variable_id)
        
        logging.info(f"🗑️ User {current_user} deleted variable {variable_id}")
        return {"message": "Variable deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting variable: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# File Management Endpoints
# ============================================================================

@router.get("/my-documents")
async def get_my_documents(
    user_id: int = Depends(get_current_user)
):
    """
    Get all documents accessible by the current user
    
    Requires: document.view permission
    
    Returns:
        - Own uploaded files if user doesn't have file.view_all
        - All files if user has file.view_all permission
    """
    try:
        # Check permission
        permissions = get_user_permissions(user_id)
        if 'document.view' not in permissions:
            raise HTTPException(status_code=403, detail="Permission denied: document.view required")
        
        from src.app.services.file_management_service import FileManagementService
        
        file_service = FileManagementService()
        documents = file_service.get_user_documents(user_id, include_deleted=False, limit=100)
        
        has_view_all = 'file.view_all' in permissions
        
        return {
            "documents": documents,
            "count": len(documents),
            "view_mode": "all" if has_view_all else "own"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching user documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{blob_name:path}/info")
async def get_document_info(
    blob_name: str,
    user_id: int = Depends(get_current_user)
):
    """
    Get document metadata and check user access
    
    Requires: document.view permission + access to the specific document
    """
    try:
        # Check permission
        permissions = get_user_permissions(user_id)
        if 'document.view' not in permissions:
            raise HTTPException(status_code=403, detail="Permission denied: document.view required")
        
        from src.app.services.file_management_service import FileManagementService
        
        file_service = FileManagementService()
        
        # Check if user can access this document
        if not file_service.user_can_access_document(user_id, blob_name):
            raise HTTPException(
                status_code=403,
                detail="Permission denied: You can only view files you uploaded or have file.view_all permission"
            )
        
        # Get document info
        document = file_service.get_document_by_blob_name(blob_name)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "document": document,
            "can_access": True,
            "is_owner": document['uploaded_by'] == user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching document info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/stats")
async def get_document_stats(
    user_id: int = Depends(get_current_user)
):
    """
    Get document statistics for the user
    
    Requires: document.view permission
    """
    try:
        # Check permission
        permissions = get_user_permissions(user_id)
        if 'document.view' not in permissions:
            raise HTTPException(status_code=403, detail="Permission denied: document.view required")
        
        from src.app.services.file_management_service import FileManagementService
        
        file_service = FileManagementService()
        documents = file_service.get_user_documents(user_id, include_deleted=False, limit=1000)
        
        # Calculate stats
        total_count = len(documents)
        total_size = sum(doc['file_size_bytes'] for doc in documents)
        
        status_counts = {}
        for doc in documents:
            status = doc.get('analysis_status', 'pending')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        has_view_all = 'file.view_all' in permissions
        
        return {
            "total_documents": total_count,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "status_breakdown": status_counts,
            "view_mode": "all" if has_view_all else "own",
            "pending_analysis": status_counts.get('pending', 0),
            "completed_analysis": status_counts.get('completed', 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching document stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

