@echo off
REM Windows 7 one-time install - PowerShell bridge, no Node.js.
REM Must be run from the unzipped folder (same folder as the .ps1 files).
setlocal EnableExtensions
cd /d "%~dp0"

echo === Palmart Till Print Bridge (Windows 7) ===
echo Install once. Runs in the background at every sign-in.
echo No Node.js required.
echo.

set "PS1=%~dp0Install-Palmart-Print-Bridge-Win7.ps1"
set "BRIDGE=%~dp0till-print-bridge-win7.ps1"

if not exist "%PS1%" goto :missingFiles
if not exist "%BRIDGE%" goto :missingFiles

if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
  echo PowerShell not found. Windows 7 needs PowerShell 2.0 or later.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
  echo.
  echo Install FAILED (exit %ERR%). The bridge is NOT running yet.
  echo Open bridge.log in:
  echo   %LOCALAPPDATA%\Palmart\till-print-bridge\bridge.log
  echo Or try: %LOCALAPPDATA%\Palmart\till-print-bridge\start-till-print-bridge.cmd
  echo Then open in Internet Explorer: http://127.0.0.1:19500/health
  pause
  exit /b %ERR%
)
echo.
echo SUCCESS - bridge is running. Close this window.
echo Confirm in Internet Explorer: http://127.0.0.1:19500/health
echo Then refresh Palmart Cashier and Detect printers.
echo Use Chrome 109 if the cashier site will not load on this PC.
pause
exit /b 0

:missingFiles
echo.
echo ERROR: Required install files are not next to this .cmd
echo.
echo This folder: %CD%
echo Looking for:
echo   Install-Palmart-Print-Bridge-Win7.ps1
echo   till-print-bridge-win7.ps1
echo.
echo Fix:
echo   1. Open the unzipped folder named palmart-till-print-bridge-windows7
echo      (not only the Downloads folder)
echo   2. Make sure BOTH .cmd and .ps1 files are in that same folder
echo   3. Double-click Install-Palmart-Print-Bridge-Win7.cmd from THERE
echo.
echo Do not copy only the .cmd file out of the zip.
pause
exit /b 1
