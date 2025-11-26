"""
Error codes for SOW analysis system
"""

class ErrorCode:
    """Standardized error codes for the application"""
    
    # LLM-related errors (LL prefix)
    LL01 = "LL01"  # LLM configuration error (missing API key, invalid credentials)
    LL02 = "LL02"  # LLM timeout error
    LL03 = "LL03"  # LLM rate limit exceeded
    LL04 = "LL04"  # LLM invalid response format
    LL05 = "LL05"  # LLM service unavailable
    
    # Azure Blob Storage errors (AZ prefix)
    AZ01 = "AZ01"  # Azure authentication failure
    AZ02 = "AZ02"  # Blob not found
    AZ03 = "AZ03"  # Container not found
    AZ04 = "AZ04"  # Upload failure
    AZ05 = "AZ05"  # Download failure
    
    # Document processing errors (DOC prefix)
    DOC01 = "DOC01"  # Unsupported file format
    DOC02 = "DOC02"  # Text extraction failed
    DOC03 = "DOC03"  # Empty document
    DOC04 = "DOC04"  # Corrupted document
    
    # Database errors (DB prefix)
    DB01 = "DB01"  # Database connection failure
    DB02 = "DB02"  # Query execution failure
    DB03 = "DB03"  # No prompts found
    
    # General errors (GEN prefix)
    GEN01 = "GEN01"  # Unknown error
    GEN02 = "GEN02"  # Configuration error
    GEN03 = "GEN03"  # Validation error


# Error messages mapping
ERROR_MESSAGES = {
    ErrorCode.LL01: "Unable to reach LLM due to configuration issue",
    ErrorCode.LL02: "LLM request timeout",
    ErrorCode.LL03: "LLM rate limit exceeded, please try again later",
    ErrorCode.LL04: "LLM returned invalid response format",
    ErrorCode.LL05: "LLM service is currently unavailable",
    
    ErrorCode.AZ01: "Azure Storage authentication failed",
    ErrorCode.AZ02: "Document not found in storage",
    ErrorCode.AZ03: "Storage container not found",
    ErrorCode.AZ04: "Failed to upload document to storage",
    ErrorCode.AZ05: "Failed to download document from storage",
    
    ErrorCode.DOC01: "Unsupported document format",
    ErrorCode.DOC02: "Failed to extract text from document",
    ErrorCode.DOC03: "Document is empty or contains no text",
    ErrorCode.DOC04: "Document appears to be corrupted",
    
    ErrorCode.DB01: "Database connection failed",
    ErrorCode.DB02: "Failed to execute database query",
    ErrorCode.DB03: "No analysis prompts configured",
    
    ErrorCode.GEN01: "An unknown error occurred",
    ErrorCode.GEN02: "System configuration error",
    ErrorCode.GEN03: "Input validation failed",
}


def create_error(error_code: str, detail: str = None, context: dict = None) -> dict:
    """
    Create a standardized error object
    
    Args:
        error_code: Error code from ErrorCode class
        detail: Optional additional detail about the error
        context: Optional context information (e.g., prompt_name, blob_name)
        
    Returns:
        Standardized error dictionary
    """
    error = {
        "error_code": error_code,
        "message": ERROR_MESSAGES.get(error_code, ERROR_MESSAGES[ErrorCode.GEN01]),
    }
    
    if detail:
        error["detail"] = detail
    
    if context:
        error["context"] = context
    
    return error


def is_timeout_error(exception: Exception) -> bool:
    """Check if exception is a timeout error"""
    error_str = str(exception).lower()
    return any(word in error_str for word in ['timeout', 'timed out', 'deadline'])


def is_config_error(exception: Exception) -> bool:
    """Check if exception is a configuration error"""
    error_str = str(exception).lower()
    return any(word in error_str for word in [
        'api_key', 'api key', 'authentication', 'credentials',
        'authorization', 'not set', 'must be set'
    ])


def is_rate_limit_error(exception: Exception) -> bool:
    """Check if exception is a rate limit error"""
    error_str = str(exception).lower()
    return any(word in error_str for word in ['rate limit', 'quota', 'too many requests'])
