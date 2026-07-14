@echo off
REM Ensure the Till Print Bridge is running.
REM Prefer the installed background copy under %%LOCALAPPDATA%%\Palmart\till-print-bridge.
REM Falls back to a console run only for local frontend/scripts development.
setlocal
set "HERE=%~dp0"
set "INSTALLED=%LOCALAPPDATA%\Palmart\till-print-bridge"
set "INSTALLED_START=%INSTALLED%\start-till-print-bridge.cmd"
set "INSTALLED_VBS=%INSTALLED%\run-hidden.vbs"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $h = Invoke-RestMethod -Uri http://127.0.0.1:19500/health -TimeoutSec 2; if ($h.ok) { Write-Host 'Till Print Bridge already running in the background.'; exit 0 } } catch { exit 1 }"
if not errorlevel 1 (
  timeout /t 2 /nobreak >nul
  exit /b 0
)

if exist "%INSTALLED_START%" (
  echo Starting installed bridge in the background...
  call "%INSTALLED_START%"
  exit /b %ERRORLEVEL%
)

if exist "%INSTALLED_VBS%" (
  echo Starting installed bridge in the background...
  start "" /B wscript.exe "%INSTALLED_VBS%"
  timeout /t 2 /nobreak >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $h = Invoke-RestMethod -Uri http://127.0.0.1:19500/health -TimeoutSec 3; if ($h.ok) { Write-Host 'Started.'; exit 0 } else { exit 1 } } catch { Write-Host 'Failed — re-run Install-Palmart-Print-Bridge.cmd'; exit 1 }"
  exit /b %ERRORLEVEL%
)

REM Dev / unzipped package: bridge next to this file, or frontend\scripts layout.
cd /d "%HERE%"
if exist "%HERE%till-print-bridge.mjs" (
  set "BRIDGE=%HERE%till-print-bridge.mjs"
) else if exist "%HERE%..\scripts\till-print-bridge.mjs" (
  cd /d "%HERE%.."
  set "BRIDGE=%CD%\scripts\till-print-bridge.mjs"
) else (
  echo Till Print Bridge is not installed.
  echo On Windows: unzip the download and run Install-Palmart-Print-Bridge.cmd once.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo node not found in PATH. Install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

echo Bridge not installed for autostart. Starting in this window for development only.
echo For cashiering on Windows, run Install-Palmart-Print-Bridge.cmd once instead.
echo Leave this window open, or press Ctrl+C to stop.
node "%BRIDGE%"
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo Bridge exited with error %EXITCODE%.
)
pause
exit /b %EXITCODE%
