"""
File Management Service
Handles document metadata tracking and user ownership
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from src.app.db.client import get_db_connection_dict
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class FileManagementService:
    """Service for managing uploaded document metadata and permissions"""
    
    @staticmethod
    def create_document_record(
        blob_name: str,
        original_filename: str,
        file_size_bytes: int,
        content_type: str,
        uploaded_by: int,
        blob_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """
        Create a new document record in uploaded_documents table
        
        Args:
            blob_name: Azure blob storage identifier
            original_filename: Original filename from upload
            file_size_bytes: File size in bytes
            content_type: MIME type
            uploaded_by: User ID who uploaded the file
            blob_url: Optional full Azure blob URL
            metadata: Optional custom metadata as dict
            
        Returns:
            Document ID if successful, None otherwise
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Extract file extension
            file_extension = original_filename.rsplit('.', 1)[-1] if '.' in original_filename else ''
            
            query = """
                INSERT INTO uploaded_documents (
                    blob_name, original_filename, file_size_bytes, content_type,
                    uploaded_by, blob_url, file_extension, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            cursor.execute(query, (
                blob_name, original_filename, file_size_bytes, content_type,
                uploaded_by, blob_url, file_extension, 
                psycopg2.extras.Json(metadata) if metadata else None
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            document_id = result['id'] if result else None
            
            cursor.close()
            conn.close()
            
            if document_id:
                logger.info(f"Created document record ID {document_id} for {blob_name} by user {uploaded_by}")
            
            return document_id
            
        except Exception as e:
            logger.error(f"Error creating document record: {e}", exc_info=True)
            return None
    
    @staticmethod
    def get_user_documents(
        user_id: int,
        include_deleted: bool = False,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get documents accessible by user (own files or all if has permission)
        
        Args:
            user_id: User ID requesting documents
            include_deleted: Include soft-deleted files
            limit: Maximum number of documents to return
            
        Returns:
            List of document dictionaries
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Use database function that handles permission checking
            query = """
                SELECT * FROM get_user_documents(%s)
                LIMIT %s
            """
            
            cursor.execute(query, (user_id, limit))
            documents = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return [dict(doc) for doc in documents]
            
        except Exception as e:
            logger.error(f"Error getting user documents: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_document_by_blob_name(blob_name: str) -> Optional[Dict[str, Any]]:
        """
        Get document metadata by blob name
        
        Args:
            blob_name: Azure blob storage identifier
            
        Returns:
            Document dict or None
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                SELECT * FROM uploaded_documents
                WHERE blob_name = %s AND is_deleted = FALSE
            """
            
            cursor.execute(query, (blob_name,))
            document = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            return dict(document) if document else None
            
        except Exception as e:
            logger.error(f"Error getting document by blob name: {e}", exc_info=True)
            return None
    
    @staticmethod
    def user_can_access_document(user_id: int, blob_name: str) -> bool:
        """
        Check if user has permission to access a document
        
        Args:
            user_id: User ID checking access
            blob_name: Document blob name
            
        Returns:
            True if user can access, False otherwise
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor()
            
            # Get document ID from blob name
            cursor.execute(
                "SELECT id FROM uploaded_documents WHERE blob_name = %s AND is_deleted = FALSE",
                (blob_name,)
            )
            result = cursor.fetchone()
            
            if not result:
                cursor.close()
                conn.close()
                return False
            
            # RealDictCursor returns dict, access by column name
            document_id = result['id']
            
            # Use database function to check permission
            cursor.execute(
                "SELECT user_can_view_document(%s, %s) as can_access",
                (user_id, document_id)
            )
            
            can_access = cursor.fetchone()['can_access']
            
            cursor.close()
            conn.close()
            
            return can_access
            
        except Exception as e:
            logger.error(f"Error checking document access: {e}", exc_info=True)
            return False
    
    @staticmethod
    def update_analysis_status(
        blob_name: str,
        status: str,
        last_analyzed_at: Optional[datetime] = None
    ) -> bool:
        """
        Update document analysis status
        
        Args:
            blob_name: Document blob name
            status: New status (pending, processing, completed, failed)
            last_analyzed_at: Optional analysis timestamp
            
        Returns:
            True if successful
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor()
            
            if last_analyzed_at:
                query = """
                    UPDATE uploaded_documents
                    SET analysis_status = %s, last_analyzed_at = %s, updated_at = NOW()
                    WHERE blob_name = %s
                """
                cursor.execute(query, (status, last_analyzed_at, blob_name))
            else:
                query = """
                    UPDATE uploaded_documents
                    SET analysis_status = %s, updated_at = NOW()
                    WHERE blob_name = %s
                """
                cursor.execute(query, (status, blob_name))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Updated analysis status for {blob_name} to {status}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating analysis status: {e}", exc_info=True)
            return False
    
    @staticmethod
    def log_document_access(
        document_id: int,
        user_id: int,
        access_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Log document access for audit trail
        
        Args:
            document_id: Document ID
            user_id: User ID accessing document
            access_type: Type of access (view, download, analyze, delete)
            ip_address: Optional IP address
            user_agent: Optional user agent string
            
        Returns:
            True if successful
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO document_access_log (
                    document_id, user_id, access_type, ip_address, user_agent
                )
                VALUES (%s, %s, %s, %s, %s)
            """
            
            cursor.execute(query, (document_id, user_id, access_type, ip_address, user_agent))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error logging document access: {e}", exc_info=True)
            return False
    
    @staticmethod
    def soft_delete_document(blob_name: str, deleted_by: int) -> bool:
        """
        Soft delete a document (mark as deleted but keep in DB)
        
        Args:
            blob_name: Document blob name
            deleted_by: User ID performing deletion
            
        Returns:
            True if successful
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor()
            
            query = """
                UPDATE uploaded_documents
                SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = %s, updated_at = NOW()
                WHERE blob_name = %s
            """
            
            cursor.execute(query, (deleted_by, blob_name))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            logger.info(f"Soft deleted document {blob_name} by user {deleted_by}")
            return True
            
        except Exception as e:
            logger.error(f"Error soft deleting document: {e}", exc_info=True)
            return False
    
    @staticmethod
    def create_analysis_result(
        document_id: int,
        result_blob_name: str,
        analyzed_by: int,
        analysis_duration_ms: Optional[int] = None,
        status: str = 'completed',
        error_message: Optional[str] = None,
        prompts_executed: Optional[List[str]] = None
    ) -> Optional[int]:
        """
        Create analysis result record
        
        Args:
            document_id: Document ID that was analyzed
            result_blob_name: Blob name for analysis result JSON
            analyzed_by: User ID who ran analysis
            analysis_duration_ms: Analysis duration in milliseconds
            status: Analysis status (completed, failed, partial)
            error_message: Error message if failed
            prompts_executed: List of prompt IDs used
            
        Returns:
            Analysis result ID if successful
        """
        try:
            conn = get_db_connection_dict()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
                INSERT INTO analysis_results (
                    document_id, result_blob_name, analyzed_by, analysis_duration_ms,
                    status, error_message, prompts_executed
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            cursor.execute(query, (
                document_id, result_blob_name, analyzed_by, analysis_duration_ms,
                status, error_message,
                psycopg2.extras.Json(prompts_executed) if prompts_executed else None
            ))
            
            result = cursor.fetchone()
            conn.commit()
            
            analysis_id = result['id'] if result else None
            
            cursor.close()
            conn.close()
            
            if analysis_id:
                logger.info(f"Created analysis result ID {analysis_id} for document {document_id}")
            
            return analysis_id
            
        except Exception as e:
            logger.error(f"Error creating analysis result: {e}", exc_info=True)
            return None

