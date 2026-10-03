# Módulo 27 — Área Intelligence (Marketing Intelligence & CRM)

**Status:** ✅ v1.1 · página de trabalho + rastreamento "quem viu o quê" (03/out/2026) · **Rota:** `/area/intelligence` · **Dona:** Bruna Yamagami
**Propósito:** página de **trabalho** da Bruna (atalhos, fila do que precisa de atenção, agente, números e dados), com o visual do `/onboarding` e tracking de uso que só o Rudá vê.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/area-intelligence.html` | Página (vanilla, tokens do DESIGN.md, animações JS) |
| `private/admin-intelligence.html` | Painel do tracking — **fora de `public/`** (nem o HTML é servido a quem não é o dono) |
| `routes/analytics.js` | Beacon `kind='intel'`, `GET /api/analytics/owner`, `GET /api/admin/analytics/intel(/user)`, `GET /admin/intelligence` |
| `server.js` | `GET /area/intelligence` → página dedicada (antes do `/area/:id` genérico) |
| `public/office-nav.js` | Link "👁️ Tracking · Intelligence" só pro dono + aba Intelligence ativa na rota |

As outras áreas seguem no template genérico `public/area.html`.

## Blocos da página (e o `data-sec` usado no tracking)
| Bloco | `data-sec` | Conteúdo | Fonte |
|---|---|---|---|
| Topo | `hero` | Dona, agente (📥/📤), chip do painel (só dono) e **frescor das 4 fontes** (clique abre detalhes) | GA4 · RD · Zoho · Apollo |
| 🔧 Atalhos | `ferramentas` | **Ferramentas da área** + **Do dia a dia** (os mesmos atalhos da Home da Bruna) | `areas.json` · `personas.json` (persona com `area: intelligence`) |
| 🩺 Precisa de atenção | `atencao` | Fila gerada dos dados: achados de higiene, fontes paradas, metas sem fonte. Some sozinho quando a fonte é corrigida | Zoho Leads · frescor das fontes · `areas.json` |
| 🤖 Agente da área | `agente` | Últimos pedidos (inbox) e entregas (outbox) + workspace | `/api/agentes/area-intelligence/workspace` |
| 📁 Projetos | `projetos` | Roadmap da área | `areas.json` |
| 📊 Números & metas | `metas` | 4 números + gauges das metas | Apollo · Zoho · LinkedIn · `areas.json` |
| 📈 Aba Saúde da base | `saude` | % com status/origem/taxonomia nova, status, carteiras, pipeline SDR | `zoho-leads-snapshot.json` |
| 📈 Aba Atribuição | `atribuicao` | Donut de Lead Source | `zoho-leads-snapshot.json` |
| 📈 Aba Deals | `pipeline` | Deals por mês (12m) e por solução, filtro Todos/MKT/SDR — **só contagem, sem R$** | `/api/zoho/pipeline` |
| 📈 Aba Audiência | `audiencia` | Seguidores LinkedIn + GA4 do último mês fechado | `/api/linkedin/historical` · `ga4-snapshot.json` |
| 📈 Aba Fontes | `fluxo` | Hub "4 fontes, 1 visão" com partículas | GA4 · RD · Zoho · Apollo |

A aba aberta fica salva no navegador (`localStorage` `eubr-intel-aba`).

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` já grava `kind='view'` em `/area/intelligence`. **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos da página** (`kind='intel'`, coluna `meta`, enviados em lote por `sendBeacon`):
  `sec.<id>` (seção ≥30% na tela) · `tempo.<id>.<seg>` (tempo em cada seção, também em `dur_ms`) · `scroll.25|50|75|100` · `tool.<slug-do-href>` · `aba.<id>` · `atencao.<id>` · `node.<fonte>` · `origem.<slug>` · `tab.deals-<all|mkt|sdr>` · `grafico.linkedin` · `agente.<chip|inbox|outbox|abrir>` (v1.0 também gravava `achado.<id>` e `cta.*`).
- **Painel:** `/admin/intelligence` — pessoas, visitas, tempo médio, "o que foi visto" por seção, scroll, ferramentas, interações, visitas/dia, tabela por pessoa (clique → passo a passo completo), atividade recente, CSV. Por padrão **exclui os acessos do próprio dono** (toggle "incluir meus acessos").

## Acesso
Painel e APIs: `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Links (nav + chip na página) só aparecem quando `GET /api/analytics/owner` responde `owner: true`. Quem não é dono recebe 403.
