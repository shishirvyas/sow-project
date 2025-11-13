# My Python Service (FastAPI) - Sample

Quickstart:

1. Create virtualenv:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run dev server:
   ```bash
   uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Health: http://localhost:8000/health
4. Example endpoint: http://localhost:8000/api/v1/hello