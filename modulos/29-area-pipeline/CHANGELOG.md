# Changelog — Área Pipeline

## v1.0 · 04/out/2026
- `/area/pipeline` sai do template genérico `area.html` e ganha página própria (pedido Rudá: "corte as integrações que não têm atualização automática… bem visual e atrativo, com animações JS").
- **Apollo virou automático em prod:** refresh no servidor (boot + 6h) em vez do `pipeline-snapshot.json` estático (parado desde 09/jun). Guarda 1 retrato por dia em `apollo_hist` → números de 7/30 dias e ritmo diário.
- `/api/pipeline` e o overlay do `/api/areas.json` (home, diretoria, Curva ABC) passam a ler o Apollo vivo, com fallback no JSON estático.
- Saíram da área (viraram link): Zoho deals/R$, KPIs chumbados do `areas.json`, `relatorio-outreach.json`. A tela antiga `/pipeline` redireciona pra área.
- Entrou: voz do campo do JARVIS (calls, dores, objeções, gatilhos, últimas calls).
- Visual: fundo de fluxo de dados, máquina de outbound com partículas que avançam/vazam na taxa real, contadores, gauges, cards de sequência com mini-funil, donut de canais que filtra, barras por dia/semana, termômetro, drawers.
- Tracking "quem viu o quê" (`kind='pipeline'`) + painel owner-only `/admin/pipeline`.
