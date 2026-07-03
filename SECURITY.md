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

## Modelo de autenticação

- **Páginas** (`requireAuth`, `server-context.js`): exige sessão SSO
  autenticada em produção. Em dev local (`IS_LOCAL_DEV`), fica aberto —
  não há Azure configurado na máquina do desenvolvedor.
- **APIs `/api/*`**: passam por um gate antes do `express.static`
  (`server.js`, perto da configuração de sessão) que exige sessão SSO **ou**
  `X-Editor-Token` válido — isso cobre tanto as rotas dinâmicas quanto os
  JSONs estáticos servidos de `public/api/*.json`. Allowlist mínima:
  `/api/health`, `/api/version`, `/api/auth/status` (necessários pro fluxo de
  login funcionar antes de haver sessão).
- **Rotas de escrita sensíveis** (`requireEditorToken`): aceitam sessão SSO
  autenticada OU `X-Editor-Token` — isso permite tanto uso via browser
  logado quanto scripts de automação server-to-server.

## Rotação de segredos

Se um segredo vazar (ex.: commitado por engano, exposto em log), rotacione
imediatamente no Railway e em qualquer script local que o referencie. Um
valor antigo, mesmo que tenha aparecido em um commit passado, deixa de dar
acesso a qualquer coisa assim que o valor ativo no Railway muda — não é
necessário reescrever o histórico do git para neutralizar o vazamento,
embora tornar o repositório privado reduza a superfície de descoberta.
