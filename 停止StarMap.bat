@echo off
chcp 65001 >nul
for %%P in (5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:"TCP.*:%%P.*LISTENING"') do (
    echo 停止端口 %%P 进程 PID %%a
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo StarMap 服务已停止。
pause