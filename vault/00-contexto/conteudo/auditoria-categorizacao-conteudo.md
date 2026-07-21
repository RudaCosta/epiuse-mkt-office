# 🔍 Auditoria — Categorização de Conteúdo (LOB · Funil · Ofertas)

> **Data:** 07/jul/2026 · **Autor:** Claude (sessão de revisão total de conteúdo)
> **Fontes analisadas (dados REAIS, computados dos arquivos):**
> 1. `public/api/artigos.json` — 707 artigos do blog (import Manus)
> 2. `EPIUSE_Analise_LinkedIn_May_2025__May_2026.xlsx` — 214 posts LinkedIn (BASE + GUIA_LOB + MODELO_CLASSIFICACAO)
> 3. `Estratégia_Marketing_EPIUSE_Brasil_FY27.xlsx` — LOBs Overview, Jornadas, Matriz Personas×Conteúdos
> 4. Calendário editorial (SQLite `editorial_calendar` — Duda 18 + Redatoria 80) via `scripts/sync/sync_redatoria_to_calendar.js`
> 5. Slides oficiais: "Ofertas" (mapa hexágonos) + "Nossos pilares"
>
> Proposta de correção: ver `taxonomia-conteudo.md` (mesmo diretório).

---

## TL;DR

**Hoje existem pelo menos 6 taxonomias de LOB diferentes e 3 critérios de funil incompatíveis rodando ao mesmo tempo.** Nenhum número de "conteúdo por LOB" ou "conteúdo por etapa de funil" é comparável entre blog, LinkedIn e calendário editorial. Além disso, a classificação dos 707 artigos do blog está dominada por valores default do Manus (85% oferta "Outros", 95% régua "CIO Cerrado") — ou seja, **a base que alimenta `/jornadas`, `/artigos` e as pautas dos Voices está estruturalmente suja**.

---

## P1 — Seis taxonomias de LOB coexistindo

| # | Onde vive | Valores |
|---|---|---|
| 1 | **Slide oficial "Ofertas"** (9 blocos) | Ecossistema SAP ERP · Excelência de Processos · Qualtrics · Cloud Intelligence · Tecnologia · Ecossistema SAP HCM · ServiceNow · iLab · AMS/Evolução |
| 2 | **Slide "Nossos pilares"** (4) | Infraestrutura (Valcann) · Excelência em Processos · Serviços (EPI-USE) · Observabilidade & Automação de Testes (iLab) |
| 3 | **FY27 — LOBs Overview** (12 linhas) | HCM (aparece 3× — SFSF, WFS, Qualtrics) · ERP · Tech · BTM · ServiceNow · Valcann · iLAB · AMS (ALL LOBs) · PRISM/EPI-USE Labs |
| 4 | **LinkedIn — GUIA_LOB** (9 siglas) | AMS · BTM · ERP · HCM · iLab · SN · Tech · Cloud · EPI-USE |
| 5 | **LinkedIn — MODELO_CLASSIFICACAO, campo PILAR** (12) | SF HCM · S4HANA · BTP · Process Excellence · WFS · Qualtrics · ServiceNow · Valcann · iLab · AMS · Institucional · Employer Branding |
| 6 | **Blog — artigos.json, campo `linha_de_negocio`** (7) | Estratégia & ESG (ERP.ngo) · Serviços HCM & RH · Serviços SAP ERP (S/4HANA) · BTM (Signavio & Processos) · Infraestrutura & Cloud (Valcann) · ServiceNow · Observabilidade & Testes (iLab) |
| 7 | **Calendário editorial, campo `pilar`** (4) | rh · servicenow · institucional · produto *("produto" é balde de tudo)* |

Agravantes:
- As taxonomias **4 e 5 vivem no MESMO arquivo xlsx** e não batem entre si.
- O blog tem **dois campos de LOB com nomes diferentes no mesmo JSON**: `linha_de_negocio` ("Serviços HCM & RH") vs `linhas_de_negocio_multi` ("HCM (SuccessFactors)", e 60% = "EPI-USE Brasil (Geral)").
- **A sigla "ERP" significa 3 coisas diferentes** dependendo da fonte: SAP ERP (LOB), ERP.ngo (ESG), e Projeto Elephants Rhinos & People (também abreviado "ERP" na análise LinkedIn). Colisão real de nomenclatura.
- GUIA_LOB **não cobre** Qualtrics (só como "Employee Experience" dentro de HCM), WFS como oferta nomeada, nem PRISM/EPI-USE Labs.
- O kanban `/content-pipeline` tem o campo LOB como **input de texto livre** (sem validação) — garante divergência futura.

## P2 — Blog: classificação Manus é default em massa (707 artigos)

Distribuições reais computadas do `artigos.json`:

