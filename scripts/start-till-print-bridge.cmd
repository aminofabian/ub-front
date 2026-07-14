@echo off
REM Double-click or run from cmd to start the Till Print Bridge on Windows.
cd /d "%~dp0\.."
echo Starting Till Print Bridge for Palmart cloud cashier...
echo Leave this window open while cashiering. Press Ctrl+C to stop.
where node >nul 2>&1
if errorlevel 1 (
  echo node not found in PATH. Install Node.js from https://nodejs.org/
  pause
  exit /b 1
)
node scripts\till-print-bridge.mjs
pause
