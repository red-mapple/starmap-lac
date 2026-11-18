@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title StarMap 影像工具（关掉此窗口即退出）
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请先安装 Node.js 再试。
  pause
  exit /b 1
)
echo 正在启动 StarMap 影像工具…
start "" http://127.0.0.1:5199
node "工具\media-server.mjs"
echo.
echo 工具已退出。
pause
