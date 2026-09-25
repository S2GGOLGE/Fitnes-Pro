@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  FITNESS PRO - BACKEND BASL??ICI
::  Gym-Pro-Api (ASP.NET Core / .NET 10)
::  LocalDB: MSSQLLocalDB  |  DB: FitnesPro
:: ============================================================

title Fitness Pro - Backend

set "SOLUTION=c:\Projects\Fitnes-Pro\Backend\Gym-Pro-Api\Gym-Pro-Api.slnx"
set "PROJECT=c:\Projects\Fitnes-Pro\Backend\Gym-Pro-Api\Gym-Pro-Api\Gym-Pro-Api.csproj"
set "LOCALDB_INSTANCE=MSSQLLocalDB"

echo.
echo ==========================================
echo   FITNESS PRO  -  BACKEND BASL??ICI
echo ==========================================
echo.

:: ============================================================
::  ADIM 1: .NET SDK KONTROL
:: ============================================================
echo [1/4] .NET SDK kontrol ediliyor...
where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] dotnet komutu bulunamadi! .NET SDK kurulu degil.
    echo        https://dotnet.microsoft.com/download/dotnet/10.0 adresinden indirin.
    goto :error
)

for /f "tokens=*" %%v in ('dotnet --version 2^>nul') do set "DOTNET_VER=%%v"
echo   OK .NET SDK: %DOTNET_VER%

:: ============================================================
::  ADIM 2: SQL Server LocalDB KONTROL ve BASLATMA
:: ============================================================
echo [2/4] SQL Server LocalDB kontrol ediliyor...

where sqllocaldb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] sqllocaldb bulunamadi! SQL Server Express LocalDB kurulu degil.
    goto :error
)

:: Instance var mi?
sqllocaldb info %LOCALDB_INSTANCE% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Instance bulunamadi, olusturuluyor...
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [HATA] LocalDB instance olusturulamadi!
        goto :error
    )
)

:: Durum kontrolu
set "DB_RUNNING=0"
for /f "tokens=2 delims=:" %%s in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "State"') do (
    set "RAW_STATE=%%s"
)
echo !RAW_STATE! | findstr /i "Running" >nul 2>&1
if %ERRORLEVEL% equ 0 set "DB_RUNNING=1"

if "%DB_RUNNING%"=="0" (
    echo   LocalDB baslatiliyor...
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 3 127.0.0.1 >nul 2>&1
)

:: Pipe name kontrol - SSPI sorununu yakala
set "DB_PIPE="
for /f "tokens=1,* delims=:" %%a in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "pipe"') do (
    set "DB_PIPE=%%b"
)
set "DB_PIPE=!DB_PIPE: =!"

if "!DB_PIPE!" == "" (
    echo   SSPI/pipe sorunu tespit edildi, instance yenileniyor...
    sqllocaldb stop %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    sqllocaldb delete %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 4 127.0.0.1 >nul 2>&1

    set "DB_PIPE="
    for /f "tokens=1,* delims=:" %%a in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "pipe"') do (
        set "DB_PIPE=%%b"
    )
    set "DB_PIPE=!DB_PIPE: =!"

    if "!DB_PIPE!" == "" (
        echo [HATA] LocalDB pipe olusturulamadi. Windows oturumunu kapatip tekrar acin.
        goto :error
    )
)

echo   OK LocalDB calisiyor: %LOCALDB_INSTANCE%

:: ============================================================
::  ADIM 3: PORT 5000 SERBEST MI?
:: ============================================================
echo [3/4] Port 5000 kontrol ediliyor...
set "PORT_PID="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    if not defined PORT_PID set "PORT_PID=%%p"
)

if defined PORT_PID (
    echo   Port 5000 PID !PORT_PID! tarafindan kullaniliyor, kapatiliyor...
    taskkill /F /PID !PORT_PID! >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    echo   OK Port 5000 serbest birakildi.
) else (
    echo   OK Port 5000 serbest.
)

:: ============================================================
::  ADIM 4: API BASLATMA
:: ============================================================
echo [4/4] API baslatiliyor...
echo.
echo   Swagger UI : http://localhost:5000/swagger
echo   Health     : http://localhost:5000/health
echo.
echo   API calisiyor... (durdurmak icin Ctrl+C)
echo   ==========================================
echo.

dotnet run --project "%PROJECT%" --configuration Debug --urls "http://localhost:5000;https://localhost:5001"

echo.
echo [!] API durdu.
echo     Yeniden baslatmak icin bu pencereyi kapatin ve tekrar calistirin.
echo.
pause
goto :eof

:error
echo.
echo ========================================
echo   Baslama basarisiz! Hatay giderin.
echo ========================================
echo.
pause
exit /b 1