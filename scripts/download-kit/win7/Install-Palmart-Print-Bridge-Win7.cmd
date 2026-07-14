@echo off
REM Windows 7 one-time install - PowerShell bridge, no Node.js.
cd /d "%~dp0"

echo === Palmart Till Print Bridge (Windows 7) ===
echo Install once. Runs in the background at every sign-in.
echo No Node.js required.
echo.

if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
  echo PowerShell not found. Windows 7 needs PowerShell 2.0 or later.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Palmart-Print-Bridge-Win7.ps1"
if errorlevel 1 (
  echo.
  echo Install failed. Try right-click this .cmd - Run as administrator.
  echo If health check fails, run as admin once:
  echo   netsh http add urlacl url=http://127.0.0.1:19500/ user=%USERNAME%
  pause
  exit /b 1
)
echo.
echo Done. Close this window - the bridge keeps running in the background.
echo Next: Palmart Cashier - open Printer - Detect printers.
echo Use Chrome 109 if the cashier site will not load on this PC.
pause
