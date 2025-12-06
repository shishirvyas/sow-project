"""
Service for managing AI prompt templates (using existing prompt_templates table)
"""
import logging
from typing import Optional, List, Dict
from datetime import datetime
from src.app.db.client import execute_query

logger = logging.getLogger(__name__)

def get_all_prompts() -> List[Dict]:
    """Get all prompts with variable count"""
    query = """
        SELECT 
            pt.id,
            pt.clause_id,
            pt.name,
            pt.prompt_text,
            pt.is_active,
            pt.created_at,
            pt.updated_at,
            COUNT(pv.id) as variable_count
        FROM prompt_templates pt
        LEFT JOIN prompt_variables pv ON pt.id = pv.prompt_id
        GROUP BY pt.id, pt.clause_id, pt.name, pt.prompt_text, pt.is_active, pt.created_at, pt.updated_at
        ORDER BY pt.clause_id
    """
    result = execute_query(query)
    logger.info(f"🔥 SERVICE: Raw result type: {type(result)}")
    logger.info(f"🔥 SERVICE: Result length: {len(result) if result else 0}")
    if result:
        logger.info(f"🔥 SERVICE: First item type: {type(result[0])}")
        logger.info(f"🔥 SERVICE: First item: {result[0]}")
        logger.info(f"🔥 SERVICE: First item repr: {repr(result[0])}")
        if hasattr(result[0], 'keys'):
            logger.info(f"🔥 SERVICE: First item keys: {list(result[0].keys())}")
        try:
            logger.info(f"🔥 SERVICE: Dict conversion: {dict(result[0])}")
        except Exception as e:
            logger.error(f"🔥 SERVICE: Dict conversion error: {e}")
    return result

def get_prompt_by_id(prompt_id: int) -> Optional[Dict]:
    """Get a single prompt by ID with its variables"""
    query = """
        SELECT 
            pt.id,
            pt.clause_id,
            pt.name,
            pt.prompt_text,
            pt.is_active,
            pt.created_at,
            pt.updated_at,
            json_agg(
                json_build_object(
                    'id', pv.id,
                    'variable_name', pv.variable_name,
                    'variable_value', pv.variable_value,
                    'description', pv.description
                )
            ) FILTER (WHERE pv.id IS NOT NULL) as variables
        FROM prompt_templates pt
        LEFT JOIN prompt_variables pv ON pt.id = pv.prompt_id
        WHERE pt.id = %s
        GROUP BY pt.id, pt.clause_id, pt.name, pt.prompt_text, pt.is_active, pt.created_at, pt.updated_at
    """
    return execute_query(query, (prompt_id,), fetch_one=True)

def create_prompt(
    clause_id: str,
    name: str,
    prompt_text: str,
    is_active: bool
) -> Dict:
    """Create a new prompt"""
    query = """
        INSERT INTO prompt_templates (clause_id, name, prompt_text, is_active)
        VALUES (%s, %s, %s, %s)
        RETURNING id, clause_id, name, prompt_text, is_active, created_at
    """
    return execute_query(
        query,
        (clause_id, name, prompt_text, is_active),
        fetch_one=True
    )

def update_prompt(
    prompt_id: int,
    clause_id: str,
    name: str,
    prompt_text: str,
    is_active: bool
) -> Optional[Dict]:
    """Update an existing prompt"""
    try:
        logger.info(f"🔄 Updating prompt {prompt_id}")
        logger.info(f"📝 New values: clause_id={clause_id}, name={name}, is_active={is_active}, prompt_text_length={len(prompt_text)}")
        
        query = """
            UPDATE prompt_templates
            SET 
                clause_id = %s,
                name = %s,
                prompt_text = %s,
                is_active = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, clause_id, name, prompt_text, is_active, updated_at
        """
        
        result = execute_query(
            query,
            (clause_id, name, prompt_text, is_active, prompt_id),
            fetch_one=True
        )
        
        if result:
            logger.info(f"✅ Successfully updated prompt {prompt_id}")
            logger.info(f"✅ Result: {result}")
        else:
            logger.warning(f"⚠️ Update returned None for prompt {prompt_id} - prompt may not exist")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in update_prompt service: {e}", exc_info=True)
        raise

def delete_prompt(prompt_id: int) -> bool:
    """Delete a prompt (will cascade delete variables)"""
    try:
        logger.info(f"🗑️ Attempting to delete prompt {prompt_id}")
        
        # Use RETURNING to verify deletion happened
        query = "DELETE FROM prompt_templates WHERE id = %s RETURNING id"
        result = execute_query(query, (prompt_id,), fetch_one=True)
        
        if result:
            logger.info(f"✅ Successfully deleted prompt {prompt_id}")
            return True
        else:
            logger.warning(f"⚠️ Prompt {prompt_id} not found - nothing deleted")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error in delete_prompt service: {e}", exc_info=True)
        raise

def get_active_prompts() -> List[Dict]:
    """Get all active prompts"""
    query = """
        SELECT 
            id,
            clause_id,
            name,
            prompt_text,
            created_at
        FROM prompt_templates
        WHERE is_active = TRUE
        ORDER BY clause_id
    """
    return execute_query(query)

def get_prompt_variables(prompt_id: int) -> List[Dict]:
    """Get all variables for a prompt"""
    query = """
        SELECT 
            id,
            variable_name,
            variable_value,
            description,
            created_at
        FROM prompt_variables
        WHERE prompt_id = %s
        ORDER BY variable_name
    """
    return execute_query(query, (prompt_id,))

def add_variable(
    prompt_id: int,
    variable_name: str,
    variable_value: str,
    description: Optional[str] = None
) -> Dict:
    """Add a variable to a prompt"""
    query = """
        INSERT INTO prompt_variables (prompt_id, variable_name, variable_value, description)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (prompt_id, variable_name) 
        DO UPDATE SET variable_value = EXCLUDED.variable_value, description = EXCLUDED.description
        RETURNING id, variable_name, variable_value, description, created_at
    """
    return execute_query(
        query,
        (prompt_id, variable_name, variable_value, description),
        fetch_one=True
    )

def update_variable(
    variable_id: int,
    variable_value: str,
    description: Optional[str] = None
) -> Optional[Dict]:
    """Update a variable"""
    query = """
        UPDATE prompt_variables
        SET 
            variable_value = %s,
            description = %s
        WHERE id = %s
        RETURNING id, variable_name, variable_value, description
    """
    return execute_query(query, (variable_value, description, variable_id), fetch_one=True)

def delete_variable(variable_id: int) -> bool:
    """Delete a variable"""
    try:
        logger.info(f"🗑️ Attempting to delete variable {variable_id}")
        
        # Use RETURNING to verify deletion happened
        query = "DELETE FROM prompt_variables WHERE id = %s RETURNING id"
        result = execute_query(query, (variable_id,), fetch_one=True)
        
        if result:
            logger.info(f"✅ Successfully deleted variable {variable_id}")
            return True
        else:
            logger.warning(f"⚠️ Variable {variable_id} not found - nothing deleted")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error in delete_variable service: {e}", exc_info=True)
        raise
