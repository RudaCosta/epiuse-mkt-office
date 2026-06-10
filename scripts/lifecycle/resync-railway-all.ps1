# Re-sync TODOS os datasets pro Railway de uma vez (workaround até D1 Volume).
# Roda após cada deploy: cases + SAP 4 ME + calendar (Duda + Redatoria).
# ASCII-only. Uso: .\resync-railway-all.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\server.js")) { $root = 'C:\epiuse-mkt-office' }
$RAILWAY = 'https://epiuse-voices-optimizer.up.railway.app'
$token = 'eubr-voices-edit-2026'
$log = "$root\logs\resync-railway.log"
$dir = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] === resync-railway-all ===")

function Log($m) { Add-Content $log ("[" + (Get-Date -Format s) + "] " + $m); Write-Host $m }

# 1. Cases (Roberto)
$tmp = "$env:TEMP\cases-resync.json"
& node "$root\scripts\sync\sync_cases_roberto.js" 2>$null | Out-File -FilePath $tmp -Encoding utf8
if ((Test-Path $tmp) -and (Get-Item $tmp).Length -gt 50) {
  try { $r = Invoke-RestMethod -Uri "$RAILWAY/api/cases/sync" -Method POST -ContentType 'application/json' -Headers @{ 'X-Editor-Token'=$token } -InFile $tmp -TimeoutSec 30
    Log ("Cases OK: " + ($r | ConvertTo-Json -Compress)) } catch { Log ("Cases ERRO: " + $_.Exception.Message) }
}
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

# 2. SAP 4 ME (POST direto via script)
& node "$root\scripts\sync\sync_clientes_sap_4me.js" --target railway 2>&1 | Where-Object { $_ -match 'sap4me' } | ForEach-Object { Log $_ }

# 2b. Zoho deals (extrai do SQLite local — sync original e via MCP em sessao Claude)
$zohoTmp = "$env:TEMP\zoho-resync.json"
$zohoScript = @"
const path = require('path');
const Database = require(path.join('C:/Users/Ruds/.epiuse-optimizer/node_modules', 'better-sqlite3'));
const db = new Database('C:/Users/Ruds/.epiuse-optimizer/db.sqlite', { readonly: true });
const rows = db.prepare('SELECT * FROM zoho_deals').all();
require('fs').writeFileSync(process.argv[1], JSON.stringify({ deals: rows }));
console.log(rows.length);
"@
$zohoCount = & node -e $zohoScript $zohoTmp 2>$null
if ((Test-Path $zohoTmp) -and (Get-Item $zohoTmp).Length -gt 50) {
  try { $r = Invoke-RestMethod -Uri "$RAILWAY/api/zoho/sync" -Method POST -ContentType 'application/json' -Headers @{ 'X-Editor-Token'=$token } -InFile $zohoTmp -TimeoutSec 30
    Log ("Zoho OK ($zohoCount deals): " + ($r | ConvertTo-Json -Compress)) } catch { Log ("Zoho ERRO: " + $_.Exception.Message) }
}
Remove-Item $zohoTmp -Force -ErrorAction SilentlyContinue

# 3. Calendar Duda + Redatoria (env OFFICE_URL aponta pro Railway)
$env:OFFICE_URL = $RAILWAY
& node "$root\scripts\sync\sync_calendario_duda.js" 2>&1 | Where-Object { $_ -match 'OK|ERRO' } | ForEach-Object { Log $_ }
& node "$root\scripts\sync\sync_redatoria_to_calendar.js" 2>&1 | Where-Object { $_ -match 'OK|Total|ERRO' } | ForEach-Object { Log $_ }
Remove-Item Env:\OFFICE_URL -ErrorAction SilentlyContinue

Log "resync-railway-all FIM"
