# 🗂️ SPRINTS — EPI-USE Office (fonte única, organizada)

> Atualizado 04/jun/2026. Toda ferramenta lê isto + `ROADMAP.md` + `_LOCK.md`.
> Versão atual: **1.0.0** · Prod Railway: desatualizada (aguarda push autorizado por Rudá).

---

## ⚠️ LIÇÕES CRÍTICAS (não repetir)

1. **Google Drive clobbera edições.** O projeto está em `G:\Meu Drive\...` e o sync do Drive **reverte arquivos no meio da edição** (ex: nav voltou pra 0.6.4 após bump). **Mitigação:** commitar no git IMEDIATAMENTE após editar; git é a verdade. **Fix definitivo recomendado:** mover o repo pra disco local `C:\` (como já foi feito com node_modules em `C:\Users\Ruds\.epiuse-optimizer`).
2. **Regra 7 — NADA de número chumbado.** Auditado em `AUDITORIA-DADOS-REAIS.md`. Site/Instagram/Email NÃO estão integrados (mostram `—`). LinkedIn é real-mas-stale (xls, abr/26).
3. **Push só sob ordem explícita por push** (Regra 3).
4. **`.ps1` ASCII-only** (PowerShell 5.1 quebra com acento).

---

## ✅ SPRINTS CONCLUÍDAS

| Sprint | Versões | Entrega |
|---|---|---|
| **S1-S3** Fundação | 0.2.x–0.3.x | Game 2D · Voices · Painel Duda · Inbound · office-nav/footer · SQLite |
| **S4** Optimizer | 0.4.0–0.4.12 | Refundação Vision-first · 7 pilares + Voice Index · split 2-calls · Export PDF · ERP.ngo branding · Cases reais |
| **S5** Dados+Telas | 0.5.0–0.5.1 | /relatorio · /artigos (693) · /jornadas · /projecoes · /pipeline · /metas-fy26 (29 metas) · Rule 7 · skill relatorio-mensal |
| **S6** Design System | 0.6.0–0.6.4 | DESIGN.md + gen_tokens · /design viewer · Brand Guides oficiais · logos · Open Sans · modularização |
| **S7** Estabiliza+Codex+Real | 0.7.0–0.7.1 | **localhost always-on** (fix Node24/better-sqlite3 + Tarefa Agendada) · /api/health · **paleta Codex** · multi-tool protocol · **/metas dado real** · auditoria dados · footer consertado |
| **S8** SSO + Módulos área | 0.8.0 | SSO Microsoft (Entra ID) + 6 módulos por área com dado REAL ao vivo (Apollo/LinkedIn/Artigos/Cases) |
| **S9-S11** Agentes 3 camadas | 0.8.1–0.8.3 | Arquitetura 3-camadas (6 áreas + executores + pipeline) · relatorio-mensal · 5 agentes pipeline conteúdo · 17 agentes totais |
| **S12-S13** Optimizer refundado | 0.9.0–0.9.5 | Optimizer V1 zero tokens · V2 findskill.ai · padrão visual Anderson Costa |
| **S14** Cowork | 0.10.0–0.10.1 | /cowork · workflows JSON dinâmicos · feed unificado · fix inbox Railway |
| **S15** Módulo C Painel | 0.11.0 | Daily Digest + Inbox por área no Painel da Duda · APIs /api/painel/digest e /inbox-duda |
| **S16** v1.0 Lançamento | 1.0.0 | SemVer real · todos os contadores sincronizados · ROADMAP e SPRINTS atualizados |

---

## 🚀 PRÓXIMAS SPRINTS

### S17 · Railway persistência + push v1.0.0
- Rudá cria Volume no dashboard → fix SQLite persistente
- Rudá autoriza push → v1.0.0 em produção

### S18 · Dados reais (integrações pendentes)
- Apollo /pipeline já OK · GA4 (aguarda JSON+Property ID) · Instagram Graph (aguarda FB App) · LinkedIn xls mensal
- Planilha Duda → calendar editorial real

### S19 · SSO Microsoft ativo em prod
- 5 passos humanos no Azure (ver pendencias.md B1) → testar login @epiuse.com.br em prod

### S20 · Qualidade + backlog
- Smoke test 10 rotas restantes · remover botão Sync RD · Shadow DOM nav/footer
- Cron diário Cases OneDrive → Railway

### S21 · Competitor Move Tracker
- Dashboard de monitoramento de competidores (vibe intel-report, dark mode)
- Barra de alertas no topo "This Week's 3 Biggest Moves"
- Grid responsiva de 2 colunas com cards colapsáveis e bolinha de atividade (R/A/G)
- Indicadores: último blog post, atividade LinkedIn 7d, vagas postadas 14d (🚨), sinais de expansão, e insight de 1 linha "O que isso significa para mim" gerado via LLM (askClaude) usando o contexto de `empresa.md`.

### S24 · SEO Pulse Dashboard
- Backend: rotina diária conectada ao GSC (Search Analytics API) e GA4, calculando cliques, impressões, CTR e posição média (28d vs 28d anteriores) + sessões por canal e conversões por landing page.
- IA: prompt `askClaude` gerando insight acionável "What to do next" baseado nas variações detectadas.
- Frontend: painel `/seo-pulse` responsivo em dark mode seguindo tokens, com Chart.js para o donut de tráfego, Movers & Shakers para páginas com variação $\ge 3$ posições nos últimos 7 dias.

---


## 📚 Fontes da verdade (ler nesta ordem)
1. `CLAUDE.md` (raiz) — regras de ouro + identidade
2. `vault/00-contexto/SPRINTS.md` (este) — o que foi/será feito
3. `vault/00-contexto/ROADMAP.md` — backlog vivo
4. `vault/00-contexto/AUDITORIA-DADOS-REAIS.md` — real vs fake
5. `vault/00-contexto/DESIGN.md` — design system (tokens)
6. `vault/00-contexto/multi-tool-protocol.md` + `_LOCK.md` — coordenação Claude/Codex/Obsidian
7. `vault/00-contexto/{empresa,projetos,branding,pessoas}.md` — negócio
