@echo off
title Fitness Pro - Durdur
echo Tum servisler durduruluyor...
taskkill /F /IM dotnet.exe 2>nul
taskkill /F /IM python.exe 2>nul
sqllocaldb stop MSSQLLocalDB 2>nul
echo Tamam. Tum servisler durduruldu.
pause
