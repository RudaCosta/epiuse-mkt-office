# 🗺️ ROADMAP único — EPI-USE Office

> Fonte única do backlog. TODAS as ferramentas (Claude/Codex/Obsidian/openclaw) leem antes de pegar tarefa.
> Trava de quem-mexe-em-quê: `_LOCK.md`. Protocolo: `multi-tool-protocol.md`.
> Última atualização: 04/jun/2026 (v0.11.0 — NÃO é 1.0.0; critérios de 1.0.0 no fim).

---

## 🟢 Agora no ar
- **v0.11.0** rodando em `http://localhost:3000` (sobe sozinho ao logar · auto-restart 5min)
- Produção Railway: versão anterior (defasada — aguarda push autorizado por Rudá)

---

## ✅ Sprints concluídas (S1 → S16)

| Sprint | Versões | Entrega principal |
|---|---|---|
| S1-S3 | 0.2.x–0.3.x | Game 2D · Voices · Painel Duda · Inbound · SQLite |
| S4 | 0.4.0–0.4.12 | Optimizer Vision · Voice Index · PDF · Cases reais |
| S5 | 0.5.0–0.5.1 | /relatorio · /artigos · /jornadas · /projecoes · /pipeline · Regra 7 |
| S6 | 0.6.0–0.6.4 | Design System (DESIGN.md + gen_tokens) · Brand oficial · logos |
| S7 | 0.7.0–0.7.1 | Localhost always-on · paleta Codex · dados reais · migração C:\ |
| S8 | 0.8.0 | SSO Microsoft + 6 módulos por área com dado real |
| S9-S11 | 0.8.1–0.8.3 | Arquitetura 3-camadas · relatorio-mensal · pipeline 5 agentes |
| S12-S13 | 0.9.0–0.9.5 | Optimizer refundado (zero tokens · V2 findskill · padrão Anderson) |
| S14 | 0.10.0–0.10.1 | Cowork + workflows dinâmicos entre agentes |
| S15 | 0.11.0 | Módulo C · Daily Digest + Inbox por área no Painel da Duda |
| S16 | 0.11.x | Infra: Railway Volume `/data` · SSO Microsoft ativo · sync cases Node.js · domínio office.epiuse.com.br |

---

## 🚀 Sequência de execução (S17 →) — roadmap real aprovado 04/jun

> Decisões do Rudá: 1ª build = GA4 · CRM = Zoho (deals source=SDR; Apollo faz volume) · Instagram ADIADO (foco LinkedIn).

| Sprint | Entrega | Status |
|---|---|---|
| **S17** | **GA4 + relatório real** — `ga4_fetch.js` + bloco `site` no /relatorio | 🔵 em construção (código pronto; falta Service Account do Rudá) |
| S18 | Apollo cron automático (Tarefa Windows diária 6h) | ⏳ |
| S19 | Zoho CRM (pipeline R$ — deals Opportunity Source=SDR) | ⏳ |
| S20 | Events Cockpit (deadlines + checklist + alertas, sem API) | ⏳ |
| S21 | Voices performance (form rápido + rollup por voicer + cases→pauta) | ⏳ |
| S22 | Search Console / SEO (reusa Service Account do S17) | ⏳ |
| S23 | Competitor Move Tracker (weekly intel report, LinkedIn, blogs, hiring signals, askClaude insights) | ⏳ |
| S24 | SEO Pulse (snapshot diário GSC/GA4 + 4 KPIs + Movers & Shakers + Chart.js Donut + askClaude "What to do next" insight) | ⏳ |

### 🔑 Verdade dura LinkedIn (sem ilusão)
- Seguidores da **página** = já temos (manter xls Sergio).
- Posts de **perfil pessoal por voicer** = LinkedIn NÃO expõe via API a terceiros. Mantemos form manual, só reduzimos fricção.

### 💡 Metas sugeridas por área (validar com Rudá)
- **Intelligence/Bruna:** % base higienizada · MQL→SQL · cobertura UTM
- **Growth/Gui:** seguidores LinkedIn +120/mês → stretch +200 · sessões orgânicas (GA4) · CPL
- **Eventos/Isabela:** nº eventos c/ stand · leads/evento · slots de speaker
- **SDR/Marlison:** reuniões agendadas · sequências ativas (Apollo) · deals SDR R$ (Zoho)
- **Brand/Duda:** Voices ativos (5) · posts/mês por voicer (2) · engajamento
- **Conteúdo/Lisiane:** artigos publicados · cobertura pilares · conteúdo→Voice

### 🪦 Backlog "Rudá do Futuro"™ (meme)
- `08-Agosto.pptx` · `playbook_eventos_b2b v1.docx` · `cronograma_gantt_eventos v1.xlsx` → problema de outro sprint, hehehe 😎

---

## 🏁 Critérios para 1.0.0 (ainda não chegamos)
- [ ] SSO ativo em prod com login real @epiuse (código+Azure ok; falta `SSO_ENFORCE` + uso real)
- [ ] GA4 + Zoho plugados (site e R$ reais)
- [ ] Railway estável 14 dias (Volume criado; contar os dias)
- [ ] 4 das 5 áreas usando o Office 2+ semanas
- [ ] Runbook + backup p/ Roberto/IT
