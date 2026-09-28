# DECISIONS — Módulo 20 (AEO/SEO/GEO)

Decisões arquiteturais e estratégicas + rationale. Ordem cronológica.

---

## D0 · Diagnóstico do AEO Grader (20/jul/2026)

📄 Fonte: `AEOGraderRelatorio20260720.pdf`. Query auditada pelo Grader:
**"provedores de LLM no Brasil para serviços de HubSpot no setor de Consultoria"**.

### Notas gerais (Pontuação de pesquisa de IA · /100)

| Motor de IA | Nota | Leitura do Grader |
|---|---|---|
| **Google / Gemini** ("Suporta resultados do Google") | **60** | No caminho certo |
| **ChatGPT** (GPT-5.4 mini) | **48** | No caminho certo |
| **Perplexity** (tempo real) | **17** | Margem para crescimento |

### Sub-scores (por motor: ChatGPT · Perplexity · Google)

| Dimensão | ChatGPT | Perplexity | Google |
|---|---|---|---|
| Reconhecimento da marca (/20) | 8 | 5 | 11 |
| Posição de mercado (/10) | 3 | 3 | 3 |
| Qualidade da presença (/20) | 9 | 9 | 12 |
| Sentimento de marca (/40) | 27 | 0 | 33 |
| Participação de voz (/10) | 1 | 0 | 1 |

### Reconhecimento de marca (/100) → **38 · 25 · 55**
- Arquétipo detectado nos 3 motores: **"Tradicionalista"**.
- Nível de confiança: 84% · 75% · 80% (o modelo tem convicção do que afirma).
- Profundidade de menção: 4 · 3 · 5 /10 → **menções rasas** (citam, mas sem detalhe).

### Participação de voz (Share of Voice) — 3 conjuntos competitivos

**Conjunto A — Consultoria SAP/TI enterprise** (120 menções):
`EPI-USE 8%` · Accenture 18% · Deloitte 14% · NTT DATA 10% · Capgemini 9% · PwC 8% · Stefanini 7%.

**Conjunto B — Consultoria HubSpot pura** (baixo volume):
`EPI-USE 2,5%` · Tropical Hub 18% · Kommble 15,5% · Rodrigo Bo… 12% · Conecta Hub 10,5% · Smartnoloji 9% · Hubfy 8,5%.

**Conjunto C — Agências de marketing/HubSpot** (840–1250 menções):
`EPI-USE 12,5%` · Surfe Digital 18,2% · Hook Digital 15,4% · 8D Hubify 14,8% · Tropical Hub 11,3% · Mkt4Sales 10,7%.

### Sentimento (/100)
- **Geral: 68** (Geral 70 · Contextual 66) — quando lido como **consultoria de transformação digital**, o sentimento é **82** (positivo, sólido).
- **HubSpot-específico: 0** — "EPI-USE Brasil é especialista em SAP, **não** em HubSpot"; "Ausência de listagem como agência parceira HubSpot verificada".
- Polarização baixa (24 / 0 / 15) → percepção estável, **sem controvérsia** (bom), mas também **pouco volume** (ruim).

### Análise de fontes (o que a IA "leu" pra formar opinião)
| Fonte | Nota | Confiável? |
|---|---|---|
| HubSpot Partner Directory | 88 | — não lista a EPI-USE |
| LinkedIn | 82 | ✅ sinal forte e ativo |
| Glassdoor | 75 | ✅ |
| Site institucional EPI-USE | 72 | ⚠️ foca 100% em SAP, **não menciona HubSpot** |
| Ecossistema parceiros HubSpot | 69 | ⚠️ |
| Avaliações públicas (G2/Clutch/etc) | 58 | ❌ volume insuficiente |

---

## D1 · A leitura crítica: o Grader mediu um posicionamento que ainda não existe

> **O achado mais importante não é a nota — é a premissa.**

O AEO Grader avaliou a EPI-USE **como se ela fosse uma consultoria HubSpot**. Ela
não é (ainda). É especialista **SAP** (S/4HANA, SuccessFactors HR/Payroll, ~16
anos, 200–500 pessoas, sede SP). Por isso o padrão de notas é coerente e previsível:

