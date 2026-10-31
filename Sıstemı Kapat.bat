@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Fitness Pro - System Shutdown

rem ============================================================
rem  FITNESS PRO - SYSTEM SHUTDOWN
rem  Stops Cloudflare tunnels, Frontend, Backend and SQL Server.
rem  Docker Desktop stays up. No volumes removed.
rem ============================================================

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_DIR=%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api"
set "FRONTEND_DIR=%PROJECT_ROOT%\Fronted"

set "DB_CONTAINER=fitnesspro-db"
set "API_CONTAINER=fitness-pro-api"
set "FRONTEND_PORT=3000"

echo.
echo ===========================================================
echo   FITNESS PRO  -  SYSTEM SHUTDOWN
echo ===========================================================
echo.
echo Docker Desktop will stay RUNNING.
echo.

rem ============================================================
rem  [00] Stop Cloudflare tunnels
rem ============================================================
if exist "%PROJECT_ROOT%\stop-cloudflare.bat" (
    echo [00] Stopping Cloudflare tunnels...
    call "%PROJECT_ROOT%\stop-cloudflare.bat"
    echo.
)

rem ============================================================
rem  [01] docker CLI
rem ============================================================
where docker >nul 2>&1
if errorlevel 1 (
    echo [01] docker CLI not found. Assuming system already stopped.
    goto :done
)

rem ============================================================
rem  [02] docker engine
rem ============================================================
echo [01] docker engine check...
docker info >nul 2>&1
if errorlevel 1 (
    echo   Engine not running. Fitness Pro assumed already stopped.
    goto :done
)
echo   OK
echo.

rem ============================================================
rem  [02] Stop frontend Python server (only Fitness Pro's)
rem ============================================================
echo [02] Stop frontend (port %FRONTEND_PORT%)...
set "FOUND_PIDS="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    set "FOUND_PIDS=!FOUND_PIDS! %%p"
)
if defined FOUND_PIDS (
    for %%P in (!FOUND_PIDS!) do (
        echo   Stopping PID %%P ...
        taskkill /F /PID %%P >nul 2>&1
    )
    echo   Frontend STOPPED.
) else (
    echo   No listener on port %FRONTEND_PORT%.
)
echo.

rem ============================================================
rem  [03] Stop backend
rem ============================================================
echo [03] Stop backend (%API_CONTAINER%)...
cd /d "%BACKEND_DIR%"
docker inspect --format "{{.State.Status}}" %API_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p ST=<"%TEMP%\fp_state.tmp" 2>nul
if /i "%ST%"=="running" (
    docker stop %API_CONTAINER% >nul 2>&1
    if errorlevel 1 (
        echo   [ERROR] failed to stop %API_CONTAINER%.
    ) else (
        echo   Backend STOPPED.
    )
) else (
    echo   Backend already stopped.
)
echo.

rem ============================================================
rem  [04] Stop SQL
rem ============================================================
echo [04] Stop SQL (%DB_CONTAINER%)...
docker inspect --format "{{.State.Status}}" %DB_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p ST=<"%TEMP%\fp_state.tmp" 2>nul
if /i "%ST%"=="running" (
    docker stop %DB_CONTAINER% >nul 2>&1
    if errorlevel 1 (
        echo   [ERROR] failed to stop %DB_CONTAINER%.
    ) else (
        echo   SQL STOPPED.
    )
) else (
    echo   SQL already stopped.
)
echo.

:done
echo ===========================================================
echo   Cloudflare    : STOPPED
echo   Frontend      : STOPPED
echo   Backend       : STOPPED
echo   SQL           : STOPPED
echo   Docker Desktop: RUNNING
echo ===========================================================
echo   Volume and container data preserved.
echo ===========================================================
timeout /t 2 /nobreak >nul 2>&1
exit /b 0
