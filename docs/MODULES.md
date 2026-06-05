# Módulos — EPI-USE Office

> Mapa de todos os módulos, páginas e funcionalidades da plataforma.
> Atualizado: junho/2026 · v0.12.0

---

## Índice de módulos

| # | Módulo | Página(s) | Status | Responsável |
|---|---|---|---|---|
| 00 | [Design System](#00-design-system) | `/design` | ✅ Ativo | Rudá / Duda |
| 01 | [Relatório Mensal](#01-relatório-mensal) | `/relatorio` | ✅ Ativo | Rudá |
| 02 | [Voices Optimizer](#02-voices-optimizer) | `/optimizer`, `/optimizer-v2` | ✅ Ativo | Rudá / Duda |
| 03 | [Metas FY26](#03-metas-fy26) | `/metas` | ✅ Ativo | Rudá |
| 04 | [Artigos Blog](#04-artigos-blog) | `/artigos` | ✅ Ativo | Rudá / Gui |
| 05 | [Cases CS](#05-cases-cs) | `/cases` | ✅ Ativo | Roberto / Rudá |
| 06 | [Inbound Pipeline](#06-inbound-pipeline) | `/inbound`, `/cowork`, `/jornadas` | ✅ Ativo | Rudá |
| 07 | [Pipeline Apollo](#07-pipeline-apollo) | `/pipeline` | ✅ Ativo | Rudá |
| 10 | [Painel Duda](#10-painel-duda) | `/painel` | 🚧 Em construção | Duda / Rudá |
| 99 | [Integrações Pendentes](#99-integrações-pendentes) | — | 📋 Roadmap | Rudá |

---

## 00 Design System

**Pasta:** `vault/00-contexto/DESIGN.md` + `scripts/design/`
**Página:** `/design`

Design System interno baseado no Brand Guide EPI-USE V1.1.

**O que tem:**
- Tokens de cor (Navy `#001844`, Red `#cd1543`, Blue Light `#869ec3`, Grey `#cfd1d3`)
- Tipografia: Maven Pro (primary) + Avenir (secondary)
- Componentes: cards, badges, funis, tabelas
- Visualizador em `/design` (Storybook lite)

**Como funciona:**
1. Editar `vault/00-contexto/DESIGN.md`
2. Rodar `python scripts/design/gen_tokens.py`
3. `public/design-tokens.css` é regenerado e propaga em todas as páginas

---

## 01 Relatório Mensal

**Pasta:** `scripts/relatorio/`
**Página:** `/relatorio`

Relatório consolidado mensal com KPIs de todas as áreas.

**Fontes de dados:**
- Apollo (pipeline, contatos) → real
- LinkedIn (seguidores) → real (manual)
- Artigos publicados → real (sync)
- Eventos → ⏳ aguarda integração

**Output:** Visualização web + exportação PPTX (`scripts/relatorio/gerar_pptx.py`)

---

## 02 Voices Optimizer

**Pasta:** `public/optimizer.html`, `public/optimizer-v2.html`
**Páginas:** `/optimizer`, `/optimizer-v2`

Kit LinkedIn para consultores do programa Voices.

**V1 (`/optimizer`):**
- Input: dados do consultor cadastrado
- Output: kit LinkedIn (headline, about, featured, posts)
- Fluxo: copia prompt → Claude processa → cola JSON → gera PDF/MD

**V2 (`/optimizer-v2`):**
- Inspirado no findskill.ai
- Input: transcrição de entrevista (texto livre)
- Output: Voice Index + Resumo Executivo + Kit completo
- Usa Anthropic API diretamente

**Guia operacional:** `vault/00-contexto/operacao-optimizer.md`

---

## 03 Metas FY26

**Pasta:** `scripts/metas/`, `public/api/metas-fy26.json`
**Página:** `/metas`

Dashboard de metas do FY26 (março/2026 – fevereiro/2027) por área.

**Scripts:**
- `gerar_planilha_metas.py` → XLSX com dados reais
- `gerar_planilha_smart.py` → template SMART em branco
- `gerar_planilha_template_em_branco.py` → template para preenchimento

**Dados:** `public/api/metas-fy26.json` (editável manualmente ou via script)

---

## 04 Artigos Blog

**Pasta:** `scripts/sync/sync_artigos_blog.py`
**Página:** `/artigos`

Base pesquisável de 693 artigos do blog EPI-USE.

**Sync:** `python scripts/sync/sync_artigos_blog.py`
**Dados:** `public/api/artigos/*.json`

Funcionalidades: busca full-text, filtro por LOB, filtro por data, link para artigo original.

---

## 05 Cases CS

**Página:** `/cases`

Banco de cases publicáveis aprovados pelo Roberto.

**Sync:** `python scripts/sync/sync_cases_roberto.py`
**Autenticação:** `EDITOR_TOKEN` no `.env`

> ⚠️ **Workaround Railway:** SQLite não persiste entre deploys. Re-sync obrigatório após cada push usando o EDITOR_TOKEN.

---

## 06 Inbound Pipeline

**Páginas:** `/inbound`, `/cowork`, `/jornadas`

Pipeline editorial completo: brief → artigo → carrossel LinkedIn.

**Cowork (`/cowork`):**
- Dispara workflows de agentes em sequência
- Workflows definidos em `vault/workflows/`
- Agentes: pipe-briefing → pipe-artigo → pipe-carrossel → pipe-copy-li → pipe-capa
- Histórico em `vault/cowork-runs/`

**Jornadas (`/jornadas`):**
- Buyer journey por LOB (SAP HCM, SAP S/4HANA, etc.)
- Mapa visual da jornada de compra

---

## 07 Pipeline Apollo

**Página:** `/pipeline`

Dashboard do pipeline outbound (Apollo.io).

**Sync automático:** `scripts/integrations/apollo_pipeline_sync.js`
- Agendado via Tarefa Windows `run-apollo-sync.ps1`
- Grava em `public/api/pipeline-snapshot.json`

**Dados em tempo real:** contatos (39k+), empresas (14k+), sequências ativas (15).

---

## 10 Painel Duda

**Pasta:** `modulos/10-painel-duda/`
**Página:** `/painel`
**Status:** 🚧 Em construção (sprint 15 iniciado)

Dashboard operacional diário para a Duda (Brand Experience).

**Seções planejadas:**
- Daily digest (tarefas do dia, alertas)
- Inbox por área (o que está pendente)
- KPIs dos Voices (posts, engajamento, atividade)
- Feed de atividade dos agentes Cowork
- Calendário de conteúdo

**Ver:** `modulos/10-painel-duda/README.md` para detalhes do sprint.

---

## 99 Integrações Pendentes

Integrações no roadmap que ainda não foram finalizadas:

| Integração | Dados que traz | Bloqueador |
|---|---|---|
| Google Analytics 4 | Tráfego orgânico, pageviews | OAuth configurado, sync pendente |
| LinkedIn API | Seguidores, impressões, engajamento | API access pendente |
| Zoho CRM | Oportunidades, stage, valor | Definir CRM oficial |
| RD Station | Leads inbound, automações | Acesso API |

**Ver:** `vault/00-contexto/pendencias.md` para status atualizado.

---

## Páginas sem módulo formal

Páginas existentes que ainda não têm módulo documentado:

| Página | Rota | Descrição |
|---|---|---|
| Office Home | `/` | Hub de navegação com links para todas as áreas |
| Area Dashboard | `/area?id=X` | Dashboard por área (funil, KPIs, ferramentas) |
| War Room | `/war-room` | Visão executiva consolidada |
| Projeções Paid Media | `/projecoes` | Cenários de investimento (CAC, ROI) |
| Seja um Voice | `/seja-voice` | Página de recrutamento de Voices |
| Changelog | `/changelog` | Histórico de versões da plataforma |
| Hub | `/hub` | Hub de links externos |

---

*Atualizado em: junho/2026 · v0.12.0*
