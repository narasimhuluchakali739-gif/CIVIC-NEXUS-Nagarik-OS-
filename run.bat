@echo off
title CIVIC-NEXUS OS Launcher
echo ========================================================
echo   CIVIC-NEXUS: Autonomous Civic Infrastructure OS
echo   Launching Standalone Server on http://localhost:8000
echo ========================================================

cd /d "%~dp0backend"

python standalone_server.py 8000
pause
