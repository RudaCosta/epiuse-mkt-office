# ============================================================================
# EPI-USE Office - Instalador da Tarefa Agendada (sempre ligado, sem .bat)
# Rodar 1x:  powershell -ExecutionPolicy Bypass -File install-task.ps1
# NAO precisa de Admin (usa trigger "ao fazer login" do usuario atual).
#
# Cria 2 tarefas:
#   1. EPI-USE-Office        -> sobe o server ao fazer login
#   2. EPI-USE-Office-Health -> a cada 5 min checa /api/health e reinicia se cair
#
# Resultado: o Office sobe sozinho ao ligar/logar no PC e se auto-recupera.
# Desinstalar: Unregister-ScheduledTask -TaskName "EPI-USE-Office*" -Confirm:$false
# (ASCII-only)
# ============================================================================
$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$StartPs   = Join-Path $ScriptDir 'start-office.ps1'
$HealthPs  = Join-Path $ScriptDir 'office-health.ps1'
$User      = "$env:USERDOMAIN\$env:USERNAME"

function New-PwshAction($file) {
  # Via wscript + run-hidden.vbs = 100% oculto (sem flash de janela CMD a cada execucao)
  $vbs = Join-Path $ScriptDir 'run-hidden.vbs'
  New-ScheduledTaskAction -Execute 'wscript.exe' `
    -Argument ('"' + $vbs + '" "' + $file + '"')
}

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited

# --- Tarefa 1: sobe ao fazer login ---
$trigLogon = New-ScheduledTaskTrigger -AtLogOn -User $User
Register-ScheduledTask -TaskName 'EPI-USE-Office' -Force `
  -Action (New-PwshAction $StartPs) -Trigger $trigLogon `
  -Settings $settings -Principal $principal `
  -Description 'Sobe o EPI-USE Office (Node) ao fazer login. Substitui o .bat manual.' | Out-Null
Write-Output "[OK] Tarefa 'EPI-USE-Office' registrada (trigger: ao fazer login)."

# --- Tarefa 2: healthcheck a cada 5 min (auto-restart) ---
$trigHealth = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName 'EPI-USE-Office-Health' -Force `
  -Action (New-PwshAction $HealthPs) -Trigger $trigHealth `
  -Settings $settings -Principal $principal `
  -Description 'Checa /api/health a cada 5 min e reinicia o Office se cair.' | Out-Null
Write-Output "[OK] Tarefa 'EPI-USE-Office-Health' registrada (a cada 5 min)."

# --- Tarefa 3: sync diario Cases (Roberto OneDrive -> Office) ---
$CasesPs = Join-Path $ScriptDir 'run-cases-sync.ps1'
$trigCases = New-ScheduledTaskTrigger -Daily -At '07:00'
Register-ScheduledTask -TaskName 'EPI-USE-Office-Cases-Sync' -Force `
  -Action (New-PwshAction $CasesPs) -Trigger $trigCases `
  -Settings $settings -Principal $principal `
  -Description 'Sync diario 7h: le xlsx Cases do Roberto (OneDrive) e POSTa pra /api/cases/sync.' | Out-Null
Write-Output "[OK] Tarefa 'EPI-USE-Office-Cases-Sync' registrada (diario 07:00)."

# --- Tarefa 4: relatorio mensal automatico (dia 1 as 8h) ---
$ReportPs = Join-Path $ScriptDir 'run-relatorio-mensal.ps1'
$trigReport = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '08:00'
# (Trigger mensal exato precisa COM-object — aproximacao: rodar toda segunda 8h, script ignora se nao for dia 1-7)
# Alternativa simples: rodar todo dia 8h checando se eh dia 1
$trigReportMensal = New-ScheduledTaskTrigger -Daily -At '08:05'
Register-ScheduledTask -TaskName 'EPI-USE-Office-Report-Mensal' -Force `
  -Action (New-PwshAction $ReportPs) -Trigger $trigReportMensal `
  -Settings $settings -Principal $principal `
  -Description 'Roda diariamente 08:05 — gera report do mes anterior se hoje for dia 1 (script checa).' | Out-Null
Write-Output "[OK] Tarefa 'EPI-USE-Office-Report-Mensal' registrada (diario 08:05 — script roda se hoje for dia 1)."

# --- Sobe agora (nao espera o proximo login) ---
& $StartPs
Start-Sleep -Seconds 4
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -TimeoutSec 6 -UseBasicParsing
  if ($r.StatusCode -eq 200) { Write-Output ("[OK] Office no ar: http://localhost:3000  ->  " + $r.Content) }
} catch {
  Write-Output "[!] Office ainda nao respondeu - veja logs/office.err.log. O health vai tentar de novo em ~5min."
}

Write-Output ""
Write-Output "Pronto! O Office agora sobe sozinho ao logar e se mantem vivo. Sem .bat, sem PM2."
