@echo off
chcp 65001 >nul
setlocal
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
cd /d "%~dp0"
title StarMap 影像工具（关掉此窗口即退出）
set "NODE_EXE="
for %%P in (node.exe) do if not defined NODE_EXE if exist "%%~$PATH:P" set "NODE_EXE=%%~$PATH:P"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE for /d %%D in ("%LOCALAPPDATA%\Doubao\User Data\sandbox_runtime\bases\*") do if not defined NODE_EXE if exist "%%~D\node\node.exe" set "NODE_EXE=%%~D\node\node.exe"
if not defined NODE_EXE (
  echo 未找到 Node.js，请先安装 Node.js 或确认 PATH 里有 node.exe。
  pause
  exit /b 1
)
echo 正在启动 StarMap 影像工具（%NODE_EXE%）…
start "" http://127.0.0.1:5199
"%NODE_EXE%" "工具\media-server.mjs"
echo.
echo 工具已退出。
pause
