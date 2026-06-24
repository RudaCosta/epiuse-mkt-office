# CHANGELOG — Módulo 11 (JARVIS)

## v0.8.0 — 2026-06-24 · Cérebro vivo + diarização heurística + loop de conteúdo
Motivo: o Rudá quer que o JARVIS **aprenda** — absorver clientes/SDR/produtos SAP/battle cards, entender a
dor e como abordar; ser **vivo** como o RAG; e **guiar os próximos conteúdos**. E parar de clicar
"Prospect/SDR" a cada turno — auto-rotular **Voz 1 / Voz 2** e marcar quem é quem 1×.
Decisões (24/jun): diarização **heurística no navegador** (interino) · **MVP vivo** (persistência + KB +
loop, sem embeddings) · documentar no Obsidian + criar **sub-agente destilador** `jarvis-sdr`.

**Adicionado (aditivo — `routes/jarvis.js`, `public/jarvis.html`, KB, docs):**
- **Memória viva (SQLite, cloud-ready):** tabelas `jarvis_calls` + `jarvis_aprendizados` criadas no boot do
  router (volume `/data` no Railway). As dores/objeções/gatilhos ouvidos voltam pro system prompt
  ("=== MEMÓRIA VIVA — DORES JÁ OUVIDAS EM CAMPO ===" via `recallDores()`) — o JARVIS antecipa a dor.
- **Pós-call:** `POST /api/jarvis/encerrar` salva a call e **extrai (IA) aprendizados REAIS** (dor/objeção/
  gatilho/pergunta vencedora/sinal) por LOB·indústria·persona. Botão "🏁 Encerrar & salvar".
- **Loop campo→conteúdo:** `GET /api/jarvis/dores-de-campo` agrega o que os SDRs ouviram, por LOB → insumo
  pra pautar conteúdo. Botão "📊 Dores de campo".
- **KB curada:** `kb-produtos-sap.json` + `kb-battle-cards.json` (schema documentado, **`⏳ aguarda ingestão`** —
  Regra 7, nada inventado). Injetada no prompt fatiada por LOB (`selectKb()`). Battle card = uso INTERNO,
  nunca nomeia concorrente na fala. `GET /api/jarvis/playbook` agora reporta o estado da KB.
- **Diarização heurística:** Voz 1 / Voz 2 separadas por **pausa** (`inferVoz`, gap 1,6s), sem clicar a cada
  turno. Mapeamento de papel **1×** (Voz 1/2 = SDR/Cliente, exclusivo). Override manual "↔️ trocar voz".
  Gauges (% fala, perguntas) e disparo do coach passam a usar o **papel derivado**. Etiqueta honesta de que
  é heurística (não diarização acústica). UI header → v0.8.

**Org / docs:** perfil `vault/agentes/jarvis.md` (o que é, como se porta, como aprende) + linha no
`vault/agentes/_index.md`; **sub-agente** `.claude/agents/jarvis-sdr.md` (destilador offline, área Pipeline).

**Fora de escopo (fase futura):** STT pago com diarização acústica real (Deepgram/AssemblyAI) + captura de
áudio da aba; RAG semântico (embeddings) na nuvem unificando playbook+cases+artigos+aprendizados; enrich
Apollo/Zoho do prospect.

## v0.7.0 — 2026-06-24 · Logo Megamind ("mega brain") no header
Motivo: o Rudá pediu o logo do JARVIS como meme do **Megamind** ("mega brain") no lugar da bolinha (orb)
pulsante do cabeçalho. Decisão (24/jun): **V1** (Megamind preenche o orb) + **SVG autoral** (caricatura
estilizada, não a arte oficial DreamWorks — uso interno/meme, baixo risco de IP).

**Adicionado (aditivo — `public/jarvis.html`, `public/img/jarvis/`):**
- Asset `public/img/jarvis/logo-megamind-v1.svg`: badge SVG self-contained (cabeça azul, olhos verdes, gola
  preta) preenchendo o disco redondo, com halo próprio.
- `.orb` agora hospeda o `<img>` do logo (`.orb img` absolute, 100%, redondo). **Glow + `@keyframes pulse`
  preservados** — o gradiente original vira **fallback** se o SVG não carregar.
- UI header → v0.7. (V2 "sobreposto" foi descartado na decisão; preview mantido em `logo-megamind-v2.svg`.)

