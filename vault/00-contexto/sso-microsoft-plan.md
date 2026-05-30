# Plano: Single Sign-On Microsoft (Entra ID) — EPI-USE Office

> Avaliação solicitada pelo Rudá em 25/mai/2026 na reunião do time. Resposta às perguntas: tem custo? vai demorar essa sprint?
>
> 📌 **Decisão tomada em 26/mai/2026 noite — Opção A:** qualquer email `@epiuse.com.br` pode logar no Office, sem grupos restritivos. Cases & CS fica aberto pra todo M365 EPI-USE. Sprint v0.5.0 vai sem implementar `Group.Read.All` nem middleware `requireGroup()` — só `requireAuth` plano. Se no futuro precisar segmentar, adicionamos grupos.

## TL;DR

- **Custo Microsoft:** $0 incremental (EPI-USE já tem M365 com Entra ID Free embutido)
- **Esforço dev:** ~11h dedicadas
- **Bloqueios externos:** depende de IT/Roberto registrar app no Azure AD (~1h deles)
- **Recomendação:** entrar como **sprint dedicada 0.4.1** depois das melhorias atuais (0.4.0). Antes disso, validar 3 perguntas com Roberto

## Por que SSO

Hoje o Office tem 0 autenticação. Todo mundo é "Visitante" com nome editável via `prompt()`. Isso:
- Bloqueia tracking de quem fez o quê (post tracker, edição de Voice, sync de CS)
- Impede personalização real (favoritos, mesa do user no game)
- Não é viável pra abrir além do time interno
- Cases & CS é informação confidencial — precisa de access control

SSO Microsoft resolve TODOS esses problemas + zero password fatigue + reusa o domain do time.

## Avaliação técnica detalhada

### Custo Microsoft

| Item | Custo |
|---|---|
| **Entra ID Free** (incluso no M365 Business que EPI-USE já tem) | **$0 incremental** |
| OAuth 2.0 / OpenID Connect | $0 (parte do Free) |
| Até 50.000 users com SSO básico | $0 |
| **Entra ID P1** (MFA condicional, group-based access, custom branding) | US$ 6/user/mês — **provavelmente desnecessário** pro MVP (10-20 users) |
| **Entra ID P2** (Identity Protection, PIM) | US$ 9/user/mês — overkill pra essa fase |

**Decisão:** Free é suficiente. Reavaliamos quando passar de 30 usuários ou precisar de access control granular.

### Esforço dev

| Tarefa | Horas |
|---|---|
| **Backend** — `passport-azure-ad` ou `@azure/msal-node`, rotas `/auth/login`, `/auth/callback`, `/auth/logout`, middleware `requireAuth` | 6h |
| **Frontend** — refatorar `<office-nav>` pra mostrar avatar real (Graph API) substituindo `prompt()` de nome, hookar logout | 3h |
| **Setup Azure** (do lado IT) — registrar app, gerar Client ID + Secret, configurar redirect URI Railway | 1h (IT) |
| **Mapeamento user → Voice** (por email) | 1h |
| **Doc operacional** | 0.5h |
| **Total** | ~11h dev + 1h IT |

**Cabe numa sprint dedicada** (não nas 0.4.0 atual que tem 8 itens já).

### Stack proposta

```
Cliente (browser)
   ↓ click "Login com Microsoft"
   ↓ redirect 302 → /auth/login
Server (Node.js)
   ↓ redirect 302 → login.microsoftonline.com/<tenant>/oauth2/v2.0/authorize
Microsoft Entra ID
   ↓ user faz login (SSO se já logado no M365)
   ↓ redirect 302 → https://epiuse-voices-optimizer.up.railway.app/auth/callback?code=...
Server
   ↓ troca code por access_token via POST oauth2/v2.0/token
   ↓ chama Graph API /me pra pegar nome, email, avatar URL
   ↓ cria session cookie httpOnly + secure
   ↓ middleware requireAuth protege rotas internas (Cases, Painel admin)
```

### Pacotes npm

- `@azure/msal-node` (oficial Microsoft) — recomendado
- `cookie-parser` ou `express-session` pra session management
- Reusa `dotenv` que já temos

### Variáveis de ambiente novas

```env
AZURE_TENANT_ID=<vem do IT>
AZURE_CLIENT_ID=<vem do IT depois de registrar app>
AZURE_CLIENT_SECRET=<vem do IT>
AZURE_REDIRECT_URI=https://epiuse-voices-optimizer.up.railway.app/auth/callback
SESSION_SECRET=<gerar string aleatória 64 chars>
```

