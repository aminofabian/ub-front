@echo off
REM One-time install: copies bridge, starts it hidden, enables logon autostart.
cd /d "%~dp0"

echo === Palmart Till Print Bridge (Windows) ===
echo Install once. After this it runs in the background at every sign-in.
echo You do NOT need to keep a window open while cashiering.
echo.

where node >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" goto :haveNode
  if exist "%LocalAppData%\Programs\node\node.exe" goto :haveNode
  echo.
  echo Node.js is required but was not found.
  echo Opening https://nodejs.org/ - install the LTS build, then run this installer again.
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
