@echo off
chcp 65001 >nul

:: 获取脚本所在目录
set SCRIPT_DIR=%~dp0

:: 检查8081端口是否有服务在运行
netstat -ano | findstr ":8081 " | findstr LISTENING >nul
set IS_RUNNING=%errorlevel%

if %IS_RUNNING%==0 (
    goto STOP_SERVICES
) else (
    goto START_SERVICES
)

:START_SERVICES
echo ========================================
echo    秋辞文案馆 - 启动服务
echo ========================================
echo.

:: 启动后端服务 (8081)
echo [1/3] 启动后端服务 (8081)...
cd /d "%SCRIPT_DIR%server\backend"
start "后端-8081" cmd /c "node server.js > server.log 2>&1"

:: 启动管理后台 (3001)
echo [2/3] 启动管理后台 (3001)...
start "管理后台-3001" cmd /c "node adminServer.js > admin_server.log 2>&1"

:: 启动前端 (5173)
echo [3/3] 启动前端服务 (5173)...
cd /d "%SCRIPT_DIR%client"
start "前端-5173" cmd /c "npm run dev > vite.log 2>&1"

echo.
echo    等待服务启动 (10秒)...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo    检查服务状态
echo ========================================
echo.

set ALL_OK=1

netstat -ano | findstr ":8081 " | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [OK] 后端服务 (8081)
) else (
    echo [FAIL] 后端服务 (8081)
    set ALL_OK=0
)

netstat -ano | findstr ":3001 " | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [OK] 管理后台 (3001)
) else (
    echo [FAIL] 管理后台 (3001)
    set ALL_OK=0
)

netstat -ano | findstr ":5173 " | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [OK] 前端服务 (5173)
) else (
    netstat -ano | findstr ":5174 " | findstr LISTENING >nul
    if %errorlevel%==0 (
        echo [OK] 前端服务 (5174 - 端口被占用)
    ) else (
        echo [FAIL] 前端服务
        set ALL_OK=0
    )
)

echo.
echo ========================================
if %ALL_OK%==1 (
    echo    所有服务启动成功！
    echo ========================================
    echo.
    echo  访问地址：
    echo  - 前端首页: http://localhost:5173
    echo  - 管理后台: http://localhost:5173/admin
    echo.
    echo  再次运行此脚本可停止所有服务
) else (
    echo    部分服务启动失败
    echo ========================================
    echo.
    echo  请查看日志文件：
    echo  - server\backend\server.log
    echo  - server\backend\admin_server.log
    echo  - client\vite.log
)
echo.
pause
goto :EOF

:STOP_SERVICES
echo ========================================
echo    秋辞文案馆 - 停止服务
echo ========================================
echo.

echo 正在停止所有服务...

:: 查找并关闭占用端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr LISTENING') do (
    echo 关闭后端进程 %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do (
    echo 关闭管理后台进程 %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') do (
    echo 关闭前端进程 %%a
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174 " ^| findstr LISTENING') do (
    echo 关闭前端进程 %%a
    taskkill /F /PID %%a 2>nul
)

:: 关闭所有node进程
echo 关闭所有node进程...
taskkill /F /IM node.exe 2>nul

echo.
echo ========================================
echo    所有服务已停止
echo ========================================
echo.
echo 再次运行此脚本可重新启动服务
echo.
timeout /t 2 /nobreak >nul