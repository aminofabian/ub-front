@echo off
REM Start the Till Print Bridge.
REM Works from:
REM   - download zip / install dir (till-print-bridge.mjs next to this file)
REM   - frontend/scripts/ in a checkout (cd up to frontend, then scripts\...)
setlocal
set "HERE=%~dp0"
cd /d "%HERE%"

if exist "%HERE%till-print-bridge.mjs" (
  set "BRIDGE=%HERE%till-print-bridge.mjs"
) else if exist "%HERE%..\scripts\till-print-bridge.mjs" (
  cd /d "%HERE%.."
  set "BRIDGE=%CD%\scripts\till-print-bridge.mjs"
) else (
  echo Could not find till-print-bridge.mjs
  echo Expected next to this file, or at frontend\scripts\till-print-bridge.mjs
  pause
  exit /b 1
)

echo Starting Till Print Bridge for Palmart cloud cashier...
echo Leave this window open while cashiering. Press Ctrl+C to stop.
where node >nul 2>&1
if errorlevel 1 (
  echo node not found in PATH. Install Node.js from https://nodejs.org/
  pause
  exit /b 1
)
node "%BRIDGE%"
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo Bridge exited with error %EXITCODE%.
)
pause
exit /b %EXITCODE%
