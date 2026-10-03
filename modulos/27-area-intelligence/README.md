# Módulo 27 — Área Intelligence (Marketing Intelligence & CRM)

**Status:** ✅ v1.0 · página dedicada + rastreamento "quem viu o quê" (03/out/2026) · **Rota:** `/area/intelligence` · **Dona:** Bruna Yamagami
**Propósito:** a área de Intelligence numa página visual (mesma linguagem do `/onboarding`), lida direto das fontes, com tracking de uso que só o Rudá vê.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/area-intelligence.html` | Página (vanilla, tokens do DESIGN.md, animações JS) |
| `views/admin-intelligence.html` | Painel do tracking — **fora de `public/`** (nem o HTML é servido a quem não é o dono) |
| `routes/analytics.js` | Beacon `kind='intel'`, `GET /api/analytics/owner`, `GET /api/admin/analytics/intel(/user)`, `GET /admin/intelligence` |
| `server.js` | `GET /area/intelligence` → página dedicada (antes do `/area/:id` genérico) |
| `public/office-nav.js` | Link "👁️ Tracking · Intelligence" só pro dono + aba Intelligence ativa na rota |

As outras áreas seguem no template genérico `public/area.html`.

## Seções da página (e o `data-sec` usado no tracking)
| # | `data-sec` | Conteúdo | Fonte |
|---|---|---|---|
| — | `hero` | Anel de atribuição (% leads com origem) + 4 números | Zoho Leads · Apollo · LinkedIn |
| 01 | `fluxo` | Hub "4 fontes, 1 visão" com partículas e frescor de cada fonte; clique abre detalhes + o que falta | GA4 · RD · Zoho · Apollo |
| 02 | `metas` | Gauges do funil de metas (`areas.json`) | `/api/areas.json` (overlay live) |
| 03 | `saude` | % com status/origem/taxonomia nova, achados de higiene, status, carteiras, pipeline SDR | `zoho-leads-snapshot.json` |
| 04 | `atribuicao` | Donut de Lead Source | `zoho-leads-snapshot.json` |
| 05 | `pipeline` | Deals criados por mês (12 meses) e por solução, filtro Todos/MKT/SDR — **só contagem, sem R$** | `/api/zoho/pipeline` |
| 06 | `audiencia` | Linha de seguidores LinkedIn + GA4 do último mês fechado | `/api/linkedin/historical` · `ga4-snapshot.json` |
| 07 | `projetos` | Roadmap da área | `areas.json` |
| 08 | `ferramentas` | Atalhos com tilt 3D | `areas.json` |
| 09 | `agente` | Workspace do `area-intelligence` | `/api/agentes/_counters` |

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` já grava `kind='view'` em `/area/intelligence`. **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos da página** (`kind='intel'`, coluna `meta`, enviados em lote por `sendBeacon`):
  `sec.<id>` (seção ≥30% na tela) · `tempo.<id>.<seg>` (tempo em cada seção, também em `dur_ms`) · `scroll.25|50|75|100` · `tool.<slug-do-href>` · `node.<fonte>` · `achado.<id>` · `origem.<slug>` · `tab.deals-<all|mkt|sdr>` · `grafico.linkedin` · `cta.*` · `agente.abrir`.
- **Painel:** `/admin/intelligence` — pessoas, visitas, tempo médio, "o que foi visto" por seção, scroll, ferramentas, interações, visitas/dia, tabela por pessoa (clique → passo a passo completo), atividade recente, CSV. Por padrão **exclui os acessos do próprio dono** (toggle "incluir meus acessos").

## Acesso
Painel e APIs: `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Links (nav + chip na página) só aparecem quando `GET /api/analytics/owner` responde `owner: true`. Quem não é dono recebe 403.
