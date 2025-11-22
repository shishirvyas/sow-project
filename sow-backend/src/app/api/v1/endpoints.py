from fastapi import APIRouter, BackgroundTasks, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from src.app.core.config import settings
import subprocess
import sys
from pathlib import Path

router = APIRouter()

class PromptVariable(BaseModel):
    variable_name: str
    variable_value: str

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
    

@router.post("/process-sows")
def process_sows():
    """
    Run process_sows_single_call.py and return the latest output JSON from the output folder.
    """
    import logging
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