# Módulo 17 — Analytics de Uso

**Status:** ✅ v0.99.0 · área única de tracking (14/out/2026)
**Propósito:** medir quem acessou a plataforma, quanto tempo ficou e quais páginas visitou. Report exclusivo do dono.

## Arquivos-chave
- `routes/analytics.js` — tabela `analytics_events`, middleware `logPageView`, endpoint de beacon `POST /api/analytics/track`, API do report `GET /api/admin/analytics`, página `GET /admin/analytics`.
- `private/admin-analytics.html` — dashboard do report (fora do `express.static`; só a rota com `requireOwner` serve).
- `private/analytics-tabs.js` — abas da área (uso, onboarding, áreas, Relatório, Metas, Hub, Cafezinho), servidas em `/admin/analytics-tabs.js` só pro dono.
- `public/office-nav.js` — beacon de tempo ativo (`sendBeacon` no pagehide/ocultar) + item `📊 Analytics` no menu (só pro e-mail do dono).
- `server.js` — monta `analyticsRouter.logPageView` (após session/enforce/hub-lock) e o router.

## Como funciona
- **Quem / que página / quando:** logado server-side pelo middleware `logPageView` em toda navegação de página (Accept: text/html; ignora assets/api/auth). Email vem da sessão SSO (`anon` se deslogado).
- **Quanto tempo:** o cliente (office-nav.js) acumula tempo *ativo* (desconta aba em background) e envia `dur_ms` via `sendBeacon` no `pagehide`/ocultar. Evento `kind='dur'`.
- **Report:** `/admin/analytics` — resumo (usuários únicos, sessões, visitas, tempo total, anônimas), visitas/dia, tabela de usuários (tempo, sessões, visitas, páginas, último acesso), páginas mais acessadas (visitas, usuários, tempo médio) e atividade recente.

## Onboarding (Módulo 26, 03/out/2026)
- O mesmo beacon recebe `{kind:'onb', step}` → `analytics_events` com `kind='onb'`, `path='/onboarding'` e o passo na coluna `meta` (adicionada via `ALTER TABLE`, sem perder dados).
- `GET /api/admin/analytics` devolve `onboarding` (resumo por pessoa, lifetime) e a ficha (`/user`) devolve `onboarding` (passo a passo). Painel: seção "🎓 Onboarding — quem fez o quê".
- Eventos `onb` não entram nas contagens de visitas/sessões (que filtram `view`/`login`).

## Área Intelligence (Módulo 27, 03/out/2026)
- O mesmo beacon recebe `{kind:'intel', steps:[...]}` (lote até 40) → `analytics_events` com `kind='intel'`, `path='/area/intelligence'`, passo em `meta` e, nos passos `tempo.<seção>.<seg>`, o tempo em `dur_ms`.
- `GET /api/analytics/owner` → `{owner}` (o office-nav usa para mostrar o item Analytics no menu). `GET /api/admin/analytics/intel?days=&eu=` e `/intel/user?email=` (owner). Painel: `/admin/intelligence` (HTML em `private/`).
- Eventos `intel` não entram nas contagens de visitas/sessões do report geral.

## Área única de tracking (v0.99.0, 14/out/2026)
Pedido Rudá: "os menus e botões de tracking têm que ser uma área só, pode colocar tudo em analytics, mas só eu tenho acesso, e os menus e menções não devem mostrar isso pra ninguém".
- **Menu:** um item só, `📊 Analytics`, condicionado a `this._owner` (e-mail do dono). Antes eram 8 itens, 4 deles visíveis a qualquer super admin.
- **Abas:** `/admin/analytics` (uso + `#onboarding`), `/admin/intelligence|eventos|pipeline|brand|relatorio|metas|hub` e `/cafezinho/tracking` carregam `/admin/analytics-tabs.js`.
- **Sem chips nas páginas:** saíram os "👁️ Quem viu" das áreas, Relatório, Metas, Hub e Cafezinho; a API do Cafezinho não manda mais `painel` nem `me.owner`.
- **Changelog:** `/api/changelog.json` inteiro só pro dono (e máquina/local). O time recebe `changelogSemTracking()` (`routes/acesso.js`): release `so_dono` vira "Ajustes internos", e frases/destaques sobre tracking somem.
- **Teste:** `node scripts/tests/tracking-dono.js`.

## Acesso
Restrito a `ruda.costa@epiuse.com.br` (`requireOwner` — email da sessão SSO). Fallback por editor token (`?token=`/`X-Editor-Token`) para uso local/programático. Override do email: env `ANALYTICS_OWNER_EMAIL`.

## Persistência
SQLite no volume Railway (`/data`) — mesma tabela/mecanismo de cases/coins. Não zera a deploy.

## Decisões
- **Server-side para views + client-side para tempo:** garante cobertura de todas as páginas (mesmo sem JS) e mede tempo real de permanência (descontando background).
- **Sem terceiros (GA/etc.):** dado interno de time, fica no próprio banco, sob controle do dono. Sem cookies de tracking além da sessão SSO já existente.
- **Área única, só o dono (14/out/2026):** tracking não aparece em menu, botão, página pública nem nota de versão de mais ninguém. Super admin não basta: o portão é o e-mail do dono (`ANALYTICS_OWNER_EMAIL`).
- **`anon` agregado à parte:** acessos sem login entram no card "visitas anônimas" e não poluem a tabela por-usuário.
