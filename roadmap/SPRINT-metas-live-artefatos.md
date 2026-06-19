# Sprint — Metas LIVE + Artefatos bonitos (pedido Rudá 18/jun/2026)

> Capturado antes de `/compact`. Executar em sessão limpa. NÃO subir sem "sobe" explícito (regra 3).

## Pedido do Rudá (verbatim)
1. Quero **todos os números das metas LIVE** (do LinkedIn, do RD e do Google Analytics).
2. **`/relatorio` e `/metas-fy26`** → gerar **artefato bonito** (pode ser snapshot pra ficar mais bonito).
   - `/relatorio`: **+1 tile** com resumo: **quais empresas estamos conversando**, **qtd e-mails enviados**, **respondidos**, **reuniões geradas**.
3. **Estas telas DEVEM ser LIVE (backend sync), tem número que não tá live:**
   - `/area/intelligence` · `/area/eventos` · `/area/pipeline` · `/area/brand` · `/` (home)

## Auditoria — números NÃO-live hoje (areas.json)
- **intelligence** (Bruna): Leads enriquecidos/mês · MQLs qualificados · Qualidade base CRM
- **growth** (Gui): Impressões/Alcance · Cliques · Engajamento · CAC pago
- **eventos** (Isabela): Eventos planejados · Executados · Leads capturados · Reuniões pós-evento · MDF aprovado
- **pipeline** (Marlison): Reuniões · Oportunidades · Vendas origem MKT
- **brand** (Duda): Posts/mês · Seguidores ganhos atribuídos · Cases publicáveis
- **conteudo** (Lisiane): Pautas · Artigos produzidos · Tráfego site

## Status REAL das fontes (honesto — regra 7)
| Fonte | Estado | Onde |
|---|---|---|
| **LinkedIn** | ja live-ish — seguidores 10.709 + posts/engajamento via `/api/linkedin/intelligence` (rotina diaria) | prod |
| **GA4** | REAL em prod (duracao sessao etc) — creds so no Railway (`GA4_PROPERTY_ID`); NAO refresca local | so prod |
| **RD Station** | parcial — `rd-snapshot.json` + `RD_REFRESH_TOKEN` so Railway; foi dropado p/ editorial mas snapshot existe | so prod |
| **Apollo** | live (sync diario) — contatos/contas/sequencias; e-mails enviados/respondidos/reunioes = Apollo analytics (a puxar) | prod |
| **Zoho** | pipeline R$ por solution (ja usado no /linkedin intelligence) | prod |

## Plano de execucao (sessao limpa)
**A. Tile novo no /relatorio** (empresas em conversa · e-mails enviados/respondidos · reunioes)
- Fonte: Apollo (sequencias/analytics) — `apollo_analytics_sync_report` + `apollo_emailer_campaigns_search` p/ enviados/respondidos; contas em sequencia ativa = "empresas conversando". Reunioes: checar se Apollo/Zoho tem. Se nao houver fonte real -> etiqueta `aguarda integracao`, NUNCA inventar.
- Endpoint novo `GET /api/relatorio/outreach` no server.js (real). Tile no relatorio.html.

**B. Areas null -> live** (preencher os gaps acima)
- Mapear cada gap -> endpoint existente: seguidores/posts (LinkedIn intel), trafego (GA4), reunioes/oportunidades (Zoho/Apollo). Onde nao houver fonte -> manter `null` com label de pendente (regra 7). NAO chumbar numero.
- Confirmar se `area.html` faz fetch dinamico ou le so o JSON estatico (provavelmente estatico -> criar `/api/area/:id/live` que mescla JSON + fontes vivas).

**C. Artefatos bonitos /metas-fy26 + /relatorio**
- Renderizar via `mcp__visualize__show_widget` (snapshot, etiqueta de data). Metas: 86 por responsavel + funil realizado/meta. Relatorio: KPIs + o tile de outreach.
- artefato = snapshot (congela). Pra "tudo LIVE" no APP, e o item B (backend), nao o artefato.

## Bloqueios / decisoes pendentes
- GA4/RD NAO rodam local (creds so Railway) -> testar "live" so em prod, ou copiar creds pro `.env` local.
- "Reunioes geradas" — confirmar fonte real (Apollo meetings? Zoho? calendario?). Se nao existir, vira pendente.
- LinkedIn/GA "metas live": seguidores ja live; trafego GA live em prod; RD editorial foi dropado — confirmar se RD volta pro escopo de metas.

## Regras a respeitar
- REAL DATA ONLY (regra 7): numero sem fonte = pendente etiquetado, nunca chumbado.
- Deploy so sob "sobe" explicito, por push (regra 3).
- Backup antes de sobrescrever (regra 8). Stack vanilla (sem framework).
