"""
Request/Response Logging Middleware
Automatically logs all API requests with timing, payload, and response details.
"""
import logging
import time
import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from ..core.logging_config import get_endpoint_config, should_log_endpoint, get_log_level

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all incoming requests and outgoing responses.
    
    Logs:
    - Request method, path, and query params
    - Request body (for POST/PUT/PATCH)
    - Response status code
    - Response time in milliseconds
    - Response body (for non-streaming responses)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Generate request ID for tracking
        request_id = f"{int(start_time * 1000)}"
        
        # Log request details
        method = request.method
        path = request.url.path
        
        # Check if logging is enabled for this endpoint
        if not should_log_endpoint(method, path):
            return await call_next(request)
        
        # Get config for this endpoint
        config = get_endpoint_config(method, path)
        
        query_params = dict(request.query_params) if request.query_params else None
        
        # Read request body for POST/PUT/PATCH (if enabled)
        request_body = None
        if config.get("log_request_body", True) and method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    request_body = body_bytes.decode('utf-8')
                    # Try to parse as JSON for better logging
                    try:
                        request_body = json.loads(request_body)
                    except json.JSONDecodeError:
                        pass  # Keep as string
                    
                    # Truncate if needed
                    max_length = config.get("max_request_length", 500)
                    if isinstance(request_body, str) and len(request_body) > max_length:
                        request_body = request_body[:max_length] + "... (truncated)"
            except Exception as e:
                logger.warning(f"Could not read request body: {e}")
        
        # Log incoming request
        log_parts = [f"🔵 REQUEST [{request_id}]", f"{method} {path}"]
        
        if config.get("log_query_params", True) and query_params:
            log_parts.append(f"Query={query_params}")
        
        if request_body:
            # Mask sensitive fields if enabled
            if config.get("mask_sensitive_fields", True):
                masked_body = self._mask_sensitive_data(request_body, config)
            else:
                masked_body = request_body
            body_str = json.dumps(masked_body) if isinstance(masked_body, dict) else str(masked_body)
            log_parts.append(f"Body={body_str}")
        
        # Log at configured level
        log_level_str = config.get("log_level", "INFO")
        log_method = getattr(logger, log_level_str.lower(), logger.info)
        log_method(" | ".join(log_parts))
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        process_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Get config with status code for potential overrides
        config = get_endpoint_config(method, path, response.status_code)
        
        # Log response
        status_code = response.status_code
        status_emoji = self._get_status_emoji(status_code)
        
        log_parts = [
            f"{status_emoji} RESPONSE [{request_id}]",
            f"{method} {path}",
            f"Status={status_code}"
        ]
        
        if config.get("log_timing", True):
            log_parts.append(f"Time={process_time:.2f}ms")
        
        # Log response body for non-streaming responses (if enabled)
        if config.get("log_response_body", True) and not isinstance(response, StreamingResponse):
            try:
                # Get response body
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Check size limits
                max_length = config.get("max_response_length", 500)
                
                # Try to parse as JSON
                try:
                    response_data = json.loads(response_body.decode('utf-8'))
                    # Truncate large responses
                    response_str = json.dumps(response_data)
                    if len(response_str) > max_length:
                        log_parts.append(f"Response={response_str[:max_length]}... (truncated)")
                    else:
                        log_parts.append(f"Response={response_str}")
                except (json.JSONDecodeError, UnicodeDecodeError):
                    # Binary or non-JSON response
                    log_parts.append(f"Response=<binary, {len(response_body)} bytes>")
                
                # Recreate response with the body we consumed
                response = Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
            except Exception as e:
                logger.warning(f"Could not read response body: {e}")
        elif isinstance(response, StreamingResponse):
            log_parts.append("Response=<streaming>")
        
        # Check for slow requests
        slow_threshold = config.get("slow_request_threshold_ms", 1000)
        if config.get("log_slow_requests", True) and process_time > slow_threshold:
            log_parts.append("⚠️ SLOW")
        
        # Log at configured level
        log_level_str = get_log_level(method, path, status_code)
        log_method = getattr(logger, log_level_str.lower(), logger.info)
        log_method(" | ".join(log_parts))
        
        # Add timing header
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    def _mask_sensitive_data(self, data, config):
        """Mask sensitive fields in request body."""
        if not isinstance(data, dict):
            return data
        
        masked = data.copy()
        sensitive_patterns = config.get("sensitive_field_patterns", [
            'password', 'token', 'secret', 'api_key', 'authorization'
        ])
        
        for key in masked:
            if any(pattern in key.lower() for pattern in sensitive_patterns):
                masked[key] = "***MASKED***"
        
        return masked
    
    def _get_status_emoji(self, status_code: int) -> str:
        """Get emoji based on status code."""
        if 200 <= status_code < 300:
            return "✅"  # Success
        elif 300 <= status_code < 400:
            return "🔀"  # Redirect
        elif 400 <= status_code < 500:
            return "⚠️"  # Client error
        elif 500 <= status_code < 600:
            return "❌"  # Server error
        else:
            return "🔵"  # Unknown
