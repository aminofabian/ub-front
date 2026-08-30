@echo off
REM Ensure the Till Print Bridge is running.
REM Prefer the installed background copy under %LOCALAPPDATA%\Palmart\till-print-bridge.
REM Falls back to a console run only for local frontend/scripts development.
setlocal
set "HERE=%~dp0"
set "INSTALLED=%LOCALAPPDATA%\Palmart\till-print-bridge"
set "INSTALLED_START=%INSTALLED%\start-till-print-bridge.cmd"
set "INSTALLED_VBS=%INSTALLED%\run-hidden.vbs"
set "INSTALLED_WIN=%INSTALLED%\till-print-bridge-windows.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $c = New-Object System.Net.Sockets.TcpClient; $iar = $c.BeginConnect('127.0.0.1',19500,$null,$null); $ok = $iar.AsyncWaitHandle.WaitOne(1200,$false); if (-not $ok) { $c.Close(); exit 1 }; $c.EndConnect($iar); $c.Close(); Write-Host 'Till Print Bridge already running in the background.'; exit 0 } catch { exit 1 }"
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
  exit /b 0
)

if exist "%INSTALLED_WIN%" (
  echo Starting installed PowerShell bridge...
  start "" /B powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALLED_WIN%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

REM Dev / unzipped package: PowerShell bridge next to this file.
cd /d "%HERE%"
if exist "%HERE%till-print-bridge-windows.ps1" (
  echo Starting PowerShell Till Print Bridge in this window for development.
  echo For cashiering, run Install-Palmart-Print-Bridge.cmd once instead.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%till-print-bridge-windows.ps1"
  exit /b %ERRORLEVEL%
)

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
  echo node not found. On Windows 10/11 you do not need Node — re-run Install-Palmart-Print-Bridge.cmd
  pause
  exit /b 1
)

echo Bridge not installed for autostart. Starting Node bridge in this window for development only.
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
