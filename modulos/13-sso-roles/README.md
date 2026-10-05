# Módulo 13 — SSO Microsoft + Roles por Perfil + Marketing Hub central

> **Propósito:** dar a cada pessoa que loga no Office uma visão por perfil (role) via SSO Microsoft. Quem é do núcleo de marketing (+ Roberto/exec) cai na sua visão própria; quem não é cai no **Marketing Hub** como tela central.

## Status
✅ Implementado e verificado local (v0.57.x). SSO em prod fica **aberto até as `AZURE_*` entrarem no Railway** (migração segura). Login obrigatório (`SSO_ENFORCE=true`) só "morde" quando o SSO está configurado.

## Como funciona

1. **Login** (`routes/auth.js` → `/auth/callback`): valida domínio → `upsertUser()` na tabela `users` → resolve `role → persona + landing` → grava em `req.session.user`.
2. **Landing por role** (`server.js` rota `/`): se `role === 'hub'` → redireciona pra `/hub` (Marketing Hub). Senão serve a home, personalizada pela persona.
3. **Persona da home** (`public/js/home.js` `getPersonaId`): usa a `persona` vinda de `/api/auth/status` (fonte = DB). Fallback: mapa `emails` de `personas.json` → `visitante`.
4. **Permissões** (`routes/acesso.js`, v2 — 04/out/2026): UMA camada, montada antes de qualquer rota e do `express.static`, decide página, API e arquivo de `public/`. **Nega por padrão.** Detalhes na seção abaixo.
5. **Tela de Permissões** (`/admin/usuarios`): só o **super admin** (por e-mail, `SUPER_ADMIN_EMAILS`, padrão `ruda.costa@epiuse.com.br`). Papel `head` não basta e o editor token não serve.

## Permissões v2 — como funciona

- **Papel → áreas** (`ROLE_AREAS`): cada papel abre `logado` (Hub, Cafezinho, Loja…), `time` (ferramentas comuns do MKT) e a área do próprio time. Diretoria vê só a página dela; Voice vê só as pautas; Colaborador (`hub`) só o que é de colaborador.
- **Caminho → áreas** (`REGRAS`): lista ordenada, a primeira que casa decide. `/x`, `/x/*`, `:param`, `METODO /x`. `/pagina.html` cai na regra de `/pagina` (antes o `.html` direto furava o guard da rota limpa).
- **Super admin** passa em tudo. Só ele recebe o `personas.json` inteiro e vê o "Ver como".
- **Áreas extras por pessoa** (`users.areas_extra`): concedidas na tela de Permissões. `admin` nunca é concedível. Valem no próximo clique (re-hidratação por request), sem relogar.
- **Editor token**: credencial de máquina. Passa a camada só em `/api/*` e só pelo header `X-Editor-Token` (não pela URL); o guard da rota decide. Não gerencia usuários.
- **Menu e home** (`office-nav.js`, `js/home.js`) leem `/api/acesso/me` e escondem o que a pessoa não abre. O servidor barra do mesmo jeito — o front só limpa a tela.
- **Sem acesso**: API → 401/403 JSON; página → `/login` (anônimo), `/hub` (colaborador), landing do papel (na raiz) ou `private/sem-acesso.html`.

### ⚠️ Rota ou página nova = regra nova

Toda rota nova, página nova ou JSON novo em `public/api/` precisa de linha em `REGRAS`. Sem isso, só o super admin abre. Conferir com:

```
node scripts/tests/acesso-cobertura.js
```

Sai com erro listando o que está sem regra.

## Mapa role → persona → landing

| role | persona | landing |
|---|---|---|
| `head` | ruda | / |
| `intelligence` | bruna | / |
| `growth` | gui | / |
| `field` | field (área) | / |
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

## Dois games (não misturar)
- **`/game`** (`public/office.html`) — game do **time de marketing** (mundo com salas/mesas/NPCs do time). **Intacto.**
- **`/game-hub`** (`public/game-hub.html`) — game do **colaborador** (role `hub`): mesmo engine, mundo orientado ao Marketing Hub; estações = itens do hub (apresentação, template, eventos, cases, assinatura, Canva, logos, ERP.ngo). Sem NPCs/cartões do time.
- Roteamento: `/game` redireciona role `hub` → `/game-hub`. A porta "Game" do `/login` cai em `/game` e o redirect resolve por role após o login.

## Hard-lock do colaborador (role hub) — 30/jun
Decisão atualizada do Rudá: o colaborador (role `hub`) **só acessa o Marketing Hub** (`/hub`) e o game do colaborador (`/game-hub`). Qualquer outra página → redirect `/hub` (middleware em `server.js`). Time de MKT, `head` e `country-manager`/`diretoria` **não** são afetados. O `office-nav` esconde tabs/overflow/sino pro colaborador (`data-hublock`) e, sem as tabs, joga os controles (idiomas/tema/usuário) pra **direita** (`margin-left:auto`). O logo do nav é **sempre branco** (a barra é navy escuro em todos os temas).

## Aba Onboarding — só time de MKT (0.59.0)
A aba "🚀 Onboarding" do `/hub` só aparece pros roles do time de marketing (`head, intelligence, growth, field, pipeline, brand, conteudo`). Colaborador (`hub`) e `country-manager` não veem (script lê `/api/auth/status`).

## Brand Assets — página própria `/brand` (0.59.0)
Brand Assets saiu do `/hub` e virou `public/brand.html` (rota `/brand`, no `HUB_LOCK_PAGES`): paleta oficial (Navy/Red/Blue Light/Grey), tipografia (Maven Pro + Avenir) e logos. Linkada por **último** no Acesso Rápido do Hub. Os logos vivem em `public/js/logos-data.js` (fonte única, ~3.2MB base64) consumida por `/hub` e `/brand` — extração que reduziu `hub.html` de 3.3MB pra 75KB.

## Escolher visualização pós-login (0.59.0)
Coluna `default_view` (office|game) na tabela `users`. No 1º login (sem default e sem `returnTo` explícito), o callback manda pra `/escolher-visao` (`public/escolher-visao.html`): 2 cards Office/Game. A escolha grava via `POST /api/users/me/view` e vira o padrão (`landingForView(role, view)`). Logins seguintes vão direto pro landing preferido. Troca a qualquer momento pelo menu 👤 → "🔀 Trocar visualização".

## Login visível
O botão **🔐 Entrar** aparece em destaque na barra do nav (`office-nav.js`) quando `/api/auth/status` retorna `enabled:true` e a pessoa não está logada. Quando o SSO está desligado (`enabled:false`, sem `AZURE_*`), nada muda — comportamento "Visitante", sem botão (evita um login que daria 503).

## Pendências humanas (Rudá / IT)
- Configurar redirect URIs + `Grant admin consent` no Azure (App registration) — ver `vault/00-contexto/pendencias.md` B1.
- Setar `AZURE_*`, `SESSION_SECRET`, `SSO_ALLOWED_DOMAINS`, `SSO_ENFORCE=true` nas env vars do Railway. **Sem isso o login fica escondido em prod (por design).**
- Confirmar/cadastrar emails reais + **Alexandre Ormigo** via `/admin/usuarios`.
