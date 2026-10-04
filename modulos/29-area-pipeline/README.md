# Módulo 29 — Área Pipeline (Biz Dev / Development Sales)

**Status:** ✅ v1.0 · página visual só com fontes automáticas + tracking "quem viu o quê" (04/out/2026) · **Rota:** `/area/pipeline` · **Dona:** Marlison Estrela
**Propósito:** mesa de trabalho do outbound: máquina de outbound animada (Apollo), sequências, ritmo diário, voz do campo (JARVIS). Só entra o que se atualiza sozinho; o resto virou link. Tracking de uso que só o Rudá vê.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/area-pipeline.html` | Página (vanilla, tokens do DESIGN.md, animações JS: fluxo de dados no fundo, máquina de outbound com partículas que "vazam" na taxa real de cada etapa, contadores, gauges, donut, cards de sequência) |
| `routes/area-pipeline.js` | **Refresh do Apollo no servidor** (boot + a cada 6h, `APOLLO_API_KEY`), histórico diário `apollo_hist`, agregado do JARVIS, `GET /api/area/pipeline`, `POST /api/area/pipeline/refresh` |
| `server.js` | `GET /area/pipeline` (antes do `/area/:id`), `/pipeline` → redirect 302 pra área, `/api/pipeline` e overlay do `/api/areas.json` passam a ler o Apollo vivo |
| `routes/analytics.js` | `AREA_TRACK.pipeline` → beacon `kind='pipeline'`, `GET /api/admin/analytics/pipeline(/user)`, `GET /admin/pipeline` |
| `private/admin-area-tracking.html` | Painel único das áreas (27/28/29) — config `pipeline` + nomes das sequências/calls |
| `public/office-nav.js` | Link "👁️ Tracking · Pipeline" só pro dono + aba Biz Dev ativa na rota |
| `public/api/areas.json` | Ferramentas (JARVIS, Curva ABC, Apollo ↗, Zoho ↗, Relatório) e projetos da área |

## Fontes: dentro × fora
| Fonte | Na página? | Por quê |
|---|---|---|
| **Apollo** (contatos, contas, sequências, métricas por sequência, estágios) | ✅ dentro | O servidor busca na API a cada 6h e grava em `app_blobs['apollo.pipeline']` (volume). Antes era `pipeline-snapshot.json` estático — prod parado desde 09/jun. |
| **JARVIS** (calls, dores, objeções, gatilhos) | ✅ dentro | Memória viva no SQLite: entra a cada call salva no `/jarvis` ou ingerida do Zoho/3CX. |
| Zoho CRM (deals, oportunidades, R$) | ↗ link | Sync depende de sessão do Claude (MCP) — não é automático. |
| Planilha de metas (`metas-fy26.json`) | só a **meta** | A meta vem da planilha; o realizado só aparece quando é automático (Apollo). |
| `relatorio-outreach.json`, Curva ABC | ↗ link | Gerados à parte. |

## Blocos da página (e o `data-sec` usado no tracking)
| Bloco | `data-sec` | Conteúdo |
|---|---|---|
| Topo | `hero` | Dona, agente, chip do painel (só dono), **máquina de outbound** (base → entregues → abertos → respostas → reuniões, com % que avança), barra "ao vivo" (frescor Apollo/JARVIS, contagem pro próximo refresh, 🔄 atualizar agora, Zoho ↗) |
| 🔧 Atalhos | `ferramentas` | Ferramentas da área + "Do dia a dia" (persona do Marlison). Tracejado = externo |
| 🩺 Precisa de atenção | `atencao` | Apollo sem chave/falhou/parado, sequência fraca, bounce ≥5%, tarefas manuais atrasadas, sequência ativa sem envio, passos fracos, JARVIS sem call há 14d |
| 🤖 Agente / 📁 Projetos | `agente` · `projetos` | `area-pipeline` + roadmap do `areas.json` |
| 📊 Números & metas | `metas` | Contatos, contas, sequências ativas, taxa de resposta + gauges: sequências ativas (25), e-mails entregues 30d (660), reuniões 30d (12), contas novas 7d (20/semana) + card ↗ Zoho |
| 📨 Sequências | `sequencias` | Filtro ativas/pausadas/todas, ordenação, cadência por canal, mini-funil por sequência, drawer com passos + "Abrir no Apollo ↗" |
| 📈 Ritmo & canais | `ritmo` | Entregues/respostas por dia (diferença diária do histórico) + donut de canais (clique filtra as sequências) |
| 🪜 Estágios | `estagios` | Contatos por estágio do Apollo (só aparece se a chave tiver acesso a `/contact_stages`) |
| 🎧 Voz do campo | `campo` | Calls 30d (vs 30d antes), duração/temperatura média, calls por semana, por SDR e LOB, dores/objeções/gatilhos (🤖 IA — revisar), últimas calls (drawer) |
| 🔌 Fontes | `fontes` | Dentro (auto) × fora (link) |

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` (`kind='view'` em `/area/pipeline`). **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos** (`kind='pipeline'`, coluna `meta`, em lote por `sendBeacon`):
  `sec.<id>` · `tempo.<id>.<seg>` · `scroll.25|50|75|100` · `tool.<slug-do-href>` · `seq.<id-apollo>` · `filtro.<ativas|pausadas|todas>` · `ordem.<criterio>` · `canal.<canal>` · `flow.<etapa>` · `call.<id>` · `campo.<tipo>` · `estagio.<nome>` · `node.<apollo|jarvis>` · `fora.<fonte>` · `refresh.apollo` · `atencao.<id>` · `agente.<chip|inbox|outbox|abrir>`.
- **Painel:** `/admin/pipeline` — mesmo painel das outras áreas; traduz `seq.<id>` pro nome da sequência e `call.<id>` pra empresa.

## Acesso
Painel e APIs de tracking: `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Link no nav e chip na página só aparecem quando `GET /api/analytics/owner` responde `owner: true`. `GET /api/area/pipeline` exige login (`requireAuth`), igual às APIs do JARVIS.
