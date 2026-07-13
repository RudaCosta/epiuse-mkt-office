# Módulo 17 — Analytics de Uso

**Status:** ✅ construído (v0.75.4)
**Propósito:** medir quem acessou a plataforma, quanto tempo ficou e quais páginas visitou. Report exclusivo do dono.

## Arquivos-chave
- `routes/analytics.js` — tabela `analytics_events`, middleware `logPageView`, endpoint de beacon `POST /api/analytics/track`, API do report `GET /api/admin/analytics`, página `GET /admin/analytics`.
- `public/admin-analytics.html` — dashboard do report (design tokens + office-nav).
- `public/office-nav.js` — beacon de tempo ativo (`sendBeacon` no pagehide/ocultar) + link `📊 Analytics de Uso` no menu (só pro dono).
- `server.js` — monta `analyticsRouter.logPageView` (após session/enforce/hub-lock) e o router.

## Como funciona
- **Quem / que página / quando:** logado server-side pelo middleware `logPageView` em toda navegação de página (Accept: text/html; ignora assets/api/auth). Email vem da sessão SSO (`anon` se deslogado).
- **Quanto tempo:** o cliente (office-nav.js) acumula tempo *ativo* (desconta aba em background) e envia `dur_ms` via `sendBeacon` no `pagehide`/ocultar. Evento `kind='dur'`.
- **Report:** `/admin/analytics` — resumo (usuários únicos, sessões, visitas, tempo total, anônimas), visitas/dia, tabela de usuários (tempo, sessões, visitas, páginas, último acesso), páginas mais acessadas (visitas, usuários, tempo médio) e atividade recente.

## Acesso
Restrito a `ruda.costa@epiuse.com.br` (`requireOwner` — email da sessão SSO). Fallback por editor token (`?token=`/`X-Editor-Token`) para uso local/programático. Override do email: env `ANALYTICS_OWNER_EMAIL`.

## Persistência
SQLite no volume Railway (`/data`) — mesma tabela/mecanismo de cases/coins. Não zera a deploy.

## Decisões
- **Server-side para views + client-side para tempo:** garante cobertura de todas as páginas (mesmo sem JS) e mede tempo real de permanência (descontando background).
- **Sem terceiros (GA/etc.):** dado interno de time, fica no próprio banco, sob controle do dono. Sem cookies de tracking além da sessão SSO já existente.
- **`anon` agregado à parte:** acessos sem login entram no card "visitas anônimas" e não poluem a tabela por-usuário.
