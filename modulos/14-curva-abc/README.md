# Módulo 14 — Curva ABC (classificação de contas)

**Status:** 🚧 MVP em construção · **Dona da área:** Marlison Estrela (Pipeline) · **Uso conjunto:** AE EPI-USE

## Propósito

Classificar contas (clientes/prospects) em **A/B/C** cruzando duas dimensões calculadas a partir de dado real:

- **Fit** — aderência ao ICP EPI-USE (vertical/LOB, porte, case de sucesso parecido, conta-irmã já usuária SAP)
- **Propensão** — sinais reais de intenção de compra (engajamento Apollo, deal avançando no Zoho, gatilho de urgência 2026, dor de campo ouvida em call)

Modelo de matriz 2D (Fit × Propensão, cada eixo Alto/Médio/Baixo) → cruza pra tier final. Inspirado no modelo de conta ABM da Cortex Intelligence, adaptado ao contexto EPI-USE (SAP/HCM/ERP/BTP/ServiceNow).

O tier define o **modelo de cobertura** (decisão de negócio do Rudá, não deste módulo):
- **A** = snipe 1:1 (dedicação individual do AE)
- **B** = rally 1:few (abordagem em grupo/vertical)
- **C** = volume (outbound em escala via Apollo)

## Fontes de dado (Regra 7 — real data only)

| Fonte | Uso | Tabela/arquivo |
|---|---|---|
| Zoho CRM (MCP `mcp__Zoho_CRM__*` + tabela `zoho_deals`) | Deals abertos, estágio, tempo em pipeline (Propensão) | `scripts/sync/sync_zoho_deals.js` |
| Apollo.io (MCP `mcp__Apollo_io__*` + `pipeline-snapshot.json`) | Empresas, porte/indústria (Fit), engajamento de sequência (Propensão) | `scripts/integrations/apollo_pipeline_sync.js` |
| Cases de sucesso (`cs_clientes`) | Case parecido na vertical → Fit alto | `routes/cases.js` |
| SAP 4ME (`clientes_sap_4me`) | Conta-irmã já usuária SAP em outro país → Fit alto | `routes/sap.js` |
| Playbook JARVIS (`modulos/11-jarvis-sdr/playbook.json` + `jarvis_aprendizados`) | Gatilhos de urgência 2026 + dores reais de campo → Propensão | `routes/jarvis.js` |

Onde o dado não existir (ex: faturamento não enriquecido pelo Apollo), o campo fica com etiqueta `⏳ aguarda enriquecimento` — não bloqueia o cálculo do resto do score.

## Arquitetura

- `routes/curva-abc.js` — router Express (mesmo padrão de `routes/cases.js`/`routes/jarvis.js`), tabelas SQLite criadas no boot
- `public/curva-abc.html` — single-file vanilla JS + `design-tokens.css`, matriz 2D + lista + painel de override
- `public/api/areas.json` (nó `pipeline.ferramentas`) — card de acesso na área Pipeline

Ver `DECISIONS.md` pros pesos/thresholds do score e `PENDENCIAS.md` pro que falta calibrar com o Marlison.
