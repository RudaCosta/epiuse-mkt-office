# ============================================================================
# EPI-USE Office - Stop (manual)
# Para SO o node que esta servindo a porta do Office. Nao toca em outros node.
# Uso manual apenas - a Tarefa Agendada mantem o Office vivo normalmente.
# (ASCII-only)
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$Port = if ($env:PORT) { $env:PORT } else { 3000 }

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conn) { Write-Output ("Office nao esta servindo na porta " + $Port + " - nada a parar."); exit 0 }

$pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq 'node') {
    Stop-Process -Id $procId -Force
    Write-Output ("Parado node PID " + $procId + " (servia porta " + $Port + ").")
  }
}
