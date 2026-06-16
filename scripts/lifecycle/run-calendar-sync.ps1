# EPI-USE Office - Sync diario do Calendario Editorial (Duda + Redatoria) -> Railway prod.
# Le os xlsx (OneDrive Duda + planilha Redatoria) e POSTa pra /api/inbound/calendar do Railway.
# Resolve a queixa: calendario nao atualizava sozinho quando a Duda editava a planilha.
# Registrado como tarefa diaria 'EPI-USE-Office-Calendar-Sync'. ASCII-only.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\epiuse-mkt-office'
$RAILWAY = 'https://epiuse-voices-optimizer.up.railway.app'
$log = "$root\logs\calendar-sync.log"
$dir = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
function Log($m) { Add-Content $log ("[" + (Get-Date -Format s) + "] " + $m); Write-Host $m }

Log "=== calendar-sync inicio ==="
$env:OFFICE_URL = $RAILWAY
& node "$root\scripts\sync\sync_calendario_duda.js" 2>&1 | Where-Object { $_ -match 'OK|ERRO|itens' } | ForEach-Object { Log $_ }
& node "$root\scripts\sync\sync_redatoria_to_calendar.js" 2>&1 | Where-Object { $_ -match 'OK|ERRO|itens|Total' } | ForEach-Object { Log $_ }
Remove-Item Env:\OFFICE_URL -ErrorAction SilentlyContinue
Log "=== calendar-sync fim ==="
