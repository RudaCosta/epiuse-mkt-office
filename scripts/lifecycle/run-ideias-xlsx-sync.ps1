# ============================================================================
# Sync Ideias -> planilha OneDrive (espelho do Mural). Roda local (acesso OneDrive).
# Anexa ideias novas no xlsx; OneDrive sincroniza pro SharePoint sozinho.
# Chamado por Tarefa Agendada (a cada 2h). ASCII-only.
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$AppDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$LogDir = Join-Path $AppDir 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$Log = Join-Path $LogDir 'ideias-xlsx-sync.log'
$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { Add-Content $Log ("[" + (Get-Date -Format s) + "] ERRO: python nao encontrado"); exit 1 }
$script = Join-Path $AppDir 'scripts\sync\sync_ideias_to_xlsx.py'
$env:PYTHONUTF8 = '1'
$out = & $py $script railway 2>&1
Add-Content $Log ("[" + (Get-Date -Format s) + "] " + ($out -join ' | '))
