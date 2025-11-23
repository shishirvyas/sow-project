import os
import logging
from pathlib import Path
from typing import Optional

try:
    from azure.storage.blob import BlobServiceClient, ContentSettings
except Exception:
    BlobServiceClient = None

# Try to import pydantic settings used by the app so we prefer values already loaded there.
try:
    from src.app.core.config import settings
except Exception:
    # If running as a script or imports fail, attempt to add repo root to sys.path and retry
    try:
        import sys
        ROOT = Path(__file__).resolve().parents[3]
        sys.path.insert(0, str(ROOT))
        from src.app.core.config import settings
    except Exception:
        settings = None

# allow explicit dotenv loading as a fallback
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


def upload_file_to_azure_blob(file_path: Path, container_name: Optional[str] = None) -> dict:
    """
    Upload a file to Azure Blob Storage and return a dict with blob URL and metadata.

    Requires either AZURE_STORAGE_CONNECTION_STRING in env or managed identity in the environment.
    """
    if BlobServiceClient is None:
        raise RuntimeError("azure-storage-blob is not installed. Add it to requirements.txt and install.")

    # Try to obtain the connection string from app settings first (pydantic)
    conn_str = None
    if 'settings' in globals() and settings is not None:
        try:
            conn_str = settings.AZURE_STORAGE_CONNECTION_STRING
            if conn_str:
                masked = str(conn_str)[:16] + "...[masked]"
                logging.info("AZURE_STORAGE_CONNECTION_STRING taken from settings (masked): %s", masked)
        except Exception:
            conn_str = None

    # Fallback: environment variable
    if not conn_str:
        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        if conn_str:
            masked = conn_str[:16] + "...[masked]"
            logging.info("AZURE_STORAGE_CONNECTION_STRING taken from environment (masked): %s", masked)

    # Final fallback: try loading .env from repo root if python-dotenv is available
    if not conn_str and load_dotenv is not None:
        # Look for .env in the sow-backend root
        repo_root = Path(__file__).resolve().parents[3]
        env_path = repo_root / ".env"
        logging.info("Attempting to load .env from %s", env_path)
        if env_path.exists():
            load_dotenv(dotenv_path=str(env_path))
            conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if conn_str:
                masked = conn_str[:16] + "...[masked]"
                logging.info("AZURE_STORAGE_CONNECTION_STRING loaded from .env (masked): %s", masked)

    if not conn_str:
        logging.warning("AZURE_STORAGE_CONNECTION_STRING is not set in environment.")
        raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set in environment.")

    container_name = container_name or os.getenv("AZURE_CONTAINER_NAME", "sow-output")
    logging.info("Using Azure container name: %s", container_name)

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    container_client = blob_service.get_container_client(container_name)

    # Create container if not exists (idempotent)
    try:
        container_client.create_container()
    except Exception:
        # container may already exist
        logging.debug("Container may already exist: %s", container_name)
        pass

    file_path = Path(file_path)
    blob_name = file_path.name

    content_type = "application/json"
    try:
        with file_path.open("rb") as f:
            blob_client = container_client.get_blob_client(blob_name)
            blob_client.upload_blob(f, overwrite=True, content_settings=ContentSettings(content_type=content_type))

        # Construct a URL to the blob
        account_url = blob_service.primary_endpoint
        # primary_endpoint looks like https://<account>.blob.core.windows.net
        blob_url = f"{account_url}/{container_name}/{blob_name}"

        logging.info("Uploaded %s to %s", file_path, blob_url)
        return {"blob_url": blob_url, "blob_name": blob_name}
    except Exception as e:
        logging.error(f"Failed to upload {file_path} to Azure Blob: {e}")
        raise
