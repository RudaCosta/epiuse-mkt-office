# 🗂️ SPRINTS — EPI-USE Office (fonte única, organizada)

> Re-grounding 30/mai/2026. Substitui o histórico espalhado. Toda ferramenta lê isto + `ROADMAP.md` + `_LOCK.md`.
> Versão atual: **0.7.1** · Prod Railway: **0.7.0** (0.7.1 aguarda push).

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

---

## 🚀 PRÓXIMAS SPRINTS (a fazer — uma de cada vez, pós /compact)

### Sprint 8 · DADOS REAIS de verdade (prioridade MÁXIMA do Rudá)
> Objetivo: tirar TODO `—`/placeholder e plugar plataforma por plataforma.
- **8.1 Apollo → /pipeline** (✅ desbloqueado, faço sozinho) — R$/MQL/SQL/reuniões reais
- **8.2 GA4 + Search Console** (aguarda: Service Account JSON + Property ID do Rudá) — site/SEO real
- **8.3 RD Station** (aguarda: Personal API Token) — email/newsletter real
- **8.4 Trello** (aguarda: Key+Token+BoardIDs) — tarefas reais
- **8.5 Instagram Graph** (aguarda: Business+FB App) — IG real
- **8.6 LinkedIn** — atualizar xls mensal OU Company API

### Sprint 9 · Report PDF automático (igual ao PPT)
- Agente lê dados reais (pós S8) → preenche template do PPT → exporta PDF idêntico

### Sprint 10 · SSO Microsoft
- @azure/msal-node · /auth/* · flag DISABLE_AUTH · login @epiuse (creds em mãos)

### Sprint 11 · Design visível + infra
- **Decisão pendente:** Codex só aparece no LIGHT (dark foi preservado). Opções: (a) light vira default, (b) aplicar Codex no dark também. **Rudá decide.**
- Mover repo pra disco local `C:\` (resolve clobber do Drive)
- Railway Volume (Rudá cria) + re-sync cases

---

## 📚 Fontes da verdade (ler nesta ordem)
1. `CLAUDE.md` (raiz) — regras de ouro + identidade
2. `vault/00-contexto/SPRINTS.md` (este) — o que foi/será feito
3. `vault/00-contexto/ROADMAP.md` — backlog vivo
4. `vault/00-contexto/AUDITORIA-DADOS-REAIS.md` — real vs fake
5. `vault/00-contexto/DESIGN.md` — design system (tokens)
6. `vault/00-contexto/multi-tool-protocol.md` + `_LOCK.md` — coordenação Claude/Codex/Obsidian
7. `vault/00-contexto/{empresa,projetos,branding,pessoas}.md` — negócio
