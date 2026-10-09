# 🤝 Handoff de Setup — GitHub + EPI-USE Office + Claude Code

> **Para:** Guilherme Marques (Gui) — Growth Hacking & Performance
> **De:** Rudá Costa · **Data:** 27/jul/2026
> **Tempo estimado:** ~40 min (a maior parte é download/instalação)
> **Resultado no final:** Office rodando em `http://localhost:3000` na sua máquina + Claude Code conectado ao repo, com os agentes e comandos do escritório já funcionando.

---

## 📋 TL;DR — o que você precisa fazer

| # | Passo | Tempo |
|---|---|---|
| 1 | Instalar Git, Node.js 20 LTS, Python 3.12 | 15 min |
| 2 | Ganhar acesso ao repo no GitHub + autenticar o git | 5 min |
| 3 | Clonar o repo em `C:\epiuse-mkt-office` | 2 min |
| 4 | Pedir o `.env` pro Rudá e colar na raiz do repo | 2 min |
| 5 | `npm install` + `node server.js` → abrir localhost:3000 | 5 min |
| 6 | Instalar o Claude Code, logar e abrir na pasta do repo | 10 min |

**Ordem importa.** Não pule o passo 2 — sem acesso ao GitHub nada mais funciona.

---

## 1. Instalar os pré-requisitos

Instale **os três**, nesta ordem, tudo com as opções padrão do instalador.

| Ferramenta | Onde baixar | Versão |
|---|---|---|
| **Git for Windows** | https://git-scm.com/download/win | qualquer atual |
| **Node.js** | https://nodejs.org/ | **20 LTS** (ou 22) — ⚠️ evite a 24, ver nota abaixo |
| **Python** | https://python.org/downloads/ | 3.10+ (marque **"Add Python to PATH"** no instalador) |

**Validar** — abra o **PowerShell** (menu iniciar → "PowerShell") e rode:

```powershell
git --version
node -v
python --version
```

Os três precisam responder com um número de versão. Se algum der "não é reconhecido como comando", feche e reabra o PowerShell (o PATH só atualiza em janela nova). Se ainda assim falhar, reinstale marcando a opção de adicionar ao PATH.

> ⚠️ **Nota sobre o Node 24:** o projeto usa `better-sqlite3`, que é um módulo nativo compilado. A versão fixada no `package.json` não compila no Node 24 (incompatibilidade de ABI) e o servidor morre no boot. Na dúvida, **use o Node 20 LTS**. Se você já tem o 24 instalado e não quer trocar, rode `npm install better-sqlite3@latest` dentro da pasta do repo depois do passo 5.

---

## 2. GitHub — acesso e autenticação

### 2.1 Ganhar acesso (o Rudá faz)

O repo é **privado**: `https://github.com/RudaCosta/epiuse-mkt-office`

1. Você manda seu **usuário do GitHub** pro Rudá (se não tiver conta, cria em github.com — use o e-mail corporativo).
2. Rudá adiciona você em **Settings → Collaborators → Add people**.
3. Você recebe um convite por e-mail → **Accept invitation**. Sem aceitar, o clone dá 404.

### 2.2 Autenticar o git na sua máquina

O Git for Windows já vem com o **Credential Manager**, então não precisa configurar token na mão. Só configure sua identidade:

```powershell
git config --global user.name "Guilherme Marques"
git config --global user.email "guilherme.marques@epiuse.com.br"
```

Na **primeira vez** que você rodar um `git clone` ou `git push`, vai abrir uma janela do navegador pedindo login no GitHub. Loga, autoriza, e ele guarda a credencial pra sempre. É isso — não precisa de SSH nem de Personal Access Token.

---

## 3. Clonar o repo

**Local obrigatório: `C:\epiuse-mkt-office`.**

