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

## Seed do time (server.js)
Semeado no boot via `INSERT OR IGNORE` (idempotente — não sobrescreve ajustes do admin). Emails inferidos do padrão `nome.sobrenome@epiuse.com.br`:

| email | role |
|---|---|
| ruda.costa@epiuse.com.br | head |
| bruna.yamagami@epiuse.com.br | intelligence |
| guilherme.marques@epiuse.com.br | growth |
| isabela.carvalho@epiuse.com.br | field |
| marlison.estrela@epiuse.com.br | pipeline |
| eduarda.hirose@epiuse.com.br | brand |

**Fora da seed (cadastrar no `/admin/usuarios`):** Roberto (sobrenome desconhecido → `country-manager`), Lisiane de Assis (parceira externa, talvez sem email @epiuse → `conteudo`), **Alexandre Ormigo** (papel desconhecido).

> Se algum email inferido estiver errado, a pessoa só cai em `hub` até o Rudá corrigir no admin — nada trava.

## Login visível
O botão **🔐 Entrar** aparece em destaque na barra do nav (`office-nav.js`) quando `/api/auth/status` retorna `enabled:true` e a pessoa não está logada. Quando o SSO está desligado (`enabled:false`, sem `AZURE_*`), nada muda — comportamento "Visitante", sem botão (evita um login que daria 503).

## Pendências humanas (Rudá / IT)
- Configurar redirect URIs + `Grant admin consent` no Azure (App registration) — ver `vault/00-contexto/pendencias.md` B1.
- Setar `AZURE_*`, `SESSION_SECRET`, `SSO_ALLOWED_DOMAINS`, `SSO_ENFORCE=true` nas env vars do Railway. **Sem isso o login fica escondido em prod (por design).**
- Confirmar/cadastrar emails reais + **Alexandre Ormigo** via `/admin/usuarios`.