- **Onde a IA nos vê como somos** (transformação digital / SAP), o sentimento é **82** e a marca aparece.
- **Onde o Grader forçou o rótulo "HubSpot"**, a nota desaba a **0** — porque **não há prova** (sem Partner Directory, sem reviews, sem conteúdo no site).
- **Perplexity dá 17** porque lê a web **em tempo real** — e a web atual (site WorkControl) **não tem lastro de HubSpot**. Os outros motores (com cutoff em 2025) "chutam" a partir do institucional; a Perplexity não perdoa.

**Consequência prática:** dá pra subir essas notas **rápido**, porque o gap não é
de reputação (temos 82 de sentimento) — é de **prova estruturada + presença
técnica**. É exatamente o tipo de gap que a migração pra HubSpot + conteúdo
answer-first fecham.

---

## D2 · Decisão de posicionamento — o "garfo" (DEPENDE DO RUDÁ)

O relatório abre 3 caminhos. **Recomendação forte: caminho 3.**

**Caminho 1 — Ignorar HubSpot, otimizar como "consultoria SAP".**
Rerodar o Grader na categoria certa (SAP/TI). Sobe a nota no papel, mas **desperdiça**
o movimento estratégico que já está em curso (migração pra HubSpot, RevOps do Rudá).

**Caminho 2 — Virar "agência HubSpot".**
Competir com Tropical Hub, Surfe, Hook. **Não recomendado:** mercado lotado, a
EPI-USE entraria como challenger sem diferencial e jogaria fora o ativo SAP.

**Caminho 3 — ✅ Posicionar na INTERSECÇÃO: "SAP × HubSpot × RevOps".** _(recomendado)_
Ninguém no relatório ocupa essa ponte. Os gigantes (Accenture, Deloitte) são
puro-SAP enterprise; as agências (Surfe, Hook, Tropical) são puro-HubSpot marketing.
**A EPI-USE é a única que pode dizer com verdade:** _"conectamos o dado do SAP
(S/4HANA, SuccessFactors) ao HubSpot pra fazer RevOps de verdade — marketing,
vendas e CS rodando sobre o ERP."_ O próprio Grader sugere isso ("Integração SAP
com plataformas de marketing", "Expansão para RevOps", "camada de IA preditiva
sobre dados HubSpot").

> **Por que isso vence em AEO:** LLM adora **nicho bem definido com entidade
> clara**. "Consultoria HubSpot no Brasil" tem 50 players; "integração SAP +
> HubSpot + RevOps no Brasil" tem ~0. Dá pra ser **a** resposta, não a 12ª.

⏳ **Bloqueio:** essa decisão é do Rudá/Roberto. O plano de ação assume o Caminho 3
como default, mas os itens de conteúdo/diretório se ajustam conforme a escolha.
Ver `PENDENCIAS.md`.

---

## D3 · Entregável = Diagnóstico + Plano, não "hack de nota"

Decidido **não** prometer "subir de 48 pra 90". AEO é acúmulo (fundação técnica +
autoridade + conteúdo, ao longo de meses). O módulo entrega:
1. Dashboard `/aeo-geo` que **mostra o baseline real** (pra medir progresso depois).
2. Plano de ação priorizado por **esforço × impacto**, casado com a migração HubSpot.
3. Reuso do `seo_checker.js` já existente pra garantir que **todo conteúdo novo**
   nasça otimizado (gate no `/content-pipeline`).

## D4 · A migração WorkControl → HubSpot é a maior alavanca — e é one-time

O site atual (WorkControl) é o que trava a Perplexity (17). A migração é a janela
pra acertar a fundação técnica **de uma vez** (schema.org, llms.txt, robots pra
crawlers de IA, conteúdo server-side, Core Web Vitals). Por isso o `PLANO-ACAO.md`
trata o bloco técnico como **"fazer JUNTO com a migração"** — refazer depois custa 5×.
