# 🗺️ Roadmap MKT Office — Microsoft To Do export

> **Atualizado:** 2026-06-05 · v2.0
> **Como usar:** copia/cola cada bloco no app Microsoft To Do (Windows nativo)
> **Fonte:** este arquivo é regenerado quando rodar `node scripts/export/gen-todo-export.js` (a criar)
> **Plano completo:** `~/.claude/plans/deep-booping-crown.md`

---

## ⚡ PRÓXIMOS 3 PASSOS HOJE

- [ ] Validar `0.15.0` em prod via `/api/health` após push
- [ ] Gerar este export e copiar pro To Do
- [ ] Decidir ordem das sprints 20 (HOME) vs 21 (Brindes) — ambas urgentes

---

## 📌 DÉBITO TÉCNICO — sprints anteriores não-fechadas

### S14 inacabado (Cowork)
- [ ] Botão "Processar inbox" no /cowork — abrir item · copiar prompt completo · cola Claude.ai · artifact (~2-3h)
- [ ] Status real do pedido no kanban "Em andamento" (aberto/em progresso/done) (~1h)

### S15 inacabado (Painel Duda)
- [ ] Botão "Marcar como feito" no Daily Digest (move inbox→outbox + grava _vt.md) (~1h)
- [ ] Velocity (pedidos fechados/semana pela Duda) (~1h)
- [ ] Calendário editorial — depende B3 (planilha SharePoint Duda)

### S18.1 — RD Station completar pro PPT mensal (CRÍTICO, ~2-3h)
- [ ] Taxa de abertura (%) por mês — via `/platform/conversions` ou eventos email
- [ ] Taxa de cliques (%) por mês
- [ ] Leads gerados no mês (via segmentação "Novos do mês" ou created_at filter)
- [ ] Breakdown mês anterior pra MoM (igual print KPIs Digitais agosto vs julho 25)
- [ ] Card e-mail no /relatorio mostrar os 4 KPIs (não só base+workflows+LPs)

---

## 🔴 BLOQUEIOS P0 — destrava operação

- [ ] [B3] **Calendário editorial Duda** — aguarda Duda compartilhar planilha SharePoint (Data · Canal · Voice · Pilar · Título · Status · URL). Endpoint `/api/inbound/calendar` pronto. *Quem destrava: Duda*
- [ ] [B4] **Cron re-sync cases pós-deploy automático** — hoje rodando manual (`curl POST /api/cases/sync-from-onedrive` após cada push). *Quem destrava: Rudá (Tarefa Agendada Railway)*

---

## 🟡 BLOQUEIOS P1 — destrava feature/dashboard

- [ ] [B5] **Apollo API key direta** (não MCP) — destrava webhooks + bulk ops + sync mais fino. *Quem destrava: Rudá (Apollo plan)*
- [ ] [B7] **Instagram Graph API** — destrava analytics Insta no `/area/brand`. *Quem destrava: Duda (FB Business)*
- [ ] [B9] **Trello API** — destrava sync kanban projetos. *Quem destrava: Duda (Trello workspace)*
- [ ] [B10] **LinkedIn Developer App** — destrava posts via API + analytics oficial. *Quem destrava: Rudá (LI dev console)*
- [ ] **NEW** Lista brindes atuais (preços + fornecedores + estoque). *Quem destrava: Isabela* — **PRÉ-REQ Sprint 21**
- [ ] **NEW** Upload PDFs SAP no NotebookLM Sales Toolbox. *Quem destrava: Rudá manual*
- [ ] **NEW SEGURANÇA** Rotacionar `client_secret` Azure (foi exposto em chat). *Quem destrava: Rudá (Azure → Certificates & secrets)*

---

## 🎯 SPRINT 19 ✅ FEITO (0.15.0)

- [x] git pull + resolver 3 conflitos (.gitignore, package.json, changelog.json)
- [x] Preservar features locais (área redesign — tool cards + metas dashboard)
- [x] Bump 0.15.0
- [x] Commit `dccecce`
- [ ] Push pra Railway (aguarda "sobe")
- [ ] Re-sync cases prod (após push)
- [ ] Atualizar MEMORY.md com estado pós-sync

---

## 🎨 SPRINT 20 — Rebrand HOME (0.16.0) · 3-5 dias

> **Por quê:** home virou monstro (lançador de apps). Vira **command center do dia-a-dia**.

### Estrutura nova `/office`
- [ ] Header minimal — logo + saudação contextual + chip "Escritório Online"
- [ ] 🌅 Daily Digest pessoal (3 cards: Voices hoje · Eventos próximos 7d · Pendências 🔴)
- [ ] 🎯 Metas FY26 strip horizontal (Site/LinkedIn/Instagram/E-mail/Eventos com %)
- [ ] 📂 6 áreas como mini-cards de RESUMO (não como "apps") — ícone + dona + 2 KPIs + mini-spark + "Abrir →"
- [ ] ⚡ Quick Actions (Optimizer · Cowork · Painel Duda)
- [ ] 🔴 Bloco "Alertas & Bloqueios" (substitui War Room) — lista 🔴 ativas

