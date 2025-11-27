"""
Database client for PostgreSQL connections
"""
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

def parse_database_url(db_url: str) -> dict:
    """Parse DATABASE_URL into connection parameters"""
    # Remove query parameters like ?sslmode=require
    db_url_clean = db_url.split('?')[0]
    
    pattern = r'postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
    match = re.match(pattern, db_url_clean)
    
    if match:
        user, password, host, port, dbname = match.groups()
        params = {
            'host': host,
            'port': int(port),
            'user': user,
            'password': password,
            'dbname': dbname
        }
        
        # Check for SSL mode in original URL
        if 'sslmode=require' in db_url:
            params['sslmode'] = 'require'
        
        return params
    
    raise ValueError(f"Invalid DATABASE_URL format: {db_url}")

def get_connection_params() -> dict:
    """Get database connection parameters from environment"""
    db_url = os.getenv('DATABASE_URL')
    
    if db_url:
        return parse_database_url(db_url)
    
    # Fallback to individual environment variables
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'dbname': os.getenv('DB_NAME', 'sow_analysis')
    }

def get_db_connection():
    """
    Get a PostgreSQL database connection
    
    Returns:
        psycopg2.connection: Database connection object
    """
    try:
        params = get_connection_params()
        conn = psycopg2.connect(**params)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def get_db_connection_dict():
    """
    Get a PostgreSQL database connection with dict cursor
    Returns rows as dictionaries instead of tuples
    
    Returns:
        psycopg2.connection: Database connection with RealDictCursor
    """
    try:
        params = get_connection_params()
        conn = psycopg2.connect(**params, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def execute_query(query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = True):
    """
    Execute a SELECT query and return results
    
    Args:
        query: SQL query string
        params: Query parameters (optional)
        fetch_one: Return single row (default: False)
        fetch_all: Return all rows (default: True)
    
    Returns:
        Query results as list of dicts or single dict
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection_dict()
        cursor = conn.cursor()
        
        cursor.execute(query, params)
        
        if fetch_one:
            result = cursor.fetchone()
            return dict(result) if result else None
        
        if fetch_all:
            results = cursor.fetchall()
            return [dict(row) for row in results]
        
        return None
        
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def execute_update(query: str, params: tuple = None, return_id: bool = False):
    """
    Execute an INSERT/UPDATE/DELETE query
    
    Args:
        query: SQL query string
        params: Query parameters (optional)
        return_id: Return inserted ID (for INSERT with RETURNING)
    
    Returns:
        Number of affected rows or inserted ID
    """
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(query, params)
        conn.commit()
        
        if return_id and cursor.description:
            result = cursor.fetchone()
            return result[0] if result else None
        
        return cursor.rowcount
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Update execution error: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()