> ⛔ **Não clone dentro do Google Drive, OneDrive ou Dropbox.** O sync dessas pastas corrompe os arquivos do git e quebra o `node_modules`. Isso já causou um caos de versionamento no passado (regra 12 do `CLAUDE.md`). Disco local, e ponto.

```powershell
cd C:\
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd C:\epiuse-mkt-office
```

Conferir que veio tudo:

```powershell
dir
```

Você deve ver `server.js`, `package.json`, `CLAUDE.md`, e as pastas `public/`, `vault/`, `scripts/`, `.claude/`.

---

## 4. Configurar o `.env` (as chaves de API)

O arquivo `.env` **nunca vai pro git** — ele tem as chaves de API. Você precisa pedir pro Rudá.

1. Peça pro Rudá o `.env` (ele manda por canal seguro — **não por e-mail nem WhatsApp**).
2. Salve o arquivo como `C:\epiuse-mkt-office\.env` (com o ponto na frente, sem `.txt` no final).

Se quiser começar sem esperar, dá pra subir o Office com um `.env` parcial — só perde as features que dependem de cada chave:

```powershell
copy .env.example .env
```

| Variável | Sem ela, o que quebra |
|---|---|
| `ANTHROPIC_API_KEY` | Profile Optimizer e Cowork não geram nada |
| `APOLLO_API_KEY` | Pipeline Apollo não sincroniza |
| `RESEND_API_KEY` | Formulários não disparam e-mail (resto funciona) |
| `EDITOR_TOKEN` | Endpoints de edição retornam 401 |
| `SESSION_SECRET` | Sessão/SSO não funciona |
| `PORT` | Nada — o padrão é 3000 |

O resto das telas (áreas, relatório, artigos, metas, design system) sobe normalmente sem chave nenhuma.

> 🔒 **Nunca** commite o `.env`. Ele já está no `.gitignore`, mas não force. E não cole chave em chat, em issue do GitHub ou em prompt do Claude.

---

## 5. Subir o Office

```powershell
cd C:\epiuse-mkt-office
npm install
node server.js
```

O `npm install` demora uns 2-3 min na primeira vez. Depois disso, abra no navegador:

**http://localhost:3000**

Para testar se o backend está de pé:
- http://localhost:3000/api/health → deve responder OK
- http://localhost:3000/api/version → mostra versão e caminho do banco

**Pra parar o servidor:** `Ctrl+C` na janela do PowerShell.

### ⚠️ O que vai estar vazio na sua máquina (e por quê)

O banco SQLite (`data/db.sqlite`) é **local e não vai no git**. Então, na sua máquina, as telas que leem do banco começam **zeradas**:

- `/cases` · `/clientes-sap-4me` · o calendário da home · `/content-pipeline`

Isso é esperado, não é bug. As telas que leem de arquivos JSON versionados (`/area`, `/relatorio`, `/artigos`, `/metas`, `/design`, `/projecoes`) funcionam de cara.

**Como resolver:** para ver esses dados, use a **produção (Railway)** — peça a URL pro Rudá. Se você realmente precisar deles localmente, o Rudá roda o script de sync pra popular seu banco. Não tente sincronizar sozinho: os scripts de sync apontam pras planilhas-fonte que estão na máquina dele.

### Auto-start no login (opcional, recomendado se você for usar todo dia)

