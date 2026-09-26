@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  FITNESS PRO - BACKEND BASLATICI  (Baglanti-Saglam)
::  Gym-Pro-Api (ASP.NET Core / .NET 10)
::  LocalDB: MSSQLLocalDB  |  DB: FitnesPro
:: ============================================================

title Fitness Pro - Backend

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

set "BACKEND_PROJECT=%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api\Gym-Pro-Api.csproj"
set "LOCALDB_INSTANCE=MSSQLLocalDB"
set "BACKEND_PORT=5000"
set "BACKEND_HEALTH=http://localhost:%BACKEND_PORT%/health"

echo.
echo ==========================================
echo   FITNESS PRO  -  BACKEND BASLATICI
echo ==========================================
echo.

echo [0/4] Eski dotnet surecleri temizleniyor...
set "KILL_LIST="
for /f "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq dotnet.exe" /NH 2^>nul') do (
    set "KILL_LIST=!KILL_LIST! /PID %%P"
)
if defined KILL_LIST (
    taskkill /F !KILL_LIST! >nul 2>&1
    ping -n 3 127.0.0.1 >nul 2>&1
    echo   OK Temizlendi.
) else (
    echo   OK Kalinti yok.
)
echo.

:: ---- 1. .NET SDK ----
echo [1/4] .NET SDK kontrol ediliyor...
where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] dotnet komutu bulunamadi! .NET SDK kurulu degil.
    echo        https://dotnet.microsoft.com/download/dotnet/10.0
    goto :error
)
for /f "tokens=*" %%v in ('dotnet --version 2^>nul') do set "DOTNET_VER=%%v"
echo   OK .NET SDK: %DOTNET_VER%
if not exist "%BACKEND_PROJECT%" (
    echo [HATA] Backend projesi bulunamadi: %BACKEND_PROJECT%
    goto :error
)
echo   OK Proje: %BACKEND_PROJECT%
echo.

:: ---- 2. LocalDB ----
echo [2/4] SQL Server LocalDB kontrol ediliyor...
where sqllocaldb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] sqllocaldb bulunamadi.
    goto :error
)
sqllocaldb info %LOCALDB_INSTANCE% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
)
set "DB_RUNNING=0"
for /f "tokens=2 delims=:" %%s in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "State"') do set "RAW_STATE=%%s"
echo !RAW_STATE! | findstr /i "Running" >nul 2>&1
if !ERRORLEVEL! equ 0 set "DB_RUNNING=1"
if "!DB_RUNNING!"=="0" (
    echo   LocalDB baslatiliyor...
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 4 127.0.0.1 >nul 2>&1
)
set "DB_PIPE="
for /f "tokens=1,* delims=:" %%a in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "pipe"') do set "DB_PIPE=%%b"
set "DB_PIPE=!DB_PIPE: =!"
if "!DB_PIPE!" == "" (
    sqllocaldb stop %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    sqllocaldb delete %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 5 127.0.0.1 >nul 2>&1
)
echo   OK LocalDB calisiyor: %LOCALDB_INSTANCE%
echo.

:: ---- 3. Port temizligi ----
echo [3/4] Port %BACKEND_PORT% kontrol ediliyor...
set "FOUND_PIDS="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING"') do (
    if not defined FOUND_PIDS set "FOUND_PIDS=%%p"
)
if defined FOUND_PIDS (
    echo   Port %BACKEND_PORT% PID !FOUND_PIDS! tarafindan kullaniliyor, kapatiliyor...
    for %%P in (!FOUND_PIDS!) do taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    echo   OK Port %BACKEND_PORT% serbest birakildi.
) else (
    echo   OK Port %BACKEND_PORT% zaten serbest.
)
echo.

:: ---- 4. Backend'i ayri pencerede baslat ----
echo [4/4] Backend ayaga kaldiriliyor...

> "%PROJECT_ROOT%\Backend\run-backend.cmd" (
    echo @echo off
    echo title Fitness Pro - BACKEND port %BACKEND_PORT%
    echo color 0A
    echo cd /d "%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api"
    echo set ASPNETCORE_ENVIRONMENT=Development
    echo set ASPNETCORE_URLS=http://localhost:%BACKEND_PORT%
    echo.
    echo echo === BACKEND http://localhost:%BACKEND_PORT% ===
    echo.
    echo dotnet run --project "%BACKEND_PROJECT%" --no-launch-profile --configuration Debug
)

start "Fitness Pro - BACKEND port %BACKEND_PORT%" "%PROJECT_ROOT%\Backend\run-backend.cmd"

echo   Saglik kontrolu bekleniyor (max 45 sn)...
set "BE_OK=0"
set "BE_WAIT=0"
:be_wait_loop
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%BACKEND_HEALTH%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { 0 }" > "%TEMP%\be_health.txt" 2>nul
    set /p BE_HTTP=<"%TEMP%\be_health.txt" 2>nul
    if "!BE_HTTP!"=="200" (
        set "BE_OK=1"
        echo   OK Backend saglikli HTTP 200 - !BE_WAIT! saniye bekledi.
        goto :be_done
    )
    set /a BE_WAIT+=1
    if !BE_WAIT! geq 45 goto :be_done
    set /p "=." <nul
    ping -n 2 127.0.0.1 >nul 2>&1
goto :be_wait_loop
:be_done
echo.
if "!BE_OK!"=="1" (
    echo.
    echo   Swagger : http://localhost:%BACKEND_PORT%/swagger
    echo   Health  : %BACKEND_HEALTH%
    echo.
    echo   Durdurmak icin: stop-all.bat ya da backend penceresini kapatip Ctrl+C.
    pause
) else (
    echo   [UYARI] Backend 45 sn icinde 200 dondurmedi. Pencereyi kontrol edin.
)
goto :eof

:error
echo.
pause
exit /b 1
