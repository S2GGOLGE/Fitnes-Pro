@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  FITNESS PRO - TAMAMI BASLAT
::  Backend : Gym-Pro-Api  (http://localhost:5000)
::  Frontend: Static HTML  (http://localhost:3000)
:: ============================================================

title Fitness Pro - Tum Sistem

set "PROJECT=c:\Projects\Fitnes-Pro\Backend\Gym-Pro-Api\Gym-Pro-Api\Gym-Pro-Api.csproj"
set "FRONTEND_DIR=c:\Projects\Fitnes-Pro\Fronted"
set "LOCALDB_INSTANCE=MSSQLLocalDB"
set "BACKEND_PORT=5000"
set "FRONTEND_PORT=3000"

echo.
echo ==========================================
echo   FITNESS PRO  -  SISTEM BASLATICI
echo   Backend  : http://localhost:%BACKEND_PORT%
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo ==========================================
echo.

:: ============================================================
::  ADIM 1: .NET SDK KONTROL
:: ============================================================
echo [1/5] .NET SDK kontrol ediliyor...
where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] dotnet bulunamadi! .NET SDK kurulu degil.
    goto :error
)
for /f "tokens=*" %%v in ('dotnet --version 2^>nul') do set "DOTNET_VER=%%v"
echo   OK .NET SDK: %DOTNET_VER%

:: ============================================================
::  ADIM 2: PYTHON KONTROL
:: ============================================================
echo [2/5] Python kontrol ediliyor...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] python bulunamadi! Python 3 kurulu degil.
    goto :error
)
for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
echo   OK %PY_VER%

:: ============================================================
::  ADIM 3: SQL Server LocalDB KONTROL ve BASLATMA
:: ============================================================
echo [3/5] SQL Server LocalDB kontrol ediliyor...
where sqllocaldb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] sqllocaldb bulunamadi! SQL Server Express LocalDB kurulu degil.
    goto :error
)

sqllocaldb info %LOCALDB_INSTANCE% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Instance olusturuluyor...
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
)

set "DB_RUNNING=0"
for /f "tokens=2 delims=:" %%s in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "State"') do set "RAW_STATE=%%s"
echo !RAW_STATE! | findstr /i "Running" >nul 2>&1
if %ERRORLEVEL% equ 0 set "DB_RUNNING=1"

if "%DB_RUNNING%"=="0" (
    echo   LocalDB baslatiliyor...
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 3 127.0.0.1 >nul 2>&1
)

set "DB_PIPE="
for /f "tokens=1,* delims=:" %%a in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "pipe"') do set "DB_PIPE=%%b"
set "DB_PIPE=!DB_PIPE: =!"

if "!DB_PIPE!" == "" (
    echo   SSPI sorunu tespit edildi, instance yenileniyor...
    sqllocaldb stop %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    sqllocaldb delete %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 4 127.0.0.1 >nul 2>&1

    set "DB_PIPE="
    for /f "tokens=1,* delims=:" %%a in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "pipe"') do set "DB_PIPE=%%b"
    set "DB_PIPE=!DB_PIPE: =!"

    if "!DB_PIPE!" == "" (
        echo [HATA] LocalDB pipe olusturulamadi. Windows oturumunu kapatip tekrar acin.
        goto :error
    )
)
echo   OK LocalDB calisiyor: %LOCALDB_INSTANCE%

:: ============================================================
::  ADIM 4: PORTLARI TEMIZLE
:: ============================================================
echo [4/5] Portlar kontrol ediliyor...

set "PORT_PID="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING"') do (
    if not defined PORT_PID set "PORT_PID=%%p"
)
if defined PORT_PID (
    echo   Port %BACKEND_PORT% PID !PORT_PID! tarafindan kullaniliyor, kapatiliyor...
    taskkill /F /PID !PORT_PID! >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
) else (
    echo   OK Port %BACKEND_PORT% serbest.
)

set "PORT_PID="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    if not defined PORT_PID set "PORT_PID=%%p"
)
if defined PORT_PID (
    echo   Port %FRONTEND_PORT% PID !PORT_PID! tarafindan kullaniliyor, kapatiliyor...
    taskkill /F /PID !PORT_PID! >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
) else (
    echo   OK Port %FRONTEND_PORT% serbest.
)

:: ============================================================
::  ADIM 5: BACKEND ve FRONTEND AYRI PENCERELERDE BASLA
:: ============================================================
echo [5/5] Servisler baslatiliyor...
echo.

:: --- Backend penceresi ---
start "Fitness Pro - BACKEND (port %BACKEND_PORT%)" cmd /k "color 0A && echo. && echo  ===  BACKEND  (http://localhost:%BACKEND_PORT%)  === && echo. && dotnet run --project ""%PROJECT%"" --configuration Debug --urls ""http://localhost:%BACKEND_PORT%;https://localhost:5001"""

ping -n 3 127.0.0.1 >nul 2>&1

:: --- Frontend penceresi ---
start "Fitness Pro - FRONTEND (port %FRONTEND_PORT%)" cmd /k "color 0B && echo. && echo  ===  FRONTEND  (http://localhost:%FRONTEND_PORT%)  === && echo. && cd /d ""%FRONTEND_DIR%"" && python -m http.server %FRONTEND_PORT%"

ping -n 5 127.0.0.1 >nul 2>&1

:: --- Tarayiciyi ac ---
echo   Tarayici aciliyor...
start "" "http://localhost:%FRONTEND_PORT%/Pages/Login.html"

echo.
echo ==========================================
echo   SERVISLER CALISIYOR
echo   Backend  : http://localhost:%BACKEND_PORT%/swagger
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo   Health   : http://localhost:%BACKEND_PORT%/health
echo ==========================================
echo.
echo   Tum servisleri durdurmak icin her iki
echo   pencereyi de kapatin (Ctrl+C).
echo.
pause
goto :eof

:error
echo.
echo ========================================
echo   BASLATMA BASARISIZ!
echo ========================================
echo.
pause
exit /b 1