**Para:** ti.brasil@epiuse.com.br *(ajuste para o admin Azure AD certo)*
**Cc:** roberto.medeiros@epiuse.com.br
**Assunto:** SSO Microsoft no EPI-USE Office — pedido de ~1h pra registrar app no Azure AD

---

Oi [nome do admin],

Estamos implantando Single Sign-On Microsoft no **EPI-USE Office** — plataforma interna de Marketing/RevOps que já está rodando em produção em `https://epiuse-voices-optimizer.up.railway.app` (programa Voices, Inbound Engine, Cases Hub, Profile Optimizer).

Hoje o login é apenas cosmético (campo de nome via prompt JS). Pra destravar tracking real, personalização e access control granular pra dados sensíveis (Cases & CS, propostas), precisamos plugar com nosso Entra ID.

**TL;DR:**
- **$0 incremental** — Entra ID Free já vem incluso no M365 Business que temos
- **~1h do seu tempo** pra registrar app + gerar secret + dar admin consent nas permissões
- Tudo dentro do nosso tenant `epiuse.com.br`, sem expor pra fora
- 15h de dev do meu lado depois que você me entregar os 3 valores

---

## O que preciso que você faça

### 1️⃣ Registrar app no Azure AD

- Portal Azure → **Azure Active Directory** → **App registrations** → **+ New registration**
- **Name:** `EPI-USE Office (Voices + Marketing Hub)`
- **Supported account types:** ✅ **Accounts in this organizational directory only (Single tenant)**
- **Redirect URIs** (tipo **Web**), adicionar **AMBAS**:
  - `http://localhost:3000/auth/callback` *(dev)*
  - `https://epiuse-voices-optimizer.up.railway.app/auth/callback` *(prod Railway)*
- Click **Register**
- Anota os 2 valores que aparecem na tela "Overview":
  - **Application (client) ID** → vai virar `AZURE_CLIENT_ID`
  - **Directory (tenant) ID** → vai virar `AZURE_TENANT_ID`

### 2️⃣ Gerar Client Secret

- App registration recém-criado → menu lateral **Certificates & secrets**
- Tab **Client secrets** → **+ New client secret**
- **Description:** `EPI-USE Office prod secret 2026`
- **Expires:** 24 months (renovamos antes de expirar)
- Click **Add**
- ⚠️ **COPIA IMEDIATAMENTE o `Value`** (não o Secret ID) — só aparece **uma vez**, depois não dá mais pra recuperar
- Esse valor vira `AZURE_CLIENT_SECRET`

### 3️⃣ Conceder permissões Microsoft Graph

- Menu **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
- Marca as 5 permissões mínimas:
  - `openid`
  - `profile`
  - `email`
  - `User.Read`
  - `offline_access`
- *(Opcional)* `Group.Read.All` — só se forem criar grupos no passo 6 pra access control granular
- Depois de adicionar, click **"Grant admin consent for EPI-USE Brasil"** (botão verde no topo) — ⭐ **isso é importante**, evita que cada usuário veja tela de consentimento individual no primeiro login

### 4️⃣ Token configuration

- Menu **Token configuration** → **+ Add optional claim**
- **Token type:** `ID`
- Marca: `email`, `family_name`, `given_name`, `preferred_username`
- Click **Add**

### 5️⃣ Sign-in settings

- Menu **Authentication**:
  - Confirma que **`Access tokens`** e **`ID tokens`** estão marcados (em "Implicit grant and hybrid flows")
  - **Allow public client flows:** **No**

### 6️⃣ *(Opcional, recomendado)* Criar 3 grupos de segurança

Pra controlar quem acessa o que. Azure AD → **Groups** → **+ New group** (tipo Security):

| Grupo | Membros sugeridos | O que vai acessar no Office |
|---|---|---|
| `EUBR-Office-Admins` | Rudá Costa, Roberto Medeiros, Duda | Tudo, inclusive Cases & CS, painéis admin |
| `EUBR-Office-Voices` | Os 4-8 Voices ativos do programa | Próprio perfil + ferramentas de conteúdo |
| `EUBR-Office-CS` | Roberto + CS Managers | Cases & CS Hub (dados sensíveis de cliente) |

Lista de Voices ativos pra povoar o grupo eu te mando depois.

### 7️⃣ *(Opcional)* Branding

App registration → **Branding & properties**:

- **Logo:** logo EPI-USE Brasil 512×512 PNG transparente
- **Home page URL:** `https://epiuse-voices-optimizer.up.railway.app`
- **Privacy statement URL:** *(ainda criando, posso te passar depois)*
- **Terms of service URL:** *(idem)*

Isso deixa a tela de login Microsoft com nosso logo, em vez de aparecer como "Unverified app".

---

## O que preciso receber de volta

Quando terminar, me manda esses 3 valores (de preferência por canal seguro tipo Teams DM, **não por email**):

```
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
AZURE_CLIENT_SECRET=zzzzzzzzzz~zzzzzzzzzzzzzzzzzzzzzz
```

+ confirmação de que:
- ✅ As 5 permissões foram concedidas com **Admin Consent**
- ✅ Os 2 Redirect URIs estão configurados (localhost + Railway)
- ✅ *(se Opção C)* Os 3 grupos foram criados e os usuários assinados

---

## O que faço depois que você entregar

1. Adiciono os 3 valores no Railway Variables + meu `.env` local
2. Implemento `@azure/msal-node` + middleware de auth (~15h spread em 5 dias úteis)
3. Refatoro o `<office-nav>` pra mostrar avatar real e dropdown user vindo do Microsoft Graph
4. Aplico `requireAuth` nas rotas sensíveis (`/cases`, `PUT /api/voices`, `/api/inbound/*`)
5. Testes end-to-end + handoff operacional com doc

---

## Referência

- **Microsoft Docs sobre OAuth 2.0 no Entra ID:** https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- **MSAL Node SDK (o que vou usar):** https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Doc técnico completo do nosso lado** *(se quiser revisar a arquitetura):* `vault/00-contexto/sso-microsoft-plan.md` no repo

---

Qualquer dúvida no setup, me chama no Teams ou marca 15min essa semana. Quanto mais cedo melhor — o Cases Hub tá esperando essa proteção pra eu liberar os dados reais de cliente pro time.

Valeu!
**Rudá Costa**
Head RevOps & Marketing — EPI-USE Brasil
