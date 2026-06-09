# 📌 Pendências do EPI-USE Office

> **Regra (estabelecida 26/mai/2026 noite):** Claude abre/relê este arquivo TODA conversa nova e lembra o Rudá das pendências até elas serem resolvidas.

---

## 🔴 BLOQUEADO POR TERCEIROS — Rudá precisa acompanhar

### B1. SSO Microsoft — ✅ CÓDIGO PRONTO (31/mai) · faltam passos humanos no Azure

- **Status:** as 3 credenciais chegaram (31/mai) e o SSO foi **implementado + verificado server-side** (Opção A) + **deployado em prod no v0.8.0**. Em prod está `enabled:false` (correto — faltam as env vars no Railway). Local: `enabled:true`. Falta só configurar o app no portal Azure + setar env vars no Railway + testar login real.
- **Implementado (local, commit `9f3a2c1`, ainda não em prod):**
  - `@azure/msal-node` ConfidentialClient + `express-session` (store SQLite off-repo)
  - rotas `/auth/login` · `/auth/callback` · `/auth/logout` · `/api/auth/status`
  - whitelist por domínio (`epiuse.com.br, epiuselabs.com, groupelephant.com`)
  - botão **🔐 Entrar** no nav (vira nome real + Logout após login)
  - `SSO_ENFORCE=false` (migração segura — login disponível mas não obrigatório)
  - credenciais SÓ no `.env` off-repo (`C:\Users\Ruds\.epiuse-optimizer\.env`), nunca no git
  - **Verificado:** `/auth/login` → 302 pro `login.microsoftonline.com` com client_id/tenant/scope/redirect corretos; `/api/auth/status` enabled=true; nav mostra "Entrar".
- **🙋 Passos HUMANOS que faltam (Rudá / IT no portal.azure.com → App registration `09d7c1f2…`):**
  1. **Authentication → Redirect URIs (Web)** — adicionar AMBAS se não estiverem: `http://localhost:3000/auth/callback` + `https://epiuse-voices-optimizer.up.railway.app/auth/callback`. *(Sem isso o login dá erro AADSTS50011.)*
  2. **API permissions** — confirmar Graph delegated `openid, profile, email, User.Read, offline_access` + clicar **Grant admin consent**.
  3. **Testar login real:** abrir o Office → clicar 🔐 Entrar → logar com conta `@epiuse.com.br` → deve voltar logado. (precisa do passo 1 feito)
  4. **Ao subir pro Railway:** setar nas env vars do Railway `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SESSION_SECRET`, `SSO_ALLOWED_DOMAINS` (não vão no git).
  5. **Quando confiar:** trocar `SSO_ENFORCE=true` pra exigir login em todo mundo.
- **⚠️ Segurança:** o client secret foi colado em `Desktop\sso claude.txt` + chat. Recomendo **rotacionar** (Azure → Certificates & secrets → novo secret) depois de validar, e apagar o txt. (Rudá disse antes que "não tem nada comprometido aqui" — fica o registro.)
- **Doc técnico:** `vault/00-contexto/sso-microsoft-plan.md`

### ✅ B2. Planilha Duda — Calendar editorial — RESOLVIDO (08/jun/2026)

- **Arquivo:** `CALENDÁRIO EDITORIAL EPI-USE (1).xlsx` — OneDrive Duda, sincronizado em `C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Inbound/Conteúdo/`
- **Script:** `scripts/sync/sync_calendario_duda.js` — parser de grid visual mensal → 18 itens Junho/2026 sincronizados
- **Endpoint:** `/api/inbound/calendar` — 18 itens no SQLite `editorial_calendar`
- **Como re-sync:** `node scripts/sync/sync_calendario_duda.js` (roda de qualquer lugar, resolve modules automaticamente)
- **Cópia vault:** `vault/00-contexto/conteudo/calendario-editorial-duda.xlsx`

---

## 🟡 DROPADO (decisão Rudá 26/mai)

### RD Station ~~sync editorial~~
- **Status:** ❌ DROPADO. Pivot definitivo pra planilha Duda (B2).
- **Por quê:** key atual é AppStore Publisher (não autoriza leitura de conta). Mesmo gerando Personal API Token no painel RD Marketing, não vale o esforço de manter 2 fontes.
- **Código que ficou:** endpoint `POST /api/inbound/sync-rd` permanece no `server.js` mas retorna 401 com mensagem clara. Não remove — vale como fallback futuro se o cenário mudar.
- **Botão "📤 Sync RD" no `/inbound/calendar`:** considerar remover/esconder na próxima sprint de UX cleanup.

---

## ⚠️ ACHADO 26/mai noite — SQLite no Railway NÃO persiste entre deploys

- **Sintoma:** após cada `git push`, Railway rebuilda o container e a tabela `cs_clientes` volta pro seed inicial de 3 mocks (perdem-se os 19 cases reais sincronizados)
- **Workaround atual:** depois de cada push, rodar manualmente:
  ```bash
  curl -X POST https://epiuse-voices-optimizer.up.railway.app/api/cases/sync \
    -H "X-Editor-Token: eubr-voices-edit-2026" \
    -H "Content-Type: application/json" \
    --data @C:/Users/Ruds/AppData/Local/Temp/cases-payload-prod.json
  ```
  *(precisa rodar o `sync_cases_roberto.py` antes pra gerar o payload atualizado)*
- **Fix definitivo (próxima sprint):** verificar se Railway tem volume montado em `/data` ou ajustar `DB_PATH` pra apontar pro volume persistente. Doc Railway: https://docs.railway.com/reference/volumes
- **Outras tabelas afetadas:** `editorial_calendar`, `posts`, `recruitment_applications`, `users` (futuro SSO) — TUDO reseta no deploy hoje

