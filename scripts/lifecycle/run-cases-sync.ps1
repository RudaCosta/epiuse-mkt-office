# Wrapper da Tarefa Agendada diaria de sync Cases (Roberto OneDrive -> Office localhost)
# Le xlsx via sync_cases_roberto.py e POSTa pra /api/cases/sync com X-Editor-Token
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\rudac\OneDrive\Documents\GitHub\epiuse-mkt-office'
$log = "$root\logs\cases-sync.log"
$dir = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] iniciando cases sync...")

# 1. Extrai JSON do xlsx
$tmp = "$env:TEMP\cases-payload.json"
try {
  & python "$root\scripts\sync\sync_cases_roberto.py" 2>&1 | Out-File -FilePath $tmp -Encoding utf8
} catch {
  Add-Content $log ("[" + $ts + "] ERRO python: " + $_.Exception.Message)
  exit 1
}
if (-not (Test-Path $tmp) -or (Get-Item $tmp).Length -lt 50) {
  Add-Content $log ("[" + $ts + "] payload vazio/invalido — abortando")
  exit 1
}

# 2. POST localhost
$token = 'eubr-voices-edit-2026'
try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:3000/api/cases/sync' -Method POST `
    -ContentType 'application/json' `
    -Headers @{ 'X-Editor-Token' = $token } `
    -InFile $tmp
  Add-Content $log ("[" + $ts + "] OK: " + ($resp | ConvertTo-Json -Compress -Depth 3))
} catch {
  Add-Content $log ("[" + $ts + "] ERRO POST: " + $_.Exception.Message)
  exit 1
}

Remove-Item $tmp -Force -ErrorAction SilentlyContinue
Add-Content $log ("[" + (Get-Date -Format s) + "] fim.")
