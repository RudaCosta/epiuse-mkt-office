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

## 3. Coletar os dados (só fontes automáticas)
- `curl -H "X-Editor-Token: $EDITOR_TOKEN" http://localhost:3000/api/relatorio/live?mes=YYYY-MM`
- Fontes: GA4 (por mês) · RD Station (foto diária) · Apollo (`apollo_hist`) · Voices/pautas · links rastreados · Cases · calendário editorial. LinkedIn, Zoho, SAP 4 ME, eventos e metas **não entram** (viraram link) — ver `modulos/31-relatorio-marketing/README.md`.
- Conferir `fontes.dentro[].status`: o que não estiver `ok` sai do deck e aparece em "Fontes e método".

## 4. Gerar PPTX + PDF
```bash
python C:/epiuse-mkt-office/scripts/relatorio/gerar_pptx.py --mes YYYY-MM --pdf
```
Ou direto no `/relatorio` → botões **PowerPoint** / **PDF** (servidor gera, sem PC).
Saída local padrão: `OneDrive/MARKETING/Reports/Relatorio MKT/AAAA/NN - EPI-USE _ Marketing AAAA - Mes (auto).pptx`

## 5. Validar visualmente
Capa · agenda · resumo (5 números + destaques) · Site · E-mail & base · Outbound · Voices & links · calendário · Cases · Fontes e método · encerramento. Padrão do PPT EPI-USE (Brand Guide 2026); com o template oficial enviado no `/relatorio`, usa o mestre da marca.

## 6. Dados pendentes
Nada inventado (regra 7): fonte sem dado → slide sai; mês aberto → "parcial"; RD/Apollo sem histórico do mês → "posição em DD/MM".

## 7. Avisar Rudá
Mensagem padrão: "✅ Relatório de [Mês] gerado em `[path]`. Validar visualmente antes de enviar pra diretoria. Pendências: [lista]."

## 8. Atualizar workspace
- `vault/workspaces/relatorio-mensal/outbox/YYYY-MM-relatorio.md` — sumário do que foi gerado
- `vault/workspaces/relatorio-mensal/_vt.md` — log de execuções (mês, data, status, pendências)

## Cron automático
Tarefa Agendada Windows dia 1 de cada mês às 8h roda esta skill com `--mes` calculado (mês anterior).

## Falhas comuns
- `/api/relatorio/live` aceita os últimos 12 meses; fora disso cai no último mês fechado
- pptx não abre → faltou python-pptx (`pip install -r scripts/relatorio/requirements.txt`)
- PDF não sai → falta LibreOffice (Impress) na máquina
- OneDrive desconectado → salva em `tmp/` e avisa
