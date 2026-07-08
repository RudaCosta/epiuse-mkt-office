# Segurança — EPI-USE Marketing Office

Este repositório é **privado** e contém código-fonte de uma aplicação interna
(Escritório Virtual de Marketing EPI-USE Brasil) com dados de CRM, pipeline
comercial, KPIs executivos e informações de colaboradores. Não é um projeto
open source — não deve ser tornado público.

## Reportar uma vulnerabilidade

Encontrou um problema de segurança (acesso indevido, dado exposto, segredo
vazado)? Avise diretamente o Rudá Costa (rudacosta@gmail.com). Não abra issue
pública nem comente em PR — segredos e detalhes de exploração não devem ficar
documentados em texto claro no repo.

## Variáveis de ambiente obrigatórias em produção (Railway)

A aplicação **falha fechado** quando estas variáveis não estão configuradas —
ou seja, sem elas o acesso é negado por padrão, não liberado. Configure todas
antes de qualquer deploy público:

| Variável | Para que serve |
|---|---|
| `EDITOR_TOKEN` | Autentica scripts server-to-server (sync Zoho, cases, calendário) contra rotas de escrita. Gere com `openssl rand -hex 32`. Nunca commitar o valor em código, docs ou scripts — sempre via env var local (`$env:EDITOR_TOKEN` no PowerShell, `.env` local no Node). |
| `SESSION_SECRET` | Assina o cookie de sessão. Gere com `openssl rand -hex 32`. |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | Credenciais do App Registration no Azure AD para o SSO Microsoft. Sem essas três, `requireAuth` bloqueia o acesso às páginas em produção (ver `server-context.js`). |
| `SSO_ALLOWED_DOMAINS` | Domínios de e-mail autorizados a logar (default: `epiuse.com.br`). |
| `SSO_ENFORCE` | Deixe **sem definir** (ou `true`) em produção. `SSO_ENFORCE=false` é um escape hatch emergencial que desliga a autenticação inteira — só usar sabendo exatamente o motivo, e reverter assim que possível. |

## Modelo de autenticação (camadas)

| Camada | Guard | Quem passa |
|---|---|---|
| Páginas HTML | `requireAuth` (`server-context.js`) | Sessão SSO em produção; dev local (`IS_LOCAL_DEV`) aberto. Fail-closed: sem SSO configurado em prod → 503, nunca aberto. |
| Leitura de APIs `/api/*` (gate global + JSONs estáticos de `public/api/`) | `requireApiAccess` (`server-context.js`) | Qualquer sessão SSO (inclusive role `hub` — Marketing Hub, game e brindes dependem dessas APIs) OU `X-Editor-Token` OU dev local. Allowlist sem auth: `/api/health`, `/api/version`, `/api/auth/status`, `/api/changelog.json`, `/api/ideias`. GET `/api/inbound/calendar` também aberto (sincronização pública de calendário). |
| Escrita sensível (voices, cases, content, metas, syncs) | `requireEditorToken` (`server-context.js`) | `X-Editor-Token` OU sessão SSO com role de time de MKT (qualquer role exceto `hub`). |
| Admin de usuários (`/admin/usuarios`, `/api/admin/users`) | `requireAdmin` (`routes/users.js`) | Role `head` OU `X-Editor-Token` puro. Roles de time NÃO herdam admin. |

Complementos: comparação de token constant-time (`crypto.timingSafeEqual`),
audit log de toda mutação em `/api/*` (`[audit]` nos logs do Railway, com
e-mail da sessão ou `editor-token`), security headers (nosniff,
X-Frame-Options, Referrer-Policy, HSTS em produção) e rate-limit nos
endpoints de geração/formulário públicos.

## Onboarding de co-desenvolvedores (ex.: Bruna)

Checklist pra alguém novo desenvolver o Office sem perder nenhum acesso:

1. **GitHub**: com o repo privado, o owner precisa convidar a conta
   (Settings → Collaborators). Sem convite, `git pull/push` param de
   funcionar no momento em que o repo ficar privado.