| Campo | Problema | Números |
|---|---|---|
| `etapa_funil` | Hiperconcentração em Topo | **597 Topo (84%)** · 66 Meio · 44 Fundo |
| `linha_de_negocio` | Linha não-comercial engolindo tudo | **370 (52%) em "Estratégia & ESG (ERP.ngo)"** |
| `oferta_especifica` | Campo praticamente inútil | **602 (85%) = "Outros"** |
| `regua_eventos` | Valor default óbvio | **674 (95%) = "CIO Cerrado / Executivo"** |
| `ativos_nutricao` | Idem | **547 (77%) = "Institucional"** |
| `agregados` (header do JSON) | Desatualizado vs registros | agregados dizem 693 artigos; array tem 707; contagens por LOB não batem |

O diagnóstico "91% TOFU" exibido em `/jornadas` mistura **gap editorial real** com **viés do classificador** — não dá pra separar os dois sem re-classificar.

## P3 — Funil: 3 critérios incompatíveis

| Fonte | Escala | Distribuição real |
|---|---|---|
| Blog (Manus) | Topo (Aprendizado) / Meio (Consideração) / Fundo (Decisão) | **84% / 9% / 6%** |
| LinkedIn BASE | Topo / Meio / Fundo | **36% / 60% / 4%** (129 de 214 = "Meio") |
| LinkedIn MODELO_CLASSIFICACAO (em ajuste) | 7 estágios (Awareness · Engagement · Consideration · Intent · Conversion · Retention · Advocacy) | modelo novo; exemplos já usam valor fora da lista ("Authority") |
| FY27 Jornadas | Aprendizagem e Descoberta / Consideração e Avaliação / Decisão e Compra (+ siglas C/R/D) | — |

O contraste 84% Topo (blog) vs 60% Meio (LinkedIn) **não é diferença de estratégia — é diferença de critério**. No LinkedIn, posts de cobertura de eventos foram marcados como "Meio" (63 posts de Eventos, o maior tema da base); na régua do blog o mesmo conteúdo seria Topo/Awareness. Comparação entre canais hoje é impossível.

## P4 — Matriz Personas × Conteúdos da FY27 está VAZIA

A aba existe, tem os cargos nas linhas e os tipos de projeto nas colunas (com legenda C/R/D = topo/meio/fundo), mas **nenhuma célula preenchida**. É exatamente a peça que ligaria persona × oferta × tipo de conteúdo.

## P5 — Jornadas de compra só existem para 2 de 9 LOBs

FY27 documenta S/4HANA e ServiceNow (bem-feitas, 3 estágios completos com gatilhos, objeções, conteúdos, CTAs e prova social). **Faltam 7+:** HCM/SFSF, WFS, Qualtrics, BTM/Signavio, Tech/BTP, Cloud/Valcann, iLab, AMS.

## P6 — Nenhuma chave de junção entre sistemas

Post LinkedIn ↔ artigo blog ↔ item de calendário ↔ oferta ↔ jornada: cada fonte tem IDs e vocabulários próprios. Sem slug canônico de LOB/oferta, não existe visão única "o que temos de conteúdo sobre X" — que é também o metadado necessário pro RAG (NotebookLM) filtrar por linha de negócio.

## P7 — Performance LinkedIn confirma o custo da bagunça

Da própria análise (RESUMO EXECUTIVO + ANALISE_LOB, dados reais):
- EPI-USE institucional = **35,5% dos posts** (76/214) — maior fatia editorial.
- ServiceNow: **4 posts, melhor média de impressões (1.370) e engajamento da base** — LOB sub-publicado.
- Cloud + SN + iLab somados = **5% das publicações**.
- Employee Central: 6 posts, 1.553 impressões médias — alta eficiência, baixo volume.
- Sem taxonomia estável, essas conclusões não conseguem virar meta editorial rastreável mês a mês.

---

## Recomendações (resumo — detalhes na taxonomia)

1. **Adotar taxonomia mestra única** com slugs estáveis (9 LOBs alinhados ao slide oficial de Ofertas) + tabela de ofertas nível 2 + funil 3 estágios com critério por intenção. → `taxonomia-conteudo.md`
2. **Re-classificar os 707 artigos do blog** em lote (heurística por keywords + batch IA, saída etiquetada `🤖 Gerado por IA — revisar`), preservando os campos originais do Manus.
3. **Re-taggear os 214 posts LinkedIn** com o critério unificado de funil (evento-cobertura = topo) — alinhar com a Bruna antes.
4. **Travar os inputs**: dropdown com slugs canônicos no `/content-pipeline` e no calendário (migrar `pilar` do SQLite via de-para).
5. **Preencher a Matriz Personas × Conteúdos** e gerar as 7 jornadas faltantes via pipeline (`pipe-briefing`).
6. **Resolver a colisão "ERP"**: reservar `erp` pro SAP ERP; ESG/ERP.ngo e Elephants Rhinos & People ficam em `institucional` (tags próprias).

---

*Todos os números deste documento são REAIS, computados diretamente dos arquivos-fonte em 07/jul/2026. As recomendações são proposta 🤖 pendente de validação (Rudá + Bruna + Duda + Lisiane).*
