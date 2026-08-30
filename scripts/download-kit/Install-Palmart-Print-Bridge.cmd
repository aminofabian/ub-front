@echo off
REM One-time install for Windows 10/11 (PowerShell bridge, no Node.js).
REM On Windows 7 this launcher switches to the Win7 installer when present.
cd /d "%~dp0"

REM Windows 7 / Server 2008 R2 = version 6.1
ver | findstr /R /C:"Version 6\.1\." >nul
if not errorlevel 1 goto :win7

echo === Palmart Till Print Bridge (Windows 10 / 11) ===
echo Install once. After this it runs in the background at every sign-in.
echo No Node.js required. You do NOT need to keep a window open.
echo.

if not exist "%~dp0Install-Palmart-Print-Bridge.ps1" goto :missing
if not exist "%~dp0till-print-bridge-windows.ps1" goto :missing
if not exist "%~dp0windows-raw-print.ps1" goto :missing

if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
  echo PowerShell not found. Windows 10 / 11 needs Windows PowerShell 5.1.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Palmart-Print-Bridge.ps1"
if errorlevel 1 (
  echo.
  echo Install failed. If SmartScreen blocked it, right-click this .cmd and Run anyway.
  echo Or open PowerShell in this folder and run:
  echo   Set-ExecutionPolicy -Scope Process Bypass
  echo   .\Install-Palmart-Print-Bridge.ps1
  echo.
  echo Log: %LOCALAPPDATA%\Palmart\till-print-bridge\bridge.log
  pause
  exit /b 1
)
echo.
echo Done. Close this window - the bridge keeps running in the background.
echo Next: Palmart Cashier - open Printer - Detect printers.
pause
exit /b 0

:missing
echo.
echo ERROR: Required files are not next to this .cmd
echo This folder: %CD%
echo Need: Install-Palmart-Print-Bridge.ps1, till-print-bridge-windows.ps1, windows-raw-print.ps1
echo Unzip the full Windows folder and run the .cmd from THERE.
pause
exit /b 1

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
