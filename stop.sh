#!/bin/bash
# ============================================================================
# Stop Script for SOW Project (macOS/Linux)
# Stops backend and frontend servers
# ============================================================================

echo ""
echo "========================================"
echo "  Stopping SOW Project"
echo "========================================"
echo ""

# Stop backend
echo "[1/2] Stopping Backend Server..."
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo "[OK] Backend stopped (PID: $BACKEND_PID)"
        rm backend.pid
    else
        echo "[INFO] Backend not running"
        rm backend.pid
    fi
else
    # Try to find and kill by port
    BACKEND_PID=$(lsof -t -i:8000)
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID
        echo "[OK] Backend stopped (PID: $BACKEND_PID)"
    else
        echo "[INFO] Backend not running"
    fi
fi

# Stop frontend
echo "[2/2] Stopping Frontend Server..."
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo "[OK] Frontend stopped (PID: $FRONTEND_PID)"
        rm frontend.pid
    else
        echo "[INFO] Frontend not running"
        rm frontend.pid
    fi
else
    # Try to find and kill by port
    FRONTEND_PID=$(lsof -t -i:5173)
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
        echo "[OK] Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "[INFO] Frontend not running"
    fi
fi

echo ""
echo "========================================"
echo "  All Servers Stopped"
echo "========================================"
echo ""
