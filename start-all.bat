@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ============================================================
::  FITNESS PRO - TUM SISTEM BASLATICI  (Baglanti-Saglam)
::  Backend : Gym-Pro-Api  (http://localhost:5000)
::  Frontend: Static HTML  (http://localhost:3000)
::  Bu dosya %~dp0 ile calisir; proje klasoru tasinabilir.
:: ============================================================

title Fitness Pro - Tum Sistem

:: ---- Yapilandirma -------------------------------------------------
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

set "BACKEND_PROJECT=%PROJECT_ROOT%\Backend\Gym-Pro-Api\Gym-Pro-Api\Gym-Pro-Api.csproj"
set "FRONTEND_DIR=%PROJECT_ROOT%\Fronted"
set "LOCALDB_INSTANCE=MSSQLLocalDB"
set "BACKEND_PORT=5000"
set "FRONTEND_PORT=3000"
set "BACKEND_HEALTH=http://localhost:%BACKEND_PORT%/health"
set "FRONTEND_HEALTH=http://127.0.0.1:%FRONTEND_PORT%/Ba%%C5%%9Flang%%C4%%B1c.html"
set "BACKEND_TIMEOUT=45"
set "FRONTEND_TIMEOUT=20"

echo.
echo ==========================================
echo   FITNESS PRO  -  SISTEM BASLATICI
echo   Backend  : http://localhost:%BACKEND_PORT%
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo ==========================================
echo.

:: ============================================================
::  ON KONTROL: onceki calismadan kalinti surecleri temizle
:: ============================================================
echo [0/6] Eski kalinti surecleri temizleniyor...
set "KILL_LIST="
for /f "tokens=1,2" %%P in ('tasklist /FI "IMAGENAME eq dotnet.exe" /NH 2^>nul ^| findstr /i "dotnet.exe"') do (
    echo   Eski dotnet PID: %%2
    set "KILL_LIST=!KILL_LIST! /PID %%2"
)
for /f "tokens=1,2" %%P in ('tasklist /FI "IMAGENAME eq python.exe" /NH 2^>nul ^| findstr /i "python.exe"') do (
    echo   Eski python PID: %%2
    set "KILL_LIST=!KILL_LIST! /PID %%2"
)
if defined KILL_LIST (
    taskkill /F !KILL_LIST! >nul 2>&1
    ping -n 3 127.0.0.1 >nul 2>&1
    echo   OK Kalintilar temizlendi.
) else (
    echo   OK Kalinti surec yok.
)
echo.

:: ============================================================
::  ADIM 1: .NET SDK KONTROL
:: ============================================================
echo [1/6] .NET SDK kontrol ediliyor...
where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] dotnet bulunamadi! .NET SDK kurulu degil.
    goto :error
)
for /f "tokens=*" %%v in ('dotnet --version 2^>nul') do set "DOTNET_VER=%%v"
echo   OK .NET SDK: %DOTNET_VER%

:: Proje dosyasi mevcut mu?
if not exist "%BACKEND_PROJECT%" (
    echo [HATA] Backend projesi bulunamadi: %BACKEND_PROJECT%
    goto :error
)
echo   OK Backend projesi: %BACKEND_PROJECT%
echo.

:: ============================================================
::  ADIM 2: PYTHON KONTROL
:: ============================================================
echo [2/6] Python kontrol ediliyor...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] python bulunamadi! Python 3 kurulu degil.
    goto :error
)
for /f "tokens=*" %%v in ('python --version 2^>nul') do set "PY_VER=%%v"
echo   OK %PY_VER%

if not exist "%FRONTEND_DIR%" (
    echo [HATA] Frontend klasoru bulunamadi: %FRONTEND_DIR%
    goto :error
)
echo   OK Frontend klasoru: %FRONTEND_DIR%
echo.

:: ============================================================
::  ADIM 3: SQL Server LocalDB KONTROL, BASLATMA ve DOGRULAMA
:: ============================================================
echo [3/6] SQL Server LocalDB kontrol ediliyor...
where sqllocaldb >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] sqllocaldb bulunamadi! SQL Server Express LocalDB kurulu degil.
    goto :error
)

:: Instance yoksa olustur
sqllocaldb info %LOCALDB_INSTANCE% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   Instance olusturuluyor...
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [HATA] LocalDB instance olusturulamadi.
        goto :error
    )
)

:: Baslat (calismiyorsa)
set "DB_RUNNING=0"
for /f "tokens=2 delims=:" %%s in ('sqllocaldb info %LOCALDB_INSTANCE% ^| findstr /i "State"') do (
    set "RAW_STATE=%%s"
)
echo !RAW_STATE! | findstr /i "Running" >nul 2>&1
if !ERRORLEVEL! equ 0 set "DB_RUNNING=1"

