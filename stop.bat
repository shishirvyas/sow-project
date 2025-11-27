@echo off
REM ============================================================================
REM Stop Script for SOW Project (Windows)
REM Stops backend and frontend servers
REM ============================================================================

echo.
echo ========================================
echo   Stopping SOW Project
echo ========================================
echo.

REM Kill backend (port 8000)
echo [1/2] Stopping Backend Server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a > nul 2>&1
    if %errorlevel% == 0 (
        echo [OK] Backend stopped
    )
)

REM Kill frontend (port 5173)
echo [2/2] Stopping Frontend Server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a > nul 2>&1
    if %errorlevel% == 0 (
        echo [OK] Frontend stopped
    )
)

REM Close any cmd windows with SOW in title
taskkill /FI "WINDOWTITLE eq SOW Backend" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq SOW Frontend" /F > nul 2>&1

echo.
echo ========================================
echo   All Servers Stopped
echo ========================================
echo.

pause
