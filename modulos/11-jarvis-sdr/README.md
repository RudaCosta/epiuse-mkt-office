# Módulo 11 — JARVIS (Copiloto SDR/BDR/LDR) 🤖

> **Propósito:** assistente tipo JARVIS dentro de **biz dev** (Development Sales / Pipeline). Um
> **SDR/BDR/LDR sênior virtual com 20 anos de prospecção B2B** no universo de consultorias **SAP e
> ServiceNow**. Guia o vendedor em **reuniões e ligações em tempo real**: escuta a conversa e
> **recomenda falas** (próxima pergunta, talk track, contorno de objeção, próximo passo).

## Status
🟢 **v0.1 — fundação (GUI + voz + IA)** · Sessão 5 (23/jun/2026). Fatia vertical funcional.

## Como funciona
1. **Escuta** — `Web Speech API` (pt-BR, Chrome) capta o microfone local + **fallback manual** (digitar/colar
   a fala do prospect). A transcrição alimenta o coach.
2. **Pensa** — `POST /api/jarvis/coach` envia contexto da call + transcrição recente ao **Claude (Haiku 4.5,
   baixa latência)** com a persona sênior + a base de conhecimento real injetada no system prompt.
3. **Recomenda** — cards de sugestão (próxima pergunta, fala, objeção, próximo passo, sinais, LOB) +
   gauges HUD (temperatura 🤖, % de fala do SDR, nº de perguntas) calculados **da própria sessão**.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/jarvis.html` | GUI HUD single-file (vanilla, design-tokens EPI-USE). Rota `/jarvis`. |
| `routes/jarvis.js` | Router modular: página + `POST /api/jarvis/coach` + `POST /api/jarvis/brief` + `GET /api/jarvis/playbook`. |
| `modulos/11-jarvis-sdr/playbook.json` | **Base de conhecimento REAL** (LOBs, personas, pitches, gatilhos 2026, matriz indústria×dor, BANT/MEDDIC/SPIN, objeções). Injetada no system prompt. |

## Edições aditivas no app (regra de ouro da sessão: SÓ ADICIONAR)
- `server.js` (bloco de routers ~4622): `require('./routes/jarvis')` + `app.use('/', jarvisRouter)`.
- `public/office-nav.js`: link `🤖 JARVIS — Copiloto SDR` no overflow.
- `modulos/README.md`: linha do módulo 11.

## Integridade de dados (Regras 6 e 7)
- Sugestões da IA → etiqueta fixa `🤖 Gerado por IA — use seu julgamento`.
- Gauges/KPIs → **derivados da sessão ao vivo** (nunca inventados).
- KB → **dado real** EPI-USE (fonte: `vault/00-contexto/empresa.md` + `modulos/08-inbound-offline/lob-positioning.md`).

## Como rodar / verificar
Office no ar (`http://localhost:3000`) → abrir **`/jarvis` no Chrome** → permitir microfone → falar pt-BR
ou digitar a fala do prospect → ver transcrição e recomendações. Precisa de `ANTHROPIC_API_KEY` no `.env`
off-repo (a IA retorna 503 claro se faltar).

## Não-objetivos (v0.1)
Sem enrich Apollo/Zoho do prospect, sem gravação de áudio, sem "deep mode" Sonnet, sem log no CRM — ver `PENDENCIAS.md`.