### Visual / Design tokens
- [ ] Paleta EPI-USE oficial: Navy `#001844` + Red `#cd1543` + Blue Light `#869ec3` + Grey `#cfd1d3`
- [ ] Fontes Maven Pro + Avenir (já em design-tokens.css)
- [ ] **Light mode redesign do zero** (atual está estourado) — fundo `#f8fafc` + cards brancos
- [ ] **Dark mode revisão** — fundo `#0a1525` + componentes com toque de Navy
- [ ] Foto/SVG elefante ERP.ngo como hero secundário
- [ ] Toggle dark/light polido no nav

### Tarefas técnicas
- [ ] Reescrever `public/office.html` e `public/dashboard.html`
- [ ] Novo endpoint `GET /api/home/digest` (agrega voices + eventos + pendências)
- [ ] Novo endpoint `GET /api/war-room` (parsea `pendencias.md` retorna 🔴 ativas)
- [ ] SAP Competitor card **disabled + selo "🔜 em breve"** (não-clicável)
- [ ] Migrar telas com hex hardcoded pra `var(--color-*)` (mínimo: 10 telas)
- [ ] Bump 0.16.0 + changelog
- [ ] Testar dark + light no Chrome MCP
- [ ] Aprovação visual Duda

---

## 🎁 SPRINT 21 — Brindes URGENTE (0.17.0) · 2-3 dias

> **Dor real:** sem controle de estoque, sem catálogo de preços, sem form de solicitação

### Sub-rota `/area/eventos/brindes`
- [ ] Catálogo (foto · SKU · nome · valor · fornecedor · estoque atual + min · personalização + custo)
- [ ] Form de solicitação (quem · evento · cidade · data · multi-select brindes + qty · endereço · obs)
- [ ] Kanban pedidos (Solicitado → Aprovado Isabela → Em produção → Enviado → Entregue)
- [ ] Relatório (total/mês · top brindes · estoque crítico 🔴)

### Tarefas técnicas
- [ ] Seed `public/api/brindes-catalogo.json` (depende Isabela)
- [ ] Seed `public/api/brindes-estoque.json`
- [ ] Endpoints: `GET /api/brindes/catalogo` · `/estoque` · `POST /api/brindes/solicitar` · `/aprovar/:id`
- [ ] Página `public/brindes.html` rota `/area/eventos/brindes`
- [ ] Workflow novo no Cowork: `solicitar-brinde` (auto-route Isabela)
- [ ] Bump 0.17.0

**🙋 Pré-requisito humano:** Isabela enviar planilha com brindes atuais + preços + fornecedores

---

## 📁 SPRINT 22 — Importar pasta ROADMAP MKT OFFICE JUN 2026 (0.18.0) · 2 dias

