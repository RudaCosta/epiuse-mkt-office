# Módulo 30 — Área Brand Experience / Voices

**Status:** ✅ v1.0 · página visual só com fontes automáticas + tracking "quem viu o quê" (04/out/2026) · **Rota:** `/area/brand` · **Dona:** Eduarda Hirose (Duda)
**Propósito:** mesa de trabalho da Duda: programa EPI-USE Voices (roster, esteira de pautas, alcance dos links, inscrições), Cases, calendário editorial e a marca viva. Só entra o que se atualiza sozinho; o resto virou link. Tracking de uso que só o Rudá vê.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/area-brand.html` | Página (vanilla, tokens do DESIGN.md, animações JS: céu de pontos conectados no fundo, **constelação dos Voices** — Voices orbitando o núcleo, partículas = cliques reais, pulsos = pautas em andamento, cadeiras vazias = vagas —, esteira de pautas com fluxo animado, contadores, gauges, donut, barras, drawers) |
| `routes/area-brand.js` | `GET /api/area/brand` — agrega Voices, pautas, links, inscrições, Cases e calendário (só leitura) |
| `routes/editorial.js` | **Auto-sync do calendário editorial via Graph** (boot + 6h) e `autoStatus()` usado pela área |
| `server.js` | `GET /area/brand` (antes do `/area/:id`); overlay do `/api/areas.json` deixa de usar `linkedin-routine` como "posts/mês" da área |
| `routes/analytics.js` | `AREA_TRACK.brand` → beacon `kind='brand'`, `GET /api/admin/analytics/brand(/user)`, `GET /admin/brand` |
| `private/admin-area-tracking.html` | Painel único das áreas (27/28/29/30) — config `brand` + nome dos Voices e título das pautas |
| `public/office-nav.js` | Link "👁️ Tracking · Brand" só pro dono + aba Brand ativa na rota |
| `public/api/areas.json` | Ferramentas (Pautas dos Voices, Inscrições, Brand Assets…) e projetos da área |

## Fontes: dentro × fora
| Fonte | Na página? | Por quê |
|---|---|---|
| **Voices** (roster) | ✅ dentro | `voices.json` (quem é do programa) + `voices_publicados` (publicados de inscrição, na hora) |
| **Pautas** (Módulo 20) | ✅ dentro | `voice_pautas` / `voice_pauta_eventos`: cada ação no `/voices/pautas` entra na hora |
| **Links rastreados** (Módulo 18) | ✅ dentro | `utm_clicks` sem robôs, nos tokens das pautas liberadas + links criados pelo próprio Voice |
| **Posts publicados** | ✅ dentro | URL colada na pauta publicada + post registrado no tracker (`posts`). Um post = uma URL |
| **Inscrições** `/seja-voice` | ✅ dentro (só contagens) | `recruitment_applications` grava na hora. Sem nomes na área (dado pessoal) |
| **Cases** | ✅ dentro | `cs_clientes` — tarefa diária 07:00 → prod. >36h sem sync = "parado" + alerta |
| **Calendário editorial** (Módulo 25) | ✅ dentro **se** o auto-sync Graph estiver ok (<26h) | Servidor baixa a planilha da nuvem a cada 6h. Sem isso, o bloco vira link |
| **Marca** (cores/fontes) | ✅ dentro | Lidas do `design-tokens.css` (gerado do DESIGN.md) |
| SSI, seguidores, "posts do mês", kit, pendências do `voices.json` | ↗ link `/voices` | Medição/edição manual (LinkedIn não tem API de SSI) |
| LinkedIn da empresa (`linkedin-routine.json`, XLS) | ↗ link `/linkedin` | JSON estático/export manual |
| Calendário da Duda (`editorial_calendar`) | ↗ link `/inbound/calendar` | Sync depende do PC (tarefa agendada) |
| Digest/inbox do Painel da Duda | saiu | Lia arquivos do vault (só mudam com deploy). "Precisa de atenção" substitui com dado vivo |
| Reports mensais (PPT SharePoint) | ↗ link | Arquivos gerados à parte |

## Blocos da página (e o `data-sec` usado no tracking)
| Bloco | `data-sec` | Conteúdo |
|---|---|---|
| Topo | `hero` | Dona, agente, chip do painel (só dono), **constelação dos Voices**, barra "ao vivo" (Voices & pautas · Cases · Calendário, Perfis & SSI ↗) |
| 🔧 Atalhos | `ferramentas` | Ferramentas da área + "Do dia a dia" (persona da Duda). Tracejado = externo |
| 🩺 Precisa de atenção | `atencao` | Pauta esperando OK da Duda, liberada sem publicar ≥3d, parada ≥5d, inscrições novas, Cases parado, calendário com erro/parado, Voice sem login/sem post 30d, pautas da Redatoria sem Voice, cadeiras abertas |
| 🤖 Agente / 📁 Projetos | `agente` · `projetos` | `area-brand` + roadmap do `areas.json` |
| 📊 Números & metas | `metas` | Voices, posts 30d, cliques 30d, pautas em andamento + gauges: cadeiras (5) e posts no mês (meta 40 do `areas.json`). SSI ↗ e "seguidores atribuídos" `⏳ Aguarda integração LinkedIn` |
| 🎙️ Voices | `voices` | Card por Voice (anel = posts 30d vs 2/semana, cliques, pautas por etapa) + cadeiras abertas → `/seja-voice` |
| 📝 Esteira de pautas | `esteira` | 6 etapas com fluxo animado e "mais antiga: Xd", ritmo semanal (criadas × publicadas) e atividade recente |
| 📈 Alcance dos links | `alcance` | Cliques por dia (30d), ranking por Voice, posts por mês (6m) vs meta |
| 🙋 Inscrições | `inscricoes` | Funil recebidas → triadas → aprovadas, 30d vs 30d anteriores, por área e por origem (UTM) |
| 🤝 Cases | `cases` | Donut por status, barras por LOB (filtram), lista de publicáveis/em produção, NPS médio, frescor do sync |
| 🗓️ Calendário editorial | `calendario` | Próximas 4 semanas da planilha (drawer por post) — ou card-link quando a leitura automática não está ok |
| 🎨 Marca viva | `marca` | Paleta do Brand Guide 2026 (clique copia o hex) + Lato/Open Sans |
| 🔌 Fontes | `fontes` | Dentro (auto) × fora (link) |

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` (`kind='view'` em `/area/brand`). **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos** (`kind='brand'`, coluna `meta`, em lote por `sendBeacon`):
  `sec.<id>` · `tempo.<id>.<seg>` · `scroll.25|50|75|100` · `tool.<slug-do-href>` · `voice.<id>` · `vaga.<n>` · `etapa.<estado>` · `pauta.<id>` · `top.<voice>` · `insc.<etapa|area-…>` · `case.<status>` · `caselob.<lob>` · `cal.<data>` · `cor.<token>` · `node.<fonte>` · `fora.<fonte>` · `atencao.<id>` · `agente.<chip|inbox|outbox|abrir>`.
- **Painel:** `/admin/brand` — mesmo painel das outras áreas; traduz `voice.<id>` pro nome e `pauta.<id>` pro título.

## Acesso
- Painel e APIs de tracking: `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Link no nav e chip na página só aparecem quando `GET /api/analytics/owner` responde `owner: true`.
- `GET /api/area/brand`: login (`requireAuth`) e **fora** os roles `hub` e `voice` (403). A página mostra um aviso e manda o Voice pro `/voices/pautas` — ele só pode ver as próprias pautas (regra do Módulo 20).
