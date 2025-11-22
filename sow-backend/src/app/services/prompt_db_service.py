"""
Database service for fetching and managing prompt templates
"""
import logging
import re
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class PromptDatabaseService:
    """Service for fetching prompts from PostgreSQL database"""
    
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),  # Convert to integer
            'database': os.getenv('DB_NAME', 'sow_prompts'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', ''),
            'sslmode': os.getenv('DB_SSLMODE', 'require')  # Required for Aiven and other cloud providers
        }
    
    def get_connection(self):
        """Create database connection"""
        try:
            # Prefer DATABASE_URL if available (connection string format)
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                logging.info(f"Connecting using DATABASE_URL")
                conn = psycopg2.connect(database_url)
            else:
                # Fallback to individual parameters
                conn_string = f"host={self.db_config['host']} " \
                             f"port={self.db_config['port']} " \
                             f"dbname={self.db_config['database']} " \
                             f"user={self.db_config['user']} " \
                             f"password={self.db_config['password']} " \
                             f"sslmode={self.db_config['sslmode']}"
                
                logging.info(f"Connecting to database at {self.db_config['host']}:{self.db_config['port']}")
                conn = psycopg2.connect(conn_string)
            
            logging.info("Database connection successful")
            return conn
        except Exception as e:
            logging.error(f"Database connection failed: {e}")
            raise
    
    def fetch_prompt_by_clause_id(self, clause_id: str) -> Optional[str]:
        """
        Fetch a prompt template by clause_id and substitute variables
        
        Args:
            clause_id: The clause identifier (e.g., 'ADM-E01')
        
        Returns:
            Fully populated prompt text with variables substituted
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch prompt template
            cursor.execute("""
                SELECT id, clause_id, name, prompt_text
                FROM prompt_templates
                WHERE clause_id = %s AND is_active = TRUE
            """, (clause_id,))
            
            prompt = cursor.fetchone()
            if not prompt:
                logging.warning(f"No active prompt found for clause_id: {clause_id}")
                return None
            
            # Fetch variables for this prompt
            cursor.execute("""
                SELECT variable_name, variable_value
                FROM prompt_variables
                WHERE prompt_id = %s
            """, (prompt['id'],))
            
            variables = {row['variable_name']: row['variable_value'] for row in cursor.fetchall()}
            
            cursor.close()
            conn.close()
            
            # Substitute variables in prompt text
            prompt_text = prompt['prompt_text']
            for var_name, var_value in variables.items():
                # Replace {{variable_name}} with actual value
                prompt_text = prompt_text.replace(f"{{{{{var_name}}}}}", var_value)
            
            logging.info(f"Loaded prompt '{prompt['name']}' with {len(variables)} variables")
            return prompt_text
            
        except Exception as e:
            logging.error(f"Error fetching prompt for {clause_id}: {e}")
            return None
    
    def fetch_all_active_prompts(self) -> Dict[str, str]:
        """
        Fetch all active prompts with variables substituted
        
        Returns:
            Dictionary mapping clause_id to fully populated prompt text
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Fetch all active prompts
            cursor.execute("""
                SELECT id, clause_id, name, prompt_text
                FROM prompt_templates
                WHERE is_active = TRUE
                ORDER BY clause_id
            """)
            
            prompts = cursor.fetchall()
            result = {}
            
            for prompt in prompts:
                # Fetch variables for this prompt
                cursor.execute("""
                    SELECT variable_name, variable_value
                    FROM prompt_variables
                    WHERE prompt_id = %s
                """, (prompt['id'],))
                
                variables = {row['variable_name']: row['variable_value'] for row in cursor.fetchall()}
                
                # Substitute variables
                prompt_text = prompt['prompt_text']
                for var_name, var_value in variables.items():
                    prompt_text = prompt_text.replace(f"{{{{{var_name}}}}}", var_value)
                
                result[prompt['clause_id']] = prompt_text
                logging.info(f"Loaded prompt '{prompt['name']}' ({prompt['clause_id']}) with {len(variables)} variables")
            
            cursor.close()
            conn.close()
            
            return result
            
        except Exception as e:
            logging.error(f"Error fetching prompts: {e}")
            return {}
    
    def update_variable(self, clause_id: str, variable_name: str, variable_value: str) -> bool:
        """
        Update a variable value for a specific prompt
        
        Args:
            clause_id: The clause identifier
            variable_name: Name of the variable to update
            variable_value: New value for the variable
        
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE prompt_variables
                SET variable_value = %s
                WHERE prompt_id = (SELECT id FROM prompt_templates WHERE clause_id = %s)
                  AND variable_name = %s
            """, (variable_value, clause_id, variable_name))
            
            conn.commit()
            rows_affected = cursor.rowcount
            
            cursor.close()
            conn.close()
            
            if rows_affected > 0:
                logging.info(f"Updated variable '{variable_name}' for {clause_id}")
                return True
            else:
                logging.warning(f"No variable '{variable_name}' found for {clause_id}")
                return False
                
        except Exception as e:
            logging.error(f"Error updating variable: {e}")
            return False
    
    def get_all_variables(self, clause_id: str) -> Dict[str, str]:
        """
        Get all variables and their current values for a clause
        
        Args:
            clause_id: The clause identifier
        
        Returns:
            Dictionary of variable names to values
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT pv.variable_name, pv.variable_value, pv.description
                FROM prompt_variables pv
                JOIN prompt_templates pt ON pv.prompt_id = pt.id
                WHERE pt.clause_id = %s
                ORDER BY pv.variable_name
            """, (clause_id,))
            
            variables = {row['variable_name']: row['variable_value'] for row in cursor.fetchall()}
            
            cursor.close()
            conn.close()
            
            return variables
            
        except Exception as e:
            logging.error(f"Error fetching variables for {clause_id}: {e}")
            return {}
