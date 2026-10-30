@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org to run the local site.
  pause
  exit /b 1
)
start "Physogezic website" node "%~dp0server.cjs"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173/"
