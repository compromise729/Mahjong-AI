@echo off
setlocal
set "MAHJONG_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined MAHJONG_NODE set "MAHJONG_NODE=%%N"
if not defined MAHJONG_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "MAHJONG_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined MAHJONG_NODE (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)
if not exist "%~dp0node_modules\vite\bin\vite.js" (
  where npm.cmd >nul 2>nul
  if errorlevel 1 (
    echo Frontend dependencies are missing. Install Node.js LTS with npm, then run this file again.
    pause
    exit /b 1
  )
  pushd "%~dp0"
  echo Installing frontend dependencies...
  call npm.cmd ci
  if errorlevel 1 (
    popd
    echo Installation failed. Check the message above, then run this file again.
    pause
    exit /b 1
  )
  popd
)
"%MAHJONG_NODE%" "%~dp0scripts\start-local.mjs" %*
exit /b %errorlevel%
