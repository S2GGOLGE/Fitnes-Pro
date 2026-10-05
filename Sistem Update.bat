@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Fitness Pro - System Update

rem ============================================================
rem  FITNESS PRO - SYSTEM UPDATE
rem  Rebuilds backend image and restarts the stack.
rem  SQL Server image is not rebuilt (Microsoft official image).
rem ============================================================

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_DIR=%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api"
set "FRONTEND_DIR=%PROJECT_ROOT%\Fronted"
set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"

set "DB_CONTAINER=fitnesspro-db"
set "API_CONTAINER=fitness-pro-api"
set "DB_PORT=1433"
set "BACKEND_PORT=8081"
set "FRONTEND_PORT=3000"
set "HEALTH_URL=http://localhost:%BACKEND_PORT%/health"
set "HEALTH_TIMEOUT=120"
set "DB_TIMEOUT=90"
set "DOCKER_TIMEOUT=180"

echo.
echo ===========================================================
echo   FITNESS PRO  -  SYSTEM UPDATE
echo ===========================================================
echo.

rem ============================================================
rem  [01] docker CLI check
rem ============================================================
echo [01] docker CLI check...
where docker >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] docker CLI not found.
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [02] docker engine - start Desktop if needed
rem ============================================================
echo [02] docker engine check...
docker info >nul 2>&1
if not errorlevel 1 (
    echo   OK
    goto :engine_done
)

echo   Engine not running. Starting Docker Desktop...
if not exist "%DOCKER_EXE%" (
    echo   [ERROR] Docker Desktop not found at: %DOCKER_EXE%
    goto :fatal
)

tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | findstr /I "Docker Desktop.exe" >nul 2>&1
if errorlevel 1 (
    start "" "%DOCKER_EXE%"
    echo   Launch requested.
) else (
    echo   Docker Desktop process already present.
)

set "WAIT=0"
:wait_engine
docker info >nul 2>&1
if not errorlevel 1 (
    echo   OK - engine ready.
    goto :engine_done
)
set /a WAIT+=5
if !WAIT! geq %DOCKER_TIMEOUT% (
    echo   [ERROR] Docker engine not ready within %DOCKER_TIMEOUT%s.
    goto :fatal
)
<nul set /p "=. "
ping -n 5 127.0.0.1 >nul 2>&1
goto :wait_engine
:engine_done
echo.

rem ============================================================
rem  [03] Stop frontend (avoid user hitting stale page mid-update)
rem ============================================================
echo [03] Stop frontend (port %FRONTEND_PORT%)...
set "FOUND_PIDS="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    set "FOUND_PIDS=!FOUND_PIDS! %%p"
)
if defined FOUND_PIDS (
    for %%P in (!FOUND_PIDS!) do taskkill /F /PID %%P >nul 2>&1
    echo   Frontend STOPPED.
) else (
    echo   Frontend not running.
)
echo.

rem ============================================================
rem  [04] Backend and SQL current state
rem ============================================================
echo [04] Backend / SQL state check...
cd /d "%BACKEND_DIR%"
docker inspect --format "{{.State.Status}}" %API_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p API_STATE=<"%TEMP%\fp_state.tmp" 2>nul
docker inspect --format "{{.State.Status}}" %DB_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p DB_STATE=<"%TEMP%\fp_state.tmp" 2>nul
echo   Backend : !API_STATE!
echo   SQL     : !DB_STATE!
echo.

