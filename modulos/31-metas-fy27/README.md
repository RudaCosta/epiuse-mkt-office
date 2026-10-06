# Módulo 31 — Metas FY27 · placar ao vivo

**Status:** ✅ v1.0 · placar só com fontes automáticas + tracking "quem viu o quê" só do dono (06/out/2026) · **Rota:** `/metas-fy27` · **Dono:** Rudá Costa
**Propósito:** uma página com todas as metas do time de Marketing no FY27 (jul/26 → jun/27). Meta com fonte que se atualiza sozinha entra no placar com número; meta sem fonte automática fica listada com o link de onde é medida. Nada chumbado (regra 7).

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/metas-fy27.html` | Página (vanilla, tokens do DESIGN.md, animações JS: faíscas subindo no fundo, anéis por área + relógio do ano fiscal, contadores, gauges com marca de "hoje", sparklines, corrida até a meta, acordeão das metas de fora, fluxo das fontes, drawers) |
| `routes/metas-fy27.js` | `GET /api/metas/fy27/placar` — monta o placar (metas vivas, metas de fora, o que saiu, fontes) + completa os meses do FY27 no cache do GA4 (boot + 24h) |
| `routes/area-pipeline.js` | Exporta `apolloStatus` (frescor do Apollo) |
| `routes/area-brand.js` | Exporta `voicesResumo` (Voices e posts ao vivo) |
| `routes/analytics.js` | `AREA_TRACK.metas` → beacon `kind='metas'`, `GET /api/admin/analytics/metas(/user)`, `GET /admin/metas` |
| `private/admin-area-tracking.html` | Painel único de tracking — config `metas` (nomes das metas, áreas e fontes) |
| `public/office-nav.js` | Link "👁️ Tracking · Metas FY27" só quando `/api/analytics/owner` diz que é o dono (e-mail, não papel) |
| `server.js` | Registra a rota; `/metas-fy26` → 301 `/metas-fy27`; endpoint antigo `/api/metas/fy26\|fy27` removido |
| `public/_versoes-office/metas-fy27-v1.html` · `metas-fy26-v1.html` | Páginas antigas arquivadas (só super admin) |

## Metas no placar (realizado automático)
| Área | Meta | Alvo vem de | Realizado | Fonte |
|---|---|---|---|---|
| Biz Dev | E-mails entregues (30d) | funil `areas.json` (660 = 30/dia × 22) | Δ `entregues` no `apollo_hist` | Apollo 6h |
| Biz Dev | Reuniões marcadas (30d) | planilha (12/mês) | Δ `reunioes` (unique_demoed) | Apollo 6h |
| Biz Dev | Contas novas no Apollo (7d) | planilha (20/semana) | Δ `contas` | Apollo 6h |
| Biz Dev | Sequências ativas | funil (25) | `sequencias_ativas` | Apollo 6h |
| Intelligence | Base de contatos | funil (50.000) | `contatos_total` | Apollo 6h |
| Intelligence | Empresas mapeadas | funil (20.000) | `contas_total` | Apollo 6h |
| Field Marketing | Eventos BR realizados (ano) | planilha (30) | kanban `field_events` em pós-evento/concluído | Office |
| Field Marketing | Leads capturados (ano) | funil (600) | soma `captura_json.leads` | Office |
| Brand | Voices no programa | funil (5) | `voicesResumo()` | Office |
| Brand | Voices ativos (30d) | funil (5) | Voice com ≥1 post em 30d | Office |
| Brand | Posts dos Voices (30d) | funil (40/mês) | URLs publicadas (pauta + tracker) | Office |
| Conteúdo | Tráfego do site | funil (15.000) | sessões GA4 do último mês fechado · `⚠️ premissa: sessões/mês` | GA4 diário |
| Conteúdo | Pautas da Redatoria (30d) | funil (25) | `content_pipeline` criadas em 30d · `⚠️ premissa: mensal` | Office |

**Status** = % contra o esperado hoje: metas de janela/estoque esperam 100%; metas do ano esperam o % do ano já passado (marca branca no gauge, barra "hoje" na corrida). ≥100% da meta = batida · ≥100% do ritmo = acima do ritmo · ≥75% = no ritmo · ≥50% = atrás · resto = longe.

## Fora do automático
Linhas da planilha (`metas-fy26.json`, que hoje carrega o FY27) e estágios do funil das áreas com meta e sem fonte automática. Cada uma aponta onde é medida: Zoho CRM, Apollo (ligações/toques), LinkedIn, RD Station, HubSpot, Blog/Artigos, área Field Marketing, SAP Development Funds, Canva. Link interno só aparece se a pessoa pode abrir a página (mesma regra do menu).

**Saem da página** (seguem na planilha): regras de processo e rituais (cadência de e-mail por evento, regras do DDF, etapas do design, comitês), prazos pontuais vencidos, cabeçalhos da planilha e metas repetidas que já estão no placar. A página mostra a contagem e a lista.

## Blocos da página (e o `data-sec` usado no tracking)
| Bloco | `data-sec` | Conteúdo |
|---|---|---|
| Topo | `hero` | Anéis por área (média das metas ao vivo) + anel do ano fiscal, KPIs por status (filtram o placar), fontes ao vivo, chip do painel (só dono) |
| 🏁 Placar | `placar` | Cards por meta (gauge, contador, sparkline, nota, etiqueta, fonte) com filtro por área e status; clique → drawer com gráfico, cálculo, origem da meta e fonte |
| 🏃 Corrida | `corrida` | Uma pista por meta: bolinha no % atingido, 🏁 em 100%, barra "hoje" nas metas do ano |
| ↗ Fora do automático | `fora` | Acordeão por área com link de onde medir + "o que saiu" |
| 🔌 Fontes | `fontes` | Dentro (Apollo, Office, GA4, com frescor) → placar · fora (só link, com o porquê) |

## Rastreamento (quem viu o quê)
- **Abriu a página:** `logPageView` (`kind='view'` em `/metas-fy27`). **Tempo total:** beacon do office-nav (`kind='dur'`).
- **Passos** (`kind='metas'`, coluna `meta`, em lote por `sendBeacon`): `sec.<id>` · `tempo.<id>.<seg>` · `scroll.25|50|75|100` · `meta.<id>` · `area.<id>` · `status.<filtro>` · `anel.<area>` · `grupo.<area>` · `fora.<sistema>` · `node.<fonte>` · `areapg.<area>` · `corte.regras|vencidas`.
- **Painel:** `/admin/metas` — o mesmo painel das áreas; traduz `meta.<id>` pro título e `<area>` pro nome.

## Acesso
- Página e API: time de Marketing (`/metas-fy27` e `/api/metas/*` em `routes/acesso.js`).
- Painel e APIs de tracking: `/admin/*` (super admin) **e** `requireOwner` (sessão SSO = `ruda.costa@epiuse.com.br`, override `ANALYTICS_OWNER_EMAIL`). Link no menu e chip na página só aparecem com `GET /api/analytics/owner` → `owner: true`.
