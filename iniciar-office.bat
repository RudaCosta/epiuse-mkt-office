@echo off
REM ============================================================================
REM EPI-USE Office — Inicializador local (v0.5.0)
REM Roda o servidor Node + abre o browser em localhost:3000
REM
REM USO: duplo-clique neste arquivo OU executar via PowerShell
REM PARA PARAR: feche a janela do terminal que aparece
REM ============================================================================

cd /d "G:\Meu Drive\Claude MKT EUBR\modulo-a-profile-optimizer"

echo.
echo ===============================================
echo   EPI-USE Office — iniciando servidor...
echo ===============================================
echo.
echo   Server: http://localhost:3000
echo   Logs:   nesta janela (Ctrl+C para parar)
echo.
echo ===============================================
echo.

REM Abre o browser em 3s (depois do server subir)
start /min powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'"

REM Roda o server (segura a janela aberta)
npm start