rem ============================================================
rem  [05] Rebuild backend image (no SQL rebuild)
rem ============================================================
echo [05] Build backend image (%API_CONTAINER%)...
docker compose build %API_CONTAINER%
if errorlevel 1 (
    echo   [ERROR] build failed.
    echo            Inspect: cd /d "%BACKEND_DIR%" ^&^& docker compose build %API_CONTAINER%
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [06] Restart SQL (no build, no volume change)
rem ============================================================
echo [06] Restart SQL Server (%DB_CONTAINER%)...
if /i "%DB_STATE%"=="running" (
    docker stop %DB_CONTAINER% >nul 2>&1
    echo   Old SQL stopped.
)
docker compose up -d --no-build %DB_CONTAINER%
if errorlevel 1 (
    echo   [ERROR] failed to start SQL.
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [07] Wait SQL ready
rem ============================================================
echo [07] Wait SQL Server ready (port %DB_PORT%)...
set "WAIT=0"
:wait_db_ready
set "DB_OK=0"
powershell -NoProfile -Command "(Test-NetConnection -ComputerName localhost -Port %DB_PORT% -InformationLevel Quiet -WarningAction SilentlyContinue)" > "%TEMP%\fp_db.tmp" 2>&1
findstr /I "True" "%TEMP%\fp_db.tmp" >nul 2>&1
if not errorlevel 1 set "DB_OK=1"
if "%DB_OK%"=="1" (
    echo   OK
    goto :db_ready_done
)
set /a WAIT+=3
if !WAIT! geq %DB_TIMEOUT% (
    echo   [ERROR] SQL Server not ready within %DB_TIMEOUT%s.
    goto :fatal
)
<nul set /p "=. "
ping -n 3 127.0.0.1 >nul 2>&1
goto :wait_db_ready
:db_ready_done
echo.

rem ============================================================
rem  [08] Start backend with new image
rem ============================================================
echo [08] Start backend with new image (%API_CONTAINER%)...
if /i "%API_STATE%"=="running" (
    docker stop %API_CONTAINER% >nul 2>&1
    echo   Old backend stopped.
)
docker compose up -d --no-build %API_CONTAINER%
if errorlevel 1 (
    echo   [ERROR] failed to start backend.
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [09] Health endpoint
rem ============================================================
echo [09] Health endpoint: %HEALTH_URL%
set "WAIT=0"
:wait_health
curl.exe -s -o "%TEMP%\fp_hb.tmp" -w "%%{http_code}" "%HEALTH_URL%" 1>"%TEMP%\fp_hc.tmp" 2>nul
set /p HEALTH_CODE=<"%TEMP%\fp_hc.tmp" 2>nul
if "%HEALTH_CODE%"=="200" (
    findstr /i "Healthy" "%TEMP%\fp_hb.tmp" >nul 2>&1
    if not errorlevel 1 (
        echo   OK Backend healthy.
        goto :health_done
    )
)
set /a WAIT+=3
if !WAIT! geq %HEALTH_TIMEOUT% (
    echo   [ERROR] Health check failed. HTTP=!HEALTH_CODE!
    if exist "%TEMP%\fp_hb.tmp" (
        echo   Last response:
        type "%TEMP%\fp_hb.tmp"
        echo.
    )
    echo   Inspect: cd /d "%BACKEND_DIR%" ^&^& docker compose logs --tail=200 %API_CONTAINER%
    echo   Frontend NOT restarted. Volume preserved.
    goto :fatal
)
<nul set /p "=. "
ping -n 3 127.0.0.1 >nul 2>&1
goto :wait_health
:health_done
echo.

rem ============================================================
rem  [10] Restart frontend
rem ============================================================
echo [10] Restart frontend (port %FRONTEND_PORT%)...
where python >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] python not found.
    goto :fatal
)

set "FRONTEND_HTML="
for %%F in ("%FRONTEND_DIR%\*.html") do (
    if not defined FRONTEND_HTML set "FRONTEND_HTML=%%~nxF"
)
if not defined FRONTEND_HTML (
    echo   [ERROR] No .html file in %FRONTEND_DIR%
    goto :fatal
)
echo   HTML file: %FRONTEND_HTML%

if exist "%FRONTEND_DIR%\run-frontend.cmd" (
    start "Fitness Pro Frontend" "%FRONTEND_DIR%\run-frontend.cmd"
) else (
    start "Fitness Pro Frontend" /MIN cmd /c "cd /d "%FRONTEND_DIR%" && python -m http.server %FRONTEND_PORT% --bind 127.0.0.1"
)
ping -n 3 127.0.0.1 >nul 2>&1

curl.exe -s -o nul -f "http://127.0.0.1:%FRONTEND_PORT%/" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Frontend did not respond.
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [11] Open browser
rem ============================================================
echo [11] Opening browser...
powershell -NoProfile -Command "Start-Process ('http://127.0.0.1:%FRONTEND_PORT%/' + [uri]::EscapeDataString('%FRONTEND_HTML%'))"

echo.
echo ===========================================================
echo   UPDATE COMPLETE
echo   Docker Engine : OK
echo   SQL Server    : OK
echo   Backend       : UPDATED
echo   Health        : Healthy
echo   Frontend      : UPDATED
echo.
echo   Backend  : http://localhost:%BACKEND_PORT%
echo   Swagger  : http://localhost:%BACKEND_PORT%/swagger
echo   Health   : %HEALTH_URL%
echo   Frontend : http://127.0.0.1:%FRONTEND_PORT%/
echo ===========================================================
timeout /t 3 /nobreak >nul 2>&1
exit /b 0

rem ============================================================
rem  fatal exit
rem ============================================================
:fatal
echo.
echo UPDATE FAILED. See error above.
echo Container and volume preserved.
pause
exit /b 1