> **Onde:** `C:\Users\Ruds\Desktop\ROADMAP MKT OFFICE JUN 2026\`

- [ ] `01 LinkedIn Optimizer/` → `vault/00-contexto/optimizer-assets/` (perfis · SSI prints · prompts)
- [ ] `03 LinkedIn Boost/Linkedin followers_*.xls` → `vault/00-contexto/linkedin/` + alimenta `/metas`
- [ ] `04 Cases/Clientes ativos*.xlsx` → sync `/api/cases` (atualizar lista completa)
- [ ] `04 Cases/clientes epiuse sap 4 me*.xlsx` → base global p/ Roberto
- [ ] `05 Inbound/prompt processo*.txt` → `vault/workspaces/area-conteudo/_vt-prompt-inbound.md`
- [ ] `05 Inbound/svg-icon-generator.zip` → descomprimir em `vault/00-contexto/refs/icons-gen/`
- [ ] `06 Office Game/prints gather.docx` → `vault/00-contexto/refs-visuais/`
- [ ] `07 Field Marketing/cronograma_gantt_eventos v1.xlsx` → `/area/eventos`
- [ ] `07 Field Marketing/playbook_eventos_b2b v4.docx` → `/area/eventos`
- [ ] `08 SAP & Enablements/*.pdf` → NotebookLM Sales Toolbox (upload manual) + `vault/00-contexto/sap/`
- [ ] `.assets/Roadmap Claude Engine MKT.md` → comparar com `vault/00-contexto/ROADMAP.md` + merge
- [ ] `.integrations/*.txt|.json` → mover pra `C:\Users\Ruds\.epiuse-optimizer\.env` (NUNCA no repo)
- [ ] `.skills to test/ai-agent-designer.zip` → instalar como plugin Claude Code
- [ ] Script `scripts/import/import-desktop-roadmap.ps1`
- [ ] Log `roadmap/SPRINT-22-import-log.md`

---

## 📝 SPRINT 23 — Export Microsoft To Do .md (0.18.x) · 4-6h

- [x] Versão manual deste arquivo (você está lendo)
- [ ] Script `scripts/export/gen-todo-export.js` que regenera lendo: pendencias.md + changelog.json + plan file + SPRINTS.md
- [ ] Cron mensal dia 1 + hook ao final de cada sprint
- [ ] Backup CSV pra automação futura (Power Automate)

---

## 🤖 SPRINT 24 — Cron + Reembolsos Field (0.19.0) · 2-3 dias

- [ ] Cron re-sync cases pós-deploy (resolve B4)
- [ ] Módulo `/area/eventos/reembolsos` (Multidados Field — recurring need)
- [ ] Webhook RD Station → `/api/leads/scored` (depende Sprint 19 Bruna no plano v1)
- [ ] Bump 0.19.0

---

## 📋 LEGACY DO TO DO ATUAL — triagem

> Itens do seu print Microsoft To Do — status atualizado

- [x] ~~App validar perfis LinkedIn~~ — ✅ Optimizer V1 + V2
- [x] ~~Agentes pra Voices criar/revisar~~ — ✅ pipe-* (briefing/artigo/capa/carrossel/copy-li)
- [x] ~~Automatização Inbound copies/carrosséis~~ — ✅ pipe-carrossel + pipe-copy-li (Cowork)
- [x] ~~Piloto Tutorial LinkedIn com mineiro Voices~~ — ✅ Optimizer V2 testado com Furigo
- [x] ~~Manus migração textos blog HubSpot~~ — ✅ base 693 artigos
- [x] ~~Cases publicáveis ClientCentric~~ — ✅ 22 cases sincronizados
- [x] ~~Centralização assets MKT SharePoint~~ — ✅ Brand Guide V1.1 oficial
- [ ] **Controle de estoque brindes** → 🎯 vira **Sprint 21**
- [ ] **Configurar metas no Apollo** → Bruna (Sprint 19 v1 plano)
- [ ] **Report mensal com dados concorrentes** → skill `sap-competitor-intelligence` existe mas não funciona — investigar Sprint 25
- [ ] **Reembolsos Multidados Field Marketing** → 🎯 vira **Sprint 24**
- [ ] **PDFs SAP no NotebookLM Sales Toolbox** → 🎯 vira parte da **Sprint 22**

---

## 🟢 BACKLOG P2 — próximos meses

- [ ] Voice Agents (Módulo B) — agentes IA falando em nome dos Voices
- [ ] Mapa visual escritório — diagrama dos 17 agentes + workflows + dependências
- [ ] Mobile PWA companion — daily digest no celular
- [ ] Painel Roberto executivo — visão FY26 macro com forecast
- [ ] Auto-publicação LinkedIn com aprovação Duda no fluxo
- [ ] A/B test framework pra LPs
- [ ] Office Engine 2D (game mode pixel art WASD)
- [ ] Cowork colaborativo Anthropic — integração `cowork-plugin-management`
- [ ] Editar inline metas/projetos/ferramentas direto nos módulos
- [ ] Lead Scoring v1 (Bruna) — algoritmo cargo+setor+porte+engagement
- [ ] Attribution view no /relatorio (Bruna)
- [ ] Higienização base 39k contatos (Bruna)
- [ ] Brief generator mídia paga (Gui)
- [ ] Pautas SEO/GEO automatizadas (Gui)
- [ ] Notification push quando workflow termina

---

## 👥 DIVISÃO POR PESSOA

### Rudá (RevOps · estratégico)
- Aprova sprints + push
- Resolve infra/credenciais (B1, B4, B5, B10)
- Rotacionar client_secret Azure (urgente)

### Gui (Growth · Performance)
- Sprint 20: revisar metas FY26 strip
- Backlog: Brief generator mídia paga + Pautas SEO/GEO

### Bruna (Intelligence · CRM)
- Sprint 24+: Lead Scoring + Attribution + Higienização
- Configurar GA4 Service Account (✅ feito)
- Configurar metas Apollo

### Duda (Brand · operacional)
- Sprint 20: aprovação visual rebrand
- Sprint 21: aprovar pedidos brindes
- Sprint 22: enviar planilha SharePoint editorial (B3)

### Isabela (Field Marketing)
- Sprint 21: enviar lista brindes (PRÉ-REQ)
- Sprint 22: revisar gantt + playbook

### Lisiane (Redatoria · tom de voz)
- Backlog: revisar artigos antes de publicar
- Meta 20 artigos/mês

---

## 🧪 MÉTRICAS DE PROGRESSO

- Versão prod (`/api/health`): hoje 0.14.0 → meta 0.19.0 em 2 semanas
- Pendências 🔴 abertas: hoje 2 → meta zero em 4 semanas
- Workflows disparados (`/api/cowork/runs`): meta 5+/semana
- Voices ativos: hoje 2/5 → meta 5/5 ago/26
- SSI médio Voices: baseline 34 → meta 60+ em 90 dias
- Posts/mês: meta 40 (2/sem × 5 Voices)
- Artigos publicados: meta 20/mês (Lisiane)