2. **Setup local**: clonar em `C:\epiuse-mkt-office\`, criar
   `C:/Users/<seu-usuario>/.epiuse-optimizer/` com `node_modules` (rodar
   `npm install` lá) e um `.env` (copiar de `.env.example`) contendo no
   mínimo `ANTHROPIC_API_KEY` e `EDITOR_TOKEN`. A detecção `IS_LOCAL_DEV`
   (`server-context.js`) resolve o username automaticamente — não precisa
   editar código.
3. **EDITOR_TOKEN**: pedir o valor atual ao Rudá **por canal seguro**
   (nunca por commit, issue, ou doc no repo). É necessário pros scripts de
   sync (`scripts/sync/*.js`, `scripts/lifecycle/*.ps1`) — todos falham
   com erro claro se a env var não estiver setada.
4. **Role no Office**: o primeiro login SSO cria o usuário com role `hub`
   (visitante). O Rudá (role `head`) promove em `/admin/usuarios` — ex.:
   Bruna → `intelligence`. Sem isso, as telas de escrita retornam 401.
5. **Dev local**: `node server.js` local fica aberto (sem SSO) — o gate de
   API não bloqueia em `IS_LOCAL_DEV`.

## Acesso de automações, IAs e MCPs

Qualquer script, agente de IA, skill do Claude ou integração que chame a
API do Office **em produção** deve enviar o header `X-Editor-Token` com o
valor da env var `EDITOR_TOKEN` (ou `?token=` na query). Contra
`localhost` em dev, nenhuma auth é exigida. Nunca colocar o valor literal
do token em código, docs, prompts de agente ou arquivos versionados — 
sempre referenciar `process.env.EDITOR_TOKEN` / `$env:EDITOR_TOKEN` /
`os.environ["EDITOR_TOKEN"]`.

Caso especial já resolvido no código: a geração de PPTX
(`/api/relatorio/download-pptx`) executa `scripts/relatorio/gerar_pptx.py`
que chama de volta a própria API — o server injeta o token no env do
processo filho automaticamente.

## Rotação de segredos

Se um segredo vazar (ex.: commitado por engano, exposto em log), rotacione
imediatamente no Railway e em qualquer script local que o referencie. Um
valor antigo, mesmo que tenha aparecido em um commit passado, deixa de dar
acesso a qualquer coisa assim que o valor ativo no Railway muda — não é
necessário reescrever o histórico do git para neutralizar o vazamento,
embora tornar o repositório privado reduza a superfície de descoberta.

### Segredos QUEIMADOS (vazaram no repo enquanto público — nunca reusar)

| Valor vazado | Onde era usado | Ação |
|---|---|---|
| `eubr-voices-edit-2026` | `EDITOR_TOKEN` | Rotacionar no Railway (`openssl rand -hex 32`) |
| `MKt123` (+ credencial `marketing@epiuse.com.br`) | Admin de brindes (client-side) | Removido do código; admin agora é sessão SSO de time |
| Senha `mktepiuse2026` | Gate legado do Marketing Hub (client-side) | Removida do `hub.html`; NÃO reusar nos portais externos (Estudos) |
| URL do webhook Power Automate de brindes (assinatura SAS na query) | Notificação do formulário de brindes | **Recriar o trigger no Power Automate** (a URL antiga permite disparar o fluxo) e colar a nova em `POWERAUTOMATE_BRINDES_WEBHOOK` no Railway |

## Limitações conhecidas / próximos passos

- O gate de leitura de `/api/*` aceita **qualquer** sessão SSO, inclusive
  role `hub` (colaborador comum) — necessário porque Hub/game/brindes
  consomem essas APIs. Consequência: um colaborador logado consegue ler
  APIs de dados internos (ex.: pipeline) por chamada direta. Próxima
  iteração: granularidade de leitura por role nas rotas mais sensíveis
  (`/api/zoho/pipeline`, `/api/executivo`, `/api/development-funds`).
- Os snapshots históricos em `public/_versoes-office/` contêm o gate de
  senha legado (agora atrás do SSO). São arquivos-museu imutáveis — não
  reintroduzir esse padrão em telas novas.
