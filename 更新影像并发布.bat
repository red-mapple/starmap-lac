@echo off
chcp 65001 >nul
setlocal
set "ROOT=E:\王全的工作台\02-BIM项目文件\018-starmap"
set "APP=%ROOT%\StarMap\01_Web"
set "SITE=https://starmap-lac-mpxvyu7v.edgeone.cool"
set "CONSOLE=https://console.cloud.tencent.com/edgeone/makers/project/makers-usa88fszfoer"
if "%STARMAP_AUTORUN%"=="1" (set "PAUSE_CMD=rem" & set "OPEN_CMD=rem") else (set "PAUSE_CMD=pause" & set "OPEN_CMD=start")
title StarMap - 更新影像并发布公网
echo ==================================================
echo   StarMap 影像入库 + 构建 + 增量发布（EdgeOne + COS）
echo   项目：starmap-lac（makers-usa88fszfoer）
echo   媒体走 COS 增量上传，站点只传 14MB 左右的 dist
echo ==================================================
cd /d "%APP%"
if not exist "node_modules" (
  echo [0/5] 缺少依赖，先安装...
  call npm ci --registry=https://registry.npmmirror.com/
chcp 65001 >nul
  if errorlevel 1 goto :fail
)
echo.
echo [1/5] 媒体预检（只读，不改任何文件）...
call npm run media:check
chcp 65001 >nul
if errorlevel 1 goto :failcheck
echo.
echo [2/5] 入库：生成缩略图、预览图与媒体索引...
call npm run media:import
chcp 65001 >nul
if errorlevel 1 goto :fail
echo.
echo [3/5] 构建发布版 dist 并拆分媒体到 dist-static ...
call npm run build:personal
chcp 65001 >nul
if errorlevel 1 goto :fail
echo.
echo [4/5] 媒体增量上传到腾讯云 COS（只传新增/变更文件）...
call npm run static:upload
chcp 65001 >nul
if errorlevel 1 goto :fail
echo.
echo [5/5] 上传站点到 EdgeOne Pages（免费版）...
call edgeone --version >nul 2>nul
chcp 65001 >nul
if errorlevel 1 (
  echo 缺少 EdgeOne CLI，先安装 edgeone ...
  call npm install -g edgeone --registry=https://registry.npmmirror.com/
chcp 65001 >nul
  if errorlevel 1 goto :fail
)
call edgeone makers deploy "%APP%\dist" -n starmap-lac -e production
chcp 65001 >nul
if errorlevel 1 goto :fail
echo.
echo ==================================================
echo   Deployed to EdgeOne Pages (project: starmap-lac)
echo   Console: %CONSOLE%
echo   Preview link (valid ~3 hours) comes from the console
echo ==================================================
%OPEN_CMD% "" "%CONSOLE%"
echo.
%PAUSE_CMD%
exit /b 0

:failcheck
echo.
echo 预检未通过：请按上面「需要处理」的条目逐条修正，然后重新双击本脚本。
%PAUSE_CMD%
exit /b 1

:fail
echo.
echo 执行失败，请查看上面的报错。
%PAUSE_CMD%
exit /b 1