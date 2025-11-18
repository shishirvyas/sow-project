#!/usr/bin/env bash
set -euo pipefail

# Simple helper to create/activate the virtualenv and run the FastAPI app with uvicorn.
# Usage:
#   ./run.sh            # creates .venv if missing, installs requirements, runs uvicorn
#   ./run.sh --port 9000

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

if [ ! -d "$VENV" ]; then
  echo "Virtualenv not found at $VENV. Creating..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
  if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    echo "Installing requirements from $SCRIPT_DIR/requirements.txt..."
    "$VENV/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
  fi
fi

echo "Using virtualenv: $VENV"

# Default uvicorn args; allow passing extra args to override
UVICORN_ARGS=(src.app.main:app --reload --host 127.0.0.1 --port 8000)

if [ "$#" -gt 0 ]; then
  # pass through any args (e.g. --port 9000)
  exec "$VENV/bin/uvicorn" "${UVICORN_ARGS[@]}" "$@"
else
  exec "$VENV/bin/uvicorn" "${UVICORN_ARGS[@]}"
fi
