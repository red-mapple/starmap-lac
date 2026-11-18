@echo off
chcp 65001 >nul
set "WEB=%~dp0StarMap\01_Web"
if not exist "%WEB%\node_modules" (
  echo 依赖尚未安装，正在执行 npm ci ...
  pushd "%WEB%" && npm ci --registry=https://registry.npmmirror.com/ && popd
)
if not exist "%WEB%\dist\index.html" (
  echo 首次发布，正在构建静态站点 ...
  pushd "%WEB%" && call npm run build:personal && popd
)
echo.
echo   StarMap 发布版：http://127.0.0.1:5173/
echo   需要增删足迹请运行 启动编辑器.bat（http://127.0.0.1:5174/）
echo   关闭本窗口即停止服务
echo.
cd /d "%WEB%"
node node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 5173 --strictPort
pause