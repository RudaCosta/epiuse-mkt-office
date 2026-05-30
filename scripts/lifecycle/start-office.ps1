# ============================================================================
# EPI-USE Office - Start (hidden, idempotente)
# Sobe o server Node em janela oculta. Se ja estiver servindo na porta, nao duplica.
# Logs em logs/office.log + logs/office.err.log
# Chamado por: Tarefa Agendada (at logon) e office-health.ps1
# (ASCII-only: PowerShell 5.1 quebra com acentos em .ps1 sem BOM)
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'

$AppDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent   # .../modulo-a-profile-optimizer
$Port   = if ($env:PORT) { $env:PORT } else { 3000 }
$LogDir = Join-Path $AppDir 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$OutLog = Join-Path $LogDir 'office.log'
$ErrLog = Join-Path $LogDir 'office.err.log'

# Ja esta servindo? entao nao faz nada (idempotente)
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Add-Content $OutLog ("[" + (Get-Date -Format s) + "] start-office: ja servindo na porta " + $Port + " - nada a fazer.")
  exit 0
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Add-Content $ErrLog ("[" + (Get-Date -Format s) + "] ERRO: node nao encontrado no PATH."); exit 1 }

Add-Content $OutLog ("[" + (Get-Date -Format s) + "] start-office: subindo server.js (porta " + $Port + ")...")
Start-Process -FilePath $node `
  -ArgumentList 'server.js' `
  -WorkingDirectory $AppDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError  $ErrLog
exit 0
