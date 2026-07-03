---
name: relatorio-mensal
description: Gera o relatório mensal de Marketing (PPTX + dashboard web) pra apresentar à diretoria. Use quando o user pedir "gera o relatório de [mês]", "relatório mensal", "monthly report", "ppt de marketing" ou solicitar consolidação de métricas do mês. Replica o template histórico (13 reports anteriores) com dados reais agregados de Cases · Voices · LinkedIn (xls + historical) · Apollo (quando disponível) · Eventos. Saída: PPTX em OneDrive + URL do dashboard.
---

# 📊 Skill: relatorio-mensal

Gera o relatório mensal de Marketing da EPI-USE Brasil seguindo o template visual dos 13 reports históricos. Roteiro pra esta skill:

## 1. Confirmar o mês alvo
Se o user não especificou, peça: "qual mês? (formato YYYY-MM, ex: 2026-05 pra maio)". Padrão = mês passado.

## 2. Verificar pré-requisitos
- Office rodando em `http://localhost:3000` (`curl /api/health`)
- python-pptx instalado (`pip show python-pptx`) — se não, `pip install python-pptx`
- OneDrive sincronizado (path: `C:/Users/Ruds/OneDrive - EPI USE BRASIL.../MARKETING/Reports/Relatorio MKT`)

## 3. Coletar snapshot
- `curl http://localhost:3000/api/relatorio/snapshot?mes=YYYY-MM` — agrega Cases, Voices, LinkedIn historical, eventos, KPIs digitais
- Localhost (dev) não exige auth. Contra o Railway, incluir o token: `curl -H "X-Editor-Token: $EDITOR_TOKEN" https://epiuse-voices-optimizer.up.railway.app/api/relatorio/snapshot?mes=YYYY-MM` (valor vem do `.env` local / env vars — nunca hardcodar)
- Validar: número de seguidores LinkedIn não é null · Cases tem ao menos 1 publicado · Eventos do mês listados

## 4. Gerar o PPTX
```bash
python C:/epiuse-mkt-office/scripts/relatorio/gerar_pptx.py --mes YYYY-MM
```
Saída padrão: `OneDrive/MARKETING/Reports/Relatorio MKT/2026/NN - EPI-USE _ Marketing 2026 - Mes.pptx`

## 5. Validar visualmente
Pedir pro user abrir e conferir:
- Capa correta
- KPIs digitais (4 colunas: Site · LinkedIn · Instagram · E-mail) com MoM%
- LinkedIn: total + novos + newsletter
- Conteúdo: temas + colaboradores + engajamento
- Eventos: próximos do mês + cobertura
- EPI-USE Voices: ativos + posts
- Next Steps

## 6. Marcar dados pendentes
Quando algum KPI cair em "—" ou null, **etiqueta clara**:
- ⏳ aguarda integração X (GA4, Instagram, RD, etc)
- 🟡 manual atualizado em DD/MM
- 🟢 fonte real automatizada

(Regra 7 — NO FAKE DATA. Nunca inventar número.)

## 7. Avisar Rudá
Mensagem padrão: "✅ Relatório de [Mês] gerado em `[path]`. Validar visualmente antes de enviar pra diretoria. Pendências: [lista]."

## 8. Atualizar workspace
- `vault/workspaces/relatorio-mensal/outbox/YYYY-MM-relatorio.md` — sumário do que foi gerado
- `vault/workspaces/relatorio-mensal/_vt.md` — log de execuções (mês, data, status, pendências)

## Cron automático
Tarefa Agendada Windows dia 1 de cada mês às 8h roda esta skill com `--mes` calculado (mês anterior).

## Falhas comuns
- snapshot retorna 500 → /api/relatorio/snapshot pediu mês fora do range histórico
- pptx não abre → faltou python-pptx OU template-base não está em scripts/relatorio/
- OneDrive desconectado → salva em `tmp/` e avisa
