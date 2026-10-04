# 📌 Pendências do EPI-USE Office

> **Regra (estabelecida 26/mai/2026 noite):** Claude abre/relê este arquivo TODA conversa nova e lembra o Rudá das pendências até elas serem resolvidas.

---

## 🔴 BLOQUEADO POR TERCEIROS — Rudá precisa acompanhar

_Nada bloqueado no momento (02/out/2026)._

## ✅ RESOLVIDOS 02/out/2026 (confirmação Rudá: "b2 e b3 ok")
- **B2 · Brand Guide 2026** — confirmado como versão final. DESIGN.md v4.0 segue valendo, sem re-diff. Segue em aberto, não-bloqueante: o tema “EPI-USE · claro” fica com fundo escuro nas telas com rota (`body[data-route]` do office-nav.js vence o tema; `home.css` tem cards escuros fixos).
- **B3 · Graph API `Files.Read.All`** — permissão liberada. **Fase 2 do Calendário Editorial desbloqueada**; falta só implementar a leitura direto da nuvem (ver `modulos/25-calendario-editorial/PENDENCIAS.md`).

---

## 🟡 DROPADO (decisão Rudá 26/mai)

### RD Station ~~sync editorial~~
- **Status:** ❌ DROPADO. Pivot definitivo pra planilha Duda (B2).
- **Por quê:** key atual é AppStore Publisher (não autoriza leitura de conta). Mesmo gerando Personal API Token no painel RD Marketing, não vale o esforço de manter 2 fontes.
- **Código que ficou:** endpoint `POST /api/inbound/sync-rd` permanece no `server.js` mas retorna 401 com mensagem clara. Não remove — vale como fallback futuro se o cenário mudar.
- **Botão "📤 Sync RD" no `/inbound/calendar`:** considerar remover/esconder na próxima sprint de UX cleanup.

---

## ✅ SPRINTS S29-S31 ENTREGUES (09/jun/2026)

- **S29 (v0.29.0)** — Clientes SAP 4 ME: dashboard `/clientes-sap-4me` (705 projetos globais, KPIs, heat país/área, go-lives/kick-offs, tabela filtrável, PDF) + seção 8 no relatório (funil global + cruzamento Cases × SAP 4 ME).
- **S30 (v0.30.0)** — Field Marketing: tela `/field-marketing` (92 eventos, status, briefing do template Isabela com 5 fases/56 tarefas/checklist/planos B, captura pós-evento + ROI por evento).
- **S31 (v0.31.0)** — Pipeline de Conteúdo: `/content-pipeline` kanban 7 estados + `seo_checker.js` (SEO clássico + GEO/AIO/AEO/LLMO determinístico) + import Redatoria (80 itens). Publicação WordPress segue manual (credenciais TI).
- **Home calendar Railway** — corrigido: estava vazio (DB resetava sem volume + nunca re-sincronizado). Agora `resync-railway-all.ps1` cobre cases + sap4me + calendar (Duda 18 + Redatoria 80).

## 🟢 PENDENTE DE EXECUÇÃO (não-bloqueado, dá pra fazer quando quiser)

### ⭐ APOLLO_API_KEY no Railway (Módulo 29 · 04/out/2026)
- **O quê:** confirmar que a variável `APOLLO_API_KEY` existe no Railway (a mesma do `.env` local). Com ela o servidor busca o Apollo sozinho a cada 6h e a área `/area/pipeline` mostra máquina de outbound, sequências e metas. Sem ela, a página avisa "Apollo sem chave" e esconde esses números.
- **Como checar:** abrir `/area/pipeline` — a barra "Ao vivo" mostra `Apollo · atualizado há Xh` quando está ok.

### ⭐ resync-railway-all.ps1 (workaround D1) — usar após CADA push até montar volume
- `powershell -ExecutionPolicy Bypass -File scripts/lifecycle/resync-railway-all.ps1`
- Re-sincroniza os 4 datasets de uma vez (cases · SAP 4 ME · calendar Duda · Redatoria). Some quando D1 (volume) for feito.

### ✅ P0/D1. Volume persistente Railway — RESOLVIDO E PROVADO (09/jun/2026)
- **Rudá configurou:** volume montado em `/data` + var `DATA_DIR=/data` no Railway.
- **Provado:** deploy v0.31.1 manteve os dados (705 sap4me + 80 content + 22 cases + calendar) **SEM re-sync manual**. Antes zerava a cada push.
- **Diagnóstico visível:** `GET /api/version` → `persistencia.status: "volume-persistente"`, `db_path: /data/db.sqlite`.
- **Não estava com problema** — o "vazio" inicial era só o volume novo recém-montado; resolvido com 1 re-sync.
- **Consequência:** `resync-railway-all.ps1` agora só precisa rodar quando as PLANILHAS FONTE mudarem (não mais a cada deploy).

### ✅ P2. Cron diário Cases — RESOLVIDO (09/jun, v0.28.1)
- **Tarefa Windows:** `EPI-USE-Office-Cases-Sync` registrada (diário 07:00) → roda `run-cases-sync.ps1` → `sync_cases_roberto.js` (Node) → POST local + Railway.
- **Bugs corrigidos:** (1) `$root` hardcoded errado no .ps1 → agora dinâmico via `$PSScriptRoot`; (2) `sync_cases_roberto.js` não resolvia `xlsx` no Node v24 → localModules pattern; (3) faltava path `Ruds` com acento. **Testado end-to-end:** 19 cases → Railway OK.

