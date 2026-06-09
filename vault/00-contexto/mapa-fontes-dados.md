# 📊 Mapa de Fontes de Dados — Real vs Pendente

> **Regra 7 (CLAUDE.md):** Todo dado no Office tem que ser REAL. Quando placeholder, etiqueta clara `⏳ Aguarda integração [fonte]`.
> Este documento é a **fonte da verdade** do que tá real e o que falta integrar.
> Atualizar TODA vez que rolar nova integração ou novo dado entrar no Office.

**Última atualização:** 09/jun/2026

---

## 🆕 DATASETS NOVOS (jun/2026 — sprints S27-S32)

| Dado | Telas | Fonte | Estado | Obs |
|---|---|---|---|---|
| **Zoho CRM deals** (141: 98 MKT + 43 SDR) | `/relatorio` §6, `/inbound/zoho-pipeline` (fora do menu) | Zoho MCP `executeCOQLQuery` → `zoho_deals` SQLite | 🟢 REAL | sync manual via sessão Claude; dados até abr/2026 |
| **SAP 4 ME** (705 projetos globais) | `/clientes-sap-4me`, `/relatorio` §8 | XLSX Roberto → `clientes_sap_4me` SQLite | 🟢 REAL | `sync_clientes_sap_4me.js`; 455 Live |
| **Field Marketing** (92 eventos) | `/field-marketing` | events.json + `field_events` SQLite | 🟡 PARCIAL | eventos reais; captura (leads/deals/custo) VAZIA — aguarda Isabela preencher pós-evento |
| **Content pipeline** (80 itens) | `/content-pipeline` | Redatoria via calendar → `content_pipeline` SQLite | 🟡 PARCIAL | só TÍTULO importado; corpo vazio → SEO/GEO score baixo. Falta corpo real |
| **Development Funds** (18 proposals + 9 requests) | `/development-funds`, calendar layer MDF | espelho portal SAP PartnerEdge → `development-funds.json` | 🟢 REAL | manual do portal; regra derrubados (5VVWA2SLEO+66IJWEAE2B não contam) |
| **Calendar editorial** (Duda 18 + Redatoria 80) | `/inbound/calendar`, home agenda | planilhas Duda/Redatoria → `editorial_calendar` SQLite | 🟢 REAL | `sync_calendario_duda.js` + `sync_redatoria_to_calendar.js` |
| **Deadlines MDF** | calendar, war-room, agenda | `deadlines-2026.json` (email SAP) | 🟢 REAL | manual; treinamento 1/abr, EDF/DDF 1/jul |

**Infra:** Railway Volume `/data` montado (persistência OK desde 09/jun). `/api/version` diagnostica persistência. Handlers globais de erro (v0.32.1).

---

## 🟢 REAL — dado vivo (auto-atualizado)

| Dado | Telas que usam | Fonte | Mecanismo |
|---|---|---|---|
| LinkedIn seguidores totais (16 meses) | `/relatorio`, `/metas` (futuro), `/dashboard` | xls Sergio + 13 reports PPT | `scripts/sync/sync_linkedin_historical.py` lê xls + pptx → `public/api/linkedin-historical.json` |
| LinkedIn demografia (localidade · função · nível · setor · tamanho) | `/relatorio`, `/metas` | xls Sergio aba demografia | Mesmo sync |
| LinkedIn eventos (tática elefante: SAP NOW, BTP Exp, Inside Track) | `/relatorio`, `/metas` | xls Sergio coluna "Evento" | Mesmo sync |
| Cases & CS (22 clientes Roberto) | `/cases`, `/relatorio` | OneDrive xlsx Roberto via `sync_cases_roberto.py` | Script lê xlsx local → POST `/api/cases/sync` |
| 693 artigos blog classificados | `/artigos`, `/jornadas`, `/voices` (futuro mural) | xlsx Manus | `sync_artigos_blog.py` → `public/api/artigos.json` |
| Voices ativos (Anderson, Furigo, +futuros) | `/voices`, `/relatorio` | `voices.json` manual editado | Editor UI em `/voices` |
| Eventos do calendário (Brasil + LATAM) | `/dashboard`, `/relatorio` | `public/api/events.json` manual | Edição manual estruturada |
| Time MKT (5 áreas + lideranças + aniversários) | `/dashboard` | `public/api/team.json` | Edição manual |
| 40 Metas FY26 oficiais | `/metas` | docx oficial em vault | `sync_metas_fy26.py` → `public/api/metas-fy26.json` |

## 🟡 SEMI-MANUAL — dado real mas atualizado a mão (não automático)

| Dado | Telas | Por que manual | Plano pra automatizar |
|---|---|---|---|
| Newsletter assinantes | `/relatorio` | reports PPT mensais | Personal API Token RD Station OU HubSpot quando migração consolidar |
| Engajamento médio LinkedIn / posts/mês | `/relatorio` | reports PPT (parou desde mai/25) | LinkedIn Company Analytics API (precisa Admin da página) OU Sergio retomar tracking |
| Top posts/destaques do mês | `/relatorio` | reports manual | LinkedIn Analytics API |
| Custo brindes elefante por evento | (não tracked ainda) | sem campo | Adicionar `custo_R$` em `events.json` + cálculo ROI auto |
| SSI de cada Voice | `/voices` | manual no editor | LinkedIn Sales Navigator SSI (precisa licença Sales Nav) — só após SSO Microsoft com auth LinkedIn |
| Cases — texto/storytelling profundo | `/cases` (só lista) | xlsx Roberto só lista | Cada case ganha .md em `vault/00-contexto/cases/<cliente>.md` (sugestão pro Rudá subir) |

