@echo off
REM ============================================================================
REM Start Script for SOW Project (Windows)
REM Starts backend server, then frontend server
REM ============================================================================

echo.
echo ========================================
echo   Starting SOW Project
echo ========================================
echo.

REM Check if backend is already running
netstat -ano | findstr :8000 > nul
if %errorlevel% == 0 (
    echo [WARNING] Backend already running on port 8000
    echo.
) else (
    echo [1/2] Starting Backend Server...
    echo.
    cd sow-backend
    
    REM Set PYTHONPATH and start backend in background
    start "SOW Backend" cmd /k "set PYTHONPATH=%cd% && python -m uvicorn src.app.main:app --reload --port 8000"
    
    cd ..
    
    REM Wait for backend to start
    timeout /t 5 /nobreak > nul
    echo [OK] Backend started on http://localhost:8000
    echo.
)

REM Check if frontend is already running
netstat -ano | findstr :5173 > nul
if %errorlevel% == 0 (
    echo [WARNING] Frontend already running on port 5173
    echo.
) else (
    echo [2/2] Starting Frontend Server...
    echo.
    cd frontend
    
    REM Start frontend in new window
    start "SOW Frontend" cmd /k "npm run dev"
    
    cd ..
    
    REM Wait for frontend to start
    timeout /t 3 /nobreak > nul
    echo [OK] Frontend starting on http://localhost:5173
    echo.
)

echo ========================================
echo   SOW Project Started!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop servers
echo Or run stop.bat to stop all servers
echo.

pause
