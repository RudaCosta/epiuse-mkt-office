# 🤖 JARVIS — Copiloto SDR/BDR/LDR

> Perfil Obsidian. Explica **o que o JARVIS é**, **como ele se porta** e **como ele aprende**.
> Atualizado: 24/jun/2026 · v0.8 (memória viva + diarização heurística + loop de conteúdo).

---

## ⚠️ JARVIS é um AGENTE? (resposta direta)

**Não no sentido dos agentes de área.** O JARVIS tem **duas faces**:

1. **App em runtime** (o que o SDR usa ao vivo) — **NÃO é um sub-agente Claude Code**. É um **módulo do Office**: rota Express (`routes/jarvis.js`) + tela (`public/jarvis.html`) + base de conhecimento (`playbook.json` + KB). Roda 24/7 na nuvem (Railway), chamando Claude Haiku / Groq. Não participa da orquestração CEO→áreas.
2. **Destilador offline** (o que aprende com as calls) — **agora SIM é um sub-agente** Claude Code: [[jarvis-sdr]] (`.claude/agents/jarvis-sdr.md`), ligado à área **Pipeline** (Marlison). Ele processa as calls salvas → vira aprendizado curado. Não roda em runtime; é acionado sob demanda/lote.

> Resumo: **a ferramenta ao vivo é um módulo do app; a inteligência que destila as calls é um sub-agente.** As duas se conectam pela **memória viva** (SQLite).

---

## 🧠 Como ele se porta (comportamento)

| Momento | O que faz | Fonte |
|---|---|---|
| **Pré-call** | Brief de abertura por persona/LOB/indústria + pesquisa web de produto (sap.com) | `playbook.json` + `artigos.json` + OpenRouter |
| **Ao vivo** | Escuta (Web Speech), separa as vozes (Voz 1/Voz 2 heurística), recomenda próxima pergunta, fala humanizada, contorno de objeção, próximo passo, conteúdos reais; gauges (temperatura, % fala, perguntas) | sessão + `playbook.json` + **memória viva** |
| **Pós-call** | "🏁 Encerrar & salvar" → grava a call + **extrai dores/objeções/gatilhos reais** | IA extrai → `jarvis_aprendizados` |
| **Estratégia** | "📊 Dores de campo" → agrega o que os SDRs ouviram, por LOB → **insumo pra pautar conteúdo** | `jarvis_aprendizados` |

### Filosofia injetada no system prompt
- Persona: **SDR/BDR sênior, 20 anos** de B2B SAP/ServiceNow.
- **Vender a dor e o resultado**, nunca a tecnologia. **Ouvir mais do que falar.**
- Fala **humanizada** (contrações, frases curtas; sem travessão, sem vocabulário-robô, sem clichê).
- **Nunca** nomeia concorrente na fala · **nunca** cita cliente sem aprovação · sem promessa absurda.

---

## 📚 De onde vem o conhecimento (camadas)

1. **`playbook.json`** (curado, v0.3.0) — empresa, 11 LOBs, personas, gatilhos 2026, matriz indústria×dor, estratégia FY27 (ICP, jornadas, diferenciação competitiva, cases reais), frameworks BANT/MEDDIC/SPIN, objeções.
2. **KB curada** (alimentada por arquivo, Regra 7) — `kb-produtos-sap.json` (produtos SAP/ServiceNow) + `kb-battle-cards.json` (battle cards, uso interno). **Hoje `⏳ aguarda ingestão`** — Rudá entrega material → Claude estrutura → commit.
3. **`artigos.json`** (RAG-lite) — 693 conteúdos reais, retrieval por LOB+keyword (anti-alucinação de URL).
4. **Memória viva** (SQLite — cresce com o uso) — `jarvis_calls` + `jarvis_aprendizados`. As dores ouvidas em campo voltam pro system prompt ("=== MEMÓRIA VIVA — DORES JÁ OUVIDAS EM CAMPO ===").
5. **Web** (pré-call) — OpenRouter `:online` focando sap.com/servicenow.com.

> **O que ainda NÃO é:** RAG semântico (embeddings) na nuvem. O RAG semântico de verdade vive offline na GPU do Rudá (`modulos/08-inbound-offline/rag.py`, Ollama). Unificar isso na nuvem é fase futura.

---

## 🔁 O loop (campo → conteúdo)

```
SDR usa JARVIS na call  →  encerra & salva  →  IA extrai dores reais
        →  jarvis_aprendizados (por LOB/indústria/persona)
                ├─→ volta pro coach (memória viva — antecipa a dor na próxima call)
                └─→ "Dores de campo" → pauta os próximos conteúdos (jornadas/pautas/Redatoria)
```

A inteligência de campo (o que o cliente realmente diz) passa a **guiar a estratégia de conteúdo** — fechando o ciclo que o Rudá pediu.

---

## 🗂️ Arquivos
- `routes/jarvis.js` — rotas: `/jarvis`, `coach`, `brief`, `pesquisar`, **`encerrar`**, **`dores-de-campo`**, `playbook`, `ping`.
- `public/jarvis.html` — HUD (escuta, diarização heurística, role-map, coach, encerrar, dores).
- `modulos/11-jarvis-sdr/` — `playbook.json` · `kb-produtos-sap.json` · `kb-battle-cards.json` · docs.
- Memória: tabelas `jarvis_calls` + `jarvis_aprendizados` (SQLite, volume `/data` no Railway).
- Sub-agente: [[jarvis-sdr]] (`.claude/agents/jarvis-sdr.md`).

## ⚠️ Limitações honestas (v0.8)
- **Diarização é heurística** (separa por pausa) — **não** distingue vozes acusticamente. Em call remota só ouve o lado em viva-voz/local. Voz 1/Voz 2 podem sair trocadas → corrigir com "↔️ trocar voz" + marcar papéis 1×. STT pago com diarização real = decisão futura.
- **KB de produto/battle cards vazia** até o Rudá entregar o material.
- **Sem enrich Apollo/Zoho** do prospect ainda (backlog).
