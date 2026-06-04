# Sync Cases: Roberto OneDrive xlsx -> todos os targets (localhost + Railway + site oficial)
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)
# Uso: .\run-cases-sync.ps1 [-Target all|local|railway|site]
param(
  [string]$Target = 'all'
)

$ErrorActionPreference = 'SilentlyContinue'
$root  = 'C:\Users\rudac\OneDrive\Documents\GitHub\epiuse-mkt-office'
$log   = "$root\logs\cases-sync.log"
$dir   = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] === iniciando cases sync (target=$Target) ===")

# ── 1. EXTRAI JSON DO XLSX ────────────────────────────────────────────────────
# Usa Node.js (sync_cases_roberto.js) -- disponivel em qualquer maquina com Node
# Fallback: Python (sync_cases_roberto.py) -- requer pandas instalado
$tmp = "$env:TEMP\cases-payload.json"
$jsScript  = "$root\scripts\sync\sync_cases_roberto.js"
$pyScript  = "$root\scripts\sync\sync_cases_roberto.py"

$extracted = $false
if (Test-Path $jsScript) {
  try {
    & node $jsScript 2>&1 | Out-File -FilePath $tmp -Encoding utf8
    $extracted = $true
    Add-Content $log ("[" + $ts + "] xlsx extraido via Node.js")
  } catch {
    Add-Content $log ("[" + $ts + "] WARN node falhou, tentando python: " + $_.Exception.Message)
  }
}
if (-not $extracted -and (Test-Path $pyScript)) {
  try {
    & python $pyScript 2>&1 | Out-File -FilePath $tmp -Encoding utf8
    $extracted = $true
    Add-Content $log ("[" + $ts + "] xlsx extraido via Python")
  } catch {
    Add-Content $log ("[" + $ts + "] ERRO python: " + $_.Exception.Message)
  }
}
if (-not $extracted) {
  Add-Content $log ("[" + $ts + "] ERRO: nem Node nem Python conseguiram extrair o xlsx")
  exit 1
}
if (-not (Test-Path $tmp) -or (Get-Item $tmp).Length -lt 50) {
  Add-Content $log ("[" + $ts + "] payload vazio/invalido -- abortando")
  exit 1
}
Add-Content $log ("[" + $ts + "] payload OK: " + (Get-Item $tmp).Length + " bytes")

# ── 2. DEFINE TARGETS ─────────────────────────────────────────────────────────
$token = 'eubr-voices-edit-2026'

$targets = @()

if ($Target -eq 'all' -or $Target -eq 'local') {
  $targets += @{ name = 'localhost'; url = 'http://localhost:3000/api/cases/sync' }
}
if ($Target -eq 'all' -or $Target -eq 'railway') {
  $targets += @{ name = 'Railway'; url = 'https://epiuse-voices-optimizer.up.railway.app/api/cases/sync' }
}
# Site oficial (www.epiuse.com.br) -- ativar quando API estiver disponivel no FTP
# if ($Target -eq 'all' -or $Target -eq 'site') {
#   $targets += @{ name = 'epiuse.com.br'; url = 'https://www.epiuse.com.br/api/cases/sync' }
# }

# ── 3. POST PARA CADA TARGET ──────────────────────────────────────────────────
$ok    = 0
$fails = 0

foreach ($t in $targets) {
  $ts2 = (Get-Date -Format s)
  try {
    $resp = Invoke-RestMethod -Uri $t.url -Method POST `
      -ContentType 'application/json' `
      -Headers @{ 'X-Editor-Token' = $token } `
      -InFile $tmp `
      -TimeoutSec 30
    $msg = "[" + $ts2 + "] OK [" + $t.name + "]: " + ($resp | ConvertTo-Json -Compress -Depth 3)
    Add-Content $log $msg
    Write-Host $msg
    $ok++
  } catch {
    $msg = "[" + $ts2 + "] ERRO [" + $t.name + "]: " + $_.Exception.Message
    Add-Content $log $msg
    Write-Host $msg -ForegroundColor Red
    $fails++
  }
}

Remove-Item $tmp -Force -ErrorAction SilentlyContinue

$fin = "[" + (Get-Date -Format s) + "] fim. OK=$ok FAIL=$fails"
Add-Content $log $fin
Write-Host $fin
if ($fails -gt 0) { exit 1 }
