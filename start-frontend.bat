@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  FITNESS PRO - FRONTEND BASLATICI  (Baglanti-Saglam)
:: ============================================================

title Fitness Pro - Frontend

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "FRONTEND_DIR=%PROJECT_ROOT%\Fronted"
set "FRONTEND_PORT=3000"
set "FRONTEND_HEALTH=http://127.0.0.1:%FRONTEND_PORT%/Ba%%C5%%9Flang%%C4%%B1c.html"

echo.
echo ==========================================
echo   FITNESS PRO  -  FRONTEND BASLATICI
echo ==========================================
echo.

echo [0/4] Eski python surecleri temizleniyor...
set "KILL_LIST="
for /f "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq python.exe" /NH 2^>nul') do (
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

:: ---- 1. Python ----
echo [1/4] Python kontrol ediliyor...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] python bulunamadi.
    goto :error
)
for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
echo   OK %PY_VER%
if not exist "%FRONTEND_DIR%" (
    echo [HATA] Frontend klasoru yok: %FRONTEND_DIR%
    goto :error
)
echo   OK Klasor: %FRONTEND_DIR%
echo.

:: ---- 2. Port temizligi ----
echo [2/4] Port %FRONTEND_PORT% kontrol ediliyor...
set "FOUND_PIDS="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    if not defined FOUND_PIDS set "FOUND_PIDS=%%p"
)
if defined FOUND_PIDS (
    echo   Port %FRONTEND_PORT% PID !FOUND_PIDS! tarafindan kullaniliyor, kapatiliyor...
    for %%P in (!FOUND_PIDS!) do taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    echo   OK Port %FRONTEND_PORT% serbest birakildi.
) else (
    echo   OK Port %FRONTEND_PORT% zaten serbest.
)
echo.

:: ---- 3. Frontend'i baslat ----
echo [3/4] Frontend baslatiliyor...

> "%PROJECT_ROOT%\Fronted\run-frontend.cmd" (
    echo @echo off
    echo title Fitness Pro - FRONTEND port %FRONTEND_PORT%
    echo color 0B
    echo cd /d "%FRONTEND_DIR%"
    echo.
    echo echo === FRONTEND http://localhost:%FRONTEND_PORT% ===
    echo.
    echo python -m http.server %FRONTEND_PORT% --bind 127.0.0.1
)

start "Fitness Pro - FRONTEND port %FRONTEND_PORT%" "%PROJECT_ROOT%\Fronted\run-frontend.cmd"

echo   Saglik kontrolu (max 25 sn)...
set "FE_OK=0"
set "FE_WAIT=0"
:fe_wait_loop
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%FRONTEND_HEALTH%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { 0 }" > "%TEMP%\fe_health.txt" 2>nul
    set /p FE_HTTP=<"%TEMP%\fe_health.txt" 2>nul
    if "!FE_HTTP!"=="200" (
        set "FE_OK=1"
        echo   OK Frontend saglikli HTTP 200 - !FE_WAIT! saniye bekledi.
        goto :fe_done
    )
    set /a FE_WAIT+=1
    if !FE_WAIT! geq 25 goto :fe_done
    set /p "=." <nul
    ping -n 2 127.0.0.1 >nul 2>&1
goto :fe_wait_loop
:fe_done
echo.
if "!FE_OK!"=="1" (
    echo.
    echo   Anasayfa : http://localhost:%FRONTEND_PORT%/Ba%%C5%%9Flang%%C4%%B1c.html
    start "" "http://localhost:%FRONTEND_PORT%/Ba%C5%9Flang%C4%B1c.html"
    echo   Durdurmak icin: stop-all.bat ya da frontend penceresini kapatip Ctrl+C.
    pause
) else (
    echo   [UYARI] Frontend 25 sn icinde 200 dondurmedi.
    pause
)
goto :eof

:error
echo.
pause
exit /b 1
