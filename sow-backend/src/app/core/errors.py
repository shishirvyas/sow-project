"""
Error codes and messages for user-facing errors.
Use format: USR-XXX for user errors, LLM-XXX for AI errors
"""

# User Authentication & Authorization Errors (USR-1XX)
ERROR_CODES = {
    # Authentication (USR-10X)
    "USR-101": {
        "code": "USR-101",
        "message": "Authentication required",
        "user_message": "Please log in to access this resource.",
        "http_status": 401
    },
    "USR-102": {
        "code": "USR-102",
        "message": "Invalid credentials",
        "user_message": "The email or password you entered is incorrect.",
        "http_status": 401
    },
    "USR-103": {
        "code": "USR-103",
        "message": "Session expired",
        "user_message": "Your session has expired. Please log in again.",
        "http_status": 401
    },
    
    # Authorization/Permissions (USR-11X)
    "USR-110": {
        "code": "USR-110",
        "message": "Permission denied",
        "user_message": "You don't have permission to access this resource.",
        "http_status": 403
    },
    "USR-111": {
        "code": "USR-111",
        "message": "Insufficient permissions for user management",
        "user_message": "You don't have permission to manage users. Contact your administrator.",
        "http_status": 403
    },
    "USR-112": {
        "code": "USR-112",
        "message": "Insufficient permissions for role management",
        "user_message": "You don't have permission to view or manage roles. Contact your administrator.",
        "http_status": 403
    },
    "USR-113": {
        "code": "USR-113",
        "message": "Insufficient permissions for audit logs",
        "user_message": "You don't have permission to view audit logs. Contact your administrator.",
        "http_status": 403
    },
    "USR-114": {
        "code": "USR-114",
        "message": "Insufficient permissions for prompt management",
        "user_message": "You don't have permission to manage prompts. Contact your administrator.",
        "http_status": 403
    },
    
    # Resource Not Found (USR-12X)
    "USR-120": {
        "code": "USR-120",
        "message": "Resource not found",
        "user_message": "The requested resource could not be found.",
        "http_status": 404
    },
    "USR-121": {
        "code": "USR-121",
        "message": "User not found",
        "user_message": "The specified user does not exist.",
        "http_status": 404
    },
    "USR-122": {
        "code": "USR-122",
        "message": "Role not found",
        "user_message": "The specified role does not exist.",
        "http_status": 404
    },
    
    # Validation Errors (USR-13X)
    "USR-130": {
        "code": "USR-130",
        "message": "Invalid input",
        "user_message": "The information you provided is invalid. Please check and try again.",
        "http_status": 400
    },
    "USR-131": {
        "code": "USR-131",
        "message": "Email already exists",
        "user_message": "An account with this email already exists.",
        "http_status": 400
    },
    "USR-132": {
        "code": "USR-132",
        "message": "Weak password",
        "user_message": "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
        "http_status": 400
    },
    
    # Operation Errors (USR-14X)
    "USR-140": {
        "code": "USR-140",
        "message": "Operation failed",
        "user_message": "The operation could not be completed. Please try again.",
        "http_status": 500
    },
    "USR-141": {
        "code": "USR-141",
        "message": "Cannot delete system role",
        "user_message": "System roles cannot be deleted.",
        "http_status": 400
    },
    "USR-142": {
        "code": "USR-142",
        "message": "Cannot modify system role",
        "user_message": "System roles cannot be modified.",
        "http_status": 400
    },
    
    # LLM/AI Errors (LLM-XXX)
    "LLM-101": {
        "code": "LLM-101",
        "message": "AI service unavailable",
        "user_message": "The AI service is temporarily unavailable. Please try again later.",
        "http_status": 503
    },
    "LLM-102": {
        "code": "LLM-102",
        "message": "AI processing failed",
        "user_message": "Failed to process your request with AI. Please try again.",
        "http_status": 500
    },
    "LLM-103": {
        "code": "LLM-103",
        "message": "Document processing failed",
        "user_message": "Failed to process the document. Please check the file format and try again.",
        "http_status": 400
    },
}


def get_error_response(error_code: str, detail: str = None):
    """
    Get formatted error response.
    
    Args:
        error_code: Error code (e.g., "USR-110")
        detail: Optional additional detail
        
    Returns:
        Dictionary with error information
    """
    error = ERROR_CODES.get(error_code, {
        "code": "USR-140",
        "message": "Unknown error",
        "user_message": "An unexpected error occurred. Please try again.",
        "http_status": 500
    })
    
    response = {
        "error_code": error["code"],
        "message": error["message"],
        "user_message": error["user_message"]
    }
    
    if detail:
        response["detail"] = detail
    
    return response
