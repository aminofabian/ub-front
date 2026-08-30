@echo off
REM Ensure the Till Print Bridge is running (powershell.exe, no wscript).
setlocal
set "HERE=%~dp0"
set "INSTALLED=%LOCALAPPDATA%\Palmart\till-print-bridge"
set "INSTALLED_START=%INSTALLED%\start-till-print-bridge.cmd"
set "INSTALLED_WIN=%INSTALLED%\till-print-bridge-windows.ps1"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%PS%" -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $c = New-Object System.Net.Sockets.TcpClient; $iar = $c.BeginConnect('127.0.0.1',19500,$null,$null); $ok = $iar.AsyncWaitHandle.WaitOne(1200,$false); if (-not $ok) { $c.Close(); exit 1 }; $c.EndConnect($iar); $c.Close(); Write-Host 'Till Print Bridge already running in the background.'; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  timeout /t 2 /nobreak >nul
  exit /b 0
)

if exist "%INSTALLED_START%" (
  echo Starting installed bridge...
  call "%INSTALLED_START%"
  exit /b %ERRORLEVEL%
)

if exist "%INSTALLED_WIN%" (
  echo Starting installed PowerShell bridge...
  start "" /B "%PS%" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALLED_WIN%"
  timeout /t 3 /nobreak >nul
  exit /b 0
)

cd /d "%HERE%"
if exist "%HERE%till-print-bridge-windows.ps1" (
  echo Starting PowerShell Till Print Bridge in this window.
  echo For cashiering, run Install-Palmart-Print-Bridge.cmd once instead.
  "%PS%" -NoProfile -ExecutionPolicy Bypass -File "%HERE%till-print-bridge-windows.ps1"
  exit /b %ERRORLEVEL%
)

echo Till Print Bridge is not installed.
echo Unzip the Windows download and run Install-Palmart-Print-Bridge.cmd
echo If health still fails, run Start-Bridge-Window.cmd and leave it open.
pause
exit /b 1
