@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher ^(py^) was not found. Install Python 3.10 or newer and try again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js 18 or newer and try again.
  pause
  exit /b 1
)

if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo Creating backend environment...
  py -3 -m venv "%ROOT%.venv"
  if errorlevel 1 goto :failed
)
if not exist "%ROOT%.venv\.civic-nexus-deps-ready" (
  echo Installing backend dependencies for first launch...
  "%ROOT%.venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt"
  if errorlevel 1 goto :failed
  type nul > "%ROOT%.venv\.civic-nexus-deps-ready"
)

if not exist "%ROOT%frontend\node_modules" (
  echo Installing frontend dependencies...
  npm install --prefix "%ROOT%frontend"
  if errorlevel 1 goto :failed
)

echo Starting CIVIC-NEXUS backend and frontend...
start "CIVIC-NEXUS API" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:CIVIC_DEMO_SEED='1'; Set-Location -LiteralPath '%ROOT%backend'; & '%ROOT%.venv\Scripts\python.exe' -m uvicorn main:app --host 127.0.0.1 --port 8000"
start "CIVIC-NEXUS UI" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:VITE_API_URL='http://127.0.0.1:8000'; Set-Location -LiteralPath '%ROOT%frontend'; npm run dev -- --host 127.0.0.1"
"%ROOT%.venv\Scripts\python.exe" "%ROOT%backend\seed.py" --wait
if errorlevel 1 echo Demo incidents could not be seeded. Check the API window and run backend\seed.py --wait again.
echo.
echo Dashboard: http://localhost:5173
echo API health: http://localhost:8000/api/v1/health
echo Keep both service windows open during the demo.
pause
exit /b 0

:failed
echo Startup setup failed. Check Python, npm, and network access, then try again.
pause
exit /b 1