### ✅ LinkedIn sync auto — RESOLVIDO (09/jun, v0.28.1)
- **Tarefa Windows:** `EPI-USE-Office-LinkedIn-Sync` (diário 08:30) → `run-linkedin-sync.ps1` → `sync_linkedin_historical.py` regenera `linkedin-historical.json` do XLS da Bruna (Desktop/ROADMAP/03 LinkedIn Boost) + reports PPTX.
- **Merge defensivo (Regra 7):** preserva entradas `manual (Rudá)` (ex: 10640 mai/26) + cumulativos (newsletter/total) dos reports. Não regride dado bom.
- **NÃO faz push** (Regra 3) — só regenera local. JSON é estático → Railway pega no próximo push autorizado. Localhost na hora.
- **Obs:** jun/2026 só entra quando a Bruna exportar o XLS novo (hoje vai até mai/26).

### Validação visual end-to-end Voice Index em prod
- **O que:** gerar 1 kit completo pra Anderson com 2-3 screenshots reais, validar que renderiza certo (Voice Index circular + 7 pilares + 5 destaques + banner)
- **Esforço:** 5min (Rudá no driver)
- **Por que:** confirmar que tudo de 0.4.1 funciona end-to-end com dado real

### Backlog F1-F10 (não urgente)
F1 multiplayer game · F2 editor token via cookie · F3 Plausible dashboard · F4 Apollo enrich · F5 Resend templates · F6 PWA · F7 onboarding tutorial · F8 Voice Index histórico · F9 duplicar Voice · F10 dark auto OS

---

## ✅ ENTREGUE — pra contexto histórico

- **28/set: B3 Blog Converter IA — RESOLVIDO por pivô, não por config.** A v1.0 dependia de OpenRouter e deu 404 (modelo `:free` aposentado) e 429 (rate limit). Em vez de brigar com chave/modelo/crédito, o conversor foi reescrito pra **motor determinístico local (v2.0)** — texto→HTML é transformação estrutural, não precisa de IA. Some 404/429/custo, e o upload passa a funcionar em prod (extração no navegador). Depois evoluiu pra **v3.0 (IA via Claude do próprio Office)** ao ver o padrão-ouro da Bruna — determinístico não fazia seleção de componentes (cards/fluxo/callouts). Decisão a partir do feedback da Bruna. Módulo 24 (`modulos/24-blog-converter/`), versionamento próprio (badge v3.0), Office segue 0.90.0.
- **29/jun–18/jul: B1 SSO Microsoft + Roles + Marketing Hub — RESOLVIDO.** `@azure/msal-node` configurado em prod, `SSO_ENFORCE=true`, time todo logando com role real (head/intelligence/growth/field/pipeline/brand/conteudo/country-manager/hub). Módulo 13 (`modulos/13-sso-roles/`). Confirmado pelo uso contínuo em produção: analytics com logins reais, UTM/coins por usuário, homes personalizadas por persona.
- **08/jun: B2 Calendário editorial Duda — RESOLVIDO.** Sync automático via `scripts/sync/sync_calendario_duda.js` → `/api/inbound/calendar`.
- **09/jun: Volume persistente Railway (P0/D1) — RESOLVIDO E PROVADO.** `DATA_DIR=/data` montado; SQLite sobrevive a deploy. Base de tudo que foi construído depois (coins, UTM, resgates, usuários).
- 26/mai noite: v0.4.6 LIVE em prod (Voice Index, 22 cases reais, Studio→Carrossel single, Decorator drag-drop, doc SSO completo)
- 26/mai noite: 22 cases reais sincronizados em prod
- 26/mai noite: header `/cases` com branding "EPI-USE Brasil"
- 26/mai noite: email pro IT enviado pelo Rudá
- 26/mai noite: v0.4.7 polish (header /cases) + v0.4.8 LIVE — **Painel de Metas LinkedIn em /metas** com tática do elefante, 6 áreas com meta editável, gráficos, 5 insights. Footer histórico corrigido (mostrava labels v3.x antigos, agora 0.4.x correto).
- **27/mai noite: v0.4.12 LOCAL** (não subiu) — Optimizer split 2 calls Sonnet (corrige timeout 174s) · ERP.ngo branding (tokens + logo + dashboard card) · Export PDF html2pdf
- **27/mai madrugada: v0.5.0 SPRINT MONSTRO LOCAL** (não subiu) — 5 telas novas: `/relatorio` (espelha PPT 7 seções + 10 slides PPT auto via skill `relatorio-mensal`), `/artigos` (693 do Manus filtráveis), `/jornadas` (matriz LOB×etapa com 7 gaps detectados), `/projecoes` (paid media 4 cenários com fórmula transparente), `/pipeline` (Apollo MVP). 6 endpoints novos. 2 JSONs gerados (artigos 816KB · linkedin-historical 77KB). Skill `relatorio-mensal` + script python-pptx funcional (gerou Mai/26.pptx 40KB validado). Atalho `iniciar-office.bat` criado.
- **27/mai madrugada: CLAUDE.md** ganhou Regra 5 (ler arquivos automático) + Regra 6 (etiquetar conteúdo inventado).

---

## ⏰ Quando atualizar este arquivo

- ✏️ Toda vez que destravar uma pendência → mover pra ✅
- ✏️ Toda vez que aparecer nova pendência externa → adicionar em 🔴
- ✏️ Início de cada sessão Claude: abrir este arquivo, listar pendências pro Rudá antes de qualquer outra ação
