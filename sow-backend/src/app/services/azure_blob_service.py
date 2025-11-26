"""
Azure Blob Storage service for SOW document management
"""
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient, ContentSettings
from dotenv import load_dotenv
import tempfile

load_dotenv()

class AzureBlobService:
    """Service for managing SOW documents in Azure Blob Storage"""
    
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "sow-uploads")
        
        if not self.connection_string:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING not found in environment variables")
        
        self.blob_service_client = BlobServiceClient.from_connection_string(
            self.connection_string
        )
        
        # Ensure container exists
        self._ensure_container_exists()
    
    def _ensure_container_exists(self):
        """Create container if it doesn't exist"""
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            if not container_client.exists():
                container_client.create_container()
                logging.info(f"Created container: {self.container_name}")
        except Exception as e:
            logging.error(f"Error ensuring container exists: {e}")
    
    def upload_sow(self, file_content: bytes, filename: str, 
                   content_type: str = "application/octet-stream") -> dict:
        """
        Upload SOW document to Azure Blob Storage
        
        Args:
            file_content: File bytes
            filename: Original filename
            content_type: MIME type
            
        Returns:
            dict with blob_name, url, size
        """
        try:
            # Generate unique blob name with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = Path(filename).suffix
            blob_name = f"{timestamp}_{filename}"
            
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            # Upload with metadata
            blob_client.upload_blob(
                file_content,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
                metadata={
                    "original_filename": filename,
                    "upload_timestamp": timestamp
                }
            )
            
            logging.info(f"Uploaded SOW: {blob_name} ({len(file_content)} bytes)")
            
            return {
                "blob_name": blob_name,
                "url": blob_client.url,
                "size": len(file_content),
                "content_type": content_type,
                "original_filename": filename
            }
            
        except Exception as e:
            logging.error(f"Error uploading SOW: {e}")
            raise
    
    def download_sow(self, blob_name: str) -> bytes:
        """
        Download SOW document from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob to download
            
        Returns:
            File content as bytes
        """
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            download_stream = blob_client.download_blob()
            content = download_stream.readall()
            
            logging.info(f"Downloaded SOW: {blob_name} ({len(content)} bytes)")
            return content
            
        except Exception as e:
            logging.error(f"Error downloading SOW {blob_name}: {e}")
            raise
    
    def download_sow_to_temp(self, blob_name: str) -> str:
        """
        Download SOW to temporary file for processing
        
        Args:
            blob_name: Name of the blob to download
            
        Returns:
            Path to temporary file
        """
        try:
            content = self.download_sow(blob_name)
            
            # Get file extension from blob name
            file_ext = Path(blob_name).suffix
            
            # Create temp file with same extension
            with tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=file_ext
            ) as temp_file:
                temp_file.write(content)
                temp_path = temp_file.name
            
            logging.info(f"Downloaded {blob_name} to {temp_path}")
            return temp_path
            
        except Exception as e:
            logging.error(f"Error downloading to temp: {e}")
            raise
    
    def list_sows(self, prefix: Optional[str] = None, limit: int = 100) -> List[dict]:
        """
        List SOW documents in storage
        
        Args:
            prefix: Optional prefix to filter blobs
            limit: Maximum number of results
            
        Returns:
            List of blob metadata
        """
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            
            blobs = container_client.list_blobs(
                name_starts_with=prefix
            )
            
            results = []
            for i, blob in enumerate(blobs):
                if i >= limit:
                    break
                    
                results.append({
                    "blob_name": blob.name,
                    "size": blob.size,
                    "created": blob.creation_time.isoformat() if blob.creation_time else None,
                    "last_modified": blob.last_modified.isoformat() if blob.last_modified else None,
                    "content_type": blob.content_settings.content_type if blob.content_settings else None,
                    "metadata": blob.metadata
                })
            
            return results
            
        except Exception as e:
            logging.error(f"Error listing SOWs: {e}")
            raise
    
    def delete_sow(self, blob_name: str) -> bool:
        """
        Delete SOW document from storage
        
        Args:
            blob_name: Name of the blob to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_client.delete_blob()
            logging.info(f"Deleted SOW: {blob_name}")
            return True
            
        except Exception as e:
            logging.error(f"Error deleting SOW {blob_name}: {e}")
            raise
    
    def get_blob_metadata(self, blob_name: str) -> dict:
        """
        Get metadata for a specific blob
        
        Args:
            blob_name: Name of the blob
            
        Returns:
            Blob properties and metadata
        """
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            properties = blob_client.get_blob_properties()
            
            return {
                "blob_name": blob_name,
                "size": properties.size,
                "created": properties.creation_time.isoformat() if properties.creation_time else None,
                "last_modified": properties.last_modified.isoformat() if properties.last_modified else None,
                "content_type": properties.content_settings.content_type,
                "metadata": properties.metadata
            }
            
        except Exception as e:
            logging.error(f"Error getting blob metadata for {blob_name}: {e}")
            raise
    
    def store_analysis_result(self, blob_name: str, analysis_result: dict) -> dict:
        """
        Store analysis results in Azure Blob Storage
        
        Args:
            blob_name: Original SOW blob name
            analysis_result: Analysis results dictionary to store
            
        Returns:
            dict with result_blob_name, url, size
        """
        try:
            results_container = "sow-analysis-results"
            
            # Ensure results container exists
            container_client = self.blob_service_client.get_container_client(results_container)
            if not container_client.exists():
                container_client.create_container()
                logging.info(f"Created container: {results_container}")
            
            # Generate result blob name based on original blob
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = Path(blob_name).stem
            result_blob_name = f"{base_name}__analysis__{timestamp}.json"
            
            # Convert result to JSON
            import json
            result_json = json.dumps(analysis_result, indent=2, ensure_ascii=False)
            result_bytes = result_json.encode('utf-8')
            
            # Upload to results container
            blob_client = self.blob_service_client.get_blob_client(
                container=results_container,
                blob=result_blob_name
            )
            
            blob_client.upload_blob(
                result_bytes,
                overwrite=True,
                content_settings=ContentSettings(content_type="application/json"),
                metadata={
                    "source_blob": blob_name,
                    "analysis_timestamp": timestamp,
                    "prompts_processed": str(analysis_result.get("prompts_processed", 0))
                }
            )
            
            logging.info(f"Stored analysis result: {result_blob_name} ({len(result_bytes)} bytes)")
            
            return {
                "result_blob_name": result_blob_name,
                "url": blob_client.url,
                "size": len(result_bytes),
                "container": results_container,
                "source_blob": blob_name
            }
            
        except Exception as e:
            logging.error(f"Error storing analysis result: {e}")
            raise
    
    def store_analysis_pdf(self, result_blob_name: str, pdf_buffer) -> dict:
        """
        Store analysis PDF in Azure Blob Storage
        
        Args:
            result_blob_name: Original result JSON blob name
            pdf_buffer: BytesIO buffer containing PDF data
            
        Returns:
            dict with pdf_blob_name, url, size
        """
        try:
            pdfs_container = "sow-analysis-pdfs"
            
            # Ensure PDFs container exists
            container_client = self.blob_service_client.get_container_client(pdfs_container)
            if not container_client.exists():
                container_client.create_container()
                logging.info(f"Created container: {pdfs_container}")
            
            # Generate PDF blob name based on result blob name
            base_name = result_blob_name.replace('.json', '')
            pdf_blob_name = f"{base_name}.pdf"
            
            # Get PDF bytes
            pdf_bytes = pdf_buffer.getvalue()
            
            # Upload to PDFs container
            blob_client = self.blob_service_client.get_blob_client(
                container=pdfs_container,
                blob=pdf_blob_name
            )
            
            blob_client.upload_blob(
                pdf_bytes,
                overwrite=True,
                content_settings=ContentSettings(
                    content_type="application/pdf",
                    content_disposition=f"attachment; filename={pdf_blob_name}"
                ),
                metadata={
                    "source_result_blob": result_blob_name,
                    "generated_timestamp": datetime.now().isoformat()
                }
            )
            
            logging.info(f"Stored analysis PDF: {pdf_blob_name} ({len(pdf_bytes)} bytes)")
            
            return {
                "pdf_blob_name": pdf_blob_name,
                "url": blob_client.url,
                "size": len(pdf_bytes),
                "container": pdfs_container,
                "source_result_blob": result_blob_name
            }
            
        except Exception as e:
            logging.error(f"Error storing analysis PDF: {e}")
            raise
    
    def get_analysis_pdf_url(self, result_blob_name: str) -> Optional[str]:
        """
        Get download URL for analysis PDF
        
        Args:
            result_blob_name: Result JSON blob name
            
        Returns:
            PDF download URL or None if not found
        """
        try:
            pdfs_container = "sow-analysis-pdfs"
            base_name = result_blob_name.replace('.json', '')
            pdf_blob_name = f"{base_name}.pdf"
            
            blob_client = self.blob_service_client.get_blob_client(
                container=pdfs_container,
                blob=pdf_blob_name
            )
            
            # Check if PDF exists
            if blob_client.exists():
                return blob_client.url
            
            return None
            
        except Exception as e:
            logging.error(f"Error getting PDF URL: {e}")
            return None
