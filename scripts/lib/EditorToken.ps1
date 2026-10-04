# Resolve o EDITOR_TOKEN para os scripts .ps1. ASCII-only (PowerShell 5.1).
#
# Ordem: variavel de ambiente -> .env FORA do repositorio (o mesmo que o
# servidor le). Nao existe valor padrao aqui de proposito: o repositorio e
# publico, e um token escrito no codigo vale pra qualquer um.
#
# Uso:  . "$PSScriptRoot\..\lib\EditorToken.ps1"; $token = Get-EditorToken
function Get-EditorToken {
  if ($env:EDITOR_TOKEN) { return $env:EDITOR_TOKEN }
  $cands = @("$env:USERPROFILE\.epiuse-optimizer\.env", "C:\Users\Ruds\.epiuse-optimizer\.env")
  foreach ($f in $cands) {
    if (Test-Path $f) {
      $line = Get-Content $f | Where-Object { $_ -match "^EDITOR_TOKEN=" } | Select-Object -First 1
      if ($line) { return ($line -replace "^EDITOR_TOKEN=", "").Trim().Trim([char]34).Trim([char]39) }
    }
  }
  return ""
}
