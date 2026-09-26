@echo off
title Fitness Pro - BACKEND port 5000
color 0A
cd /d "C:\Projects\Fitnes-Pro\Backend\Gym-Pro-Api\Gym-Pro-Api"
set ASPNETCORE_ENVIRONMENT=Development
set ASPNETCORE_URLS=http://localhost:5000

echo === BACKEND http://localhost:5000 ===

dotnet run --project "C:\Projects\Fitnes-Pro\Backend\Gym-Pro-Api\Gym-Pro-Api\Gym-Pro-Api.csproj" --no-launch-profile --configuration Debug
