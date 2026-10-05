@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Fitness Pro - System Start

rem ============================================================
rem  FITNESS PRO - SYSTEM START
rem  Starts Docker Desktop if needed, then SQL Server,
rem  Backend, and Python frontend.
rem ============================================================

rem ---- paths ----
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

set "BACKEND_DIR=%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api"
set "FRONTEND_DIR=%PROJECT_ROOT%\Fronted"
set "COMPOSE_FILE=%BACKEND_DIR%\docker-compose.yml"
set "ENV_FILE=%BACKEND_DIR%\.env"
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
echo   FITNESS PRO  -  SYSTEM START
echo ===========================================================
echo.

rem ============================================================
rem  [01] docker CLI check
rem ============================================================
echo [01] docker CLI check...
where docker >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] docker CLI not found. Install Docker Desktop.
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
    echo   Docker engine already running.
    goto :engine_done
)

echo   Engine not running. Trying to start Docker Desktop...
if not exist "%DOCKER_EXE%" (
    echo   [ERROR] Docker Desktop not found at:
    echo            %DOCKER_EXE%
    echo            Start Docker Desktop manually and retry.
    goto :fatal
)

tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | findstr /I "Docker Desktop.exe" >nul 2>&1
if not errorlevel 1 (
    echo   Docker Desktop process already present, waiting for engine...
) else (
    start "" "%DOCKER_EXE%"
    echo   Docker Desktop launch requested.
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
    echo   [ERROR] Docker engine did not become ready within %DOCKER_TIMEOUT%s.
    echo            Start Docker Desktop manually and retry.
    goto :fatal
)
<nul set /p "=. "
ping -n 5 127.0.0.1 >nul 2>&1
goto :wait_engine
:engine_done
echo.

rem ============================================================
rem  [03] compose and env files
rem ============================================================
echo [03] compose / .env check...
if not exist "%COMPOSE_FILE%" (
    echo   [ERROR] missing: %COMPOSE_FILE%
    goto :fatal
)
if not exist "%ENV_FILE%" (
    echo   [ERROR] missing: %ENV_FILE%
    goto :fatal
)
echo   OK
echo.

rem ============================================================
rem  [04] Start SQL Server container (no build)
rem ============================================================
echo [04] Start SQL Server (%DB_CONTAINER%)...
cd /d "%BACKEND_DIR%"
docker inspect --format "{{.State.Status}}" %DB_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p DB_STATE=<"%TEMP%\fp_state.tmp" 2>nul
if /i "%DB_STATE%"=="running" (
    echo   Already running.
) else (
    docker compose up -d --no-build %DB_CONTAINER%
    if errorlevel 1 (
        echo   [ERROR] failed to start %DB_CONTAINER%.
        echo            Inspect: docker compose logs %DB_CONTAINER%
        goto :fatal
    )
)
echo.

rem ============================================================
rem  [05] Wait for SQL Server readiness (port 1433)
rem ============================================================
echo [05] Wait SQL Server ready (port %DB_PORT%)...
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
    echo   [ERROR] SQL Server did not accept connections within %DB_TIMEOUT%s.
    echo            Inspect: docker logs %DB_CONTAINER%
    goto :fatal
)
<nul set /p "=. "
ping -n 3 127.0.0.1 >nul 2>&1
goto :wait_db_ready
:db_ready_done
echo.

rem ============================================================
rem  [06] Start Backend container (no build)
rem ============================================================
echo [06] Start Backend (%API_CONTAINER%)...
docker inspect --format "{{.State.Status}}" %API_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p API_STATE=<"%TEMP%\fp_state.tmp" 2>nul
if /i "%API_STATE%"=="running" (
    echo   Already running.
) else (
    docker compose up -d --no-build %API_CONTAINER%
    if errorlevel 1 (
        echo   [ERROR] failed to start %API_CONTAINER%.
        echo            Inspect: docker compose logs %API_CONTAINER%
        goto :fatal
    )
)
echo.

