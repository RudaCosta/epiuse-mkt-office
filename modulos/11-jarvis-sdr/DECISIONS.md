# DECISIONS — Módulo 11 (JARVIS)

Decisões arquiteturais + rationale. (Sessão 5 · 23/jun/2026)

## D1 — Router modular novo, não edição do server.js
**Decisão:** criar `routes/jarvis.js` e montá-lo com 2 linhas aditivas, espelhando `routes/inbound.js`.
**Por quê:** regra de ouro da sessão = **só adicionar código**. O `server.js` já tem o padrão de routers
modulares (`sap`, `auth`, `cases`, `inbound` em ~4622). Isso isola o JARVIS e não altera comportamento existente.

## D2 — Página servida por rota limpa `/jarvis`
**Decisão:** `router.get('/jarvis', requireAuth, …)`.
**Por quê:** `express.static('public')` já serviria `/jarvis.html`, mas a rota limpa é o padrão do Office e
permite `requireAuth` (no-op até SSO ser enforced, igual `/inbound`).

## D3 — Claude Haiku 4.5 no loop ao vivo (não Sonnet)
**Decisão:** `claude-haiku-4-5` para o coach em tempo real.
**Por quê:** coaching ao vivo exige **baixa latência**; Haiku responde rápido e barato. Qualidade fica boa
porque o system prompt carrega a base real + persona. "Deep mode" com Sonnet fica em PENDENCIAS pra análise
pós-call ou sob demanda.

## D4 — Web Speech API + fallback manual (não upload/STT server-side)
**Decisão:** transcrição no browser via `Web Speech API` (pt-BR), com campo manual de reserva.
**Por quê:** zero custo, zero upload de áudio, tempo real, sem dependência nova. **Limitação conhecida:** o
mic capta só o áudio local (voz do SDR / viva-voz), não o áudio do interlocutor numa call remota — por isso
o **fallback manual** pras falas do prospect. Captura de áudio do sistema (loopback) fica como evolução futura.

## D5 — Estética híbrida via design-tokens (não ciano hardcoded)
**Decisão:** clima HUD JARVIS (orb, anéis, waveform, mono) mas **todas as cores vêm de `var(--color-*)`** do
`design-tokens.css` (Regra 8). Paleta local mapeia tokens EPI-USE (stratview-blue-light como glow, erp-blue-mid
como ciano, primary-navy/red, service-now-purple).
**Por quê:** honra a fonte única da verdade de design e mantém a identidade EPI-USE sem brigar com o visual sci-fi.

## D6 — Gauges/KPIs derivados da sessão (Regra 7)
**Decisão:** % de fala e contagem de perguntas são **calculados da transcrição ao vivo**; temperatura vem da
IA (etiquetada 🤖). Nenhum número fictício.
**Por quê:** Regra 7 (real data only) — nada de KPI inventado se passando por real.

## D7 — Base de conhecimento em JSON versionado (não hardcoded no prompt)
**Decisão:** `playbook.json` separado, carregado 1x no boot e injetado no system prompt.
**Por quê:** dado real rastreável e fácil de atualizar sem mexer no código; fontes declaradas em `_meta`.

## D8 — Memória viva em SQLite (não embeddings) — v0.8
**Decisão:** persistir calls + aprendizados em tabelas SQLite (`jarvis_calls`, `jarvis_aprendizados`) e fazer
o "retrieval" da memória por **LOB/keyword** (não vetorial). As dores ouvidas voltam pro system prompt.
**Por quê:** decisão do Rudá foi **MVP vivo sem embeddings** — cloud-ready (volume `/data` no Railway já
provado, P0/D1), zero custo/dependência nova, e o `better-sqlite3` é síncrono (consulta no coach sem
latência sensível). RAG semântico (embeddings) fica pra fase futura; o RAG vetorial de verdade segue offline
na GPU do Rudá (`modulos/08-inbound-offline`). **Regra 7:** aprendizados só de calls REAIS (fonte='call').

## D9 — Diarização heurística no navegador (não STT pago) — v0.8
**Decisão:** auto-rotular **Voz 1/Voz 2** por **pausa** entre falas (gap 1,6s) no Web Speech API, com
mapeamento de papel **1×** e override manual. **Não** integrar STT pago com diarização acústica agora.
**Por quê:** decisão do Rudá foi o caminho **interino, grátis e imediato**. O Web Speech API não separa vozes
acusticamente — então isso é **explicitamente etiquetado como heurística** (Regra 7: não vender como
diarização real). Resolve a dor principal (parar de clicar a cada turno). STT real (Deepgram/AssemblyAI) +
captura de áudio da aba fica como decisão/fase futura quando o Rudá aprovar a chave + custo.

## D10 — JARVIS = app em runtime + sub-agente destilador (duas faces) — v0.8
**Decisão:** manter o **app ao vivo** como módulo (não sub-agente) e criar um **sub-agente** `jarvis-sdr`
(área Pipeline) que **destila as calls offline** em conhecimento curado e pautas.
**Por quê:** runtime de call exige baixa latência e roda 24/7 na nuvem (não cabe no fluxo de sub-agentes
Claude Code). Mas a inteligência que **aprende** (estruturar KB, consolidar dores, pautar conteúdo) é
trabalho offline/lote — encaixa como sub-agente, dono do contexto de pipeline. As duas faces se conectam
pela memória viva (SQLite). Documentado em `vault/agentes/jarvis.md`.
