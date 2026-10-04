# Módulo 28 — Área Eventos (Field Marketing & Eventos)

**Status:** ✅ v1.1 · página visual de trabalho + rastreamento "quem viu o quê" + Field Marketing v2 (04/out/2026) · **Rota:** `/area/eventos` · **Dona:** Gabrielle Senne
**Propósito:** mesa de trabalho do Field Marketing com cara de "palco": contagem regressiva do próximo evento, calendário BR + LATAM animado, MDF e ROI pós-evento — e tracking de uso que só o Rudá vê.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/area-eventos.html` | Página (vanilla, tokens do DESIGN.md, animações JS: palco com luzes subindo, confete, contadores, contagem regressiva, letreiro) |
| `private/admin-area-tracking.html` | Painel do tracking — **um HTML para todas as áreas** (`/admin/intelligence` e `/admin/eventos`), fora de `public/` |
| `routes/analytics.js` | `AREA_TRACK` (config por área), beacon `kind='eventos'`, `GET /api/admin/analytics/eventos(/user)`, `GET /admin/eventos` |
| `server.js` | `GET /area/eventos` → página dedicada (antes do `/area/:id` genérico) |
| `public/office-nav.js` | Link "👁️ Tracking · Eventos" só pro dono + aba Field Marketing ativa na rota |
| `public/api/areas.json` | Ferramentas da área: Field Marketing, Development Funds, Relatório |
| `public/field-marketing.html` | **Field Marketing v2** — operação dos eventos (ver seção abaixo) |
| `server.js` (`GET /api/field-marketing`) | Devolve também `briefing`, `brindes`, `atualizado_em` e o `local` do calendário |

## Blocos da página (e o `data-sec` usado no tracking)
| Bloco | `data-sec` | Conteúdo | Fonte |
|---|---|---|---|
| Topo | `hero` | Dona, agente, chip do painel (só dono), **próximo evento com contagem regressiva** (ou "acontecendo agora"), próximos 3, letreiro dos próximos 14, frescor das 3 fontes | `events.json` · `/api/field-marketing` · `/api/development-funds` |
| 🔧 Atalhos | `ferramentas` | Ferramentas da área + "Do dia a dia" (mesmos da Home da Gabrielle) | `areas.json` · `personas.json` (`area: eventos`) |
| 🩺 Precisa de atenção | `atencao` | Claims do MDF vencendo (≤30d) ou vencidos, eventos BR passados sem captura, eventos em ≤30d sem briefing, fontes paradas, datas a confirmar, metas sem fonte | derivado dos dados |
| 🤖 Agente | `agente` | Pedidos/entregas do `area-eventos` | `/api/agentes/area-eventos/workspace` |
| 📁 Projetos | `projetos` | Roadmap da área | `areas.json` |
| 📊 Números & metas | `metas` | Eventos BR no ano, realizados, pela frente (3 meses), países + gauges do funil | `events.json` · `areas.json` · captura do Field |
| 🗓️ Calendário | `calendario` | Linha do ano (BR/LATAM, marcador "hoje") + rio de 12 meses com filtros região/LOB/país | `events.json` + registro do Field |
| 🌎 Onde estamos | `mapa` | Barras por país + donut de LOB (clique filtra o calendário) | `events.json` |
| 🚦 Status | `status` | Fluxo planejamento → pré → ao vivo → pós → concluído | `field_events` (Office) |
| 💶 MDF | `mdf` | DDF/EDF consumido, € aprovados, claims a reclamar com vencimento | `development-funds.json` |
| 🧾 ROI | `roi` | Funil leads → qualificados → deals, custo/lead, tabela por evento | captura do Field (`field_events.captura_json`) |

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` (`kind='view'` em `/area/eventos`). **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos** (`kind='eventos'`, coluna `meta`, em lote por `sendBeacon`):
  `sec.<id>` · `tempo.<id>.<seg>` · `scroll.25|50|75|100` · `tool.<slug-do-href>` · `proximo.<evento>` · `evento.<evento>` · `regiao.<todos|brasil|latam>` · `lob.<lob>` · `pais.<cc>` · `mes.<mmm>` (meses que a pessoa rolou até ver no calendário) · `status.<id>` · `mdf.claim-<proposta>` · `node.<events|field|mdf>` · `atencao.<id>` · `grafico.lob` · `agente.<chip|inbox|outbox|abrir>`.
  `<evento>` = `slug(regiao-mes-nome)`; o painel traduz de volta pro nome lendo `events.json`.
- **Painel:** `/admin/eventos` — pessoas, visitas, tempo, seções vistas, scroll, ferramentas, interações (eventos abertos, filtros), visitas/dia, passo a passo por pessoa, CSV. Exclui os acessos do dono por padrão.

## Acesso
Painel e APIs: `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Link no nav e chip na página só aparecem quando `GET /api/analytics/owner` responde `owner: true`. Quem não é dono recebe 403 — nem o HTML do painel é servido.

## Field Marketing v2 (`/field-marketing`)
Tela de operação da Gabrielle (a `/area/eventos` é a visão; aqui se edita).
| Bloco | O que faz |
|---|---|
| KPIs | eventos no calendário, próximos 30 dias, realizados BR sem captura, briefing em andamento, leads, custo/lead |
| 🎯 No radar | próximos eventos com data: contagem, % do processo, próxima tarefa com vencimento, atrasos |
| 🗂️ Todos os eventos | busca + filtros (próximos/realizados/todos · região · LOB) em **linha do tempo** (por mês) ou **kanban** por status (arrastar muda o status e salva) |
| Editor (drawer) | ⚙️ Dados (status, data confirmada, porte, local, responsável, orçamento) · 📋 Briefing (mensagem-chave, speakers, materiais, obs + **checklist das 56 tarefas com prazo calculado pela data do evento**, D-Day, planos B, PDF) · 🎁 Brindes (planejado × distribuído) · 📊 Pós-evento (leads, qualificados, deals, custo → funil e custo/lead) |

- **Briefing agora é salvo** em `field_events.briefing_json` (`{mensagem_chave, speakers, materiais, obs, tarefas:{chave:true}, dday:{i:true}}`). Antes era só leitura e `tem_briefing` nunca ficava verdadeiro.
- Chave da tarefa = `<índice da fase>-<slug da tarefa>`: mudar o texto de uma tarefa no template zera só ela.
- Prazo do template (`D-60 a D-55`, `D3 a D7`) → vencimento = último número; negativo conta do início do evento, positivo do fim.
- Data confirmada no Field vence a do calendário também na `/area/eventos` (cobre os eventos "a confirmar").

