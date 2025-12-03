"""
Development server startup script with proper logging configuration.
Run this instead of uvicorn directly.
"""
import uvicorn
import logging

if __name__ == "__main__":
    # Configure logging before starting server
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s:%(name)s:%(message)s',
        force=True
    )
    
    # Reduce uvicorn's default access logging
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    # Run the server
    uvicorn.run(
        "src.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
        access_log=False  # Disable uvicorn's access log, we have our own middleware
    )
