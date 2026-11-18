@echo off
chcp 65001 >nul
set "WEB=%~dp0StarMap\01_Web"
echo.
echo   编辑模式（含本地编辑器，改动写入 06_private）：http://127.0.0.1:5174/
echo   编辑完请运行 重新发布.bat 让发布版生效
echo.
cd /d "%WEB%"
node node_modules\vite\bin\vite.js --mode personal --host 127.0.0.1 --port 5174 --strictPort
pause