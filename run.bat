@echo off
setlocal
chcp 65001 >nul
title Rocko Launcher

echo ===================================================
echo             Iniciando Aplicacao Rocko              
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"

echo Liberando portas 3001 e 5173 caso estejam ocupadas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [1/2] Iniciando Servidor Backend (API)...
start "Rocko Backend" cmd /c "cd /d "%ROOT_DIR%server" && npm run dev || pause"

echo [2/2] Iniciando Cliente Frontend (Vite)...
start "Rocko Frontend" cmd /c "cd /d "%ROOT_DIR%client" && npm run dev || pause"

echo.
echo ===================================================
echo Backend e Frontend foram iniciados!
echo URL: http://localhost:5173
echo ===================================================
echo.
timeout /t 5 >nul
