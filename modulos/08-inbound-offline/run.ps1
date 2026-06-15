# run.ps1 — sobe o Content Factory OFFLINE
# Uso: powershell -ExecutionPolicy Bypass -File run.ps1
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# garante ollama no PATH
$env:Path += ";$env:LOCALAPPDATA\Programs\Ollama"

# servico ollama no ar
if (-not (Get-Process ollama -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

# corpus + indice
if (-not (Test-Path "corpus\corpus.jsonl")) {
  Write-Host "[setup] raspando 693 artigos (1x)..." -ForegroundColor Cyan
  $env:PYTHONIOENCODING = "utf-8"
  python scrape_corpus.py --delay 0.25
}
if (-not (Test-Path "corpus\index.npz")) {
  Write-Host "[setup] construindo indice RAG (1x)..." -ForegroundColor Cyan
  python rag.py --build
}

Write-Host "[run] Content Factory OFFLINE -> http://localhost:5000" -ForegroundColor Green
python app.py
