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