## 🟢 PENDENTE DE EXECUÇÃO (não-bloqueado, dá pra fazer quando quiser)

### P0. URGENTE — Volume persistente Railway pro SQLite — 🟡 CÓDIGO PRONTO (09/jun), falta config humana
- **Esforço:** 5min (só dashboard)
- **Bloqueia:** apresentação corporativa (cada deploy "limpa" os cases reais)
- **✅ Código pronto (v0.28.1):** `server.js` já lê `process.env.DATA_DIR` pro DB_PATH + boot log avisa (`⚠️ ATENÇÃO: DATA_DIR não setado`) se não estiver montado.
- **🙋 Passo HUMANO restante:** Railway dashboard → Service → Settings → Volumes → criar volume mount em `/data` → Variables → adicionar `DATA_DIR=/data` → redeploy. Depois rodar sync inicial 1x (cases + zoho + calendar). Confirmar no log do Railway: `✅ Persistência: usando volume DATA_DIR=/data`.

### ✅ P2. Cron diário Cases — RESOLVIDO (09/jun, v0.28.1)
- **Tarefa Windows:** `EPI-USE-Office-Cases-Sync` registrada (diário 07:00) → roda `run-cases-sync.ps1` → `sync_cases_roberto.js` (Node) → POST local + Railway.
- **Bugs corrigidos:** (1) `$root` hardcoded errado no .ps1 → agora dinâmico via `$PSScriptRoot`; (2) `sync_cases_roberto.js` não resolvia `xlsx` no Node v24 → localModules pattern; (3) faltava path `Ruds` com acento. **Testado end-to-end:** 19 cases → Railway OK.

### ✅ LinkedIn sync auto — RESOLVIDO (09/jun, v0.28.1)
- **Tarefa Windows:** `EPI-USE-Office-LinkedIn-Sync` (diário 08:30) → `run-linkedin-sync.ps1` → `sync_linkedin_historical.py` regenera `linkedin-historical.json` do XLS da Bruna (Desktop/ROADMAP/03 LinkedIn Boost) + reports PPTX.
- **Merge defensivo (Regra 7):** preserva entradas `manual (Rudá)` (ex: 10640 mai/26) + cumulativos (newsletter/total) dos reports. Não regride dado bom.
- **NÃO faz push** (Regra 3) — só regenera local. JSON é estático → Railway pega no próximo push autorizado. Localhost na hora.
- **Obs:** jun/2026 só entra quando a Bruna exportar o XLS novo (hoje vai até mai/26).

### Validação visual end-to-end Voice Index em prod
- **O que:** gerar 1 kit completo pra Anderson com 2-3 screenshots reais, validar que renderiza certo (Voice Index circular + 7 pilares + 5 destaques + banner)
- **Esforço:** 5min (Rudá no driver)
- **Por que:** confirmar que tudo de 0.4.1 funciona end-to-end com dado real

### Backlog F1-F10 (não urgente)
F1 multiplayer game · F2 editor token via cookie · F3 Plausible dashboard · F4 Apollo enrich · F5 Resend templates · F6 PWA · F7 onboarding tutorial · F8 Voice Index histórico · F9 duplicar Voice · F10 dark auto OS

---

## ✅ ENTREGUE — pra contexto histórico

- 26/mai noite: v0.4.6 LIVE em prod (Voice Index, 22 cases reais, Studio→Carrossel single, Decorator drag-drop, doc SSO completo)
- 26/mai noite: 22 cases reais sincronizados em prod
- 26/mai noite: header `/cases` com branding "EPI-USE Brasil"
- 26/mai noite: email pro IT enviado pelo Rudá
- 26/mai noite: v0.4.7 polish (header /cases) + v0.4.8 LIVE — **Painel de Metas LinkedIn em /metas** com tática do elefante, 6 áreas com meta editável, gráficos, 5 insights. Footer histórico corrigido (mostrava labels v3.x antigos, agora 0.4.x correto).
- **27/mai noite: v0.4.12 LOCAL** (não subiu) — Optimizer split 2 calls Sonnet (corrige timeout 174s) · ERP.ngo branding (tokens + logo + dashboard card) · Export PDF html2pdf
- **27/mai madrugada: v0.5.0 SPRINT MONSTRO LOCAL** (não subiu) — 5 telas novas: `/relatorio` (espelha PPT 7 seções + 10 slides PPT auto via skill `relatorio-mensal`), `/artigos` (693 do Manus filtráveis), `/jornadas` (matriz LOB×etapa com 7 gaps detectados), `/projecoes` (paid media 4 cenários com fórmula transparente), `/pipeline` (Apollo MVP). 6 endpoints novos. 2 JSONs gerados (artigos 816KB · linkedin-historical 77KB). Skill `relatorio-mensal` + script python-pptx funcional (gerou Mai/26.pptx 40KB validado). Atalho `iniciar-office.bat` criado.
- **27/mai madrugada: CLAUDE.md** ganhou Regra 5 (ler arquivos automático) + Regra 6 (etiquetar conteúdo inventado).

---

## ⏰ Quando atualizar este arquivo

- ✏️ Toda vez que destravar uma pendência → mover pra ✅
- ✏️ Toda vez que aparecer nova pendência externa → adicionar em 🔴
- ✏️ Início de cada sessão Claude: abrir este arquivo, listar pendências pro Rudá antes de qualquer outra ação
