@echo off
REM Starts the till print bridge in THIS window so you can see errors.
REM Use this if http://127.0.0.1:19500/health says site can't be reached.
cd /d "%~dp0"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "BRIDGE=%~dp0till-print-bridge-windows.ps1"
if not exist "%BRIDGE%" set "BRIDGE=%~dp0..\till-print-bridge-windows.ps1"
if not exist "%BRIDGE%" (
  echo Missing till-print-bridge-windows.ps1
  echo Run this from the unzipped palmart-till-print-bridge-windows folder.
  pause
  exit /b 1
)
echo Unblocking downloaded scripts...
"%PS%" -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%~dp0till-print-bridge-windows.ps1' -ErrorAction SilentlyContinue; Unblock-File -LiteralPath '%~dp0windows-raw-print.ps1' -ErrorAction SilentlyContinue"
echo.
echo Starting bridge. Leave this window open.
echo Then on THIS PC open: http://127.0.0.1:19500/health
echo You should see ok:true
echo.
set "TILL_PRINT_BRIDGE_LOG=%~dp0bridge.log"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%BRIDGE%"
echo.
echo Bridge stopped. Exit code %ERRORLEVEL%
echo Log: %TILL_PRINT_BRIDGE_LOG%
pause
