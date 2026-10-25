@echo off
setlocal EnableExtensions
title Fitness Pro - Stop Cloudflare Tunnels

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%\stop-cloudflare.ps1"
exit /b %ERRORLEVEL%
