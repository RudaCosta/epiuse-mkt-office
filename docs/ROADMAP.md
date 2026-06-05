# Roadmap — EPI-USE Office

> Prioridades de produto e desenvolvimento.
> Atualizado: junho/2026 · v0.12.0

---

## Estado atual (v0.12.0 · jun/2026)

### O que está funcionando
- ✅ Office Home com navegação por área
- ✅ 6 áreas com dashboard de funil + KPIs + ferramentas
- ✅ Profile Optimizer V1 + V2 (kit LinkedIn para Voices)
- ✅ Pipeline Apollo (39k contatos, 14k empresas, 15 sequências)
- ✅ Inbound pipeline (brief → artigo → carrossel via Cowork)
- ✅ Artigos blog (693 artigos pesquisáveis)
- ✅ Cases CS (sync com aprovação Roberto)
- ✅ Relatório mensal (PPTX export)
- ✅ Metas FY26 (dashboard + planilhas)
- ✅ Design System com tokens CSS
- ✅ Lifecycle automático (Windows Task Scheduler)
- ✅ Deploy Railway (auto no push para master)

### O que está em construção
- 🚧 Painel Duda (Módulo 10) — sprint 15 iniciado

---

## Prioridades Q2/Q3 2026

### P0 — Crítico (próximas 2 semanas)

| Item | Descrição | Dono |
|---|---|---|
| Painel Duda — fase 1 | Daily digest + inbox por área + KPIs Voices | Rudá/Duda |
| Integração GA4 | Tráfego orgânico no relatório mensal | Rudá |
| Fix SQLite Railway | Solução permanente para persistência de dados no Railway | Rudá |

### P1 — Alta prioridade (próximo mês)

| Item | Descrição | Dono |
|---|---|---|
| Painel Duda — fase 2 | Feed de agentes + calendário editorial | Rudá/Duda |
| LinkedIn API | Seguidores e engajamento automático no dashboard | Rudá |
| War Room V2 | Visão executiva com dados reais de todas as fontes | Rudá |
| Projeções paid media V2 | Cenários com dados reais de CAC histórico | Rudá |

### P2 — Médio prazo (Q3 2026)

| Item | Descrição | Dono |
|---|---|---|
| Voice Agents (Módulo B) | Automação de posts dos Voices (rascunho → aprovação → post) | Rudá |
| Zoho CRM integration | Pipeline CRM no dashboard de Outbound | Rudá |
| RD Station integration | Leads inbound no funil de Inbound & Growth | Rudá |
| Casos V2 | Upload de casos em PDF + extração automática via Claude | Rudá/Roberto |
| SEO Dashboard | Posicionamento de palavras-chave + sugestões de pauta | Rudá/Gui |

### P3 — Backlog (Q4 2026+)

| Item | Descrição |
|---|---|
| App mobile (PWA) | Versão mobile-first do Office |
| Multi-tenant | Replicar a plataforma para outras BUs da EPI-USE |
| Eventos Hub V2 | Dashboard de eventos com integração MDF SAP |
| Attribution model | Modelo de atribuição marketing → vendas |
| Office Engine 2D | Sala virtual com agentes representados graficamente |

---

## Sprints concluídos

| Sprint | Versão | Principais entregas |
|---|---|---|
| Sprint 1–8 | 0.1–0.8 | Fundação, Optimizer V1, Pipeline, Inbound base |
| Sprint 9 | 0.9.0 | Optimizer refundado (zero tokens, fluxo copia-prompt) |
| Sprint 9.1 | 0.9.1 | Optimizer V1 simplificado (1 template .md) |
| Sprint 9.2 | 0.9.2 | Optimizer artefato standalone |
| Sprint 9.3 | 0.9.3 | Optimizer V2 (input transcrição + Voice Index) |
| Sprint 9.4 | 0.9.4 | Optimizer V2 baseado no findskill.ai |
| Sprint 9.5 | 0.9.5 | Padrão visual Anderson Costa nos templates |
| Sprint 10 | — | Metas FY26 (gerador XLSX + template SMART) |
| Sprint 11 | 0.8.x | Biblioteca de conteúdos + pipeline editorial + nav reorganizada |
| Sprint 12 | — | Guia operacional Optimizer (passo a passo V1+V2) |
| Sprint 13 | — | Design System V1.0 com Brand Guide V1.1 |
| Sprint 14 | 0.10.0 | Cowork workflows dinâmicos entre agentes |
| Sprint 14.1 | 0.10.1 | Fix: auto-cria pasta inbox se workspace não existir |
| Sprint 15 | 0.11.0 | Painel Duda — sprint inicial (Módulo C) |
| Sprint 16 | 0.12.0 | Area.html: meta-card, tool-card, metas no funil |

---

## Decisões de arquitetura

| Data | Decisão | Rationale |
|---|---|---|
| mai/2026 | Zero frameworks no frontend | Simplicidade, sem build step, portabilidade |
| mai/2026 | SQLite como DB principal | Zero config, funciona offline, simples |
| mai/2026 | Vault Obsidian-style para agentes | Contexto portável entre sessões de IA |
| mai/2026 | Railway para deploy | Simples, auto-deploy, gratuito no tier atual |
| mai/2026 | Windows Task Scheduler para lifecycle | PM2 era frágil no Windows; Tarefas Agendadas são nativas |
| mai/2026 | Design tokens via CSS variables | Uma mudança propaga em todas as páginas |
| jun/2026 | EDITOR_TOKEN para sync de cases | Workaround para SQLite Railway não persistir |

---

*Atualizado em: junho/2026 · v0.12.0*