## ⏳ AGUARDA INTEGRAÇÃO — placeholder hoje, plano definido

| Dado | Telas | Fonte futura | Status / Próximo passo |
|---|---|---|---|
| **Site:** usuários · views · sessão · MoM% | `/relatorio` Site KPI | **GA4 Data API** | Rudá gera Service Account JSON + Property ID → me passa via Teams DM → Bloco D Sprint v0.5.1 |
| **SEO:** queries · CTR · posição · top pages | `/relatorio`, `/seo` (novo) | **Search Console API** | Mesmo Service Account → Bloco D |
| **Instagram:** seguidores · alcance · engagement | `/relatorio` Instagram KPI | **Instagram Graph API** | Requer Business Account + Facebook App + token long-lived (~2h setup Rudá) |
| **E-mail:** taxa abertura · cliques · leads | `/relatorio` E-mail KPI | **RD Station API** | Personal API Token (não publisher key) — Rudá pede admin RD master |
| **Pipeline:** R$ · MQLs · SQLs · funil | `/pipeline`, `/relatorio` SDR | **Apollo MCP read-only** | Script `apollo_daily_sync.md` documentado · falta scheduler · Bloco Sprint v0.5.0 Onda 5 |
| **Reuniões agendadas** | `/pipeline`, `/relatorio` | Apollo + Microsoft Graph Calendar | Depende SSO Microsoft (v0.6.0) pra autenticar Calendar |
| **Tarefas/Sprints internos** | `/tarefas` (novo) | **Trello API** | Rudá gera Key+Token em trello.com/app-key → Bloco E Sprint v0.5.1 |
| **Reconhecimentos SAP/analistas** (meta FY26: 4+2) | `/relatorio`, `/metas` | Planilha simples ou form `/reconhecimentos` | Decidir: subir XLS atual OU criar form no Office |
| **NPS clientes** | `/cases` | SurveyMonkey/Typeform export OU XLSX manual | Rudá sobe `vault/00-contexto/nps/` (sugerido em Bloco G) |
| **Histórico campanhas Ads** (Meta/Google/LinkedIn) | `/projecoes` (recalibrar premissas) | CSV export plataformas | Rudá sobe `vault/00-contexto/ads/` quando rodar 1ª campanha real |
| **CRM oportunidades** (oficial — depende qual CRM) | `/pipeline`, `/relatorio` | Pipedrive/HubSpot/Salesforce | Definir CRM oficial primeiro · Sprint v0.6.x |
| **Calendário Editorial Duda** | `/inbound/calendar` | SharePoint xlsx | Duda criar a planilha (B2 pendência) — esperando |

## 🔮 PROJEÇÃO / ESTIMATIVA — NÃO É DADO REAL (clearly labeled)

| Dado | Telas | Como calcula | Etiqueta no UI |
|---|---|---|---|
| Cenários paid media (4 budgets × seguidores/ano) | `/projecoes` | Fórmula transparente baseada em CPM/CTR/conv de mercado B2B SAP | Banner amarelo: "tudo aqui é PROJEÇÃO — não rodamos campanha real ainda" |
| Multiplicador vs hoje | `/projecoes` | `total_com_paid / total_orgânico` | Idem |
| Baseline eventos extrapolado 12m | `/projecoes` | `227 / 10 × 12 = 272` (10 meses históricos × 12) | Linkado nas premissas |
| Insights Haiku (futuro) | `/metas` (futuro) | Sonnet/Haiku lê eventos+posts e gera 1 parágrafo | Etiqueta `🤖 Gerado por IA — revisar` |

## 🤖 IA-GERADO — output de Sonnet/Haiku (revisar antes de aplicar)

| Saída | Tela | Modelo | Etiqueta atual |
|---|---|---|---|
| Kit completo Optimizer (sobre, headline, 5 destaques, etc) | `/optimizer` | Sonnet 4.6 (split p1+p2) | Card roxo no cover: "Conteúdo gerado por IA — revisar" |
| Extract dados da transcrição/screenshots | `/optimizer` | Haiku 4.5 | Banner durante o processo |
| Brief→Post / Carrossel | `/inbound/brief`, `/inbound/carousel` | Sonnet | Implícito (user pediu gerar) |
| Repurpose 3 variações LinkedIn (futuro) | `/artigos` (futuro) | Sonnet | A implementar com selo |

---

## 🎯 Roadmap consolidado pra zerar pendências

**Sprint v0.5.1 (atual):** ataca FY26 metas + GA4 + SC + Trello → reduz 5 itens da lista ⏳.

**Sprint v0.6.0 (depois):** Instagram Graph + RD Personal Token + Apollo cron auto + SSO Microsoft → reduz +4 itens.

**Sprint v0.7.0:** CRM oficial + Calendar Duda quando criar + Reconhecimentos form.

**Quando tudo zerado:** Office 100% dados reais 24/7 sem nenhum placeholder.

---

## 📌 Como atualizar este mapa

- ✏️ Toda vez que integração rolar: mover linha de ⏳ pra 🟢 + atualizar tela com etiqueta correta
- ✏️ Toda vez que novo dado entrar no Office: adicionar linha (real ou pendente)
- ✏️ Toda vez que descobrir que algum dado "real" virou inconsistente: rebaixar pra 🟡 + investigar
- ✏️ Início de cada sessão Claude: abrir este arquivo + verificar se algum item ⏳ tem update do Rudá (credenciais etc)