## Perguntas pendentes pro Roberto

Antes de começar dev, validar:

1. **Quem da IT EPI-USE pode registrar o app no Azure AD?**
   - Precisa permissão de "App Registration" no tenant (role: `Application Administrator` ou `Global Administrator`)
   - Tempo: ~1h de trabalho técnico do IT
   - Output: Tenant ID + Client ID + Client Secret

2. **Domínio de email canônico?**
   - É `@epiuse.com.br` pra todos? Ou tem variações (`@epiuselabs.com`, `@groupelephant.com`)?
   - Define quem pode logar (whitelist por domain)

3. **Quem pode acessar o Office?**
   - **Opção A:** todo usuário M365 do tenant EPI-USE Brasil (~50 users)
   - **Opção B:** whitelist explícita (time RevOps/MKT + Voices ativos) — mais restritivo, recomendado pra Cases & CS
   - **Opção C:** todos M365 mas Cases & CS restrito a grupo específico

   Recomendo **Opção C** — pricing simples (Free), mas Cases & CS ganha access control via group claim.

---

## 📋 Checklist completo — o que pedir pro Admin Microsoft (IT EPI-USE)

> Mande este bloco inteiro pro admin Azure AD. É tudo que ele precisa fazer no portal `portal.azure.com` → Azure Active Directory.

### A. Criar App Registration

1. **Portal Azure** → `Azure Active Directory` → `App registrations` → `+ New registration`
2. **Name:** `EPI-USE Office (Voices + Marketing Hub)`
3. **Supported account types:** ✅ **Accounts in this organizational directory only (Single tenant)**
   - Não usar multi-tenant — só usuários EPI-USE devem logar
4. **Redirect URI:**
   - Tipo: **Web**
   - URLs (adicionar AMBAS):
     - `http://localhost:3000/auth/callback` (dev local)
     - `https://epiuse-voices-optimizer.up.railway.app/auth/callback` (prod Railway)
5. Click **Register**
6. **Anotar os 2 valores que aparecem na tela "Overview":**
   - `Application (client) ID` → vai virar `AZURE_CLIENT_ID`
   - `Directory (tenant) ID` → vai virar `AZURE_TENANT_ID`

### B. Gerar Client Secret

1. App registration recém-criado → menu lateral `Certificates & secrets`
2. Tab `Client secrets` → `+ New client secret`
3. **Description:** `EPI-USE Office prod secret 2026`
4. **Expires:** `24 months` (renovar antes de expirar — adicionar lembrete no calendário)
5. Click `Add`
6. **CRITICAL:** copiar IMEDIATAMENTE o `Value` (não o Secret ID) — só aparece UMA VEZ.
7. Esse valor vira `AZURE_CLIENT_SECRET` no `.env`

### C. Conceder permissões da Microsoft Graph API

App registration → menu lateral `API permissions` → `+ Add a permission` → `Microsoft Graph` → `Delegated permissions`:

| Permissão | Para que serve |
|---|---|
| `openid` | OpenID Connect — fluxo de autenticação básico |
| `profile` | Lê nome, foto, locale do usuário |
| `email` | Lê endereço de email |
| `User.Read` | Lê o perfil completo do usuário logado (`/me`) |
| `offline_access` | Permite renovar tokens sem nova login (refresh token) |
| `Group.Read.All` *(opcional)* | Lê grupos do usuário — só se for fazer access control por grupo (Cases & CS) |

Depois de adicionar, click **`Grant admin consent for EPI-USE Brasil`** (botão verde no topo) — isso evita que cada usuário veja tela de consentimento individual.

### D. Configurar Token Configuration

App registration → `Token configuration` → `+ Add optional claim`:

- **Token type:** `ID`
- ✅ marcar: `email`, `family_name`, `given_name`, `preferred_username`
- Click `Add`

Isso garante que o ID token volte com os campos que vamos usar no `<office-nav>` (nome real + avatar).

### E. Sign-in audience & user assignment

App registration → `Authentication`:

- ✅ Confirmar que **`Access tokens`** e **`ID tokens`** estão marcados (em "Implicit grant and hybrid flows")
- Em **`Advanced settings`**:
  - `Allow public client flows` → **No**
  - `Live SDK support` → **No**

App registration → `Overview` → click no link da `Managed application in local directory` (vai pra Enterprise Application):

