# Rotina diaria LinkedIn (Cowork): le routines/Linkedin Follower Routine.xlsx
# e regenera public/api/linkedin-routine.json (seguidores + posts que performaram).
# NAO faz push (Regra 3) -- so regenera local. Railway pega no proximo push autorizado.
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)
# Uso: .\run-linkedin-routine.ps1

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\server.js")) { $root = 'C:\epiuse-mkt-office' }
$log  = "$root\logs\linkedin-routine.log"
$dir  = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] === iniciando linkedin routine ===")

$xlsx = "$root\routines\Linkedin Follower Routine.xlsx"
if (-not (Test-Path $xlsx)) {
  Add-Content $log ("[" + $ts + "] ERRO: xlsx nao encontrado: " + $xlsx)
  exit 1
}

$py = "$root\scripts\integrations\linkedin_routine.py"
$env:PYTHONIOENCODING = 'utf-8'
$out = & python $py 2>&1
foreach ($line in $out) { Add-Content $log ("[" + $ts + "] " + $line) }

$json = "$root\public\api\linkedin-routine.json"
if ((Test-Path $json) -and (Get-Item $json).Length -gt 500) {
  $msg = "[" + (Get-Date -Format s) + "] OK -- linkedin-routine.json regenerado (" + [int]((Get-Item $json).Length/1024) + "KB). Subir (Regra 3) pra propagar no Railway."
  Add-Content $log $msg
  Write-Host $msg
} else {
  $msg = "[" + (Get-Date -Format s) + "] ERRO -- JSON nao gerado ou vazio"
  Add-Content $log $msg
  Write-Host $msg -ForegroundColor Red
  exit 1
}
