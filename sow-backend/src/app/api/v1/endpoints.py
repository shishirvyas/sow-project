from fastapi import APIRouter, BackgroundTasks, Response, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.app.core.config import settings
import subprocess
import sys
from pathlib import Path
import logging

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
        Analysis results from all configured prompts
    """
    try:
        from src.app.services.sow_processor import SOWProcessor
        
        processor = SOWProcessor()
        results = processor.process_sow_from_blob(blob_name)
        
        if "error" in results:
            raise HTTPException(status_code=500, detail=results["error"])
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing SOW: {e}", exc_info=True)
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