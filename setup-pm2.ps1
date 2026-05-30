# ============================================================================
# EPI-USE Office — Setup PM2 (lifecycle 24/7)
# Roda 1 VEZ. Depois o Office sobe junto com Windows e nunca mais cai.
#
# USO:
#   Right-click → "Run with PowerShell" (precisa Admin pra pm2-startup)
#   OU PowerShell admin → cd "G:\Meu Drive\Claude MKT EUBR\modulo-a-profile-optimizer"
#                       → .\setup-pm2.ps1
#
# DEPOIS DE RODAR:
#   pm2 status              ← ver se Office tá vivo
#   pm2 logs epi-office     ← ver logs em tempo real
#   pm2 stop epi-office     ← desligar quando quiser
#   pm2 start epi-office    ← ligar de novo
#   pm2 restart epi-office  ← reiniciar
# ============================================================================

$ErrorActionPreference = "Stop"
$ROOT = "G:\Meu Drive\Claude MKT EUBR\modulo-a-profile-optimizer"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  EPI-USE Office — Setup PM2 (lifecycle 24/7)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verificar Node ────────────────────────────────────────────────
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Yellow
$nodeVer = node --version 2>$null
if (-not $nodeVer) {
    Write-Host "  ❌ Node não encontrado. Instala Node 18+ primeiro: https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Node $nodeVer" -ForegroundColor Green

# ── 2. Instalar PM2 global ──────────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Instalando PM2 global..." -ForegroundColor Yellow
$pm2Ver = pm2 --version 2>$null
if ($pm2Ver) {
    Write-Host "  ✅ PM2 $pm2Ver já instalado" -ForegroundColor Green
} else {
    npm install -g pm2 2>&1 | Out-Null
    Write-Host "  ✅ PM2 instalado" -ForegroundColor Green
}

# ── 3. Instalar pm2-windows-startup ─────────────────────────────────
Write-Host ""
Write-Host "[3/6] Instalando pm2-windows-startup (boot integration)..." -ForegroundColor Yellow
$startupVer = npm list -g pm2-windows-startup 2>$null | Select-String "pm2-windows-startup"
if ($startupVer) {
    Write-Host "  ✅ pm2-windows-startup já instalado" -ForegroundColor Green
} else {
    npm install -g pm2-windows-startup 2>&1 | Out-Null
    Write-Host "  ✅ Instalado" -ForegroundColor Green
}

# ── 4. Parar processo anterior (se houver) ──────────────────────────
Write-Host ""
Write-Host "[4/6] Limpando estado anterior..." -ForegroundColor Yellow
pm2 delete epi-office 2>$null | Out-Null
Get-Process node -EA SilentlyContinue | Where-Object { $_.Path -like "*epi-use*" -or $_.MainWindowTitle -like "*epi-use*" } | Stop-Process -Force -EA SilentlyContinue
Write-Host "  ✅ Limpo" -ForegroundColor Green

# ── 5. Iniciar Office via PM2 ───────────────────────────────────────
Write-Host ""
Write-Host "[5/6] Iniciando Office via PM2..." -ForegroundColor Yellow
Set-Location $ROOT

# Garante npm install se faltar
if (-not (Test-Path "$ROOT\node_modules")) {
    Write-Host "  Instalando dependências npm (primeira vez, ~1min)..." -ForegroundColor Yellow
    npm install 2>&1 | Out-Null
}

# Start com flags úteis:
# --name epi-office      nome legível
# --watch                reinicia se arquivos mudarem (NÃO recomendado em prod, mas ok local)
# --max-memory-restart   reinicia se passar de 512MB (evita leak)
# --time                 timestamps nos logs
pm2 start server.js `
    --name epi-office `
    --max-memory-restart 512M `
    --time `
    --env NODE_ENV=development `
    --env PORT=3000

Write-Host "  ✅ Office iniciado" -ForegroundColor Green

# ── 6. Salvar + configurar boot ─────────────────────────────────────
Write-Host ""
Write-Host "[6/6] Configurando boot automático..." -ForegroundColor Yellow
pm2 save 2>&1 | Out-Null
Write-Host "  ✅ Estado salvo (PM2 vai restaurar Office no reboot)" -ForegroundColor Green

# pm2-startup install precisa Admin — checa
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    pm2-startup install 2>&1 | Out-Null
    Write-Host "  ✅ Boot automático configurado (Office sobe junto com Windows)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Pra configurar boot automático: rode num PowerShell ADMIN:" -ForegroundColor Yellow
    Write-Host "      pm2-startup install" -ForegroundColor Cyan
    Write-Host "  Sem isso, vc precisa rodar 'pm2 resurrect' depois de cada reboot" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ✅ TUDO PRONTO — Office vivo em http://localhost:3000" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Cyan
Write-Host "  pm2 status              # Ver status do Office"
Write-Host "  pm2 logs epi-office     # Ver logs em tempo real (Ctrl+C pra sair)"
Write-Host "  pm2 restart epi-office  # Reiniciar (após mudar código grande)"
Write-Host "  pm2 stop epi-office     # Desligar"
Write-Host "  pm2 start epi-office    # Ligar de novo"
Write-Host "  pm2 monit               # Monitor visual (CPU/RAM em tempo real)"
Write-Host ""
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