- Menu `Properties`:
  - `User assignment required?` → **Yes** *(se quiser controlar quem pode logar — recomendado pra opção C)*
  - `Visible to users?` → **No** (não mostrar no portal de apps M365 dos users, é interno)
- Menu `Users and groups` → `+ Add user/group`:
  - **Opção A** (mais simples): assinar grupo `All EPI-USE Brasil` (se existir)
  - **Opção C** (recomendada): criar 3 grupos novos no Azure AD (passo F) e assinar aqui

### F. (Opcional — Opção C) Criar grupos de acesso

Azure AD → `Groups` → `+ New group`:

| Grupo | Tipo | Membros | Acesso |
|---|---|---|---|
| `EUBR-Office-Admins` | Security | Rudá, Roberto, Duda | Full access — incluindo Cases & CS, Painel admin |
| `EUBR-Office-Voices` | Security | Os 4-8 Voices ativos | Acesso ao próprio perfil + ferramentas Voices |
| `EUBR-Office-CS` | Security | Roberto + CS Managers | Cases & CS Hub |

Depois assinar os 3 grupos na Enterprise Application (passo E último item).

### G. Branding (opcional mas recomendado)

App registration → `Branding & properties`:

- **Logo:** subir o ícone do EPI-USE Office (512×512px, PNG transparente)
- **Home page URL:** `https://epiuse-voices-optimizer.up.railway.app`
- **Terms of service URL:** `https://epiuse-voices-optimizer.up.railway.app/legal/terms`
- **Privacy statement URL:** `https://epiuse-voices-optimizer.up.railway.app/legal/privacy`
- **Service management URL:** `https://epiuse-voices-optimizer.up.railway.app/admin`
- **Publisher domain:** `epiuse.com.br` (verificar via DNS TXT record — opcional)

Isso aparece bonito na tela de login Microsoft em vez de "Unverified app".

### H. (Opcional) Conditional Access

Só ativar depois que estiver tudo funcionando:

Azure AD → `Security` → `Conditional Access` → `+ New policy`:
- **Name:** `EPI-USE Office — MFA required outside trusted network`
- **Users:** Include `All users assigned to EPI-USE Office`
- **Cloud apps:** `EPI-USE Office`
- **Conditions** → `Locations` → Exclude `EPI-USE Brasil office (Salvador IP range)`
- **Grant:** Require MFA

### I. Output esperado (o que IT entrega de volta)

Depois de tudo, IT manda no chat/email:

```env
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
AZURE_CLIENT_SECRET=zzzzzzzzzz~zzzzzzzzzzzzzzzzzzzzzz   # só aparece uma vez!
```

+ confirmação de:
- ✅ Redirect URIs configurados (localhost + Railway)
- ✅ Admin consent dado pras 5-6 permissões Graph
- ✅ Grupos criados e usuários assinados (se Opção C)
- ✅ Branding subido (opcional)

Tempo total do lado IT: **~1h** (40min app reg + permissions + 20min grupos opcionais).

## Roadmap pós-aprovação

- **0.4.1 — sprint SSO dedicada:**
  - Dia 1-2: Backend (msal-node + middleware + session)
  - Dia 3: Frontend (avatar real no nav + logout)
  - Dia 4: Mapping user → Voice + access control granular pra Cases & CS
  - Dia 5: Doc operacional + testes + push

- **0.4.2 — group-based access:**
  - Define grupos no Azure AD: `EUBR.Marketing` (full access) · `EUBR.Voices` (acesso ao próprio perfil) · `EUBR.CS` (Cases & CS)
  - Implementar checks de grupo no middleware

## Sem SSO (gap atual e mitigação)

Enquanto não temos SSO:

- ✅ `EDITOR_TOKEN` no env protege endpoints PUT/POST sensíveis (já implementado)
- ✅ Rate limiters em todas as rotas Claude (anti-abuse)
- ⚠️ `prompt()` de nome no nav é cosmético — não tem garantia de identidade
- ⚠️ Cases & CS está aberto a quem souber a URL — mitigar com EDITOR_TOKEN no GET também?

## Decisão executiva pra Roberto

> Aprovar sprint 0.4.1 dedicada a SSO Microsoft após entrega da 0.4.0 (atual)?
> Custo: $0 Microsoft + 11h dev + 1h IT.
> Benefício: destrava tracking real, personalização, e access control pra Cases & CS confidencial.
