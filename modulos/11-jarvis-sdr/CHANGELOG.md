# CHANGELOG — Módulo 11 (JARVIS)

## v0.3.0 — 2026-06-23 · Suporte a backend OpenAI-compat (odysseus local / Ollama / LM Studio)
Motivo: descobrimos que o **odysseus** (repo `pewdiepie-archdaemon/odysseus`) é um **workspace de IA
self-hosted** que roda **modelos locais** (Ollama na `:11434`, LM Studio na `:1234` — formato OpenAI
`/v1/chat/completions`), não um gateway Anthropic. Subir ele no Railway não é viável (sem GPU). Decisão do
Rudá: manter o odysseus **no PC** e expor via **túnel**, com o JARVIS apontando pra ele.

**Adicionado (só em `routes/jarvis.js` — adaptador, sem mexer no app existente):**
- Nova env var `JARVIS_LLM_FORMAT` = `anthropic` (padrão) | `openai`. Em `openai`, o JARVIS fala
  `/v1/chat/completions` (Ollama/LM Studio/odysseus) via `fetch`, em vez do SDK Anthropic.
- Helper unificado `callLLM({system,user,maxTokens})` — ramo `openai` (fetch) e ramo `anthropic`
  (SDK, **inalterado**). `coach` e `brief` passam por ele.
- `openaiChatUrl()` tolera base com ou sem `/v1` no fim.
- `aiReady()` reconhece o modo `openai` (pronto quando `JARVIS_LLM_BASE_URL` está setado; key opcional).
- `GET /api/jarvis/playbook` agora também expõe `formato` (`anthropic`/`openai`) e `backend`
  (`openai-compat` quando aplicável).

**⚠️ Pós-deploy (humano):** subir túnel pro Ollama/odysseus local + setar no Railway:
`JARVIS_LLM_FORMAT=openai` · `JARVIS_LLM_BASE_URL=<url-do-túnel>` · `JARVIS_LLM_MODEL=<modelo do Ollama>`
(`JARVIS_LLM_API_KEY` só se o backend exigir). Limitação: só funciona com o PC + Ollama + túnel ligados.

## v0.2.0 — 2026-06-23 · Backend de IA via odysseus (Anthropic-compat)
Motivo: a API direta da Anthropic ficou **sem créditos** (`credit balance is too low`). Trocamos o backend
de IA do JARVIS para o **odysseus** (gateway Anthropic-compatible, `/v1/messages`, com URL pública).

**Adicionado (só em `routes/jarvis.js` — adaptador configurável, sem mexer no app existente):**
- Client de IA configurável por **env var off-repo**: `JARVIS_LLM_BASE_URL` · `JARVIS_LLM_API_KEY` ·
  `JARVIS_LLM_MODEL` (aliases `ODYSSEUS_*`). Reusa a classe Anthropic via `client.constructor`, só trocando
  `baseURL` + `apiKey` — zero require novo, zero mudança no `server-context.js`.
- Fallback: se as vars do odysseus não existirem, usa o client Anthropic padrão (`ANTHROPIC_API_KEY`).
- `coach` e `brief` agora chamam `aiClient.messages.create({ model: AI_MODEL, … })`.
- Guard `aiReady()` (odysseus OU chave Anthropic) com mensagem 503 clara.
- `GET /api/jarvis/playbook` agora expõe `backend` (`odysseus`/`anthropic`), `modelo` e `ia_pronta`.

**⚠️ Pós-deploy (humano, no Railway):** setar `JARVIS_LLM_BASE_URL` (+ `JARVIS_LLM_API_KEY` e, se preciso,
`JARVIS_LLM_MODEL`) nas env vars. Sem isso, prod continua tentando a Anthropic sem crédito.

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