Registra uma Tarefa Agendada do Windows que sobe o Office quando você loga e reinicia ele a cada 5 min se cair. **Não precisa de admin.**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\lifecycle\install-task.ps1
```

Controle manual depois disso:

```powershell
scripts\lifecycle\start-office.ps1   # subir
scripts\lifecycle\stop-office.ps1    # parar
```

Logs em `logs\office.log` e `logs\office.err.log`.

---

## 6. Claude Code

### 6.1 Instalar

```powershell
npm install -g @anthropic-ai/claude-code
```

Validar:

```powershell
claude --version
```

### 6.2 Logar

```powershell
cd C:\epiuse-mkt-office
claude
```

Na primeira execução ele pede autenticação. **Peça pro Rudá te adicionar na organização Anthropic do time** — aí você loga com sua conta e usa o plano da empresa, sem precisar de API key própria nem cartão.

Dentro do Claude Code, o comando `/login` refaz o login a qualquer momento.

### 6.3 Abrir sempre na pasta certa

> 🔴 **Isto é o mais importante desta seção.** O Claude Code carrega a configuração do escritório a partir do diretório em que você o abre. Se você rodar `claude` de qualquer outra pasta, **nada** do que está abaixo existe — nem os agentes, nem os comandos, nem o contexto da EPI-USE.

**Sempre:**

```powershell
cd C:\epiuse-mkt-office
claude
```

### 6.4 O que já vem pronto no repo (você não precisa configurar nada)

Tudo isto está versionado e passa a funcionar assim que você abre o Claude Code na pasta:

| O quê | Onde | O que faz |
|---|---|---|
| **`CLAUDE.md`** | raiz | Carrega automaticamente. Contém as regras de ouro, estrutura e contexto do escritório. |
| **22 sub-agentes** | `.claude/agents/` | Incluindo o **`area-growth`** — o agente da sua área. |
| **7 slash commands** | `.claude/commands/` | `/onboard`, `/criativos`, `/lp`, `/campanha`, `/proposta`, `/nova-oferta`, `/contratar` |
| **Skills** | `.claude/skills/` | `relatorio-mensal`, `ui-ux-pro-max` |
| **Vault de contexto** | `vault/00-contexto/` | empresa, projetos, branding, pessoas, pendências, design system |

**Primeiro comando a rodar** (depois de logar):

```
/onboard
```

Ele te dá o tour do escritório e do estado atual dos projetos.

### 6.5 O agente da sua área

O `area-growth` é o agente que carrega o contexto de **Growth Hacking & Performance** — mídia paga, SEO/pautas B2B, LinkedIn growth, briefing de agência, otimização de funil. Ele lê `public/api/areas.json` (nó `growth`) e escreve em `vault/workspaces/area-growth/`.

Pra acionar, basta pedir em linguagem natural, tipo:

```
Usa o agente area-growth pra revisar os KPIs do funil de growth e me dizer
o que está fora da meta.
```

Ele delega execução pros transversais quando precisa (`campanhas` pra Meta/LinkedIn Ads, `criativos` pras peças, `area-conteudo` pras pautas SEO).

### 6.6 MCPs (integrações externas) — opcional

Os MCPs (Apollo, Canva, Google Drive, GitHub, Zoho CRM) são configurados **por usuário**, não vêm no repo. Você não precisa deles pra trabalhar no Office. Se quiser, os mais úteis pra Growth:

- **Apollo** — prospecção e enriquecimento
- **Google Drive** — ler planilhas e PDFs de fonte
- **Canva** — templates rápidos

Peça o passo a passo pro Rudá quando chegar a hora — não é pré-requisito pro setup.

---

## 7. Regras que você **não** pode quebrar

Estas estão no `CLAUDE.md` e valem pra você e pro Claude:

1. 🔴 **Nunca dê push direto na `master`.** Trabalhe sempre em branch (ver seção 8). O push pra `master` dispara deploy automático no Railway — ou seja, vai pro ar.
2. 🔴 **Deploy é decisão do Rudá.** Só ele autoriza subir pra produção, e a autorização vale por push individual.
3. 🔴 **Dado REAL apenas.** Nenhum número inventado em dashboard, KPI ou card. Se a integração ainda não existe, a etiqueta é `⏳ Aguarda integração [fonte]` — nunca um número de mentira fazendo as vezes de real.
4. 🔴 **Aprovação da Duda** antes de qualquer publicação externa (LinkedIn, blog, ads).
5. **Sem frameworks pesados.** Frontend é vanilla HTML/CSS/JS. Sem React, Vue ou Angular.
6. **Sem hex hardcoded no CSS.** Sempre `var(--color-*)` do `public/design-tokens.css`. O design system vive em `vault/00-contexto/DESIGN.md`.
7. **Nunca commite `.env`, chave de API ou token.**

---

## 8. Fluxo de trabalho no dia a dia

```powershell
# 1. Antes de começar, sempre puxe a master
cd C:\epiuse-mkt-office
git checkout master
git pull origin master

