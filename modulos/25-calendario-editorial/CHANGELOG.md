# Changelog — Módulo 25 · Calendário Editorial

## v1.1 — 04/out/2026
- **Fase 2 ligada no servidor:** em produção o Office baixa a planilha da nuvem via Graph no boot e a cada 6h (`routes/editorial.js`), sem tarefa no PC. Desliga com `EDITORIAL_AUTO=0`; não roda na máquina local.
- Último OK/erro guardado em `app_blobs['editorial.auto']` → `autoStatus()` (usado pela área Brand, Módulo 30).
- Botão 🔄 Resync passa a puxar da nuvem quando o auto-sync está ligado.
- Fix: o resync passa o token ativo do servidor pro script (sem `EDITOR_TOKEN` no ambiente o POST de volta dava 401).

## v1.0 — 30/set/2026 (Office 0.91.0)
- **Fase 1 completa.** 3 telas (`/editorial/insights`, `/editorial/calendario`, `/editorial/pautas`).
- Parser das 3 abas da planilha do marketing (`sync_calendario_editorial.js`):
  - 💡 Insights: 3 tabelas (formato / tema / melhor dia) → `edt_insights`
  - 📅 Calendário: 40 posts semana 1→10 (ago→out/26) → `edt_calendario`
  - 📝 Pautas: 7 pautas → `edt_pautas`
- Endpoints: `GET /api/editorial/{insights,calendario,pautas}` · `POST /api/editorial/sync` (mirror) · `POST /api/editorial/resync` (botão 🔄).
- Cards nas áreas **Intelligence** (Bruna) e **Brand** (Duda) via `areas.json`.
- Breadcrumbs e highlight de nav (insights→Intelligence, calendário/pautas→Brand).
- `graph_fetch.js` escrito (Fase 2), aguardando permissão `Files.Read.All` da TI.
- Validado end-to-end em instância de teste (parse 3/40/7 · sync · resync · 3 telas renderizando).

## Backlog
- Fase 2: leitura ao vivo da nuvem via Graph (destrava com TI).
- Cron diário (Tarefa Windows) para resync automático, quando a Fase 2 estiver ativa.
- Filtros na tela de calendário (por LOB / formato / status).
