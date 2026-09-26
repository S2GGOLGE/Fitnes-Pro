@echo off
title Fitness Pro - FRONTEND port 3000
color 0B
cd /d "C:\Projects\Fitnes-Pro\Fronted"

echo === FRONTEND http://localhost:3000 ===

python -m http.server 3000
