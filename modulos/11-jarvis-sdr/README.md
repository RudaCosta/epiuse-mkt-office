# Módulo 11 — JARVIS (Copiloto SDR/BDR/LDR) 🤖

> **Propósito:** assistente tipo JARVIS dentro de **biz dev** (Development Sales / Pipeline). Um
> **SDR/BDR/LDR sênior virtual com 20 anos de prospecção B2B** no universo de consultorias **SAP e
> ServiceNow**. Guia o vendedor em **reuniões e ligações em tempo real**: escuta a conversa e
> **recomenda falas** (próxima pergunta, talk track, contorno de objeção, próximo passo).

## Status
🟢 **v0.9 — UI clean (auto-detect de contexto + auto-save)** sobre o cérebro vivo da v0.8 (25/jun/2026).

## Como funciona
1. **Escuta** — `Web Speech API` (pt-BR, Chrome) capta o microfone local. **Diarização heurística** separa as
   falas em **Voz 1 / Voz 2** por pausa (sem clicar a cada turno); o SDR marca **1×** quem é SDR/Cliente.
2. **Pensa** — `POST /api/jarvis/coach` envia contexto + transcrição ao **Claude (Haiku 4.5)** com persona
   sênior + base real + **memória viva** (dores já ouvidas em campo) injetadas no system prompt.
3. **Detecta o contexto** — em vez de dropdown manual, o coach **infere LOB/persona/indústria/estágio da
   conversa** e mostra como chips. Só Prospect/Empresa ficam como input. O detectado realimenta as próximas
   chamadas (FY27/KB/memória fatiados pelo que foi detectado).
4. **Recomenda** — cards (próxima pergunta, fala humanizada, objeção, próximo passo, sinais, conteúdos reais)
   + gauges (temperatura 🤖, % de fala, perguntas) derivados da sessão.
5. **Aprende (auto-save, sem botão)** — ao **pausar o mic** (e no `pagehide`), a call salva sozinha e a IA
   **extrai dores/objeções/gatilhos reais** (`POST /api/jarvis/encerrar`, upsert por `call_id` →
   `jarvis_aprendizados`). A memória cresce e volta pro coach.
6. **Guia conteúdo** — "📊 Dores de campo" (`GET /api/jarvis/dores-de-campo`) agrega por LOB → pauta os
   próximos conteúdos (loop campo→conteúdo). O sub-agente `jarvis-sdr` destila isso offline.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/jarvis.html` | GUI HUD single-file (vanilla, design-tokens EPI-USE). Rota `/jarvis`. |
| `routes/jarvis.js` | Router modular: página + `coach` + `brief` + `pesquisar` + **`encerrar`** + **`dores-de-campo`** + `playbook` + `ping`. Cria as tabelas de memória no boot. |
| `playbook.json` | **Base de conhecimento REAL** (LOBs, personas, pitches, gatilhos 2026, matriz, FY27, BANT/MEDDIC/SPIN, objeções). Injetada no system prompt. |
| `kb-produtos-sap.json` · `kb-battle-cards.json` | KB curada (produtos SAP + battle cards). **`⏳ aguarda ingestão`** — Regra 7. Injetada fatiada por LOB. |
| SQLite `jarvis_calls` + `jarvis_aprendizados` | **Memória viva** (volume `/data` no Railway). Calls salvas + dores aprendidas. |
| `.claude/agents/jarvis-sdr.md` · `vault/agentes/jarvis.md` | Sub-agente destilador (offline) + perfil Obsidian. |

## Edições aditivas no app (regra de ouro da sessão: SÓ ADICIONAR)
- `server.js` (bloco de routers ~4622): `require('./routes/jarvis')` + `app.use('/', jarvisRouter)`.
- `public/office-nav.js`: link `🤖 JARVIS — Copiloto SDR` no overflow.
- `modulos/README.md`: linha do módulo 11.

## Integridade de dados (Regras 6 e 7)
- Sugestões da IA → etiqueta fixa `🤖 Gerado por IA — use seu julgamento`.
- Gauges/KPIs → **derivados da sessão ao vivo** (nunca inventados).
- KB → **dado real** EPI-USE (fonte: `vault/00-contexto/empresa.md` + `modulos/08-inbound-offline/lob-positioning.md`).

## Como alimentar a KB (produtos SAP / battle cards)
Fluxo (Regra 5 + Regra 7): o Rudá entrega o arquivo (xlsx/pdf/pptx/docx) → o Claude **lê e normaliza** num
JSON no schema da KB → o script valida, mescla por `id` e grava:

```bash
# 1) Claude gera kb_input.json a partir do material real
# 2) valida sem gravar:
node scripts/sync/jarvis_kb_ingest.js produtos     kb_input.json --dry-run
node scripts/sync/jarvis_kb_ingest.js battle-cards kb_input.json --dry-run
# 3) grava (merge por id; --replace troca a lista inteira):
node scripts/sync/jarvis_kb_ingest.js produtos     kb_input.json
```
Itens sem campos obrigatórios (`produtos`: id·nome·lob·o_que_e · `battle-cards`: id·tema·nossa_vantagem) são
**rejeitados** (nada de placeholder vazio). `fonte` é auto-preenchida com o nome do arquivo. O JARVIS pega no
próximo boot. Deploy só sob `"sobe"` (Regra 3).

## Como rodar / verificar
Office no ar (`http://localhost:3000`) → abrir **`/jarvis` no Chrome** → permitir microfone → falar pt-BR
ou digitar a fala do prospect → ver transcrição e recomendações. Precisa de `ANTHROPIC_API_KEY` no `.env`
off-repo (a IA retorna 503 claro se faltar).

## Não-objetivos (v0.8)
STT pago com diarização acústica real + captura de áudio da aba (fase futura), RAG semântico (embeddings) na
nuvem, enrich Apollo/Zoho do prospect, "deep mode" Sonnet, log no CRM — ver `PENDENCIAS.md`.
