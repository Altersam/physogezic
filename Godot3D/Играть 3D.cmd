@echo off
if defined GODOT_EXE goto launch
if exist "%~dp0Godot.exe" (
  set "GODOT_EXE=%~dp0Godot.exe"
  goto launch
)
where godot >nul 2>nul
if not errorlevel 1 (
  set "GODOT_EXE=godot"
  goto launch
)
if exist "%TEMP%\opencode\godot-4.5.1\Godot_v4.5.1-stable_win64_console.exe" (
  set "GODOT_EXE=%TEMP%\opencode\godot-4.5.1\Godot_v4.5.1-stable_win64_console.exe"
  goto launch
)
echo Open project.godot in Godot 4.5+, or set GODOT_EXE to the editor executable.
echo https://godotengine.org/download/windows/
pause
exit /b 1
:launch
"%GODOT_EXE%" --headless --editor --path "%~dp0." --import
if errorlevel 1 (
  pause
  exit /b 1
)
"%GODOT_EXE%" --path "%~dp0."
