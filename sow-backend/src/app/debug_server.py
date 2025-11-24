"""Debug entrypoint for running uvicorn under debugpy.

Usage (from sow-backend folder with venv active):
  python src/app/debug_server.py

This script starts debugpy, waits for the debugger to attach (optional),
and launches uvicorn programmatically so breakpoints work reliably.
"""
import os
import sys
from pathlib import Path

try:
    import debugpy
except Exception:
    debugpy = None

import uvicorn


def main():
    # Optional: read port to listen for debugger attach
    debug_port = int(os.getenv("DEBUGPY_PORT", "5678"))
    wait_for_client = os.getenv("DEBUGPY_WAIT", "true").lower() == "true"

    if debugpy is not None:
        print(f"Starting debugpy on port {debug_port}")
        debugpy.listen(("0.0.0.0", debug_port))
        if wait_for_client:
            print("Waiting for debugger to attach...")
            debugpy.wait_for_client()
            print("Debugger attached, continuing startup")
    else:
        print("debugpy not installed. Run `pip install debugpy` in your venv to enable remote debugging.")

    # Ensure we run uvicorn without --reload (reload spawns child processes which complicates debugger attachment)
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    # Run programmatically — this avoids separate process for reload.
    uvicorn.run("src.app.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
