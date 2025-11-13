from fastapi import FastAPI
from .api.v1.endpoints import router as v1_router
from .core.config import settings

app = FastAPI(title="My Python Service")

app.include_router(v1_router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.ENV}