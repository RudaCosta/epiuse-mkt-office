# 🏷️ Taxonomia Mestra de Conteúdo — v1 (DRAFT)

> **Status:** 🤖 Proposta gerada em 07/jul/2026 — **pendente de validação** (Rudá + Bruna + Duda + Lisiane).
> **Escopo:** blog · LinkedIn · calendário editorial · content-pipeline · jornadas · RAG (NotebookLM) · réguas RD.
> **Base:** slide oficial "Ofertas", planilha Estratégia FY27, GUIA_LOB LinkedIn, auditoria em `auditoria-categorizacao-conteudo.md`.
> **Princípio:** slug estável em inglês/minúsculo pra máquina, rótulo PT-BR pra humano. Todo sistema consome os MESMOS slugs.

---

## Dimensão 1 — LOB canônico (9)

Alinhado ao slide oficial de Ofertas (9 blocos). AMS é cross-LOB; institucional cobre marca/ESG.

| slug | Rótulo | Cobre | Personas núcleo |
|---|---|---|---|
| `erp` | Ecossistema SAP ERP | S/4HANA (Green/Brown/Bluefield), RISE, GROW, Conversão, Fábrica/Melhorias, Solução Fiscal, SAP DRC, Reforma Tributária | CEO, CFO, CIO, CTO, Dir. Operações |
| `hcm` | Ecossistema SAP HCM | SFSF (EC, ECP, Talent, WFA, Admissão digital), Talentools, **WFS**, **Qualtrics EX** ⚠️ ver questão Q1 | CHRO, Ger. RH/DP, CIO, Analista RH/TI |
| `tech` | Tecnologia (SAP BTP) | Integration Suite, SAP Build, SAC + Datasphere, AI Foundation/Joule, extensões, ABAP Cloud | CIO, CTO, Arquiteto SAP |
| `btm` | Excelência de Processos | Signavio, LeanIX, WalkMe, Process Mining, CoE Processos, Arquitetura Empresarial | COO, CTO, CIO, Ger. Processos |
| `servicenow` | ServiceNow | ITSM, ITOM, HRSD, SecOps, DevOps, CSM, IRM, Integração SAP↔SN | CIO, CISO, COO, CHRO, Ger. TI |
| `cloud` | Cloud Intelligence (Valcann) | AWS, CloudOps, DevOps & SRE, Data & Analytics, AI/ML, FinOps, Aplicações de Negócio | CIO, CTO, Ger. Infra/Cloud |
| `ilab` | iLab — Testes & Observabilidade | Automação de testes (Tricentis), QA, Grafana, Datadog | CIO, Ger. TI, PM SAP, QA Lead |
| `ams` | AMS / Evolução | Sustentação N1-N3, evolutivo, extensão de equipe — **cross-LOB**: usar `ams` + tag da tecnologia | Ger. TI, CIO, CHRO |
| `institucional` | Institucional & Marca | Brand, cultura, employer branding, prêmios, **ESG/ERP.ngo**, **Elephants Rhinos & People**, eventos institucionais | Mercado, talentos, clientes |

**Regra da sigla ERP (resolve colisão):** `erp` = SAP ERP, sempre. ERP.ngo e Elephants Rhinos & People → `institucional` com tags `erp-ngo` / `elephants-rhinos-people`. Nunca abreviar o projeto de conservação como "ERP" em classificação.

### Questões em aberto (decidir antes de congelar v1)

- **Q1 — Qualtrics e WFS:** oferta dentro de `hcm` (proposta atual, segue FY27 que lista os 3 como HCM) **ou** LOBs próprios (slide de Ofertas trata Qualtrics como bloco separado)? Impacto: metas editoriais e filtros.
- **Q2 — EPI-USE Labs / PRISM:** FY27 tem como LOB (DSM, Query Manager, carve-out); GUIA_LOB e blog ignoram. Criar slug `labs` ou tratar como oferta de `erp`?
- **Q3 — 4ª etapa de funil `pos`** (retenção/advocacy — cases de renovação AMS, comunidade): adotar ou manter 3?

---

## Dimensão 2 — Oferta (nível 2)

Cada conteúdo pode ter **1 LOB primário + 1 oferta** (e LOBs secundários opcionais). Lista = GUIA_LOB (28 soluções) + lacunas preenchidas. De-para completo:

