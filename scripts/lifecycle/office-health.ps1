# ============================================================================
# EPI-USE Office - Healthcheck + auto-restart
# Bate em /api/health. Se nao responder, chama start-office.ps1.
# Agendado pra rodar a cada 5 min. (ASCII-only)
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$Port = if ($env:PORT) { $env:PORT } else { 3000 }
$LogDir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$Log = Join-Path $LogDir 'office-health.log'

$ok = $false
try {
  $r = Invoke-WebRequest -Uri ("http://localhost:" + $Port + "/api/health") -TimeoutSec 5 -UseBasicParsing
  if ($r.StatusCode -eq 200) { $ok = $true }
} catch { $ok = $false }

if ($ok) {
  Add-Content $Log ("[" + (Get-Date -Format s) + "] health OK")
} else {
  Add-Content $Log ("[" + (Get-Date -Format s) + "] health FALHOU - reiniciando...")
  & (Join-Path $PSScriptRoot 'start-office.ps1')
}
