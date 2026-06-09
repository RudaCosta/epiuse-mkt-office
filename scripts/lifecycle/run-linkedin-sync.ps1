# Sync LinkedIn: regenera public/api/linkedin-historical.json a partir do XLS da Bruna
# (Desktop/ROADMAP.../03 LinkedIn Boost) + reports PPTX. Merge defensivo preserva
# entradas "manual" e cumulativos. NAO faz push (Regra 3) -- so regenera local.
# Localhost pega na hora (arquivo estatico). Railway pega no proximo push autorizado.
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)
# Uso: .\run-linkedin-sync.ps1

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\server.js")) { $root = 'C:\epiuse-mkt-office' }
$log  = "$root\logs\linkedin-sync.log"
$dir  = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] === iniciando linkedin sync ===")

$py = "$root\scripts\sync\sync_linkedin_historical.py"
if (-not (Test-Path $py)) {
  Add-Content $log ("[" + $ts + "] ERRO: script nao encontrado: " + $py)
  exit 1
}

$out = & python $py 2>&1
foreach ($line in $out) { Add-Content $log ("[" + $ts + "] " + $line) }

$json = "$root\public\api\linkedin-historical.json"
if ((Test-Path $json) -and (Get-Item $json).Length -gt 1000) {
  $msg = "[" + (Get-Date -Format s) + "] OK -- JSON regenerado (" + [int]((Get-Item $json).Length/1024) + "KB). Lembre de subir (Regra 3) pra propagar no Railway."
  Add-Content $log $msg
  Write-Host $msg
} else {
  $msg = "[" + (Get-Date -Format s) + "] ERRO -- JSON nao gerado ou vazio"
  Add-Content $log $msg
  Write-Host $msg -ForegroundColor Red
  exit 1
}
