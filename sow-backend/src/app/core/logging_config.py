"""
Logging configuration for API endpoints.

Configure logging behavior per endpoint or globally.
"""

# Default logging configuration
LOGGING_CONFIG = {
    # Global settings
    "enabled": True,
    "log_level": "INFO",  # DEBUG, INFO, WARNING, ERROR
    
    # What to log
    "log_request_body": True,
    "log_response_body": True,
    "log_query_params": True,
    "log_headers": False,  # Set to True to log request headers
    "log_timing": True,
    
    # Response body settings
    "max_response_length": 500,  # Truncate responses longer than this
    "log_large_responses": False,  # Set to False to skip logging large responses
    
    # Request body settings
    "max_request_length": 500,  # Truncate request bodies longer than this
    "mask_sensitive_fields": True,
    "sensitive_field_patterns": [
        "password",
        "token",
        "secret",
        "api_key",
        "authorization",
        "passwd",
        "pwd"
    ],
    
    # Endpoint-specific overrides
    # Pattern matching: exact path, prefix (path*), or regex
    "endpoint_overrides": {
        # Health check - minimal logging
        "/health": {
            "log_level": "WARNING",
            "log_request_body": False,
            "log_response_body": False,
            "log_timing": False
        },
        
        # Auth endpoints - mask sensitive data but log everything
        "/api/v1/auth/*": {
            "log_level": "INFO",
            "log_request_body": True,
            "log_response_body": True,
            "mask_sensitive_fields": True
        },
        
        # Admin endpoints - detailed logging
        "/api/v1/admin/*": {
            "log_level": "DEBUG",
            "log_request_body": True,
            "log_response_body": True,
            "log_headers": False,
            "log_timing": True
        },
        
        # Analysis endpoints - may have large payloads
        "/api/v1/analyze-sow": {
            "log_level": "INFO",
            "log_request_body": True,
            "log_response_body": False,  # Skip large responses
            "max_request_length": 200  # Truncate long requests
        },
        
        # File upload - skip body logging
        "/api/v1/upload": {
            "log_level": "INFO",
            "log_request_body": False,
            "log_response_body": True
        },
        
        # Frequent polling endpoints - reduce noise
        "/api/v1/analysis-history": {
            "log_level": "WARNING",  # Only log warnings/errors
            "log_timing": True
        },
        
        # OPTIONS requests (CORS preflight) - skip entirely
        "OPTIONS:*": {
            "enabled": False
        }
    },
    
    # HTTP method overrides (applied before endpoint overrides)
    "method_overrides": {
        "OPTIONS": {
            "enabled": False  # Disable logging for all OPTIONS requests
        },
        "GET": {
            "log_request_body": False  # GET requests typically have no body
        }
    },
    
    # Status code based logging
    "status_overrides": {
        # Always log errors with full details
        "4xx": {
            "log_level": "WARNING",
            "log_request_body": True,
            "log_response_body": True
        },
        "5xx": {
            "log_level": "ERROR",
            "log_request_body": True,
            "log_response_body": True,
            "log_headers": True
        }
    },
    
    # Performance thresholds
    "slow_request_threshold_ms": 1000,  # Log warning if request takes longer
    "log_slow_requests": True
}


def get_endpoint_config(method: str, path: str, status_code: int = None) -> dict:
    """
    Get logging configuration for a specific endpoint.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path
        status_code: Response status code (optional)
    
    Returns:
        Dict with logging configuration for this endpoint
    """
    import fnmatch
    
    # Start with global defaults
    config = {k: v for k, v in LOGGING_CONFIG.items() 
              if k not in ["endpoint_overrides", "method_overrides", "status_overrides"]}
    
    # Apply method overrides
    if method in LOGGING_CONFIG["method_overrides"]:
        config.update(LOGGING_CONFIG["method_overrides"][method])
    
    # Apply endpoint overrides (check for exact match, prefix match, or pattern)
    for pattern, override in LOGGING_CONFIG["endpoint_overrides"].items():
        # Check for method-specific pattern (e.g., "OPTIONS:*")
        if ":" in pattern:
            pattern_method, pattern_path = pattern.split(":", 1)
            if pattern_method != method:
                continue
            pattern = pattern_path
        
        # Exact match
        if pattern == path:
            config.update(override)
            break
        
        # Wildcard match (e.g., "/api/v1/admin/*")
        if "*" in pattern and fnmatch.fnmatch(path, pattern):
            config.update(override)
            break
    
    # Apply status code overrides
    if status_code and LOGGING_CONFIG.get("status_overrides"):
        if 400 <= status_code < 500:
            config.update(LOGGING_CONFIG["status_overrides"].get("4xx", {}))
        elif status_code >= 500:
            config.update(LOGGING_CONFIG["status_overrides"].get("5xx", {}))
    
    return config


def should_log_endpoint(method: str, path: str) -> bool:
    """Check if logging is enabled for this endpoint."""
    config = get_endpoint_config(method, path)
    return config.get("enabled", True)


def get_log_level(method: str, path: str, status_code: int = None) -> str:
    """Get log level for this endpoint."""
    config = get_endpoint_config(method, path, status_code)
    return config.get("log_level", "INFO")
