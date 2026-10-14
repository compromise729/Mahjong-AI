@echo off
setlocal
set "MAHJONG_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined MAHJONG_NODE set "MAHJONG_NODE=%%N"
if not defined MAHJONG_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "MAHJONG_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined MAHJONG_NODE (
  echo Node.js was not found. Install Node.js, then run this file again.
  exit /b 1
)
"%MAHJONG_NODE%" "%~dp0scripts\start-local.mjs" %*
exit /b %errorlevel%