rem ============================================================
rem  [07] Wait for Backend container running
rem ============================================================
echo [07] %API_CONTAINER% running check...
set "WAIT=0"
:wait_api_running
docker inspect --format "{{.State.Status}}" %API_CONTAINER% 1>"%TEMP%\fp_state.tmp" 2>nul
set /p API_STATE=<"%TEMP%\fp_state.tmp" 2>nul
if /i "%API_STATE%"=="running" (
    echo   OK
    goto :api_running_done
)
set /a WAIT+=1
if !WAIT! geq 30 (
    echo   [ERROR] %API_CONTAINER% did not reach running state. State=!API_STATE!
    echo            Inspect: docker compose logs %API_CONTAINER%
    goto :fatal
)
ping -n 3 127.0.0.1 >nul 2>&1
goto :wait_api_running
:api_running_done
echo.

rem ============================================================
rem  [08] Health endpoint
rem ============================================================
echo [08] Health endpoint: %HEALTH_URL%
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
    echo.
    if exist "%TEMP%\fp_hb.tmp" (
        echo   Last response:
        type "%TEMP%\fp_hb.tmp"
        echo.
    )
    echo   Inspect: cd /d "%BACKEND_DIR%" ^&^& docker compose logs --tail=200 %API_CONTAINER%
    echo   Frontend NOT started. Container and volume preserved.
    goto :fatal
)
<nul set /p "=. "
ping -n 3 127.0.0.1 >nul 2>&1
goto :wait_health
:health_done
echo.

rem ============================================================
rem  [09] Frontend (Python http.server on port 3000)
rem ============================================================
echo [09] Frontend start...
curl.exe -s -o nul -f "http://127.0.0.1:%FRONTEND_PORT%/" >nul 2>&1
if not errorlevel 1 (
    echo   Frontend already serving on port %FRONTEND_PORT%.
    goto :frontend_done
)

if not exist "%FRONTEND_DIR%" (
    echo   [ERROR] Frontend directory missing: %FRONTEND_DIR%
    goto :fatal
)

where python >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] python not found. Install Python.
    goto :fatal
)

set "FRONTEND_HTML="
for %%F in ("%FRONTEND_DIR%\*.html") do (
    if not defined FRONTEND_HTML set "FRONTEND_HTML=%%~nxF"
)
if not defined FRONTEND_HTML (
    echo   [ERROR] No .html file found in %FRONTEND_DIR%
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
    echo   [ERROR] Frontend did not respond on http://127.0.0.1:%FRONTEND_PORT%/
    echo            Backend is running; frontend UI will not auto-open.
    goto :fatal
)
echo   OK
:frontend_done
echo.

rem ============================================================
rem  [10] Open browser
rem ============================================================
echo [10] Opening browser...
powershell -NoProfile -Command "Start-Process ('http://127.0.0.1:%FRONTEND_PORT%/' + [uri]::EscapeDataString('%FRONTEND_HTML%'))"

echo.
echo ===========================================================
echo   SYSTEM READY
echo   Docker Engine : OK
echo   SQL Server    : OK
echo   Backend       : OK
echo   Health        : Healthy
echo   Frontend      : OK
echo.
echo   Backend  : http://localhost:%BACKEND_PORT%
echo   Swagger  : http://localhost:%BACKEND_PORT%/swagger
echo   Health   : %HEALTH_URL%
echo   Frontend : http://127.0.0.1:%FRONTEND_PORT%/
echo.
echo   To stop  : Sistemi Kapat.bat
echo   To update: Sistem Update.bat
echo ===========================================================
timeout /t 3 /nobreak >nul 2>&1
exit /b 0

rem ============================================================
rem  fatal exit
rem ============================================================
:fatal
echo.
echo SYSTEM START FAILED. See error above.
echo Container and volume preserved.
pause
exit /b 1