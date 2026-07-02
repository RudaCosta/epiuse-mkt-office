# Módulo 15 — Office Game (engine 2D dos games /game e /game-hub)

> **Propósito:** os dois games 2D do Office — `/game` (mundo do time de marketing) e `/game-hub` (mundo do colaborador) — construídos sobre um **engine compartilhado** de pixel-art procedural, 100% vanilla JS, zero assets externos.

## Status
✅ v3.0 "Fable Edition" (jul/2026) — reescrita completa sobre a base "Gather Edition 2.0". As v1 estão arquivadas em `public/_versoes-office/v1-office-game.html` e `v1-game-hub.html` (nada foi deletado).

## Arquitetura

| Arquivo | O que é |
|---|---|
| `public/js/office-engine-v3.js` | **Engine compartilhado** — todos os sistemas (render, input, NPCs, presença, quests, luz, som). ~1100 linhas. |
| `public/office.html` | Mundo do **time de MKT** (`/game`) — só conteúdo: salas, móveis, zonas, NPCs reais, quest. |
| `public/game-hub.html` | Mundo do **colaborador** (`/game-hub`) — centro de visitantes: estandes dos materiais do Hub, mascote Ellie 🐘. |
| `public/css/office-game.css` | CSS compartilhado (HUD, spawn, modais, joystick, emotes). |
| `server.js` → `POST /api/game/presence` | Presença multiplayer **em memória** (Map, TTL 8s, cap 600) — zera a cada deploy, por design. |

Cada página define `window.WORLD = {...}` (salas, móveis via painters `P.*`, zonas, NPCs, quest) **antes** de incluir o engine. O shell do mapa (60×36 tiles, paredes, portas) é fixo no engine — os mundos trocam nomes/rugs/conteúdo.

## Sistemas do engine 3.0

1. **Render**: canvas DPR-aware (nítido em retina) · zoom `+`/`−`/`0` + pinça (clamp 0.7–1.4) · prerender do mundo em canvas offscreen · pausa com aba oculta.
2. **Iluminação por hora real**: manhã dourada / dia / entardecer / noite (escuridão + poças de luz nas salas, TVs e lanterna do player). Teste: `?hora=22`.
3. **Mundo vivo**: TVs ciclando painéis com **dados reais** (versão do changelog, próximos eventos, data especial de hoje, nº online) · vapor do café · bolhas do bebedouro · plantas com sway · borboletas · folhas no jardim.
4. **NPCs 2.0** (mundo MKT — pessoas reais): rotina pela hora real (8h café → mesa → 12h almoço → mesa → 17h lobby → 19h+ vão embora, com "late workers" determinísticos) · balões de fala por proximidade (tom de personagem, sem dados inventados) · `E` no colega → cartão com cargo/foco/aniversário (`/api/team.json`) + itens reais da mesa (`/api/office-desks.json`) · chapéu de festa quando é aniversário REAL da pessoa.
5. **Dados reais nas estações** (regra 7 — REAL DATA ONLY): quadro de cortiça com post-its dos **próximos 3 eventos** do `/api/events.json` (fonte única do Office).
6. **Spawn SSO-aware**: `/api/auth/status` → botão "Entrar como {nome}", avatar (camisa/pele/cabelo) salvo por email.
7. **Emotes**: teclas 1-4 (👋 ❤️ 😄 🎉), replicados pros outros jogadores via presença.
8. **Quests** (localStorage): MKT = "Giro do Escritório" (11 salas) · colaborador = "Tour do Colaborador" (7 estações) — onboarding gamificado. Confete + fanfarra ao completar.
9. **Presença multiplayer**: POST a cada 2s → recebe outros do mesmo mundo (TTL 8s) → interpolação linear, minimapa, pill "👥 N online". Identidade = email da sessão SSO (fallback anonId em dev). `sendBeacon` de despedida no unload.
10. **Sons procedurais** (WebAudio, **off por padrão**, toggle 🔊 no HUD): passos, blip de interação, pop de emote, fanfarra da quest.

## Mundos

- **`/game` (MKT)**: mesmas 11 salas da v1 (Optimizer, Hub, Inbound, Roberto, Voices Studio, Bullpen com mesas personalizadas reais, Field & Eventos, SAP Lab, Coffee, Lobby, Jardim ERP.ngo) + NPCs do time com rotina/falas.
- **`/game-hub` (colaborador)**: re-mobiliado como **centro de visitantes** — estandes (`pStand`) pros materiais reais do Hub (Apresentação, Template, Canva, Cases, Eventos, Assinatura), estações novas **🎨 Brand Assets → `/brand`** e **🪪 LinkedIn Optimizer → `/optimizer`**, sala "📣 Seja um Voice", e a mascote **Ellie 🐘** (personagem fictícia da marca ERP.ngo, sprite próprio de elefantinha) como recepcionista fixa.

## Regras que este módulo respeita
- **REAL DATA ONLY (regra 7)**: todo número/dado exibido vem de API real (`events.json`, `changelog.json`, `team.json`, `office-desks.json`, `datas-especiais-2026.json`, presença). Falas de NPC são flavor conversacional de personagem — nunca métricas.
- **Sem frameworks** — vanilla JS/canvas.
- Roteamento e hard-lock **inalterados**: `/game` redireciona role `hub` → `/game-hub`; `HUB_LOCK_PAGES` já cobria os destinos.

## Editar conteúdo sem tocar no engine
- **Itens de mesa** de alguém → `public/api/office-desks.json` (sem deploy).
- **Falas/salas/zonas/quests** → o bloco `window.WORLD` do respectivo HTML.
- **Sistemas** (luz, presença, NPCs, sons) → `public/js/office-engine-v3.js`.
