# PENDÊNCIAS — Módulo 11 (JARVIS)

## ✅ Resolvido na v0.8 (24/jun)
- **Atribuição de quem fala.** ~~Manual "Prospect/SDR" a cada turno.~~ Agora **diarização heurística**
  (Voz 1/Voz 2 por pausa) + mapeamento de papel 1× + override "↔️ trocar voz". Ver limitação abaixo.
- **Sem persistência.** ~~A call não era salva.~~ Agora `jarvis_calls` + `jarvis_aprendizados` (SQLite,
  volume `/data`). Pós-call extrai dores reais; "Dores de campo" agrega por LOB pra pautar conteúdo.

## 🟢 Resolvido na v0.10 (01/jul) — beta a validar em navegador
- **Captura de áudio do prospect em call de fone.** ~~Web Speech só pegava o mic.~~ Agora **captura o áudio
  da call** (`getDisplayMedia`) + **STT FREE no navegador** (Whisper via transformers.js, WebGPU/WASM) →
  ouve o cliente **de graça, em tempo real**. Isso também **resolve a diarização** (mic=SDR, call=Cliente
  por fonte — sem heurística). **BETA:** validar em navegador real (WebGPU/áudio não rodam no CI).

## 🟡 Limitações conhecidas (v0.10)
- **Captura beta depende do ambiente.** Reunião no **navegador** (Meet/Teams/Zoom web) funciona (Win/Mac);
  **app nativo no Mac** não expõe áudio do sistema via `getDisplayMedia` → futuro: cabo virtual ou bot de
  reunião. Modelo baixa 1x (~75–150MB, cache); depende de `jsdelivr`/HuggingFace acessíveis na rede do SDR.
- **Diarização heurística (fallback sem captura).** Sem ligar "🎧 Áudio da call", segue a separação por
  **pausa** (gap 1,6s) no `Web Speech API` — não distingue vozes de verdade (usar "↔️ trocar voz").
- **STT pago (Deepgram) não usado** — caminho FREE (navegador) foi o escolhido pelo Rudá. Fica como opção
  futura se a precisão do Whisper-tiny em máquina fraca não bastar.
- **KB de produto/battle cards vazia.** `kb-produtos-sap.json` + `kb-battle-cards.json` estão
  `⏳ aguarda ingestão` — o Rudá entrega o material (xlsx/pdf/pptx) e o `jarvis-sdr` estrutura (Regra 7).
- **Memória sem RAG semântico.** Recall por LOB/keyword (sem embeddings). RAG vetorial na nuvem = fase futura.
- **Sem log no CRM.** A call fica no SQLite do Office; integração Zoho/CRM segue backlog.

## 🟡 NotebookLM — enriquecimento de corpus (build, não runtime)
- O `notebooklm-skill` roda só no Claude **local** do Rudá (browser-automation + login Google). **Não é
  API de servidor** — o JARVIS-cloud não chama NotebookLM em runtime. Caminho: Rudá roda o skill local pra
  extrair conhecimento EPI-USE/SAP e **commita** o resultado como corpus (ex: `kb-produtos.json`) que o
  JARVIS lê. Enquanto isso, conhecimento de produto vem da estratégia FY27 (`playbook.json`) + pesquisa web.

## 🟢 Backlog (não-bloqueado)
- **Pré-call enrich automático** via Apollo/Zoho: puxar cargo, empresa, setor e deals abertos do prospect
  pra pré-preencher o contexto. (MCPs `Apollo_io` / `Zoho_CRM` já disponíveis no Office.)
- **"Deep mode" (Sonnet)** sob demanda: análise pós-call mais rica (resumo, MEDDIC scorecard, e-mail de follow-up).
- **Pós-call:** gerar resumo + próximos passos + draft de e-mail e (opcional) registrar atividade no CRM.
- **Detecção de objeção em tempo real** com match direto no `playbook.json` (resposta instantânea sem round-trip).
- **Histórico de calls** + métricas do SDR (talk-ratio médio, taxa de perguntas, temperatura final).
- **Modo treino:** rodar contra cenários simulados pra onboarding de SDR novo.

## ⚙️ Operacional
- **Backend de IA (coach/brief):** Groq hospedado via `JARVIS_LLM_FORMAT=openai` + `JARVIS_LLM_BASE_URL`
  + `JARVIS_LLM_MODEL` + `JARVIS_LLM_API_KEY` (ou Anthropic/`ANTHROPIC_API_KEY` no modo padrão). Sem backend,
  `/api/jarvis/coach` e `/brief` retornam 503 claro. Diagnóstico: `GET /api/jarvis/ping`.
- **Pesquisa web (`/api/jarvis/pesquisar`):** requer `OPENROUTER_API_KEY` (já existe no Office); modelo
  override por `JARVIS_WEB_MODEL` (default `perplexity/sonar`). Sem a key → 503 claro.
- Funciona melhor no **Chrome** (Web Speech API). Firefox/Safari → usar fallback manual.
- **Deploy Railway:** só sob ordem explícita do Rudá (Regra 3).