if "!DB_RUNNING!"=="0" (
    echo   LocalDB baslatiliyor...
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    :: LocalDB tam olarak ayaga kalkmasi icin pencere aciliyor
    ping -n 4 127.0.0.1 >nul 2>&1
)

:: Pipe adini al ve bos ise instance'i yenile (SSPI tespiti)
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
    ping -n 2 127.0.0.1 >nul 2>&1
    sqllocaldb create %LOCALDB_INSTANCE% >nul 2>&1
    sqllocaldb start %LOCALDB_INSTANCE% >nul 2>&1
    ping -n 5 127.0.0.1 >nul 2>&1

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

:: Gercek baglanti testi (SSPI sorununu erken yakalar)
echo   Baglanti testi yapiliyor...
set "DB_CONN_TEST=Data Source=(localdb)\%LOCALDB_INSTANCE%;Initial Catalog=FitnesPro;Integrated Security=True;Connect Timeout=8"
set "DB_TEST_OUT="
for /f "tokens=*" %%r in ('sqlcmd -S "(localdb)\%LOCALDB_INSTANCE%" -d FitnesPro -E -Q "SELECT 1" -h -1 -W 2^>nul') do (
    if not defined DB_TEST_OUT set "DB_TEST_OUT=%%r"
)
echo   DB test cevabi: "!DB_TEST_OUT!"
if /i "!DB_TEST_OUT!" neq "1" (
    echo   [UYARI] FitnesPro veritabanina dogrudan baglanti kurulamadi.
    echo            Backend bunu deneyecek ve tablo olusturacak; sorun yok demektir.
    echo            (Eger "SSPI" hatasi gorurseniz, Windows oturumunu yeniden acin.)
) else (
    echo   OK Veritabanina dogrudan erisim saglandi.
)
echo.

:: ============================================================
::  ADIM 4: PORTLARI KONTROL ET VE TEMIZLE (IPv4 + IPv6)
:: ============================================================
echo [4/6] Portlar kontrol ediliyor...
call :free_port %BACKEND_PORT%
call :free_port %FRONTEND_PORT%
echo.

:: ============================================================
::  ADIM 5: BACKEND ve FRONTEND AYRI PENCERELERDE BASLA
:: ============================================================
echo [5/6] Servisler baslatiliyor...
echo.

:: --- Backend icin yardimci .cmd dosyasi yaz (start ... cmd /k karmasasini onler) ---
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

:: --- Frontend icin yardimci .cmd dosyasi yaz ---
> "%PROJECT_ROOT%\Fronted\run-frontend.cmd" (
    echo @echo off
    echo title Fitness Pro - FRONTEND port %FRONTEND_PORT%
    echo color 0B
    echo cd /d "%FRONTEND_DIR%"
    echo.
    echo echo === FRONTEND http://localhost:%FRONTEND_PORT% ===
    echo.
    echo python -m http.server %FRONTEND_PORT%
)

:: --- Backend penceresi (yardimci .cmd direkt calistir) ---
start "Fitness Pro - BACKEND port %BACKEND_PORT%" "%PROJECT_ROOT%\Backend\run-backend.cmd"

:: Backend'in /health uclusu kontrol edilene kadar bekle
echo   Backend ayaga kalkmasi bekleniyor (max %BACKEND_TIMEOUT% sn)...
set "BE_OK=0"
set "BE_WAIT=0"
:be_wait_loop
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%BACKEND_HEALTH%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { 0 }" > "%TEMP%\be_health.txt" 2>nul
    set /p BE_HTTP=<"%TEMP%\be_health.txt" 2>nul
    if "!BE_HTTP!"=="200" (
        set "BE_OK=1"
        echo   OK Backend saglikli HTTP 200 - !BE_WAIT! saniye bekledi.
        goto :be_ready
    )
    set /a BE_WAIT+=1
    if !BE_WAIT! geq %BACKEND_TIMEOUT% goto :be_ready
    set /p "=." <nul
    ping -n 2 127.0.0.1 >nul 2>&1
goto :be_wait_loop
:be_ready
echo.
if "!BE_OK!"=="0" (
    echo.
    echo [HATA] Backend %BACKEND_TIMEOUT% saniye icinde yanit vermedi.
    echo        Backend penceresini kontrol edin. Sik sorunlar:
    echo        - SQL Server LocalDB bozuk
    echo        - Port %BACKEND_PORT% baska surec tarafindan tutuluyor
    echo        - .NET 10 SDK kurulu degil
    goto :error
)
echo.

