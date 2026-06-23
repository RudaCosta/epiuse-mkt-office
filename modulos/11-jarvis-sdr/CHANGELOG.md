# CHANGELOG — Módulo 11 (JARVIS)

## v0.1.0 — 2026-06-23 · Fundação (GUI + voz + IA)
Sessão 5. Primeira fatia vertical do copiloto SDR/BDR, **só adicionando código** (regra de ouro do Rudá).

**Adicionado:**
- `public/jarvis.html` — GUI HUD estilo JARVIS (orb pulsante, gauges circulares SVG, waveform de áudio
  real, fonte mono) usando os **design-tokens EPI-USE** (Regra 8). Rota limpa `/jarvis`.
  - Escuta ao vivo via `Web Speech API` (pt-BR, contínuo, interim) + **fallback manual**.
  - Segmento "mic atribui a Prospect/SDR" pra rotular falas.
  - Gauges REAIS da sessão: temperatura (IA), % de fala do SDR, nº de perguntas.
  - Cards de coach: próxima pergunta, fala sugerida, contorno de objeção, próximo passo, sinais, LOB.
  - Banner fixo `🤖 Sugestões geradas por IA` (Regra 6).
- `routes/jarvis.js` — router modular (espelha `routes/inbound.js`):
  - `GET /jarvis` (página, `requireAuth`)
  - `GET /api/jarvis/playbook` (popula dropdowns com a base real)
  - `POST /api/jarvis/coach` (Claude Haiku 4.5, system prompt = persona sênior + playbook)
  - `POST /api/jarvis/brief` (pré-call brief por persona/LOB/indústria)
  - rate limit + degradação clara (503) quando falta `ANTHROPIC_API_KEY`.
- `modulos/11-jarvis-sdr/playbook.json` — base de conhecimento **real** (empresa, 11 LOBs, pitches por
  persona, gatilhos 2026, matriz indústria×dor, frameworks BANT/MEDDIC/SPIN, 6 objeções com contorno).
- Docs do módulo: `README.md`, `CHANGELOG.md`, `DECISIONS.md`, `PENDENCIAS.md`.

**Edições aditivas (sem alterar lógica existente):**
- `server.js`: 2 linhas montando `jarvisRouter`.
- `public/office-nav.js`: 1 link no overflow.
- `modulos/README.md`: 1 linha de índice.

**Deploy:** NÃO subiu pro Railway (Regra 3). Apenas branch de feature + PR draft.
