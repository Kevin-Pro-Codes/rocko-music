@echo off
setlocal
chcp 65001 >nul
title ROCKO

echo ========================================================
echo                 INICIANDO ROCKO MUSIC
echo ========================================================
echo.

REM Verifica o diretorio do script ou o diretorio padrao do projeto
set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%server\package.json" (
    set "PROJECT_DIR=c:\Users\Kevin\Documents\PROJECTS\Rocko\Rocko\"
)

if not exist "%PROJECT_DIR%server\package.json" (
    echo [ERRO] O diretorio do projeto Rocko nao foi encontrado:
    echo %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

echo [1/3] Liberando portas 3001 e 5173 caso estejam ocupadas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/3] Iniciando Servidor Backend (Porta 3001)...
start "Rocko Backend" cmd /c "cd /d "%PROJECT_DIR%server" && npm run dev || pause"

echo [3/3] Iniciando Cliente Web (Porta 5173)...
start "Rocko Frontend" cmd /c "cd /d "%PROJECT_DIR%client" && npm run dev || pause"

echo.
echo Aguardando inicializacao dos servicos...
timeout /t 3 /nobreak >nul

echo Abrindo Rocko no seu navegador...
start "" "http://localhost:5173"

echo.
echo ========================================================
echo          ROCKO esta em execucao com sucesso!
echo          Interface: http://localhost:5173
echo ========================================================
echo.
timeout /t 5 >nul
