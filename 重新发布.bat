@echo off
chcp 65001 >nul
set "WEB=%~dp0StarMap\01_Web"
echo 停止 5173 上的旧发布服务 ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:"TCP.*:5173.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
pushd "%WEB%"
call npm run build:personal
popd
echo.
echo   构建完成，重新启动发布版：http://127.0.0.1:5173/
echo.
cd /d "%WEB%"
node node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 5173 --strictPort
pause