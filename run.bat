@echo off
setlocal
chcp 65001 >nul
title Rocko Launcher

echo ===================================================
echo             Iniciando Aplicacao Rocko              
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"

echo [1/2] Iniciando Servidor Backend (API)...
start "Rocko Backend" cmd /c "cd /d "%ROOT_DIR%server" && npm run dev || pause"

echo [2/2] Iniciando Cliente Frontend (Vite)...
start "Rocko Frontend" cmd /c "cd /d "%ROOT_DIR%client" && npm run dev || pause"

echo.
echo ===================================================
echo Backend e Frontend foram iniciados!
echo ===================================================
echo.
timeout /t 5
