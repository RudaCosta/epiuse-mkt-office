# Tarefa Agendada mensal: gera o report do mes anterior dia 1 as 8h
# Avisa Ruda via inbox (cria pedido pra validacao humana)
# ASCII-only
$ErrorActionPreference = 'SilentlyContinue'
$log = 'C:\epiuse-mkt-office\logs\relatorio-mensal.log'
$dir = Split-Path $log -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# Guard: so roda no dia 1 do mes (a tarefa roda todo dia 08:05 mas so executa dia 1)
$hoje = (Get-Date).Day
if ($hoje -ne 1) {
  # silencioso — nao polui log
  exit 0
}

# Calcula mes anterior (YYYY-MM)
$mes = (Get-Date).AddMonths(-1).ToString('yyyy-MM')
$ts = (Get-Date -Format s)
Add-Content $log ("[" + $ts + "] gerando relatorio do mes " + $mes)

# Roda o gerador PPTX
try {
  & python 'C:\epiuse-mkt-office\scripts\relatorio\gerar_pptx.py' --mes $mes 2>&1 | Add-Content $log
} catch {
  Add-Content $log ("[" + $ts + "] ERRO: " + $_.Exception.Message)
  exit 1
}

# Cria entry no inbox do agente pra validacao humana
$inboxDir = 'C:\epiuse-mkt-office\vault\workspaces\relatorio-mensal\inbox'
if (-not (Test-Path $inboxDir)) { New-Item -ItemType Directory -Path $inboxDir | Out-Null }
$file = Join-Path $inboxDir ((Get-Date -Format 'yyyy-MM-dd') + "-validar-report-" + $mes + ".md")
$md = "# Validar report mensal $mes`n`n> Gerado automaticamente em $ts`n> Status: aguardando validacao humana`n`n## Pedido`n`nPPT do mes $mes foi gerado em OneDrive/MARKETING/Reports/Relatorio MKT/. Abrir, validar visualmente (KPIs, capas, dados pendentes etiquetados) e aprovar antes de enviar pra diretoria.`n`n## Pendencias prováveis`n- Dados de GA4/IG/RD/Apollo podem aparecer como aguarda integracao`n- LinkedIn historical: confirmar que serie esta atualizada`n"
Set-Content -Path $file -Value $md -Encoding utf8

Add-Content $log ("[" + (Get-Date -Format s) + "] fim. Inbox: " + $file)
