# Módulo 18 — UTM & Links Rastreados

**Status:** ✅ construído (v0.75.6)
**Propósito:** medir o que cada usuário compartilha PRA FORA da plataforma e creditar ERP Coins por clique real (não só intenção). Report exclusivo do dono.

## Por que link próprio (`/go/<token>`)
Não dá pra medir cliques num link cru do LinkedIn — o LinkedIn não reporta isso. Então o usuário compartilha um **link rastreado próprio**: `office.epiuse.com.br/go/<token>`. Quando alguém clica, o servidor loga o clique (atribuído a quem compartilhou), credita coins e faz 302 pro destino real já com os parâmetros UTM anexados (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content=<token>`).

## Arquivos-chave
- `routes/utm.js` — tabelas `utm_links` / `utm_clicks`; `POST /api/utm/link` (gera/reusa link do usuário); `GET /go/:token` (loga clique + coins + redirect); `GET /api/admin/utm` (report); `GET /admin/utm` (página).
- `public/admin-utm.html` — report (por usuário, por campanha, links mais clicados, cliques recentes).
- `public/campanhas.html` — share do LinkedIn gera link rastreado + gerador genérico "Gere o SEU link".
- `public/office-nav.js` — link "🔗 UTM & Links Rastreados" no menu (só dono).
- `server.js` — `/go/` exempto do enforcement/hub-lock; router montado.

## ERP Coins por clique
`utm_click` = **5 coins** (env `UTM_CLICK_COINS`) por **clicker único / link / dia** (anti-farm via `UNIQUE(email,evento,ref,dia)` do `erp_coins`, com `ref = token:hash-do-IP`). Esses coins entram no ledger e aparecem no detalhe por usuário do `/admin/analytics` (conquista "🔗 Clique em link compartilhado").

## v0.77.0 (15/jul) — bots, imutabilidade e report v2
- **Bots de preview não contam** (regra 7): UA de crawler (LinkedInBot, WhatsApp, facebookexternalhit, Telegram, Slack, curl…) recebe o 302 normal (precisa dele pro preview) mas o clique é logado com `bot=1` e **não credita coins nem entra nas contagens**. Card "🤖 Bots filtrados" no report. Histórico anterior à coluna fica `bot=0` (não reclassificável).
- **Link imutável**: o POST reusa o token só quando (email, campanha, origem, **destino**) batem todos; destino diferente → token novo (`reused:false`). Nunca sobrescreve o destino de link já compartilhado/impresso.
- **Slug legível** ("SAP NOW 2026" → `sap-now-2026`) · **utm_medium por canal** (linkedin/whatsapp→employee_advocacy · email→email · evento/impresso→offline · site→referral) · destino ≤500 chars e **anti-loop** (não pode apontar pro próprio Office) · redirect com `Cache-Control: no-store` · HEAD não conta clique.
- **Report v2** (`/admin/utm`): sparkline cliques/dia, QR + copiar por link, filtro rápido, coluna de bots, **export CSV** (`/api/admin/utm/export.csv`). Gerador com Enter, estado de loading, badge ♻️ reusado/✨ novo e preview do destino final com utm_*.

## Acesso
Report (`/admin/utm`) liberado pra **todo o time de Marketing** (`requireMkt` — roles head/intelligence/growth/field/pipeline/brand/conteudo; fallback editor token). O report mostra o autor e a **origem/canal** (utm_source) de cada link. A geração de link (`/api/utm/link`) exige apenas sessão logada — qualquer usuário gera o seu. `/go/<token>` é público (clicker externo não está logado). _(O `/admin/analytics` segue exclusivo do dono; só o UTM foi aberto pro time.)_

## Privacidade
Não guarda IP cru — só um hash (`sha256(ip+salt)`) pra dedupe. Guarda referer + user-agent do clique.

## Decisões
- **Clique real vira coin, não só a intenção de compartilhar** — mede impacto de fato (employee advocacy). A intenção (`share`) segue existindo em paralelo.
- **UTM anexado ao destino** pra que o analytics do destino (GA etc.) também veja a origem; o `/go` é o que nos dá a atribuição por usuário.
- Persiste no SQLite do volume Railway (`/data`).
