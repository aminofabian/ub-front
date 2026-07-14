@echo off
REM One-time install for Windows 10/11 (Node bridge).
REM On Windows 7 this launcher switches to the no-Node Win7 installer when present.
cd /d "%~dp0"

REM Windows 7 / Server 2008 R2 = version 6.1
ver | findstr /R /C:"Version 6\.1\." >nul
if not errorlevel 1 goto :win7

echo === Palmart Till Print Bridge (Windows 10 / 11) ===
echo Install once. After this it runs in the background at every sign-in.
echo You do NOT need to keep a window open while cashiering.
echo.

where node >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" goto :haveNode
  if exist "%LocalAppData%\Programs\node\node.exe" goto :haveNode
  echo.
  echo Node.js is required on Windows 10/11 but was not found.
  echo Opening https://nodejs.org/ - install the LTS build, then run this installer again.
  echo.
  echo On Windows 7: use Install-Palmart-Print-Bridge-Win7.cmd instead (no Node.js).
  start "" "https://nodejs.org/en/download"
  pause
  where node >nul 2>&1
  if errorlevel 1 (
    if exist "%ProgramFiles%\nodejs\node.exe" goto :haveNode
    echo Still no node in PATH. Close this window, reopen after installing Node, and run again.
    pause
    exit /b 1
  )
)

:haveNode
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Palmart-Print-Bridge.ps1"
if errorlevel 1 (
  echo.
  echo Install failed. If SmartScreen blocked PowerShell, right-click this .cmd and Run as administrator
  echo or open PowerShell in this folder and run:
  echo   Set-ExecutionPolicy -Scope Process Bypass
  echo   .\Install-Palmart-Print-Bridge.ps1
  pause
  exit /b 1
)
echo.
echo Done. Close this window - the bridge keeps running in the background.
echo Next: Palmart Cashier - open Printer - Detect printers.
pause
exit /b 0

:win7
echo === Windows 7 detected ===
echo This PC should use the Windows 7 installer (PowerShell, no Node.js).
echo.
if exist "%~dp0Install-Palmart-Print-Bridge-Win7.cmd" (
  echo Launching Install-Palmart-Print-Bridge-Win7.cmd ...
  echo.
  call "%~dp0Install-Palmart-Print-Bridge-Win7.cmd"
  exit /b %ERRORLEVEL%
)
if exist "%~dp0win7\Install-Palmart-Print-Bridge-Win7.cmd" (
  echo Launching win7\Install-Palmart-Print-Bridge-Win7.cmd ...
  echo.
  call "%~dp0win7\Install-Palmart-Print-Bridge-Win7.cmd"
  exit /b %ERRORLEVEL%
)
echo.
echo Windows 7 files are missing from this folder.
echo Download "Windows 7" from Palmart Cashier:
echo   palmart-till-print-bridge-windows7.zip
echo Then run Install-Palmart-Print-Bridge-Win7.cmd - no Node.js needed.
echo.
pause
exit /b 1
