@echo off
title Fitness Pro - FRONTEND port 3000
color 0B
cd /d "C:\Projects\Fitnes-Pro\Fronted"

echo ============================================================
echo   FRONTEND - http://localhost:3000
echo   Serving : C:\Projects\Fitnes-Pro\Fronted
echo   Backend : http://localhost:8081
echo ============================================================
echo.

python -m http.server 3000 --bind 127.0.0.1