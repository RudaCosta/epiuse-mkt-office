# Módulo 13 — SSO Microsoft + Roles por Perfil + Marketing Hub central

> **Propósito:** dar a cada pessoa que loga no Office uma visão por perfil (role) via SSO Microsoft. Quem é do núcleo de marketing (+ Roberto/exec) cai na sua visão própria; quem não é cai no **Marketing Hub** como tela central.

## Status
✅ Implementado e verificado local (v0.57.x). SSO em prod fica **aberto até as `AZURE_*` entrarem no Railway** (migração segura). Login obrigatório (`SSO_ENFORCE=true`) só "morde" quando o SSO está configurado.

## Como funciona

1. **Login** (`routes/auth.js` → `/auth/callback`): valida domínio → `upsertUser()` na tabela `users` → resolve `role → persona + landing` → grava em `req.session.user`.
2. **Landing por role** (`server.js` rota `/`): se `role === 'hub'` → redireciona pra `/hub` (Marketing Hub). Senão serve a home, personalizada pela persona.
3. **Persona da home** (`public/js/home.js` `getPersonaId`): usa a `persona` vinda de `/api/auth/status` (fonte = DB). Fallback: mapa `emails` de `personas.json` → `visitante`.
4. **Enforcement** (`server.js`): `app.use` global exige login nas **páginas** quando `SSO_ENFORCE=true` e SSO configurado. **Rotas `/api/*` não passam por aqui** — cada uma tem seu guard (`requireAuth` / `requireEditorToken` / `requireAdmin`), preservando fluxos server-to-server por token.
5. **Admin** (`/admin/usuarios`, `public/admin-usuarios.html` + `/api/admin/users`): Rudá (role `head`) cadastra/edita quem é o quê. Guard: sessão `head` **ou** `X-Editor-Token`.

## Mapa role → persona → landing

| role | persona | landing |
|---|---|---|
| `head` | ruda | / |
| `intelligence` | bruna | / |
| `growth` | gui | / |
| `field` | isabela | / |
| `pipeline` | marlison | / |
| `brand` | duda | / |
| `conteudo` | conteudo (Lisiane) | / |
| `country-manager` | roberto | / |
| `hub` (default) | visitante | **/hub** |

## Arquivos-chave
- `routes/users.js` — tabela de roles, helpers (`upsertUser`, `profileFor`, `requireRole`, `requireAdmin`) + CRUD admin.
- `routes/auth.js` — callback grava role/persona; `/api/auth/status` expõe `role` + `persona`.
- `server.js` — tabela `users` (schema + seed Rudá), enforcement global, landing `/`, `/hub` serve `public/hub.html`.
- `public/hub.html` — Marketing Hub portado do portal estático (gate de senha removido → SSO).
- `public/admin-usuarios.html` — tela de gestão de usuários/roles.
- `public/js/home.js` · `public/api/personas.json` · `public/office-nav.js` (link admin só pro head).

## Pendências humanas (Rudá / IT)
- Configurar redirect URIs + `Grant admin consent` no Azure (App registration) — ver `vault/00-contexto/pendencias.md` B1.
- Setar `AZURE_*`, `SESSION_SECRET`, `SSO_ALLOWED_DOMAINS`, `SSO_ENFORCE=true` nas env vars do Railway.
- Cadastrar emails reais do time + **email/role do Alexandre Ormigo** via `/admin/usuarios` (no código só o Rudá é seedado).
