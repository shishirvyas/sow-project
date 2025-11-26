import logging
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.endpoints import router as v1_router
from .api.v1.profile import router as profile_router

# Try to load .env from the sow-backend root so pydantic settings pick it up
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

# Calculate repo root (sow-backend)
_repo_root = Path(__file__).resolve().parents[3]
_env_path = _repo_root / ".env"
if load_dotenv is not None:
    if _env_path.exists():
        load_dotenv(dotenv_path=str(_env_path))
        logging.info("Loaded .env from %s", _env_path)
    else:
        # fallback to default search behavior
        load_dotenv()
        logging.info("Called load_dotenv() (default search path)")
else:
    logging.warning("python-dotenv not available; .env will not be auto-loaded")

from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="My Python Service")

# Configure CORS for frontend access from environment variables
# You can set CORS_ORIGINS in .env file as comma-separated values
# Example: CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-app.com
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
logging.info(f"Configuring CORS with origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=[settings.CORS_ALLOW_METHODS] if settings.CORS_ALLOW_METHODS != "*" else ["*"],
    allow_headers=[settings.CORS_ALLOW_HEADERS] if settings.CORS_ALLOW_HEADERS != "*" else ["*"],
)

app.include_router(v1_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.ENV}