@echo off
setlocal
rem ============================================================
rem  FITNESS PRO - SYSTEM START
rem  Delegates directly to start-all.bat
rem ============================================================
call "%~dp0start-all.bat"
exit /b %ERRORLEVEL%