| slug oferta | LOB pai | Nome (como no GUIA_LOB / slide) |
|---|---|---|
| `s4hana-migracao` | erp | Migração S/4HANA (Brown/Green/Bluefield) |
| `rise-with-sap` | erp | RISE with SAP |
| `grow-with-sap` | erp | GROW with SAP |
| `fabrica-melhorias` | erp | Fábrica/Melhorias F&P |
| `solucao-fiscal` | erp | Solução Fiscal (Synchro) |
| `sap-drc` | erp | SAP DRC |
| `reforma-tributaria` | erp | Reforma Tributária |
| `alocacao-estrategica` | erp/hcm/todos | Alocações estratégicas (tag transversal) |
| `employee-central` | hcm | Employee Central (Core HR) |
| `ecp` | hcm | Employee Central Payroll · eSocial · PCC |
| `talent` | hcm | Talent (Recruiting, Onboarding, Learning, Performance, Succession) |
| `workforce-analytics` | hcm | Workforce Analytics / People Analytics |
| `talentools` | hcm | Talentools |
| `admissao-digital` | hcm | SFSF Admissão digital |
| `wfs` | hcm ⚠️Q1 | WorkForce Software (Time & Attendance, escalas) |
| `qualtrics-ex` | hcm ⚠️Q1 | Qualtrics EmployeeXM / iQ / XM Directory |
| `integration-suite` | tech | Integration Suite (SAP↔SAP, SAP↔terceiros) |
| `sap-build` | tech | SAP Build (low-code / automação) |
| `sac-datasphere` | tech | SAP Analytics Cloud + Datasphere |
| `ai-foundation` | tech | AI Foundation (Joule + GenAI) |
| `btp-extensoes` | tech | Extensões BTP p/ S/4HANA e ECC · ABAP Cloud |
| `signavio` | btm | SAP Signavio (process intelligence) |
| `leanix` | btm | SAP LeanIX (arquitetura empresarial) |
| `walkme` | btm | WalkMe (adoção digital) |
| `coe-processos` | btm | CoE / Governança de Processos |
| `itsm` | servicenow | ITSM |
| `hrsd` | servicenow | HRSD |
| `secops` | servicenow | SecOps |
| `sn-devops` | servicenow | DevOps / Observabilidade SN |
| `sap-servicenow` | servicenow | Integração SAP + ServiceNow |
| `aws` | cloud | AWS / SAP on AWS |
| `cloudops` | cloud | CloudOps · DevOps & SRE |
| `data-analytics` | cloud | Data & Analytics · AI/ML |
| `finops` | cloud | FinOps |
| `test-automation` | ilab | Automação de Testes (Tricentis) |
| `qa` | ilab | Quality Assurance |
| `observabilidade` | ilab | Grafana · Datadog |
| `ams-suporte` | ams | Sustentação / AMS multi-nível |
| `ams-evolutivo` | ams | Melhoria contínua / extensão de equipe |
| `prism-dsm` | ⚠️Q2 | PRISM / EPI-USE Labs (DSM, Query Manager, carve-out) |
| `brand` | institucional | Brand awareness, prêmios, cultura |
| `employer-branding` | institucional | Recrutamento, Life at EPI-USE |
| `erp-ngo` | institucional | ESG · ERP.ngo · Elephants Rhinos & People |

## Dimensão 3 — Funil (critério por INTENÇÃO, não formato)

| slug | Rótulo | Definição operacional | Exemplos |
|---|---|---|---|
| `topo` | Topo — Aprendizado e Descoberta | Leitor descobrindo o problema. Sem menção comparativa a solução. **Cobertura de evento = topo** | blog educacional, tendências, poll, cultura, prêmios, foto de evento |
| `meio` | Meio — Consideração e Avaliação | Leitor compara abordagens/parceiros | webinar, comparativo, metodologia, demo, case resumido, datasheet, **convite de evento com CTA de inscrição** |
| `fundo` | Fundo — Decisão | Leitor decidindo com quem fechar | case detalhado, TCO/calculadora, assessment, POC, proposta, depoimento C-level |
| `pos` ⚠️Q3 | Pós-venda — Retenção/Advocacy | Cliente atual | renovação AMS, comunidade, release notes |

