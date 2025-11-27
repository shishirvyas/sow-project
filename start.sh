#!/bin/bash
# ============================================================================
# Start Script for SOW Project (macOS/Linux)
# Starts backend server, then frontend server
# ============================================================================

echo ""
echo "========================================"
echo "  Starting SOW Project"
echo "========================================"
echo ""

# Check if backend is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[WARNING] Backend already running on port 8000"
    echo ""
else
    echo "[1/2] Starting Backend Server..."
    echo ""
    cd sow-backend
    
    # Set PYTHONPATH and start backend in background
    export PYTHONPATH=$(pwd)
    nohup python -m uvicorn src.app.main:app --reload --port 8000 > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    
    # Wait for backend to start
    sleep 5
    echo "[OK] Backend started on http://localhost:8000 (PID: $BACKEND_PID)"
    echo ""
fi

# Check if frontend is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "[WARNING] Frontend already running on port 5173"
    echo ""
else
    echo "[2/2] Starting Frontend Server..."
    echo ""
    cd frontend
    
    # Start frontend in background
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
    
    # Wait for frontend to start
    sleep 3
    echo "[OK] Frontend starting on http://localhost:5173 (PID: $FRONTEND_PID)"
    echo ""
fi

echo "========================================"
echo "  SOW Project Started!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "To stop servers, run: ./stop.sh"
echo ""
