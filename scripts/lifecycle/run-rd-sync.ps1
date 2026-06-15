# Sync RD Station: aciona a sincronização das campanhas do RD Station
# (emails, landing pages, popups) e insere no SQLite.
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)
# Uso: .\run-rd-sync.ps1

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\server.js")) { $root = 'C:\epiuse-mkt-office' }
$log  = "$root\logs\rd-sync.log"
$dir  = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] === iniciando rd-station sync ===")

$js = "$root\scripts\sync\sync_rd_station.js"
if (-not (Test-Path $js)) {
  Add-Content $log ("[" + $ts + "] ERRO: script nao encontrado: " + $js)
  exit 1
}

$out = & node $js 2>&1
foreach ($line in $out) { Add-Content $log ("[" + $ts + "] " + $line) }

$ts_end = (Get-Date -Format s)
Add-Content $log ("[" + $ts_end + "] === rd-station sync finalizado ===")
Write-Host "[$ts_end] OK -- Sincronizacao RD Station executada. Verifique os logs em: $log"