**De-para dos 7 estágios do MODELO_CLASSIFICACAO:** Awareness, Engagement → `topo` · Consideration, Intent → `meio` · Conversion → `fundo` · Retention, Advocacy → `pos`.
**De-para FY27:** Aprendizagem e Descoberta → `topo` · Consideração e Avaliação → `meio` · Decisão e Compra → `fundo` (siglas C/R/D idem).

## Dimensão 4 — Tema/formato (independente do funil)

Manter lista da BASE LinkedIn como dimensão separada: `eventos` · `produto-solucao` · `mercado-tendencias` · `educacional` · `institucional` · `recrutamento` · `premiacoes` · `cultura-pessoas` · `cases` · `parceiros`. (Formato — post, carrossel, vídeo, artigo, poll — já existe como campo próprio na BASE; não misturar com tema.)

## Dimensão 5 — Persona-alvo

Lista FY27: `chro` · `cio` · `cfo` · `ceo` · `cto` · `coo` · `ciso` · `ger-rh` · `ger-dp` · `ger-ti` · `ger-processos` · `analista-rh-ti` · `arquiteto-sap` · `qa-lead` · `pm-sap`.

---

## De-para: taxonomias legadas → canônico

### Blog (`linha_de_negocio` Manus → `lob`)

| Manus | Canônico | Obs |
|---|---|---|
| Estratégia & ESG (ERP.ngo) | ⚠️ **re-classificar item a item** | 370 artigos — maioria provável: institucional, mas há LOBs reais escondidos |
| Serviços HCM & RH | `hcm` | |
| Serviços SAP ERP (S/4HANA) | `erp` | |
| BTM (Signavio & Processos) | `btm` | |
| Infraestrutura & Cloud (Valcann) | `cloud` | |
| ServiceNow | `servicenow` | |
| Observabilidade & Testes (iLab) | `ilab` | |

### LinkedIn (GUIA_LOB → `lob`)

AMS→`ams` · BTM→`btm` · ERP→`erp` · HCM→`hcm` · iLab→`ilab` · SN→`servicenow` · Tech→`tech` · Cloud→`cloud` · EPI-USE→`institucional`

### LinkedIn (MODELO_CLASSIFICACAO PILAR → `lob` + `oferta`)

SF HCM→`hcm` · S4HANA→`erp` · BTP→`tech` · Process Excellence→`btm` · WFS→`hcm`+`wfs` · Qualtrics→`hcm`+`qualtrics-ex` · ServiceNow→`servicenow` · Valcann→`cloud` · iLab→`ilab` · AMS→`ams` · Institucional→`institucional`+`brand` · Employer Branding→`institucional`+`employer-branding`

### Calendário editorial (`pilar` → `lob`)

rh→`hcm` · servicenow→`servicenow` · institucional→`institucional` · **produto→re-classificar item a item** (balde)

---

## Plano de execução (fases)

| Fase | O quê | Como | Status |
|---|---|---|---|
| **F1** | Taxonomia v1 + auditoria documentadas | este doc + `auditoria-categorizacao-conteudo.md` | ✅ nesta entrega (draft) |
| **F2** | Validar Q1-Q3 e congelar v1 | Rudá + Bruna + Duda + Lisiane | 🙋 humano |
| **F3** | Re-classificar 707 artigos do blog | script (heurística keywords + batch IA) gera campos novos `lob`, `oferta`, `funil` no artigos.json **preservando** os campos Manus originais; saída etiquetada `🤖 revisar` | ⏳ |
| **F4** | Re-taggear 214 posts LinkedIn com critério unificado de funil | com a Bruna, na planilha dela (evento-cobertura = topo) | ⏳ |
| **F5** | Travar inputs | dropdown de slugs no `/content-pipeline` + migração `pilar` do SQLite via de-para | ⏳ |
| **F6** | Jornadas das 7 LOBs faltantes + Matriz Personas×Conteúdos | pipeline `pipe-briefing` por LOB, template das jornadas S/4HANA e ServiceNow da FY27 | ⏳ |
| **F7** | RAG/NotebookLM | metadados `lob`/`oferta`/`funil` nos documentos indexados pra filtro por linha de negócio | ⏳ |

---

*🤖 Documento gerado por IA em 07/jul/2026 — proposta v1 DRAFT. Slugs e de-para só viram fonte de verdade após validação humana (F2). Números citados vêm da auditoria (dados reais).*
