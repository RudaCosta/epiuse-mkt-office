# 📦 EPI-USE Office — Documentação Completa (Handoff)

> Arquivo único de passagem do projeto. Gerado em 2026-06-17.
> Contém: Handoff · README · Onboarding · Arquitetura · Módulos · Syncs · Contribuição · Roadmap.

---


<br><br>

# ═══════════════════════════════════════
# 📄 HANDOFF.md
# ═══════════════════════════════════════

# 🤝 Handoff — EPI-USE Office

> **Comece por aqui.** Guia único de passagem do projeto para um(a) novo(a) colaborador(a).
> Reúne tudo: o que ler, como rodar, pastas, syncs, deploy e regras inegociáveis.
> Atualizado: junho/2026.

---

## 1. Ordem de leitura (faça nesta sequência)

| # | Documento | Por quê |
|---|---|---|
| 1 | **Este HANDOFF.md** | Visão geral + acessos necessários |
| 2 | [README.md](../README.md) | O que é o produto + setup local |
| 3 | [ONBOARDING.md](ONBOARDING.md) | Time, papéis, primeiros passos (30 min) |
| 4 | [ARCHITECTURE.md](ARCHITECTURE.md) | Como o sistema é montado (Node + SQLite + JSON) |
| 5 | [MODULES.md](MODULES.md) | Todas as páginas e funcionalidades |
| 6 | [SYNCS.md](SYNCS.md) | Os syncs e as tarefas agendadas |
| 7 | [CONTRIBUTING.md](CONTRIBUTING.md) | Regras de commit, padrões, deploy |
| 8 | [ROADMAP.md](ROADMAP.md) | O que vem por aí |
| 9 | `CLAUDE.md` / `AGENTS.md` (raiz) | Regras pro assistente de IA do projeto |

---

## 2. O que é, em uma frase

Plataforma web **interna** do time de RevOps & Marketing da EPI-USE Brasil. Centraliza inteligência de mercado, pipeline, conteúdo, metas e operação. **Vanilla HTML/CSS/JS + Node/Express + SQLite**, zero frameworks pesados. Roda em `localhost:3000` (PC) e em `office.epiuse.com.br` (Railway).

---

## 3. Acessos que você precisa pedir ao Rudá

Sem esses, o app roda mas algumas integrações ficam off (degradam com elegância):

| Acesso | Para quê |
|---|---|
| Repositório GitHub (`RudaCosta/epiuse-mkt-office`) | Código + deploy |
| Conta Railway (projeto Office) | Produção, logs, variáveis de ambiente |
| Valores do `.env` (ver `.env.example`) | `ANTHROPIC_API_KEY`, `EDITOR_TOKEN`, `RD_*`, `RESEND_API_KEY` |
| OneDrive MARKETING (Duda/Roberto) | xlsx que alimentam os syncs (calendário, cases, metas) |
| Apollo / Zoho / RD Station | Pipeline, deals, email marketing |

> **Segredos nunca vão pro repo.** Local: `.env` (ou `C:/Users/Ruds/.epiuse-optimizer/.env`). Produção: variáveis no painel do Railway.

---

## 4. Setup local (resumo)

```bash
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office
npm install                 # Node 20+
cp .env.example .env        # preencher as chaves com o Rudá
node server.js              # http://localhost:3000
```

Para scripts de sync: Python 3.10+ com `pip install pandas openpyxl python-pptx python-docx`.

No PC do Rudá o app sobe sozinho (tarefa agendada). Em outra máquina, suba manual com `node server.js` ou `scripts/lifecycle/start-office.ps1`.

---

## 5. Mapa de pastas

```
epiuse-mkt-office/
├── server.js              ← ponto de entrada (Express, ~4800 linhas)
├── routes/                ← rotas separadas (auth, cases, inbound, sap)
├── public/                ← TODAS as páginas (.html vanilla) + /api/*.json (dados)
│   ├── *.html             ← telas (home, metas-fy26, raccoon, cases, pipeline...)
│   ├── api/*.json         ← dados servidos (metas-fy26, cases, areas, pipeline...)
│   └── design-tokens.css  ← tokens do Design System (gerados)
├── scripts/
│   ├── sync/              ← integrações (ver SYNCS.md)
│   ├── lifecycle/         ← subir/parar app + tarefas agendadas Windows
│   └── design/            ← gen_tokens.py (Design System)
├── modulos/               ← módulos com README/CHANGELOG próprios (08-inbound, 10-painel...)
├── data/                  ← insumos locais (ex.: data/metas/*.xlsx)
├── vault/                 ← contexto/memória (empresa, branding, pessoas, DESIGN.md)
├── docs/                  ← ESTA documentação
├── vault-backups/         ← backups automáticos antes de sobrescrever dados
├── Dockerfile             ← build de produção (Node 20 + Python3 + python-pptx)
├── railway.json           ← força Builder = DOCKERFILE no Railway
└── .env.example           ← modelo das variáveis de ambiente
```

---

## 6. Deploy (produção)

- **Como:** `git push origin master` → Railway builda pelo `Dockerfile` e publica em `office.epiuse.com.br`.
- **Builder:** Dockerfile (Node 20 + Python3 + python-pptx) — fixado por `railway.json`.
- **Dados:** Railway usa **volume persistente** (`/data/db.sqlite`) — sobrevivem a deploys.
- ⚠️ **Regra inegociável:** **só dar push sob ordem explícita do Rudá** ("sobe"/"deploy"/"push"), e **por push** — uma ordem não autoriza os próximos.

---

## 7. Regras inegociáveis (resumo — detalhe em CONTRIBUTING.md)

1. **Deploy só sob ordem explícita** do Rudá, por push.
2. **Dados REAIS** — nunca número fictício como real; usar etiquetas (`⏳ Aguardando integração`, `📝 Demonstração`, `⚠️ Estimativa`).
3. **Aprovação da Duda** antes de qualquer publicação externa.
4. **Stack vanilla** — sem React/Vue/Angular/Webpack/TypeScript.
5. **Português do Brasil** em toda interface e conteúdo.
6. **Nunca citar cliente/concorrente nominalmente** em conteúdo público sem aprovação.
7. **Nunca matar o `node` local** sem ordem (tarefa agendada cuida dele).
8. **Backup antes de sobrescrever** dado de produção/planilha (vai pra `vault-backups/`).
9. **Mudança de design** passa por `vault/00-contexto/DESIGN.md` + `gen_tokens.py` (nunca hex hardcoded).

---

## 8. Contatos

| Pessoa | Papel | Aprova |
|---|---|---|
| **Rudá Costa** | RevOps & Marketing (dono do produto) | Código, infra, deploy |
| **Duda** | Brand Experience (operação) | Publicações externas, conteúdo |
| **Roberto** | Country Manager Brasil | Cases, LOBs, executivo |
| **Lisiane de Assis** | CEO Redatoria | Tom de voz dos artigos |

---

**Dúvida de "onde mexo pra X?"** → [MODULES.md](MODULES.md) (por página) + [SYNCS.md](SYNCS.md) (por dado).


