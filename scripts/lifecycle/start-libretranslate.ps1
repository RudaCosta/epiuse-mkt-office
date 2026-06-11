# ============================================================================
# LibreTranslate - Start (hidden, idempotente)
# Sobe o LibreTranslate (i18n self-host) na porta 5000. Nao duplica se ja servindo.
# Logs em logs/libretranslate.log + .err.log
# Chamado por: Tarefa Agendada (at logon + health a cada 5 min)
# (ASCII-only: PowerShell 5.1 quebra com acentos sem BOM)
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'

$AppDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$LogDir = Join-Path $AppDir 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$OutLog = Join-Path $LogDir 'libretranslate.log'
$ErrLog = Join-Path $LogDir 'libretranslate.err.log'

# Ja servindo na 5000? nada a fazer
$listening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Add-Content $OutLog ("[" + (Get-Date -Format s) + "] start-libretranslate: ja servindo na 5000 - nada a fazer.")
  exit 0
}

# Localiza o executavel libretranslate.exe (segue o Python do usuario)
$lt = $null
$cmd = Get-Command libretranslate -ErrorAction SilentlyContinue
if ($cmd) { $lt = $cmd.Source }
if (-not $lt) {
  $cand = @(
    "$env:LOCALAPPDATA\Python\pythoncore-3.14-64\Scripts\libretranslate.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python314\Scripts\libretranslate.exe",
    "$env:APPDATA\Python\Python314\Scripts\libretranslate.exe"
  )
  foreach ($c in $cand) { if (Test-Path $c) { $lt = $c; break } }
}
# Fallback final: tenta achar qualquer libretranslate.exe sob %LOCALAPPDATA%\Python
if (-not $lt) {
  $found = Get-ChildItem -Path "$env:LOCALAPPDATA\Python" -Recurse -Filter 'libretranslate.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $lt = $found.FullName }
}
if (-not $lt) {
  Add-Content $ErrLog ("[" + (Get-Date -Format s) + "] ERRO: libretranslate.exe nao encontrado. Rode: pip install libretranslate")
  exit 1
}

$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'

Add-Content $OutLog ("[" + (Get-Date -Format s) + "] start-libretranslate: subindo " + $lt + " (porta 5000)...")
Start-Process -FilePath $lt `
  -ArgumentList '--load-only','en,es,pt','--host','127.0.0.1','--port','5000' `
  -WorkingDirectory $AppDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog
exit 0
