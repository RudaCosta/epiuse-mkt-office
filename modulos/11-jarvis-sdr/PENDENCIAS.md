# PENDÊNCIAS — Módulo 11 (JARVIS)

## ✅ Resolvido na v0.8 (24/jun)
- **Atribuição de quem fala.** ~~Manual "Prospect/SDR" a cada turno.~~ Agora **diarização heurística**
  (Voz 1/Voz 2 por pausa) + mapeamento de papel 1× + override "↔️ trocar voz". Ver limitação abaixo.
- **Sem persistência.** ~~A call não era salva.~~ Agora `jarvis_calls` + `jarvis_aprendizados` (SQLite,
  volume `/data`). Pós-call extrai dores reais; "Dores de campo" agrega por LOB pra pautar conteúdo.

## 🟡 Limitações conhecidas (v0.8)
- **Diarização é heurística, não acústica.** Separa por **pausa** (gap 1,6s) no `Web Speech API` — não
  distingue vozes de verdade. Voz 1/Voz 2 podem sair trocadas (corrigir com "↔️ trocar voz"). Etiqueta
  honesta na UI. → Evolução: **STT pago com diarização real** (Deepgram/AssemblyAI) — decisão/custo do Rudá.
- **Captura de áudio do prospect em call remota.** O `Web Speech API` capta só o microfone local. Em
  reunião remota (Teams/Meet/Zoom), as falas do prospect entram por viva-voz ou digitando. → Evolução:
  captura de áudio da aba (`getDisplayMedia` com áudio) ou bot de reunião — anda junto com o STT pago.
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