# 2. Crie uma branch pro que você vai fazer
git checkout -b gui/nome-da-tarefa

# 3. Trabalhe (você ou o Claude Code)

# 4. Commite
git add .
git commit -m "growth: descrição curta do que mudou"

# 5. Suba a SUA branch (nunca a master)
git push -u origin gui/nome-da-tarefa

# 6. Abra um Pull Request no GitHub e chame o Rudá pra revisar
```

O Rudá revisa e faz o merge. **O merge na `master` é que sobe pra produção** — por isso o passo 6 não é burocracia.

---

## 9. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `git clone` dá 404 | Convite de colaborador não aceito | Checar o e-mail do GitHub e aceitar o convite |
| `node` / `python` "não reconhecido" | PATH não atualizado | Fechar e reabrir o PowerShell; se persistir, reinstalar marcando "Add to PATH" |
| Servidor morre no boot com erro de `better-sqlite3` | Node 24 (ABI incompatível) | `npm install better-sqlite3@latest` — ou instalar o Node 20 LTS |
| `EADDRINUSE :3000` | Já tem um Office rodando | `scripts\lifecycle\stop-office.ps1`, ou usar outra porta: `$env:PORT=3001; node server.js` |
| Página abre mas dashboards vazios | Banco SQLite local zerado | Esperado — ver seção 5. Usar a produção ou pedir sync pro Rudá |
| Claude Code não conhece os agentes | Aberto na pasta errada | `cd C:\epiuse-mkt-office` e rodar `claude` de novo |
| `.ps1` não executa | Execution Policy do Windows | Rodar com `powershell -ExecutionPolicy Bypass -File <script>` |
| Erro de chave de API em alguma feature | `.env` incompleto | Conferir a variável na tabela da seção 4 e pedir pro Rudá |

---

## 10. Checklist final

Marque conforme for:

- [ ] Git, Node 20 LTS e Python instalados e respondendo `--version`
- [ ] Convite do GitHub aceito
- [ ] `git config --global user.name` e `user.email` configurados
- [ ] Repo clonado em `C:\epiuse-mkt-office` (fora de Drive/OneDrive)
- [ ] `.env` recebido do Rudá e salvo na raiz do repo
- [ ] `npm install` rodou sem erro
- [ ] `http://localhost:3000` abre e `/api/health` responde
- [ ] (opcional) Tarefa Agendada de auto-start instalada
- [ ] Claude Code instalado e logado
- [ ] `claude` aberto em `C:\epiuse-mkt-office` e `/onboard` rodado
- [ ] Consegue acionar o agente `area-growth`
- [ ] Leu a seção 7 (regras) e a 8 (fluxo de branch)

---

## 11. Leitura recomendada (nesta ordem, ~30 min)

1. `README.md` — visão geral da plataforma e mapa de rotas
2. `CLAUDE.md` — regras de ouro e estrutura do escritório virtual
3. `docs/ONBOARDING.md` — onboarding do time
4. `docs/CONTRIBUTING.md` — padrões de código e commit
5. `vault/00-contexto/pendencias.md` — o que está travado hoje
6. `.claude/agents/area-growth.md` — escopo do seu agente

---

## 12. Travou?

Chama o **Rudá**. Manda a mensagem de erro **inteira** (copia e cola o texto do PowerShell, não printa a tela) e diz em qual passo deste doc você parou.

---

*Handoff gerado em 27/jul/2026 · EPI-USE Office v0.82.0*
