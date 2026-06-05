# Wrapper da Tarefa Agendada diaria do Apollo sync (ASCII-only)
# A key vem do .env off-repo (lido pelo proprio apollo_pipeline_sync.js)
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\rudac\OneDrive\Documents\GitHub\epiuse-mkt-office'
$log = "$root\logs\apollo-sync.log"
$dir = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
Add-Content $log ("[" + (Get-Date -Format s) + "] iniciando apollo sync...")
& node "$root\scripts\integrations\apollo_pipeline_sync.js" 2>&1 | Add-Content $log
Add-Content $log ("[" + (Get-Date -Format s) + "] fim.")