:: --- Frontend penceresi ---
start "Fitness Pro - FRONTEND port %FRONTEND_PORT%" "%PROJECT_ROOT%\Fronted\run-frontend.cmd"

:: Frontend'in HTTP 200 dondurmesi beklenir
echo   Frontend ayaga kalkmasi bekleniyor (max %FRONTEND_TIMEOUT% sn)...
set "FE_OK=0"
set "FE_WAIT=0"
:fe_wait_loop
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%FRONTEND_HEALTH%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { 0 }" > "%TEMP%\fe_health.txt" 2>nul
    set /p FE_HTTP=<"%TEMP%\fe_health.txt" 2>nul
    if "!FE_HTTP!"=="200" (
        set "FE_OK=1"
        echo   OK Frontend saglikli HTTP 200 - !FE_WAIT! saniye bekledi.
        goto :fe_ready
    )
    set /a FE_WAIT+=1
    if !FE_WAIT! geq %FRONTEND_TIMEOUT% goto :fe_ready
    set /p "=." <nul
    ping -n 2 127.0.0.1 >nul 2>&1
goto :fe_wait_loop
:fe_ready
echo.
if "!FE_OK!"=="0" (
    echo.
    echo [HATA] Frontend %FRONTEND_TIMEOUT% saniye icinde yanit vermedi.
    echo        Frontend penceresini kontrol edin.
    goto :error
)
echo.

:: ============================================================
::  ADIM 6: CLEANUP SCRIPT + TARAYICI
:: ============================================================
echo [6/6] Tarayici aciliyor...

:: stop-all.bat yardimci dosyasi olustur (BASIT: for-dongusu yok, sadece taskkill /IM)
(
    echo @echo off
    echo title Fitness Pro - Durdur
    echo echo Tum servisler durduruluyor...
    echo taskkill /F /IM dotnet.exe 2^>nul
    echo taskkill /F /IM python.exe 2^>nul
    echo sqllocaldb stop %LOCALDB_INSTANCE% 2^>nul
    echo echo Tamam. Tum servisler durduruldu.
    echo pause
) > "%PROJECT_ROOT%\stop-all.bat"
echo   Yardimci: %PROJECT_ROOT%\stop-all.bat

start "" "http://localhost:%FRONTEND_PORT%/Ba%%C5%%9Flang%%C4%%B1c.html"

echo.
echo ==========================================
echo   SERVISLER HAZIR  -  TUM KONTROLLER GECTI
echo ==========================================
echo   Backend   : http://localhost:%BACKEND_PORT%/swagger
echo   Frontend  : http://localhost:%FRONTEND_PORT%
echo   Health    : %BACKEND_HEALTH%
echo ==========================================
echo   Tum servisleri durdurmak icin stop-all.bat calistirin
echo   ya da her iki pencereyi kapatip Ctrl+C basin.
echo.
pause
goto :eof

:: ============================================================
::  YARDIMCI FONKSIYONLAR
:: ============================================================

:free_port
set "FPORT=%~1"
set "FOUND_PIDS="

:: Hem IPv4 hem IPv6 uzerinden dINLEyen surecleri yakala
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%FPORT% " ^| findstr "LISTENING"') do (
    if not defined FOUND_PIDS set "FOUND_PIDS=%%p"
)
if defined FOUND_PIDS (
    echo   Port %FPORT% PID !FOUND_PIDS! tarafindan kullaniliyor, kapatiliyor...
    for %%P in (!FOUND_PIDS!) do taskkill /F /PID %%P >nul 2>&1
    ping -n 2 127.0.0.1 >nul 2>&1
    :: Serbest kaldigini tekrar dogrula
    netstat -ano 2^>nul | findstr ":%FPORT% " | findstr "LISTENING" >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo   OK Port %FPORT% serbest birakildi.
    ) else (
        echo   [UYARI] Port %FPORT% hala mesgul gorunuyor; devam ediliyor.
    )
) else (
    echo   OK Port %FPORT% zaten serbest.
)
goto :eof

:error
echo.
echo ========================================
echo   BASLATMA BASARISIZ!
echo   Olasi nedenler:
echo     1) SQL Server LocalDB bozuk ^(ssms yeniden kurun^)
echo     2) .NET 10 SDK kurulu degil
echo     3) Port %BACKEND_PORT% veya %FRONTEND_PORT% tutuluyor
echo     4) Eski dotnet/python surecleri kalmis
echo ========================================
echo.
echo Devam etmek isterseniz yeni bir terminal ile tekrar deneyin.
echo.
pause
exit /b 1
