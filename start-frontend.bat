@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  FITNESS PRO - FRONTEND BASLATICI
::  Static HTML/CSS/JS  (http://localhost:3000)
::  Sunucu: Python http.server
:: ============================================================

title Fitness Pro - Frontend

set "FRONTEND_DIR=c:\Projects\Fitnes-Pro\Fronted"
set "FRONTEND_PORT=3000"

echo.
echo ==========================================
echo   FITNESS PRO  -  FRONTEND BASLATICI
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo ==========================================
echo.

:: ============================================================
::  ADIM 1: PYTHON KONTROL
:: ============================================================
echo [1/3] Python kontrol ediliyor...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] python komutu bulunamadi! Python 3 kurulu degil.
    echo        https://www.python.org/downloads/ adresinden indirin.
    goto :error
)
for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
echo   OK %PY_VER%

:: ============================================================
::  ADIM 2: FRONTEND KLASORU KONTROL
:: ============================================================
echo [2/3] Frontend klasoru kontrol ediliyor...
if not exist "%FRONTEND_DIR%" (
    echo [HATA] Frontend klasoru bulunamadi: %FRONTEND_DIR%
    goto :error
)
echo   OK Klasor mevcut: %FRONTEND_DIR%

:: ============================================================
::  ADIM 3: PORT 3000 SERBEST MI?
:: ============================================================
echo [3/3] Port %FRONTEND_PORT% kontrol ediliyor...
set "PORT_PID="
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    if not defined PORT_PID set "PORT_PID=%%p"
)

if defined PORT_PID (
    echo   Port %FRONTEND_PORT% PID !PORT_PID! tarafindan kullaniliyor, kapatiliyor...
    taskkill /F /PID !PORT_PID! >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    echo   OK Port %FRONTEND_PORT% serbest birakildi.
) else (
    echo   OK Port %FRONTEND_PORT% serbest.
)

:: ============================================================
::  FRONTEND BASLATMA
:: ============================================================
echo.
echo   Frontend baslatiliyor...
echo   Adres    : http://localhost:%FRONTEND_PORT%
echo   Giris    : http://localhost:%FRONTEND_PORT%/Pages/Login.html
echo   Anasayfa : http://localhost:%FRONTEND_PORT%/Baslangiç.html
echo.
echo   Durdurmak icin Ctrl+C kullanin.
echo   ==========================================
echo.

:: Kisa bir bekleme sonrasi tarayici ac
ping -n 3 127.0.0.1 >nul 2>&1
start "" "http://localhost:%FRONTEND_PORT%/Pages/Login.html"

:: Python sunucusunu baslat
cd /d "%FRONTEND_DIR%"
python -m http.server %FRONTEND_PORT%

echo.
echo [!] Frontend sunucusu durdu.
echo     Yeniden baslatmak icin bu pencereyi kapatin ve tekrar calistirin.
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
