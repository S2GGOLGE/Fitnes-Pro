@echo off
setlocal EnableExtensions
title Fitness Pro - Cloudflare Quick Tunnels
color 0B

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo ===========================================================
echo   FITNESS PRO - CLOUDFLARE QUICK TUNNELS
echo ===========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%PROJECT_ROOT%\start-cloudflare.ps1"
