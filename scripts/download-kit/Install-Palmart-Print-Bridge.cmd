@echo off
REM Install / start Palmart Till Print Bridge from an extracted download package.
cd /d "%~dp0"

echo === Palmart Till Print Bridge (Windows) ===
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is required but was not found.
  echo Opening https://nodejs.org/ — install the LTS build, then run this installer again.
  start "" "https://nodejs.org/en/download"
  pause
  where node >nul 2>&1
  if errorlevel 1 (
    echo Still no node in PATH. Close this window, reopen after installing Node, and run again.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Palmart-Print-Bridge.ps1"
if errorlevel 1 (
  echo Install failed.
  pause
  exit /b 1
)
echo.
echo Go back to Palmart Cashier and click Detect printers.
pause
