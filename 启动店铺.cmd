@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\hermes\node\node.exe" (
  "%LOCALAPPDATA%\hermes\node\node.exe" start.cjs
) else (
  node start.cjs
)
if errorlevel 1 (
  echo 启动失败，请保留错误提示。
  pause
)