<br><br>

# ═══════════════════════════════════════
# 📄 README.md
# ═══════════════════════════════════════

# EPI-USE Office — Marketing Platform

> Plataforma interna do time de RevOps & Marketing da EPI-USE Brasil.
> Roda em `localhost:3000` (PC/Notebook) e em Railway (produção).

[![versão](https://img.shields.io/badge/versão-0.12.0-blue)](#changelog)
[![stack](https://img.shields.io/badge/stack-Node.js%20%2B%20Vanilla%20JS-green)](#arquitetura)
[![status](https://img.shields.io/badge/status-produção-brightgreen)](#deploy)

---

## O que é

O **EPI-USE Office** é uma plataforma web interna que centraliza ferramentas de marketing, inteligência de mercado e operação do time. Tudo em vanilla HTML/CSS/JS + Node.js (zero frameworks pesados).

**6 áreas operacionais:**
| Área | Foco | Página |
|---|---|---|
| 🔵 Intelligence | CRM, pipeline, lead scoring | `/area?id=intelligence` |
| 🟢 Inbound & Growth | Mídia paga, SEO, LinkedIn | `/area?id=inbound` |
| 🟡 Eventos | 30+ eventos/ano, MDF SAP | `/area?id=eventos` |
| 🟠 Outbound | Apollo, prospecção C-Level | `/area?id=outbound` |
| 🟣 Voices & Conteúdo | Programa de Voices, blog | `/area?id=voices` |
| 🟤 Conteúdo Editorial | 693 artigos, jornadas de compra | `/area?id=conteudo` |

---

## Setup local (primeira vez)

### Pré-requisitos
- Node.js 20+ (testar: `node -v`)
- Python 3.10+ (para scripts de sync)
- Git

### Instalação

```bash
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office
npm install
cp .env.example .env
# preencher .env com as chaves (ver docs/ONBOARDING.md)
node server.js
```

Acesse: `http://localhost:3000`

### Inicialização automática (Windows — recomendado)

O servidor sobe automaticamente ao login e reinicia se cair:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/lifecycle/install-task.ps1
```

Para iniciar/parar manualmente:
```powershell
scripts/lifecycle/start-office.ps1
scripts/lifecycle/stop-office.ps1
```

---

## Páginas disponíveis

| Rota | Descrição |
|---|---|
| `/` | Office Home — hub de navegação |
| `/area?id=X` | Dashboard por área (funil + KPIs + ferramentas) |
| `/painel` | Painel da Duda — daily digest operacional |
| `/pipeline` | Pipeline Apollo (contatos, empresas, sequências) |
| `/optimizer` | Profile Optimizer V1 (LinkedIn kit) |
| `/optimizer-v2` | Profile Optimizer V2 (findskill.ai style) |
| `/voices` | Hub dos Voices ativos |
| `/relatorio` | Relatório mensal consolidado |
| `/metas` | Metas 30d/90d por área |
| `/artigos` | Base de 693 artigos pesquisáveis |
| `/cases` | Cases publicáveis por LOB |
| `/inbound` | Pipeline editorial (brief → artigo → carrossel) |
| `/cowork` | Cowork — disparo de workflows de agentes |
| `/jornadas` | Jornadas de compra por LOB |
| `/projecoes` | Cenários de paid media (CAC, ROI) |
| `/design` | Design System (tokens, cores, tipografia) |
| `/war-room` | War Room — visão executiva |
| `/changelog` | Histórico de versões |

---

## Arquitetura

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para detalhe completo.

**Resumo:**
- **Backend:** `server.js` — Express + SQLite (`better-sqlite3`)
- **Frontend:** HTML/CSS/JS vanilla — sem build step
- **Design tokens:** `public/design-tokens.css` (gerado por `scripts/design/gen_tokens.py`)
- **Dados:** `public/api/*.json` — fontes de dados estáticas + sync via scripts
- **Deploy:** Railway (auto-deploy no push para `master`)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Web server | Express 4 |
| Banco de dados | SQLite via `better-sqlite3` |
| IA | Anthropic SDK (`@anthropic-ai/sdk`) |
| E-mail | Resend |
| Autenticação | MSAL (Azure AD) |
| Frontend | Vanilla HTML/CSS/JS |
| Python scripts | pandas, openpyxl, python-pptx |

---

## Variáveis de ambiente

Ver `.env.example` para a lista completa. Chaves obrigatórias:

```
ANTHROPIC_API_KEY=       # Claude API
APOLLO_API_KEY=          # Apollo.io outbound
RESEND_API_KEY=          # E-mail transacional
EDITOR_TOKEN=            # Token interno para sync de cases
SESSION_SECRET=          # Express session
```

> ⚠️ O arquivo `.env` nunca é comittado. Solicitar ao Rudá.

---

## Módulos

Ver [`docs/MODULES.md`](docs/MODULES.md) para mapa detalhado.

| # | Módulo | Status |
|---|---|---|
| 00 | Design System | ✅ Ativo |
| 01 | Relatório Mensal | ✅ Ativo |
| 02 | Voices Optimizer | ✅ Ativo (V1 + V2) |
| 03 | Metas FY26 | ✅ Ativo |
| 04 | Artigos Blog | ✅ Ativo (693 artigos) |
| 05 | Cases CS | ✅ Ativo |
| 06 | Inbound Pipeline | ✅ Ativo |
| 07 | Pipeline Apollo | ✅ Ativo |
| 10 | Painel Duda | 🚧 Em construção |
| 99 | Integrações Pendentes | 📋 Roadmap |

---

## Roadmap

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para visão completa.

**Próximas prioridades:**
1. Painel Duda (Módulo 10) — dashboard operacional com real-time
2. Integração GA4 — tráfego orgânico no relatório
3. Integração LinkedIn API — seguidores e engajamento automático
4. Voice Agents (Módulo B) — automação de posts dos Voices

---

## Contribuindo

Ver [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) para padrões de código, commits e fluxo de trabalho.

**Regras inegociáveis:**
- Zero frameworks pesados (React/Vue/Angular)
- Só vanilla HTML/CSS/JS no frontend
- Dados REAIS ou etiqueta clara de placeholder
- Aprovação Duda antes de publicação externa
- Deploy só sob ordem explícita do Rudá ("sobe", "deploy", "push")

---

## Time

| Pessoa | Papel |
|---|---|
| **Rudá Costa** | RevOps & Marketing — estratégia, produto |
| **Duda** | Brand Experience — operação, aprovações |
| **Roberto** | Country Manager Brasil — aprovação executiva |

---

## Links

- **Produção:** Railway (URL via Rudá)
- **Repo:** https://github.com/RudaCosta/epiuse-mkt-office
- **Changelog:** `/changelog` ou `public/api/changelog.json`

---

*EPI-USE Office v0.12.0 · junho/2026*


<br><br>

# ═══════════════════════════════════════
# 📄 ONBOARDING.md
# ═══════════════════════════════════════

# Onboarding — EPI-USE Office

> Guia para novos membros do time. Leia do começo ao fim antes de mexer em qualquer coisa.
> Tempo estimado: 30 minutos.

---

## 1. O que é esse projeto

O **EPI-USE Office** é a plataforma interna do time de RevOps & Marketing da EPI-USE Brasil. Centraliza:

- **Inteligência de mercado** — pipeline Apollo, base de 39k+ contatos
- **Programa Voices** — kit de LinkedIn para consultores (Profile Optimizer)
- **Conteúdo editorial** — pipeline de artigos, 693 artigos no ar
- **Operação Duda** — painel diário da Brand Experience
- **Métricas** — relatório mensal, metas FY26, funis por área

É uma plataforma **interna** — não é pública. Roda em `localhost:3000` (local) e Railway (produção).

---

## 2. Time e papéis

| Pessoa | Papel | O que aprova |
|---|---|---|
| **Rudá Costa** | RevOps & Marketing — estratégia, produto | Qualquer mudança no código ou infra |
| **Duda** | Brand Experience — operação | Qualquer publicação externa, conteúdo |
| **Roberto** | Country Manager Brasil | Aprovações executivas, cases, LOBs |
| **Lisiane de Assis** | CEO Redatoria | Tom de voz dos artigos |

**Regra de ouro:** toda publicação externa (LinkedIn, blog, ads) precisa de aprovação da Duda antes.

---

## 3. Setup local

### Pré-requisitos

```
Node.js 20+    → https://nodejs.org/
Python 3.10+   → https://python.org/
Git            → https://git-scm.com/
```

### Passo a passo

```bash
# 1. Clone o repo
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office

# 2. Instale dependências Node
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# → Solicite ao Rudá os valores reais das chaves

# 4. Inicie o servidor
node server.js

# 5. Acesse no browser
# http://localhost:3000
```

### Windows — inicialização automática (recomendado)

```powershell
# Instala Tarefas Agendadas (sobe no login + healthcheck a cada 5 min)
powershell -ExecutionPolicy Bypass -File scripts/lifecycle/install-task.ps1
```

Após isso o servidor sobe automaticamente ao login. Para controle manual:
```powershell
scripts/lifecycle/start-office.ps1   # iniciar
scripts/lifecycle/stop-office.ps1    # parar
```

---

## 4. Variáveis de ambiente

Solicitar ao Rudá. Nunca commitar o `.env`.

| Variável | Para que serve |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API (Profile Optimizer, Cowork) |
| `APOLLO_API_KEY` | Apollo.io (pipeline, outbound) |
| `RESEND_API_KEY` | E-mails transacionais |
| `EDITOR_TOKEN` | Token interno para sync de cases |
| `SESSION_SECRET` | Express session (qualquer string longa) |
| `PORT` | Porta do servidor (padrão: 3000) |

---

## 5. Entendendo a estrutura

### O que você vai mexer (na maioria das vezes)

```
public/api/areas.json      ← dados das 6 áreas (funil, KPIs, ferramentas)
public/*.html              ← páginas da plataforma
vault/00-contexto/*.md     ← contexto dos agentes de IA
```

### O que você NÃO deve mexer sem entender

```
server.js                  ← backend — mexer com cuidado
public/design-tokens.css   ← gerado automaticamente (não editar direto)
scripts/lifecycle/*.ps1    ← lifecycle do servidor Windows
```

### Design System

**Nunca hardcodar hex no CSS.** Sempre usar variáveis:
```css
/* ✅ Certo */
color: var(--color-text, #e6ebf2);
background: var(--brand-epiuse-navy, #001844);

/* ❌ Errado */
color: #e6ebf2;
background: #001844;
```

Para mudar cores/tipografia: editar `vault/00-contexto/DESIGN.md` e rodar:
```bash
python scripts/design/gen_tokens.py
```

---

## 6. Como trabalhar

### Fluxo de desenvolvimento

```
1. Crie uma branch para sua feature
   git checkout -b feat/minha-feature

2. Faça as mudanças

3. Commit seguindo o padrão:
   git commit -m "feat(modulo): descrição curta (vX.Y.Z)"

4. Push e abra PR para master
   git push origin feat/minha-feature

5. Rudá revisa e aprova antes do merge
```

### Padrão de commits

```
feat(area): nova funcionalidade
fix(server): correção de bug
docs(readme): atualização de documentação
refactor(pipeline): refatoração sem mudança de comportamento
style(design): ajuste visual sem lógica
chore(deps): atualização de dependência
```

### Regra de deploy

**NUNCA fazer `git push origin master` diretamente sem ordem explícita do Rudá.**

O push para master dispara deploy automático no Railway. A ordem tem que vir explicitamente: "sobe", "deploy", "push pro railway", etc.

---

## 7. Dados: real vs placeholder

Esta plataforma trabalha com **dados reais**. Etiquetas obrigatórias quando não for real:

| Etiqueta | Quando usar |
|---|---|
| `📝 Dado de demonstração` | Mock/seed para desenvolvimento |
| `⚠️ Estimativa — premissa: X` | Calculado/projetado |
| `🤖 Gerado por IA — revisar` | Output de Claude |
| `⏳ Aguardando integração [X]` | Placeholder pendente |
| `🔮 Projeção (não realizado)` | Forecast |

**Nunca publicar número fictício como se fosse real.**

---

## 8. Módulos e páginas

Ver [`MODULES.md`](MODULES.md) para mapa completo.

As páginas mais importantes para entender primeiro:
1. `/` → Home (ponto de entrada)
2. `/area?id=voices` → Área de Voices (mais ativa)
3. `/optimizer-v2` → Profile Optimizer V2
4. `/pipeline` → Pipeline Apollo
5. `/painel` → Painel da Duda (em construção)

---

## 9. Ferramentas externas

| Ferramenta | Acesso | Para que serve |
|---|---|---|
| Apollo.io | Solicitar ao Rudá | Base de contatos, sequências de e-mail |
| Railway | Solicitar ao Rudá | Deploy e logs de produção |
| Anthropic Console | Solicitar ao Rudá | Monitorar uso da Claude API |
| Resend | Solicitar ao Rudá | E-mails transacionais |

---

## 10. Dúvidas frequentes

**Q: O servidor não sobe localmente. O que faço?**
A: Verificar se `.env` está preenchido. Verificar se `node -v` é 20+. Ver logs em `logs/office.err.log`.

**Q: Mudei um CSS mas não apareceu no browser.**
A: Verificar se está usando variáveis CSS (`var(--cor)`). Se editou `DESIGN.md`, rodar `gen_tokens.py`.

**Q: Como adicionar uma nova página?**
A: Criar `public/minha-pagina.html`. Incluir no `<head>`: `<link rel="stylesheet" href="/design-tokens.css">` e `<script src="/office-nav.js"></script>`. Adicionar rota em `server.js` se necessário.

**Q: Como atualizar os dados de uma área?**
A: Editar `public/api/areas.json`. Os campos são documentados no próprio arquivo.

**Q: Posso fazer deploy sem perguntar ao Rudá?**
A: Não. Sempre perguntar. O deploy é manual e intencional.

---

## 11. Contatos

- Dúvidas técnicas: abrir issue no GitHub ou falar com Rudá
- Dúvidas de conteúdo/branding: falar com Duda
- Aprovações executivas: Roberto

---

*Versão deste documento: junho/2026*


<br><br>

# ═══════════════════════════════════════
# 📄 ARCHITECTURE.md
# ═══════════════════════════════════════

# Arquitetura — EPI-USE Office

> Documento técnico para desenvolvedores. Atualizado: junho/2026.

---

## Visão geral

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (cliente)                     │
│         Vanilla HTML + CSS + JS · design-tokens.css     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / fetch()
┌────────────────────▼────────────────────────────────────┐
│                server.js (Express 4)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Routes  │  │ SQLite   │  │ Anthropic│  │ Resend │  │
│  │  /api/*  │  │ (melhor- │  │   SDK    │  │  Mail  │  │
│  │  pages   │  │ sqlite3) │  │  Claude  │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              public/api/*.json  (dados)                  │
│   areas.json · pipeline-snapshot.json · changelog.json  │
│   metas-fy26.json · cases.json · artigos/*.json         │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura de pastas

```
epiuse-mkt-office/
│
├── server.js                  ← ponto de entrada (Express)
├── package.json               ← dependências + versão
├── .env                       ← secrets (não comitado)
├── .env.example               ← template das vars
│
├── public/                    ← servido estaticamente em /
│   ├── *.html                 ← páginas (uma por rota)
│   ├── office-nav.js          ← navegação global injetada em todas as páginas
│   ├── office-footer.js       ← rodapé global
│   ├── design-tokens.css      ← tokens de design (gerado — não editar diretamente)
│   └── api/
│       ├── areas.json         ← fonte única das 6 áreas (funil, KPIs, ferramentas)
│       ├── pipeline-snapshot.json  ← snapshot Apollo (sync diário)
│       ├── changelog.json     ← histórico de versões
│       ├── metas-fy26.json    ← metas FY26 por área
│       └── cases.json         ← cases para /cases
│
├── vault/                     ← memória dos agentes (Obsidian-style)
│   ├── 00-contexto/           ← contexto compartilhado (todos os agentes leem)
│   │   ├── empresa.md         ← EPI-USE Brasil
│   │   ├── projetos.md        ← projetos ativos
│   │   ├── branding.md        ← tom de voz, cores
│   │   ├── pessoas.md         ← Voices ativos, time
│   │   ├── DESIGN.md          ← design system spec (fonte da verdade)
│   │   └── pendencias.md      ← bloqueios e pendências ativas
│   ├── workflows/             ← definições de fluxos do Cowork
│   └── cowork-runs/           ← histórico de execuções (runtime, não comitar)
│
├── modulos/                   ← documentação por módulo
│   ├── README.md              ← índice de módulos
│   └── 10-painel-duda/        ← ex: módulo em construção
│       └── README.md
│
├── scripts/
│   ├── design/
│   │   └── gen_tokens.py      ← gera public/design-tokens.css a partir de DESIGN.md
│   ├── lifecycle/
│   │   ├── install-task.ps1   ← instala Tarefas Agendadas Windows (1x, sem admin)
│   │   ├── start-office.ps1   ← inicia servidor
│   │   ├── stop-office.ps1    ← para servidor
│   │   └── office-health.ps1  ← healthcheck (chamado a cada 5min)
│   ├── integrations/
│   │   ├── apollo_pipeline_sync.js  ← sync Apollo → pipeline-snapshot.json
│   │   └── ga4_oauth_setup.js       ← setup OAuth GA4
│   └── sync/
│       ├── sync_artigos_blog.py     ← importa artigos do site
│       ├── sync_cases_roberto.py    ← importa cases aprovados
│       └── sync_metas_fy26.py       ← sync metas FY26
│
├── docs/                      ← documentação para humanos (esta pasta)
│   ├── ARCHITECTURE.md        ← este arquivo
│   ├── ONBOARDING.md          ← guia para novos membros
│   ├── MODULES.md             ← mapa de módulos
│   ├── ROADMAP.md             ← roadmap de produto
│   └── CONTRIBUTING.md        ← padrões de contribuição
│
└── logs/                      ← logs de runtime (não comitar)
    ├── office.log
    ├── office.err.log
    └── office-health.log
```

---

## Servidor (`server.js`)

Express 4 com as seguintes responsabilidades:

| Rota | Tipo | Descrição |
|---|---|---|
| `GET /` | HTML | Serve `public/office.html` |
| `GET /:page` | HTML | Serve `public/:page.html` |
| `GET /api/*` | JSON | Dados estáticos de `public/api/` |
| `POST /api/optimizer-input` | JSON | Processa entrada do Profile Optimizer |
| `POST /api/cowork-run` | JSON | Dispara workflow do Cowork |
| `GET /api/health` | JSON | Healthcheck (`{ status: "ok" }`) |

---

## Design System

**Fonte da verdade:** `vault/00-contexto/DESIGN.md`

**Workflow de mudança:**
1. Editar `vault/00-contexto/DESIGN.md`
2. Rodar `python scripts/design/gen_tokens.py`
3. O arquivo `public/design-tokens.css` é regenerado
4. Reload no browser — mudança propaga em todas as páginas

**Paletas:**
- `--color-primary-*` → Office app (azul)
- `--brand-epiuse-navy: #001844` → Corporate Navy
- `--brand-epiuse-red: #cd1543` → Corporate Red
- `--brand-epiuse-blue-light: #869ec3` → Blue Light
- `--brand-epiuse-grey: #cfd1d3` → Grey

**Fontes:** Maven Pro (primary) + Avenir (secondary)

---

## Banco de dados (SQLite)

Localizado em `~/.epiuse-optimizer/` (fora do repo — não sincroniza).

Tabelas principais:
- `voices` — perfis dos Voices ativos
- `cases` — cases publicáveis
- `sessions` — sessões Express

> ⚠️ **Railway não persiste SQLite entre deploys.** Workaround: re-sync dos cases após cada push usando `EDITOR_TOKEN`.

---

## Lifecycle (Windows)

O servidor é gerenciado por **Tarefas Agendadas do Windows** (substituiu PM2 em v0.7.0):

| Tarefa | Trigger | Script |
|---|---|---|
| `EPI-USE-Office` | Login do Windows | `start-office.ps1` |
| `EPI-USE-Office-Health` | A cada 5 min | `office-health.ps1` |

**Causa raiz histórica (resolvida):** Node.js v24 quebrou `better-sqlite3` (ABI 108 vs 137). Fix: `better-sqlite3@12.x` com prebuilt binaries.

---

## Deploy (Railway)

- Push para `master` → deploy automático
- Variáveis de ambiente configuradas no painel Railway
- **NUNCA fazer push sem ordem explícita do Rudá**

---

## Integrações externas

| Serviço | Status | Dados |
|---|---|---|
| Apollo.io | ✅ Ativo | pipeline-snapshot.json (sync diário) |
| Anthropic Claude | ✅ Ativo | Profile Optimizer, Cowork |
| Resend | ✅ Ativo | E-mails transacionais |
| Google Analytics 4 | ⏳ Pendente | OAuth configurado, sync não finalizado |
| LinkedIn API | ⏳ Pendente | Seguidores, engajamento |
| Zoho CRM | ⏳ Pendente | Pipeline CRM → dashboard |

---

*Atualizado em: junho/2026 · v0.12.0*


<br><br>

# ═══════════════════════════════════════
# 📄 MODULES.md
# ═══════════════════════════════════════

# Módulos — EPI-USE Office

> Mapa de todos os módulos, páginas e funcionalidades da plataforma.
> Atualizado: junho/2026 · v0.12.0

---

## Índice de módulos

| # | Módulo | Página(s) | Status | Responsável |
|---|---|---|---|---|
| 00 | [Design System](#00-design-system) | `/design` | ✅ Ativo | Rudá / Duda |
| 01 | [Relatório Mensal](#01-relatório-mensal) | `/relatorio` | ✅ Ativo | Rudá |
| 02 | [Voices Optimizer](#02-voices-optimizer) | `/optimizer`, `/optimizer-v2` | ✅ Ativo | Rudá / Duda |
| 03 | [Metas FY26](#03-metas-fy26) | `/metas` | ✅ Ativo | Rudá |
| 04 | [Artigos Blog](#04-artigos-blog) | `/artigos` | ✅ Ativo | Rudá / Gui |
| 05 | [Cases CS](#05-cases-cs) | `/cases` | ✅ Ativo | Roberto / Rudá |
| 06 | [Inbound Pipeline](#06-inbound-pipeline) | `/inbound`, `/cowork`, `/jornadas` | ✅ Ativo | Rudá |
| 07 | [Pipeline Apollo](#07-pipeline-apollo) | `/pipeline` | ✅ Ativo | Rudá |
| 10 | [Painel Duda](#10-painel-duda) | `/painel` | 🚧 Em construção | Duda / Rudá |
| 99 | [Integrações Pendentes](#99-integrações-pendentes) | — | 📋 Roadmap | Rudá |

---

## 00 Design System

**Pasta:** `vault/00-contexto/DESIGN.md` + `scripts/design/`
**Página:** `/design`

Design System interno baseado no Brand Guide EPI-USE V1.1.

**O que tem:**
- Tokens de cor (Navy `#001844`, Red `#cd1543`, Blue Light `#869ec3`, Grey `#cfd1d3`)
- Tipografia: Maven Pro (primary) + Avenir (secondary)
- Componentes: cards, badges, funis, tabelas
- Visualizador em `/design` (Storybook lite)

**Como funciona:**
1. Editar `vault/00-contexto/DESIGN.md`
2. Rodar `python scripts/design/gen_tokens.py`
3. `public/design-tokens.css` é regenerado e propaga em todas as páginas

---

## 01 Relatório Mensal

**Pasta:** `scripts/relatorio/`
**Página:** `/relatorio`

Relatório consolidado mensal com KPIs de todas as áreas.

**Fontes de dados:**
- Apollo (pipeline, contatos) → real
- LinkedIn (seguidores) → real (manual)
- Artigos publicados → real (sync)
- Eventos → ⏳ aguarda integração

**Output:** Visualização web + exportação PPTX (`scripts/relatorio/gerar_pptx.py`)

---

## 02 Voices Optimizer

**Pasta:** `public/optimizer.html`, `public/optimizer-v2.html`
**Páginas:** `/optimizer`, `/optimizer-v2`

Kit LinkedIn para consultores do programa Voices.

**V1 (`/optimizer`):**
- Input: dados do consultor cadastrado
- Output: kit LinkedIn (headline, about, featured, posts)
- Fluxo: copia prompt → Claude processa → cola JSON → gera PDF/MD

**V2 (`/optimizer-v2`):**
- Inspirado no findskill.ai
- Input: transcrição de entrevista (texto livre)
- Output: Voice Index + Resumo Executivo + Kit completo
- Usa Anthropic API diretamente

**Guia operacional:** `vault/00-contexto/operacao-optimizer.md`

---

## 03 Metas FY26

**Pasta:** `scripts/metas/`, `public/api/metas-fy26.json`
**Página:** `/metas`

Dashboard de metas do FY26 (março/2026 – fevereiro/2027) por área.

**Scripts:**
- `gerar_planilha_metas.py` → XLSX com dados reais
- `gerar_planilha_smart.py` → template SMART em branco
- `gerar_planilha_template_em_branco.py` → template para preenchimento

**Dados:** `public/api/metas-fy26.json` (editável manualmente ou via script)

---

## 04 Artigos Blog

**Pasta:** `scripts/sync/sync_artigos_blog.py`
**Página:** `/artigos`

Base pesquisável de 693 artigos do blog EPI-USE.

**Sync:** `python scripts/sync/sync_artigos_blog.py`
**Dados:** `public/api/artigos/*.json`

Funcionalidades: busca full-text, filtro por LOB, filtro por data, link para artigo original.

---

## 05 Cases CS

**Página:** `/cases`

Banco de cases publicáveis aprovados pelo Roberto.

**Sync:** `python scripts/sync/sync_cases_roberto.py`
**Autenticação:** `EDITOR_TOKEN` no `.env`

> ⚠️ **Workaround Railway:** SQLite não persiste entre deploys. Re-sync obrigatório após cada push usando o EDITOR_TOKEN.

---

## 06 Inbound Pipeline

**Páginas:** `/inbound`, `/cowork`, `/jornadas`

Pipeline editorial completo: brief → artigo → carrossel LinkedIn.

**Cowork (`/cowork`):**
- Dispara workflows de agentes em sequência
- Workflows definidos em `vault/workflows/`
- Agentes: pipe-briefing → pipe-artigo → pipe-carrossel → pipe-copy-li → pipe-capa
- Histórico em `vault/cowork-runs/`

**Jornadas (`/jornadas`):**
- Buyer journey por LOB (SAP HCM, SAP S/4HANA, etc.)
- Mapa visual da jornada de compra

---

## 07 Pipeline Apollo

**Página:** `/pipeline`

Dashboard do pipeline outbound (Apollo.io).

**Sync automático:** `scripts/integrations/apollo_pipeline_sync.js`
- Agendado via Tarefa Windows `run-apollo-sync.ps1`
- Grava em `public/api/pipeline-snapshot.json`

**Dados em tempo real:** contatos (39k+), empresas (14k+), sequências ativas (15).

---

## 10 Painel Duda

**Pasta:** `modulos/10-painel-duda/`
**Página:** `/painel`
**Status:** 🚧 Em construção (sprint 15 iniciado)

Dashboard operacional diário para a Duda (Brand Experience).

**Seções planejadas:**
- Daily digest (tarefas do dia, alertas)
- Inbox por área (o que está pendente)
- KPIs dos Voices (posts, engajamento, atividade)
- Feed de atividade dos agentes Cowork
- Calendário de conteúdo

**Ver:** `modulos/10-painel-duda/README.md` para detalhes do sprint.

---

## 99 Integrações Pendentes

Integrações no roadmap que ainda não foram finalizadas:

| Integração | Dados que traz | Bloqueador |
|---|---|---|
| Google Analytics 4 | Tráfego orgânico, pageviews | OAuth configurado, sync pendente |
| LinkedIn API | Seguidores, impressões, engajamento | API access pendente |
| Zoho CRM | Oportunidades, stage, valor | Definir CRM oficial |
| RD Station | Leads inbound, automações | Acesso API |

**Ver:** `vault/00-contexto/pendencias.md` para status atualizado.

---

## Páginas sem módulo formal

Páginas existentes que ainda não têm módulo documentado:

| Página | Rota | Descrição |
|---|---|---|
| Office Home | `/` | Hub de navegação com links para todas as áreas |
| Area Dashboard | `/area?id=X` | Dashboard por área (funil, KPIs, ferramentas) |
| War Room | `/war-room` | Visão executiva consolidada |
| Projeções Paid Media | `/projecoes` | Cenários de investimento (CAC, ROI) |
| Seja um Voice | `/seja-voice` | Página de recrutamento de Voices |
| Changelog | `/changelog` | Histórico de versões da plataforma |
| Hub | `/hub` | Hub de links externos |

---

*Atualizado em: junho/2026 · v0.12.0*


<br><br>

# ═══════════════════════════════════════
# 📄 SYNCS.md
# ═══════════════════════════════════════

# Syncs & Tarefas Agendadas — EPI-USE Office

> Referência de todos os scripts de sincronização e das tarefas agendadas do Windows.
> Os syncs ligam fontes externas (OneDrive/xlsx, RD Station, Zoho, Apollo, blog) ao app.
> Atualizado: junho/2026.

---

## 1. Como os dados fluem

```
Fontes externas                       Office (Node/SQLite + public/api/*.json)        Produção
─────────────────                     ──────────────────────────────────────         ─────────
xlsx OneDrive (Duda, Roberto) ──┐
RD Station (email mkt)          ├──►  scripts/sync/*  ──►  DB SQLite / *.json  ──►  Railway (deploy)
Zoho CRM (deals)                │                                  ▲
Apollo (prospecção)             │                                  │
blog epiuse.com.br (693 art.) ──┘            tarefas agendadas (Windows) rodam os scripts
```

- **Local (PC do Rudá):** o app sobe sozinho no login e as tarefas agendadas rodam os syncs.
- **Produção (Railway):** recebe os dados via `git push` (deploy) + alguns syncs POSTam direto no prod (`office.epiuse.com.br`) usando `EDITOR_TOKEN`.

---

## 2. Scripts de sync (`scripts/sync/`)

| Script | O que faz | Fonte → Destino | Como rodar |
|---|---|---|---|
| `sync_calendario_duda.js` | Lê o calendário editorial (xlsx da Duda no OneDrive) e POSTa no app | xlsx OneDrive → `editorial_calendar` (fonte=`planilha-duda`) | `OFFICE_URL=<url> node scripts/sync/sync_calendario_duda.js` |
| `sync_redatoria_to_calendar.js` | Cronograma da Redatoria → calendário | xlsx Redatoria → `editorial_calendar` (fonte=`redatoria`) | `node scripts/sync/sync_redatoria_to_calendar.js` |
| `sync_cronograma_redatoria.js` | Importa cronograma de produção da Redatoria | xlsx → DB | `node scripts/sync/sync_cronograma_redatoria.js` |
| `raccoon_to_xlsx.py` | Itens **agendados** do Rax (fonte=raccoon no prod) → célula-dia da xlsx da Duda | prod `/api/inbound/calendar` → xlsx OneDrive | `python scripts/sync/raccoon_to_xlsx.py --from-prod --apply` |
| `sync_cases_roberto.py` / `.js` | Cases de sucesso (xlsx do Roberto) → base de cases | xlsx OneDrive → `cs_clientes` / `cases.json` | `python scripts/sync/sync_cases_roberto.py` |
| `deploy-cases-to-site.ps1` | Publica os cases no site público via FTP | DB/JSON → www.epiuse.com.br | `powershell -File scripts/sync/deploy-cases-to-site.ps1` |
| `sync_rd_station.js` | Integração RD Station Marketing V2 (campanhas de email) | RD Station API → calendário/relatório | `node scripts/sync/sync_rd_station.js` (usa `RD_*` do `.env`) |
| `sync_zoho_deals.js` | Deals do Zoho CRM → pipeline | Zoho API → `pipeline-snapshot.json` | `node scripts/sync/sync_zoho_deals.js` |
| `sync_clientes_sap_4me.js` | Base de clientes SAP (4me) | fonte → `/clientes-sap-4me` | `node scripts/sync/sync_clientes_sap_4me.js` |
| `sync_artigos_blog.py` | Scrape dos 693 artigos do blog (corpo + metadados) | epiuse.com.br/artigo/... → `artigos/*.json` | `python scripts/sync/sync_artigos_blog.py` |
| `build_artigos_scores.py` | Calcula score de relevância 2026 dos artigos | artigos.json → scores | `python scripts/sync/build_artigos_scores.py` |
| `sync_linkedin_historical.py` | LinkedIn histórico (xls export) → série mensal | xls → `linkedin-historical.json` | `python scripts/sync/sync_linkedin_historical.py` |
| `log_voice_ssi.js` | Registra a medição semanal de SSI de um Voice | manual → DB | `node scripts/sync/log_voice_ssi.js` |
| `sync_ideias_to_xlsx.py` | Espelha o Mural de Ideias → planilha OneDrive | DB → xlsx OneDrive | `python scripts/sync/sync_ideias_to_xlsx.py` |
| `seed_ideias.py` | Popula o Mural de Ideias inicial | seed → DB | `python scripts/sync/seed_ideias.py` |
| `build_metas_pessoas.py` | **Metas da equipe** (Marlison, Bruna, Isabela, Designer) → metas | `data/metas/Metas_Equipe_EUBR_RevOps_v2.xlsx` → `public/api/metas-fy26.json` | `python scripts/sync/build_metas_pessoas.py --apply` |
| `sync_metas_fy26.py` | **(legado)** Metas FY26 a partir do docx oficial | docx → `metas-fy26.json` | substituído por `build_metas_pessoas.py` |

> **Regra de ouro dos syncs:** todo script tem **dry-run** (sem `--apply`) quando escreve em arquivo da Duda/produção. Sempre rode o dry-run antes do `--apply`. Os que escrevem em xlsx fazem backup `.bak-<timestamp>` antes.

---

## 3. Tarefas agendadas (Windows — PC do Rudá)

Registradas por `scripts/lifecycle/install-task.ps1` (sem admin). Rodam via `run-hidden.vbs` (sem janela). **Nunca matar o processo `node` sem ordem do Rudá.**

| Tarefa | Quando | Script | Faz |
|---|---|---|---|
| `EPI-USE-Office` | No login | `start-office.ps1` | Sobe o app local em `localhost:3000` |
| `EPI-USE-Office-Health` | A cada 5 min | `office-health.ps1` | Auto-restart se `/api/health` cair |
| `EPI-USE-Office-Calendar-Sync` | Diário ~07:15 | `run-calendar-sync.ps1` | Calendário Duda + Redatoria → prod, e Rax agendado → xlsx Duda |
| `EPI-USE-Office-Cases-Sync` | Diário | `run-cases-sync.ps1` | Cases do Roberto → prod |
| `EPI-USE-Apollo-Sync` | Diário | `run-apollo-sync.ps1` | Snapshot do pipeline Apollo |
| `EPI-USE-Office-LinkedIn-Sync` | Diário | `run-linkedin-sync.ps1` | Métricas LinkedIn |
| `EPI-USE-Office-LinkedIn-Routine` | Periódico | `run-linkedin-routine.ps1` | Rotina de seguidores LinkedIn |
| `EPI-USE-Ideias-Xlsx-Sync` | Diário | `run-ideias-xlsx-sync.ps1` | Mural de Ideias → xlsx OneDrive |
| `EPI-USE-LibreTranslate` (+ Health) | No login / 5 min | `start-libretranslate.ps1` | Servidor de tradução local |

> Ver/editar no Windows: **Agendador de Tarefas** (`taskschd.msc`) → tarefas `EPI-USE-*`.
> As tarefas `Office ...` (sem prefixo EPI-USE) são do Microsoft Office — **não mexer**.

---

## 4. Scripts de ciclo de vida (`scripts/lifecycle/`)

| Script | Faz |
|---|---|
| `install-task.ps1` | Registra todas as tarefas agendadas acima (rodar 1x no PC) |
| `start-office.ps1` | Sobe o server (`node server.js`) → logs em `logs/office.log` |
| `stop-office.ps1` | Para o server |
| `office-health.ps1` | Pinga `/api/health`; reinicia se cair |
| `run-hidden.vbs` | Roda um `.ps1` sem abrir janela (usado pelas tarefas) |
| `resync-railway-all.ps1` | Re-sincroniza tudo pro Railway de uma vez |
| `run-relatorio-mensal.ps1` | Gera o relatório mensal (PPTX) |

> **Scripts `.ps1` devem ser ASCII-only** (PowerShell 5.1 quebra com acento sem BOM).

---

## 5. Quando rodar o quê (na prática)

- **Duda editou o calendário** → roda sozinho via `EPI-USE-Office-Calendar-Sync` (ou manual: `run-calendar-sync.ps1`).
- **Atualizou metas da equipe** → copia o xlsx novo pra `data/metas/Metas_Equipe_EUBR_RevOps_v2.xlsx` e roda `python scripts/sync/build_metas_pessoas.py --apply` → commit → "sobe".
- **Novos cases do Roberto** → `EPI-USE-Office-Cases-Sync` (auto) ou `sync_cases_roberto.py`.
- **Atualizar artigos do blog** → `python scripts/sync/sync_artigos_blog.py` (re-scrape).
- **Depois de QUALQUER deploy** → conferir que os dados subiram (Railway usa volume persistente, mas valide).

Ver também: [ARCHITECTURE.md](ARCHITECTURE.md) · [ONBOARDING.md](ONBOARDING.md) · [CONTRIBUTING.md](CONTRIBUTING.md)


<br><br>

# ═══════════════════════════════════════
# 📄 CONTRIBUTING.md
# ═══════════════════════════════════════

# Contribuindo — EPI-USE Office

> Padrões e regras para quem trabalha neste repo.
> Ler antes de fazer qualquer commit.

---

## Regras inegociáveis

### Stack
- **Zero frameworks pesados** no frontend — apenas vanilla HTML/CSS/JS
- Backend somente em Node.js/Express com `server.js` como ponto de entrada
- Scripts utilitários em Python (pandas, openpyxl, python-pptx)
- Sem TypeScript, sem React, sem Vue, sem Angular, sem Webpack

### Dados
- **Dados REAIS ou etiqueta clara** — nunca publicar número fictício como real
- Etiquetas obrigatórias: `⏳ Aguardando integração [X]`, `📝 Dado de demonstração`, `⚠️ Estimativa`

### Deploy
- **Nunca fazer `git push origin master` sem ordem explícita do Rudá**
- A ordem precisa ser explícita: "sobe", "deploy", "push pro railway"
- Uma ordem no início da sessão **não** autoriza pushes posteriores

### Conteúdo
- Português do Brasil em toda interface e conteúdo
- Aprovação da Duda antes de qualquer publicação externa
- Sem citação de concorrentes nominalmente em conteúdo público
- Sem citação de clientes nominalmente sem aprovação

---

## Fluxo de trabalho

```
1. Criar branch
   git checkout -b feat/minha-feature

2. Desenvolver localmente (node server.js)

3. Commitar com mensagem padrão

4. Push da branch
   git push origin feat/minha-feature

5. Abrir Pull Request no GitHub

6. Aguardar revisão do Rudá

7. Merge em master (Rudá faz o merge)

8. Deploy no Railway (somente quando Rudá aprovar)
```

---

## Padrão de commits

### Formato
```
<tipo>(<escopo>): <descrição curta> (vX.Y.Z)

- Detalhe opcional 1
- Detalhe opcional 2
```

### Tipos
| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `style` | Ajuste visual (CSS, layout) sem lógica |
| `chore` | Dependências, configs, scripts utilitários |
| `data` | Atualização de dados em `public/api/` |

### Escopos comuns
`area`, `optimizer`, `pipeline`, `painel`, `cowork`, `inbound`, `cases`, `artigos`, `metas`, `relatorio`, `design`, `server`, `scripts`, `docs`

### Exemplos
```
feat(optimizer): V2 com input de transcricao (0.9.3)
fix(server): corrige rota /api/health sem autenticacao
docs(readme): atualiza instrucoes de setup
data(areas): metas FY26 preenchidas no funil
style(area): meta-card com barra de progresso
chore(deps): atualiza better-sqlite3 para 12.x
```

---

## Versionamento

O projeto usa **SemVer informal**:
- `0.X.0` → nova feature significativa (sprint completa)
- `0.X.Y` → fix ou melhoria incremental

Bumpar sempre em `package.json` junto com o commit da feature.

---

## Design System

**Antes de mexer em qualquer CSS:**
1. Ler `vault/00-contexto/DESIGN.md`
2. Usar sempre `var(--color-*)` — nunca hardcodar hex
3. Telas novas: incluir `<link rel="stylesheet" href="/design-tokens.css">` no `<head>`
4. Para mudar tokens: editar `DESIGN.md` → rodar `python scripts/design/gen_tokens.py`

**Paleta oficial:**
```
Navy:        #001844  → var(--brand-epiuse-navy)
Red:         #cd1543  → var(--brand-epiuse-red)
Blue Light:  #869ec3  → var(--brand-epiuse-blue-light)
Grey:        #cfd1d3  → var(--brand-epiuse-grey)
```

---

## Adicionando uma nova página

1. Criar `public/minha-pagina.html`
2. Incluir no `<head>`:
   ```html
   <link rel="stylesheet" href="/design-tokens.css">
   ```
3. Incluir antes do `</body>`:
   ```html
   <script src="/office-nav.js"></script>
   <script src="/office-footer.js"></script>
   ```
4. Se precisar de rota customizada, adicionar em `server.js`
5. Adicionar link na área correspondente em `public/api/areas.json`

---

## Adicionando dados a uma área

Editar `public/api/areas.json`:

```json
{
  "id": "minha-area",
  "ferramentas": [
    {
      "label": "Nome da Ferramenta",
      "href": "/minha-pagina",
      "icon": "📊",
      "desc": "Descrição curta de uma linha"
    }
  ],
  "funil": [
    {
      "estagio": "Nome do Estágio",
      "valor": 1234,
      "fonte": "apollo",
      "meta": 2000
    }
  ]
}
```

**Campos de `valor`:**
- Se real e atualizado → número direto
- Se pendente de integração → `null` (a UI mostra `⏳`)
- Se estimativa → número com observação no campo `"obs"`

---

## .gitignore

Os seguintes arquivos/pastas **nunca são comitados**:
```
.env                          ← secrets
node_modules/                 ← dependências
logs/                         ← logs de runtime
vault/cowork-runs/            ← runs em tempo real
public/api/transcricao-*.txt  ← arquivos de teste
*.migrated                    ← migrations antigas
```

---

## Dúvidas

Abrir issue no GitHub ou falar com Rudá diretamente.

---

*Versão: junho/2026*


<br><br>

# ═══════════════════════════════════════
# 📄 ROADMAP.md
# ═══════════════════════════════════════

# Roadmap — EPI-USE Office

> Prioridades de produto e desenvolvimento.
> Atualizado: junho/2026 · v0.12.0

---

## Estado atual (v0.12.0 · jun/2026)

### O que está funcionando
- ✅ Office Home com navegação por área
- ✅ 6 áreas com dashboard de funil + KPIs + ferramentas
- ✅ Profile Optimizer V1 + V2 (kit LinkedIn para Voices)
- ✅ Pipeline Apollo (39k contatos, 14k empresas, 15 sequências)
- ✅ Inbound pipeline (brief → artigo → carrossel via Cowork)
- ✅ Artigos blog (693 artigos pesquisáveis)
- ✅ Cases CS (sync com aprovação Roberto)
- ✅ Relatório mensal (PPTX export)
- ✅ Metas FY26 (dashboard + planilhas)
- ✅ Design System com tokens CSS
- ✅ Lifecycle automático (Windows Task Scheduler)
- ✅ Deploy Railway (auto no push para master)

### O que está em construção
- 🚧 Painel Duda (Módulo 10) — sprint 15 iniciado

---

## Prioridades Q2/Q3 2026

### P0 — Crítico (próximas 2 semanas)

| Item | Descrição | Dono |
|---|---|---|
| Painel Duda — fase 1 | Daily digest + inbox por área + KPIs Voices | Rudá/Duda |
| Integração GA4 | Tráfego orgânico no relatório mensal | Rudá |
| Fix SQLite Railway | Solução permanente para persistência de dados no Railway | Rudá |

### P1 — Alta prioridade (próximo mês)

| Item | Descrição | Dono |
|---|---|---|
| Painel Duda — fase 2 | Feed de agentes + calendário editorial | Rudá/Duda |
| LinkedIn API | Seguidores e engajamento automático no dashboard | Rudá |
| War Room V2 | Visão executiva com dados reais de todas as fontes | Rudá |
| Projeções paid media V2 | Cenários com dados reais de CAC histórico | Rudá |

### P2 — Médio prazo (Q3 2026)

| Item | Descrição | Dono |
|---|---|---|
| Voice Agents (Módulo B) | Automação de posts dos Voices (rascunho → aprovação → post) | Rudá |
| Zoho CRM integration | Pipeline CRM no dashboard de Outbound | Rudá |
| RD Station integration | Leads inbound no funil de Inbound & Growth | Rudá |
| Casos V2 | Upload de casos em PDF + extração automática via Claude | Rudá/Roberto |
| SEO Dashboard | Posicionamento de palavras-chave + sugestões de pauta | Rudá/Gui |

### P3 — Backlog (Q4 2026+)

| Item | Descrição |
|---|---|
| App mobile (PWA) | Versão mobile-first do Office |
| Multi-tenant | Replicar a plataforma para outras BUs da EPI-USE |
| Eventos Hub V2 | Dashboard de eventos com integração MDF SAP |
| Attribution model | Modelo de atribuição marketing → vendas |
| Office Engine 2D | Sala virtual com agentes representados graficamente |

---

## Sprints concluídos

| Sprint | Versão | Principais entregas |
|---|---|---|
| Sprint 1–8 | 0.1–0.8 | Fundação, Optimizer V1, Pipeline, Inbound base |
| Sprint 9 | 0.9.0 | Optimizer refundado (zero tokens, fluxo copia-prompt) |
| Sprint 9.1 | 0.9.1 | Optimizer V1 simplificado (1 template .md) |
| Sprint 9.2 | 0.9.2 | Optimizer artefato standalone |
| Sprint 9.3 | 0.9.3 | Optimizer V2 (input transcrição + Voice Index) |
| Sprint 9.4 | 0.9.4 | Optimizer V2 baseado no findskill.ai |
| Sprint 9.5 | 0.9.5 | Padrão visual Anderson Costa nos templates |
| Sprint 10 | — | Metas FY26 (gerador XLSX + template SMART) |
| Sprint 11 | 0.8.x | Biblioteca de conteúdos + pipeline editorial + nav reorganizada |
| Sprint 12 | — | Guia operacional Optimizer (passo a passo V1+V2) |
| Sprint 13 | — | Design System V1.0 com Brand Guide V1.1 |
| Sprint 14 | 0.10.0 | Cowork workflows dinâmicos entre agentes |
| Sprint 14.1 | 0.10.1 | Fix: auto-cria pasta inbox se workspace não existir |
| Sprint 15 | 0.11.0 | Painel Duda — sprint inicial (Módulo C) |
| Sprint 16 | 0.12.0 | Area.html: meta-card, tool-card, metas no funil |

---

## Decisões de arquitetura

| Data | Decisão | Rationale |
|---|---|---|
| mai/2026 | Zero frameworks no frontend | Simplicidade, sem build step, portabilidade |
| mai/2026 | SQLite como DB principal | Zero config, funciona offline, simples |
| mai/2026 | Vault Obsidian-style para agentes | Contexto portável entre sessões de IA |
| mai/2026 | Railway para deploy | Simples, auto-deploy, gratuito no tier atual |
| mai/2026 | Windows Task Scheduler para lifecycle | PM2 era frágil no Windows; Tarefas Agendadas são nativas |
| mai/2026 | Design tokens via CSS variables | Uma mudança propaga em todas as páginas |
| jun/2026 | EDITOR_TOKEN para sync de cases | Workaround para SQLite Railway não persistir |

---

*Atualizado em: junho/2026 · v0.12.0*

