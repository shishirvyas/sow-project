# sow-backend — local run instructions

This folder contains the backend service. The easiest way to run it locally is to use the provided virtual environment and uvicorn.

Quick start (macOS / Linux):

1. Create/activate virtualenv and install requirements (one-off):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

2. Run the app with uvicorn (from project root or this folder):

```bash
# activate if not already active
source .venv/bin/activate
# from project root
uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000
```

3. Or use the helper script included here (creates venv and installs requirements if needed):

```bash
chmod +x run.sh
./run.sh
```

Notes
- If you see ModuleNotFoundError when running a .py file directly, make sure you're using the venv's Python (`source .venv/bin/activate`), or run the script with the venv Python binary.
- On CI or Windows, adapt the virtualenv activation command (`.venv\\Scripts\\activate`) and path separators.

Health check
After starting the server, open http://127.0.0.1:8000/health — it should return a JSON status.
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