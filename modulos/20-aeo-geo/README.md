# Módulo 20 — AEO / SEO / GEO (Visibilidade em IA)

> **Propósito:** melhorar como a EPI-USE Brasil aparece (e é citada) nas respostas
> dos motores de IA — ChatGPT, Perplexity, Google/Gemini — além do SEO clássico.
> Base do módulo: o **AEO Grader** rodado em 20/jul/2026.

---

## Status

🟢 **v0.1 — Diagnóstico + Plano de Ação entregues** (20/jul/2026)

- Dashboard: `/aeo-geo` (`public/aeo-geo.html`) — visualiza o AEO Grader + o plano.
- Estratégia: `DECISIONS.md` + `PLANO-ACAO.md` (este módulo).
- Motor de checagem por artigo: `scripts/integrations/seo_checker.js` (já existia — SEO clássico + GEO/AEO/LLMO determinístico, usado em `/content-pipeline`).

---

## O que é AEO / SEO / GEO / AIO / LLMO

| Sigla | Nome | O que otimiza |
|---|---|---|
| **SEO** | Search Engine Optimization | Ranking na busca clássica do Google (10 links azuis). |
| **AEO** | Answer Engine Optimization | Aparecer como **resposta** direta (featured snippet, AI Overviews, ChatGPT). |
| **GEO** | Generative Engine Optimization | Ser **citado/gerado** dentro da resposta de um LLM. |
| **AIO** | AI Optimization | Guarda-chuva de otimização para IA (usado como sinônimo de GEO/AEO). |
| **LLMO** | LLM Optimization | Otimização específica para grounding de modelos de linguagem. |

Na prática, para a EPI-USE, tudo isso converge em **3 alavancas**: (1) fundação
técnica do site, (2) autoridade/prova social fora do site, (3) conteúdo
answer-first. Ver `PLANO-ACAO.md`.

---

## Arquivos-chave

| Arquivo | O quê |
|---|---|
| `DECISIONS.md` | Diagnóstico do AEO Grader + a decisão de posicionamento (o "garfo" SAP × HubSpot × RevOps). |
| `PLANO-ACAO.md` | Roadmap completo, dividido em **com Office** × **fora do Office**, com quick-wins da migração HubSpot. |
| `PENDENCIAS.md` | Decisões humanas que dependem do Rudá/Duda/Roberto. |
| `CHANGELOG.md` | Histórico de versões do módulo. |
| `../../public/aeo-geo.html` | Dashboard `/aeo-geo` (dado real do Grader + plano visual). |
| `../../scripts/integrations/seo_checker.js` | Checagem determinística SEO+GEO por artigo (pré-publicação). |

---

## Dado-fonte (Regra 7 — dado real, fonte etiquetada)

📄 **Fonte única:** `AEOGraderRelatorio20260720.pdf` (AEO Grader · 20/jul/2026).
Motores usados pelo Grader: GPT-5.4 mini (OpenAI, cutoff 31/ago/2025) · Perplexity
(tempo real) · Gemini 3 Flash Preview (cutoff jan/2025). Query auditada:
_"3 provedores de LLM no Brasil para serviços de HubSpot no setor de Consultoria"_.

Qualquer número neste módulo que **não** venha desse PDF está etiquetado como
estimativa/projeção conforme Regras 6 e 7.
