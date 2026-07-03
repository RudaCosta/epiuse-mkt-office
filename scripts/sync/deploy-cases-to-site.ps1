# Deploy Cases para www.epiuse.com.br via FTP
# Uso futuro quando o site oficial tiver endpoint /api/cases/sync
# Por enquanto: exporta o JSON dos cases para arquivo estatico FTP-avel
# ASCII-only (PowerShell 5.1 quebra com acento sem BOM)

$ErrorActionPreference = 'Stop'
$root = 'C:\Users\rudac\OneDrive\Documents\GitHub\epiuse-mkt-office'
$log  = "$root\logs\cases-ftp.log"

# ── OPCAO A: endpoint HTTP (quando o site tiver API) ─────────────────────────
# $siteUrl   = 'https://www.epiuse.com.br/api/cases/sync'
# $token     = $env:EDITOR_TOKEN
# Invoke-RestMethod -Uri $siteUrl -Method POST -ContentType 'application/json' `
#   -Headers @{ 'X-Editor-Token' = $token } -InFile $tmp

# ── OPCAO B: exporta JSON estatico para upload via FTP ────────────────────────
# Busca cases do Railway e salva em /public/api/cases-static.json
# Depois faz upload desse arquivo para o FTP do site

$railwayBase = 'https://epiuse-voices-optimizer.up.railway.app'

try {
  $data = Invoke-RestMethod -Uri "$railwayBase/api/cases" -Method GET -TimeoutSec 30
  $out  = "$root\public\api\cases-static.json"
  $data | ConvertTo-Json -Depth 10 | Out-File -FilePath $out -Encoding utf8
  Add-Content $log ("[" + (Get-Date -Format s) + "] cases-static.json gerado: " + (Get-Item $out).Length + " bytes")
  Write-Host "cases-static.json gerado em $out"
  Write-Host "Agora faca upload desse arquivo para: /public_html/api/cases-static.json no FTP do epiuse.com.br"
} catch {
  Add-Content $log ("[" + (Get-Date -Format s) + "] ERRO: " + $_.Exception.Message)
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# ── FTP UPLOAD (preencher credenciais quando tiver acesso) ────────────────────
# $ftpHost = 'ftp.epiuse.com.br'
# $ftpUser = ''           # preencher
# $ftpPass = ''           # preencher (nao commitar!)
# $ftpPath = '/public_html/api/cases-static.json'
#
# $wc = New-Object System.Net.WebClient
# $wc.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
# $wc.UploadFile("ftp://$ftpHost$ftpPath", $out)
# Write-Host "Upload FTP concluido: ftp://$ftpHost$ftpPath"