## v0.6.0 — 2026-06-23 · Humanizer + cérebro real (estratégia FY27 · cases · conteúdos · web)
Motivo: as recomendações estavam genéricas (paráfrase da fala, tom robótico, sem cases/conteúdos reais).
O Rudá entregou as fontes: a skill **`blader/humanizer`** (guia "Signs of AI writing" da Wikipedia) e a
**planilha de estratégia FY27** (ICP, Personas, Indústrias, Diferenciação Competitiva, Jornadas, Cases reais).

**Adicionado (aditivo — `routes/jarvis.js`, `playbook.json`, `public/jarvis.html`):**
- **Humanização inline da `talk_track`** no `buildSystemPrompt()`: regras adaptadas do humanizer pra fala em
  PT-BR (contrações, frases curtas/variadas; proíbe travessão, vocabulário-robô, "Entendo que X é um
  desafio...", regra de três, clichê motivacional; prefere PERGUNTAR). 2 exemplos ❌→✅. Zero latência extra.
- **Cérebro FY27** no `playbook.json` (v0.3.0): seções novas `icp_por_lob`, `personas_detalhe`,
  `diferenciacao_competitiva` (uso INTERNO — nunca nomear concorrente na fala), `jornadas`, `cases_reais`
  (COMIGO, Cidade Matarazzo, FQM, Scala, Raízen, Klabin — anonimizar salvo aprovação). `buildSystemPrompt(ctx)`
  injeta só a fatia relevante por LOB/persona/indústria (token enxuto via `selectFY27`).
- **Cases & conteúdos REAIS** (RAG-lite cloud-ready): helper `retrieveArtigos()` sobre
  `public/api/artigos.json` (filtro LOB→linha_de_negócio + keyword). `coach`/`brief` devolvem
  `conteudos_sugeridos:[{titulo,url,porque}]` — **saneados** contra a lista real (anti-alucinação de URL).
  UI: card `📎 Conteúdos pra enviar` com links clicáveis.
- **Pesquisa web de produto** `POST /api/jarvis/pesquisar` (OpenRouter, reusa `OPENROUTER_API_KEY`; modelo
  `:online` via `JARVIS_WEB_MODEL`, default `perplexity/sonar`; foco sap.com/servicenow.com). Só no pré-call
  (botão `🔬 Pesquisar produto`). Etiqueta `🌐 Pesquisa web — verificar`. 503 claro sem a key.
- UI header → v0.6.

**Fora de escopo (vira build futuro):** NotebookLM roda só no Claude **local** do Rudá (browser-automation,
não é API de servidor). Enriquecimento de corpus por NotebookLM será **exportado e commitado** depois.

## v0.5.0 — 2026-06-23 · Backend hospedado (Groq) + diagnóstico de conectividade
Motivo: o backend local (Ollama no PC + Quick Tunnel Cloudflare) era frágil por design — exigia o PC
ligado, o `cloudflared` aberto numa tela, e o URL do túnel **expirava** a cada reinício (causa raiz do
"fetch failed"). Decisão do Rudá: migrar pra **inferência hospedada** pra funcionar 24/7, pra qualquer
SDR, de qualquer lugar, sem manter nada aberto. Provedor escolhido: **Groq** (grátis, baixa latência,
OpenAI-compatível — encaixa no adaptador `JARVIS_LLM_FORMAT=openai` sem mudar a lógica do app).

**Adicionado (só em `routes/jarvis.js` + `public/jarvis.html` — aditivo):**
- `GET /api/jarvis/ping` — health-check de conectividade do servidor com o backend de IA. No modo `openai`
  bate em `/v1/models` **com a chave** (padrão Groq/OpenRouter/Ollama) e devolve `{ok, message, baseUrl,
  modelo}`. Diferencia 401 (chave inválida) de erro de rede. (v0.4 introduziu o ping testando a raiz; v0.5
  corrigiu pro endpoint `/models` autenticado, que é o health-check certo pra provedor hospedado.)
- `openaiModelsUrl()` — monta a URL de listagem de modelos tolerando base com/sem `/v1`.
- UI: badge 🟢/🔴 no cabeçalho "JARVIS recomenda" (ping no boot via `pingIA()`); `renderCoachError`
  detecta "fetch failed/Failed to fetch/NetworkError" e mostra dica de diagnóstico.

**⚠️ Pós-deploy (humano, no Railway):** criar conta grátis em `console.groq.com` → gerar API key →
setar: `JARVIS_LLM_FORMAT=openai` · `JARVIS_LLM_BASE_URL=https://api.groq.com/openai/v1` ·
`JARVIS_LLM_MODEL=llama-3.3-70b-versatile` · `JARVIS_LLM_API_KEY=gsk_...`. Sem PC, sem túnel.

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
