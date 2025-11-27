# SOW Project - Quick Start Scripts

Convenient scripts to start and stop both backend and frontend servers with a single command.

## 📁 Scripts Overview

- **Windows:** `start.bat` / `stop.bat`
- **macOS/Linux:** `start.sh` / `stop.sh`

## 🚀 Usage

### Windows

```powershell
# Start both servers
.\start.bat

# Stop both servers
.\stop.bat
```

### macOS/Linux

```bash
# Make scripts executable (first time only)
chmod +x start.sh stop.sh

# Start both servers
./start.sh

# Stop both servers
./stop.sh
```

## 🎯 What the Scripts Do

### Start Script (`start.bat` / `start.sh`)

1. **Checks if servers are already running** (ports 8000 and 5173)
2. **Starts Backend Server:**
   - Sets `PYTHONPATH` to `sow-backend` directory
   - Runs `uvicorn src.app.main:app --reload --port 8000`
   - Backend runs on `http://localhost:8000`
3. **Starts Frontend Server:**
   - Runs `npm run dev` in `frontend` directory
   - Frontend runs on `http://localhost:5173`
4. **Shows server URLs** and status

### Stop Script (`stop.bat` / `stop.sh`)

1. **Stops Backend Server** (kills process on port 8000)
2. **Stops Frontend Server** (kills process on port 5173)
3. **Cleans up** background processes and windows

## 📊 Server Endpoints

After running start script, you can access:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **API Redoc:** http://localhost:8000/redoc

## 🔍 Monitoring (macOS/Linux only)

View real-time logs:

```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log
```

## 🛠️ Manual Start (Alternative)

If you prefer to start servers manually:

### Backend
```powershell
# Windows
cd sow-backend
$env:PYTHONPATH = "$pwd"
python -m uvicorn src.app.main:app --reload --port 8000

# macOS/Linux
cd sow-backend
export PYTHONPATH=$(pwd)
python -m uvicorn src.app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

## ⚠️ Troubleshooting

### Port Already in Use

If you see "port already in use" error:

**Windows:**
```powershell
# Find process on port 8000
netstat -ano | findstr :8000

# Kill process by PID
taskkill /F /PID <PID>
```

**macOS/Linux:**
```bash
# Find and kill process on port 8000
lsof -t -i:8000 | xargs kill

# Find and kill process on port 5173
lsof -t -i:5173 | xargs kill
```

### Backend Not Starting

1. Ensure Python dependencies are installed:
   ```bash
   cd sow-backend
   pip install -r requirements.txt
   ```

2. Check `.env` file exists in `sow-backend` directory

3. Verify PostgreSQL connection in `.env`:
   ```
   DATABASE_URL=postgres://...
   ```

### Frontend Not Starting

1. Ensure Node.js dependencies are installed:
   ```bash
   cd frontend
   npm install
   ```

2. Check Node.js version (should be 16+):
   ```bash
   node --version
   ```

## 🎨 Features

- ✅ **Automatic port checking** - Won't start if already running
- ✅ **Sequential startup** - Backend first, then frontend
- ✅ **Background processes** - Servers run in background (macOS/Linux)
- ✅ **Separate windows** - Each server in its own window (Windows)
- ✅ **PID tracking** - Keeps track of process IDs (macOS/Linux)
- ✅ **Clean shutdown** - Properly terminates all processes
- ✅ **Status messages** - Clear feedback at each step

## 📝 Notes

- **Windows:** Servers run in separate command windows. Close windows or run `stop.bat` to stop.
- **macOS/Linux:** Servers run in background. Use `stop.sh` to stop, or check PID files.
- **Auto-reload:** Backend automatically reloads on code changes (via uvicorn --reload)
- **Hot reload:** Frontend automatically reloads on code changes (via Vite)

## 🔐 Default Test Credentials

After starting the servers, login at http://localhost:5173/login:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skope.ai | password123 |
| Manager | manager@skope.ai | password123 |
| Analyst | analyst@skope.ai | password123 |
| Viewer | viewer@skope.ai | password123 |

---

**Happy coding!** 🚀
