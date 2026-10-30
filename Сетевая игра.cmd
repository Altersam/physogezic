@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org to host a multiplayer game.
  pause
  exit /b 1
)
start "Fizogezik - multiplayer server" node "%~dp0server.cjs"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173/#rooms"
