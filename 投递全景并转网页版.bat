@echo off
chcp 65001 >nul
setlocal
set "ROOT=E:\王全的工作台\02-BIM项目文件\018-starmap"
set "APP=%ROOT%\StarMap\01_Web"
title StarMap - 投递全景并转网页版
echo ==================================================
echo   投递全景并转网页版（253MP 原片 -^> 8192x4096）
echo ==================================================
echo.
echo 收件箱里已有的城市：
for /d %%D in ("%ROOT%\06_private\MediaInbox\中国\*") do echo    %%~nxD
echo.
set /p CITY=请输入城市名（红安县 / 浠水县）：
if "%CITY%"=="" (echo 未输入城市，已退出 & pause & exit /b 1)
echo.
echo 提示：把 PTGui 导出的原片放在同一个目录里，例如
echo       E:\王全的工作台\02-BIM项目文件\018-starmap\全景图\红安
set /p SRCDIR=请粘贴源目录路径（可直接把文件夹拖进本窗口）：
if "%SRCDIR%"=="" (echo 未输入目录，已退出 & pause & exit /b 1)
set "SRCDIR=%SRCDIR:"=%"
echo.
cd /d "%APP%"
node "%ROOT%\工具\pano-web.cjs" --city "%CITY%" --src "%SRCDIR%"
if errorlevel 1 goto :fail
echo.
echo 转换完成。下面直接进入「入库 + 构建 + 发布」。
choice /c YN /m "现在就把新影像同步到公网吗"
if errorlevel 2 (echo 已取消发布，稍后可双击 更新影像并发布.bat & pause & exit /b 0)
call "%ROOT%\更新影像并发布.bat"
exit /b 0

:fail
echo.
echo 转换失败，请查看上面的报错。
pause
exit /b 1